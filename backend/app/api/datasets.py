import logging
import re
from pathlib import PurePath
from uuid import UUID, uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

from app.schemas.dataset import (
    DatasetDetailResponse,
    DatasetProfileData,
    DatasetUploadResponse,
)
from app.schemas.errors import APIErrorResponse
from app.services.dataset_service import (
    compute_content_hash,
    profile_csv,
    validate_csv_structure,
)
from app.services.storage_service import delete_dataset_file, upload_dataset_file
from app.services import supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/datasets", tags=["datasets"])


def _sanitize_filename(raw_filename: str) -> tuple[str, str]:
    """Sanitize filename to prevent path traversal and unsafe storage keys.

    Returns:
        (original_filename, storage_filename)
        - original_filename: cleaned basename without path components
        - storage_filename: normalized safe identifier ending in .csv
    """
    clean_base = raw_filename.replace("\\", "/").rstrip("/").rsplit("/", maxsplit=1)[-1].strip()
    while clean_base.startswith("."):
        clean_base = clean_base.lstrip(".")

    stem = PurePath(clean_base).stem
    safe_stem = re.sub(r"[^\w\-]", "_", stem).strip("_")
    if not safe_stem:
        safe_stem = "dataset"
    storage_filename = f"{safe_stem}.csv"
    orig_name = clean_base if clean_base.lower().endswith(".csv") else f"{clean_base}.csv"
    return orig_name, storage_filename


# ---------------------------------------------------------------------------
# POST /datasets/upload
# ---------------------------------------------------------------------------

@router.post(
    "/upload",
    response_model=DatasetUploadResponse,
    status_code=201,
    responses={
        400: {"model": APIErrorResponse, "description": "Missing or invalid upload."},
        404: {"model": APIErrorResponse, "description": "Project not found."},
        413: {"model": APIErrorResponse, "description": "Upload request body is too large."},
        415: {"model": APIErrorResponse, "description": "Unsupported file type."},
        422: {"model": APIErrorResponse, "description": "Request validation error."},
    },
)
async def upload_dataset(
    file: UploadFile | None = File(default=None),
    project_id: UUID = Form(...),
    name: str | None = Form(default=None),
) -> DatasetUploadResponse:
    """Upload a CSV file, store it, profile it, and create database records."""

    # ---- 1. File presence and extension validation ----
    if file is None:
        raise HTTPException(status_code=400, detail="A CSV file is required.")
    filename = file.filename
    if filename is None or not filename.strip():
        raise HTTPException(status_code=400, detail="The uploaded file must have a filename.")

    clean_base = filename.replace("\\", "/").rstrip("/").rsplit("/", maxsplit=1)[-1].strip()
    if PurePath(clean_base).suffix.lower() != ".csv":
        raise HTTPException(status_code=415, detail="Only .csv files are accepted.")

    original_filename, storage_filename = _sanitize_filename(clean_base)

    # ---- 2. Verify project exists ----
    project = await _get_project(project_id)
    owner_id = project["owner_id"]

    # ---- 3. Validate CSV structure (strict UTF-8 + parseable header/data) ----
    raw_file = file.file  # SpooledTemporaryFile (binary)
    try:
        validate_csv_structure(raw_file)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # ---- 4. Compute content hash and file size (streaming) ----
    content_hash, file_size = await run_in_threadpool(compute_content_hash, raw_file)

    # ---- 5. Generate identifiers and safe storage path ----
    dataset_id = uuid4()
    display_name = name.strip() if name and name.strip() else PurePath(original_filename).stem
    storage_path = f"{owner_id}/{project_id}/{dataset_id}/{storage_filename}"

    # ---- 6. Create dataset record (status = UPLOADING) ----
    dataset_row = await _insert_dataset(
        dataset_id=dataset_id,
        project_id=project_id,
        display_name=display_name,
        original_filename=original_filename,
        storage_path=storage_path,
        content_hash=content_hash,
        file_size=file_size,
    )

    uploaded_to_storage = False
    try:
        # ---- 7. Upload to Supabase Storage (streaming) ----
        await run_in_threadpool(upload_dataset_file, storage_path, raw_file)
        uploaded_to_storage = True

        # ---- 8. Profile the CSV (streaming, finite numerics, strict UTF-8) ----
        profile_dict = await run_in_threadpool(profile_csv, raw_file)

        # ---- 9. Create profile record ----
        await _insert_profile(dataset_id, profile_dict)

        # ---- 10. Mark dataset READY ----
        dataset_row = await _update_dataset_status(dataset_id, "READY")

        return DatasetUploadResponse(
            **dataset_row,
            profile=DatasetProfileData(**profile_dict),
        )
    except Exception as exc:
        logger.exception("Upload pipeline failed for dataset %s: %s", dataset_id, exc)
        await _update_dataset_status(dataset_id, "FAILED")
        if uploaded_to_storage:
            await run_in_threadpool(delete_dataset_file, storage_path)

        if isinstance(exc, HTTPException):
            raise exc
        if isinstance(exc, ValueError):
            raise HTTPException(status_code=400, detail=str(exc))
        raise HTTPException(status_code=500, detail="Failed to complete dataset processing.")


