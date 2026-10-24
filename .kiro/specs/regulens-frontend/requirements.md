# Requirements Document

## Introduction

ReguLens AI is a hackathon proof-of-concept that performs a preliminary evidence-integrity audit of synthetic, AI-assisted drug development documentation. This spec covers the frontend prototype in `frontend/`. It is a React single-page app with these features:

- Signed-in users and anonymous demo visitors can upload 2–3 PDF documents as an analysis run.
- The app follows the run's reported status.
- Findings are grouped by severity, with source citations.
- Cited source PDFs open in an in-app viewer.
- Users can record personal review notes per finding.
- Earlier runs can be reopened from an analysis history.
- Finding counts can be compared with an earlier run.
- The completed findings response downloads as JSON.

This document was reconciled with the implemented prototype (commit `21d1321`). Criteria marked **Status: not yet implemented** describe intended behavior that the prototype does not yet provide. Each one has an unchecked task in `tasks.md`.

The root `README.md` is the source of truth for the findings contract. `frontend/CONTRACT-PENDING.md` is the source of truth for the run, source, and review integration boundary. The backend (FastAPI, extraction, LLM agents, deterministic verifier, guidance JSON, database and storage policies) is out of scope.

## Scope and Ownership

- Stack: React + Vite, plain JavaScript, Supabase Auth (`@supabase/supabase-js`), PDF.js (`pdfjs-dist`), native `fetch`, `FormData`, and `AbortController`. Styling is hand-written CSS with Tailwind v4 imported.
- Routing is a small hand-written History API router. No router, state-management, UI-kit, chart, or animation library is used.
- Excluded: any frontend database or persistence of analysis data, request timeouts, a `GET /health` indicator, duplicate-file detection, and issue-level (resolved/new/persisting) comparison.
- The frontend owner changes only `frontend/` and coordinated root `.kiro/` spec files.
- The frontend owner does not change `backend/`, `samples/`, `tests/`, or `README.md`.
- The root `.kiro/` directory is tracked in Git and is not listed in `.gitignore`.
- All paths in spec and source files are repository-relative.

## Glossary

