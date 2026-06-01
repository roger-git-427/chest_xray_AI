"""FastAPI backend for chest X-ray screening."""

import io
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from PIL import Image

import config
from api.images import list_images, resolve_image_file
from api.registry import loaded_conditions, preload, screen_image

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
    allow_origins=['http://localhost:5173', 'http://127.0.0.1:5173'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.get('/api/health')
def health():
    return {'status': 'ok', 'models_loaded': loaded_conditions()}


@app.get('/api/settings')
def app_settings():
    return {
        'default_image_dir': config.IMAGE_DIR,
        'max_list': 500,
    }


@app.get('/api/images')
def get_image_list(
    folder: str = Query(default=None),
    q: str = Query(default=''),
):
    target = folder or config.IMAGE_DIR
    return list_images(target, q)


@app.get('/api/images/content')
def get_image_content(
    folder: str = Query(...),
    name: str = Query(...),
):
    path = resolve_image_file(folder, name)
    return FileResponse(path)


class ScreenPathBody(BaseModel):
    folder: str
    filename: str


@app.post('/api/screen/path')
def screen_from_path(
    body: ScreenPathBody,
    conditions: list[str] = Query(default=[]),
):
    available = config.available_screening_conditions()
    if not available:
        raise HTTPException(503, 'No trained models found in checkpoints/')

    selected = [c for c in (conditions or available) if c in available]
    if not selected:
        raise HTTPException(400, 'No valid conditions selected')

    path = resolve_image_file(body.folder, body.filename)
    try:
        image = Image.open(path).convert('RGB')
    except Exception as exc:
        raise HTTPException(400, f'Invalid image: {exc}') from exc

    results = screen_image(image, selected)
    return {
        'filename': body.filename,
        'folder': body.folder,
        'overall_flagged': any(r['flagged'] for r in results),
        'results': results,
    }


@app.get('/api/conditions')
def list_conditions():
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
        })
    return {'conditions': items}


@app.post('/api/screen')
async def screen(
    file: UploadFile = File(...),
    conditions: list[str] = Query(default=[]),
):
    if file.content_type and not file.content_type.startswith('image/'):
        raise HTTPException(400, 'File must be an image')

    available = config.available_screening_conditions()
    if not available:
        raise HTTPException(503, 'No trained models found in checkpoints/')

    selected = [c for c in (conditions or available) if c in available]
    if not selected:
        raise HTTPException(400, 'No valid conditions selected')

    raw = await file.read()
    try:
        image = Image.open(io.BytesIO(raw)).convert('RGB')
    except Exception as exc:
        raise HTTPException(400, f'Invalid image: {exc}') from exc

    results = screen_image(image, selected)
    any_flagged = any(r['flagged'] for r in results)
    return {
        'filename': file.filename,
        'overall_flagged': any_flagged,
        'results': results,
    }


def _mount_frontend():
    dist = ROOT / 'frontend' / 'dist'
    if dist.is_dir():
        app.mount('/', StaticFiles(directory=str(dist), html=True), name='frontend')


_mount_frontend()
