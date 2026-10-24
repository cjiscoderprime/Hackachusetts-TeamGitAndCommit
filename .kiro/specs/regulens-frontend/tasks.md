# Implementation Plan: regulens-frontend

## Overview

This plan is reverse-engineered from the implemented prototype in `frontend/` (commit `21d1321`) and mirrors `design.md` and `requirements.md`.

- Checked tasks exist in code.
- Unchecked tasks are known gaps (marked **Status: not yet implemented** in `requirements.md`) or work blocked on the backend contract.

The stack is plain JavaScript with React 19 and Vite 7, Supabase Auth, PDF.js, a custom router, hand-written CSS (Tailwind is imported), and `node:test`. Only files under `frontend/` change; `backend/`, `samples/`, `tests/`, and `README.md` are never modified.

## Tasks

- [x] 1. Scaffold the frontend project
  - [x] 1.1 Set up Vite + React (plain JS) with Tailwind v4 and the Node test runner
    - `frontend/package.json`:
      - Pinned: `react`/`react-dom` 19.2.3, `vite` 7.3.0
      - Caret ranges: `@supabase/supabase-js`, `pdfjs-dist`, `tailwindcss`, `@tailwindcss/vite`
    - Scripts:
      - `dev` = `vite --host 127.0.0.1 --port 5173 --strictPort`
      - `build`, `preview`
      - `test` = `node --test src/api.test.js src/services/services.test.js src/auth/google.test.js`
    - `frontend/vite.config.js` registers only `tailwindcss()`; JSX modules import `React` explicitly
    - `frontend/index.html`: title "ReguLens AI · Evidence review", meta description, theme color `#173e3b`, favicon `/assets/regulens-logo.png`
    - `frontend/.env.example`: `VITE_API_BASE_URL=http://localhost:8000`, `VITE_USE_MOCK=true`, and empty `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (public values only)
    - `frontend/.gitignore` excludes `node_modules/`, `dist/`, `.env.local`, `.env.*.local`
    - `frontend/DEVELOPMENT.md` and `frontend/CONTRACT-PENDING.md` document setup and the integration boundary
    - _Requirements: 2.3, 14.3, 14.4_

  - [ ] 1.2 Pin the remaining dependency ranges
    - Replace the caret ranges for `@supabase/supabase-js`, `pdfjs-dist`, `tailwindcss`, and `@tailwindcss/vite` with the exact versions in `package-lock.json`
    - _Requirements: none (dependency hygiene)_

- [x] 2. Implement shared contract helpers in `frontend/src/api.js`
  - [x] 2.1 Environment and severity helpers
    - `API_BASE_URL` (default `http://localhost:8000`, trailing slashes stripped), `MOCK_MODE = VITE_USE_MOCK === 'true'`
    - `groups = ['high','medium','low','Other']`, `severityGroup` (case-insensitive, unknown → `Other`), `counts(result)`
    - _Requirements: 2.3, 6.2, 6.3, 11.1_

  - [x] 2.2 Response validation
    - `validateResponse` returns the body, or throws one of two errors:
      - "Response format not recognized" when a deep check fails: finding and source entries must be objects, `documents_analyzed` must be a non-negative integer, and each document needs a `pages` array
      - "Unsupported response status: <JSON status>" for any other status
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.7_

  - [x] 2.3 JSON export serializer
    - `serializeReport(result)` = `JSON.stringify(result, null, 2)`
    - _Requirements: 9.2, 9.3_

  - [x] 2.4 Legacy `analyze(files, fixture, options)` client for `POST /analyze`
    - Mock: 650 ms delay, then a cloned fixture
    - Live: `FormData` with a `files` field, optional Bearer header, readable errors
    - Kept for tests and as a reference; no UI path calls it
    - _Requirements: none (legacy reference client)_

  - [ ] 2.5 Trim whitespace in `severityGroup`
    - `" high"` currently maps to `Other`. Trim before matching and add a test case
    - _Requirements: 6.9_

  - [x]* 2.6 Example tests in `frontend/src/api.test.js`
    - Completed and extraction-only results stay distinct
    - Malformed and unsupported bodies throw
    - Unknown severities are counted as Other
    - Export round-trips
    - Multipart uploads set no manual Content-Type
    - HTTP, JSON, and network failures throw
    - Mock mode never fetches
    - The Bearer header is sent only when a token is supplied
    - _Requirements: 3.1–3.4, 3.7, 5.1–5.3, 6.2, 6.3, 9.3, 11.2, 11.6_

