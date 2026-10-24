# BioLyze AI: Automated Regulatory Evidence Review

**Hackathon:** Hackachusetts 2026 @ MIT The Engine  
**Category:** Healthcare / Biotech  
**Team:** GitAndCommit  
**Project Duration:** 7 hours

---

## The Problem

### The Drug Development Challenge

Developing a new biopharmaceutical product can take **10 to 15 years** and cost **billions of dollars**. While AI is increasingly accelerating drug discovery and development, validating scientific evidence and preparing regulatory submissions remain complex and time-consuming bottlenecks.

### The Regulatory Burden

Before a new drug can receive FDA approval, biotechnology companies must provide extensive scientific evidence demonstrating:
- Safety profiles
- Clinical effectiveness
- Manufacturing quality
- AI model validation (for AI-generated evidence)

### Current Pain Points

Regulatory teams face significant challenges:
- **Manual review burden:** Large volumes of documentation require substantial human effort
- **Evidence verification:** Supporting citations and data must be traced across multiple documents
- **Inconsistency detection:** Contradictory metrics or claims can appear across different reports
- **AI validation complexity:** FDA's 2025 draft guidance requires specific AI credibility evidence
- **Costly delays:** Unresolved deficiencies trigger resubmission cycles (2-6 months each)
- **High failure risk:** More than 800 FDA submissions have included AI components since 2016, creating new regulatory complexity

**The core problem:** Companies spend months preparing submissions, only to face rejections for preventable deficiencies like contradictory performance metrics, missing validation evidence, or unsupported claims.

---

## Our Solution: BioLyze AI

### What We Built

An **AI-powered pre-submission evidence integrity review system** that helps biotechnology companies:

1. **Check submission quality** before sending to the FDA
2. **Identify potential deficiencies** that would trigger rejection
3. **Verify evidence consistency** across multiple documents
4. **Get actionable feedback** with source-level references
5. **Improve acceptance probability** by catching errors early

### Our Vision

Help regulatory teams review evidence faster, improve documentation quality, and prepare more reliable FDA submissions—**so companies don't spend years going through the regulation process repetitively**.

### How It Works

```
Upload Documents → AI Extraction → Evidence Verification → Findings Report
     ↓                   ↓                    ↓                    ↓
Scientific PDFs    Gemini AI extracts   Deterministic checks   Dashboard with
Validation reports  structured claims    find contradictions    source quotes
Model cards         & metrics            & missing evidence     & recommendations
```

**Key Innovation:** Unlike generic document review tools, BioLyze:
- **Traces every finding to source text** (document, page, quote) to prevent AI hallucinations
- **Performs domain-specific checks** like confusion matrix arithmetic verification
- **Maps to FDA's 2025 AI credibility guidance** for regulatory alignment
- **Provides before/after comparison** to show evidence quality improvement

---

## Project Architecture

### Repository Structure

```
Hackachusetts-TeamGitAndCommit-1/
├── backend/              # FastAPI + AI extraction + verification
├── frontend/             # React UI + findings dashboard
├── research_data/        # Scientific validation framework
│   ├── backend/         # Verification engine
│   ├── samples/         # Synthetic test documents
│   ├── guidance/        # FDA requirements mapping
│   ├── evaluation/      # Testing & scoring
│   └── research/        # Regulatory context
└── README.md            # Project overview
```

### Three Parallel Workstreams

Our team worked in parallel on three integrated components:

| Workstream | Owner | Branch | Deliverables |
|------------|-------|--------|--------------|
| **Backend API** | Tech Lead | `feature/backend-ai` | FastAPI server, PDF extraction, Gemini integration |
| **Frontend UI** | Mech Eng + CS | `feature/frontend` | React dashboard, upload flow, findings display |
| **Validation Engine** | Applied Math | `feature/validation` | Scientific verifier, test cases, FDA mapping |

---

## Component Details

### 1. Backend (`/backend`)

**Technology Stack:**
- FastAPI (Python web framework)
- PyMuPDF (PDF text extraction)
- Google Gemini 2.0 Flash (AI claim extraction)
- Supabase (authentication & storage)

**Key Files:**
- `main.py` — API endpoints (`/health`, `/analyze`, `/runs`, `/reviews`)
- `extractor.py` — PDF parsing with page/source tracking
- `agents.py` — Gemini AI structured claim extraction
- `pipeline.py` — Analysis orchestration
- `auth.py` — Supabase authentication
- `runs.py` — Analysis run management
- `reviews.py` — Finding review workflow

**Core Functionality:**

