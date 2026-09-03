#!/bin/sh
set -eu

echo "Esperando la base de datos..."
python - <<'PY'
import os
import sys
import time

from sqlalchemy import create_engine, text

url = os.environ.get("DATABASE_URL", "")
if not url:
    print("Se requiere DATABASE_URL", file=sys.stderr)
    sys.exit(1)

deadline = time.time() + 60
last_error = None
while time.time() < deadline:
    try:
        engine = create_engine(url, pool_pre_ping=True)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("La base de datos está lista.")
        sys.exit(0)
    except Exception as exc:  # noqa: BLE001 — bucle de espera de arranque
        last_error = exc
        time.sleep(1)

print(f"La base de datos no está lista: {last_error}", file=sys.stderr)
sys.exit(1)
PY

echo "Ejecutando migraciones..."
alembic upgrade head

if [ -n "${CXRAI_MASTER_EMAIL:-}" ] && [ -n "${CXRAI_MASTER_PASSWORD:-}" ]; then
  echo "Creando cuenta Master..."
  python -m api.seed_master
else
  echo "Omitiendo creación de cuenta Master (CXRAI_MASTER_EMAIL / CXRAI_MASTER_PASSWORD no configurados)."
fi

echo "Iniciando API..."
exec uvicorn api.main:app --host 0.0.0.0 --port 8000
