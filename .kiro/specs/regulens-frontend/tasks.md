# Implementation Plan: regulens-frontend

## Overview

Build the seven-hour frontend MVP in `frontend/` exactly as described in `design.md`: plain JavaScript, React, Vite, Tailwind v4, native `fetch`/`FormData`. Pure logic goes first (`frontend/src/lib/logic.js`), then fixtures, the API client, presentational components, and finally `frontend/src/App.jsx` wiring. Only files under `frontend/` change; `backend/`, `samples/`, `tests/`, and `README.md` are never modified.

## Tasks

- [ ] 1. Scaffold the frontend project
  - [ ] 1.1 Set up Vite React (plain JS) with Tailwind v4 and the test toolchain
    - Scaffold `frontend/` from the Vite `react` template (JavaScript, not TypeScript); if `frontend/` already holds an earlier app, align it to the design structure and ask the user before removing any pre-existing files
    - Install `tailwindcss` and `@tailwindcss/vite`; `frontend/vite.config.js` uses `react()` and `tailwindcss()` plugins and sets `test: { environment: 'jsdom' }`
    - `frontend/src/index.css` contains `@import "tailwindcss";`; `frontend/src/main.jsx` renders `<App />` via `createRoot`
    - Install pinned devDependencies with `npm install -D -E`: `vitest@3.2.4`, `fast-check@4.1.1`, `@testing-library/react@16.3.0`, `@testing-library/dom@10.4.0`, `jsdom@26.1.0`; keep the lockfile
    - Set `"test": "vitest --run"` in `frontend/package.json`
    - Create `frontend/.env.example` with only `VITE_API_BASE_URL=http://localhost:8000` and `VITE_USE_MOCK=false`
    - Confirm `.kiro/` is not listed in any `.gitignore` (do not edit the root `README.md`)
    - Create empty placeholder `frontend/src/App.jsx` rendering the page `<h1>` so the build runs
    - _Requirements: 2.3, 14.3, 14.4_

- [ ] 2. Implement pure helpers in `frontend/src/lib/logic.js`
  - [ ] 2.1 Implement file validation helpers
    - `PER_FILE_LIMIT`, `MAX_FILES`, `MIN_FILES`, `isSupportedExtension`, `validateFile`, `addFiles`, `canAnalyze`, `requiredCountMessage` with the messages from the design Error Handling table
    - _Requirements: 1.4, 1.5, 1.6, 1.7, 1.8_

  - [ ]* 2.2 Write property test for file selection
    - **Property 1: File selection invariants**
    - **Validates: Requirements 1.4, 1.5, 1.6, 1.7, 1.8**
    - File: `frontend/src/lib/logic.test.js`; `numRuns: 100`; tag comment per design

  - [ ] 2.3 Implement response validation and error message helpers
    - `validateResponse` per the design pseudocode; `httpErrorMessage` (string `detail`, `JSON.stringify` for non-string `detail`, fallback to status and statusText), `networkErrorMessage`, `unsupportedStatusMessage`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3_

  - [ ]* 2.4 Write property test for response classification
    - **Property 2: Response classification never promotes non-completed bodies**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
    - File: `frontend/src/lib/logic.test.js`; include near-valid bodies with one field broken

  - [ ] 2.5 Implement severity grouping and run summary
    - `normalizeSeverity`, `groupBySeverity` (order high, medium, low, Other; omit empty; stable), `summarizeRun`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 10.4_

  - [ ]* 2.6 Write property test for severity grouping
    - **Property 3: Severity grouping is an ordered partition**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
    - File: `frontend/src/lib/logic.test.js`

  - [ ] 2.7 Implement view, guidance, export, and comparison helpers
    - `citationView`, `fieldOrNotProvided`, `guidanceView`, `guidanceLabel` (returns `null` for every input pending A7), `serializeReport`, `REPORT_FILENAME = 'regulens-report.json'`, `isComparable`
    - _Requirements: 7.6, 7.7, 7.9, 7.11, 7.12, 7.13, 9.2, 9.3, 10.4, 10.5_

  - [ ]* 2.8 Write property test for JSON export
    - **Property 5: JSON export round trip**
    - **Validates: Requirements 9.2, 9.3**
    - File: `frontend/src/lib/logic.test.js`; use `fc.jsonValue()`

  - [ ]* 2.9 Write example tests for helpers
    - `httpErrorMessage` / `networkErrorMessage` with string `detail`, array `detail`, no body
    - `citationView` / `fieldOrNotProvided` placeholders; `guidanceLabel` returns `null` for strings and objects
    - File: `frontend/src/lib/logic.test.js`
    - _Requirements: 5.1, 5.2, 5.3, 7.6, 7.7, 7.9, 7.13_

