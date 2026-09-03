# ── config.py ─────────────────────────────────────────────
# Todos los hiperparámetros y rutas en un solo lugar.
# Cambia la configuración aquí — no hace falta editar nada más.

import torch
from pathlib import Path

# ── Rutas ─────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent
IMAGE_DIR  = 'data/images/images'
CSV_PATH   = 'data/Data_Entry_2017_v2020.csv'
TRAIN_TXT  = 'data/train_val_list.txt'
TEST_TXT   = 'data/test_list.txt'

# ── Checkpoints y condiciones ────────────────────────────────────────────
# Cada condición escribe en sus propios archivos (p. ej. best_model_effusion.pth).
# Entrenar: python train.py --condition Effusion
# Evaluar:  python evaluate.py --condition Effusion

CONDITION = 'Effusion'


def checkpoint_path(condition):
    return f'checkpoints/checkpoint_{condition.lower()}.pth'


def best_model_path(condition):
    return f'checkpoints/best_model_{condition.lower()}.pth'


def set_active_condition(condition):
    """Cambia la enfermedad objetivo para entrenamiento / evaluación / inferencia."""
    global CONDITION, CHECKPOINT_PATH, BEST_MODEL_PATH
    CONDITION = condition
    CHECKPOINT_PATH = checkpoint_path(condition)
    BEST_MODEL_PATH = best_model_path(condition)


CHECKPOINT_PATH = checkpoint_path(CONDITION)
BEST_MODEL_PATH = best_model_path(CONDITION)

# Etiquetas en español solo para la UI (CONDITION permanece en inglés para datos/código)
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


# Umbrales de marcaje para tamizaje (ajustar en validación; fijados por condición)
DEFAULT_REVIEW_THRESHOLD = 0.3
REVIEW_THRESHOLDS = {
    'Cardiomegaly': 0.3,
    'Effusion': 0.4,
    'Pneumonia': 0.35,
    'Pneumothorax': 0.35,
    'Nodule': 0.35,
}


def review_threshold(condition=None):
    condition = condition or CONDITION
    return REVIEW_THRESHOLDS.get(condition, DEFAULT_REVIEW_THRESHOLD)


# Condiciones expuestas en la UI web (orden conservado; requiere best_model_<condition>.pth)
SCREENING_CONDITIONS = [
    'Cardiomegaly',
    'Effusion',
    'Pneumonia',
    'Pneumothorax',
    'Nodule',
]


def available_screening_conditions():
    return [
        c for c in SCREENING_CONDITIONS
        if Path(best_model_path(c)).is_file()
    ]

# ── Entrenamiento ──────────────────────────────────────────────
SEED       = 42
IMG_SIZE   = 224
BATCH_SIZE = 32
NUM_EPOCHS = 30
LR         = 1e-4
NUM_WORKERS = 0

# ── Modelo ─────────────────────────────────────────────────
MODEL_NAME = 'convnext_tiny.fb_in22k_ft_in1k'

# ── Dispositivo ────────────────────────────────────────────────
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
