"""FastAPI backend for chest X-ray screening."""

import io
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import config
from api.audit_router import router as audit_router
from api.auth_router import router as auth_router
from api.clinic_router import router as clinic_router
from api.dicom_io import encode_preview_data_url, is_dicom_file, load_image_bytes, load_image_path
from api.images import list_images, resolve_image_file
from api.model_cards import build_model_card
from api.registry import loaded_conditions, preload, screen_image
from api.security import Principal, get_principal, require_master
from api.study_router import router as persistent_study_router
from api.studies import get_priors, get_study, metadata_available

ROOT = Path(__file__).resolve().parent.parent


@asynccontextmanager
async def lifespan(app: FastAPI):
    loaded = preload()
    print(f'API ready — models loaded: {loaded or "(none)"}')
    yield


app = FastAPI(
    title='ByteAI Screening API',
    description='Preliminary screening only — not a medical diagnosis.',
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5174',
    ],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(auth_router)
app.include_router(clinic_router)
app.include_router(persistent_study_router)
app.include_router(audit_router)


@app.get('/api/health')
def health():
    return {'status': 'ok', 'models_loaded': loaded_conditions()}


@app.get('/api/settings')
def app_settings(_principal: Principal = Depends(get_principal)):
    return {
        'default_image_dir': config.IMAGE_DIR,
        'max_list': 500,
    }


@app.get('/api/images')
def get_image_list(
    folder: str = Query(default=None),
    q: str = Query(default=''),
    _principal: Principal = Depends(require_master),
):
    target = folder or config.IMAGE_DIR
    return list_images(target, q)


@app.get('/api/images/content')
def get_image_content(
    folder: str = Query(...),
    name: str = Query(...),
    _principal: Principal = Depends(require_master),
):
    path = resolve_image_file(folder, name)
    if is_dicom_file(name):
        image, _ = load_image_path(path)
        buf = io.BytesIO()
        image.save(buf, format='JPEG', quality=92)
        return Response(content=buf.getvalue(), media_type='image/jpeg')
    return FileResponse(path)


class ScreenPathBody(BaseModel):
    folder: str
    filename: str


@app.post('/api/screen/path')
def screen_from_path(
    body: ScreenPathBody,
    conditions: list[str] = Query(default=[]),
    include_heatmaps: bool = Query(default=False),
    _principal: Principal = Depends(require_master),
):
    available = config.available_screening_conditions()
    if not available:
        raise HTTPException(503, 'No trained models found in checkpoints/')

    selected = [c for c in (conditions or available) if c in available]
    if not selected:
        raise HTTPException(400, 'No valid conditions selected')

    path = resolve_image_file(body.folder, body.filename)
    try:
        image, dicom_meta = load_image_path(path)
    except Exception as exc:
        raise HTTPException(400, f'Invalid image: {exc}') from exc

    results = screen_image(image, selected, include_heatmaps=include_heatmaps)
    payload = {
        'filename': body.filename,
        'folder': body.folder,
        'overall_flagged': any(r['flagged'] for r in results),
        'results': results,
    }
    if dicom_meta:
        payload['is_dicom'] = True
        payload['dicom_metadata'] = dicom_meta
        payload['preview_data_url'] = encode_preview_data_url(image)
    return payload


@app.get('/api/study/{filename}')
def study_metadata(
    filename: str,
    _principal: Principal = Depends(require_master),
):
    if not metadata_available():
        raise HTTPException(404, 'NIH metadata CSV not found')
    meta = get_study(filename)
    if meta is None:
        raise HTTPException(404, 'Study not found in metadata')
    return meta


@app.get('/api/study/{filename}/priors')
def study_priors(
    filename: str,
    _principal: Principal = Depends(require_master),
):
    if not metadata_available():
        return {'priors': []}
    return {'priors': get_priors(filename)}


@app.get('/api/conditions')
def list_conditions(_principal: Principal = Depends(get_principal)):
    """Return screening conditions for the UI (English ids, Spanish labels)."""
    items = []
    for condition in config.SCREENING_CONDITIONS:
        weights = config.best_model_path(condition)
        available = Path(weights).is_file()
        items.append({
            'id': condition,
            'label': config.condition_label_es(condition),
            'threshold': config.review_threshold(condition),
            'available': available,
            'model_card': build_model_card(condition, available),
        })
    return {'conditions': items}


@app.post('/api/screen')
async def screen(
    file: UploadFile = File(...),
    conditions: list[str] = Query(default=[]),
    include_heatmaps: bool = Query(default=False),
    _principal: Principal = Depends(require_master),
):
    dicom = is_dicom_file(file.filename, file.content_type)
    if not dicom and file.content_type and not file.content_type.startswith('image/'):
        raise HTTPException(400, 'File must be an image or DICOM (.dcm)')

    available = config.available_screening_conditions()
    if not available:
        raise HTTPException(503, 'No trained models found in checkpoints/')

    selected = [c for c in (conditions or available) if c in available]
    if not selected:
        raise HTTPException(400, 'No valid conditions selected')

    raw = await file.read()
    try:
        image, dicom_meta = load_image_bytes(raw, file.filename)
    except Exception as exc:
        raise HTTPException(400, f'Invalid image: {exc}') from exc

    results = screen_image(image, selected, include_heatmaps=include_heatmaps)
    any_flagged = any(r['flagged'] for r in results)
    payload = {
        'filename': file.filename,
        'overall_flagged': any_flagged,
        'results': results,
    }
    if dicom_meta:
        payload['is_dicom'] = True
        payload['dicom_metadata'] = dicom_meta
        payload['preview_data_url'] = encode_preview_data_url(image)
    return payload


def _mount_frontend():
    dist = ROOT / 'frontend' / 'dist'
    if dist.is_dir():
        app.mount('/', StaticFiles(directory=str(dist), html=True), name='frontend')


_mount_frontend()
