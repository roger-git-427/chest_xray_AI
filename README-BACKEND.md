# Backend — ByteAI

Python backend for training, evaluation, and serving **ByteAI** chest X-ray screening models. The web product uses **FastAPI** for HTTP; older **Streamlit** UI (`app.py`) is deprecated.

---

## Overview

| Layer | Role |
|--------|------|
| **Training** (`train.py`, `model.py`, `dataset.py`) | Train binary classifiers per thoracic condition (NIH ChestX-ray14) |
| **Inference** (`inference.py`) | Load weights, run single-image prediction with thresholds |
| **REST API** (`api/`) | Expose screening, image browse, and settings to the React frontend |
| **Config** (`config.py`) | Paths, conditions, thresholds, hyperparameters |

**Model:** ConvNeXt-Tiny (`convnext_tiny.fb_in22k_ft_in1k` via `timm`), one head per condition, sigmoid output.

**Important:** APIs and code identifiers are in **English**. Clinical recommendations and UI labels shown to users are in **Spanish** (see `condition_label_es()` and `inference.py`).

---

## Project layout (backend-relevant)

```
chest_xray_ai/
├── api/
│   ├── main.py       # FastAPI app, routes, CORS, static UI mount
│   ├── registry.py   # Model cache, preload, multi-condition screening
│   └── images.py     # Safe folder listing and image file serving
├── config.py         # Central configuration
├── dataset.py        # NIH dataset, transforms, DataLoaders
├── model.py          # Architecture, loss, optimizer, scheduler
├── train.py          # Training loop + checkpoints
├── evaluate.py       # Test-set metrics
├── inference.py      # CLI + shared predict/load helpers
├── utils.py          # Seeds, directories
├── app.py            # Legacy Streamlit (deprecated)
├── requirements-web.txt   # FastAPI stack only
└── checkpoints/      # Trained weights (gitignored)
```

---

## Configuration (`config.py`)

### Paths

| Setting | Default | Purpose |
|---------|---------|---------|
| `IMAGE_DIR` | `data/images/images` | Default X-ray folder for the UI |
| `CSV_PATH` | `data/Data_Entry_2017_v2020.csv` | NIH labels |
| `PROJECT_ROOT` | Repo root | Resolved paths for API security |

### Conditions

- **`SCREENING_CONDITIONS`** — Conditions listed in the web UI (currently `Cardiomegaly`, `Effusion`).
- **`available_screening_conditions()`** — Subset that has a real weights **file** on disk.
- **`CONDITION_LABEL_ES`** — Spanish display names.
- **`REVIEW_THRESHOLDS`** — Per-condition probability cutoff for “flagged for review”.

### Checkpoint files

Each condition uses two files under `checkpoints/`:

| File | Purpose |
|------|---------|
| `best_model_<condition>.pth` | Best weights by validation AUC — **used for inference and API** |
| `checkpoint_<condition>.pth` | Full training state (epoch, optimizer, scheduler) for resume |

`<condition>` is lowercased in the filename (e.g. `Effusion` → `best_model_effusion.pth`).

Helpers:

```python
best_model_path("Cardiomegaly")   # checkpoints/best_model_cardiomegaly.pth
checkpoint_path("Effusion")       # checkpoints/checkpoint_effusion.pth
```

---

## Training

### Setup

Use a virtual environment at the project root:

```powershell
cd c:\Users\cheli\Documents\chest_xray_ai
python -m venv .venv
.\.venv\Scripts\pip install -r requirements-web.txt
.\.venv\Scripts\pip install torch timm pandas scikit-learn numpy tqdm
```

### Run

```powershell
.\.venv\Scripts\python train.py --condition Cardiomegaly
.\.venv\Scripts\python train.py --condition Effusion
```

Training saves:

- `best_model_*.pth` when validation AUC improves.
- `checkpoint_*.pth` every epoch for resume.

Saves use **`_use_new_zipfile_serialization=False`** so weights stay as a **single file**. That avoids issues on Windows when cloud sync (e.g. OneDrive) expands PyTorch zip archives into folders named `*.pth`.

### Evaluate / CLI inference

```powershell
.\.venv\Scripts\python evaluate.py --condition Effusion
.\.venv\Scripts\python inference.py --image path\to\xray.png --condition Cardiomegaly
```

---

## FastAPI application

### Startup

Models are **preloaded** on startup via `lifespan` → `api.registry.preload()`. Only conditions with existing `best_model_*.pth` files are loaded into an in-memory cache.

