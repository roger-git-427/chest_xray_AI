# Frontend — ByteAI

**ByteAI** is the product brand. This folder contains the **React + TypeScript + Vite** web app for preliminary chest X-ray screening. It connects to the FastAPI backend under `/api`.

**User-facing copy is in Spanish** (`src/i18n/es.ts`). **Code, types, and API field names are in English.**

---

## Overview

The UI supports two workflows:

1. **Desde carpeta** — Browse images on disk (default NIH folder), filter by filename, preview, run screening.
2. **Subir archivo** — Upload a PNG/JPG/DICOM (`.dcm`) and run screening.

Users select which trained **conditions** to evaluate (sidebar). Results show per-condition probability, threshold, flagged status, and recommendations.

### Platform features
- **Auth** — Backend sessions with Master, clinic Administrator, and Patient roles
- **Themes** — Dark / light toggle in header
- **Timeline** — Server-backed clinic/patient study history; click an entry to restore the informe
- **Worklist** — Database-backed status (pendiente → analizado → revisado → exportado)
- **NIH metadata** — Patient age/sex/view/follow-up from CSV via `/api/study/{filename}`; shown in viewer + informe
- **DICOM** — Upload or browse `.dcm`; metadata panel in informe; preview via `preview_data_url` after screening
- **Priors** — Side-by-side compare with most recent prior CXR; **Analizar estudio previo** button runs prior screening for delta comparison
- **Grad-CAM** — Heatmap overlays on single-study screening; toggle in viewer and finding cards; embedded in PDF export
- **Viewer** — Zoom, pan, invert, window presets, heatmap overlay; prev/next study in folder mode
- **Navigation** — Keyboard `↑`/`↓` or `j`/`k` between studies (folder tab); optional auto-advance after screening
- **Batch** — “Analizar carpeta” runs screening on all listed images with progress, cancel, and summary table
- **Export** — PDF with report ID, thumbnail, DICOM/NIH metadata, clinical notes, findings table, Grad-CAM thumbnails, signature block
- **Model cards** — Per-condition architecture, AUC, calibration table (from `evaluate.py` → `metrics_*.json`)
- **Calibration preview** — Client-side threshold sliders (visual only; does not re-run model)
- **Clinical visual language** — Priority stripes, tabular probabilities, header triage chip when flagged
- **Mobile** — Bottom nav: Estudio · Visor · Informe · Protocolo

---

## Tech stack

| Tool | Version / role |
|------|----------------|
| React | 18 — UI components |
| TypeScript | 5 — typing |
| Vite | 5 — dev server, build, API proxy |
| Tailwind CSS | 3 — styling |
| PostCSS + Autoprefixer | CSS pipeline |

No routing library — role-gated single-page shell in `App.tsx`
(Master/Admin workbench vs Patient portal).

---

## Project layout

```
frontend/
├── index.html              # Fonts, dark theme meta
├── vite.config.ts          # Dev server + /api proxy
├── tailwind.config.js      # Design tokens (colors, shadows, animations)
├── postcss.config.js
├── package.json
└── src/
    ├── main.tsx            # React entry
    ├── index.css           # Tailwind layers + component classes
    ├── App.tsx
    ├── hooks/              # Focused screening, timeline, worklist, patient, and navigation hooks
    ├── lib/                # PDF, mappers, formatting, roles, legacy storage
    ├── types/              # workspace.ts (WorkspaceTab)
    ├── context/            # Auth, clinic selection, shared studies, theme
    ├── api/client.ts
    ├── i18n/es.ts
    └── components/
        ├── auth/           # AuthGate
        ├── admin/          # Clinic and account management
        ├── patient/        # Read-only patient portal
        ├── layout/         # AppHeader, MobileNav, StudyTimeline, …
        ├── workspace/      # FolderWorkspace, ImagingViewport, BatchScreeningPanel, …
        ├── results/        # ResultsDashboard, ExportReportButton, …
        └── ui/             # ProbabilityGauge
```

---

## Design system (dark healthcare / tech)

