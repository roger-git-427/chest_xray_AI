# ── model.py ──────────────────────────────────────────────
# Model, loss, optimizer, and scheduler setup.
from config import CONDITION
import torch
import torch.nn as nn
import timm

from config import MODEL_NAME, LR, DEVICE


def build_model():
    model = timm.create_model(
        MODEL_NAME,
        pretrained=True,
        num_classes=1
    )
    model = model.to(DEVICE)
    print(f"Model loaded: {MODEL_NAME}")
    return model


def build_criterion(train_df):
    pos_count  = train_df[CONDITION].sum()
    neg_count  = len(train_df) - pos_count
    pos_weight = torch.tensor(
        [neg_count / pos_count],
        dtype=torch.float32
    ).to(DEVICE)
    print(f"pos_weight: {pos_weight.item():.1f}")
    return nn.BCEWithLogitsLoss(pos_weight=pos_weight)


def build_optimizer(model):
    return torch.optim.AdamW(
        model.parameters(),
        lr=LR,
        weight_decay=1e-2
    )


def build_scheduler(optimizer):
    return torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer,
        mode='min',
        factor=0.5,
        patience=3
    )
