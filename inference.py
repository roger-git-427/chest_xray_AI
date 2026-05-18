# ── inference.py ──────────────────────────────────────────
# CLI: python inference.py --image path/to/xray.png

import argparse
from pathlib import Path

import torch
from PIL import Image

from config import CONDITION, DEVICE, BEST_MODEL_PATH, condition_label_es
from dataset import val_transform
from model import build_model

REVIEW_THRESHOLD = 0.3


def load_model(weights_path=BEST_MODEL_PATH):
    model = build_model()
    model.load_state_dict(
        torch.load(weights_path, map_location=DEVICE, weights_only=True)
    )
    model.eval()
    return model


def predict_image(image, model):
    """image: path (str | Path) or PIL.Image. Returns result dict."""
    if isinstance(image, (str, Path)):
        image = Image.open(image).convert('RGB')
    else:
        image = image.convert('RGB')

    tensor = val_transform(image).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        prob = torch.sigmoid(model(tensor)).item()

    flagged = prob >= REVIEW_THRESHOLD
    return {
        'condition': CONDITION,
        'condition_label': condition_label_es(),
        'probability': prob,
        'threshold': REVIEW_THRESHOLD,
        'flagged': flagged,
        'recommendation': (
            'Derivar a radiólogo para confirmación'
            if flagged else 'Seguimiento de rutina'
        ),
    }


def print_result(image_path, result):
    print(f"\nAnálisis de radiografía de tórax")
    print(f"{'─'*30}")
    print(f"Imagen:      {image_path}")
    print(f"Probabilidad de {result['condition_label']}: {result['probability']:.2%}")
    print(f"{'─'*30}")
    if result['flagged']:
        t = result['threshold']
        print(f"⚠ MARCADO para revisión — probabilidad por encima del umbral del {t:.0%}")
        print(f"Recomendación: {result['recommendation']}")
    else:
        print(f"✓ Por debajo del umbral — {result['recommendation'].lower()}")
    print(f"\n⚠ AVISO: herramienta de tamizaje preliminar únicamente.")
    print(f"  Todos los resultados deben ser revisados por un médico calificado.")
    print(f"  Este resultado no constituye un diagnóstico médico.")


def main():
    parser = argparse.ArgumentParser(
        description=f'Tamizaje de radiografía — {condition_label_es()}'
    )
    parser.add_argument(
        '--image', type=str, required=True, help='Ruta a la radiografía'
    )
    parser.add_argument(
        '--model', type=str, default=BEST_MODEL_PATH, help='Ruta a los pesos del modelo'
    )
    args = parser.parse_args()

    model = load_model(args.model)
    print(f"Modelo cargado desde {args.model}")
    print_result(args.image, predict_image(args.image, model))


if __name__ == '__main__':
    main()