The UI was redesigned for a **dark, clinical, tech-forward** look:

| Element | Implementation |
|---------|----------------|
| **Background** | Deep navy (`surface-900`) + cyan mesh gradients (`bg-mesh`) + subtle grid overlay |
| **Panels** | Glass-style cards (`.glass-panel`) — blur, light border, inset highlight |
| **Accent** | Cyan/teal (`accent`, `accent-dim`, `accent-glow`) for actions and focus |
| **Typography** | Plus Jakarta Sans (UI), Roboto Mono (metrics, paths, thresholds — plain zeros) |
| **Status** | Emerald = below threshold; amber = flagged for review |
| **Motion** | `animate-fade-in` on results; pulse on status dots; spinners while loading |

### Reusable CSS classes (`src/index.css`)

| Class | Use |
|-------|-----|
| `.pro-panel` / `.pro-panel-header` / `.pro-panel-body` | Card layout |
| `.pro-input` | Text inputs |
| `.pro-btn-primary` | Main CTA (run screening) |
| `.pro-btn-secondary` | Secondary actions (batch folder) |
| `.pro-seg` / `.pro-seg-btn` | Folder vs upload tabs |
| `.viewport` | Imaging viewer chrome |

### Tailwind extensions (`tailwind.config.js`)

- **`surface.*`** — Background scale (950 → 500)
- **`accent.*`** — Brand cyan palette
- **`shadow-glow`**, **`shadow-card`** — Depth and highlights
- **`bg-mesh`**, **`bg-grid-pattern`** — Ambient background

---

## API client (`src/api/client.ts`)

All requests use `API_BASE` = `import.meta.env.VITE_API_URL ?? ''` (empty in dev so Vite proxy handles `/api`).

| Function | Backend route |
|----------|----------------|
| `login()` / `logout()` / `fetchCurrentUser()` | `/api/auth/*` |
| `fetchClinics()` / `createClinic()` | `/api/clinics` |
| `fetchClinicMembers()` / `createClinicMember()` | `/api/clinics/{id}/members` |
| `fetchPersistedStudies()` | `GET /api/studies` |
| `savePersistedReport()` / `reviewPersistedStudy()` | `/api/studies/{id}/*` |
| `fetchSettings()` | `GET /api/settings` |
| `fetchConditions()` | `GET /api/conditions` |
| `fetchImageList(folder, query)` | `GET /api/images` |
| `imageContentUrl(folder, name)` | `GET /api/images/content` |
| `fetchStudyMetadata(filename)` | `GET /api/study/{filename}` |
| `fetchStudyPriors(filename)` | `GET /api/study/{filename}/priors` |
| `screenImageFromPath(...)` | Persistent `/api/studies/screen/path` with clinic; legacy `/api/screen/path` otherwise |
| `screenImage(file, conditions, clinicId)` | `POST /api/studies/screen` |

Types: `ConditionInfo`, `ScreeningResult`, `ScreeningResponse`, `ImageListResponse`, `AppSettings`.

---

## Main screen flow (`App.tsx`)

1. On mount — load conditions + default image folder from API.
2. **Folder tab** — Debounced (300 ms) image list when folder/filter changes.
3. **Upload tab** — Local file preview via `URL.createObjectURL`.
4. Sidebar — Multi-select conditions (only `available: true` enabled).
5. **Ejecutar análisis IA** — Single study screening; optional auto-advance to next file.
6. **Analizar carpeta** — Batch screening with progress bar and summary table.
7. Footer — Medical disclaimer (Spanish).

### Keyboard shortcuts (folder tab)

| Key | Action |
|-----|--------|
| `↑` / `k` | Previous study in list |
| `↓` / `j` | Next study in list |

Ignored when focus is in an input field.

### UI sections

- **Header** — Logo, title, subtitle, “AI Screening” status badge
- **Sidebar** — Condition checkboxes + review thresholds
- **Tabs** — Pill-style switcher (folder / upload)
- **Work area** — Controls + large X-ray preview (empty state with icon)
- **Results** — `ResultsDashboard` with overall banner + `FindingCard` grid
- **Disclaimer** — Amber-bordered legal notice

