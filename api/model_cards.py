"""Metadatos de ficha de modelo para las condiciones de tamizaje."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import config


def _metrics_path(condition: str) -> Path:
    return config.PROJECT_ROOT / 'checkpoints' / f'metrics_{condition.lower()}.json'


def _checkpoint_mtime(condition: str) -> str | None:
    path = Path(config.best_model_path(condition))
    if not path.is_file():
        return None
    ts = path.stat().st_mtime
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime('%Y-%m-%d')


def load_metrics(condition: str) -> dict | None:
    path = _metrics_path(condition)
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (json.JSONDecodeError, OSError):
        return None


def build_model_card(condition: str, available: bool) -> dict:
    metrics = load_metrics(condition)
    weights_date = _checkpoint_mtime(condition)

    card = {
        'architecture': config.MODEL_NAME,
        'dataset': 'NIH ChestX-ray14',
        'task': 'Clasificación binaria por hallazgo',
        'threshold': config.review_threshold(condition),
        'weights_updated': weights_date,
        'test_auc': metrics.get('test_auc') if metrics else None,
        'evaluated_at': metrics.get('evaluated_at') if metrics else None,
        'limitations': (
            'Tamizaje preliminar en radiografías de tórax PA/AP. '
            'No sustituye lectura radiológica. Rendimiento depende de población y equipo.'
        ),
        'calibration_note': (
            'Umbral fijado en validación NIH; ajustar con evaluate.py antes de despliegue clínico.'
        ),
    }

    if metrics and metrics.get('threshold_analysis'):
        card['threshold_analysis'] = metrics['threshold_analysis']

    if not available:
        card['status'] = 'weights_missing'
    elif metrics:
        card['status'] = 'evaluated'
    else:
        card['status'] = 'trained'

    return card
