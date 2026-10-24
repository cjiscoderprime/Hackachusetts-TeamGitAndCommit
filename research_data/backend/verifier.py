"""Deterministic ReguLens verification of Gemini-extracted *candidate* claims.

Hackathon scope: same-context numeric contradictions, confusion-matrix
arithmetic, and explicitly intended-use model version inconsistencies.
No LLM, FDA approval prediction, or compliance determination occurs here.

Interface: verify(claims: list[dict]) -> list[dict]

IMPORTANT: before passing claims to this function, the backend must verify
that each (filename, page, quote) really occurs in parsed uploaded content.
Never expose unverified citations to users.
"""
from __future__ import annotations

from collections import defaultdict
from typing import Any


METRIC_NAMES = {"recall": "sensitivity", "tpr": "sensitivity",
                "true_positive_rate": "sensitivity", "sensitivity": "sensitivity",
                "specificity": "specificity", "tnr": "specificity",
                "accuracy": "accuracy", "precision": "precision"}
COUNT_NAMES = {"tp", "tn", "fp", "fn"}


def recompute_metrics(tp: int, fn: int, tn: int, fp: int) -> dict:
    """Return n and available rates; undefined denominators yield None."""
    values = (tp, fn, tn, fp)
    if any(type(v) is not int or v < 0 for v in values):
        raise ValueError("Confusion-matrix counts must be nonnegative integers")
    n = sum(values)
    return {"n": n,
            "sensitivity": tp / (tp + fn) if (tp + fn) else None,
            "specificity": tn / (tn + fp) if (tn + fp) else None,
            "accuracy": (tp + tn) / n if n else None,
            "precision": tp / (tp + fp) if (tp + fp) else None}


def _source(claim: dict) -> dict | None:
    if not isinstance(claim.get("filename"), str):
        return None
    try:
        page = int(claim.get("page"))
    except (ValueError, TypeError):
        return None
    quote = claim.get("quote")
    if page <= 0 or not isinstance(quote, str) or not quote.strip():
        return None
    return {"filename": claim["filename"], "page": page, "quote": quote}


def _sources(*claims: dict) -> list[dict]:
    seen, results = set(), []
    for c in claims:
        src = _source(c)
        if src is not None:
            k = (src["filename"], src["page"], src["quote"])
            if k not in seen:
                seen.add(k)
                results.append(src)
    return results


def _identity(c: dict) -> str | None:
    s = c.get("subject", c.get("model_name"))
    return str(s).strip().lower() if s not in (None, "") else None


def _context(c: dict) -> tuple | None:
    """Conservative equivalence key: never compare unknown context fields."""
    subject = _identity(c)
    fields = (subject, c.get("model_version"), c.get("endpoint"),
              c.get("dataset_id"), c.get("evaluation_split"),
              c.get("positive_class"), c.get("evaluation_protocol"))
    # Source spec requires model/version/endpoint/dataset/split. Optional
    # positive class/protocol must be normalized by extractor if relevant.
    if any(x is None or x == "" for x in fields[:5]):
        return None
    return tuple(str(x).strip().lower() if x is not None else None for x in fields)


def _rate(c: dict) -> float | None:
    v = c.get("value")
    if isinstance(v, bool) or not isinstance(v, (int, float)):
        return None
    unit = str(c.get("unit", "proportion")).lower()
    if unit in ("percent", "percentage", "%"):
        v = v / 100
    elif unit not in ("proportion", "fraction", "rate"):
        return None
    return float(v) if 0 <= v <= 1 else None


def _finding(kind: str, title: str, explanation: str,
             sources: list[dict], action: str) -> dict:
    return {"id": "", "type": kind, "severity": "high", "title": title,
            "explanation": explanation, "sources": sources,
            "guidance_reference": None, "action": action, "review_required": True}


def _is_intended(c: dict) -> bool:
    return (c.get("intended_use") is True
            or c.get("is_intended_use") is True
            or str(c.get("role", "")).lower() in
            {"intended_use", "proposed_use", "regulatory_use"})


