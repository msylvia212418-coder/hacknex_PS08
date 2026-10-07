
# VERIPROOF

### Evidence-Bound Verification Layer for AI-Powered Analytics

> **Don't trust the answer. Verify the claim.**

VERIPROOF is an evidence-bound verification layer for AI-powered analytics. Instead of simply generating an answer from a dataset, VERIPROOF converts a natural-language question into a structured analytical claim, determines what must be proven, performs deterministic computation, independently verifies the result, and applies a release gate before presenting the final verdict.

The system can classify an analytical request as:

- **PROVABLE** — the required evidence and verification checks passed.
- **AMBIGUOUS** — the question does not define a sufficiently precise analytical claim.
- **INCONCLUSIVE** — the available evidence is insufficient to establish the requested claim.

---

## 1. The Problem

AI-powered analytics can produce fluent answers that may still be unsupported or incorrect.

For example:

> "Which country performed best?"

What does "best" mean?

- Highest total revenue?
- Most transactions?
- Highest average transaction value?
- Highest growth?
- Highest customer satisfaction?

An AI system may silently choose one interpretation and return an answer.

VERIPROOF does not.

It verifies whether the analytical claim is sufficiently defined, supported by available evidence, correctly computed, independently verified, and safe to release.



## 2. Our Solution

VERIPROOF changes the analytical workflow from:

```text
Question → Answer
```

to:

```text
Question
   ↓
Claim
   ↓
Proof Obligations
   ↓
Evidence
   ↓
Deterministic Computation
   ↓
Independent Verification
   ↓
Release Gate
   ↓
Final Verdict
```

The core principle is:

> **We don't make AI answers more confident. We make them earn the right to be released.**

---

## 3. Core Verification Pipeline

### Step 1 — Question

The user enters a natural-language analytical question.

Example:

```text
Which country generated the highest total revenue?
```

### Step 2 — Claim Extraction

The question is converted into a structured analytical claim.

Example:

```text
Metric: Revenue
Aggregation: SUM
Grouping: Country
Operation: ARGMAX
Direction: Higher
```

### Step 3 — Proof Obligation Compilation

The structured claim is converted into machine-checkable requirements.

Example:

```text
COLUMN_EXISTS Country
COLUMN_EXISTS Revenue
NUMERIC_COLUMN Revenue
GROUP_BY Country
AGGREGATE SUM Revenue
EXTREMUM MAX
INDEPENDENT_VERIFICATION
```

### Step 4 — Deterministic Computation

The dataset is processed using deterministic Python computation.

The LLM is not responsible for calculating the numerical result.

### Step 5 — Independent Verification

The result is independently recomputed and compared against the primary computation.

### Step 6 — Release Gate

The system evaluates the verification checks and produces the final release decision:

```text
PROVABLE
AMBIGUOUS
INCONCLUSIVE
```

---

# 4. Key Features

## Proof Obligation Compiler

Transforms a structured claim into explicit machine-checkable proof obligations.

```text
Claim
  ↓
Proof Obligations
  ↓
Verification Plan
```

## Evidence-Bound Verification

The system changes the unit of trust from the answer to:

```text
Claim
+
Evidence
+
Computation
+
Verification
```

## Deterministic Computation

Numerical operations are performed deterministically using the dataset rather than relying on an LLM to calculate results.

## Independent Verification

A separate verification path independently checks the primary analytical result.

## Release Gate

A result is not automatically accepted simply because a computation produced an answer.

The release gate determines whether the result can be classified as PROVABLE, AMBIGUOUS, or INCONCLUSIVE.

---

# 5. Verdicts

## PROVABLE

The claim is sufficiently defined, the required evidence exists, computation succeeds, and independent verification agrees.

Example:

```text
Question:
Which country generated the highest total revenue?

Verdict:
PROVABLE

Winner:
United Kingdom
```

---

## AMBIGUOUS

The question does not define a sufficiently precise analytical metric.

Example:

```text
Question:
Which country performed best?

Verdict:
AMBIGUOUS

Reason:
Performance metric is not specified.
```

Instead of arbitrarily selecting a metric, VERIPROOF identifies the ambiguity.

