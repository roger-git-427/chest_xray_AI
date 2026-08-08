# ByteAI — Web UI (React + FastAPI)

Professional screening interface for **ByteAI**. **Code and APIs are in English**; **user-facing labels are in Spanish** (`frontend/src/i18n/es.ts`).

## Prerequisites

- Python venv with project dependencies (`torch`, `timm`, etc.)
- Node.js 18+

```bash
pip install -r requirements-web.txt
cd frontend && npm install
```

## First-time setup

```powershell
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
.\.venv\Scripts\pip install -r requirements-web.txt
.\.venv\Scripts\python -m alembic upgrade head

$env:BYTEAI_MASTER_EMAIL="you@example.com"
$env:BYTEAI_MASTER_PASSWORD="use-a-long-random-password"
$env:BYTEAI_MASTER_NAME="Your Name"
.\.venv\Scripts\python -m api.seed_master
```

Details: [README-PERSISTENCE.md](README-PERSISTENCE.md).

## Development

**One terminal** (from project root):

```bash
npm install
npm run dev:all
```

Starts the API on port **8001** and Vite on **5173** together. Open http://localhost:5173
and sign in with the seeded Master account.

Or run separately:

```bash
# API
.\.venv\Scripts\python -m uvicorn api.main:app --reload --host 127.0.0.1 --port 8001

# Frontend
cd frontend && npm run dev
```

Use port **8001** in development (port 8000 is often taken on Windows). Vite proxies `/api` to `http://127.0.0.1:8001` (see `frontend/vite.config.ts`).

**Roles:** Master sees the full workspace plus clinic administration. Clinic
Administrators work inside assigned clinics. Patients see a read-only portal of
finalized reports only.

**Folder tab (Master):** browse `data/images/images` (default), filter by filename, pick an image, run screening. Persisted imports require an active clinic.

**Upload tab:** analyze a single PNG, JPG, or DICOM (`.dcm`); Administrators should assign a patient before screening.

**DICOM:** metadata appears in the informe after screening; preview is generated server-side.

**Heatmaps:** single-study screening includes Grad-CAM overlays (Cardiomegaly/Effusion when models loaded). Batch screening skips heatmaps for speed.

**Priors:** when NIH metadata lists a prior study, use **Analizar estudio previo** in the informe to enable probability deltas.

## Production (single server)

```bash
cd frontend && npm run build
cd ..
.\.venv\Scripts\python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```

Open http://localhost:8000 — FastAPI serves the built UI and `/api/*`. (Development uses port **8001** because Vite proxies to that port; production can use any free port.)

## Add a new trained condition

Follow the authoritative checklist in
[README-BACKEND.md](README-BACKEND.md), then restart both web processes.

## Legacy Streamlit app

`app.py` is kept for reference but deprecated.
