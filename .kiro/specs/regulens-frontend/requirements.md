# Requirements Document

## Introduction

ReguLens AI is a hackathon proof-of-concept that performs a preliminary evidence-integrity audit of synthetic, AI-assisted drug development documentation. This spec covers the frontend MVP for the seven-hour build: a single-page React app that uploads 2–3 PDF/TXT documents to `POST /analyze`, renders findings grouped by severity with source citations, handles loading and error states, downloads the result as JSON, and supports rerunning with corrected files and a summary-level comparison of two runs.

The root `README.md` is the source of truth for the API contract. The backend (FastAPI, extraction, LLM agents, deterministic verifier, guidance JSON) is out of scope.

## Scope and Ownership

- Stack: React + Vite + Tailwind CSS, plain JavaScript, native `fetch` and `FormData`, small reusable components.
- Excluded from the MVP: additional frameworks, authentication, databases, routers, state-management libraries, chart libraries, animation libraries, and navigation systems.
- The frontend owner changes only `frontend/` and coordinated root `.kiro/` spec files.
- The frontend owner does not change `backend/`, `samples/`, `tests/`, or `README.md`.
- The root `.kiro/` directory is tracked in Git and is not listed in `.gitignore`.
- All paths in spec and source files are repository-relative.

## Glossary

- **App**: The ReguLens React single-page application in `frontend/`.
- **Upload_Panel**: The App component where the user selects, reviews, and removes files.
- **Api_Client**: The App module that sends the analyze request and validates the response.
- **Results_Dashboard**: The App component that renders the Current_Run.
- **Finding_Card**: The App component that renders one Finding.
- **Comparison_View**: The App component that shows a summary of the Previous_Run and the Current_Run side by side.
- **Report_Exporter**: The App module that downloads the Current_Run response as a JSON file.
- **Disclaimer_Banner**: The persistent notice stating the limits of ReguLens results.
- **Backend**: The FastAPI service exposing `POST /analyze`, owned by the tech lead.
- **API_Base_URL**: The Backend root URL, read from `VITE_API_BASE_URL`.
- **Mock_Mode**: The App configuration enabled by `VITE_USE_MOCK=true`, in which the Api_Client returns a Mock_Fixture instead of calling the Backend.
- **Mock_Fixture**: A local JSON file inside `frontend/` that follows the README findings contract. Two exist: "Flawed sample" and "Corrected sample".
- **Fixture_Selector**: The Mock_Mode control that selects which Mock_Fixture is returned.
- **Selected_Files**: The files currently chosen in the Upload_Panel and not removed.
- **Supported_File**: A file whose name ends in `.pdf` or `.txt` (case-insensitive) and whose size is at most the Per_File_Limit.
- **Per_File_Limit**: The maximum accepted file size, 10 MB (10 × 1024 × 1024 bytes); see A6.
- **Completed_Result**: A validated response with `status` equal to `"completed"`.
- **Extracted_Only_Result**: A validated response with `status` equal to `"extracted_only"`.
- **Finding**: One object in a Completed_Result `findings` array, with fields `id`, `type`, `severity`, `title`, `explanation`, `sources`, `guidance_reference`, `action`, `review_required`.
- **Source_Citation**: One object in `Finding.sources`, with fields `filename`, `page`, `quote`.
- **Severity_Group**: One of the display groups high, medium, low, Other.
- **Run**: A validated response together with the list of filenames the App submitted for that request.
- **Current_Run**: The most recent successful Run in the session.
- **Previous_Run**: The Run that was the Current_Run immediately before the latest successful analysis.
- **Error_Message**: A human-readable failure message shown to the user.

## Integration Assumptions

- **A1. Request**: `POST {API_Base_URL}/analyze` with a `FormData` body; each file is appended under the field name `files`; the `Content-Type` header is not set manually.
- **A2. Base URL**: API_Base_URL comes from `VITE_API_BASE_URL`, defaulting to `http://localhost:8000`. No secrets are placed in frontend environment variables.
- **A3. CORS**: The Backend allows origin `http://localhost:5173` (Vite default dev port), as in the README scaffold.
- **A4. Responses**:
  - Completed: `{"status": "completed", "documents_analyzed": <integer>, "findings": [<Finding>, ...]}` per the README findings contract.
  - Temporary scaffold: `{"status": "extracted_only", "documents": [{"filename", "pages": [{"page", "text"}]}], "findings": []}`. An Extracted_Only_Result is never a completed audit.
