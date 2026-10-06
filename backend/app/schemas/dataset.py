from typing import Literal

from pydantic import BaseModel


class DatasetUploadResponse(BaseModel):
    status: Literal["scaffold"] = "scaffold"
    message: str = "CSV upload is available; dataset processing is a future task."
