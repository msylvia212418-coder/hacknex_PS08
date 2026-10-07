import logging
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
from app.services.storage_service import upload_dataset_file
from app.services import supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/datasets", tags=["datasets"])


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
    safe_filename = filename.replace("\\", "/").rsplit("/", maxsplit=1)[-1]
    if PurePath(safe_filename).suffix.lower() != ".csv":
        raise HTTPException(status_code=415, detail="Only .csv files are accepted.")

    # ---- 2. Verify project exists ----
    project = await _get_project(project_id)
    owner_id = project["owner_id"]

    # ---- 3. Validate CSV structure ----
    raw_file = file.file  # SpooledTemporaryFile (binary)
    try:
        validate_csv_structure(raw_file)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # ---- 4. Compute content hash and file size (streaming) ----
    content_hash, file_size = await run_in_threadpool(compute_content_hash, raw_file)

    # ---- 5. Generate identifiers and storage path ----
    dataset_id = uuid4()
    display_name = name.strip() if name and name.strip() else PurePath(safe_filename).stem
    storage_path = f"{owner_id}/{project_id}/{dataset_id}/{safe_filename}"

    # ---- 6. Create dataset record (status = UPLOADING) ----
    dataset_row = await _insert_dataset(
        dataset_id=dataset_id,
        project_id=project_id,
        display_name=display_name,
        original_filename=safe_filename,
        storage_path=storage_path,
        content_hash=content_hash,
        file_size=file_size,
    )

    # ---- 7. Upload to Supabase Storage ----
    try:
        await run_in_threadpool(upload_dataset_file, storage_path, raw_file)
    except Exception:
        logger.exception("Storage upload failed for dataset %s", dataset_id)
        await _update_dataset_status(dataset_id, "FAILED")
        raise HTTPException(status_code=500, detail="Failed to upload file to storage.")

    # ---- 8. Profile the CSV (streaming) ----
    try:
        profile_dict = await run_in_threadpool(profile_csv, raw_file)
    except ValueError as exc:
        logger.exception("CSV profiling failed for dataset %s", dataset_id)
        await _update_dataset_status(dataset_id, "FAILED")
        raise HTTPException(status_code=400, detail=str(exc))

    # ---- 9. Create profile record ----
    await _insert_profile(dataset_id, profile_dict)

    # ---- 10. Mark dataset READY ----
    dataset_row = await _update_dataset_status(dataset_id, "READY")

    return DatasetUploadResponse(
        **dataset_row,
        profile=DatasetProfileData(**profile_dict),
    )


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

    # Extract embedded profile from the PostgREST join
    profile_data = None
    raw_profile = row.pop("dataset_profiles", None)
    if raw_profile:
        # PostgREST may return a list (to-many) or a dict (to-one).
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
