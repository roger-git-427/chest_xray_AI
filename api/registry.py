"""Load and cache screening models (one weights file per condition)."""

from pathlib import Path

from PIL import Image

import config
from config import best_model_path
from inference import load_model, predict_image

_models: dict[str, object] = {}


def get_model(condition: str):
    if condition not in _models:
        weights = best_model_path(condition)
        if not Path(weights).is_file():
            raise FileNotFoundError(f'Missing weights for {condition}: {weights}')
        _models[condition] = load_model(weights)
    return _models[condition]


def preload(conditions: list[str] | None = None) -> list[str]:
    """Load models into memory. Returns conditions successfully loaded."""
    targets = conditions or config.available_screening_conditions()
    loaded = []
    for condition in targets:
        try:
            get_model(condition)
            loaded.append(condition)
        except FileNotFoundError:
            pass
    return loaded


def screen_image(image: Image.Image, conditions: list[str]) -> list[dict]:
    results = []
    for condition in conditions:
        model = get_model(condition)
        results.append(predict_image(image, model, condition=condition))
    return results


def loaded_conditions() -> list[str]:
    return list(_models.keys())
