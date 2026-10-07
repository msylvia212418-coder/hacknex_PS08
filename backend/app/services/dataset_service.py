"""Streaming dataset processing: hashing, validation, and profiling."""

from __future__ import annotations

import csv
import hashlib
import io
import math
from typing import Any, BinaryIO

HASH_CHUNK_SIZE = 65_536  # 64 KiB
MAX_DISTINCT_TRACKED = 10_000


# ---------------------------------------------------------------------------
# Content hashing
# ---------------------------------------------------------------------------

def compute_content_hash(file_obj: BinaryIO) -> tuple[str, int]:
    """Return (sha256_hex, file_size_bytes) via streaming 64 KiB chunks.

    Seeks to the start before reading and resets the position when done.
    """
    hasher = hashlib.sha256()
    file_size = 0
    file_obj.seek(0)
    while True:
        chunk = file_obj.read(HASH_CHUNK_SIZE)
        if not chunk:
            break
        hasher.update(chunk)
        file_size += len(chunk)
    file_obj.seek(0)
    return hasher.hexdigest(), file_size


# ---------------------------------------------------------------------------
# CSV structure validation
# ---------------------------------------------------------------------------

def validate_csv_structure(file_obj: BinaryIO) -> list[str]:
    """Validate that the file is parseable CSV and return column headers.

    Uses strict UTF-8 decoding (with BOM support). Raises ``ValueError`` for
    empty files, header-only files, malformed syntax, or invalid UTF-8 bytes.
    Resets the file position when done.
    """
    file_obj.seek(0)
    wrapper = io.TextIOWrapper(file_obj, encoding="utf-8-sig", errors="strict", newline="")
    try:
        reader = csv.reader(wrapper)
        try:
            headers = next(reader)
        except StopIteration:
            raise ValueError("CSV file is empty — no header row found.")

        cleaned = [h.strip() for h in headers]
        if not cleaned or all(h == "" for h in cleaned):
            raise ValueError("CSV file has no valid column headers.")

        # Peek at first data row to confirm there is data.
        try:
            first_row = next(reader)
            if not first_row or all(cell.strip() == "" for cell in first_row):
                raise ValueError("CSV file contains a header but no data rows.")
        except StopIteration:
            raise ValueError("CSV file contains a header but no data rows.")

        return cleaned
    except UnicodeDecodeError as exc:
        raise ValueError(f"Invalid UTF-8 encoding: {exc}")
    except csv.Error as exc:
        raise ValueError(f"Malformed CSV: {exc}")
    finally:
        wrapper.detach()
        file_obj.seek(0)


# ---------------------------------------------------------------------------
# Streaming column profiler
# ---------------------------------------------------------------------------

def _try_int(value: str) -> bool:
    try:
        int(value)
        return True
    except (ValueError, OverflowError):
        return False


def _try_float(value: str) -> bool:
    """Return True only for finite numbers (reject NaN and +/-Infinity)."""
    try:
        val = float(value)
        return math.isfinite(val)
    except (ValueError, OverflowError):
        return False


