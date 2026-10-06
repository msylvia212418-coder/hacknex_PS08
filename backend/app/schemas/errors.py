from pydantic import BaseModel


class ValidationErrorDetail(BaseModel):
    location: list[str | int]
    message: str
    type: str


class APIError(BaseModel):
    code: str
    message: str
    details: list[ValidationErrorDetail] | None = None


class APIErrorResponse(BaseModel):
    error: APIError


class DatabaseUnavailableResponse(BaseModel):
    status: str
    database: str
    error: APIError