- [x] 3. Author mock fixtures and demo documents
  - [x] 3.1 `frontend/src/mocks/flawed.json` and `frontend/src/mocks/corrected.json`
    - `flawed.json` has 3 findings, all with `guidance_reference: null`:
      - high `metric_mismatch` with two sources
      - medium `unsupported_claim`
      - low `missing_documentation` with no sources
    - `corrected.json` has zero findings
    - _Requirements: 6.7, 11.7_

  - [x] 3.2 `frontend/src/services/pdf.js` synthetic PDF generator
    - `makeDemoPdf(lines)`
    - `demoDocumentLines` for `scientific-summary.pdf`, `model-validation.pdf`, `results-table.pdf`
    - `demoFiles()`
    - _Requirements: 1.10, 11.9, 12.3_

  - [ ] 3.3 Add a fixture with a non-null `guidance_reference` and an unknown severity
    - No current fixture exercises the guidance branch of `FindingCard` or the Other group
    - _Requirements: 6.3, 7.11, 7.13_

- [x] 4. Implement authentication in `frontend/src/auth/`
  - [x] 4.1 `AuthProvider.jsx`
    - Creates the Supabase client only when both public env values are set
    - Provides the session context and a race-safe initial `getSession`
    - Exposes `getAccessToken()` and `signOut({scope:'local'})`
    - _Requirements: 14.1, 15.6, 15.7, 15.8, 15.9_

  - [x] 4.2 `AuthPage.jsx` for `/login` and `/signup`
    - Email/password forms and sign-up confirmation handling
    - Heading focus on open
    - Configuration and disabled states
    - `/demo` entry link
    - _Requirements: 13.5, 15.1, 15.2, 15.3, 15.6, 16.4_

  - [x] 4.3 Google OAuth in `google.js`
    - `googleEnabled()` reads `/auth/v1/settings`
    - `beginGoogleSignIn()` redirects to `${origin}/login`
    - When the provider is off, the button is disabled and a note explains why
    - _Requirements: 15.4, 15.5_

  - [x]* 4.4 Tests in `frontend/src/auth/google.test.js`
    - The provider flag follows project settings
    - OAuth options are passed through
    - Startup errors stay readable
    - _Requirements: 15.4, 15.5_

- [x] 5. Implement routing and the app shell
  - [x] 5.1 `frontend/src/router.jsx`
    - `navigate()` (rejects non-relative paths), `useRoute()`, `<Link>`
    - _Requirements: 16.5, 16.6_

  - [x] 5.2 `frontend/src/main.jsx`
    - Header with brand, user email, and logout (with lock and error handling)
    - Route guard for `/app*`, `/` redirect, public `/demo*`, and a 404 view
    - `Workspace` keyed by user and mode
    - Footer `Disclaimer` and bottom brand strip
    - _Requirements: 10.8, 12.1, 12.2, 12.3, 15.7, 15.8, 15.9, 16.1, 16.2, 16.3_

- [x] 6. Implement the integration layer in `frontend/src/services/`
  - [x] 6.1 `backendContract.js` pending mapping config
    - Set: `confirmed:false`, `uploadField:'files'`, `createPath:'/runs'`, `sourceConfirmed:true`, `sourcePath` → `/documents/{id}/source`
    - Every other path and decoder is `null`
    - _Requirements: 17.1, 17.4_

  - [x] 6.2 `http.js` authenticated request helper
    - Accepts relative paths only
    - Fetches a fresh token per call and sends it as a Bearer header
    - Sets JSON Content-Type only for non-FormData bodies
    - Uses `no-store` and `redirect:'error'`
    - Maps errors to 401, 403, and HTTP-n messages
    - Checks the PDF signature; 204 → null
    - _Requirements: 2.2, 5.1–5.5, 14.5, 14.6, 14.7_

  - [x] 6.3 `runs.js` live adapter
    - `ready()` blocks unconfirmed operations without sending requests
    - Implements `createRun` (multipart), `getRun`, `listRuns`, `saveReview` (PATCH), and `getSource`
    - _Requirements: 2.2, 11.6, 17.1, 17.3, 19.3_

  - [x] 6.4 `source.js` signed-URL source retrieval
    - Grant validation: matching `document_id`, HTTPS URL, positive `expires_in`
    - Credential-free download
    - One renewal on 401/403
    - PDF signature check
    - _Requirements: 18.3, 18.4, 18.5, 18.6_

  - [x] 6.5 `viewModel.js` run validation
    - `validateRun` enforces the internal Run shape and requires results to be completed and terminal
    - _Requirements: 3.5, 3.6_

  - [x] 6.6 `mockRuns.js` session demo adapter
    - In-memory store; lifecycle is queued → processing (350 ms) → completed or failed (3500 ms)
    - Scenarios: `flawed`, `corrected`, `failure`
    - Sets `documents_analyzed` to the file count and renames `.txt` source names to `.pdf`
    - Validates reviews
    - Generates synthetic source PDFs (the corrected summary shows 0.91)
    - _Requirements: 11.2, 11.3, 11.4, 11.5, 11.8, 11.9, 19.3_

  - [x] 6.7 `files.js` PDF selection checks
    - `checkPdfFiles` checks the `.pdf` extension, ≤10 MiB size, `%PDF-` header, and 3-file cap
    - Duplicate error messages are removed
    - _Requirements: 1.4, 1.5, 1.6, 1.7_

  - [x]* 6.8 Tests in `frontend/src/services/services.test.js`
    - File selection rules
    - Fresh token per request; no absolute URLs
    - Pending contract blocks calls; confirmed create maps multipart
    - 401/403 errors
    - PDF bytes are verified and the token stays out of the URL
    - Mock lifecycle, history, source, and review; failure scenario
    - `validateRun` rejections
    - Fresh source grant per open; single renewal; bad grants rejected
    - _Requirements: 1.4–1.7, 3.5, 3.6, 5.4, 5.5, 11.4, 11.6, 11.8, 14.5–14.7, 17.1, 18.3–18.6_

  - [ ] 6.9 Map the agreed backend contract and set `confirmed: true`
    - Blocked on the tech lead
    - Fill `detailPath`, `historyPath`, `reviewPath`, `decodeRun`, `decodeHistory`, `encodeReview`, `decodeReview`
    - Confirm `uploadField` and the review HTTP method
    - Make run responses carry document IDs
    - Add tests for each decoder against real sample payloads
    - _Requirements: 2.2, 2.5, 17.1, 17.3; A1, A9_