### Run (development)

From project root, with venv activated:

```powershell
.\.venv\Scripts\python -m uvicorn api.main:app --reload --host 127.0.0.1 --port 8001
```

> **Port note:** Port `8000` is often taken on Windows by other services. The frontend dev proxy is configured for **8001** (see `frontend/vite.config.ts`). For production you can use any free port.

### Run (production, API + built UI)

```powershell
cd frontend
npm run build
cd ..
.\.venv\Scripts\python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```

If `frontend/dist` exists, `api/main.py` mounts it at `/` and serves the React app from the same process.

### CORS

Allowed origins: `http://localhost:5173` and `http://127.0.0.1:5173` (Vite dev server).

---

## API reference

Base path: `/api`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Status + list of loaded model condition IDs |
| `GET` | `/api/settings` | `default_image_dir`, `max_list` |
| `GET` | `/api/conditions` | All `SCREENING_CONDITIONS` with Spanish labels, thresholds, `available` flag |
| `GET` | `/api/images?folder=&q=` | List image filenames (max 500), optional name filter |
| `GET` | `/api/images/content?folder=&name=` | Serve one image file |
| `POST` | `/api/screen` | Multipart upload + `conditions` query params |
| `POST` | `/api/screen/path` | JSON `{ folder, filename }` + `conditions` query params |

### Screening response (example)

```json
{
  "filename": "00000001.png",
  "overall_flagged": true,
  "results": [
    {
      "condition": "Cardiomegaly",
      "condition_label": "Cardiomegalia",
      "probability": 0.42,
      "threshold": 0.3,
      "flagged": true,
      "recommendation": "Derivar a radiólogo para confirmación"
    }
  ]
}
```

### Image browse security (`api/images.py`)

- Folder paths must resolve under `data/` (project `data` directory).
- Filenames cannot contain path separators or `..`.
- Only `.png`, `.jpg`, `.jpeg` are allowed.

---

## Inference pipeline

1. `build_model()` — ConvNeXt-Tiny, `num_classes=1`.
2. `val_transform` — Resize/normalize (same as validation).
3. Forward pass → sigmoid → probability.
4. Compare to `review_threshold(condition)` → `flagged` + Spanish `recommendation`.

Shared by the API (`registry.screen_image`) and CLI (`inference.py`).

---

## Model registry (`api/registry.py`)

- **`get_model(condition)`** — Lazy load + cache per condition.
- **`preload()`** — Load all available conditions at startup.
- **`screen_image(image, conditions)`** — Run all selected conditions on one PIL image.

If weights are missing, that condition is skipped at preload; the API returns **503** when no models are available.

---

## Checkpoints troubleshooting

### “No trained models” but files exist in `checkpoints/`

The API checks `Path(best_model_path(c)).is_file()`. On some Windows setups, **`best_model_*.pth` became a directory** (cloud sync unpacking PyTorch’s zip format). Directories are not valid weights files.

**Fix:** Ensure each `best_model_<condition>.pth` is a **single file** (tens of MB), not a folder. Re-save from training or repackage from the inner tensor layout if needed. Keep `.pth.bak` backups until screening works.

### Verify locally

```powershell
.\.venv\Scripts\python -c "from config import available_screening_conditions; print(available_screening_conditions())"
```

Expected when healthy: `['Cardiomegaly', 'Effusion']` (or whichever weights exist).

---

## Dependencies

| File | Packages |
|------|----------|
| `requirements-web.txt` | `fastapi`, `uvicorn`, `python-multipart`, `Pillow` |
| Training / inference | `torch`, `timm`, `pandas`, `scikit-learn`, `numpy`, `tqdm` (install separately) |

---

## Adding a new screening condition

1. Train: `python train.py --condition Pneumonia`
2. Add the ID to `SCREENING_CONDITIONS` in `config.py`
3. Add Spanish label in `CONDITION_LABEL_ES` and threshold in `REVIEW_THRESHOLDS`
4. Restart the API

---

## Legacy Streamlit app

`app.py` still runs with `streamlit run app.py` but is **not maintained**. Use the React + FastAPI stack described in `README-FRONTEND.md` and `README-WEB.md`.

---

## Related docs

- [README-FRONTEND.md](./README-FRONTEND.md) — React UI, design system, dev workflow
- [README-WEB.md](./README-WEB.md) — Short quick-start for running both servers
