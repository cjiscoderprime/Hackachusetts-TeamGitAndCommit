# BioLyze AI: Automated Regulatory Evidence Review

**Hackathon:** Hackachusetts 2026 @ MIT The Engine  
**Category:** Healthcare / Biotech  
**Team:** GitAndCommit  

> "Catch evidence gaps before regulators do."

---

## 🚀 Quick Links

- 📄 **[Full Documentation](./PROJECT_DOCUMENTATION.md)** - Complete technical details
- 🎯 **[Vision & Strategy](./VISION_AND_REALITY.md)** - Strategic analysis and roadmap
- 🔬 **[Research Context](./research_data/research/RESEARCH_AND_REGULATORY_CONTEXT.md)** - FDA guidance and scientific background

---

## The Problem

Developing a new biopharmaceutical product takes **10-15 years** and costs **billions of dollars**. While AI accelerates drug discovery, validating scientific evidence and preparing regulatory submissions remain bottlenecks.

### Current Pain Points

- **Manual review burden:** Regulatory teams spend weeks reviewing documentation
- **Evidence verification:** Citations and metrics must be traced across multiple documents
- **Costly delays:** Deficiencies trigger 2-6 month resubmission cycles
- **AI validation complexity:** FDA's 2025 guidance requires specific AI credibility evidence
- **High failure risk:** 800+ FDA submissions with AI components since 2016

**The core problem:** Companies spend months preparing submissions, only to face rejections for preventable deficiencies like contradictory performance metrics or missing validation evidence.

---

## Our Solution: BioLyze AI

An **AI-powered pre-submission evidence integrity review system** that helps biotechnology companies:

✅ **Check submission quality** before sending to the FDA  
✅ **Identify potential deficiencies** that would trigger rejection  
✅ **Verify evidence consistency** across multiple documents  
✅ **Get actionable feedback** with source-level references  
✅ **Improve acceptance probability** by catching errors early

### How It Works

```
Upload Documents → AI Extraction → Evidence Verification → Findings Report
     ↓                   ↓                    ↓                    ↓
Scientific PDFs    Gemini extracts      Deterministic        Dashboard with
Validation reports structured claims    contradiction        source quotes
Model cards        & metrics            detection            & recommendations
```

**Key Innovation:**
- ✨ **Source traceability** - Every finding traces to document, page, exact quote
- 🔢 **Domain-specific checks** - Confusion matrix arithmetic verification
- 📋 **FDA alignment** - Maps to 2025 AI credibility guidance
- 📊 **Before/after comparison** - Shows evidence quality improvement

---

## What We Built (7 Hours)




### Full-Stack Application

**Frontend** (`/frontend`)
- React 19 + Vite + Tailwind CSS
- Drag-and-drop PDF upload (2-3 documents)
- Real-time analysis progress
- Findings dashboard with severity grouping
- Source evidence inspector with page references
- Demo mode with offline mock data

**Backend** (`/backend`)
- FastAPI with PDF extraction (PyMuPDF)
- Gemini 2.0 Flash AI claim extraction
- Supabase authentication
- Analysis run management
- Review workflow with notes

**Validation Engine** (`/research_data`)
- 8 verification rules (metric mismatches, version conflicts, missing documentation)
- 6 synthetic test documents (flawed + corrected packages)
- Ground truth labels for evaluation
- FDA 2025 AI guidance mapping

### Demo Scenario

**Fictional Case:** AsterBio's AB-101 drug with HepaRisk v2.1 AI model

1. **Upload flawed package** (3 documents with planted defects)
2. **System flags:**
   - ⚠️ HIGH: Sensitivity 0.95 vs calculated 0.80 from confusion matrix
   - ⚠️ HIGH: Model version v2.0 vs v2.1 mismatch
   - ⚠️ MEDIUM: Missing uncertainty estimates
   - ⚠️ MEDIUM: No predefined acceptance criteria
3. **Upload corrected package**
4. **All findings disappear** ✅

