# ── evaluate.py ───────────────────────────────────────────
import numpy as np
import torch
from sklearn.metrics import roc_auc_score, confusion_matrix
from tqdm import tqdm

from config import DEVICE, BEST_MODEL_PATH, CONDITION
from utils import set_seed
from dataset import load_data, make_loaders
from model import build_model


def evaluate(model, loader):
    model.eval()
    all_probs  = []
    all_labels = []

    with torch.no_grad():
        for images, labels in tqdm(loader, desc=f"Evaluating {CONDITION}"):
            images = images.to(DEVICE)
            logits = model(images)
            probs  = torch.sigmoid(logits).cpu().numpy()
            all_probs.extend(probs.flatten())
            all_labels.extend(labels.numpy().flatten())

    return np.array(all_probs), np.array(all_labels)


def main():
    set_seed()

    train_df, val_df, test_df = load_data()
    _, _, test_loader = make_loaders(train_df, val_df, test_df)

    model = build_model()
    model.load_state_dict(torch.load(BEST_MODEL_PATH, map_location=DEVICE))
    print(f"Loaded: {BEST_MODEL_PATH}")

    probs, labels = evaluate(model, test_loader)

    auc = roc_auc_score(labels, probs)
    print(f"\n{CONDITION} Test AUC: {auc:.4f}")

    print(f"\nPrediction distribution:")
    print(f"  Min:  {probs.min():.4f}")
    print(f"  Max:  {probs.max():.4f}")
    print(f"  Mean: {probs.mean():.4f}")

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


if __name__ == '__main__':
    main()