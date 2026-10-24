"""ReguLens's source-grounded, conservative scientific evidence verifier.

Public entry point:
    verify_evidence(claims: list[dict]) -> list[dict]

Minimal input keys: claim, value, metric, evidence, document, page.
Reliable comparisons ALSO require context and kind/type fields listed below.
This is not a document parser, FDA compliance assessor, or LLM trainer.
The calling backend MUST verify that (document, page, evidence) points to
actual text before rendering any returned finding. Missing-data markers
must come from a completed, bounded review of all uploaded files.
"""
from __future__ import annotations

from collections import defaultdict
from typing import Any

METRIC_ALIASES = {
    'recall': 'sensitivity', 'tpr': 'sensitivity', 'sensitivity': 'sensitivity',
    'specificity': 'specificity', 'tnr': 'specificity',
    'accuracy': 'accuracy', 'precision': 'precision',
}
COUNTS = ('tp', 'fn', 'tn', 'fp')
DOC_TOPICS = {
    'acceptance_criteria': ('R09', 'Performance acceptance criteria not documented',
                            'Provide a dated, context-appropriate prespecified evaluation protocol or explain missing records.'),
    'uncertainty': ('R10', 'Performance uncertainty documentation not located',
                    'Provide justified uncertainty estimates and calculation methods for reported performance.'),
    'limitations_bias': ('R11', 'Model limitations and bias documentation not located',
                         'Explain applicability, distribution shift, study limitations and potential bias.'),
    'model_risk': ('R08', 'Model-risk discussion not located',
                   'Discuss model influence, consequences of errors and human oversight for the intended use.'),
}


def recompute_metrics(tp: int, fn: int, tn: int, fp: int) -> dict[str, float | int | None]:
    """Calculate four binary-classification measures; undefined rates are None."""
    counts = (tp, fn, tn, fp)
    if any(type(x) is not int or x < 0 for x in counts):
        raise ValueError('TP/FN/TN/FP must be nonnegative integer counts')
    n = sum(counts)
    return {
        'n': n,
        'sensitivity': tp / (tp + fn) if tp + fn else None,
        'specificity': tn / (tn + fp) if tn + fp else None,
        'accuracy': (tp + tn) / n if n else None,
        'precision': tp / (tp + fp) if tp + fp else None,
    }


def _source(c: dict) -> dict | None:
    document = c.get('document', c.get('filename'))
    quote = c.get('evidence', c.get('quote'))
    try:
        page = int(c.get('page'))
    except (TypeError, ValueError):
        return None
    if not isinstance(document, str) or not document.strip() or page < 1:
        return None
    if not isinstance(quote, str) or not quote.strip():
        return None
    return {'document': document, 'page': page, 'quote': quote}


def _sources(*cs: dict) -> list[dict]:
    sources = []
    seen = set()
    for c in cs:
        s = _source(c)
        if s and (s['document'], s['page'], s['quote']) not in seen:
            sources.append(s)
            seen.add((s['document'], s['page'], s['quote']))
    return sources


def _clean(value: Any) -> str | None:
    return str(value).strip().lower() if value is not None and str(value).strip() else None


def _context(c: dict) -> tuple | None:
    # Comparing rates without these fields risks false contradictions.
    fields = (c.get('model_name', c.get('subject')),
              c.get('model_version'), c.get('endpoint'), c.get('dataset_id'),
              c.get('evaluation_split'), c.get('metric_definition'),
              c.get('positive_class'), c.get('evaluation_protocol'))
    if any(_clean(x) is None for x in fields[:5]):
        return None
    return tuple(_clean(x) for x in fields)


def _rate(c: dict) -> float | None:
    value = c.get('value')
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    unit = _clean(c.get('unit', 'proportion'))
    if unit in {'%', 'percent', 'percentage'}:
        value /= 100
    elif unit not in {'proportion', 'fraction', 'rate'}:
        return None
    return float(value) if 0 <= value <= 1 else None


def _append(findings: list[dict], rule_id: str, category: str, severity: str,
            title: str, description: str, sources: list[dict], recommendation: str) -> None:
    if not sources:  # Never create an unsourced finding.
        return
    findings.append({
        'id': f'REGU-{len(findings) + 1:03d}',
        'rule_id': rule_id,
        'category': category,
        'severity': severity,
        'title': title,
        'description': description,
        'sources': sources,
        'recommendation': recommendation,
        'requires_human_review': True,
        'regulatory_conclusion': False,
    })


