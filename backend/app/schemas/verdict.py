"""Release-gate decision schemas."""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel


class ReleaseVerdict(str, Enum):
    PROVABLE = "PROVABLE"
    INCONCLUSIVE = "INCONCLUSIVE"
    AMBIGUOUS = "AMBIGUOUS"


class ReleaseCheck(BaseModel):
    name: str
    passed: bool
    reason: str | None = None


class ReleaseDecision(BaseModel):
    verdict: ReleaseVerdict
    claim: str
    reason: str
    checks: list[ReleaseCheck]