class _ColumnProfiler:
    """Accumulates per-column statistics in a single streaming pass."""

    __slots__ = (
        "name",
        "non_null_count",
        "null_count",
        "is_integer",
        "is_float",
        "numeric_min",
        "numeric_max",
        "numeric_sum",
        "numeric_count",
        "str_min_length",
        "str_max_length",
        "_distinct",
        "_distinct_overflow",
    )

    def __init__(self, name: str) -> None:
        self.name = name
        self.non_null_count = 0
        self.null_count = 0
        self.is_integer = True
        self.is_float = True
        self.numeric_min: float | None = None
        self.numeric_max: float | None = None
        self.numeric_sum = 0.0
        self.numeric_count = 0
        self.str_min_length: int | None = None
        self.str_max_length: int | None = None
        self._distinct: set[str] = set()
        self._distinct_overflow = False

    def update(self, value: str) -> None:
        stripped = value.strip()
        if not stripped:
            self.null_count += 1
            return

        self.non_null_count += 1

        # Distinct tracking (capped)
        if not self._distinct_overflow:
            self._distinct.add(stripped)
            if len(self._distinct) > MAX_DISTINCT_TRACKED:
                self._distinct_overflow = True
                self._distinct = set()  # free memory

        # String length
        slen = len(stripped)
        if self.str_min_length is None or slen < self.str_min_length:
            self.str_min_length = slen
        if self.str_max_length is None or slen > self.str_max_length:
            self.str_max_length = slen

        # Type inference: strictly finite numerics (rejects NaN, +/-Inf)
        if self.is_integer and not _try_int(stripped):
            self.is_integer = False
        if self.is_float and not _try_float(stripped):
            self.is_float = False

        # Numeric statistics (only accumulated if finite)
        if self.is_integer or self.is_float:
            try:
                num_val = float(stripped)
                if math.isfinite(num_val):
                    self.numeric_count += 1
                    self.numeric_sum += num_val
                    if self.numeric_min is None or num_val < self.numeric_min:
                        self.numeric_min = num_val
                    if self.numeric_max is None or num_val > self.numeric_max:
                        self.numeric_max = num_val
            except (ValueError, OverflowError):
                pass

    def to_dict(self) -> dict[str, Any]:
        # Determine inferred type
        if self.non_null_count == 0:
            inferred_type = "string"
        elif self.is_integer:
            inferred_type = "integer"
        elif self.is_float:
            inferred_type = "numeric"
        else:
            inferred_type = "string"

        result: dict[str, Any] = {
            "name": self.name,
            "type": inferred_type,
            "non_null_count": self.non_null_count,
            "null_count": self.null_count,
        }

        if not self._distinct_overflow:
            result["distinct_count"] = len(self._distinct)
        else:
            result["distinct_count"] = None
            result["distinct_overflow"] = True

        if inferred_type in ("integer", "numeric") and self.numeric_count > 0:
            result["min"] = self.numeric_min
            result["max"] = self.numeric_max
            result["mean"] = round(self.numeric_sum / self.numeric_count, 6)

        if self.str_min_length is not None:
            result["min_length"] = self.str_min_length
            result["max_length"] = self.str_max_length

        return result


# ---------------------------------------------------------------------------
# Full CSV profiling (streaming)
# ---------------------------------------------------------------------------

def profile_csv(file_obj: BinaryIO) -> dict[str, Any]:
    """Profile a CSV file by streaming row-by-row.

    Uses strict UTF-8 decoding. Raises ``ValueError`` for invalid encoding
    or malformed CSV rows.
    Returns a dict suitable for storage in ``dataset_profiles.profile``.
    Does **not** load the entire file into memory.
    Resets the file position when done.
    """
    file_obj.seek(0)
    wrapper = io.TextIOWrapper(file_obj, encoding="utf-8-sig", errors="strict", newline="")
    try:
        reader = csv.reader(wrapper)
        try:
            headers = next(reader)
        except StopIteration:
            raise ValueError("CSV file is empty — no header row found.")
        headers = [h.strip() for h in headers]

        profilers = [_ColumnProfiler(name) for name in headers]
        col_count = len(headers)
        row_count = 0

        for row in reader:
            row_count += 1
            for i in range(col_count):
                value = row[i] if i < len(row) else ""
                profilers[i].update(value)

        return {
            "row_count": row_count,
            "column_count": col_count,
            "columns": [p.to_dict() for p in profilers],
        }
    except UnicodeDecodeError as exc:
        raise ValueError(f"Invalid UTF-8 encoding during profiling: {exc}")
    except csv.Error as exc:
        raise ValueError(f"Malformed CSV during profiling: {exc}")
    finally:
        wrapper.detach()
        file_obj.seek(0)
