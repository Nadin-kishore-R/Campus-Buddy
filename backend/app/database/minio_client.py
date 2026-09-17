import os
import shutil
from pathlib import Path
from typing import Optional, BinaryIO
import config

try:
    from minio import Minio
    MINIO_AVAILABLE = True
except ImportError:
    MINIO_AVAILABLE = False

class MinIOStorageManager:
    """Manages Object Storage for documents (PDFs, raw files) using MinIO with automatic local filesystem fallback."""

    def __init__(self):
        self.use_minio = False
        self.client = None
        self.bucket_name = config.MINIO_BUCKET
        self.local_storage_path = config.MINIO_LOCAL_STORAGE

        if MINIO_AVAILABLE:
            try:
                self.client = Minio(
                    config.MINIO_ENDPOINT,
                    access_key=config.MINIO_ACCESS_KEY,
                    secret_key=config.MINIO_SECRET_KEY,
                    secure=config.MINIO_SECURE
                )
                # Ensure bucket exists
                if not self.client.bucket_exists(self.bucket_name):
                    self.client.make_bucket(self.bucket_name)
                    print(f"[MinIOStorageManager] Created MinIO bucket '{self.bucket_name}'.")
                self.use_minio = True
                print(f"[MinIOStorageManager] Connected to MinIO endpoint '{config.MINIO_ENDPOINT}' (Bucket: {self.bucket_name})")
            except Exception as e:
                print(f"[MinIOStorageManager] MinIO connection failed ({e}). Falling back to local disk storage.")
                self.use_minio = False
        else:
            print("[MinIOStorageManager] minio Python package not available. Using local disk fallback.")

    def upload_file(self, object_name: str, file_path: Path, content_type: str = "application/pdf") -> str:
        """Uploads a local file to MinIO object storage or local disk fallback."""
        if self.use_minio:
            try:
                self.client.fput_object(
                    self.bucket_name,
                    object_name,
                    str(file_path),
                    content_type=content_type
                )
                return f"minio://{self.bucket_name}/{object_name}"
            except Exception as e:
                print(f"[MinIOStorageManager] Error uploading {object_name} to MinIO ({e}). Saving locally...")

        # Fallback local storage
        target_path = self.local_storage_path / object_name
        target_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(file_path, target_path)
        return str(target_path)

    def upload_stream(self, object_name: str, stream: BinaryIO, length: int, content_type: str = "application/pdf") -> str:
        """Uploads a file stream directly."""
        if self.use_minio:
            try:
                self.client.put_object(
                    self.bucket_name,
                    object_name,
                    stream,
                    length,
                    content_type=content_type
                )
                return f"minio://{self.bucket_name}/{object_name}"
            except Exception as e:
                print(f"[MinIOStorageManager] Stream upload to MinIO failed ({e}). Saving locally...")

        # Local fallback
        target_path = self.local_storage_path / object_name
        target_path.parent.mkdir(parents=True, exist_ok=True)
        with open(target_path, "wb") as f:
            f.write(stream.read())
        return str(target_path)

    def delete_file(self, object_name: str) -> bool:
        """Removes a file from MinIO object storage or local fallback."""
        success = False
        if self.use_minio:
            try:
                self.client.remove_object(self.bucket_name, object_name)
                success = True
            except Exception as e:
                print(f"[MinIOStorageManager] Failed to remove object {object_name} from MinIO: {e}")

        local_path = self.local_storage_path / object_name
        if local_path.exists():
            try:
                local_path.unlink()
                success = True
            except Exception:
                pass

        return success

    def get_file_path(self, object_name: str) -> Path:
        """Returns local path to stored file or downloads object locally for processing."""
        local_path = self.local_storage_path / object_name
        if local_path.exists():
            return local_path

        if self.use_minio:
            try:
                local_path.parent.mkdir(parents=True, exist_ok=True)
                self.client.fget_object(self.bucket_name, object_name, str(local_path))
                return local_path
            except Exception as e:
                print(f"[MinIOStorageManager] Error fetching {object_name} from MinIO: {e}")

        return local_path

# Singleton instance
minio_storage = MinIOStorageManager()