---

## Components

### `ResultsDashboard`

- Empty state when no screening has run; clinician summary line (study + overall status).
- DICOM and NIH metadata panels.
- Prior probability deltas when prior was screened in session; **Analizar estudio previo** button if not yet screened.
- **Confirmar revisión** finalizes the server-backed report with reviewer and timestamp.
- Editable impression, recommendations, clinician name (`useReportDraft`).
- Calibration preview sliders (visual only).
- `ExportReportButton` → full PDF export with clinical context.
- Overall status banner and per-condition `FindingCard` grid.

### `FindingCard`

- Condition title, flagged badge, probability bar with threshold marker.
- Optional Grad-CAM thumbnail toggle per finding.
- Spanish recommendation and model-signal disclaimer.

### `ImagingViewport`

- PACS-style viewer: zoom (wheel/buttons), pan when zoomed, invert, reset.
- **Window presets** (client-side CSS approximations): Estándar, Pulmón, Hueso, Mediastino — see `viewportWindowLevel.ts`.
- **Grad-CAM overlay** — toggle heatmap on the study image; switch layer when multiple conditions screened.
- **Prior compare** — side-by-side with most recent NIH prior (folder mode).
- Footer strip: source kind + screened timestamp when available.
- Prev/next study controls (folder tab only).

### `BatchScreeningPanel`

- Progress bar, cancel, summary table; click row or Enter/Space to open study + informe.

### `StudyTimeline`

- Persists last 20 analyses (`byteai-timeline-v2`); click to restore; re-export PDF with same fields as main export (draft, metadata, review badge).

---

## Internationalization

All visible strings live in `src/i18n/es.ts` as the `es` object. To add English later, introduce a locale switch and mirror keys; keep API condition IDs in English (`Cardiomegaly`, `Effusion`, …).

---

## Development

### Prerequisites

- Node.js 18+
- Backend running (see [README-BACKEND.md](../README-BACKEND.md))

### Install

```powershell
cd frontend
npm install
```

### Run dev server

```powershell
npm run dev
```

Open **http://localhost:5173**

Vite proxies `/api` → `http://127.0.0.1:8001` (see `vite.config.ts`). Start the API on that port, or change the proxy `target` to match your backend.

### Optional: explicit API URL

```powershell
$env:VITE_API_URL="http://127.0.0.1:8001"
npm run dev
```

### Production build

```powershell
npm run build
```

Output: `frontend/dist/`. The FastAPI app serves this folder at `/` when present.

Preview build locally:

```powershell
npm run preview
```

---

## Environment

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | API origin (default `''` for proxy in dev) |

---

## Styling conventions

- Prefer `pro-*` classes and CSS variables in `index.css` (`pro-panel`, `pro-btn-primary`, `pro-btn-secondary`, `pro-input`).
- Do not hardcode Spanish in components — use `es` from `i18n/es.ts`.
- Screening semantics: flagged = amber, routine = emerald (consistent across bar, cards, banners).

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| “No hay modelos entrenados” | Backend `GET /api/conditions` — `available: false` for all. See backend README (checkpoint files must be real `.pth` files). |
| Network / proxy errors | API running? Proxy port in `vite.config.ts` matches uvicorn port? |
| Empty image list | Folder path exists under `data/`; backend allows path (see `api/images.py`). |
| Styles not updating | Restart `npm run dev` after `tailwind.config.js` changes. |
| Timeline restore sin imagen (carga) | Las cargas guardadas no conservan el archivo tras recargar; el informe sí se restaura. |
| PDF sin miniatura | Compruebe que el visor tenga imagen cargada o use re-export desde historial (carpeta). |

---

## Related docs

- [README-BACKEND.md](../README-BACKEND.md) — Training, API, checkpoints, inference
- [README-WEB.md](../README-WEB.md) — Quick two-terminal start guide