```python
# Evidence Verification Pipeline
1. Upload 2-3 PDF documents (scientific summary, validation report, model card)
2. Extract text with page references using PyMuPDF
3. Use Gemini to extract structured claims:
   - Performance metrics (sensitivity, specificity, accuracy)
   - Model versions and intended use
   - Validation study details
   - Supporting evidence quotes
4. Run deterministic verification checks
5. Return findings with source traceability
```

**API Endpoints:**

```
POST /analyze              # Upload documents, get analysis
GET  /runs/{id}           # Retrieve analysis run status
POST /runs                # Create new analysis run
GET  /runs                # List user's analysis history
POST /reviews             # Save finding review
GET  /health              # Health check
```

**Integration Points:**
- **Gemini AI:** Structured JSON extraction with specific schema enforcement
- **Supabase:** User authentication and run persistence
- **Frontend CORS:** Configured for `localhost:5173`

---

### 2. Frontend (`/frontend`)

**Technology Stack:**
- React 19.2.3
- Vite 7.3.0 (build tool)
- Tailwind CSS 4.1.0 (styling)
- PDF.js 6.4.299 (PDF preview)
- Supabase client (authentication)

**Key Files:**
- `Workspace.jsx` — Main upload and analysis interface
- `ReviewWorkspace.jsx` — Findings review and evidence inspection
- `components.jsx` — Reusable UI components (FindingCard, severity indicators)
- `api.js` — Backend integration and mock mode
- `services/runs.js` — Analysis run API client
- `services/pdf.js` — PDF handling utilities
- `mocks/` — Demo data for offline testing

**User Experience Flow:**

```
1. Landing Page
   ├─ Drag & drop PDF upload (2-3 documents)
   ├─ File validation (PDF only, <10MB each)
   └─ Demo mode toggle (flawed vs corrected packages)

2. Analysis Progress
   ├─ Real-time status updates
   ├─ Document processing indicators
   └─ Error handling with retry

3. Findings Dashboard
   ├─ Summary statistics (total findings, by severity)
   ├─ Severity grouping (High → Medium → Low)
   ├─ Finding cards with:
   │   ├─ Issue title and description
   │   ├─ Source quotes (document, page, exact text)
   │   └─ Actionable recommendations
   ├─ Review workflow (mark as reviewed, add notes)
   └─ Comparison view (before/after correction)

4. Evidence Inspector
   ├─ Click any source quote to open full context
   ├─ PDF preview with page highlighting
   └─ Cross-document reference validation
```

**Demo Mode:**
- Works offline without backend
- Pre-loaded synthetic findings
- Demonstrates flawed vs corrected package comparison
- Simulates processing states

---

### 3. Research & Validation (`/research_data`)

**Purpose:** Scientific validation framework, test cases, and FDA regulatory mapping

#### 3.1 Verification Engine (`backend/verifier.py`)

**Core Logic:** Source-grounded, conservative scientific evidence verification

**Eight Verification Rules:**

| Rule ID | Category | Check | Example Finding |
|---------|----------|-------|-----------------|
| **R04** | Metric Mismatch | Same model/dataset/split reports different performance values | "Sensitivity: 0.95 in summary but 0.80 in validation report for HepaRisk v2.1 TEST-01" |
| **R03** | Version Conflict | Documents identify different intended-use model versions | "Model card: HepaRisk v2.0, validation report: v2.1" |
| **R06** | Unsupported Claim | External validation claimed but evidence shows internal-only testing | "Claims external lab validation but all studies from Lab-A" |
| **R09** | Missing Acceptance Criteria | No predefined performance thresholds documented | "Prespecified evaluation protocol not located" |
| **R10** | Missing Uncertainty | No confidence intervals or uncertainty estimates | "Performance uncertainty documentation not found" |
| **R11** | Missing Limitations | No discussion of model limitations or bias | "Applicability boundaries not documented" |
| **R08** | Missing Risk Discussion | No context-of-use risk analysis | "Model influence and error consequences not discussed" |
| **R12** | Missing Attachment | Referenced document not included in upload | "Cites external_results.pdf but file not provided" |

**Key Features:**
- **Context-aware comparison:** Only flags contradictions for same model/version/dataset/evaluation split
- **Arithmetic verification:** Recalculates sensitivity/specificity from confusion matrices
- **Conservative approach:** Skips insufficiently contextualized claims rather than false flagging
- **Source traceability:** Every finding includes document, page, exact quote
- **FDA alignment:** Checks against 2025 draft AI credibility guidance