- **App**: The ReguLens React single-page application in `frontend/`.
- **Auth_Service**: The Supabase Auth project configured through `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- **Session**: The Supabase session of the signed-in user, including its access token.
- **Router**: The App module that maps browser paths to views and performs navigation.
- **Private_Workspace**: The views under `/app`, available only with a Session.
- **Public_Demo**: The views under `/demo`, available without a Session and always backed by the Mock_Adapter.
- **Upload_Page**: The view where the user selects, reviews, and removes files and starts a Run.
- **Run_Page**: The view that shows one Run's status, documents, and findings.
- **History_Page**: The view that lists Runs available to the current adapter.
- **Finding_Card**: The component that renders one Finding.
- **Comparison_View**: The component that summarizes an earlier Run and the current Run side by side.
- **Evidence_Dialog**: The modal dialog that shows a Source_Citation and its source PDF.
- **PDF_Viewer**: The component that renders source PDF pages locally with PDF.js.
- **Review_Controls**: The per-finding review status and note controls.
- **Disclaimer**: The persistent notice stating the limits of ReguLens results.
- **Backend**: The FastAPI service owned by the tech lead.
- **API_Base_URL**: The Backend root URL, read from `VITE_API_BASE_URL`.
- **Runs_Adapter**: The App interface `createRun`, `getRun`, `listRuns`, `getSource`, `saveReview`.
- **Live_Adapter**: The Runs_Adapter implementation that calls the Backend.
- **Mock_Adapter**: The in-memory Runs_Adapter implementation that returns Mock_Fixture data.
- **Backend_Contract**: The configuration in `frontend/src/services/backendContract.js` that maps agreed Backend paths and schemas. It is "confirmed" when its `confirmed` flag is `true`.
- **Mock_Mode**: The configuration in which `VITE_USE_MOCK=true`, so the Private_Workspace uses the Mock_Adapter.
- **Mock_Fixture**: A local JSON file in `frontend/src/mocks/` that follows the README findings contract: `flawed.json` or `corrected.json`.
- **Scenario_Selector**: The demo control that chooses the Mock_Adapter scenario.
- **Selected_Files**: The files currently chosen on the Upload_Page and not removed.
- **Supported_File**: A file whose name ends in `.pdf` (case-insensitive), whose size is at most the Per_File_Limit, and whose first bytes are `%PDF-`.
- **Per_File_Limit**: 10 MB (10 × 1024 × 1024 bytes); see A6.
- **Run**: The App's internal view model of one analysis request: `id`, `status`, `terminal`, timestamps, `documents`, `documentErrors`, optional `method` and `fallback`, `result`, and `reviews`. It is not a wire schema.
- **Terminal_Run**: A Run whose `terminal` flag is `true`.
- **Completed_Result**: A validated findings response with `status` equal to `"completed"`.
- **Extracted_Only_Result**: A validated response with `status` equal to `"extracted_only"`.
- **Finding**: One object in a Completed_Result `findings` array, with fields `id`, `type`, `severity`, `title`, `explanation`, `sources`, `guidance_reference`, `action`, `review_required`, and optional `category`.
- **Source_Citation**: One object in `Finding.sources`, with fields `filename`, `page`, `quote`, and optional `document_id`.
- **Source_Grant**: The Backend response to `GET /documents/{document_id}/source`: `document_id`, `filename`, `url`, `expires_in`.
- **Severity_Group**: One of the display groups high, medium, low, Other.
- **Review**: A personal review record `{status, note}` with status `unreviewed`, `reviewed`, or `needs_clarification`.
- **Error_Message**: A human-readable failure message shown to the user.

## Integration Assumptions

- **A1. Run creation**: `POST {API_Base_URL}/runs` (confirmed) with a `FormData` body. Each file is appended under the field name `files`; this field name is inherited and must be reconfirmed. The `Content-Type` header is not set manually.
- **A2. Base URL and configuration**: API_Base_URL comes from `VITE_API_BASE_URL`, defaulting to `http://localhost:8000`, with trailing slashes removed. The Supabase project URL and publishable key are public configuration. Secret or service-role keys never appear in frontend environment variables.
- **A3. CORS and origins**: The dev server runs on `http://127.0.0.1:5173` (strict port). The Backend allow-list and Supabase redirect URLs must include `http://127.0.0.1:5173`, `http://localhost:5173`, and the eventual public origin.
- **A4. Responses**:
  - Completed: `{"status": "completed", "documents_analyzed": <integer>, "findings": [<Finding>, ...]}` per the README findings contract.
  - Temporary scaffold: `{"status": "extracted_only", "documents": [{"filename", "pages": [{"page", "text"}]}], "findings": []}`. An Extracted_Only_Result is never a completed audit.
- **A5. Errors**: Non-2xx responses use the FastAPI shape `{"detail": ...}`. 401 means the Session was rejected; 403 means the user lacks access to the resource.
- **A6. Per-file limit, pending backend agreement**: 10 MB per file and 2–3 files per Run, inherited from the README scaffold.
- **A7. guidance_reference, pending backend agreement**: The field is `null` or a non-null value. The format of non-null values, and the metadata that establishes a reference's source identity (for example, that it comes from the FDA January 2025 draft AI credibility guidance), are not finalized.
- **A8. Source documents (confirmed)**: `GET /documents/{document_id}/source` returns a Source_Grant whose HTTPS `url` expires after `expires_in` seconds (60).
- **A9. Pending run contract**: These are not yet agreed and are mapped only through the Backend_Contract:
  - run detail, history, and review paths and schemas
  - lifecycle values and which ones are terminal
  - timestamp semantics
  - document IDs and the document-error format
  - analysis-method and fallback metadata
  - review HTTP method and allowed values
- **A10. Open questions**:
  - Whether the Backend will guarantee a stable issue identity across runs (required for issue-level comparison).
  - Whether `samples/mock_response.json` matches the final contract.
  - Backend enforcement of owner-only access in FastAPI, PostgreSQL, and Storage policies. The client route guard is not a security boundary.

