from pathlib import PurePath

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas.dataset import DatasetUploadResponse
from app.schemas.errors import APIErrorResponse

router = APIRouter(prefix="/datasets", tags=["datasets"])


@router.post(
    "/upload",
    response_model=DatasetUploadResponse,
    responses={
        400: {"model": APIErrorResponse, "description": "Missing or invalid upload."},
        413: {"model": APIErrorResponse, "description": "Upload request body is too large."},
        415: {"model": APIErrorResponse, "description": "Unsupported file type."},
        422: {"model": APIErrorResponse, "description": "Request validation error."},
    },
)
async def upload_dataset(file: UploadFile | None = File(default=None)) -> DatasetUploadResponse:
    """Validate the CSV upload contract only; processing is intentionally deferred."""

    if file is None:
        raise HTTPException(status_code=400, detail="A CSV file is required.")
    filename = file.filename
    if filename is None or not filename.strip():
        raise HTTPException(status_code=400, detail="The uploaded file must have a filename.")
    safe_filename = filename.replace("\\", "/").rsplit("/", maxsplit=1)[-1]
    if PurePath(safe_filename).suffix.lower() != ".csv":
        raise HTTPException(status_code=415, detail="Only .csv files are accepted.")

    return DatasetUploadResponse()