**Input Schema:**
```python
{
  "kind": "metric",
  "claim": "Reported sensitivity: 0.80 on TEST-01",
  "value": 0.80,
  "metric": "sensitivity",
  "evidence": "Exact supporting text from document",
  "document": "validation_report.txt",
  "page": 1,
  "model_name": "HepaRisk",
  "model_version": "v2.1",
  "endpoint": "HepG2_assay_positive",
  "dataset_id": "TEST-01",
  "evaluation_split": "test",
  "metric_definition": "TP/(TP+FN)"
}
```

#### 3.2 Synthetic Test Cases (`samples/`)

**Flawed Package** (`samples/flawed/`):
- 3 documents with 6-10 planted defects
- Fictional sponsor: AsterBio, drug: AB-101, model: HepaRisk v2.1
- Seeded errors:
  - Sensitivity reported as 0.95 in summary but arithmetic from confusion matrix = 0.80
  - Model version v2.0 vs v2.1 mismatch
  - Missing uncertainty estimates
  - Undocumented acceptance criteria

**Corrected Package** (`samples/corrected/`):
- Same 3 documents with all defects fixed
- Demonstrates that findings disappear when evidence is consistent

**Ground Truth** (`tests/ground_truth.json`):
- 8 labeled defects with expected detection
- Exact source quotes and page numbers
- Evaluation baseline for precision/recall measurement

#### 3.3 FDA Guidance Mapping (`guidance/`)

**`fda_ai_draft_2025.json`:**
- Selected documentation considerations from FDA's January 2025 draft
- 7-step AI credibility assessment framework
- Nonbinding recommendations (clearly labeled as draft)

**`validation_rules.json`:**
- 8 structured rules with:
  - Criteria (what to check)
  - Rationale (why it matters)
  - Source authority (FDA section reference)
  - Detection mode (deterministic vs. AI-assisted)

#### 3.4 Evaluation Framework (`evaluation/`)

**Offline Testing** (`evaluate_synthetic.py`):
- Tests verification logic against fixture adapter
- No API calls or Gemini required
- Measures rule engine precision/recall

**Live Scoring** (`score_live_run.py`):
- Compares real backend output to ground truth
- Calculates TP, FP, FN for each planted defect
- Requires manual finding-to-ground-truth mapping

**Results** (`synthetic_results.json`):
- Baseline verification performance on known test cases

#### 3.5 Regulatory Research (`research/`)

**`RESEARCH_AND_REGULATORY_CONTEXT.md`:**
- FDA 2025 draft AI credibility guidance analysis
- 21 CFR §312.23 IND requirements context
- eCTD submission standards
- Legal status distinctions (binding vs. nonbinding)
- Scope and limitations documentation

---

## Technical Integration

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. UPLOAD PHASE (Frontend)                                  │
├─────────────────────────────────────────────────────────────┤
│ User selects 2-3 PDF files                                  │
│ → Frontend validates file types and sizes                   │
│ → FormData sent to POST /analyze                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. EXTRACTION PHASE (Backend: extractor.py)                 │
├─────────────────────────────────────────────────────────────┤
│ PyMuPDF opens each PDF                                      │
│ → Extract text from each page                               │
│ → Preserve page numbers and document names                  │
│ → Return: [{document, page, text, document_id}, ...]        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. AI EXTRACTION PHASE (Backend: agents.py)                 │
├─────────────────────────────────────────────────────────────┤
│ For each page:                                              │
│   → Send text to Gemini 2.0 Flash                           │
│   → Request structured JSON (claim, value, metric, evidence)│
│   → Attach source metadata (document, page)                 │
│ → Return: normalized claims list                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. VERIFICATION PHASE (Backend: verifier.py)                │
├─────────────────────────────────────────────────────────────┤
│ Group claims by context (model/version/dataset/split)       │
│ → Check metric contradictions                               │
│ → Recalculate confusion matrix arithmetic                   │
│ → Detect version mismatches                                 │
│ → Flag missing documentation                                │
│ → Validate attachment references                            │
│ → Return: findings with source traceability                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. RESPONSE PHASE (Backend: pipeline.py)                    │
├─────────────────────────────────────────────────────────────┤
│ Merge claims and findings                                   │
│ → Format response with:                                     │
│   - status: "completed"                                     │
│   - documents_analyzed count                                │
│   - findings array (id, severity, title, sources, etc.)     │
│ → Return JSON to frontend                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. DISPLAY PHASE (Frontend: Workspace.jsx)                  │
├─────────────────────────────────────────────────────────────┤
│ Parse findings response                                     │
│ → Group by severity (high/medium/low)                       │
│ → Render FindingCard components                             │
│ → Display source quotes with document/page refs             │
│ → Enable review workflow (status, notes)                    │
│ → Show comparison with previous runs                        │
└─────────────────────────────────────────────────────────────┘
```

### Key Integration Points

**Backend → Verifier:**
```python
# pipeline.py
from verifier import verify_evidence
from agents import extract_claims