def verify(claims: list[dict]) -> list[dict]:
    """Check normalized structured claims and return findings[] objects.

    A claim has kind='metric', 'count', or 'model_identity'; metric claims use
    metric/value/unit and common subject/model_version/endpoint/dataset_id/
    evaluation_split; counts use label (TP, FN, TN, FP) and integer value.
    Model identities need intended_use=true to compare proposed-use versions.
    Backend must verify quote-to-page mapping prior to displaying findings.
    """
    if not isinstance(claims, list):
        raise TypeError("claims must be a list")
    findings: list[dict] = []
    metric_groups: dict[tuple, list[dict]] = defaultdict(list)
    count_groups: dict[tuple, dict[str, dict]] = defaultdict(dict)
    intended: dict[str, list[dict]] = defaultdict(list)

    for c in claims:
        if not isinstance(c, dict):
            continue
        kind = str(c.get("kind", "")).lower()
        if kind == "model_identity" and _is_intended(c) and _identity(c) and c.get("model_version"):
            intended[_identity(c)].append(c)
        key = _context(c)
        if key is None:
            continue
        if kind == "metric":
            metric = METRIC_NAMES.get(str(c.get("metric", "")).lower())
            if metric and _rate(c) is not None:
                # Definition is part of comparability: do not mix distinct definitions.
                definition = c.get("metric_definition")
                metric_groups[(key, metric, definition)].append(c)
        elif kind == "count":
            label = str(c.get("label", c.get("metric", ""))).lower()
            value = c.get("value")
            if label in COUNT_NAMES and type(value) is int and value >= 0:
                count_groups[key][label] = c

    # R03: only explicit *intended-use* identities, not historical versions.
    for model, grp in sorted(intended.items()):
        versions = {str(c["model_version"]).strip() for c in grp}
        if len(versions) > 1:
            findings.append(_finding(
                "model_version_mismatch", "Conflicting intended-use model versions",
                f"The same proposed-use model {model} is identified as versions "
                + ", ".join(sorted(versions)) + " in the uploaded package.",
                _sources(*grp),
                "Confirm the intended-use model version and reconcile the source documents."))

    # R04/R05: compare matching metrics, then recompute from counts.
    for (key, metric, definition), grp in sorted(metric_groups.items(), key=lambda x: str(x[0])):
        pairs = [(c, _rate(c)) for c in grp]
        conflicting = [c for c, v in pairs if abs(v - pairs[0][1]) > 0.005]
        counts = count_groups.get(key, {})
        calc = None
        calc_sources: list[dict] = []
        if all(label in counts for label in ("tp", "fn", "tn", "fp")):
            m = recompute_metrics(*(counts[label]["value"] for label in ("tp", "fn", "tn", "fp")))
            calc = m.get(metric)
            calc_sources = list(counts.values())
        differing_from_counts = [c for c, v in pairs if calc is not None and abs(v - calc) > 0.005]
        if not conflicting and not differing_from_counts:
            continue
        values = sorted({round(v, 5) for c, v in pairs})
        desc = (f"For model {key[0]}, version {key[1]}, endpoint {key[2]}, "
                f"dataset {key[3]}, split {key[4]}, reported {metric}: {values}.")
        if calc is not None:
            desc += f" Independently calculated from TP/FN/TN/FP: {calc:.4f}."
        findings.append(_finding(
            "metric_mismatch", f"Conflicting {metric} for the same evaluation",
            desc, _sources(*grp, *calc_sources),
            f"Reconcile {metric} for the stated evaluation, then correct affected reports."))

    # Arithmetic issue when no reported rate exists: counts alone aren't a defect.
    # Preserve one issue per metric and one per proposed-use model version.
    for i, item in enumerate(findings, 1):
        item["id"] = f"ISSUE-{i:03d}"
    return findings