---

## INCONCLUSIVE

The required evidence is unavailable in the dataset.

Example:

```text
Question:
Which country has the highest customer satisfaction?

Verdict:
INCONCLUSIVE
```

If the dataset does not contain customer satisfaction information, VERIPROOF does not fabricate an answer.

---

# 6. System Architecture

```text
┌─────────────────────────────────────────────┐
│                  FRONTEND                   │
│                                             │
│              React + TypeScript             │
│                    Vite                     │
│                                             │
│  Dataset → Question → Verification Result   │
└──────────────────────┬──────────────────────┘
                       │
                       │ REST API
                       ▼
┌─────────────────────────────────────────────┐
│               FASTAPI BACKEND               │
│                                             │
│ Authentication & Ownership Validation       │
│                  ↓                          │
│ Claim Extraction                            │
│                  ↓                          │
│ Claim Validation                            │
│                  ↓                          │
│ Proof Obligation Compiler                   │
│                  ↓                          │
│ Deterministic Computation                   │
│                  ↓                          │
│ Independent Verification                    │
│                  ↓                          │
│ Release Gate                                │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│                  SUPABASE                   │
│                                             │
│ PostgreSQL │ Authentication │ Storage      │
│                                             │
│             Row Level Security              │
└─────────────────────────────────────────────┘
```

---

# 7. Technology Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

### Backend

- Python
- FastAPI
- Pydantic
- Uvicorn

### Data Processing

- Python CSV streaming
- Deterministic aggregation
- Independent verification

### Database and Platform

- Supabase PostgreSQL
- Supabase Storage
- Supabase Authentication
- PostgreSQL Row Level Security

### AI / Semantic Layer

- LLM-assisted claim extraction and semantic interpretation
- Deterministic claim validation
- Deterministic numerical computation

### Testing

- Pytest
- TypeScript compilation
- ESLint
- Production build validation

### Version Control

- Git
- GitHub

---

# 8. Repository Structure

```text
hacknex_PS08/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── projects.py
│   │   │   ├── datasets.py
│   │   │   ├── claims.py
│   │   │   └── verification.py
│   │   │
│   │   ├── services/
│   │   │   ├── claim_extractor.py
│   │   │   ├── claim_validator.py
│   │   │   ├── proof_obligation_compiler.py
│   │   │   ├── computation_engine.py
│   │   │   ├── release_gate.py
│   │   │   └── storage_service.py
│   │   │
│   │   ├── schemas/
│   │   │   ├── claim.py
│   │   │   ├── proof.py
│   │   │   ├── computation.py
│   │   │   ├── verdict.py
│   │   │   └── verification.py
│   │   │
│   │   └── main.py
│   │
│   └── tests/
│
├── frontend/
│   ├── src/
│   ├── package.json
│   └── .env.example
│
├── data/
│   └── veriproof_combined_retail.csv
│
├── docs/
│   └── API_CONTRACT.md
│
├── supabase/
│
├── .gitignore
└── README.md
```

> The demonstration dataset is a large local file and is excluded from Git when configured through `.gitignore`.

---

# 9. API Endpoints

## Health Check

```http
GET /health
```

Checks whether the backend is running.

## Projects

```http
POST /projects
GET /projects
```

Creates and retrieves projects for authenticated users.

## Dataset Upload

```http
POST /datasets/upload
```

Uploads and profiles a CSV dataset.

## Dataset Details

```http
GET /datasets/{dataset_id}
```

Retrieves dataset metadata and profile information.

## Claim Extraction

```http
POST /claims/extract
```

Converts a natural-language analytical question into a structured claim.

## End-to-End Verification

```http
POST /verify
```

This is the primary VERIPROOF API.

### Request

```json
{
  "dataset_id": "<dataset-id>",
  "question": "Which country generated the highest total revenue?"
}
```

### Verification Flow

```text
POST /verify
     ↓
Claim Extraction
     ↓
Claim Validation
     ↓
Proof Obligation Compilation
     ↓
Deterministic Computation
     ↓
Independent Verification
     ↓
Release Gate
     ↓
PROVABLE / AMBIGUOUS / INCONCLUSIVE
```