- [ ] 3. Author mock fixtures
  - [ ] 3.1 Create `frontend/src/mocks/flawed.json` and `frontend/src/mocks/corrected.json`
    - Hand-written Completed_Results in the README findings contract, fictional values, not imported from `samples/`
    - `flawed.json`: several findings across severities, one `unsupported_claim`, one non-null `guidance_reference`; `corrected.json`: fewer findings (zero allowed)
    - _Requirements: 6.7, 11.7_

- [ ] 4. Implement `frontend/src/api.js`
  - [ ] 4.1 Implement `analyze(files, { useMock, fixture, baseUrl })`
    - Mock path: return the named fixture through `validateResponse`, no `fetch`, never choose or switch fixtures
    - Live path: `FormData` with each file under `files`, `fetch(`${baseUrl}/analyze`, { method: 'POST', body })` with no `headers`; map fetch rejection, non-2xx, invalid JSON, `invalid`, and `unsupported` to `{ok:false, message}`; success returns `{ok:true, run:{result, kind, filenames}}` with filenames captured before the request
    - Live path contains no fixture references
    - _Requirements: 2.1, 2.2, 2.4, 3.3, 3.4, 5.1, 5.2, 5.3, 11.2, 11.4, 11.6_

  - [ ]* 4.2 Write property test for live failures
    - **Property 6: Live failures never yield mock data**
    - **Validates: Requirements 5.1, 5.2, 5.3, 11.6**
    - File: `frontend/src/api.test.js`; stub `fetch` with rejections, arbitrary non-2xx, and bad 2xx bodies, for both `fixture` values

  - [ ]* 4.3 Write example tests for live and mock paths
    - Live: `fetch` called once with `${baseUrl}/analyze`, `method:'POST'`, all files under `files`, no `headers`; Run filenames match submitted files
    - Mock: selected fixture returned on repeated calls, `fetch` not called
    - File: `frontend/src/api.test.js`
    - _Requirements: 2.1, 2.2, 2.4, 11.2, 11.4_

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Build presentational components in `frontend/src/components/`
  - [ ] 6.1 Implement `DisclaimerBanner.jsx`
    - Static `<section aria-label="Disclaimer">` with the four statements from the design
    - _Requirements: 12.1, 12.2, 12.3_

  - [ ] 6.2 Implement `UploadPanel.jsx`
    - `<h2>` "Upload documents"; labeled `<input type="file" multiple accept=".pdf,.txt">` reset after each change; file list with name, readable size, and `aria-label="Remove <name>"` buttons
    - File errors in a `role="alert"` region; required-count message below 2 files
    - Fixture_Selector (labeled `<select>`, "Flawed sample"/"Corrected sample") only in Mock_Mode, changed only by user input
    - Analyze button disabled when `!canAnalyze || loading`; "Run again with different files" and "Clear results" when `hasRun`; visible focus styles
    - _Requirements: 1.1, 1.2, 1.3, 1.7, 1.8, 4.3, 10.1, 10.8, 11.3, 11.4, 13.1, 13.2_

  - [ ] 6.3 Implement `FindingCard.jsx`
    - `<article>` with `<h4>` title, id, severity text label (raw value for Other), type, explanation, "Recommended action: …"; "Human review required" when `review_required === true`; fixed `unsupported_claim` note
    - Sources via `citationView` (quote in `<blockquote className="whitespace-pre-wrap">`), "No source citation provided" when missing/empty; guidance via `guidanceView` with optional label
    - JSX text only, no `dangerouslySetInnerHTML`; `String()` for non-string values
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12, 7.13, 14.2_

  - [ ]* 6.4 Write property test for quotation integrity
    - **Property 4: Quotation integrity**
    - **Validates: Requirements 7.3, 7.4, 7.5, 14.2**
    - File: `frontend/src/components/FindingCard.test.jsx`; quotes from `fc.string()` plus HTML-like fragments; assert one citation per source, exact `textContent`, no elements created from quote content

  - [ ] 6.5 Implement `ResultsDashboard.jsx`
    - Props `run, isMock, headingRef, onDownload`; `<h2 ref tabIndex={-1}>` "Results summary"; "Demo data" label when `isMock`; "Download JSON report" button
    - `completed`: documents analyzed, total, zero-findings message plus not-a-certification statement, or `groupBySeverity` groups with `<h3>` "Label (n)" and `FindingCard`s; color as a secondary cue only
    - `extracted_only`: extraction-only notice and each document's filename and page count (missing `pages` = 0); no severity groups
    - `unsupported` (defensive): "Unsupported response status" with the raw status only
    - No scores, probabilities, or badges
    - _Requirements: 3.4, 3.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 8.1, 8.2, 9.1, 11.5, 12.4, 13.3, 13.4_

  - [ ]* 6.6 Write render example tests for `ResultsDashboard`
    - `flawed.json` and `corrected.json` render without errors; Extracted_Only_Result shows the notice and no severity headings; zero findings shows the no-findings message
    - File: `frontend/src/components/ResultsDashboard.test.jsx`
    - _Requirements: 3.5, 6.6, 6.7, 8.1, 8.2_

  - [ ] 6.7 Implement `ComparisonView.jsx`
    - Props `previous, current`; `<h2>` plus two columns "Previous run" / "Current run" in `grid sm:grid-cols-2`, each from `summarizeRun`: total, high/medium/low/Other counts, documents analyzed, filenames
    - Counts only; fixed stable-issue-identity note
    - _Requirements: 10.4, 10.6, 10.7, 13.6_

