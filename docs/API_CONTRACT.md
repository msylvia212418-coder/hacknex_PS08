# VERIPROOF API Contract (Foundation + Dataset Pipeline)

Base URL: `http://localhost:8000`. Responses below describe the FastAPI foundation and the dataset ingestion pipeline. The proof-analysis pipeline is future work.

## Upload configuration

- `MAX_UPLOAD_SIZE_BYTES` limits the complete `POST /datasets/upload` request body, including multipart framing. The default is `524288000` bytes (500 MiB), matching the Supabase Storage bucket limit.
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

## `POST /projects`

- **Request:** JSON object with `name` (non-empty string), optional `description` (string or null), and `owner_id` (UUID referencing a Supabase Auth user).
- **Response (201):** A `ProjectResponse` object: `{"id":"...","owner_id":"...","name":"...","description":null,"status":"ACTIVE","created_at":"...","updated_at":"..."}`.
- **Validation:** Missing/empty name returns 422. Invalid or non-existent `owner_id` returns 422.
- **Limitations:** `owner_id` is a temporary request field; it will be replaced by JWT authentication context.

## `GET /projects`

- **Request:** None.
- **Response (200):** `{"projects":[...]}` containing all projects, ordered by `created_at` descending.
- **Limitations:** Returns all projects (no RLS filtering) when using the service-role key. Filtering by owner deferred to JWT auth implementation.

## `POST /datasets/upload`

- **Request:** `multipart/form-data` with field `file` (CSV file), `project_id` (UUID of an existing project), and optional `name` (display name for the dataset).
- **Response (201):** A `DatasetUploadResponse` with dataset metadata and embedded profile: `{"id":"...","project_id":"...","name":"...","original_filename":"...","storage_path":"...","content_hash":"...","file_size":...,"status":"READY","created_at":"...","updated_at":"...","profile":{"row_count":...,"column_count":...,"columns":[...]}}`.
- **Validation:** File must be present, have a filename, and have a `.csv` extension (case-insensitive). Missing file/name returns 400; request bodies exceeding `MAX_UPLOAD_SIZE_BYTES` return 413; other extensions return 415. Invalid/missing project_id returns 422; non-existent project returns 404. Empty or malformed CSV returns 400.
- **Processing:** Computes SHA-256 hash via streaming 64 KiB chunks. Uploads original CSV to private Supabase Storage bucket. Profiles all columns row-by-row (type inference, null counts, numeric stats, distinct counts). Missing values (empty cells) are counted but do not cause upload failure.
- **Storage path:** `{owner_id}/{project_id}/{dataset_id}/{filename}` in the private `veriproof-datasets` bucket.

## `GET /datasets/{dataset_id}`

- **Request:** UUID path parameter.
- **Response (200):** A `DatasetDetailResponse` with dataset metadata and optional profile.
- **Validation:** Invalid UUID returns 422. Non-existent dataset returns 404.
- **Limitations:** Returns the dataset regardless of ownership when using the service-role key. RLS filtering deferred to JWT auth.

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

Handled errors use `{"error":{"code":"...","message":"..."}}`. Validation errors may include sanitized `details` (location, message, and type). Submitted values, stack traces, and secrets are not returned. Generated OpenAPI documents the runtime response statuses and response schemas for each endpoint.

## Column profile schema

Each column in the profile `columns` array contains:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Column header name |
| `type` | string | Inferred type: `"integer"`, `"numeric"`, or `"string"` |
| `non_null_count` | integer | Count of non-empty values |
| `null_count` | integer | Count of empty/missing values |
| `distinct_count` | integer or null | Exact distinct count (null if overflow) |
| `distinct_overflow` | boolean | True if distinct values exceeded tracking cap |
| `min` | number or null | Minimum (numeric columns only) |
| `max` | number or null | Maximum (numeric columns only) |
| `mean` | number or null | Mean (numeric columns only) |
| `min_length` | integer or null | Shortest non-null string length |
| `max_length` | integer or null | Longest non-null string length |
