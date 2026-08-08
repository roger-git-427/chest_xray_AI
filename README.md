# ByteAI

**ByteAI** is a full-stack chest X-ray screening application for preliminary, AI-assisted triage. It trains binary classifiers per thoracic finding on the [NIH ChestX-ray14](https://nihcc.app.box.com/v/ChestXray-NIHCC) dataset and serves them through a clinical-style web UI aimed at private clinics in Mexico and Latin America.

> **Not a medical device.** Outputs are decision-support signals only. A licensed clinician must interpret every study before clinical action.

---

## Features

| Area | Capabilities |
|------|----------------|
| **Screening** | Multi-condition inference (e.g. Cardiomegaly, Effusion) with per-condition thresholds, Grad-CAM heatmaps, and Spanish recommendations |
| **Workflow** | Browse a local image folder or upload PNG/JPG/DICOM; batch folder screening with progress and summary |
| **Viewer** | PACS-style viewport — zoom, pan, invert, window presets, prior side-by-side, prev/next study navigation |
| **Results** | Triage informe, NIH/DICOM metadata, prior probability deltas, timeline, polished PDF with heatmaps and signature block |
| **Platform** | PostgreSQL-backed clinics, Master/Administrator/Patient roles, private study storage, reports, and audit history |
| **UX** | Spanish UI copy; dark/light theme; keyboard shortcuts (`↑`/`↓` or `j`/`k`); mobile-friendly layout |

**Code and APIs are in English.** User-facing labels are in Spanish (`frontend/src/i18n/es.ts`).

---

## Tech stack

| Layer | Technologies |
|-------|----------------|
| **ML** | PyTorch, [timm](https://github.com/huggingface/pytorch-image-models), ConvNeXt-Tiny |
| **API** | FastAPI, uvicorn, Pillow, pydicom, SQLAlchemy, Alembic |
| **Auth / tenancy** | Argon2id passwords, HttpOnly sessions, CSRF, Master / Admin / Patient roles |
| **UI** | React 18, TypeScript, Vite 5, Tailwind CSS |
| **Reports** | jsPDF (client-side PDF download) |

The legacy **Streamlit** app (`app.py`) is deprecated; use the React + FastAPI stack.

---

## Quick start

### Prerequisites

- Python 3.10+ with a virtual environment
- PyTorch, timm, and project ML dependencies (see [README-BACKEND.md](README-BACKEND.md))
- Trained weights in `checkpoints/` (not included in this repo — see [Checkpoints](#checkpoints))
- Node.js 18+ (for the frontend)

```powershell
# From the repository root
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-ml.txt

cd frontend
npm install
```

### First-time database and Master account

SQLite is the default local database (`byteai-dev.db`). Do not leave
`DATABASE_URL` pointing at a temporary migration test file.

```powershell
# From the repository root, with venv activated
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
.\.venv\Scripts\python -m alembic upgrade head

$env:BYTEAI_MASTER_EMAIL="you@example.com"
$env:BYTEAI_MASTER_PASSWORD="use-a-long-random-password"
$env:BYTEAI_MASTER_NAME="Your Name"
.\.venv\Scripts\python -m api.seed_master
```

Full PostgreSQL / Azure guidance: [README-PERSISTENCE.md](README-PERSISTENCE.md).

### Development

**One command** (project root):

```powershell
npm install
npm run dev:all
```

Starts API (port **8001**) and frontend (port **5173**) together. Open
**http://localhost:5173** and sign in with the seeded Master email/password.

Or use two terminals — see [README-WEB.md](README-WEB.md).

### Production (single server)

```powershell
cd frontend
npm run build
cd ..
.\.venv\Scripts\python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```

Open **http://localhost:8000** — FastAPI serves the built UI and `/api/*`.

Full setup details: [README-WEB.md](README-WEB.md).

---

## Repository layout

```
chest_xray_ai/
├── alembic/                # Versioned database schema
├── api/                    # FastAPI routers, services, auth, DB, storage
├── frontend/               # ByteAI React app
├── tests/                  # Authorization, workflow, and migration tests
├── scripts/                # Utility scripts (e.g. investor pitch PDF)
├── docs/                   # Generated drafts and notes
├── config.py               # Paths, conditions, thresholds, training hyperparameters
├── train.py                # Training loop
├── evaluate.py             # Test-set metrics
├── inference.py            # Load weights and predict
├── dataset.py, model.py, utils.py
├── checkpoints/            # Trained weights (gitignored)
├── data/                   # NIH images + CSV (gitignored)
├── requirements-web.txt    # API / web runtime
├── requirements-ml.txt     # Runtime + training
├── requirements-dev.txt    # Tests
├── README-BACKEND.md       # Training, inference, API reference
├── README-FRONTEND.md      # UI architecture and components
├── README-PERSISTENCE.md   # Database, roles, storage, Azure
└── README-WEB.md           # Authoritative run instructions
```

---

## Data & checkpoints

This repository does **not** ship patient images or model weights.

1. Download [NIH ChestX-ray14](https://nihcc.app.box.com/v/ChestXray-NIHCC) and place images under `data/images/images` with `data/Data_Entry_2017_v2020.csv`.
2. Train a condition, for example:

   ```powershell
   python train.py --condition Effusion
   ```

3. Ensure `checkpoints/best_model_<condition>.pth` exists as a **real file** (OneDrive can turn `.pth` into folders — delete and recopy if that happens).
4. Add the condition to `SCREENING_CONDITIONS` in `config.py` and restart the API.

---

## Adding a screening condition

The authoritative training, evaluation, and condition-registration steps are in
[README-BACKEND.md](README-BACKEND.md).

---

## Documentation

| Document | Contents |
|----------|----------|
| [README-WEB.md](README-WEB.md) | Dev vs production, ports, new conditions |
| [README-BACKEND.md](README-BACKEND.md) | Training, evaluation, inference CLI, API |
| [README-FRONTEND.md](README-FRONTEND.md) | Components, hooks, PDF export, i18n |
| [README-PERSISTENCE.md](README-PERSISTENCE.md) | PostgreSQL, roles, storage, migrations, security, and Azure |

---

## Disclaimer

ByteAI is research and decision-support software. It is **not** FDA-cleared or certified as a medical device. Do not use model outputs as the sole basis for diagnosis or treatment. Always follow local regulations and institutional protocols.
