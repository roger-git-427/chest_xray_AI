"""Configuración de la aplicación basada en variables de entorno."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

import config
from dotenv import load_dotenv

load_dotenv(config.PROJECT_ROOT / ".env")


def _bool_env(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{(config.PROJECT_ROOT / 'cxrai-dev.db').as_posix()}",
    )
    storage_backend: str = os.getenv("STORAGE_BACKEND", "local")
    storage_root: Path = Path(
        os.getenv("STORAGE_ROOT", str(config.PROJECT_ROOT / ".cxrai-storage"))
    )
    session_cookie_name: str = os.getenv("SESSION_COOKIE_NAME", "cxrai_session")
    csrf_cookie_name: str = os.getenv("CSRF_COOKIE_NAME", "cxrai_csrf")
    session_days: int = int(os.getenv("SESSION_DAYS", "7"))
    secure_cookies: bool = _bool_env("SECURE_COOKIES", False)
    azure_storage_connection_string: str | None = os.getenv(
        "AZURE_STORAGE_CONNECTION_STRING"
    )
    azure_storage_container: str = os.getenv(
        "AZURE_STORAGE_CONTAINER", "cxrai-private"
    )


settings = Settings()