def run_analysis(extracted_pages):
    claims = extract_claims(extracted_pages)  # Gemini AI
    findings = verify_evidence(claims)        # Deterministic rules
    return {"claims": claims, "findings": findings}
```

**Frontend → Backend:**
```javascript
// api.js
const form = new FormData();
files.forEach(file => form.append('files', file));

const response = await fetch('http://localhost:8000/analyze', {
  method: 'POST',
  body: form
});

const result = await response.json();
// result.findings → render in dashboard
```

**Verifier → FDA Guidance:**
```python
# verifier.py maps to guidance/fda_ai_draft_2025.json
DOC_TOPICS = {
    'acceptance_criteria': ('R09', 'Section IV.A.4 consideration'),
    'uncertainty': ('R10', 'Section IV.A.4.a.iii consideration'),
    'limitations_bias': ('R11', 'Section IV.A.4.b consideration'),
}
```

---

## Demo Scenario

### The Story

**Investigational Drug:** AB-101 (small molecule)  
**AI Model:** HepaRisk v2.1 (binary HepG2 assay predictor)  
**Intended Use:** Prioritize compounds for additional laboratory experiments

### Test Case: Flawed Package

**Documents:**
1. `scientific_summary.txt` — Claims sensitivity 0.95
2. `validation_report.txt` — Reports confusion matrix: TP=32, FN=8, TN=54, FP=6
3. `model_card.txt` — Lists model as v2.0

**Planted Defects:**
- Arithmetic mismatch: 32/(32+8) = 0.80, not 0.95
- Version conflict: v2.0 vs v2.1
- Missing uncertainty estimates
- No predefined acceptance criteria

### Demo Flow

```
1. Upload flawed package (3 PDFs)
   ↓
2. System analyzes and flags:
   ✗ HIGH: Conflicting sensitivity (0.95 vs calculated 0.80)
   ✗ HIGH: Model version mismatch (v2.0 vs v2.1)
   ✗ MEDIUM: Performance uncertainty not documented
   ✗ MEDIUM: Acceptance criteria not located
   
   Each finding shows:
   - Exact source quotes
   - Document names and page numbers
   - Actionable recommendation
   
3. Upload corrected package (same 3 PDFs, errors fixed)
   ↓
4. System shows:
   ✓ All previous findings resolved
   ✓ Consistent metrics across documents
   ✓ Clear model version identification
