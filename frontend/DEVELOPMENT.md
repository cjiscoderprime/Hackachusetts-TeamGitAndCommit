# ReguLens frontend

React + Vite + Tailwind; Supabase Auth; PDF.js source rendering. Existing design/components are retained; orchestration now uses routes and an isolated application API adapter.

## Start

```sh
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:5173. /login and /signup call Supabase when its public configuration is supplied. Without that configuration, use the clearly labeled /demo route. Load sample PDFs and Start analysis, inspect a PDF, save a review, then reopen it from Analysis history. Try Corrected package and Document processing error scenarios.

## Real configuration

Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY; use a publishable key, never a secret/service-role key. Auth persists through Supabase's SDK and tokens auto-refresh. Configure email delivery and the public /login confirmation redirect in Supabase. Signup handles both immediate sessions and confirmation-required responses. Signout clears the current local session and unmounts private views.

VITE_USE_MOCK=true uses session-only mock run data, including for authenticated accounts; those views remain explicitly labeled Demo workspace. /demo is always a separate public illustrative workspace. VITE_USE_MOCK=false selects the live adapter for authenticated /app routes. It deliberately blocks unconfirmed run operations until src/services/backendContract.js is configured. See CONTRACT-PENDING.md.

## Files

- src/main.jsx: shell and private-route guard
- src/auth/: real Supabase authentication and session lifecycle
- src/router.jsx: small browser-history router; SPA fallback required in production
- src/Workspace.jsx: PDF upload, run status/polling, history, review save UI
- src/components.jsx: retained finding cards, citations, comparisons, branding
- src/ReviewWorkspace.jsx: review controls and source dialog
- src/PdfPreview.jsx: local PDF.js rendering and page navigation
- src/services/: token transport, pending contract, run adapters, mock fixtures, PDF validation
- src/brand.js and public/assets/: optional user-supplied assets

PDF-only file selection validates extension, 10 MB limit, signature and maximum 3 files. It requires 2–3 files to submit. These inherited limits still need backend agreement. Server validation remains authoritative.

JSON report export excludes personal notes and preserves the completed parsed response. Status polling is sequential, stops at terminal states/errors, and aborts on navigation. Personal review status remains separate from analytical severity.

## Verify

```sh
npm test
npm run build
```

Live signup, email confirmation, logout, token refresh, owner-isolated saved history/notes and source access require the configured Supabase project and agreed FastAPI contract. A working demo is not proof of those external integrations.

## Confirmed source-document contract

GET /documents/{document_id}/source returns a 60-second signed PDF URL in JSON. Implemented in services/source.js: fresh grant per open, bearer token only to FastAPI, no bearer/cookies on the signed-URL download, one automatic renewal after expiry rejection, then actionable retry. Document ID mapping awaits run schemas.

## Branding and Google

Supplied logo: public/assets/regulens-logo.png, used in header, auth introduction, and favicon. Brand tokens in style.css use teal #087E8B, lavender #8B87B8, and the requested teal/cyan/lavender accent gradient. Continue with Google is present on both account screens; project provider configuration must be enabled before use.
