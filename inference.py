# ── inference.py ──────────────────────────────────────────
# Run prediction on a single chest X-ray image.
# Run from terminal: python inference.py --image path/to/xray.png

import argparse
import torch
from PIL import Image

from config import DEVICE, BEST_MODEL_PATH, IMG_SIZE
from dataset import val_transform
from model import build_model

CONDITIONS_THRESHOLD = 0.3  # flag anything above 30% for review


def predict(image_path, model):
    model.eval()

    try:
        image = Image.open(image_path).convert('RGB')
    except Exception as e:
        print(f"Error loading image: {e}")
        return

    tensor = val_transform(image).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        logit = model(tensor)
        prob  = torch.sigmoid(logit).item()

    print(f"\nChest X-Ray Analysis")
    print(f"{'─'*30}")
    print(f"Image:       {image_path}")
    print(f"Pneumonia probability: {prob:.2%}")
    print(f"{'─'*30}")

    if prob >= CONDITIONS_THRESHOLD:
        print(f"⚠ FLAGGED for review — probability above {CONDITIONS_THRESHOLD:.0%} threshold")
        print(f"Recommendation: Refer to radiologist for confirmation")
    else:
        print(f"✓ Below threshold — routine follow-up")

    print(f"\n⚠ DISCLAIMER: This is a preliminary screening tool only.")
    print(f"  All results must be reviewed by a qualified physician.")
    print(f"  This output does not constitute a medical diagnosis.")


def main():
    parser = argparse.ArgumentParser(description='Chest X-Ray Pneumonia Screener')
    parser.add_argument('--image', type=str, required=True, help='Path to chest X-ray image')
    parser.add_argument('--model', type=str, default=BEST_MODEL_PATH, help='Path to model weights')
    args = parser.parse_args()

    model = build_model()
    model.load_state_dict(torch.load(args.model, map_location=DEVICE))
    print(f"Model loaded from {args.model}")

    predict(args.image, model)


if __name__ == '__main__':
    main()