- **A5. Errors**: Non-2xx responses use the FastAPI shape `{"detail": ...}`. The README scaffold returns 413 for oversized files and 400 for unsupported or unreadable files.
- **A6. Per-file limit — Pending backend agreement**: 10 MB per file, matching the README scaffold.
- **A7. guidance_reference — Pending backend agreement**: The field is `null` or a non-null value. The format of non-null values, and the reference metadata that establishes a reference's source identity (for example, that it comes from the FDA January 2025 draft AI credibility guidance), are not finalized.
- **A8. Open questions** (no frontend behavior depends on these in the MVP):
  - Whether the Backend will guarantee a stable issue identity across runs (required for issue-level comparison).
  - How AI failures and the deterministic fallback are surfaced in responses.
  - Whether `samples/mock_response.json` matches the final contract.

## Requirements

### Requirement 1: File Selection

**User Story:** As a scientist, I want to select 2–3 PDF or TXT documents, so that I can submit an evidence package for audit.

#### Acceptance Criteria

1. THE Upload_Panel SHALL provide a file picker that accepts `.pdf` and `.txt` files and allows multiple selection.
2. THE Upload_Panel SHALL display the name and size of each file in the Selected_Files.
3. WHEN the user activates the remove control for a file, THE Upload_Panel SHALL remove that file from the Selected_Files.
4. IF an added file does not have a `.pdf` or `.txt` extension, THEN THE Upload_Panel SHALL exclude the file from the Selected_Files and display an Error_Message naming the file.
5. IF an added file is larger than the Per_File_Limit, THEN THE Upload_Panel SHALL exclude the file from the Selected_Files and display an Error_Message naming the file and the Per_File_Limit.
6. IF adding files would raise the Selected_Files count above 3, THEN THE Upload_Panel SHALL keep at most 3 files in the Selected_Files and display an Error_Message stating the 3-file maximum.
7. WHILE the Selected_Files contains 2 or 3 Supported_Files and no other files, THE Upload_Panel SHALL enable the analyze control.
8. WHILE the Selected_Files count is below 2, THE Upload_Panel SHALL disable the analyze control and display the required file count.

### Requirement 2: Submitting Analysis

**User Story:** As a user, I want my selected documents sent to the backend, so that I receive evidence findings.

#### Acceptance Criteria

1. WHEN the user activates the enabled analyze control outside Mock_Mode, THE Api_Client SHALL send `POST {API_Base_URL}/analyze` with a FormData body containing each Selected_File under the field name `files`.
2. THE Api_Client SHALL send the analyze request without a manually set `Content-Type` header.
3. THE App SHALL read API_Base_URL from `VITE_API_BASE_URL` and SHALL use `http://localhost:8000` when the variable is unset.
4. WHEN an analyze request is sent, THE App SHALL record the filenames of the submitted Selected_Files as part of the resulting Run.

### Requirement 3: Response Validation

**User Story:** As a user, I want only well-formed responses rendered, so that I never see a misleading or partial audit.

#### Acceptance Criteria

1. WHEN a 2xx response has `status` equal to `"completed"`, THE Api_Client SHALL accept the response as a Completed_Result only if `documents_analyzed` is an integer and `findings` is an array.
2. WHEN a 2xx response has `status` equal to `"extracted_only"`, THE Api_Client SHALL accept the response as an Extracted_Only_Result only if `documents` is an array.
3. IF a 2xx response body is not valid JSON or fails the validation for its status, THEN THE App SHALL display the Error_Message "Response format not recognized".
4. IF a 2xx response has a `status` value other than `"completed"` or `"extracted_only"`, THEN THE App SHALL display the message "Unsupported response status" with the raw `status` value and SHALL NOT render the response as a Completed_Result.
5. FOR ALL Extracted_Only_Results, THE App SHALL render the response only as an extraction-only view and never as a Completed_Result.

### Requirement 4: Loading State

**User Story:** As a user, I want clear feedback while analysis runs, so that I know the app is working.

#### Acceptance Criteria

1. WHILE an analyze request is in flight, THE App SHALL display a loading indicator with the text "Analyzing documents".
2. WHILE an analyze request is in flight, THE App SHALL announce the loading status through an ARIA live region.
3. WHILE an analyze request is in flight, THE Upload_Panel SHALL disable the analyze control so that duplicate requests are not submitted.

### Requirement 5: Error Handling and Retry

**User Story:** As a user, I want readable errors when analysis fails, so that I can fix the problem and retry.

#### Acceptance Criteria

1. IF the Backend returns a non-2xx response with a `detail` field, THEN THE App SHALL display an Error_Message containing the `detail` text and the HTTP status code.
2. IF the Backend returns a non-2xx response without a readable `detail` field, THEN THE App SHALL display an Error_Message containing the HTTP status code and status text.
3. IF the analyze request fails due to a network error, THEN THE App SHALL display an Error_Message stating that the Backend could not be reached at API_Base_URL.
4. WHEN an Error_Message is displayed, THE App SHALL render the Error_Message in an element with `role="alert"`.
5. WHEN an analyze request fails, THE App SHALL preserve the Selected_Files and the existing Current_Run and Previous_Run.
6. WHEN the user activates the analyze control after a failed request, THE Api_Client SHALL send a new analyze request with the preserved Selected_Files.

