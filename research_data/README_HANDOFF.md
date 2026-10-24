# ReguLens AI 

Prepared from the user-supplied October 24, 2026 `synthetic-research.md` specification. Everything in the cases is FICTIONAL. This is demonstration/test material, not clinical evidence or a regulatory application.

## What to send to backend engineer NOW

1. `samples/flawed/*.txt` and `samples/corrected/*.txt`: two 3-document packages.
2. `backend/guidance/fda_ai_draft_2025.json`: source-labeled, NONBINDING FDA draft guidance checklist (examples; not legal/compliance tests).
3. `backend/gemini_extraction_prompt.txt` and `backend/gemini_evidence_prompt.txt`: prompt suggestions (Gemini is already pretrained; no fine-tuning necessary).
4. `research_metrics.py`: checked arithmetic for sensitivity / specificity / accuracy.
5. `samples/ground_truth.json`: OFFLINE evaluation oracle. **Do NOT include this file in model prompts, uploads, RAG context, or API response.**

## API alignment

The team README specifies `POST /analyze` with multipart field `files` containing 2–3 PDF/TXT files, and a response including `status`, `documents_analyzed` and `findings[]`. The backend should return source-backed finding type, severity, title, explanation, sources, guidance_reference, action and review_required. Coordinate rather than changing shared schema.

## Intended evaluation

Upload all three `samples/flawed/*.txt` files together. Expect 8 seeded issues (F01–F08). The deterministic high-priority issues are sensitivity mismatch F01 and intended model-version mismatch F02. Then upload the three corrected files together. Expect none of the SAME seeded issues. There may still be contextual review notes; absence of seeded findings is never an FDA approval conclusion.

Separately, verify that the two different evaluation contexts TRAIN-01 and TEST-01 are never treated as a contradiction; verify all quotes exist on cited pages. If Gemini fails, the deterministic verifier should remain testable on normalized claims / sample text.

### Scoring actual system output

Open the actual ReguLens findings and map each distinct, correct finding to F01–F08. Count any invented, unsupported extra issues under `other_false_positive_count`. In `evaluation/predictions_TO_FILL.json`, manually enter the observed IDs and citation counts; save as `evaluation/predictions.json`. Run:

```
python evaluation/score.py evaluation/predictions.json
```

The packaged predictions file is intentionally EMPTY and therefore not a performance claim. One generated flawed/corrected pair is a demonstration test, NOT a representative generalization benchmark. For any credible external accuracy estimate, create a larger, diverse, independently labeled holdout set not used for prompt construction/debugging.

## Regulatory boundaries

Use the FDA January 2025 AI credibility DRAFT (Sections IV.A.1–7) as context-specific nonbinding guidance. Applicable 21 CFR 312.23(a)(8) concerns IND pharmacology/toxicology submissions; our 3 files are explicitly a pre-IND toy package, not a complete IND/NDA/BLA/eCTD submission. Do not output approval probabilities, FDA certification, human toxicity conclusions, or complete IND deficiency classifications.

## User-facing 60-second demonstration

Upload flawed docs -> source-backed detected inconsistency -> show mathematical verification 32/(32+8)=0.80 vs report 0.95 -> upload corrected docs -> show contradiction resolved. Additional checklist findings are optional if working. Demonstrate only observed behavior.

## Update: new backend/verifier.py and tests/test_verifier.py

The version 2 handoff now includes `backend/verifier.py`, implementing
`verify(claims: list[dict]) -> list[dict]` with deterministic same-context
metric/count checks and explicit intended-use model-version comparisons.
Run tests from the root of the extracted handoff folder:

```
python -m unittest discover -s tests -v
```

The backend engineer must have Gemini produce normalized claim dictionaries
with kind = `metric`, `count`, and `model_identity` using the claim schema in
`synthetic-research.md`, including full endpoint, dataset ID, split, version,
original source quote and page, and mark proposed model identities with
`intended_use: true` or `role: intended_use`. Without these fields, the
verifier conservatively declines comparisons.

Before displaying citations in findings, the backend must independently match
(filename, page, quote) against the actual parsed documents; this module does
not receive source document text and therefore does not check quote existence.
Other missing-evidence checks (F03–F08) remain the Gemini/evidence-mapping
pipeline's responsibility. These ten unit tests are not a measured real-world
detection-accuracy estimate.
