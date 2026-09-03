from __future__ import annotations

import io
from dataclasses import replace
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine, inspect, select
from sqlalchemy.orm import sessionmaker

from api.auth_router import router as auth_router
from api.clinic_router import router as clinic_router
from api.database import Base, get_db
from api.models import Clinic, ClinicMembership, Study, User, UserRole
from api.security import hash_password
from api.storage import LocalStorage
from api.study_router import router as study_router
import api.study_router as study_module
import api.study_service as study_service
import api.settings as settings_module


@pytest.fixture()
def test_app(tmp_path, monkeypatch):
    engine = create_engine(
        f"sqlite:///{(tmp_path / 'test.db').as_posix()}",
        connect_args={"check_same_thread": False},
    )
    Session = sessionmaker(bind=engine, expire_on_commit=False)
    Base.metadata.create_all(engine)

    clinic_a = Clinic(name="Clinic A", slug="clinic-a")
    clinic_b = Clinic(name="Clinic B", slug="clinic-b")
    master = User(
        email="master@example.com",
        full_name="Platform Master",
        role=UserRole.MASTER,
        password_hash=hash_password("master-password-123"),
    )
    admin = User(
        email="admin@example.com",
        full_name="Clinic Admin",
        role=UserRole.ADMIN,
        password_hash=hash_password("admin-password-123"),
    )
    patient = User(
        email="patient@example.com",
        full_name="Patient One",
        role=UserRole.PATIENT,
        password_hash=hash_password("patient-password-123"),
    )
    other_patient = User(
        email="other@example.com",
        full_name="Patient Two",
        role=UserRole.PATIENT,
        password_hash=hash_password("other-password-123"),
    )
    with Session() as db:
        db.add_all(
            [clinic_a, clinic_b, master, admin, patient, other_patient]
        )
        db.flush()
        db.add_all(
            [
                ClinicMembership(clinic_id=clinic_a.id, user_id=admin.id),
                ClinicMembership(clinic_id=clinic_a.id, user_id=patient.id),
                ClinicMembership(
                    clinic_id=clinic_a.id, user_id=other_patient.id
                ),
            ]
        )
        db.commit()
        ids = {
            "clinic_a": str(clinic_a.id),
            "clinic_b": str(clinic_b.id),
            "patient": str(patient.id),
            "master": str(master.id),
        }

    def override_db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app = FastAPI()
    app.include_router(auth_router)
    app.include_router(clinic_router)
    app.include_router(study_router)
    app.dependency_overrides[get_db] = override_db

    storage = LocalStorage(tmp_path / "storage")
    monkeypatch.setattr(study_module, "get_storage", lambda: storage)
    monkeypatch.setattr(
        study_service.config,
        "available_screening_conditions",
        lambda: ["Cardiomegaly"],
    )
    monkeypatch.setattr(
        study_service,
        "screen_image",
        lambda image, conditions, include_heatmaps=False: [
            {
                "condition": "Cardiomegaly",
                "condition_label": "Cardiomegalia",
                "probability": 0.72,
                "threshold": 0.3,
                "flagged": True,
                "recommendation": "Derivar a revisión",
                "heatmap_data_url": (
                    "data:image/jpeg;base64,aGVhdG1hcA=="
                ),
            }
        ],
    )
    return app, ids, storage, Session


def login(client: TestClient, email: str, password: str) -> dict[str, str]:
    response = client.post(
        "/api/auth/login", json={"email": email, "password": password}
    )
    assert response.status_code == 200
    csrf = client.cookies.get("cxrai_csrf")
    assert csrf
    return {"X-CSRF-Token": csrf}


def png_bytes() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (32, 32), color=(20, 20, 20)).save(buffer, format="PNG")
    return buffer.getvalue()


def test_cross_clinic_access_is_denied(test_app):
    app, ids, _storage, _Session = test_app
    with TestClient(app) as client:
        headers = login(client, "admin@example.com", "admin-password-123")
        response = client.get(
            "/api/studies",
            params={"clinic_id": ids["clinic_b"]},
            headers=headers,
        )
        assert response.status_code == 403