### Requirement 6: Findings Dashboard

**User Story:** As a reviewer, I want findings grouped by severity, so that I can triage the most important evidence gaps first.

#### Acceptance Criteria

1. WHEN a Completed_Result is the Current_Run, THE Results_Dashboard SHALL display `documents_analyzed` and the total number of Findings.
2. THE Results_Dashboard SHALL group Findings into Severity_Groups in the order high, medium, low, Other, matching `severity` case-insensitively.
3. IF a Finding has a severity other than high, medium, or low, THEN THE Results_Dashboard SHALL place the Finding in the Other group and display the raw severity value.
4. THE Results_Dashboard SHALL display the Finding count of each Severity_Group and SHALL hide Severity_Groups that contain zero Findings.
5. THE Results_Dashboard SHALL convey severity with a text label in addition to color.
6. WHEN a Completed_Result contains zero Findings, THE Results_Dashboard SHALL display the message "No findings were flagged in the uploaded package" and a statement that the result is not a compliance certification.
7. THE Results_Dashboard SHALL render any Completed_Result that conforms to the README findings contract, including the corrected-package result, without code changes.

### Requirement 7: Finding Card and Source Citations

**User Story:** As a reviewer, I want each finding to show its evidence trail, so that I can verify it against the original documents.

#### Acceptance Criteria

1. THE Finding_Card SHALL display the Finding `id`, `title`, severity label, `type`, `explanation`, and `action` (labeled "Recommended action").
2. WHERE a Finding has `review_required` equal to `true`, THE Finding_Card SHALL display the label "Human review required".
3. THE Finding_Card SHALL display each Source_Citation with its `filename`, `page`, and `quote`.
4. THE Finding_Card SHALL display each `quote` as plain text, character-for-character identical to the response value.
5. THE Finding_Card SHALL display only Source_Citations present in the response, without generating or inferring citations.
6. IF a Source_Citation lacks a `page` value, THEN THE Finding_Card SHALL display "Page not provided".
7. IF a Source_Citation lacks a `quote` value, THEN THE Finding_Card SHALL display "Quote not provided".
8. IF a Finding has a missing or empty `sources` array, THEN THE Finding_Card SHALL display "No source citation provided".
9. IF a Finding lacks a `title`, `explanation`, or `action` value, THEN THE Finding_Card SHALL display "Not provided" for that field.
10. WHEN a Finding has `type` equal to `unsupported_claim`, THE Finding_Card SHALL display the note "Supporting evidence was not found in the uploaded package; this does not prove that evidence does not exist."
11. WHERE a Finding has a non-null `guidance_reference`, THE Finding_Card SHALL display the `guidance_reference` value as provided.
12. WHERE a Finding's `guidance_reference` has a source identity established by reference metadata (A7), THE Finding_Card SHALL label the reference "Draft guidance (nonbinding)".
13. WHERE a Finding's `guidance_reference` lacks reference metadata establishing its source identity, THE Finding_Card SHALL display the reference without a draft-guidance label.

### Requirement 8: Extraction-Only Results

**User Story:** As a frontend developer, I want scaffold responses to render clearly, so that I can integrate before analysis exists without implying an audit ran.

#### Acceptance Criteria

1. WHEN an Extracted_Only_Result is the Current_Run, THE Results_Dashboard SHALL display the notice "Text extraction only: findings analysis has not run."
2. WHEN an Extracted_Only_Result is the Current_Run, THE Results_Dashboard SHALL display the `filename` and the page count of each document.

### Requirement 9: JSON Report Download

**User Story:** As a reviewer, I want to download the result as JSON, so that I can share or archive it.

#### Acceptance Criteria

1. WHILE a Current_Run exists, THE Results_Dashboard SHALL display a "Download JSON report" control.
2. WHEN the user activates the "Download JSON report" control, THE Report_Exporter SHALL download a file named `regulens-report.json` containing the Current_Run's parsed response object.
3. FOR ALL validated responses, parsing the downloaded file content SHALL produce an object deeply equal to the Current_Run's parsed response object (round-trip property).

### Requirement 10: Rerun and Run Comparison

**User Story:** As a demo presenter, I want to rerun with corrected files and compare run summaries, so that I can show how the findings changed.

#### Acceptance Criteria