- [ ] 7. Wire everything in `frontend/src/App.jsx`
  - [ ] 7.1 Implement App state, handlers, and layout
    - Module-scope reads of `VITE_API_BASE_URL` (default `http://localhost:8000`) and `VITE_USE_MOCK === 'true'`, the only env reads
    - `useState` for `selectedFiles, fileErrors, loading, error, fixture ('flawed'), current, previous`; in-memory only, no browser storage
    - `onAddFiles`, `onRemoveFile`, `onAnalyze` (guarded, clears error, applies Run transition table on success, sets error on failure without touching files or runs), `onRunAgain` (clears files and file errors only), `onClear` (clears files, runs, error)
    - `onDownload`: `serializeReport(current.result)` → Blob → temporary object URL on `<a download={REPORT_FILENAME}>`, click, revoke
    - `useEffect` on `current` focuses the results heading ref
    - Render order: `DisclaimerBanner`, `<h1>`, `UploadPanel`, `<div aria-live="polite">` with "Analyzing documents" while loading, `role="alert"` error region when error exists, `ComparisonView` when `isComparable`, `ResultsDashboard` when `current` exists
    - Container `mx-auto max-w-3xl px-4`, `break-words` for long text, focus-visible styles
    - _Requirements: 2.3, 2.4, 4.1, 4.2, 4.3, 5.4, 5.5, 5.6, 9.2, 10.2, 10.3, 10.5, 10.8, 11.1, 11.5, 13.5, 13.6, 14.1, 14.3_

  - [ ]* 7.2 Write App integration example tests
    - Mock mode with stubbed env: analyze shows "Analyzing documents" in the live region, then results with focus on "Results summary"; second success shows Comparison_View; Clear results removes runs
    - Live failure (stubbed `fetch`) shows a `role="alert"` message and preserves files and the existing run
    - File: `frontend/src/App.test.jsx`
    - _Requirements: 4.1, 4.2, 5.4, 5.5, 10.3, 10.5, 10.8, 13.5_

- [ ] 8. Final checkpoint - Ensure all tests pass
  - Run `npm test` and `npm run build` in `frontend/`; ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests (Properties 1–6 from `design.md`) use fast-check with at least 100 runs and a tag comment
- Out of scope: elapsed time, cancel, timeout, health badge, text previews, duplicate detection, match keys, resolved/new/persisting comparison, automatic fixture switching, extra frameworks
- Never modify `backend/`, `samples/`, `tests/`, or `README.md`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "6.1"] },
    { "id": 2, "tasks": ["2.2", "2.3"] },
    { "id": 3, "tasks": ["2.4", "2.5"] },
    { "id": 4, "tasks": ["2.6", "2.7"] },
    { "id": 5, "tasks": ["2.8", "4.1", "6.2"] },
    { "id": 6, "tasks": ["2.9", "4.2", "6.3", "6.7"] },
    { "id": 7, "tasks": ["4.3", "6.4", "6.5"] },
    { "id": 8, "tasks": ["6.6", "7.1"] },
    { "id": 9, "tasks": ["7.2"] }
  ]
}
```