- [x] 7. Checkpoint: service-layer tests pass
  - `npm test` passes all 23 tests.

- [x] 8. Build presentational components
  - [x] 8.1 `components.jsx` → `Icon`, `Disclaimer`
    - The Disclaimer states that this is a preliminary audit, not an FDA prediction or certification
    - It also states that severity is a triage label and that demo documents are synthetic
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [x] 8.2 `components.jsx` → `FindingCard`
    - Meta row: raw severity badge, id, type
    - `<h4>` title, optional category, explanation
    - "Human review required" label and the `unsupported_claim` note
    - Sources with page and quote placeholders, "No source citation provided", and "Inspect source"
    - Guidance reference shown as provided (no draft label)
    - "Recommended action" and `ReviewControls`
    - Plain JSX text only
    - _Requirements: 6.3, 7.1–7.11, 7.13, 7.14, 14.2_

  - [ ] 8.3 Draft-guidance label
    - Show "Draft guidance (nonbinding)" once the A7 source-identity metadata is agreed
    - _Requirements: 7.12_

  - [x] 8.4 `components.jsx` → `Comparison`
    - Previous and current columns, each with findings and document counts, per-group counts, and filenames
    - Counts only, with the stable-identity note
    - One column under 640 px
    - _Requirements: 10.4, 10.6, 10.7, 13.6_

  - [x] 8.5 `ReviewWorkspace.jsx` → `text`, `Pipeline`, `ReviewControls`
    - Four-step workflow overview
    - Labeled status select and note textarea (max 10000)
    - Save button, status message, and "personal review only" note
    - _Requirements: 12.5, 13.2, 19.1, 19.5_

  - [x] 8.6 `ReviewWorkspace.jsx` → `EvidenceDialog`
    - Native modal `<dialog>` with focus restore
    - Quotation shown separately from the source
    - Abortable source load; object URL revoked on close
    - Retry control, open-in-tab link, and `PdfPreview` at the cited page
    - _Requirements: 7.4, 11.5, 18.1, 18.2, 18.5, 18.9_

  - [x] 8.7 `PdfPreview.jsx`
    - PDF.js legacy build with `isEvalSupported:false`
    - Responsive canvas and page navigation
    - Extracted text in a `<details>` element
    - Render errors in `role="alert"`
    - _Requirements: 13.1, 13.2, 18.7, 18.8_

  - [ ]* 8.8 Component render tests
    - Requires a DOM test environment (for example jsdom + Testing Library, pinned)
    - `FindingCard`: HTML-like quotes render as text with exact `textContent`; placeholders appear for missing fields
    - Run page: `flawed.json` groups render in order; `corrected.json` shows the no-findings message and the certification statement
    - _Requirements: 6.2, 6.4, 6.6, 7.3–7.9, 14.2_

