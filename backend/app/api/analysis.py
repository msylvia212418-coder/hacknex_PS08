from uuid import UUID

from fastapi import APIRouter, HTTPException

from app.schemas.analysis import AnalysisRequest
from app.schemas.errors import APIErrorResponse

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.post(
    "",
    status_code=501,
    responses={
        501: {"model": APIErrorResponse, "description": "Analysis is not implemented."},
        422: {"model": APIErrorResponse, "description": "Request validation error."},
    },
)
async def create_analysis(request: AnalysisRequest) -> None:
    """Validate the request contract; the proof pipeline is a separate task."""

    raise HTTPException(
        status_code=501,
        detail="The analysis pipeline is not implemented yet.",
    )


@router.get(
    "/{analysis_id}",
    status_code=501,
    responses={
        501: {"model": APIErrorResponse, "description": "Analysis lookup is not implemented."},
        422: {"model": APIErrorResponse, "description": "Request validation error."},
    },
)
async def get_analysis(analysis_id: UUID) -> None:
    """Validate an analysis identifier; persistence is not implemented yet."""

    raise HTTPException(
        status_code=501,
        detail="Analysis lookup is not implemented yet.",
    )
