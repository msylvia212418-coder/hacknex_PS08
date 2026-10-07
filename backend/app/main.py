from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import analysis, datasets, health, projects
from app.core.config import Settings, get_settings
from app.core.errors import register_error_handlers
from app.core.middleware import UploadSizeLimitMiddleware


def create_app(settings: Settings | None = None) -> FastAPI:
    application_settings = settings or get_settings()
    application = FastAPI(
        title="VERIPROOF API",
        version="0.1.0",
        description="Foundation API for proof-carrying data analysis.",
    )
    application.add_middleware(
        UploadSizeLimitMiddleware,
        max_size_bytes=application_settings.max_upload_size_bytes,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=application_settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type"],
    )
    register_error_handlers(application)
    application.include_router(health.router)
    application.include_router(projects.router)
    application.include_router(datasets.router)
    application.include_router(analysis.router)
    return application


app = create_app()