**Key proof points:** Source quotes show exact contradictions, arithmetic verification catches errors, before/after comparison validates detection.
---

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | React 19 + Vite + Tailwind CSS | Fast UI with drag-and-drop upload |
| Backend API | FastAPI (Python) | Upload and analysis endpoints |
| PDF Processing | PyMuPDF | Text extraction with page metadata |
| AI Extraction | Google Gemini 2.0 Flash | Structured claim extraction |
| Verification | Python + Pydantic | Deterministic contradiction checks |
| Auth & Storage | Supabase | User management and run persistence |
| FDA Guidance | Versioned JSON | 2025 draft AI credibility framework |

---

## Repository Structure

```
Hackachusetts-TeamGitAndCommit-1/
├── backend/              # FastAPI server + AI integration
│   ├── main.py          # API endpoints
│   ├── agents.py        # Gemini claim extraction
│   ├── pipeline.py      # Analysis orchestration
│   ├── extractor.py     # PDF parsing
│   └── verifier.py      # Deterministic verification (copy from research_data)
├── frontend/            # React UI
│   ├── src/
│   │   ├── Workspace.jsx          # Upload and findings
│   │   ├── ReviewWorkspace.jsx    # Evidence inspector
│   │   └── services/              # API clients
│   └── package.json
├── research_data/       # Validation framework
│   ├── backend/verifier.py        # 8 verification rules
│   ├── samples/                   # Test documents
│   │   ├── flawed/               # Planted defects
│   │   └── corrected/            # Fixed version
│   ├── guidance/                  # FDA mapping
│   ├── evaluation/                # Scoring scripts
│   └── research/                  # Regulatory context
├── PROJECT_DOCUMENTATION.md       # Complete technical docs
└── VISION_AND_REALITY.md         # Strategic analysis
```
Architecture
Upload PDFs/TXT from React
          |
          v
      POST /analyze
          |
          v
  FastAPI: parse documents
          |
          v
  LLM: extract claims/metrics
          |
          v
  Python rule engine -------- FDA draft guidance JSON
          |
          v
 Findings with source + page + evidence + proposed next action
          |
          v
 React findings dashboard + downloadable JSON
Agent responsibilities (small, explicit pipeline)
- Extraction agent: For each document, return claims, metrics, units, document references, and source quotations. Return unknown when not located; never create an invented reference.
- Evidence-mapping agent: Suggest which cited claims are supported, unsupported, or unclear; attach supporting text when available.
- Deterministic verifier: Compare normalized matching metrics across documents, check missing/duplicate references, and flag discrepancies. A numerical mismatch must come from actual extracted values, never from the model's opinion.
- Report generator: Merge findings, include source traces and recommended human review actions.
Important: An AI label of “unsupported” means supporting evidence was not found in the uploaded package; it is not proof that evidence does not exist.
---

## Getting Started

### Prerequisites

- Git
- Node.js LTS (18+) and npm
- Python 3.11 or 3.12
- Gemini API key (for AI extraction)

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/cjiscoderprime/Hackachusetts-TeamGitAndCommit.git
cd Hackachusetts-TeamGitAndCommit-1
```

**2. Backend Setup**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install fastapi uvicorn python-multipart pymupdf pydantic python-dotenv google-genai

# Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Copy verifier from research_data (if not already done)
cp ../research_data/backend/verifier.py ./

# Start server
uvicorn main:app --reload --port 8000
```