---

# 10. Dataset

The prototype uses the **UCI Online Retail II** dataset as the demonstration dataset.

The prepared local dataset contains approximately:

```text
Rows:        1,067,370
Columns:     13
Size:        ~147.8 MB
```

Important fields include:

```text
InvoiceNo
StockCode
Description
Quantity
InvoiceDate
UnitPrice
CustomerID
Country
Revenue
```

The dataset is used to demonstrate:

- country-level revenue analysis
- transaction analysis
- customer-level aggregation
- ambiguity detection
- evidence insufficiency

The dataset is not committed to the repository when excluded by `.gitignore`.

---

# 11. Dataset Setup

Place the prepared dataset at:

```text
data/veriproof_combined_retail.csv
```

The dataset can then be uploaded through the dataset upload workflow.

Do not commit large/private dataset files unless explicitly required by the organizers.

---

# 12. Environment Variables

## Frontend

Create:

```text
frontend/.env
```

using:

```text
frontend/.env.example
```

Required variables:

```env
VITE_SUPABASE_URL=<your-supabase-project-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-or-publishable-key>
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Backend

Configure the backend using the environment/configuration template provided with the project.

### Security

Never commit:

```text
.env
service-role keys
private access tokens
database passwords
API secrets
```

The Supabase service-role key must remain server-side and must never be exposed through the frontend.

---

# 13. Prerequisites

Install:

- Python 3.11+
- uv
- Node.js 18+
- npm
- Supabase project/configuration

---

# 14. Backend Setup

Clone the repository:

```bash
git clone <REPOSITORY_URL>
cd hacknex_PS08
```

Install/sync the Python environment:

```bash
uv sync
```

Start the FastAPI backend:

```bash
uv run uvicorn backend.app.main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

FastAPI Swagger documentation:

```text
http://127.0.0.1:8000/docs
```

Health check:

```text
http://127.0.0.1:8000/health
```

---

# 15. Frontend Setup

Open another terminal:

```bash
cd hacknex_PS08/frontend
```

Install dependencies:

```bash
npm install
```

Configure:

```text
frontend/.env
```

Then start the frontend:

```bash
npm run dev
```

The frontend will normally be available at:

```text
http://127.0.0.1:5173
```

---

# 16. Authentication

VERIPROOF uses Supabase Authentication.

Protected requests use:

```http
Authorization: Bearer <supabase-access-token>
```

Dataset ownership is validated before protected operations.

The application does not treat a caller-supplied UUID as proof of identity.

Dataset storage is private and protected using Supabase access controls and database Row Level Security.

---

# 17. Running the Demo

### 1. Start the backend

```bash
uv run uvicorn backend.app.main:app --reload
```

### 2. Start the frontend

```bash
cd frontend
npm run dev
```

### 3. Sign in

Authenticate through the configured Supabase authentication flow.

### 4. Select a READY dataset

Use the dataset uploaded through the project workflow.

### 5. Ask a question

Example:

```text
Which country generated the highest total revenue?
```

### 6. Verify

VERIPROOF executes:

```text
Question
   ↓
Claim
   ↓
Proof Obligations
   ↓
Computation
   ↓
Independent Verification
   ↓
Release Gate
```

### 7. Review the final verdict

The UI displays the verification evidence and final release decision.

---

# 18. Demo Scenarios

## Scenario 1 — PROVABLE

Question:

```text
Which country generated the highest total revenue?
```

Expected result for the prepared demonstration dataset:

```text
Verdict: PROVABLE
Winner: United Kingdom
```

The exact numerical result is computed at runtime.

---

## Scenario 2 — AMBIGUOUS

Question:

```text
Which country performed best?
```

Expected:

```text
Verdict: AMBIGUOUS
```

Reason:

```text
Performance metric is not specified.
```

VERIPROOF does not silently choose a metric.

---

## Scenario 3 — INCONCLUSIVE

Question:

```text
Which country has the highest customer satisfaction?
```

Expected:

```text
Verdict: INCONCLUSIVE
```

Reason:

