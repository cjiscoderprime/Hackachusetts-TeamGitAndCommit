# ReguLens AI - Scientific Evidence Integrity Research Brief

**Date:** October 24, 2026  
**Project:** Hackachusetts 2026 / Healthcare & Biotech  
**Audience:** engineering teammate, demonstration judges, research reviewer  
**Status:** scoped research for a fictional pre-IND document-review prototype; not regulatory or legal advice.

## 1. Actual problem and why it matters

Sponsors using AI-produced scientific evidence in drug development need to demonstrate that results are credible for their **specified question and context of use**. Contradictory numbers, unlinked claims, and incomplete information about AI model training, evaluation, uncertainty, limitations, or version can undermine interpretation and force time-consuming manual review. The FDA describes fit-for-purpose, risk-proportionate credibility evidence for AI models whose outputs are intended to support regulatory decisions. A document-auditing prototype can systematically surface questions for qualified reviewers; it cannot decide whether a drug is safe or approvable.

**Source:** FDA, *Considerations for the Use of Artificial Intelligence to Support Regulatory Decision-Making for Drug and Biological Products*, **January 2025 draft guidance**, Sections II and IV.A, https://www.fda.gov/regulatory-information/search-fda-guidance-documents/considerations-use-artificial-intelligence-support-regulatory-decision-making-drug-and-biological . FDA's page still labels it **Draft Level 1 / not for implementation / contains non-binding recommendations** as checked October 24, 2026. The draft excludes merely operational AI uses that do not affect scientific reliability or regulatory safety/quality decisions.

## 2. Problem categories ReguLens can meaningfully check

| Problem | Consequence for reviewers | ReguLens check and source |
|---|---|---|
| Contradictory performance values | A result cannot be reproduced or trusted at face value | Recompute binary classification rates; compare identical model/version/endpoint/dataset/split/definition only; scientific arithmetic rule (no special FDA mandate) |
| Model-version discrepancies | Submitted evidence could refer to a different AI artifact | Compare *explicitly proposed-use* model versions; FDA draft IV.A.4.a.iii includes model/version tracking as credibility considerations |
| Unsupported external validation | Model may not have been tested in the population or laboratory claimed | Compare external validation assertions to explicit study origin; draft IV.A.4.b gives model evaluation considerations |
| No documented predefined acceptance criteria | Reviewer cannot determine whether observed results meet sponsor's planned credibility target | Scoped evidence review against draft IV.A.4 |
| Missing uncertainty estimates | Precision of performance estimates is unclear | Scoped review against draft IV.A.4.a.iii and IV.A.4.b |
| No description of limitations/bias | Uncertainty about population, data shift, reliability, and potential bias | Scoped review against draft IV.A.4.b |
| Missing context-of-use/risk rationale | Hard to judge impact of a model error on subsequent decisions | Draft IV.A.2–3 distinguish context of use, model influence, and decision consequence |
| Missing cited evidence | Reviewer cannot trace a key claim within files actually submitted for assessment | Match referenced filenames to uploaded-file inventory; audit traceability rather than claiming legal violation |

**Important:** A missing item in *three selected files* does not establish that the sponsor never performed that work. Findings should say "not found in the uploaded package" and request human review. No universal performance thresholds are introduced: even the synthetic 0.75 sensitivity and 0.85 specificity thresholds in the corrected document are **fictional sponsor-defined criteria**, not FDA requirements.

## 3. FDA regulatory boundary

**FDA January 2025 AI credibility draft (nonbinding):** Section IV.A proposes seven steps: question of interest; context of use; AI model risk; credibility assessment plan (including training/development and evaluation evidence); execute plan; document results/deviations; determine adequacy within context of use. Which evidence is appropriate depends on the model's intended use and risk. A document checker can ask whether selected kinds of evidence appear, but the final determination belongs to qualified scientists and regulatory authorities.

**21 CFR §312.23 (regulation, as applicable):** Section (a)(8) sets out pharmacology and toxicology information for INDs, including scope-dependent toxicology evidence, integrated summary and suitable tabulations for toxicology studies primarily supporting clinical safety, and where applicable GLP statements. See authoritative regulation: https://www.ecfr.gov/current/title-21/section-312.23 . The team's attached **October 22, 2026 snapshot** is the version used here. These requirements cannot be applied mechanically to a three-file fictional **pre-IND** test packet. This MVP does **not** determine §312.23 compliance, IND readiness, clinical safety, drug effectiveness, or approval likelihood.

**eCTD filing standard:** FDA's eCTD covers standardized application documents and technical submission requirements across INDs, NDAs, BLAs, and other application types; see https://www.fda.gov/drugs/electronic-regulatory-submission-and-review/electronic-common-technical-document-ectd . A plain PDF/TXT upload is not an eCTD submission and this MVP does not review all five CTD modules.

## 4. Scientific synthetic test case

**All names and data are fictional.** Sponsor AsterBio, investigational small-molecule AB-101, and its HepaRisk v2.1 model target a binary HepG2 assay endpoint. Proposed context: prioritize additional laboratory experiments, with scientists conducting independent confirmation. It is not a model of human liver injury, a clinical safety study or a dosing decision tool.

The held-out within-Lab-A TEST-01 contains **100 synthetic assay observations**: TP 32, FN 8, TN 54, FP 6. Hence sensitivity = 32/(32+8) = **0.80**, specificity = 54/(54+6) = **0.90**, accuracy = (32+54)/100 = **0.86**. A TRAIN-01 training-set sensitivity of **0.99** is a distinct evaluation context and must not be flagged for disagreeing with TEST-01. AUROC cannot be reconstructed from one confusion matrix. The two packets are in `samples/flawed/` and `samples/corrected/`; each contains a scientific summary, validation report, and model card. Defects are annotated in `tests/ground_truth.json`.

## 5. Scope, limitations, and interpretation of evaluation

- `backend/verifier.py` checks explicit metric/context conflicts, counts, proposed-use version conflicts, contradictions about external validation, narrowly defined document-evidence markers, and file references. It does **not** interpret arbitrary PDF content by itself.
- `evaluation/fixture_adapter.py` recognizes known phrases in the six synthetic TXT samples. It exists solely to smoke-test rule logic; it is **not** the Gemini extraction agent and must **not** be used as evidence of AI generalization.
- In the live pipeline, Gemini generates candidate structured claims, and the backend must check each quoted span against the actual uploaded text/page before accepting or showing it. The verifier trusts normalized claims supplied by that checked ingestion layer.
- Limited fixture detection is not a population-level estimate; arbitrary real submissions, other document layouts, ambiguous cases and model-generated citations remain untested.
- No FDA compliance certification, model approval probability, automatic regulatory deficiency decision, or real patient/toxicology conclusion is supported.

## 6. References, statuses verified October 24, 2026

1. FDA (2025), **DRAFT, nonbinding**, *Considerations for the Use of Artificial Intelligence to Support Regulatory Decision-Making for Drug and Biological Products*, IV.A.1–7. https://www.fda.gov/regulatory-information/search-fda-guidance-documents/considerations-use-artificial-intelligence-support-regulatory-decision-making-drug-and-biological
2. **Binding regulation where applicable:** 21 CFR §312.23(a)(8), user-provided October 22, 2026 snapshot. https://www.ecfr.gov/current/title-21/section-312.23
3. FDA, *Electronic Common Technical Document (eCTD)*, official submission context and technical standard. https://www.fda.gov/drugs/electronic-regulatory-submission-and-review/electronic-common-technical-document-ectd
