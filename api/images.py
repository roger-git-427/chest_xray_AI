"""List and resolve images on disk (folder browse for the web UI)."""

from pathlib import Path

from fastapi import HTTPException

import config

ROOT = config.PROJECT_ROOT
MAX_LIST = 500
IMAGE_SUFFIXES = {'.png', '.jpg', '.jpeg', '.dcm', '.dicom'}
ALLOWED_ROOTS = [
    (ROOT / 'data').resolve(),
]


def resolve_folder(folder: str) -> Path:
    path = Path(folder)
    if not path.is_absolute():
        path = ROOT / path
    path = path.resolve()
    if not path.is_dir():
        raise HTTPException(404, 'Folder not found')
    if not _is_under_allowed_root(path):
        raise HTTPException(403, 'Folder path not allowed')
    return path


def _is_under_allowed_root(path: Path) -> bool:
    for root in ALLOWED_ROOTS:
        if root.exists() and (path == root or path.is_relative_to(root)):
            return True
    return False


def list_images(folder: str, query: str = '') -> dict:
    directory = resolve_folder(folder)
    q = query.strip().lower()
    names = sorted(
        f.name for f in directory.iterdir()
        if f.is_file()
        and f.suffix.lower() in IMAGE_SUFFIXES
        and (not q or q in f.name.lower())
    )[:MAX_LIST]
    return {
        'folder': str(directory),
        'query': query,
        'names': names,
        'truncated': len(names) >= MAX_LIST,
        'max_list': MAX_LIST,
    }


def resolve_image_file(folder: str, name: str) -> Path:
    if not name or '/' in name or '\\' in name or name in ('.', '..'):
        raise HTTPException(400, 'Invalid filename')
    directory = resolve_folder(folder)
    path = (directory / name).resolve()
    if path.parent != directory:
        raise HTTPException(400, 'Invalid filename')
    if not path.is_file() or path.suffix.lower() not in IMAGE_SUFFIXES:
        raise HTTPException(404, 'Image not found')
    return path