## Requirements

### Requirement 1: File Selection

**User Story:** As a scientist, I want to select 2–3 PDF documents, so that I can submit an evidence package for audit.

#### Acceptance Criteria

1. THE Upload_Page SHALL provide a labeled file picker that accepts PDF files and allows multiple selection, and a drop zone that accepts dragged files.
2. THE Upload_Page SHALL display the name and size in kilobytes of each file in the Selected_Files, and the count of Selected_Files out of 3.
3. WHEN the user activates the remove control for a file, THE Upload_Page SHALL remove that file from the Selected_Files.
4. IF an added file does not have a `.pdf` extension, THEN THE Upload_Page SHALL exclude the file from the Selected_Files and display an Error_Message naming the file.
5. IF an added file is larger than the Per_File_Limit, THEN THE Upload_Page SHALL exclude the file from the Selected_Files and display an Error_Message naming the file and the Per_File_Limit.
6. IF an added file does not begin with the `%PDF-` signature, THEN THE Upload_Page SHALL exclude the file from the Selected_Files and display an Error_Message naming the file.
7. IF adding files would raise the Selected_Files count above 3, THEN THE Upload_Page SHALL keep at most 3 files in the Selected_Files and display an Error_Message stating the 3-file maximum.
8. WHILE the Selected_Files count is below 2, THE Upload_Page SHALL disable the start-analysis control and display "Select at least 2 PDF documents to begin."
9. WHILE the Selected_Files contains 2 or 3 Supported_Files and no file check or submission is in progress, THE Upload_Page SHALL enable the start-analysis control.
10. WHILE the Mock_Adapter is in use, THE Upload_Page SHALL offer a control that replaces the Selected_Files with the fictional sample PDFs.

### Requirement 2: Submitting Analysis

**User Story:** As a user, I want my selected documents submitted as an analysis run, so that I receive evidence findings.

#### Acceptance Criteria

1. WHEN the user activates the enabled start-analysis control, THE App SHALL call `createRun` on the active Runs_Adapter with the Selected_Files and the selected scenario.
2. WHEN the Live_Adapter creates a Run under a confirmed Backend_Contract, THE Live_Adapter SHALL send `POST {API_Base_URL}/runs` with a FormData body containing each Selected_File under the Backend_Contract upload field, without a manually set `Content-Type` header.
3. THE App SHALL read API_Base_URL from `VITE_API_BASE_URL` and SHALL use `http://localhost:8000` when the variable is unset.
4. WHEN `createRun` returns a Run, THE App SHALL navigate to that Run's Run_Page.
5. THE Run SHALL record the filenames of its documents. The Mock_Adapter takes them from the submitted files; the Live_Adapter takes them from the Backend response.

### Requirement 3: Response Validation

**User Story:** As a user, I want only well-formed results rendered, so that I never see a misleading or partial audit.

#### Acceptance Criteria

1. WHEN a response has `status` equal to `"completed"`, THE App SHALL accept it as a Completed_Result only if `documents_analyzed` is a non-negative integer, `findings` is an array of objects, and each Finding's non-null `sources` is an array of objects.
2. WHEN a response has `status` equal to `"extracted_only"`, THE App SHALL accept it as an Extracted_Only_Result only if `documents` is an array of objects that each have a `pages` array.
3. IF a 2xx response body is not valid JSON or fails the validation for its status, THEN THE App SHALL display the Error_Message "Response format not recognized".
4. IF a response has a `status` value other than `"completed"` or `"extracted_only"`, THEN THE App SHALL display "Unsupported response status" with the raw `status` value and SHALL NOT render the response as a Completed_Result.
5. THE App SHALL accept a Run only if it has a non-empty string `id`, a string `status`, a boolean `terminal`, documents with string `id` and `filename`, and document errors with a string `message`.
6. IF a Run carries a non-null `result`, THEN THE App SHALL accept the Run only if the `result` is a Completed_Result and the Run is a Terminal_Run.
7. FOR ALL Extracted_Only_Results, THE App SHALL never render the response as a Completed_Result.

### Requirement 4: Submission and Run Status

