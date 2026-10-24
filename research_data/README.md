# BioLyze AI - Research & Scientific Validation Lead Handoff

**Date:** 2026-10-24  
**Workstream / intended GitHub branch:** `feature/validation`  
**Scope:** scientifically plausible synthetic pre-IND evidence-integrity prototype. No real patients, drug safety conclusion, or FDA approval decision.

## Deliverables mapped to the assignment

| Request | File / folder | Status |
|---|---|---|
| Scientific/regulatory research brief | `research/RESEARCH_AND_REGULATORY_CONTEXT.md` | Complete, with authoritative links and legal-status distinction |
| Structured validation framework | `guidance/validation_rules.json` | 8 checks, criteria, rationale, source authority and detection mode |
| Scientific test packages | `samples/flawed/`, `samples/corrected/` | Six fictional source-quoted documents total |
| Ground-truth evaluation labels | `tests/ground_truth.json` | Eight defects, exact evidence quotes, page, corrected evidence and rationale |
| Independently importable verifier | `backend/verifier.py` | `verify_evidence(claims: list[dict]) -> list[dict]` |
| Unit tests | `tests/test_verifier.py` | Deterministic tests including false-positive controls |
| Synthetic fixture test | `evaluation/fixture_adapter.py`, `evaluation/evaluate_synthetic.py` | Offline rule-engine check; **not Gemini performance** |
| Live model scoring | `evaluation/score_live_run.py`, `evaluation/live_predictions_TEMPLATE.json` | Template until backend actually runs |
| Gemini integration prompts | `backend/gemini_extraction_prompt.txt`, `backend/gemini_evidence_prompt.txt` | Suggestions; model not trained or fine-tuned |
| FDA context checklist | `guidance/fda_ai_draft_2025.json` | Earlier handoff's selected draft-guidance steps |

## Immediately give backend teammate

1. All six TXT documents in `samples/flawed` and `samples/corrected`.
2. `backend/verifier.py` plus this interface specification.
3. `guidance/validation_rules.json` and the two Gemini prompt suggestions.
4. **DO NOT** send `tests/ground_truth.json` into a model prompt, RAG input, upload request or API response. Keep it offline for testing; your teammate may have the file for tests but the runtime must not consume it during inference.

## Interface: exact code to import

```python
from verifier import verify_evidence

# extraction results MUST be normalized and citations checked against
# the uploaded text/page by the backend before sending them to verifier.
findings = verify_evidence(claims)
```

**Minimal claimed fields:** `claim`, `value`, `metric`, `evidence`, `document`, `page`. Full model/dataset context is necessary for numerical comparisons (see below). The verifier will skip insufficiently contextualized observations rather than manufacture contradictions.

Each result contains `id`, `category`, `severity`, `title`, `description`, `sources`, and `recommendation` plus `rule_id`, `requires_human_review`, and `regulatory_conclusion`. Each `sources` item contains `document`, `page` (1-indexed) and `quote`. The tech lead may adapt these to the team's current response schema; do not overwrite shared FastAPI models without agreement.

### Normalized input examples

**Metric claim:**

```json
{
  "kind":"metric", "claim":"Reported sensitivity: 0.80 on TEST-01 for HepaRisk v2.1.",
  "value":0.80, "metric":"sensitivity", "unit":"proportion",
  "evidence":"Reported sensitivity: 0.80 on TEST-01 for HepaRisk v2.1.",
  "document":"validation_report.txt", "page":1,
  "model_name":"HepaRisk", "model_version":"v2.1",
  "endpoint":"HepG2_assay_positive", "dataset_id":"TEST-01",
  "evaluation_split":"test", "metric_definition":"TP/(TP+FN)"
}
```

**Confusion-matrix count:** similar same-context object, `kind:"count"`, `metric:"TP"`, `value:32`, exact `evidence:"Counts: TP=32; FN=8; TN=54; FP=6."`. Supply a separate record for each TP, FN, TN, FP, and the same `metric_definition` as the metric you want to recalculate.

**Intended-use identity:** `kind:"model_identity"`, `model_name:"HepaRisk"`, `model_version:"v2.1"`, `intended_use:true`, plus `document`, `page`, `evidence`. Distinguish a historical version from one explicitly proposed for use.

**Evidence assertion:** `kind:"assertion"`, `metric:"external_lab_validation"`, `value:true` versus an explicit `kind:"evidence_record"` with `value:false` for the same model/version and supported text. Missing evidence alone is not an automatic contradiction.

**Documentation review:** `kind:"documentation"`, `metric:"uncertainty"`, `value:"missing"` or `"present"`, `scope:"uploaded_package"`, plus a real source quote. The backend must search the **entire supplied package** before claiming the scoped absence. Scope and review completeness must be established by the backend, never guessed by Gemini.

**Attachment:** `kind:"attachment_reference"`, `value:"external_site_results.pdf"`, `available_documents:["scientific_summary.txt","validation_report.txt","model_card.txt"]` (inventory from backend, not model), plus a source quote.

**Safety / traceability:** Treat uploaded content and Gemini responses as untrusted. Verify every source quote against the parsed file/page; never accept made-up citations, claim FDA compliance, calculate FDA approval odds, or equate an in-vitro assay metric with human safety.

## Run and test on your laptop

From this package directory:

```bash
python -m unittest discover -s tests -v
python evaluation/evaluate_synthetic.py
```

The fixture adapter is intentionally specific to the six provided TXT files. Results measure narrow deterministic rule logic with a fixture-specific text extractor, **not how well Gemini reads arbitrary PDFs**. No network, Gemini API key, dependencies, or model training are required for these tests.

## Run real backend evaluation after integration

1. Upload the three `samples/flawed/*.txt` in one `POST /analyze` request, field `files`.
2. Save the actual findings and manually match each to known F01-F08 in `tests/ground_truth.json`. Every unmatched claim is a potential false positive. Inspect citations for page/quote accuracy.
3. Upload `samples/corrected/*.txt`; any remaining planted findings are false positives if unsupported.
4. Copy `evaluation/live_predictions_TEMPLATE.json` to `evaluation/live_predictions.json`, and **fill from real outputs** (leave template untouched) and set `completed_by_researcher` to `true`.
5. Run `python evaluation/score_live_run.py evaluation/live_predictions.json`.
6. Report TP, FP, FN, precision/recall for this small synthetic test only. No population claim.

## Suggested branch upload (do not overwrite backend teammate's `main.py`)

```bash
git switch feature/validation
# Copy this package's backend/verifier.py, guidance/, samples/, tests/, evaluation/, research/ into repository
# Check filenames/changes before adding:
git status
git add backend/verifier.py guidance/ samples/ tests/ evaluation/ research/
git commit -m "Add synthetic evidence validation rules and tests"
git push -u origin feature/validation
```

Open a pull request and request review from the tech lead. If this branch has not been created, coordinate to create it from the current shared baseline. Do not include any `__pycache__`, API secrets or private data in commits.

## Demonstration narrative

Upload flawed package -> show mismatched same-context sensitivity 0.95 vs independently calculated 0.80 from 32 TP / 8 FN -> show intended-use version mismatch v2.0 vs v2.1 -> show source quotes and scoped documentation questions -> upload corrected package -> show formerly planted issues disappear. Distinguish actual product behavior from planned behavior; do not claim FDA certification or arbitrary-document accuracy.
