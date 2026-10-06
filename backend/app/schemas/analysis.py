from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class AnalysisRequest(BaseModel):
    dataset_id: UUID
    question: str = Field(min_length=1)

    @field_validator("question")
    @classmethod
    def question_must_not_be_blank(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Question must not be empty.")
        return normalized


class AnalysisPlaceholderResponse(BaseModel):
    status: str = "not_implemented"
    message: str = "The analysis pipeline is not implemented yet."


class AnalysisLookupPlaceholderResponse(AnalysisPlaceholderResponse):
    analysis_id: UUID
