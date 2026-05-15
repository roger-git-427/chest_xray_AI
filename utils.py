# ── utils.py ──────────────────────────────────────────────
# Seed setting and helper functions.

import os
import random
import numpy as np
import torch
from config import SEED


def set_seed(seed=SEED):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark     = False
    print(f"Seed set: {seed}")


def seed_worker(worker_id):
    worker_seed = torch.initial_seed() % 2**32
    np.random.seed(worker_seed)
    random.seed(worker_seed)


def make_generator(seed=SEED):
    g = torch.Generator()
    g.manual_seed(seed)
    return g


def ensure_dirs():
    os.makedirs('checkpoints', exist_ok=True)
    print("Directories ready.")