**User Story:** As a user, I want clear feedback while my run is submitted and processed, so that I know the app is working.

#### Acceptance Criteria

1. WHILE Selected_Files are being checked, THE Upload_Page SHALL display "Checking PDF files…" in a status region.
2. WHILE a `createRun` request is in flight, THE Upload_Page SHALL display "Submitting evidence package…" in a status region and SHALL disable the start-analysis, file, and scenario controls so duplicate requests are not submitted.
3. WHILE a displayed Run is not a Terminal_Run, THE Run_Page SHALL request the Run again 1.5 seconds after each response, one request at a time.
4. WHEN a displayed Run becomes a Terminal_Run or a status request fails, THE Run_Page SHALL stop requesting the Run.
5. THE Run_Page SHALL display the Run's raw status in a status region, with a progress indicator while the Run is not terminal and "Final reported status" once it is.
6. THE Run_Page SHALL display the Run ID and the created, last-updated, and completed times. It SHALL also display the analysis method and fallback-used values, or "Not reported" when they are absent.
7. THE Run_Page SHALL list each document in the Run with its reported status and any document errors.
8. WHEN the user leaves the Upload_Page or Run_Page, THE App SHALL abort that page's in-flight requests.

### Requirement 5: Error Handling and Retry

**User Story:** As a user, I want readable errors when a request fails, so that I can fix the problem and retry.

#### Acceptance Criteria

1. IF the Backend returns a non-2xx response other than 401 or 403 with a `detail` field, THEN THE App SHALL display an Error_Message of the form "HTTP <status>: <detail>". A non-string `detail` SHALL be shown as JSON.
2. IF the Backend returns a non-2xx response other than 401 or 403 without a readable `detail` field, THEN THE App SHALL display an Error_Message containing the HTTP status code and status text.
3. IF a Backend request fails due to a network error, THEN THE App SHALL display "The application API could not be reached. Please retry."
4. IF the Backend returns 401, THEN THE App SHALL display "Your session was rejected. Please sign in again." with a "Sign in again" control that signs the user out and opens `/login`.
5. IF the Backend returns 403, THEN THE App SHALL display "You do not have access to this resource."
6. WHEN an Error_Message is displayed, THE App SHALL render it in an element with `role="alert"`.
7. WHEN a `createRun` request fails, THE Upload_Page SHALL preserve the Selected_Files so the user can retry.
8. WHEN a Run status request fails, THE Run_Page SHALL offer a "Retry status request" control that resumes status requests.

### Requirement 6: Findings Dashboard

**User Story:** As a reviewer, I want findings grouped by severity, so that I can triage the most important evidence gaps first.

#### Acceptance Criteria

1. WHEN a Run's `result` is a Completed_Result, THE Run_Page SHALL display `documents_analyzed`, the total number of Findings, and the count for each non-empty Severity_Group.
2. THE Run_Page SHALL group Findings into Severity_Groups in the order high, medium, low, Other, matching `severity` case-insensitively and keeping response order within each group.
3. IF a Finding has a severity other than high, medium, or low, THEN THE Run_Page SHALL place the Finding in the Other group, and THE Finding_Card SHALL display the raw severity value.
4. THE Run_Page SHALL head each Severity_Group with a text label ("High priority", "Medium priority", "Low priority", "Other findings") and its Finding count, and SHALL hide Severity_Groups that contain zero Findings.
5. THE App SHALL convey severity with a text label in addition to color.
6. WHEN a Completed_Result contains zero Findings, THE Run_Page SHALL display "No findings were flagged in the uploaded package" and a statement that the result is not a compliance certification.
7. THE Run_Page SHALL render any Completed_Result that conforms to the README findings contract, including the corrected-package result, without code changes.
8. WHEN a Terminal_Run has no `result`, THE Run_Page SHALL state that the Run has no completed findings report.
9. THE App SHALL match severity values after trimming surrounding whitespace. **Status: not yet implemented.**

### Requirement 7: Finding Card and Source Citations

**User Story:** As a reviewer, I want each finding to show its evidence trail, so that I can verify it against the original documents.

