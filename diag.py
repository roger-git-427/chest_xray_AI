# ── diag.py ───────────────────────────────────────────────
# Run from terminal: python diag.py

import time
import torch
from torch.utils.data import DataLoader
from dataset import ChestXrayDataset, train_transform, load_data
from config import IMAGE_DIR

def main():
    train_df, val_df, test_df = load_data()
    dataset = ChestXrayDataset(train_df, IMAGE_DIR, train_transform)

    # Test raw image loading
    start = time.time()
    for i in range(5):
        img, label = dataset[i]
    print(f"5 images: {time.time()-start:.2f}s | per image: {(time.time()-start)/5:.2f}s")

    # Test DataLoader speeds
    for nw in [0, 2, 4]:
        loader = DataLoader(
            dataset,
            batch_size=32,
            shuffle=False,
            num_workers=nw
        )
        start = time.time()
        batch = next(iter(loader))
        elapsed = time.time() - start
        print(f"num_workers={nw} | first batch: {elapsed:.2f}s")

if __name__ == '__main__':
    main()