**3. Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```

**4. Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

### Demo Mode (No Backend Required)

The frontend includes a demo mode with mock data:
```bash
cd frontend
npm run dev
# Toggle "Demo mode" in the UI
```
---

## Value Proposition

### For Biotechnology Companies

**Problems We Solve:**
- Manual evidence review takes weeks
- Contradictions slip through to FDA submission
- Resubmission cycles waste 2-6 months **each**
- Regulatory teams lack bandwidth for thorough pre-checks

**Our Impact:**
- ⚡ **Speed:** Evidence checks in minutes vs. days
- ✅ **Quality:** Catch contradictions before FDA does
- 💰 **Cost:** Prevent million-dollar resubmission delays
- 🎯 **Confidence:** Source traceability reduces hallucination risk

### Market Context

- 📈 800+ FDA submissions with AI components since 2016
- 📋 FDA's January 2025 draft creates AI credibility requirements
- ⏱️ 2-6 month resubmission cycles for major deficiencies
- 💵 Billions spent annually on regulatory preparation

**Our Position:** We help companies submit cleaner evidence packages the first time.

---

## Limitations & Scope

### What This MVP Does

✅ Evidence integrity verification (contradictions, inconsistencies)  
✅ Document cross-referencing with source quotes  
✅ FDA 2025 AI guidance checklist mapping  
✅ Deterministic rule checking (arithmetic, versions)  

### What This MVP Does NOT Do

❌ Predict FDA approval probability  
❌ Certify regulatory compliance  
❌ Replace scientific or regulatory review  
❌ Process full eCTD submissions  
❌ Provide regulatory strategy recommendations  

**Clear positioning:** This is a preliminary evidence-integrity audit tool, not an FDA approval predictor or compliance certification system.

---

## Next Steps (Post-Hackathon)

### Phase 1: Production Readiness (Weeks 1-4)
- Test with real biotech documents
- Expand format support (Word, Excel)
- Add more verification rules
- Improve AI prompt engineering

### Phase 2: Regulatory Expansion (Months 2-3)
- Map full 21 CFR §312.23 requirements
- Support IND, NDA, BLA types
- Add ICH guidelines
- Build FDA precedent database

### Phase 3: Advanced Features (Months 4-6)
- Multi-document relationship mapping
- Timeline consistency checking
- Protocol deviation detection

### Phase 4: Enterprise Scale (Months 7+)
- On-premise deployment
- DMS integration (Veeva, Egnyte)
- SOC 2 / HIPAA compliance

---

## Team

**GitAndCommit**
- Tech Lead (CS) — Backend, AI integration, deployment
- Mech Eng + CS — Frontend, UX design
- Applied Math — Verification logic, scientific validation, FDA research

---

## Acknowledgments

Built with:
- Google Gemini 2.0 Flash API
- FDA January 2025 Draft AI Credibility Guidance (nonbinding)
- Supabase authentication
- React, FastAPI, PyMuPDF, Tailwind CSS

Special thanks to Hackachusetts organizers and MIT The Engine community.

---

## Documentation

- 📄 **[PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md)** - Complete technical documentation
- 🎯 **[VISION_AND_REALITY.md](./VISION_AND_REALITY.md)** - Strategic vision and positioning guidance
- 🔬 **[Research Context](./research_data/research/RESEARCH_AND_REGULATORY_CONTEXT.md)** - FDA guidance analysis

---

## License & Disclaimer

This is a hackathon proof-of-concept. It does not provide regulatory advice, predict FDA outcomes, or certify compliance. FDA draft guidance referenced is nonbinding. Consult qualified regulatory professionals for actual submissions.

---

*Built at Hackachusetts 2026 | October 24, 2026 | Boston, MA*
1. Clone and initialize the repository
git clone https://github.com/YOUR-ORG/regulens-ai.git
cd regulens-ai
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install tailwindcss @tailwindcss/vite
cd ..
mkdir backend
If your team already committed a frontend/backend scaffold, skip project creation and only install dependencies. Configure the Tailwind Vite plugin in frontend/vite.config.js and import Tailwind in your main CSS per the current official docs.
2. Create the Python backend
cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install fastapi uvicorn python-multipart pymupdf pydantic python-dotenv google-genai
pip freeze > requirements.txt
If py -3.11 isn't installed, use python -m venv .venv with a compatible version. On macOS/Linux use python3 -m venv .venv and source .venv/bin/activate.

Create backend/main.py with a minimal running API:
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pymupdf

app = FastAPI(title="BioLyze AI")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_methods=["*"], allow_headers=["*"])

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/analyze")
async def analyze(files: list[UploadFile] = File(...)):
    extracted = []
    for uploaded in files:
        content = await uploaded.read()
        name = uploaded.filename or "unnamed"
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(413, f"File too large: {name}")
        if name.lower().endswith(".pdf"):
            try:
                with pymupdf.open(stream=content, filetype="pdf") as doc:
                    pages = [{"page": i + 1, "text": page.get_text()} for i, page in enumerate(doc)]
            except Exception:
                raise HTTPException(400, f"Unreadable PDF: {name}")
        elif name.lower().endswith(".txt"):
            pages = [{"page": 1, "text": content.decode("utf-8", errors="replace")}]
        else:
            raise HTTPException(400, f"Unsupported file type: {name}")
        extracted.append({"filename": name, "pages": pages})
    return {"status": "extracted_only", "documents": extracted, "findings": []}
This is a working extraction-only scaffold. The AI analysis and verification still need to be implemented in agents.py and verifier.py.
3. Configure secrets
Create backend/.env using .env.example:
GEMINI_API_KEY=replace-with-your-key
Keep the API key server-side. Load it with python-dotenv in your backend; pass it to the Gemini SDK. Make the model configurable in an env variable rather than hardcoding an assumed available model.
4. Start both services in separate terminals
Terminal A — backend
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000
Check http://localhost:8000/health and http://localhost:8000/docs.

Terminal B — frontend
cd frontend
npm run dev
Open http://localhost:5173.
5. Connect frontend upload to API
Use FormData to send PDFs or TXT files with the key files:
const form = new FormData();
for (const file of selectedFiles) form.append('files', file);
const response = await fetch('http://localhost:8000/analyze', {
  method: 'POST',
  body: form,
});
if (!response.ok) throw new Error('Analysis failed');
const result = await response.json();
Do not set Content-Type manually for a FormData request. Display result.documents first; replace the extraction-only response with the findings schema below when analysis is implemented.
Findings contract (freeze this before parallel coding)
After analysis is implemented, return:
{
  "status": "completed",
  "documents_analyzed": 3,
  "findings": [
    {
      "id": "ISSUE-001",
      "type": "metric_mismatch",
      "severity": "high",
      "title": "Model sensitivity differs between documents",
      "explanation": "Validation report: 0.91; scientific summary: 0.81, for what appears to be the same evaluation.",
      "sources": [
        {"filename": "summary.pdf", "page": 2, "quote": "Sensitivity was 0.81."},
        {"filename": "validation.pdf", "page": 4, "quote": "Sensitivity: 0.91."}
      ],
      "guidance_reference": null,
      "action": "Confirm evaluation cohort and correct or explain the discrepancy.",
      "review_required": true
    }
  ]
}
All example values above are fictional. Do not output a source quote or page that cannot be verified in parsed text. Severity is a triage label, not a regulatory risk determination.
First three checks to build
1. Numeric contradiction: same named metric, model version, dataset/cohort and evaluation context reported with different values. Don't compare unlike cohorts or methodologies blindly.
2. Unsupported claim: scientific summary contains a material performance claim but no matching validation evidence within the uploaded package. Classify as needs_review unless linkage is clear.
3. Missing credibility documentation: identify missing or unclear model context of use, validation approach, limitations or intended role based on selected, versioned elements of FDA draft guidance. Label draft recommendations as such, not legal requirements.
Avoid generating FDA approval probabilities, certification badges, or definitive clinical safety decisions.
Test cases and measurements
Create two fictional packages:
- samples/flawed/: seed 6–10 known defects, e.g., inconsistent model sensitivity, undocumented context of use, unsupported results claim, missing limitations.
- samples/corrected/: fix those defects, holding other content constant.
Keep a private-to-the-evaluator samples/ground_truth.json of defect IDs and the intended source spans. Count true positives, false positives, and missed defects against that file. Show an illustrative detection rate only if you actually measure it; never invent metrics.
Three-person team: ownership and parallel work
Member	Ownership	Files	First deliverable
Tech lead (CS)	Backend architecture, FastAPI endpoint, PDF parsing, agent integration, merge/deploy	backend/main.py, backend/extractor.py, backend/agents.py, backend/schemas.py, backend/requirements.txt	POST /analyze parses 2–3 PDFs/TXT; then returns real analysis using the agreed schema
Mechanical engineering + CS	React app, upload UX, findings dashboard, source evidence display, wiring frontend to API	frontend/ only	Upload flow and findings cards rendering mocked API JSON by hour 2
Applied mathematics (CS basics)	Synthetic scientific datasets, failure cases, rule definitions, deterministic verification with a small Python implementation, test ground truth	samples/, tests/, backend/verifier.py, backend/guidance/	Flawed and corrected document packages, ground-truth defect list and 2 working verification checks


Why this division: The tech lead owns the critical integration path. The teammate with some CS experience owns a self-contained frontend. The applied-math teammate owns the domain logic and numerical consistency tests; these can begin as data and pseudocode before implementing simple Python functions. If frontend development is new to the mechanical engineering + CS teammate, the tech lead should supply a working Vite scaffold and mocked JSON immediately.
Freeze the contract at kickoff
- Backend endpoint: POST /analyze with multipart form field files (2–3 PDFs or TXT documents).
- Backend response: status, documents_analyzed, and findings following the example above. During scaffolding, status: extracted_only with documents is acceptable, but mocked and production findings must share the finalized findings structure.
- For each finding: id, type, severity, title, explanation, sources (filename/page/quote), guidance_reference (or null), action, review_required.
- Verifier function: verify(claims: list[dict]) -> list[dict] in backend/verifier.py; start with simple dictionaries, then align with Pydantic schemas during integration.
- Only quote actual text in uploaded files; if evidence is uncertain, mark needs_review.
Branches and handoffs
1. Tech lead creates main and a minimal scaffold; commits README.md, .gitignore, endpoint contract, and a mock findings JSON at samples/mock_response.json.
2. Each person works on a separate branch: feature/backend-ai, feature/frontend, feature/validation-data.
3. Teammates do not edit each other's owned files without coordinating first. All feature branches merge through the tech lead.
4. Every 60–90 minutes, share a short status: works / blocked / next. First integration by hour 4, no feature additions in the final hour.
5. Use only synthetic fictional data; keep .env secrets out of Git.
Exact acceptance criteria
- Tech lead: /health works, /analyze accepts files, source/page info survives extraction, verifier is called, AI failures become readable errors or trigger a documented deterministic fallback.
- Mech Eng + CS: 2–3 files can be selected, upload/loading/error states work, findings are grouped by severity, citations display source filenames and pages, corrected-case results render without code changes.
- Applied math: at least 6 seeded defects documented with expected outcomes, 2 high-confidence numeric/metadata rules tested, no comparisons between unlike evaluation contexts, and flawed/corrected cases produce different, explainable findings.
Seven-hour critical path
- H0–H1: Create repo, start frontend/backend, agree on findings JSON, write flawed and corrected sample documents.
- H1–H2: PDF text extraction + initial UI upload.
- H2–H3: LLM structured claim extraction; ensure model output validates with Pydantic.
- H3–H4: Deterministic mismatches and missing-evidence checks.
- H4–H5: Frontend integration and finding source quotes.
- H5–H6: Test both sample packages; harden error states and LLM fallback.
- H6–H7: Record demo, refine pitch, deploy only if reliable, submit.
Hard cutoff: If the LLM isn't reliably returning structured claims by hour 3, use deterministic extraction from your clearly formatted synthetic samples. Preserve a live, reproducible demo.
Demo script (90 seconds)
1. “AI is accelerating drug development, but evidence packages still need integrity checks.”
2. Upload synthetic scientific summary + validation report + results table.
3. Show a mismatch with both documents and page-level quotes.
4. Show an unsupported-claim warning and a missing-credibility-documentation warning.
5. Replace flawed package with corrected documents. Re-run. Compare findings.
6. “BioLyze helps scientists spot evidence gaps earlier. It does not replace regulatory or scientific review.”
Sources and cautions
- FDA draft guidance (January 2025): https://www.fda.gov/regulatory-information/search-fda-guidance-documents/considerations-use-artificial-intelligence-support-regulatory-decision-making-drug-and-biological
- FDA eCTD background: https://www.fda.gov/drugs/electronic-regulatory-submission-and-review/electronic-common-technical-document-ectd
- PyMuPDF docs: https://pymupdf.readthedocs.io/en/latest/
The cited FDA draft guidance describes a risk-based AI credibility framework and nonbinding recommendations. BioLyze checks a selected subset of documentation considerations in this hackathon prototype; it does not check all FDA filing requirements, perform clinical validation, or predict regulatory outcomes.
