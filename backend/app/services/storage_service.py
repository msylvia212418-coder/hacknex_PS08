"""Supabase Storage operations for dataset files."""

from __future__ import annotations

import logging
from typing import BinaryIO

from app.services import supabase_client

logger = logging.getLogger(__name__)

DATASET_BUCKET = "veriproof-datasets"


def upload_dataset_file(
    storage_path: str,
    file_obj: BinaryIO,
    content_type: str = "text/csv",
) -> None:
    """Upload a file to the private dataset storage bucket.

    Reads the file into bytes for the HTTP upload call.
    The caller is responsible for seeking the file beforehand.
    """
    file_obj.seek(0)
    file_bytes = file_obj.read()
    file_obj.seek(0)

    client = supabase_client.get_supabase_client()
    client.storage.from_(DATASET_BUCKET).upload(
        path=storage_path,
        file=file_bytes,
        file_options={"content-type": content_type},
    )
    logger.info("Uploaded %d bytes to %s/%s", len(file_bytes), DATASET_BUCKET, storage_path)