#### Acceptance Criteria

1. THE Finding_Card SHALL display the Finding `id`, `title`, severity label, `type`, `explanation`, and `action` (labeled "Recommended action"), plus `category` when present.
2. WHERE a Finding has `review_required` equal to `true`, THE Finding_Card SHALL display the label "Human review required".
3. THE Finding_Card SHALL display each Source_Citation with its `filename`, `page`, and `quote`.
4. THE Finding_Card SHALL display each `quote` as plain text, character-for-character identical to the response value, with whitespace preserved.
5. THE Finding_Card SHALL display only Source_Citations present in the response, without generating or inferring citations.
6. IF a Source_Citation lacks a `page` value, THEN THE Finding_Card SHALL display "Page not provided".
7. IF a Source_Citation lacks a `quote` value, THEN THE Finding_Card SHALL display "Quote not provided".
8. IF a Finding has a missing or empty `sources` array, THEN THE Finding_Card SHALL display "No source citation provided".
9. IF a Finding lacks a `title`, `explanation`, or `action` value, THEN THE Finding_Card SHALL display "Not provided" for that field.
10. WHEN a Finding has `type` equal to `unsupported_claim`, THE Finding_Card SHALL display the note "Supporting evidence was not found in the uploaded package; this does not prove that evidence does not exist."
11. WHERE a Finding has a non-null `guidance_reference`, THE Finding_Card SHALL display the `guidance_reference` value as provided, under the label "Guidance reference".
12. WHERE a Finding's `guidance_reference` has a source identity established by reference metadata (A7), THE Finding_Card SHALL label the reference "Draft guidance (nonbinding)". **Status: not yet implemented; blocked on A7.**
13. WHERE a Finding's `guidance_reference` lacks reference metadata establishing its source identity, THE Finding_Card SHALL display the reference without a draft-guidance label.
14. THE Finding_Card SHALL provide an "Inspect source" control for each Source_Citation that opens the Evidence_Dialog (Requirement 18).

### Requirement 8: Extraction-Only Results

**User Story:** As a frontend developer, I want scaffold responses to render clearly, so that I can integrate before analysis exists without implying an audit ran.

**Status: not yet implemented.** The current Run validation rejects non-completed results.

#### Acceptance Criteria

1. WHEN a Run's `result` is an Extracted_Only_Result, THE Run_Page SHALL display the notice "Text extraction only: findings analysis has not run."
2. WHEN a Run's `result` is an Extracted_Only_Result, THE Run_Page SHALL display the `filename` and the page count of each document.
3. WHEN a Run's `result` is an Extracted_Only_Result, THE Run_Page SHALL NOT display Severity_Groups, finding counts, or the comparison.

### Requirement 9: JSON Report Download

**User Story:** As a reviewer, I want to download the result as JSON, so that I can share or archive it.

#### Acceptance Criteria

1. WHILE the displayed Run has a Completed_Result, THE Run_Page SHALL display a "Download JSON report" control.
2. WHEN the user activates the "Download JSON report" control, THE App SHALL download a file named `regulens-report.json` containing the Run's parsed `result` object, including any fields the App does not display.
3. FOR ALL Completed_Results, parsing the downloaded file content SHALL produce an object deeply equal to the Run's `result` (round-trip property).
4. THE downloaded report SHALL NOT include Reviews or reviewer notes.

### Requirement 10: New Analysis and Run Comparison

**User Story:** As a demo presenter, I want to rerun with corrected files and compare run summaries, so that I can show how the findings changed.

#### Acceptance Criteria

1. THE App SHALL provide a "New analysis" control on the workspace navigation and on the Run_Page that opens an empty Upload_Page.
2. WHILE the workspace is open, THE App SHALL remember in memory each Run that reached a Completed_Result.
3. WHEN the displayed Run has a Completed_Result and an earlier remembered Run with a Completed_Result exists, THE Comparison_View SHALL compare the displayed Run with the most recent earlier Run by creation time.
4. THE Comparison_View SHALL display, side by side for each Run, the total Finding count, the Finding count per Severity_Group, `documents_analyzed`, and the document filenames.
5. WHILE no earlier remembered Run with a Completed_Result exists, THE App SHALL hide the Comparison_View.
6. THE Comparison_View SHALL present counts only and SHALL NOT label individual Findings as resolved, new, or persisting.
7. THE Comparison_View SHALL display a note stating that issue-level comparison requires a stable issue identity guaranteed by the Backend.
8. WHEN the user, the workspace mode, or the page session changes, THE App SHALL discard the remembered Runs.