# ---------------------------------------------------------------------------
# GET /datasets/{dataset_id}
# ---------------------------------------------------------------------------

@router.get(
    "/{dataset_id}",
    response_model=DatasetDetailResponse,
    responses={
        404: {"model": APIErrorResponse, "description": "Dataset not found."},
        422: {"model": APIErrorResponse, "description": "Request validation error."},
    },
)
async def get_dataset(dataset_id: UUID) -> DatasetDetailResponse:
    """Retrieve dataset metadata and its profile."""

    def _fetch() -> dict | None:
        client = supabase_client.get_supabase_client()
        result = (
            client.table("datasets")
            .select("*, dataset_profiles(profile)")
            .eq("id", str(dataset_id))
            .execute()
        )
        if not result.data:
            return None
        return result.data[0]

    row = await run_in_threadpool(_fetch)
    if row is None:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    profile_data = None
    raw_profile = row.pop("dataset_profiles", None)
    if raw_profile:
        if isinstance(raw_profile, list) and raw_profile:
            profile_data = DatasetProfileData(**raw_profile[0]["profile"])
        elif isinstance(raw_profile, dict) and raw_profile.get("profile"):
            profile_data = DatasetProfileData(**raw_profile["profile"])

    return DatasetDetailResponse(**row, profile=profile_data)


# ---------------------------------------------------------------------------
# Internal helpers (Supabase PostgREST)
# ---------------------------------------------------------------------------

async def _get_project(project_id: UUID) -> dict:
    def _fetch() -> dict | None:
        client = supabase_client.get_supabase_client()
        result = (
            client.table("projects")
            .select("id, owner_id")
            .eq("id", str(project_id))
            .execute()
        )
        return result.data[0] if result.data else None

    project = await run_in_threadpool(_fetch)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project


async def _insert_dataset(
    *,
    dataset_id: UUID,
    project_id: UUID,
    display_name: str,
    original_filename: str,
    storage_path: str,
    content_hash: str,
    file_size: int,
) -> dict:
    def _do() -> dict:
        client = supabase_client.get_supabase_client()
        result = (
            client.table("datasets")
            .insert(
                {
                    "id": str(dataset_id),
                    "project_id": str(project_id),
                    "name": display_name,
                    "original_filename": original_filename,
                    "storage_path": storage_path,
                    "content_hash": content_hash,
                    "file_size": file_size,
                    "status": "UPLOADING",
                }
            )
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create dataset record.")
        return result.data[0]

    return await run_in_threadpool(_do)


async def _update_dataset_status(dataset_id: UUID, status: str) -> dict:
    def _do() -> dict:
        client = supabase_client.get_supabase_client()
        result = (
            client.table("datasets")
            .update({"status": status})
            .eq("id", str(dataset_id))
            .execute()
        )
        return result.data[0] if result.data else {}

    return await run_in_threadpool(_do)


async def _insert_profile(dataset_id: UUID, profile_dict: dict) -> None:
    def _do() -> None:
        client = supabase_client.get_supabase_client()
        client.table("dataset_profiles").insert(
            {
                "dataset_id": str(dataset_id),
                "profile": profile_dict,
                "metadata": {"profiler_version": "1.0.0", "encoding": "utf-8-sig"},
            }
        ).execute()

    await run_in_threadpool(_do)
