# VERIPROOF frontend

This React and Vite application uses the existing VERIPROOF UI and connects the Analyze page to the evidence-bound backend pipeline.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the Supabase project. These are public client configuration values; never put a service-role key in the frontend.
3. Set `VITE_API_BASE_URL` to the FastAPI server URL.
4. Install dependencies with `npm install` and run `npm run dev`.
5. Sign in with an existing Supabase Auth email and password.
6. Open **Analyze**, paste a dataset UUID, load the saved profile, then submit a question.

The Analyze page calls `GET /datasets/{dataset_id}` and `POST /verify` using the current Supabase access token in the `Authorization: Bearer` header. The backend currently has no dataset-list endpoint, so dataset UUIDs must come from the upload response or another trusted project workflow.

## Checks

- `npm run typecheck` checks TypeScript.
- `npm run lint` runs Oxlint.
- `npm run build` typechecks and builds the production app.

Verification runs are returned directly by `/verify`; the backend does not persist analysis history. Stability, adversarial refutation, claim-flip boundaries, and repair planning are not presented as completed verification features.