def test_upload_screen_report_and_patient_visibility(test_app):
    app, ids, _storage, _Session = test_app
    with TestClient(app) as admin_client:
        headers = login(
            admin_client, "admin@example.com", "admin-password-123"
        )
        response = admin_client.post(
            "/api/studies/screen",
            params={"conditions": "Cardiomegaly"},
            data={
                "clinic_id": ids["clinic_a"],
                "patient_id": ids["patient"],
            },
            files={"file": ("study.png", png_bytes(), "image/png")},
            headers=headers,
        )
        assert response.status_code == 201, response.text
        study = response.json()
        assert study["study_id"]
        assert study["screening_run_id"]
        assert study["overall_flagged"] is True
        assert set(study["results"][0]) == {
            "condition",
            "condition_label",
            "probability",
            "threshold",
            "flagged",
            "recommendation",
            "heatmap_data_url",
        }
        assert study["results"][0]["heatmap_data_url"].startswith(
            "/api/studies/heatmaps/"
        )

        study_id = study["study_id"]
        detail = admin_client.get(f"/api/studies/{study_id}")
        assert detail.status_code == 200
        assert detail.json()["results"] == study["results"]
        report = admin_client.put(
            f"/api/studies/{study_id}/report",
            json={
                "impression": "Cardiomegalia probable.",
                "recommendations": "Correlacionar clínicamente.",
                "clinician_name": "Dra. Demo",
            },
            headers=headers,
        )
        assert report.status_code == 200

        reviewed = admin_client.post(
            f"/api/studies/{study_id}/review", headers=headers
        )
        assert reviewed.status_code == 200
        assert reviewed.json()["report"]["status"] == "final"

    with TestClient(app) as patient_client:
        login(
            patient_client,
            "patient@example.com",
            "patient-password-123",
        )
        response = patient_client.get("/api/studies")
        assert response.status_code == 200
        studies = response.json()["studies"]
        assert [item["id"] for item in studies] == [study_id]
        assert studies[0]["report"]["impression"] == "Cardiomegalia probable."

    with TestClient(app) as other_client:
        login(other_client, "other@example.com", "other-password-123")
        response = other_client.get(f"/api/studies/{study_id}")
        assert response.status_code == 403
        heatmap = other_client.get(
            study["results"][0]["heatmap_data_url"]
        )
        assert heatmap.status_code == 403


def test_inference_failure_removes_file_and_database_record(
    test_app, monkeypatch
):
    app, ids, storage, Session = test_app

    def fail_inference(*args, **kwargs):
        raise RuntimeError("inference failed")

    monkeypatch.setattr(study_service, "screen_image", fail_inference)
    with TestClient(app, raise_server_exceptions=False) as client:
        headers = login(client, "admin@example.com", "admin-password-123")
        response = client.post(
            "/api/studies/screen",
            params={"conditions": "Cardiomegaly"},
            data={"clinic_id": ids["clinic_a"]},
            files={"file": ("failure.png", png_bytes(), "image/png")},
            headers=headers,
        )
        assert response.status_code == 500

    with Session() as db:
        assert db.scalar(select(Study.id)) is None
    assert not any(path.is_file() for path in storage.root.rglob("*"))


def test_master_path_import_and_logout(test_app, monkeypatch, tmp_path):
    app, ids, _storage, _Session = test_app
    image_path = tmp_path / "import.png"
    image_path.write_bytes(png_bytes())
    monkeypatch.setattr(
        study_module,
        "resolve_image_file",
        lambda folder, filename: image_path,
    )

    with TestClient(app) as client:
        headers = login(client, "master@example.com", "master-password-123")
        response = client.post(
            "/api/studies/screen/path",
            params={"conditions": "Cardiomegaly"},
            json={
                "folder": "data/import",
                "filename": "import.png",
                "clinic_id": ids["clinic_a"],
            },
            headers=headers,
        )
        assert response.status_code == 201, response.text
        assert response.json()["folder"] == "data/import"

        logout = client.post("/api/auth/logout", headers=headers)
        assert logout.status_code == 200
        assert client.get("/api/auth/me").status_code == 401


def test_alembic_upgrade_builds_current_schema(tmp_path, monkeypatch):
    database_path = tmp_path / "migration.db"
    database_url = f"sqlite:///{database_path.as_posix()}"
    monkeypatch.setattr(
        settings_module,
        "settings",
        replace(settings_module.settings, database_url=database_url),
    )
    root = Path(__file__).resolve().parents[1]
    alembic_config = Config(str(root / "alembic.ini"))
    alembic_config.set_main_option("script_location", str(root / "alembic"))
    command.upgrade(alembic_config, "head")

    migrated_engine = create_engine(database_url)
    assert set(Base.metadata.tables).issubset(
        set(inspect(migrated_engine).get_table_names())
    )
    migrated_engine.dispose()