### Requirement 11: Mock Mode and Public Demo

**User Story:** As a frontend developer and demo presenter, I want an illustrative workspace backed by local fixtures, so that I can present the flow before the backend is ready.

#### Acceptance Criteria

1. WHERE `VITE_USE_MOCK` equals `true`, or the route is under `/demo`, THE App SHALL use the Mock_Adapter.
2. WHILE the Mock_Adapter is in use, THE App SHALL send no Backend request for Run operations.
3. WHILE the Mock_Adapter is in use, THE Upload_Page SHALL display a Scenario_Selector with the options "Flawed package", "Corrected package", and "Document processing error". The default SHALL be "Flawed package", and the selection SHALL change only on user action.
4. THE Mock_Adapter SHALL return a Run that reports queued, then processing, then a terminal state. The terminal state SHALL be completed with the selected Mock_Fixture, or failed with an illustrative document error for "Document processing error".
5. WHILE the Mock_Adapter is in use, THE App SHALL display a "DEMO WORKSPACE" notice stating that states and findings are illustrative, uploaded content is not analyzed, and demo data lasts only until refresh. Results SHALL be labeled "Demo data", the source viewer "Demo PDF", and the analysis method "Deterministic fixture · no live analysis".
6. IF a Live_Adapter request fails, THEN THE App SHALL display only the Error_Message and SHALL NOT return or display Mock_Fixture data.
7. THE Mock_Fixture files SHALL be stored inside `frontend/src/mocks/`, SHALL follow the README findings contract, and SHALL NOT be imported from `samples/`.
8. THE Mock_Adapter SHALL keep Runs and Reviews in memory only, isolated from authenticated user data, and cleared on page refresh.
9. WHEN the user inspects a source while the Mock_Adapter is in use, THE Mock_Adapter SHALL return a generated fictional PDF for the sample filenames. For any other filename it SHALL return an Error_Message stating that demo mode does not analyze uploaded PDF contents.

### Requirement 12: Disclaimers

**User Story:** As the product team, I want the UI to state the limits of ReguLens, so that users do not mistake findings for regulatory decisions.

#### Acceptance Criteria

1. THE App SHALL display the Disclaimer on every view, stating that ReguLens provides a preliminary evidence-integrity audit and is not an FDA approval prediction or regulatory compliance certification.
2. THE Disclaimer SHALL state that severity is a triage label and not a regulatory risk determination.
3. THE Disclaimer SHALL state that demo documents are synthetic and fictional.
4. THE App SHALL present results without approval probabilities, regulatory scores, or certification badges.
5. THE Review_Controls SHALL state that "Reviewed" means inspected, not resolved or scientifically confirmed.

### Requirement 13: Accessibility and Layout

**User Story:** As a keyboard, screen reader, or mobile user, I want the app to be operable and readable, so that I can complete an audit.

#### Acceptance Criteria

1. THE App SHALL make every interactive control operable with the keyboard and SHALL show a visible focus indicator.
2. THE App SHALL provide an accessible name for every interactive control, including the file picker, remove controls, Scenario_Selector, review controls, download control, and PDF page controls.
3. THE App SHALL use semantic headings. Each view title SHALL be a level-1 heading. Page sections SHALL be level-2 headings. Severity_Groups and the comparison SHALL be level-3 headings. Each Finding title SHALL be a level-4 heading.
4. THE App SHALL render body text with a contrast ratio of at least 4.5:1 against its background.
5. WHEN the Run_Page, History_Page, or authentication view opens, and when a Run's Completed_Result first renders, THE App SHALL move keyboard focus to that view's title heading.
6. THE App SHALL use a responsive layout that requires no horizontal scrolling at viewport widths from 320 px to 1920 px.
7. THE App SHALL announce status changes (file checks, submission, run status, loading, review saves) through status regions.
8. WHILE the user's system requests reduced motion, THE App SHALL disable animations and transitions.