```

**Key Demonstration Points:**
- **Before/after comparison** proves the system detects real errors
- **Source traceability** shows every finding is grounded in actual text
- **Actionable feedback** gives specific next steps, not vague warnings

---

## Value Proposition

### For Biotechnology Companies

**Problem We Solve:**
- Manual evidence review takes weeks
- Contradictions slip through to FDA submission
- Resubmission cycles waste 2-6 months **each**
- Regulatory teams lack bandwidth for thorough pre-checks

**Our Impact:**
- **Speed:** Automated evidence checks in minutes vs. days
- **Quality:** Catch contradictions before FDA reviewers do
- **Cost:** Prevent million-dollar resubmission delays
- **Confidence:** Source-level traceability reduces hallucination risk

### Regulatory Context

**Market Validation:**
- 800+ FDA submissions with AI components since 2016 (and growing)
- FDA's January 2025 draft guidance creates explicit AI credibility requirements
- 2-6 month resubmission cycles for major deficiencies
- Billions spent annually on regulatory preparation

**Our Positioning:**
- We don't replace FDA review
- We don't certify compliance
- We don't predict approval probability definitively
- **We help companies submit cleaner evidence packages the first time**

---

## Technical Achievements

### What We Built in 7 Hours

✅ **Full-stack application:**
- FastAPI backend with PDF extraction
- React frontend with drag-and-drop upload
- Real-time analysis progress tracking
- Supabase authentication integration

✅ **AI Integration:**
- Gemini 2.0 Flash structured claim extraction
- Deterministic verification engine
- Source traceability to prevent hallucinations

✅ **Domain-Specific Intelligence:**
- Confusion matrix arithmetic verification
- Context-aware metric comparison (same model/version/dataset only)
- FDA 2025 AI guidance mapping

✅ **Scientific Validation:**
- 8 verification rules with regulatory rationale
- 6 synthetic test documents (flawed + corrected)
- Ground truth labels for 8 planted defects
- Unit tests and evaluation framework

✅ **Production-Ready Features:**
- Error handling and user feedback
- Demo mode for offline testing
- Analysis history tracking
- Review workflow with notes
- JSON report export

### What Makes This Different

**vs. Generic Document Review Tools:**
- Domain-specific checks (confusion matrix arithmetic, model version tracking)
- FDA regulatory guidance alignment
- Source-level traceability for every finding

**vs. "ChatGPT for Regulatory":**
- Deterministic verification prevents hallucinations
- Structured schema enforcement
- Reproducible arithmetic checks

**vs. Manual Review:**
- 100x faster evidence contradiction detection
- Exhaustive cross-document comparison
- Never misses arithmetic errors

---

## Limitations & Scope

### What This MVP Does NOT Do

❌ **Predict FDA approval probability** — Would require historical outcome data and regulatory expertise beyond this scope

❌ **Certify regulatory compliance** — FDA draft guidance is nonbinding; we flag considerations, not requirements

❌ **Replace scientific review** — Complex scientific validity requires domain experts

❌ **Handle all document types** — Currently limited to PDFs with specific evidence structures

❌ **Process full eCTD submissions** — Focused on AI validation evidence, not complete Module 2 summaries

### Known Constraints

- **Synthetic test case only** — Real-world documents may have different formats
- **English-only** — No multilingual support
- **PDF-dependent** — Cannot process data from databases or APIs directly
- **Context requirements** — Verification needs specific metadata fields (model version, dataset ID, etc.)
- **No training** — Uses off-the-shelf Gemini model, not fine-tuned for regulatory language

---

## Next Steps (Post-Hackathon)

### Phase 1: Production Readiness (Weeks 1-4)
- Test with real biotech company documents
- Expand document format support (Word, Excel)
- Add more verification rules (statistical significance, study design)
- Improve Gemini prompt engineering for edge cases

### Phase 2: Regulatory Expansion (Months 2-3)
- Map full 21 CFR §312.23 requirements
- Support IND, NDA, BLA submission types
- Add ICH guidelines (M4, E9, E19)
- Build precedent database from FDA action letters

### Phase 3: Advanced Features (Months 4-6)
- Multi-document relationship mapping
- Timeline consistency checking
- Protocol deviation detection
- Outcome probability modeling (with proper data partnerships)

### Phase 4: Enterprise Scale (Months 7+)
- On-premise deployment options
- Integration with document management systems (Veeva, Egnyte)
- Regulatory consultant partnerships
- SOC 2 compliance and HIPAA readiness

---

## Team & Acknowledgments

**Team GitAndCommit:**
- Tech Lead (CS) — Backend architecture, AI integration, deployment
- Mech Eng + CS — Frontend development, UX design
- Applied Math — Verification logic, scientific validation, FDA research

**Built With:**
- Google Gemini 2.0 Flash API
- FDA January 2025 Draft AI Credibility Guidance
- Supabase authentication and storage
- React, FastAPI, PyMuPDF, Tailwind CSS

**Special Thanks:**
- Hackachusetts organizers
- MIT The Engine community
- FDA for publishing draft guidance (nonbinding recommendations)

---

## Repository & Demo

**GitHub:** `Hackachusetts-TeamGitAndCommit-1`

**Branches:**
- `main` — Integrated production version
- `feature/backend-ai` — Backend development
- `feature/frontend` — React UI
- `feature/validation` — Verification engine and test cases

**Live Demo:**
- Frontend demo mode works offline with mock data
- Full integration requires Gemini API key in `backend/.env`

**Getting Started:**
```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install fastapi uvicorn python-multipart pymupdf pydantic python-dotenv google-genai
cp .env.example .env  # Add your GEMINI_API_KEY
uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

---

## Conclusion

BioLyze AI demonstrates how AI can help biotechnology companies prepare higher-quality regulatory submissions by automatically detecting evidence inconsistencies before FDA review.

In 7 hours, we built a working proof-of-concept that:
- Processes real PDF documents
- Uses state-of-the-art AI for claim extraction
- Applies domain-specific verification logic
- Provides source-traceable findings
- Shows measurable evidence quality improvement

**Our goal:** Help companies avoid repetitive, costly resubmission cycles by catching deficiencies early—saving months of delays and millions in costs.

**This is not a replacement for regulatory expertise.** It's a tool to help experts work faster and catch errors that would otherwise slip through manual review.

The drug development pipeline is slow enough. Let's not make it slower with preventable regulatory deficiencies.

---

*Built at Hackachusetts 2026 | October 24, 2026 | Boston, MA*