- [x] 9. Wire pages in `frontend/src/Workspace.jsx`
  - [x] 9.1 `Workspace` container
    - Chooses the mock or live adapter (`publicDemo || MOCK_MODE`)
    - Nav with "New analysis"
    - Demo and contract-pending notices
    - `successful` runs list and route dispatch
    - `ErrorMessage` with "Sign in again" on 401
    - _Requirements: 5.4, 5.6, 10.1, 10.2, 11.1, 11.5, 17.2_

  - [x] 9.2 `UploadPage`
    - Intro `<h1>`, upload `<h2>`, and a count chip
    - Mock scenario select and "Load sample PDFs"
    - Drag-and-drop zone plus a hidden labeled file input (reset after each change)
    - File list with remove buttons
    - Errors in an alert region; a status line
    - "Start analysis" is disabled under 2 files or while busy; a ref lock prevents double submission; requests abort on unmount
    - _Requirements: 1.1–1.3, 1.8–1.10, 2.1, 2.4, 4.1, 4.2, 4.8, 5.6, 5.7, 11.3, 13.1, 13.2, 13.7_

  - [x] 9.3 `useRun` polling and `RunPage`
    - Sequential 1.5 s polling until terminal; abort on unmount; retry
    - Status pill, run details, and documents with their errors
    - Findings summary stats and severity sections (`h3`)
    - Zero-findings and no-report states
    - Download as `regulens-report.json` (notes excluded)
    - Comparison with the latest earlier completed run
    - Source inspection by `document_id` or unique filename
    - Per-finding review save
    - Focus moves to the run `h1` on mount and when the result arrives
    - _Requirements: 4.3–4.8, 5.8, 6.1–6.8, 9.1–9.4, 10.1, 10.3, 10.5, 11.5, 13.3, 13.5, 18.2, 19.2, 19.3, 19.4_

  - [x] 9.4 `HistoryPage`
    - Focused `h1` and a refresh control
    - Loading, error, and empty states
    - Run list with "Open run"
    - _Requirements: 13.5, 20.1, 20.2, 20.3, 20.4_

  - [ ] 9.5 Extraction-only run view
    - Render "Text extraction only: findings analysis has not run." with each document's filename and page count
    - Relax `validateRun` to allow an `extracted_only` result without treating it as completed
    - _Requirements: 3.7, 8.1, 8.2, 8.3_

  - [ ] 9.6 Mock source lookup for user-uploaded PDFs
    - In mock mode with user files, fixture citations cannot match the uploaded filenames
    - Either label citations as fixture-only, or restrict the mock to the sample PDFs
    - _Requirements: 7.5, 11.9_

- [x] 10. Styling and branding in `frontend/src/style.css` and `frontend/src/brand.js`
  - Brand tokens: teal `#087E8B`, lavender `#8B87B8`, accent gradient
  - Georgia display headings
  - Breakpoints at 640 and 760 px; `overflow-wrap:anywhere` for long values
  - 3 px `:focus-visible` outline; reduced-motion support
  - `brandAssets.logo = '/assets/regulens-logo.png'`; the optional `pipeline` image slot is documented in `public/assets/README.md`
  - _Requirements: 6.5, 13.1, 13.4, 13.6, 13.8_

- [ ] 11. Final checkpoint
  - [x] 11.1 `npm test` and `npm run build` pass
  - [ ] 11.2 Manual checks
    - Keyboard pass of the `/demo` flow
    - Focus lands on each page `h1`
    - Widths of 320 and 1920 px without horizontal scrolling
    - Contrast spot-check
    - Live Supabase sign-up, sign-in, and sign-out
    - _Requirements: 13.1, 13.4, 13.5, 13.6, 15.1–15.8_
  - [x] 11.3 Reconcile `requirements.md` with the prototype

## Notes

- Tasks marked `*` are optional test tasks.
- Checked tasks were verified by reading the code in `frontend/` and running `npm test` (23/23 pass) and a production build.
- Tests are example-based `node:test` cases with injected `fetchImpl`, `getAccessToken`, `now`, and `id`. There are no property-based or component tests yet.
- Out of scope today: request timeout, a `GET /health` indicator, duplicate-file detection, issue-level (resolved/new/persisting) comparison, and automatic fixture switching.
- Never modify `backend/`, `samples/`, `tests/`, or `README.md`.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "2.2", "2.3", "3.1", "3.2", "5.1"] },
    { "id": 2, "tasks": ["2.4", "2.5", "3.3", "4.1", "6.1", "6.7"] },
    { "id": 3, "tasks": ["2.6", "4.2", "4.3", "6.2", "6.5", "6.6"] },
    { "id": 4, "tasks": ["4.4", "5.2", "6.3", "6.4", "8.1", "8.5"] },
    { "id": 5, "tasks": ["6.8", "8.2", "8.4", "8.7"] },
    { "id": 6, "tasks": ["8.3", "8.6", "9.1"] },
    { "id": 7, "tasks": ["9.2", "9.3", "9.4", "10"] },
    { "id": 8, "tasks": ["8.8", "9.5", "9.6", "6.9"] },
    { "id": 9, "tasks": ["11.1", "11.2", "11.3"] }
  ]
}
```
