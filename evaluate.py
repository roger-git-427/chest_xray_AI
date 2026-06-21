# ── evaluate.py ───────────────────────────────────────────
#   python evaluate.py --condition Effusion

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import torch
from sklearn.metrics import roc_auc_score, confusion_matrix
from tqdm import tqdm

import config
from config import DEVICE, set_active_condition
from utils import set_seed
from dataset import load_data, make_loaders
from model import build_model


def evaluate(model, loader):
    model.eval()
    all_probs  = []
    all_labels = []

    with torch.no_grad():
        for images, labels in tqdm(loader, desc=f"Evaluating {config.CONDITION}"):
            images = images.to(DEVICE)
            logits = model(images)
            probs  = torch.sigmoid(logits).cpu().numpy()
            all_probs.extend(probs.flatten())
            all_labels.extend(labels.numpy().flatten())

    return np.array(all_probs), np.array(all_labels)


def parse_args():
    parser = argparse.ArgumentParser(description='Evaluate chest X-ray classifier')
    parser.add_argument(
        '--condition',
        default=config.CONDITION,
        help='Finding to evaluate (default: config.CONDITION)',
    )
    return parser.parse_args()


def main():
    args = parse_args()
    set_active_condition(args.condition)
    print(f"Evaluating: {config.CONDITION}")

    set_seed()

    train_df, val_df, test_df = load_data()
    _, _, test_loader = make_loaders(train_df, val_df, test_df)

    model = build_model()
    model.load_state_dict(
        torch.load(config.BEST_MODEL_PATH, map_location=DEVICE, weights_only=True)
    )
    print(f"Loaded: {config.BEST_MODEL_PATH}")

    probs, labels = evaluate(model, test_loader)

    auc = roc_auc_score(labels, probs)
    print(f"\n{config.CONDITION} Test AUC: {auc:.4f}")

    print(f"\nPrediction distribution:")
    print(f"  Min:  {probs.min():.4f}")
    print(f"  Max:  {probs.max():.4f}")
    print(f"  Mean: {probs.mean():.4f}")

    threshold_analysis = []
    print(f"\nThreshold analysis:")
    for threshold in [0.1, 0.2, 0.3, 0.4, 0.5]:
        preds = (probs >= threshold).astype(int)
        tn, fp, fn, tp = confusion_matrix(
            labels, preds, labels=[0, 1]
        ).ravel()
        sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0
        specificity = tn / (tn + fp) if (tn + fp) > 0 else 0
        print(f"  Threshold {threshold:.1f} → "
              f"Sensitivity: {sensitivity:.3f} | "
              f"Specificity: {specificity:.3f} | "
              f"TP: {tp} FP: {fp} FN: {fn} TN: {tn}")
        threshold_analysis.append({
            'threshold': threshold,
            'sensitivity': round(sensitivity, 4),
            'specificity': round(specificity, 4),
            'tp': int(tp),
            'fp': int(fp),
            'fn': int(fn),
            'tn': int(tn),
        })

    metrics_path = Path('checkpoints') / f'metrics_{config.CONDITION.lower()}.json'
    metrics_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        'condition': config.CONDITION,
        'test_auc': round(float(auc), 4),
        'evaluated_at': datetime.now(timezone.utc).isoformat(),
        'architecture': config.MODEL_NAME,
        'dataset': 'NIH ChestX-ray14',
        'threshold_analysis': threshold_analysis,
    }
    metrics_path.write_text(json.dumps(payload, indent=2), encoding='utf-8')
    print(f"\nWrote model metrics: {metrics_path}")


if __name__ == '__main__':
    main()