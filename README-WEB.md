# Web UI (React + FastAPI)

Professional screening interface. **Code and APIs are in English**; **user-facing labels are in Spanish** (`frontend/src/i18n/es.ts`).

## Prerequisites

- Python venv with project dependencies (`torch`, `timm`, etc.)
- Node.js 18+

```bash
pip install -r requirements-web.txt
cd frontend && npm install
```

## Development (two terminals)

**Terminal 1 — API** (from project root):

```bash
uvicorn api.main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 2 — frontend**:

```bash
cd frontend && npm run dev
```

Open http://localhost:5173 — Vite proxies `/api` to the backend.

**Folder tab:** browse `data/images/images` (default), filter by filename, pick an image, run screening without uploading.

**Upload tab:** analyze a single file from disk.

## Production (single server)

```bash
cd frontend && npm run build
cd .. && uvicorn api.main:app --host 0.0.0.0 --port 8000
```

Open http://localhost:8000 — FastAPI serves the built UI and `/api/*`.

## Add a new trained condition

1. Train: `python train.py --condition Pneumonia`
2. Add to `SCREENING_CONDITIONS` in `config.py`
3. Add Spanish label in `CONDITION_LABEL_ES` and threshold in `REVIEW_THRESHOLDS`
4. Restart the API

## Legacy Streamlit app

`app.py` is kept for reference but deprecated.
