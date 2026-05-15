# ── train.py ──────────────────────────────────────────────
# Main training script. Run from terminal:
# python train.py

import os
import torch
from sklearn.metrics import roc_auc_score
from tqdm import tqdm

from config import (
    NUM_EPOCHS, DEVICE,
    CHECKPOINT_PATH, BEST_MODEL_PATH
)
from utils import set_seed, ensure_dirs
from dataset import load_data, make_loaders
from model import build_model, build_criterion, build_optimizer, build_scheduler


def save_checkpoint(epoch, model, optimizer, scheduler, best_val_loss, val_auc):
    torch.save({
        'epoch':           epoch,
        'model_state':     model.state_dict(),
        'optimizer_state': optimizer.state_dict(),
        'scheduler_state': scheduler.state_dict(),
        'best_val_loss':   best_val_loss,
        'val_auc':         val_auc
    }, CHECKPOINT_PATH)


def load_checkpoint(model, optimizer, scheduler):
    if not os.path.exists(CHECKPOINT_PATH):
        print("Starting fresh training.")
        return 0, float('inf')

    print("Resuming from checkpoint...")
    ckpt = torch.load(CHECKPOINT_PATH, map_location=DEVICE)
    model.load_state_dict(ckpt['model_state'])
    optimizer.load_state_dict(ckpt['optimizer_state'])
    scheduler.load_state_dict(ckpt['scheduler_state'])
    start_epoch   = ckpt['epoch'] + 1
    best_val_loss = ckpt['best_val_loss']
    print(f"Resumed from epoch {start_epoch} | "
          f"Best val loss: {best_val_loss:.4f} | "
          f"Last val AUC: {ckpt['val_auc']:.4f}")
    return start_epoch, best_val_loss


def train_epoch(model, loader, criterion, optimizer):
    model.train()
    total_loss = 0.0

    bar = tqdm(loader, desc="  Train", leave=False)
    for images, labels in bar:
        images = images.to(DEVICE)
        labels = labels.to(DEVICE).unsqueeze(1)

        optimizer.zero_grad()
        loss = criterion(model(images), labels)
        loss.backward()
        optimizer.step()

        total_loss += loss.item()
        bar.set_postfix(loss=f"{loss.item():.4f}")

    return total_loss / len(loader)


def val_epoch(model, loader, criterion):
    model.eval()
    total_loss = 0.0
    all_probs  = []
    all_labels = []

    bar = tqdm(loader, desc="  Val  ", leave=False)
    with torch.no_grad():
        for images, labels in bar:
            images = images.to(DEVICE)
            labels = labels.to(DEVICE).unsqueeze(1)

            logits     = model(images)
            loss       = criterion(logits, labels)
            total_loss += loss.item()

            probs = torch.sigmoid(logits).cpu().numpy()
            all_probs.extend(probs.flatten())
            all_labels.extend(labels.cpu().numpy().flatten())

            bar.set_postfix(loss=f"{loss.item():.4f}")

    val_loss = total_loss / len(loader)
    val_auc  = roc_auc_score(all_labels, all_probs)
    return val_loss, val_auc


def main():
    set_seed()
    ensure_dirs()

    # ── Data ──
    train_df, val_df, test_df = load_data()
    train_loader, val_loader, _ = make_loaders(train_df, val_df, test_df)

    # ── Model ──
    model     = build_model()
    criterion = build_criterion(train_df)
    optimizer = build_optimizer(model)
    scheduler = build_scheduler(optimizer)

    # ── Resume ──
    start_epoch, best_val_loss = load_checkpoint(model, optimizer, scheduler)

    # ── Training loop ──
    for epoch in range(start_epoch, NUM_EPOCHS):
        print(f"\nEpoch {epoch+1}/{NUM_EPOCHS}")

        train_loss        = train_epoch(model, train_loader, criterion, optimizer)
        val_loss, val_auc = val_epoch(model, val_loader, criterion)

        scheduler.step(val_loss)

        improved = val_loss < best_val_loss
        marker   = "  → ✓ Saved best model" if improved else ""

        print(f"  Train Loss: {train_loss:.4f} | "
              f"Val Loss: {val_loss:.4f} | "
              f"Val AUC: {val_auc:.4f}{marker}")

        if improved:
            best_val_loss = val_loss
            torch.save(model.state_dict(), BEST_MODEL_PATH)

        save_checkpoint(epoch, model, optimizer, scheduler, best_val_loss, val_auc)

    print(f"\nTraining complete. Best val loss: {best_val_loss:.4f}")


if __name__ == '__main__':
    main()