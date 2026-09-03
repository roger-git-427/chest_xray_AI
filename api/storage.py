"""Almacenamiento binario privado con implementaciones local y Azure Blob."""

from __future__ import annotations

import hashlib
import mimetypes
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path, PurePosixPath

from api.settings import settings


@dataclass(frozen=True)
class StoredObject:
    key: str
    content_type: str
    size_bytes: int
    sha256: str


class StorageBackend(ABC):
    @abstractmethod
    def put(
        self,
        data: bytes,
        *,
        clinic_id: str,
        original_name: str,
        content_type: str | None = None,
        category: str = "studies",
    ) -> StoredObject:
        raise NotImplementedError

    @abstractmethod
    def get(self, key: str) -> bytes:
        raise NotImplementedError

    @abstractmethod
    def delete(self, key: str) -> None:
        raise NotImplementedError


def _object_key(
    clinic_id: str, original_name: str, category: str
) -> tuple[str, str]:
    suffix = Path(original_name).suffix.lower()
    safe_category = "".join(c for c in category if c.isalnum() or c in "-_")
    key = PurePosixPath(
        "clinics",
        clinic_id,
        safe_category or "files",
        f"{uuid.uuid4().hex}{suffix}",
    ).as_posix()
    return key, suffix


class LocalStorage(StorageBackend):
    def __init__(self, root: Path):
        self.root = root.resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        path = (self.root / Path(key)).resolve()
        if path != self.root and self.root not in path.parents:
            raise ValueError("Clave de almacenamiento no válida")
        return path

    def put(
        self,
        data: bytes,
        *,
        clinic_id: str,
        original_name: str,
        content_type: str | None = None,
        category: str = "studies",
    ) -> StoredObject:
        key, _ = _object_key(clinic_id, original_name, category)
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        mime = (
            content_type
            or mimetypes.guess_type(original_name)[0]
            or "application/octet-stream"
        )
        return StoredObject(
            key=key,
            content_type=mime,
            size_bytes=len(data),
            sha256=hashlib.sha256(data).hexdigest(),
        )

    def get(self, key: str) -> bytes:
        path = self._path(key)
        if not path.is_file():
            raise FileNotFoundError(key)
        return path.read_bytes()

    def delete(self, key: str) -> None:
        path = self._path(key)
        path.unlink(missing_ok=True)


class AzureBlobStorage(StorageBackend):
    def __init__(self, connection_string: str, container: str):
        try:
            from azure.storage.blob import BlobServiceClient
        except ImportError as exc:
            raise RuntimeError(
                "Install azure-storage-blob to use Azure storage"
            ) from exc

        service = BlobServiceClient.from_connection_string(connection_string)
        self.container = service.get_container_client(container)
        try:
            self.container.create_container()
        except Exception:
            # Es esperado que un contenedor privado ya exista.
            pass

    def put(
        self,
        data: bytes,
        *,
        clinic_id: str,
        original_name: str,
        content_type: str | None = None,
        category: str = "studies",
    ) -> StoredObject:
        from azure.storage.blob import ContentSettings

        key, _ = _object_key(clinic_id, original_name, category)
        mime = (
            content_type
            or mimetypes.guess_type(original_name)[0]
            or "application/octet-stream"
        )
        self.container.upload_blob(
            name=key,
            data=data,
            overwrite=False,
            content_settings=ContentSettings(content_type=mime),
        )
        return StoredObject(
            key=key,
            content_type=mime,
            size_bytes=len(data),
            sha256=hashlib.sha256(data).hexdigest(),
        )

    def get(self, key: str) -> bytes:
        return self.container.download_blob(key).readall()

    def delete(self, key: str) -> None:
        self.container.delete_blob(key, delete_snapshots="include")


_storage: StorageBackend | None = None


def get_storage() -> StorageBackend:
    global _storage
    if _storage is not None:
        return _storage

    if settings.storage_backend == "azure":
        if not settings.azure_storage_connection_string:
            raise RuntimeError("AZURE_STORAGE_CONNECTION_STRING is required")
        _storage = AzureBlobStorage(
            settings.azure_storage_connection_string,
            settings.azure_storage_container,
        )
    else:
        _storage = LocalStorage(settings.storage_root)
    return _storage
