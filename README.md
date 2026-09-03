# CXR AI Analyzer

Sistema de **tamizaje de radiografías de tórax con IA**: entrena clasificadores
binarios sobre
[NIH ChestX-ray14](https://nihcc.app.box.com/v/ChestXray-NIHCC) y los sirve en una
aplicación web con cuentas multi-clínica.

> **No es un dispositivo médico.** La salida del modelo es solo apoyo a la
> decisión: un clínico debe interpretar cada estudio.

## Qué incluye este repositorio

- **Pipeline de ML** — entrenamiento ConvNeXt-Tiny (`train.py` / `evaluate.py`),
  inferencia y mapas Grad-CAM (p. ej. Cardiomegalia y Derrame)
- **API** — FastAPI con sesiones (Master / Admin / Paciente), clínicas, estudios
  persistentes, informes y auditoría (SQLAlchemy + Alembic)
- **UI** — React + TypeScript: carga o carpeta, visor, informe de triaje y
  exportación PDF (textos en español; código y APIs en inglés)
- **Ejecución** — Docker Compose (Postgres + API + nginx) o SQLite + Vite en local

## Acceso de demostración

| Campo | Valor |
|-------|--------|
| Correo | `root@root.com` |
| Contraseña | `admin` |

## Inicio rápido (Docker)

Coloca los pesos en `checkpoints/best_model_<condicion>.pth` y luego:

```powershell
Copy-Item .env.example .env
docker compose up --build
```

Abre **http://localhost:8080** e inicia sesión con las credenciales de arriba.

## Desarrollo local

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-ml.txt
cd frontend; npm install; cd ..
npm install

Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
.\.venv\Scripts\python -m alembic upgrade head
.\.venv\Scripts\python -m api.seed_master

npm run dev:all
```

UI: **http://localhost:5174** (API en **8001**). Por defecto usa SQLite (`cxrai-dev.db`).

## Entrenar una condición

1. Coloca las imágenes NIH en `data/images/images` y el CSV en `data/Data_Entry_2017_v2020.csv`
2. `python train.py --condition Effusion`
3. Confirma que `checkpoints/best_model_effusion.pth` sea un archivo real
4. Añade la condición a `SCREENING_CONDITIONS` en `config.py` y reinicia la API

Los pesos y el dataset **no** van en git.

## Estructura

```
api/            FastAPI, auth, clínicas, estudios
frontend/       Interfaz React
alembic/        Migraciones de base de datos
train.py …      Entrenamiento / evaluación / inferencia / Grad-CAM
docker-compose.yml
checkpoints/    Pesos del modelo (local)
data/           Datos NIH (local)
```

## Aviso

No es un producto autorizado por la FDA ni certificado como dispositivo médico.
No utilice la salida del modelo como única base para diagnóstico o tratamiento.
