# ── config.py ─────────────────────────────────────────────
# All hyperparameters and paths in one place.
# Change settings here — nothing else needs editing.

import torch
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent
IMAGE_DIR  = 'data/images/images'
CSV_PATH   = 'data/Data_Entry_2017_v2020.csv'
TRAIN_TXT  = 'data/train_val_list.txt'
TEST_TXT   = 'data/test_list.txt'

# ── Checkpoints and conditions ────────────────────────────────────────────
# Each condition writes to its own files (e.g. best_model_effusion.pth).
# Train: python train.py --condition Effusion
# Eval:  python evaluate.py --condition Effusion

CONDITION = 'Effusion'


def checkpoint_path(condition):
    return f'checkpoints/checkpoint_{condition.lower()}.pth'


def best_model_path(condition):
    return f'checkpoints/best_model_{condition.lower()}.pth'


def set_active_condition(condition):
    """Switch target disease for train / eval / inference."""
    global CONDITION, CHECKPOINT_PATH, BEST_MODEL_PATH
    CONDITION = condition
    CHECKPOINT_PATH = checkpoint_path(condition)
    BEST_MODEL_PATH = best_model_path(condition)


CHECKPOINT_PATH = checkpoint_path(CONDITION)
BEST_MODEL_PATH = best_model_path(CONDITION)

# Spanish labels for UI only (CONDITION stays English for data/code)
CONDITION_LABEL_ES = {
    'Cardiomegaly': 'Cardiomegalia',
    'Effusion': 'Derrame pleural',
    'Pneumonia': 'Neumonía',
    'Nodule': 'Nódulo',
    'Mass': 'Masa',
    'Atelectasis': 'Atelectasia',
    'Consolidation': 'Consolidación',
    'Edema': 'Edema',
    'Emphysema': 'Enfisema',
    'Fibrosis': 'Fibrosis',
    'Pleural_Thickening': 'Engrosamiento pleural',
    'Hernia': 'Hernia',
    'Pneumothorax': 'Neumotórax',
    'Infiltration': 'Infiltración',
}


def condition_label_es(condition=None):
    condition = condition or CONDITION
    return CONDITION_LABEL_ES.get(condition, condition.replace('_', ' '))


# Screening flag thresholds (tune on validation; locked per condition)
DEFAULT_REVIEW_THRESHOLD = 0.3
REVIEW_THRESHOLDS = {
    'Cardiomegaly': 0.3,
    'Effusion': 0.4,
}


def review_threshold(condition=None):
    condition = condition or CONDITION
    return REVIEW_THRESHOLDS.get(condition, DEFAULT_REVIEW_THRESHOLD)


# Conditions exposed in the web UI (order preserved; needs best_model_<condition>.pth)
SCREENING_CONDITIONS = ['Cardiomegaly', 'Effusion']


def available_screening_conditions():
    return [
        c for c in SCREENING_CONDITIONS
        if Path(best_model_path(c)).is_file()
    ]

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
