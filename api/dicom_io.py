"""DICOM decode helpers for screening uploads and folder studies."""

from __future__ import annotations

import io
from pathlib import Path

from PIL import Image

DICOM_EXTENSIONS = {'.dcm', '.dicom'}


def is_dicom_file(filename: str | None, content_type: str | None = None) -> bool:
    if filename and Path(filename).suffix.lower() in DICOM_EXTENSIONS:
        return True
    if content_type and 'dicom' in content_type.lower():
        return True
    return False


def _normalize_pixels(arr):
    import numpy as np

    arr = arr.astype('float64')
    lo, hi = arr.min(), arr.max()
    if hi > lo:
        arr = (arr - lo) / (hi - lo)
    else:
        arr = np.zeros_like(arr)
    return (arr * 255).astype('uint8')


def _apply_voi_lut(arr, dataset):
    wc = getattr(dataset, 'WindowCenter', None)
    ww = getattr(dataset, 'WindowWidth', None)
    if wc is None or ww is None:
        return arr

    if hasattr(wc, '__iter__'):
        wc = float(wc[0])
    else:
        wc = float(wc)
    if hasattr(ww, '__iter__'):
        ww = float(ww[0])
    else:
        ww = float(ww)

    lo = wc - ww / 2
    hi = wc + ww / 2
    import numpy as np

    arr = np.clip(arr, lo, hi)
    arr = (arr - lo) / max(hi - lo, 1e-8)
    return (arr * 255).astype('uint8')


def _metadata_from_dataset(ds) -> dict:
    def _get(tag, default=None):
        val = getattr(ds, tag, default)
        if val is None:
            return default
        # Multi-value DICOM tags may arrive as list-like wrappers.
        if isinstance(val, (list, tuple)):
            val = val[0] if val else default
        elif val.__class__.__name__ == 'MultiValue':
            val = val[0] if len(val) else default
        return str(val)

    return {
        'patient_id': _get('PatientID'),
        'patient_name': _get('PatientName'),
        'patient_age': _get('PatientAge'),
        'patient_sex': _get('PatientSex'),
        'view_position': _get('ViewPosition'),
        'study_date': _get('StudyDate'),
        'study_description': _get('StudyDescription'),
        'modality': _get('Modality'),
        'window_center': _get('WindowCenter'),
        'window_width': _get('WindowWidth'),
    }


def load_dicom_bytes(raw: bytes) -> tuple[Image.Image, dict]:
    import numpy as np
    import pydicom

    ds = pydicom.dcmread(io.BytesIO(raw))
    arr = ds.pixel_array

    slope = float(getattr(ds, 'RescaleSlope', 1) or 1)
    intercept = float(getattr(ds, 'RescaleIntercept', 0) or 0)
    arr = arr.astype('float64') * slope + intercept

    try:
        from pydicom.pixel_data_handlers.util import apply_voi_lut
        arr = apply_voi_lut(arr, ds)
        if arr.dtype != np.uint8:
            arr = _normalize_pixels(arr)
    except Exception:
        arr = _apply_voi_lut(arr, ds)

    if arr.ndim > 2:
        arr = arr[..., 0]

    image = Image.fromarray(arr).convert('RGB')
    try:
        meta = _metadata_from_dataset(ds)
    except Exception:
        meta = {}
    return image, meta


def load_dicom_path(path: Path) -> tuple[Image.Image, dict]:
    return load_dicom_bytes(path.read_bytes())


def load_image_bytes(raw: bytes, filename: str | None = None) -> tuple[Image.Image, dict | None]:
    if is_dicom_file(filename):
        image, meta = load_dicom_bytes(raw)
        return image, meta
    image = Image.open(io.BytesIO(raw)).convert('RGB')
    return image, None


def load_image_path(path: Path) -> tuple[Image.Image, dict | None]:
    if path.suffix.lower() in DICOM_EXTENSIONS:
        return load_dicom_path(path)
    return Image.open(path).convert('RGB'), None


def encode_preview_data_url(image: Image.Image, quality: int = 88) -> str:
    import base64

    buf = io.BytesIO()
    image.convert('RGB').save(buf, format='JPEG', quality=quality)
    encoded = base64.b64encode(buf.getvalue()).decode('ascii')
    return f'data:image/jpeg;base64,{encoded}'
