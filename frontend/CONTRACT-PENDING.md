# Backend integration boundary

The teammate confirmed Supabase Auth, FastAPI, PDF-only, POST /runs, and Bearer tokens. The source endpoint is now confirmed: GET /documents/{document_id}/source returns document_id, filename, url, expires_in (60 seconds). Other run endpoint paths, wire fields, lifecycle values, document errors, and reviewer persistence schemas remain unconfirmed.

## No new wire contract has been imposed

`src/services/backendContract.js` is intentionally disabled. Unconfirmed live run calls fail with an explanatory configuration message before sending any request until the agreed contract is mapped. The confirmed source operation has its own sourceConfirmed flag and is implemented independently. Only POST /runs is specified. The inherited multipart field `files` must also be reconfirmed. Status names in `mockRuns.js` are illustrative internal view values, not a demand on the backend.

Implement the backendContract mapping functions and set confirmed=true only after agreement. The UI calls these semantic adapter methods:

- createRun(files) -> Run
- getRun(id) -> Run
- listRuns() -> Run[]
- getSource(runId, documentId) -> PDF Blob
- saveReview(runId, findingId, review) -> persisted Review

## Internal UI model (not HTTP request/response schema)

Run: id (string), status (raw display string), terminal (explicit boolean mapped from agreed backend lifecycle), createdAt/updatedAt/completedAt (optional timestamps), documents [{id,filename,status?}], documentErrors [{documentId?,filename?,message}], method?, fallback?, result (completed README findings response or null), reviews (finding ID -> Review).

Review: status and note. Proposed UI statuses: unreviewed, reviewed, needs_clarification. Map to backend values after confirmation. This proposal does not modify the server schema. Stable per-run finding IDs are needed to save notes; missing IDs disable save controls. Cross-run identity is still required for issue-level comparisons.

`result` preserves the parsed findings response for lossless JSON export. Additional response metadata should be retained by the mapper when desired. No default successful analysis method, fallback flag, or completion state is fabricated for live runs.

## Token and source handling

`http.js` retrieves the current Supabase access token for EVERY FastAPI request. Multipart uploads do not set Content-Type manually. JSON review calls do. Tokens are never put in URLs and never sent to third-party storage URLs. Requests reject HTTP redirects so a backend must return its PDF bytes directly for the current source adapter.

The confirmed sourcePath is /documents/{document_id}/source. Each source-open requests a new signed URL using the current bearer token. The grant response must match the requested document ID and return filename, HTTPS url, and a positive expires_in. The URL is fetched without Authorization, cookies, or referrer, with caching disabled. The returned PDF is rendered locally by PDF.js. If Storage rejects a grant with 401/403, the client requests a fresh grant and retries once; a source-error Retry control can also request a new grant. Closing the viewer aborts requests and revokes its temporary browser URL. The signed URL is not persisted or included in history. Run response mapping still needs to preserve actual document IDs before the live UI can select them.

The client guard protects UI navigation; FastAPI must verify user tokens and owner access. PostgreSQL/Storage owner policies remain backend responsibilities.

## Configuration

Frontend environment variables: VITE_API_BASE_URL, VITE_USE_MOCK, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY. Supabase refresh/session storage is handled by its SDK. Analysis data and notes are not copied into browser storage by this app.

Configure Supabase's Site URL and allowed redirect `${publicOrigin}/login`; configure email delivery for outside users. The SPA host must rewrite /login, /signup, /app and nested application paths to index.html. Serve over HTTPS publicly.

## Paths

/login, /signup: real Supabase forms. Disabled with clear explanation if project configuration is missing.
/app, /app/history, /app/runs/:id: session-protected views.
/demo and its history/run paths: separate public demo; never a fallback for a failed live request. Mock data is isolated from authenticated user data and is cleared on refresh.

## Required backend decisions

Confirm multipart field/count/size limits, lifecycle values and terminal states, create/detail/list schemas, history pagination, timestamp semantics, document IDs/error format, result/fallback metadata, PDF-byte versus signed URL transport, review paths/body/response and allowed values, 401/403 behavior. UI can then be connected by replacing the isolated mappings.

## Google OAuth

The login/signup screens provide Continue with Google through Supabase signInWithOAuth, redirecting to the current origin's /login. The frontend checks the project's public Auth settings before starting. Google is currently disabled in this project; the UI clearly labels setup as pending. Enable Google under Supabase Auth providers using your Google OAuth Client ID and Client Secret. Keep the secret in Supabase only. Google authorized redirect URI: https://gntezhhsioymqwbpagmn.supabase.co/auth/v1/callback. Allow http://127.0.0.1:5173/login, http://localhost:5173/login, and the eventual public /login URL in Supabase redirects. See https://supabase.com/docs/guides/auth/social-sign-in/auth-google .
