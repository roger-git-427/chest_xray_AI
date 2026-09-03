"""Metadatos de estudios del CSV NIH (solo lectura, caché en memoria)."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

import config

_cache: pd.DataFrame | None = None


def _csv_path() -> Path:
    return config.PROJECT_ROOT / config.CSV_PATH


def _load() -> pd.DataFrame | None:
    global _cache
    if _cache is not None:
        return _cache

    path = _csv_path()
    if not path.is_file():
        return None

    df = pd.read_csv(path)
    df.columns = [c.strip() for c in df.columns]
    _cache = df
    return _cache


def _row_to_dict(row: pd.Series) -> dict:
    follow_up = row.get('Follow-up #')
    try:
        follow_up_num = int(follow_up) if pd.notna(follow_up) else 0
    except (TypeError, ValueError):
        follow_up_num = 0

    age = row.get('Patient Age')
    age_str = str(age).strip() if pd.notna(age) else None

    return {
        'filename': str(row['Image Index']),
        'patient_id': str(row.get('Patient ID', '')) if pd.notna(row.get('Patient ID')) else None,
        'follow_up': follow_up_num,
        'age': age_str,
        'gender': str(row.get('Patient Gender', '')).strip() if pd.notna(row.get('Patient Gender')) else None,
        'view_position': str(row.get('View Position', '')).strip() if pd.notna(row.get('View Position')) else None,
        'finding_labels': str(row.get('Finding Labels', '')).strip() if pd.notna(row.get('Finding Labels')) else None,
    }


def get_study(filename: str) -> dict | None:
    df = _load()
    if df is None:
        return None

    matches = df[df['Image Index'] == filename]
    if matches.empty:
        return None
    return _row_to_dict(matches.iloc[0])


def get_priors(filename: str) -> list[dict]:
    study = get_study(filename)
    if not study or not study.get('patient_id'):
        return []

    df = _load()
    if df is None:
        return []

    patient_id = study['patient_id']
    current_follow = study['follow_up']

    subset = df[df['Patient ID'].astype(str) == str(patient_id)].copy()
    if subset.empty:
        return []

    subset['_follow'] = pd.to_numeric(subset['Follow-up #'], errors='coerce').fillna(0).astype(int)
    subset = subset[subset['_follow'] < current_follow].sort_values('_follow', ascending=False)

    priors = []
    for _, row in subset.iterrows():
        item = _row_to_dict(row)
        item['follow_up_delta'] = current_follow - item['follow_up']
        priors.append(item)
    return priors


def metadata_available() -> bool:
    return _csv_path().is_file()