### Requirement 14: State and Security

**User Story:** As the tech lead, I want the frontend to keep no secrets or analysis data in the browser, so that the prototype is safe and predictable.

#### Acceptance Criteria

1. THE App SHALL hold Selected_Files, Runs, Reviews, and signed source URLs in in-memory state only. Only the Auth_Service SDK may persist the Session in browser storage.
2. THE App SHALL render all Backend-provided and Mock_Fixture text as plain text, without interpreting the text as HTML.
3. THE App SHALL read only `VITE_API_BASE_URL`, `VITE_USE_MOCK`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_PUBLISHABLE_KEY` from environment variables.
4. THE `frontend/.env.example` file SHALL list only those four variables, with no secret values.
5. THE App SHALL retrieve the current Session access token for every Backend request and SHALL send it only in an `Authorization: Bearer` header.
6. THE App SHALL send Backend requests only to paths relative to API_Base_URL. It SHALL NOT place tokens in URLs, and it SHALL NOT follow HTTP redirects.
7. IF no Session access token is available, THEN THE App SHALL NOT send the Backend request and SHALL display "Your session has expired. Please sign in again."

### Requirement 15: Authentication

**User Story:** As a scientist, I want a personal account, so that my runs and review notes are tied to me.

#### Acceptance Criteria

1. THE App SHALL provide a sign-in view at `/login` and a sign-up view at `/signup`, each with labeled email and password fields, that authenticate with the Auth_Service.
2. THE sign-up view SHALL require a password of at least 8 characters. It SHALL send a confirmation redirect to the current origin's `/login`.
3. WHEN sign-up returns no Session, THE sign-up view SHALL tell the user to confirm their email and then sign in.
4. THE sign-in and sign-up views SHALL provide a "Continue with Google" control that starts Auth_Service Google OAuth and returns to the current origin's `/login`.
5. IF the Auth_Service reports the Google provider as disabled, THEN THE App SHALL disable the Google control and state that Google sign-in is being configured.
6. IF the Auth_Service is not configured or its configuration is invalid, THEN THE App SHALL disable the account controls, explain why, and keep the link to the Public_Demo available.
7. WHILE a Session exists, THE App SHALL display the user's email and a "Log out" control in the header.
8. WHEN the user activates "Log out", THE App SHALL end the local Session, remove the Private_Workspace views, and navigate to `/login`. IF sign-out fails, THEN THE App SHALL display the Error_Message and keep the Session.
9. WHILE the Auth_Service is restoring a Session, THE App SHALL display "Restoring your session…".

### Requirement 16: Routing and Access Control

**User Story:** As a user, I want stable links for my workspace, history, and runs, so that I can navigate and reopen my work.

#### Acceptance Criteria

1. THE Router SHALL serve `/login`, `/signup`, `/app`, `/app/history`, `/app/runs/:id`, `/demo`, `/demo/history`, and `/demo/runs/:id`, and SHALL show "Page not found" for other paths.
2. WHEN the path is `/`, THE Router SHALL navigate to `/app` if a Session exists and to `/login` otherwise.
3. IF a Private_Workspace path is requested without a Session after Session restoration completes, THEN THE Router SHALL navigate to `/login`.
4. WHEN a Session exists on `/login` or `/signup`, THE App SHALL navigate to `/app`.
5. THE Router SHALL accept only application-relative paths for navigation.
6. THE Router SHALL update the view on browser back and forward navigation.

### Requirement 17: Backend Contract Boundary

**User Story:** As the frontend owner, I want unconfirmed backend calls blocked, so that the UI never imposes or guesses a wire contract.

#### Acceptance Criteria

1. WHILE the Backend_Contract is not confirmed, THE Live_Adapter SHALL reject `createRun`, `getRun`, `listRuns`, and `saveReview` without sending a request. It SHALL display "Live run integration is waiting for the backend contract. Use the labeled demo workspace to preview this flow."
2. WHILE the Live_Adapter is in use and the Backend_Contract is not confirmed, THE workspace SHALL display a "Backend contract pending." notice.
3. THE Live_Adapter SHALL convert Backend responses to Runs and Reviews only through the Backend_Contract decoders. It SHALL validate each Run per Requirement 3.
4. THE source-document operation SHALL be enabled independently of the run contract once the source path is confirmed (A8).

### Requirement 18: Source Document Inspection

**User Story:** As a reviewer, I want to open the cited PDF next to the quotation, so that I can verify a finding against the original document.

#### Acceptance Criteria

1. WHEN the user activates "Inspect source", THE App SHALL open the Evidence_Dialog as a modal. It SHALL show the citation's filename, page, and response quotation separately from the source document.
2. THE App SHALL identify the source document by the citation's `document_id` when present, otherwise by a unique filename match among the Run's documents. IF no unique document matches, THEN THE Evidence_Dialog SHALL explain that a unique source document could not be identified and SHALL NOT request a source.
3. WHEN the Live_Adapter retrieves a source, THE App SHALL request a new Source_Grant for every open. It SHALL accept the grant only if its `document_id` matches, `filename` is a string, `expires_in` is positive, and `url` is HTTPS without embedded credentials.
4. THE App SHALL download the signed URL without the Authorization header, cookies, or referrer, with caching disabled.
5. IF the signed URL download returns 401 or 403 on the first attempt, THEN THE App SHALL request one new Source_Grant and retry once. Further failures SHALL show an Error_Message with a "Retry source retrieval" control.
6. THE App SHALL accept source bytes only if they begin with the `%PDF-` signature.
7. THE PDF_Viewer SHALL render the source PDF locally, open at the cited page (or page 1), and provide previous, next, and page-number controls. It SHALL note when the cited page exceeds the page count.
8. THE PDF_Viewer SHALL offer the extracted text of the current page as readable text.
9. WHEN the Evidence_Dialog closes, THE App SHALL abort pending source requests, release the temporary PDF URL, and return focus to the previously focused control.

### Requirement 19: Reviewer Notes

**User Story:** As a reviewer, I want to record a status and note per finding, so that I can track my follow-up separately from the analysis.

#### Acceptance Criteria

1. THE Finding_Card SHALL display Review_Controls with a review status (Unreviewed, Reviewed, Needs clarification), a note of at most 10,000 characters, and a "Save review" control.
2. WHEN the user edits a Review, THE App SHALL show "Unsaved changes" for that Finding.
3. WHEN the user activates "Save review", THE App SHALL call `saveReview` with the Run ID, the Finding `id`, and the Review. It SHALL show "Review saved", or "Saved in demo session" for the Mock_Adapter, on success, and "Not saved: <message>" on failure.
4. IF a Finding has no `id`, THEN THE App SHALL disable "Save review" and state that a backend finding ID is required.
5. THE App SHALL keep Review status separate from Finding severity.

### Requirement 20: Analysis History

**User Story:** As a returning user, I want to reopen earlier runs, so that I can continue reviewing them.

#### Acceptance Criteria

1. THE History_Page SHALL list the Runs returned by `listRuns`. Each entry SHALL show its status, document filenames, creation time, finding count or "No completed report", Run ID, and an "Open run" control.
2. THE History_Page SHALL provide a "Refresh history" control and SHALL show loading, error, and empty states.
3. WHEN no Runs exist, THE History_Page SHALL display "Your first review starts here." with a control to start an analysis.
4. WHILE the Mock_Adapter is in use, THE History_Page SHALL state that the listed runs belong to this demo session and are cleared on refresh.

## Optional Developer Features

Not part of the prototype; build only if time remains after integration:

- Request timeout and an explicit cancel control
- `GET /health` connection indicator
- Extracted text previews for Extracted_Only_Results
- Duplicate-file detection on the Upload_Page
- Additional edge-case Mock_Fixtures (unknown severity, non-null guidance reference, missing fields)
