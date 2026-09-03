# ── dataset.py ────────────────────────────────────────────
# Clase Dataset, transformaciones y carga de datos.

import config
import os
import numpy as np
import pandas as pd
from PIL import Image
from sklearn.model_selection import train_test_split

import torch
from torch.utils.data import Dataset, DataLoader
import torchvision.transforms as transforms

from config import (
    IMAGE_DIR, CSV_PATH, TRAIN_TXT, TEST_TXT,
    IMG_SIZE, BATCH_SIZE, SEED, NUM_WORKERS
)
from utils import seed_worker, make_generator


# ── Clase Dataset ─────────────────────────────────────────

class ChestXrayDataset(Dataset):
    def __init__(self, dataframe, image_dir, transform=None):
        self.df        = dataframe.reset_index(drop=True)
        self.image_dir = image_dir
        self.transform = transform

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row      = self.df.iloc[idx]
        img_path = os.path.join(self.image_dir, row['Image Index'])

        try:
            image = Image.open(img_path).convert('RGB')
            image.verify()
            image = Image.open(img_path).convert('RGB')
        except Exception:
            image = Image.new('RGB', (IMG_SIZE, IMG_SIZE))

        if self.transform:
            image = self.transform(image)

        label = torch.tensor(row[config.CONDITION], dtype=torch.float32)
        return image, label


# ── Transformaciones ────────────────────────────────────────────

train_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(10),
    transforms.ColorJitter(brightness=0.2, contrast=0.2),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])

val_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])


# ── Carga de datos ──────────────────────────────────────────

def load_data():
    df = pd.read_csv(CSV_PATH)

    cond = config.CONDITION
    df[cond] = df['Finding Labels'].apply(
        lambda x: 1.0 if cond in x else 0.0
    )
    df = df[['Image Index', cond]]

    available = set(os.listdir(IMAGE_DIR))
    df = df[df['Image Index'].isin(available)].reset_index(drop=True)
    print(f"Available images: {len(df)}")

    with open(TRAIN_TXT) as f:
        train_val_files = set(f.read().splitlines())
    with open(TEST_TXT) as f:
        test_files = set(f.read().splitlines())

    train_val_df = df[df['Image Index'].isin(train_val_files)].reset_index(drop=True)
    test_df      = df[df['Image Index'].isin(test_files)].reset_index(drop=True)

    train_df, val_df = train_test_split(
        train_val_df,
        test_size=0.1,
        random_state=SEED,
        stratify=train_val_df[cond]
    )

    print(f"Train: {len(train_df)} | Val: {len(val_df)} | Test: {len(test_df)}")
    print(f"{cond} — Train: {train_df[cond].sum():.0f} | "
          f"Val: {val_df[cond].sum():.0f} | "
          f"Test: {test_df[cond].sum():.0f}")

    return train_df, val_df, test_df


def make_loaders(train_df, val_df, test_df):
    g = make_generator()

    train_loader = DataLoader(
        ChestXrayDataset(train_df, IMAGE_DIR, train_transform),
        batch_size=BATCH_SIZE,
        shuffle=True,
        num_workers=0,
        pin_memory=True,
        worker_init_fn=seed_worker,
        generator=g
    )

    val_loader = DataLoader(
        ChestXrayDataset(val_df, IMAGE_DIR, val_transform),
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0,
        pin_memory=True,
        worker_init_fn=seed_worker,
        generator=g
    )

    test_loader = DataLoader(
        ChestXrayDataset(test_df, IMAGE_DIR, val_transform),
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0,
        pin_memory=True,
        worker_init_fn=seed_worker,
        generator=g
    )

    print(f"Train batches: {len(train_loader)} | "
          f"Val batches: {len(val_loader)} | "
          f"Test batches: {len(test_loader)}")

    return train_loader, val_loader, test_loader
