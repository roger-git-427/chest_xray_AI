import os
from PIL import Image
from tqdm import tqdm

IMAGE_DIR = 'data/images/images'
corrupted = []

for fname in tqdm(os.listdir(IMAGE_DIR), desc="Scanning"):
    fpath = os.path.join(IMAGE_DIR, fname)
    try:
        img = Image.open(fpath)
        img.verify()
    except Exception as e:
        corrupted.append((fname, str(e)))

print(f"\nCorrupted files found: {len(corrupted)}")
for fname, error in corrupted:
    print(f"  {fname} → {error}")