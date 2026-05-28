# ── inference.py ──────────────────────────────────────────
# CLI: python inference.py --image path/to/xray.png

import argparse
from pathlib import Path

import torch
from PIL import Image

import config
from config import DEVICE, condition_label_es, review_threshold
from dataset import val_transform
from model import build_model


def load_model(weights_path=None):
    if weights_path is None:
        weights_path = config.BEST_MODEL_PATH
    model = build_model()
    model.load_state_dict(
        torch.load(weights_path, map_location=DEVICE, weights_only=True)
    )
    model.eval()
    return model


def predict_image(image, model, condition=None):
    """image: path (str | Path) or PIL.Image. Returns result dict."""
    condition = condition or config.CONDITION
    if isinstance(image, (str, Path)):
        image = Image.open(image).convert('RGB')
    else:
        image = image.convert('RGB')

    tensor = val_transform(image).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        prob = torch.sigmoid(model(tensor)).item()

    threshold = review_threshold(condition)
    flagged = prob >= threshold
    return {
        'condition': condition,
        'condition_label': condition_label_es(condition),
        'probability': prob,
        'threshold': threshold,
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
    parser = argparse.ArgumentParser(description='Tamizaje de radiografía de tórax')
    parser.add_argument(
        '--image', type=str, required=True, help='Ruta a la radiografía'
    )
    parser.add_argument(
        '--condition',
        default=config.CONDITION,
        help='Finding to screen for',
    )
    parser.add_argument(
        '--model',
        type=str,
        default=None,
        help='Ruta a los pesos (default: best model for --condition)',
    )
    args = parser.parse_args()

    from config import set_active_condition, best_model_path
    set_active_condition(args.condition)
    weights = args.model or best_model_path(args.condition)

    model = load_model(weights)
    print(f"Modelo cargado desde {weights} ({args.condition})")
    print_result(
        args.image,
        predict_image(args.image, model, condition=args.condition),
    )


if __name__ == '__main__':
    main()