def verify_evidence(claims: list[dict]) -> list[dict]:
    """Review source-backed extracted claims, returning traceable candidate findings.

    Additional input keys by kind:
      metric: model_name, model_version, endpoint, dataset_id, evaluation_split,
              metric, metric_definition, value, unit (proportion|percent),
              optional positive_class/evaluation_protocol.
      count:  same context, metric='TP'|'FN'|'TN'|'FP', nonnegative integer value.
      model_identity: model_name, model_version, intended_use=True or role='intended_use'.
      assertion/evidence_record: metric='external_lab_validation', value=True|False,
              model_name and model_version.
      documentation: metric='acceptance_criteria'|'uncertainty'|
              'limitations_bias'|'model_risk', value='missing'|'present',
              scope='uploaded_package' (backend's completed document review).
      attachment_reference: value=referenced filename; available_documents=
              authoritative server-provided list of filenames in uploaded package.

    The minimal six-key schema alone cannot establish comparison context.
    Incomplete/ambiguous metadata is skipped, rather than turned into a false conflict.
    """
    if not isinstance(claims, list):
        raise TypeError('claims must be a list of dictionaries')

    valid = [c for c in claims if isinstance(c, dict) and _source(c)]
    findings: list[dict] = []
    metric_groups = defaultdict(list)
    count_groups = defaultdict(lambda: defaultdict(list))
    versions = defaultdict(list)
    external = defaultdict(lambda: {True: [], False: []})
    docs = defaultdict(lambda: {'present': [], 'missing': []})
    attachments = []

    for c in valid:
        kind = _clean(c.get('kind'))
        context = _context(c)
        if kind == 'metric' and context:
            metric = METRIC_ALIASES.get(_clean(c.get('metric')))
            rate = _rate(c)
            if metric and rate is not None:
                metric_groups[(context, metric)].append(c)
        elif kind == 'count' and context:
            label = _clean(c.get('metric', c.get('label')))
            if label in COUNTS and type(c.get('value')) is int and c['value'] >= 0:
                count_groups[context][label].append(c)
        elif kind == 'model_identity':
            model = _clean(c.get('model_name', c.get('subject')))
            ver = _clean(c.get('model_version'))
            proposed = c.get('intended_use') is True or _clean(c.get('role')) in {'intended_use','proposed_use'}
            if model and ver and proposed:
                versions[model].append(c)
        elif kind in {'assertion', 'evidence_record'} and _clean(c.get('metric')) == 'external_lab_validation':
            if type(c.get('value')) is bool:
                key = (_clean(c.get('model_name', c.get('subject'))), _clean(c.get('model_version')))
                if all(key):
                    external[key][c['value']].append(c)
        elif kind == 'documentation':
            topic = _clean(c.get('metric'))
            status = _clean(c.get('value'))
            if topic in DOC_TOPICS and status in {'missing','present'} and c.get('scope') == 'uploaded_package':
                docs[topic][status].append(c)
        elif kind == 'attachment_reference':
            attached_files = c.get('available_documents')
            if isinstance(c.get('value'), str) and isinstance(attached_files, (list, tuple, set)):
                attachments.append(c)

    # Same-context metric comparisons and arithmetic checks.
    for (context, metric), group in sorted(metric_groups.items(), key=lambda x: str(x[0])):
        rates = [_rate(c) for c in group]
        disagreement = any(abs(v - rates[0]) > .005 for v in rates[1:])
        counts = count_groups.get(context, {})
        computed = None
        count_sources = []
        if all(counts.get(label) and len({x['value'] for x in counts[label]}) == 1 for label in COUNTS):
            row = {label: counts[label][0]['value'] for label in COUNTS}
            computed = recompute_metrics(row['tp'], row['fn'], row['tn'], row['fp']).get(metric)
            count_sources = [counts[label][0] for label in COUNTS]
        bad_arithmetic = computed is not None and any(abs(v - computed) > .005 for v in rates)
        if disagreement or bad_arithmetic:
            comparison = ', '.join(f'{v:.4f}' for v in rates)
            explanation = (f'Reported {metric} values ({comparison}) for model {context[0]} '
                           f'version {context[1]}, endpoint {context[2]}, dataset {context[3]}, '
                           f'split {context[4]} are inconsistent.')
            if computed is not None:
                explanation += f' Confusion-matrix calculation = {computed:.4f}.'
            _append(findings, 'R04', 'metric_mismatch', 'high',
                    f'Conflicting {metric} for the same evaluation', explanation,
                    _sources(*group, *count_sources),
                    'Check the original dataset and calculation, then reconcile the reported metric.')

    # Only compare explicitly marked proposed-use identities (historical models are ignored).
    for model, group in sorted(versions.items()):
        vs = {_clean(c.get('model_version')) for c in group}
        if len(vs) > 1:
            _append(findings, 'R03', 'model_version_mismatch', 'high',
                    'Conflicting intended-use model versions',
                    f'Documents identify {model} as intended-use versions {", ".join(sorted(vs))}.',
                    _sources(*group),
                    'Confirm and consistently identify the model version intended for this use.')

    # Only explicit affirmative/negative statements support an external validation conflict.
    for (model, version), states in sorted(external.items()):
        if states[True] and states[False]:
            _append(findings, 'R06', 'unsupported_claim', 'high',
                    'External validation claim contradicts available study evidence',
                    f'For {model} {version}, independent external-laboratory validation is claimed '
                    'but the supplied evidence explicitly describes within-laboratory testing.',
                    _sources(*states[True], *states[False]),
                    'Identify the actual validation institution or withdraw the unsupported assertion.')

    # These are scoped review questions, not legally binding submission requirements.
    for topic, (rule, title, recommendation) in DOC_TOPICS.items():
        group = docs.get(topic, {})
        if group.get('missing') and not group.get('present'):
            _append(findings, rule, 'missing_documentation', 'medium', title,
                    f'No {topic.replace("_", " ")} documentation was located in the provided '
                    'package during the bounded review. This does not prove it does not exist elsewhere.',
                    _sources(*group['missing']), recommendation)

    for c in attachments:
        target = c['value'].strip()
        available = {_clean(x) for x in c['available_documents'] if isinstance(x, str)}
        if target and _clean(target) not in available:
            _append(findings, 'R12', 'missing_attachment', 'medium',
                    'Referenced evidence attachment unavailable in uploaded package',
                    f'{target} is cited but is not included among the provided files.',
                    _sources(c),
                    'Provide the referenced file or replace the reference with an available source.')

    # Stable ordering and id renumbering are deterministic for equal inputs.
    return findings


def verify(claims: list[dict]) -> list[dict]:
    """Compatibility alias for earlier ReguLens handoff."""
    return verify_evidence(claims)