1. WHILE a Current_Run exists, THE App SHALL display a "Run again with different files" control.
2. WHEN the user activates the "Run again with different files" control, THE Upload_Panel SHALL clear the Selected_Files and THE App SHALL keep the Current_Run visible.
3. WHEN a new analysis succeeds while a Current_Run exists, THE App SHALL make the existing Current_Run the Previous_Run and the new Run the Current_Run.
4. WHILE the Previous_Run and the Current_Run are both Completed_Results, THE Comparison_View SHALL display, side by side for each Run, the total Finding count, the Finding count per Severity_Group, `documents_analyzed`, and the submitted filenames.
5. WHILE either the Previous_Run or the Current_Run is not a Completed_Result, THE App SHALL hide the Comparison_View.
6. THE Comparison_View SHALL present counts only and SHALL NOT label individual Findings as resolved, new, or persisting.
7. THE Comparison_View SHALL display a note stating that issue-level comparison requires a stable issue identity guaranteed by the Backend.
8. WHEN the user activates the "Clear results" control, THE App SHALL discard the Current_Run, the Previous_Run, and the Selected_Files.

### Requirement 11: Mock Mode

**User Story:** As a frontend developer, I want to demo with local fixtures, so that I can build and present the UI before the backend is ready.

#### Acceptance Criteria

1. WHERE `VITE_USE_MOCK` equals `true`, THE App SHALL operate in Mock_Mode.
2. WHILE Mock_Mode is enabled, THE Api_Client SHALL return the selected Mock_Fixture without sending any network request.
3. WHILE Mock_Mode is enabled, THE App SHALL display a Fixture_Selector with the options "Flawed sample" and "Corrected sample".
4. WHILE Mock_Mode is enabled, THE Api_Client SHALL return the Mock_Fixture chosen in the Fixture_Selector on every analysis, and the App SHALL change the selection only on user action.
5. WHILE Mock_Mode is enabled, THE App SHALL label displayed results "Demo data".
6. IF an analyze request fails outside Mock_Mode, THEN THE App SHALL display only the Error_Message and SHALL NOT return or display Mock_Fixture data.
7. THE Mock_Fixture files SHALL be stored inside `frontend/` (for example `frontend/src/mocks/`), SHALL follow the README findings contract, and SHALL NOT be imported from `samples/`.

### Requirement 12: Disclaimers

**User Story:** As the product team, I want the UI to state the limits of ReguLens, so that users do not mistake findings for regulatory decisions.

#### Acceptance Criteria

1. THE App SHALL display the Disclaimer_Banner on every view, stating that ReguLens provides a preliminary evidence-integrity audit and is not an FDA approval prediction or regulatory compliance certification.
2. THE Disclaimer_Banner SHALL state that severity is a triage label and not a regulatory risk determination.
3. THE Disclaimer_Banner SHALL state that demo documents are synthetic and fictional.
4. THE App SHALL present results without approval probabilities, regulatory scores, or certification badges.

### Requirement 13: Accessibility and Layout

**User Story:** As a keyboard, screen reader, or mobile user, I want the app to be operable and readable, so that I can complete an audit.

#### Acceptance Criteria

1. THE App SHALL make every interactive control operable with the keyboard and SHALL show a visible focus indicator.
2. THE App SHALL provide an accessible name for every interactive control, including the file picker, remove controls, Fixture_Selector, and download control.
3. THE App SHALL use semantic headings for the page title, upload section, results summary, each Severity_Group, and each Finding title.
4. THE App SHALL render body text with a contrast ratio of at least 4.5:1 against its background.
5. WHEN results render after an analysis, THE App SHALL move keyboard focus to the results summary heading.
6. THE App SHALL use a responsive single-column layout that requires no horizontal scrolling at viewport widths from 320 px to 1920 px.

### Requirement 14: State and Security

**User Story:** As the tech lead, I want the frontend to keep no secrets or persistent data, so that the demo is safe and predictable.

#### Acceptance Criteria

1. THE App SHALL hold Selected_Files and Runs in in-memory state only, without using browser storage.
2. THE App SHALL render all Backend-provided and Mock_Fixture text as plain text, without interpreting the text as HTML.
3. THE App SHALL read only `VITE_API_BASE_URL` and `VITE_USE_MOCK` from environment variables.
4. THE `frontend/.env.example` file SHALL list only `VITE_API_BASE_URL` and `VITE_USE_MOCK`, with no secret values.

## Optional Developer Features

Not part of the core MVP; build only if time remains after integration:

- Elapsed-time display during loading
- Cancel control for an in-flight request
- Request timeout
- `GET /health` connection indicator
- Extracted text previews for Extracted_Only_Results
- Duplicate-file detection in the Upload_Panel
- Additional edge-case Mock_Fixtures (unknown severity, missing fields, multiple citations)
