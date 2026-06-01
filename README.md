# ByteAI

**ByteAI** is a full-stack chest X-ray screening application for preliminary, AI-assisted triage. It trains binary classifiers per thoracic finding on the [NIH ChestX-ray14](https://nihcc.app.box.com/v/ChestXray-NIHCC) dataset and serves them through a clinical-style web UI aimed at private clinics in Mexico and Latin America.

> **Not a medical device.** Outputs are decision-support signals only. A licensed clinician must interpret every study before clinical action.

---

## Features

| Area | Capabilities |
|------|----------------|
| **Screening** | Multi-condition inference (e.g. Cardiomegaly, Effusion) with per-condition thresholds and Spanish recommendations |
| **Workflow** | Browse a local image folder or upload a single study; batch folder screening with progress and summary |
| **Viewer** | PACS-style viewport — zoom, pan, invert, window presets, prev/next study navigation |
| **Results** | Triage-oriented informe, timeline of recent analyses, PDF export with thumbnail and findings table |
| **UX** | Spanish UI copy; dark/light theme; keyboard shortcuts (`↑`/`↓` or `j`/`k`); mobile-friendly layout |

**Code and APIs are in English.** User-facing labels are in Spanish (`frontend/src/i18n/es.ts`).

---

## Tech stack

| Layer | Technologies |
|-------|----------------|
| **ML** | PyTorch, [timm](https://github.com/huggingface/pytorch-image-models), ConvNeXt-Tiny |
| **API** | FastAPI, uvicorn, Pillow |
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
pip install torch timm  # install versions appropriate for your CUDA/CPU setup
pip install -r requirements-web.txt

cd frontend
npm install
```

### Development (two terminals)

**Terminal 1 — API** (project root):

```powershell
.\.venv\Scripts\python -m uvicorn api.main:app --reload --host 127.0.0.1 --port 8001
```

Port **8001** is used in dev because 8000 is often busy on Windows. Vite proxies `/api` to this port.

**Terminal 2 — frontend**:

```powershell
cd frontend
npm run dev
```

Open **http://localhost:5173**. Default dev login: user `root`, password `admin` (see `frontend/src/context/AuthContext.tsx`).

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
├── api/                    # FastAPI routes, model registry, image serving
├── frontend/               # ByteAI React app
├── config.py               # Paths, conditions, thresholds, training hyperparameters
├── train.py                # Training loop
├── evaluate.py             # Test-set metrics
├── inference.py            # Load weights and predict
├── dataset.py, model.py, utils.py
├── checkpoints/            # Trained weights (gitignored)
├── data/                   # NIH images + CSV (gitignored)
├── README-BACKEND.md       # Training, inference, API reference
├── README-FRONTEND.md      # UI architecture and components
└── README-WEB.md           # Web quick start
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

1. `python train.py --condition <Name>`
2. Add `<Name>` to `SCREENING_CONDITIONS` in `config.py`
3. Add Spanish label in `CONDITION_LABEL_ES` and threshold in `REVIEW_THRESHOLDS`
4. Restart the API

---

## Documentation

| Document | Contents |
|----------|----------|
| [README-WEB.md](README-WEB.md) | Dev vs production, ports, new conditions |
| [README-BACKEND.md](README-BACKEND.md) | Training, evaluation, inference CLI, API |
| [README-FRONTEND.md](README-FRONTEND.md) | Components, hooks, PDF export, i18n |

---

## Disclaimer

ByteAI is research and decision-support software. It is **not** FDA-cleared or certified as a medical device. Do not use model outputs as the sole basis for diagnosis or treatment. Always follow local regulations and institutional protocols.
