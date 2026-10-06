# VERIPROOF API Contract (Foundation)

Base URL: `http://localhost:8000`. Responses below describe only the current FastAPI foundation. Dataset persistence and the proof-analysis pipeline are future work.

## Upload configuration

- `MAX_UPLOAD_SIZE_BYTES` limits the complete `POST /datasets/upload` request body, including multipart framing. The default is `10485760` bytes (10 MiB).
- The ASGI request-body limit is enforced before multipart parsing can spool the upload; requests exceeding the configured limit return 413.

## `GET /health`

- **Request:** None.
- **Response (200):** `{"status":"ok"}`.
- **Validation:** None.
- **Limitations:** Process liveness only; does not check Supabase.

## `GET /health/db`

- **Request:** None.
- **Response (200):** `{"status":"ok","database":"connected"}`.
- **Unavailable response (503):** `{"status":"unavailable","database":"unavailable","error":{"code":"database_unavailable","message":"Database connectivity is unavailable."}}`.
- **Validation:** Requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_ANON_KEY` in the backend environment.
- **Limitations:** Makes one limited `projects` read through Supabase PostgREST. It does not expose details of configuration or connection failures.

## `POST /datasets/upload`

- **Request:** `multipart/form-data`, field `file` containing a CSV file.
- **Response (200):** `{"status":"scaffold","message":"CSV upload is available; dataset processing is a future task."}`.
- **Validation:** File must be present, have a filename, and have a `.csv` extension (case-insensitive). Missing file/name returns 400; request bodies exceeding `MAX_UPLOAD_SIZE_BYTES` return 413; other extensions return 415. Malformed requests may return 422.
- **Limitations:** Does not read/parse contents, store the file, profile it, create a dataset record, or calculate statistics. Filename is used only for extension validation and is not returned or persisted.

## `POST /analysis`

- **Request:** JSON object with `dataset_id` (UUID) and `question` (non-empty string).
- **Validation:** Invalid UUID, missing fields, or empty/whitespace-only question returns 422 with a sanitized validation error.
- **Response:** A valid request returns 501 with `{"error":{"code":"not_implemented","message":"The analysis pipeline is not implemented yet."}}`.
- **Limitations:** Does not load the dataset, create claims or proof obligations, run computations, call an LLM, verify evidence, or issue a verdict.

## `GET /analysis/{analysis_id}`

- **Request:** UUID path parameter.
- **Validation:** Invalid UUID returns 422.
- **Response:** A valid UUID returns 501 with a structured not-implemented response.
- **Limitations:** No analysis persistence or lookup exists yet.

## Error format

Handled errors use `{"error":{"code":"...","message":"..."}}`; validation errors may include sanitized `details` (location, message, and type). Submitted values, stack traces, and secrets are not returned. Generated OpenAPI documents the runtime response statuses and response schemas for each endpoint.
