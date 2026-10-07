"""Supabase Storage operations for dataset files."""

from __future__ import annotations

import io
import logging
from pathlib import Path
from typing import BinaryIO

import httpx

from app.services import supabase_client

logger = logging.getLogger(__name__)

DATASET_BUCKET = "veriproof-datasets"


class _StreamRawIO(io.RawIOBase):
    """RawIOBase adapter wrapping any binary stream for chunked reading."""

    def __init__(self, stream: BinaryIO) -> None:
        self._stream = stream

    def readable(self) -> bool:
        return True

    def readinto(self, b: bytearray | memoryview) -> int:
        data = self._stream.read(len(b))
        n = len(data)
        b[:n] = data
        return n

    def seekable(self) -> bool:
        return True

    def seek(self, offset: int, whence: int = 0) -> int:
        return self._stream.seek(offset, whence)

    def tell(self) -> int:
        return self._stream.tell()


def upload_dataset_file(
    storage_path: str,
    file_obj: BinaryIO,
    content_type: str = "text/csv",
) -> None:
    """Upload a file to the private dataset storage bucket via streaming.

    Wraps the stream in an io.BufferedReader so storage3 / httpx streams
    the upload without spooling the entire content into a memory byte array.
    """
    file_obj.seek(0)
    raw = _StreamRawIO(file_obj)
    reader = io.BufferedReader(raw)

    client = supabase_client.get_supabase_client()
    client.storage.from_(DATASET_BUCKET).upload(
        path=storage_path,
        file=reader,
        file_options={"content-type": content_type},
    )
    file_obj.seek(0)
    logger.info("Streamed upload completed for %s/%s", DATASET_BUCKET, storage_path)


def delete_dataset_file(storage_path: str) -> None:
    """Remove an uploaded file from the private dataset storage bucket."""
    try:
        client = supabase_client.get_supabase_client()
        client.storage.from_(DATASET_BUCKET).remove([storage_path])
        logger.info("Deleted %s/%s from storage", DATASET_BUCKET, storage_path)
    except Exception:
        logger.exception("Failed to delete storage object %s", storage_path)


def download_dataset_file(storage_path: str, destination_path: str | Path) -> int:
    """Stream a private dataset object into a local file without buffering it in RAM."""
    client = supabase_client.get_supabase_client()
    signed_url_response = client.storage.from_(DATASET_BUCKET).create_signed_url(
        storage_path,
        60,
    )
    signed_url = signed_url_response.get("signedURL") or signed_url_response.get("signedUrl")
    if not signed_url:
        raise FileNotFoundError("Dataset object is not available in storage.")

    destination = Path(destination_path)
    bytes_written = 0
    with httpx.stream("GET", signed_url, timeout=120.0) as response:
        response.raise_for_status()
        with destination.open("wb") as output:
            for chunk in response.iter_bytes(chunk_size=1024 * 1024):
                if chunk:
                    output.write(chunk)
                    bytes_written += len(chunk)
    return bytes_written
