from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool

from app.schemas.errors import APIErrorResponse
from app.schemas.project import (
    ProjectCreateRequest,
    ProjectListResponse,
    ProjectResponse,
)
from app.services import supabase_client

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post(
    "",
    response_model=ProjectResponse,
    status_code=201,
    responses={
        422: {"model": APIErrorResponse, "description": "Request validation error."},
    },
)
async def create_project(request: ProjectCreateRequest) -> ProjectResponse:
    """Create a new project.

    ``owner_id`` is accepted in the request body as a temporary measure.
    It must reference a valid Supabase Auth user.  When JWT authentication
    is implemented, this field will be replaced by the token's subject.
    """

    def _create() -> dict:
        client = supabase_client.get_supabase_client()
        try:
            result = client.table("projects").insert(
                {
                    "owner_id": str(request.owner_id),
                    "name": request.name,
                    "description": request.description,
                }
            ).execute()
        except Exception as exc:
            msg = str(exc).lower()
            if "violates foreign key" in msg or "foreign key" in msg:
                raise HTTPException(
                    status_code=422,
                    detail="Invalid owner_id: the referenced auth user does not exist.",
                )
            raise HTTPException(status_code=500, detail="Failed to create project.")
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create project.")
        return result.data[0]

    row = await run_in_threadpool(_create)
    return ProjectResponse(**row)


@router.get(
    "",
    response_model=ProjectListResponse,
)
async def list_projects() -> ProjectListResponse:
    """List all projects.

    Returns all projects when using the service-role key (no RLS filtering).
    When JWT authentication is implemented, results will be scoped to the
    caller's own projects via RLS.
    """

    def _list() -> list[dict]:
        client = supabase_client.get_supabase_client()
        result = client.table("projects").select("*").order("created_at", desc=True).execute()
        return result.data or []

    rows = await run_in_threadpool(_list)
    return ProjectListResponse(projects=[ProjectResponse(**r) for r in rows])
