"""Database models for identity, tenancy, studies, and audit history."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UserRole(str, enum.Enum):
    MASTER = "master"
    ADMIN = "admin"
    PATIENT = "patient"


class StudyStatus(str, enum.Enum):
    PENDING = "pending"
    SCREENED = "screened"
    REVIEWED = "reviewed"
    EXPORTED = "exported"


class ReportStatus(str, enum.Enum):
    DRAFT = "draft"
    FINAL = "final"


class Clinic(Base):
    __tablename__ = "clinics"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    memberships: Mapped[list["ClinicMembership"]] = relationship(
        back_populates="clinic", cascade="all, delete-orphan"
    )
    studies: Mapped[list["Study"]] = relationship(back_populates="clinic")


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, native_enum=False), nullable=False
    )
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    memberships: Mapped[list["ClinicMembership"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    patient_studies: Mapped[list["Study"]] = relationship(
        back_populates="patient", foreign_keys="Study.patient_id"
    )


class ClinicMembership(Base):
    __tablename__ = "clinic_memberships"
    __table_args__ = (
        UniqueConstraint("clinic_id", "user_id", name="uq_clinic_membership"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    clinic_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("clinics.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    clinic: Mapped[Clinic] = relationship(back_populates="memberships")
    user: Mapped[User] = relationship(back_populates="memberships")


class StoredFile(Base):
    __tablename__ = "stored_files"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    storage_key: Mapped[str] = mapped_column(String(700), unique=True, nullable=False)
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(150), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )


class Study(Base):
    __tablename__ = "studies"
    __table_args__ = (
        Index("ix_studies_clinic_created", "clinic_id", "created_at"),
        Index("ix_studies_patient_created", "patient_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    clinic_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("clinics.id"), nullable=False, index=True
    )
    patient_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True, index=True
    )
    uploaded_by_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )
    file_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("stored_files.id"), nullable=False, unique=True
    )
    source_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    external_patient_id: Mapped[str | None] = mapped_column(String(200))
    accession_number: Mapped[str | None] = mapped_column(String(200), index=True)
    status: Mapped[StudyStatus] = mapped_column(
        Enum(StudyStatus, native_enum=False),
        default=StudyStatus.PENDING,
        nullable=False,
        index=True,
    )
    is_dicom: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    dicom_metadata: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    clinic: Mapped[Clinic] = relationship(back_populates="studies")
    patient: Mapped[User | None] = relationship(
        back_populates="patient_studies", foreign_keys=[patient_id]
    )
    uploaded_by: Mapped[User] = relationship(foreign_keys=[uploaded_by_id])
    file: Mapped[StoredFile] = relationship()
    screening_runs: Mapped[list["ScreeningRun"]] = relationship(
        back_populates="study", cascade="all, delete-orphan"
    )
    report: Mapped["Report | None"] = relationship(
        back_populates="study", cascade="all, delete-orphan", uselist=False
    )


class ScreeningRun(Base):
    __tablename__ = "screening_runs"
    __table_args__ = (
        Index("ix_screening_runs_study_created", "study_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    study_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("studies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )
    overall_flagged: Mapped[bool] = mapped_column(Boolean, nullable=False)
    model_version: Mapped[str | None] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    study: Mapped[Study] = relationship(back_populates="screening_runs")
    created_by: Mapped[User] = relationship()
    findings: Mapped[list["ScreeningFinding"]] = relationship(
        back_populates="screening_run", cascade="all, delete-orphan"
    )


class ScreeningFinding(Base):
    __tablename__ = "screening_findings"
    __table_args__ = (
        UniqueConstraint(
            "screening_run_id", "condition", name="uq_run_condition"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    screening_run_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("screening_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    condition: Mapped[str] = mapped_column(String(100), nullable=False)
    condition_label: Mapped[str] = mapped_column(String(150), nullable=False)
    probability: Mapped[float] = mapped_column(Float, nullable=False)
    threshold: Mapped[float] = mapped_column(Float, nullable=False)
    flagged: Mapped[bool] = mapped_column(Boolean, nullable=False)
    recommendation: Mapped[str] = mapped_column(Text, nullable=False)
    heatmap_file_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("stored_files.id"), nullable=True
    )

    screening_run: Mapped[ScreeningRun] = relationship(back_populates="findings")
    heatmap_file: Mapped[StoredFile | None] = relationship()


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    study_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("studies.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    screening_run_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("screening_runs.id"), nullable=True
    )
    impression: Mapped[str] = mapped_column(Text, default="", nullable=False)
    recommendations: Mapped[str] = mapped_column(Text, default="", nullable=False)
    clinician_name: Mapped[str] = mapped_column(String(200), default="", nullable=False)
    status: Mapped[ReportStatus] = mapped_column(
        Enum(ReportStatus, native_enum=False),
        default=ReportStatus.DRAFT,
        nullable=False,
    )
    reviewed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    pdf_file_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("stored_files.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    study: Mapped[Study] = relationship(back_populates="report")
    screening_run: Mapped[ScreeningRun | None] = relationship()
    reviewed_by: Mapped[User | None] = relationship(foreign_keys=[reviewed_by_id])
    pdf_file: Mapped[StoredFile | None] = relationship()


class UserSession(Base):
    __tablename__ = "user_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[bytes] = mapped_column(
        LargeBinary(32), unique=True, nullable=False, index=True
    )
    csrf_token: Mapped[str] = mapped_column(String(128), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    user: Mapped[User] = relationship()


class AuditEvent(Base):
    __tablename__ = "audit_events"
    __table_args__ = (
        Index("ix_audit_clinic_created", "clinic_id", "created_at"),
        Index("ix_audit_actor_created", "actor_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    clinic_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("clinics.id"), nullable=True
    )
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    action: Mapped[str] = mapped_column(String(120), nullable=False)
    entity_type: Mapped[str | None] = mapped_column(String(100))
    entity_id: Mapped[str | None] = mapped_column(String(100))
    details: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    clinic: Mapped[Clinic | None] = relationship()
    actor: Mapped[User | None] = relationship()
