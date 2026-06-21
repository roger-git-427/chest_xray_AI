# ByteAI — Web UI (React + FastAPI)

Professional screening interface for **ByteAI**. **Code and APIs are in English**; **user-facing labels are in Spanish** (`frontend/src/i18n/es.ts`).

## Prerequisites

- Python venv with project dependencies (`torch`, `timm`, etc.)
- Node.js 18+

```bash
pip install -r requirements-web.txt
cd frontend && npm install
```

## Development

**One terminal** (from project root):

```bash
npm install
npm run dev:all
```

Starts the API on port **8001** and Vite on **5173** together. Open http://localhost:5173.

Or run separately:

```bash
# API
.\.venv\Scripts\python -m uvicorn api.main:app --reload --host 127.0.0.1 --port 8001

# Frontend
cd frontend && npm run dev
```

Use port **8001** in development (port 8000 is often taken on Windows). Vite proxies `/api` to `http://127.0.0.1:8001` (see `frontend/vite.config.ts`).

**Folder tab:** browse `data/images/images` (default), filter by filename, pick an image, run screening without uploading.

**Upload tab:** analyze a single file from disk.

## Production (single server)

```bash
cd frontend && npm run build
cd ..
.\.venv\Scripts\python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```

Open http://localhost:8000 — FastAPI serves the built UI and `/api/*`. (Development uses port **8001** because Vite proxies to that port; production can use any free port.)

## Add a new trained condition

1. Train: `python train.py --condition Pneumonia`
2. Add to `SCREENING_CONDITIONS` in `config.py`
3. Add Spanish label in `CONDITION_LABEL_ES` and threshold in `REVIEW_THRESHOLDS`
4. Restart the API

## Legacy Streamlit app

`app.py` is kept for reference but deprecated.
