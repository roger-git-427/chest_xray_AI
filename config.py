# ── config.py ─────────────────────────────────────────────
# All hyperparameters and paths in one place.
# Change settings here — nothing else needs editing.

import torch

# ── Paths ─────────────────────────────────────────────────
IMAGE_DIR  = 'data/images/images'
CSV_PATH   = 'data/Data_Entry_2017_v2020.csv'
TRAIN_TXT  = 'data/train_val_list.txt'
TEST_TXT   = 'data/test_list.txt'

# ── Checkpoints  and Conditions ───────────────────────────────────────────

#### Cardiomegaly ####
CONDITION    = 'Cardiomegaly'
CHECKPOINT_PATH = f'checkpoints/checkpoint_{CONDITION.lower()}.pth'
BEST_MODEL_PATH = f'checkpoints/best_model_{CONDITION.lower()}.pth'

# ── Training ──────────────────────────────────────────────
SEED       = 42
IMG_SIZE   = 224
BATCH_SIZE = 32
NUM_EPOCHS = 30
LR         = 1e-4
NUM_WORKERS = 0

# ── Model ─────────────────────────────────────────────────
MODEL_NAME = 'convnext_tiny.fb_in22k_ft_in1k'

# ── Device ────────────────────────────────────────────────
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
