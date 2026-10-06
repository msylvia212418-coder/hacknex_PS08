from fastapi import APIRouter
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse

from app.core.errors import error_payload
from app.schemas.errors import DatabaseUnavailableResponse
from app.schemas.health import DatabaseHealthResponse, HealthResponse
from app.services.supabase_client import get_supabase_client

router = APIRouter(tags=["health"])


def check_database_connection() -> None:
    """Perform one bounded, lightweight read through Supabase PostgREST."""

    get_supabase_client().table("projects").select("id").limit(1).execute()


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse()


@router.get(
    "/health/db",
    response_model=DatabaseHealthResponse,
    responses={503: {"model": DatabaseUnavailableResponse, "description": "Database unavailable."}},
)
async def database_health() -> DatabaseHealthResponse | JSONResponse:
    try:
        await run_in_threadpool(check_database_connection)
    except Exception:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unavailable",
                "database": "unavailable",
                **error_payload(
                    "database_unavailable",
                    "Database connectivity is unavailable.",
                ),
            },
        )
    return DatabaseHealthResponse()