The required customer-satisfaction evidence is not present in the dataset.

VERIPROOF does not fabricate an answer when the evidence is unavailable.

---

# 19. Testing

## Backend

Run:

```bash
uv run pytest backend/tests -q
```

The backend verification pipeline has been validated using the project's automated test suite.

## Frontend

Run:

```bash
npm run lint
```

Build the production frontend:

```bash
npm run build
```

Check formatting/diff integrity:

```bash
git diff --check
```

---

# 20. Security Considerations

VERIPROOF includes:

- Supabase Authentication
- Dataset ownership validation
- Private dataset storage
- PostgreSQL Row Level Security
- Server-side handling of privileged Supabase credentials
- Strict CSV validation
- UTF-8 validation
- Streaming dataset processing
- Safe storage filename handling
- Dataset integrity/hash tracking

Large datasets are processed using streaming techniques rather than unnecessarily loading the entire CSV into memory.

---

# 21. Design Principles

### LLMs interpret; deterministic systems verify.

LLMs are used for semantic interpretation and structured claim extraction.

Deterministic systems handle:

- schema validation
- numerical computation
- aggregation
- independent verification
- release decisions

This separation prevents the language model from being the final authority on numerical truth.

---

# 22. Current Implemented Scope

The current implementation includes:

- Natural-language claim extraction
- Structured claim validation
- Proof obligation compilation
- Dataset validation
- Deterministic computation
- Independent verification
- Release gating
- PROVABLE / AMBIGUOUS / INCONCLUSIVE verdicts
- Supabase authentication
- Dataset ownership validation
- Private dataset storage
- React/Vite verification interface

---

# 23. Future Extensions

The broader VERIPROOF architecture can be extended with additional verification mechanisms such as:

- Claim Stability Fingerprint
- Interpretation-Invariance Frontier
- Adversarial Counterexample Engine
- Claim Flip Boundary
- Proof Repair Planner
- Evidence/Claim Lineage

These are future extensions and are **not represented as completed functionality in the current implementation**.

---

# 24. External Tools, APIs, Models and Datasets

## Supabase

Used for:

- Authentication
- PostgreSQL database
- Private dataset storage
- Row Level Security

## FastAPI

Used to expose the backend REST APIs and verification pipeline.

## React / Vite

Used to build the interactive verification interface.

## UCI Online Retail II

Used as the demonstration dataset.

## Large Language Model

Used for semantic interpretation and structured claim extraction.

The LLM is not used as the numerical computation engine.

---

# 25. Why VERIPROOF?

Traditional analytical systems focus on:

```text
Question → Answer
```

VERIPROOF focuses on:

```text
Question
   ↓
Claim
   ↓
Evidence
   ↓
Proof Obligations
   ↓
Computation
   ↓
Independent Verification
   ↓
Release Decision
```

This makes the analytical result auditable and evidence-bound instead of simply confident.

---

# 26. Project Highlights

### Claim-Level Verification

We verify the analytical claim rather than blindly trusting the generated answer.

### Proof Obligations

Every supported claim is translated into explicit conditions that must be satisfied.

### Deterministic Analytics

Numerical results are computed deterministically from the dataset.

### Independent Verification

The primary computation is checked independently before release.

### Evidence-Aware Failure

When evidence is missing, VERIPROOF produces **INCONCLUSIVE** instead of inventing an answer.

### Ambiguity-Aware Reasoning

When a question is underspecified, VERIPROOF produces **AMBIGUOUS** instead of silently choosing an interpretation.

---

# 27. Final Vision

AI systems are becoming increasingly capable of generating analytical answers.

But in real-world decision making:

> **An answer is not enough.**

Decision makers need to know:

- What exactly was claimed?
- What evidence supports it?
- What computation produced it?
- Was the result independently verified?
- Is the question sufficiently precise?
- Is the available evidence sufficient?
- Should the result actually be released?

VERIPROOF addresses this gap by turning AI analytics from **answer generation into claim verification**.

> ## AI should not earn trust by sounding confident.
> ## It should earn trust by surviving verification.

**VERIPROOF — Don't trust the answer. Verify the claim.**

