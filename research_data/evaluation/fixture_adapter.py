"""Tiny auditable extractor ONLY for six ReguLens synthetic TXT test fixtures.

This is an offline smoke-test adapter, not a general PDF parser or Gemini.
It is intentionally pattern-limited and must not be described as validation
of AI extraction accuracy on arbitrary biotech documents.
"""
from __future__ import annotations
import re
from pathlib import Path


def extract_fixture_claims(folder: str | Path) -> tuple[list[dict], dict[str, str]]:
    folder = Path(folder)
    documents = {p.name: p.read_text(encoding='utf-8') for p in folder.glob('*.txt')}
    if set(documents) != {'scientific_summary.txt','validation_report.txt','model_card.txt'}:
        raise ValueError('Expected three fixture TXT documents in ' + str(folder))
    claims = []
    all_files = sorted(documents)

    def add(document: str, line: str, *, kind: str, metric: str = '', value=None, **extra):
        assert line in documents[document], (document, line)
        assert line in documents[document].splitlines(), (document, line)
        claims.append({'claim': line, 'kind': kind, 'metric': metric,
                       'value': value, 'document': document, 'page': 1,
                       'evidence': line, **extra})

    summary = documents['scientific_summary.txt'].splitlines()
    validation = documents['validation_report.txt'].splitlines()
    model = documents['model_card.txt'].splitlines()

    def base(dataset, model_version='v2.1'):
        return {'model_name':'HepaRisk','model_version':model_version,
                'endpoint':'HepG2_assay_positive','dataset_id':dataset,
                'evaluation_split':'test' if dataset == 'TEST-01' else 'train',
                'metric_definition':'TP/(TP+FN)', 'unit':'proportion'}

    for line in summary:
        mt = re.search(r'^AI model for proposed use: HepaRisk (v[\d.]+)',line)
        if mt:
            add('scientific_summary.txt',line,kind='model_identity',
                metric='model_version',value=mt.group(1),model_name='HepaRisk',
                model_version=mt.group(1),intended_use=True)
        mt = re.search(r'^Claim: Sensitivity on TEST-01 was (0\.\d+)\.',line)
        if mt:
            add('scientific_summary.txt',line,kind='metric',metric='sensitivity',
                value=float(mt.group(1)),**base('TEST-01'))
        if 'was validated at an independent external laboratory' in line:
            add('scientific_summary.txt',line,kind='assertion',
                metric='external_lab_validation',value=True,
                model_name='HepaRisk',model_version='v2.1')
        mt = re.match(r'^Evidence reference: ([^, ]+)',line)
        if mt:
            add('scientific_summary.txt',line,kind='attachment_reference',
                metric='attachment_reference',value=mt.group(1),
                available_documents=all_files)
    for line in validation:
        mt = re.search(r'^Reported (sensitivity|specificity|accuracy): (0\.\d+) on TEST-01',line)
        if mt:
            ctx=base('TEST-01')
            definitions={'sensitivity':'TP/(TP+FN)','specificity':'TN/(TN+FP)',
                         'accuracy':'(TP+TN)/(TP+TN+FP+FN)'}
            ctx['metric_definition']=definitions[mt.group(1)]
            add('validation_report.txt',line,kind='metric',metric=mt.group(1),
                value=float(mt.group(2)),**ctx)
        if line.startswith('Counts:'):
            for label, val in re.findall(r'\b(TP|FN|TN|FP)=(\d+)',line):
                # One set of raw counts supports all metric definitions; create
                # matching normalized count records for each known metric.
                for definition in ('TP/(TP+FN)','TN/(TN+FP)','(TP+TN)/(TP+TN+FP+FN)'):
                    ctx=base('TEST-01'); ctx['metric_definition']=definition
                    add('validation_report.txt',line,kind='count',metric=label,
                        value=int(val),**ctx)
        if 'not an external-laboratory dataset' in line:
            add('validation_report.txt',line,kind='evidence_record',
                metric='external_lab_validation',value=False,
                model_name='HepaRisk',model_version='v2.1')
        if 'no record here of prespecified performance acceptance criteria' in line:
            add('validation_report.txt',line,kind='documentation',
                metric='acceptance_criteria',value='missing',scope='uploaded_package')
        if line.startswith('Pre-evaluation protocol:'):
            add('validation_report.txt',line,kind='documentation',
                metric='acceptance_criteria',value='present',scope='uploaded_package')
        if 'Confidence intervals and uncertainty estimates are not presented.' in line:
            add('validation_report.txt',line,kind='documentation',
                metric='uncertainty',value='missing',scope='uploaded_package')
        if line.startswith('95% Wilson confidence interval'):
            add('validation_report.txt',line,kind='documentation',
                metric='uncertainty',value='present',scope='uploaded_package')
    for line in model:
        mt=re.search(r'^Intended regulatory-use model identity: HepaRisk (v[\d.]+)',line)
        if mt:
            add('model_card.txt',line,kind='model_identity',metric='model_version',
                value=mt.group(1),model_name='HepaRisk',model_version=mt.group(1),
                intended_use=True)
        mt=re.search(r'^Historical training-set sensitivity: (0\.\d+)',line)
        if mt:
            add('model_card.txt',line,kind='metric',metric='sensitivity',
                value=float(mt.group(1)),**base('TRAIN-01'))
        if line.startswith('No model risk assessment'):
            add('model_card.txt',line,kind='documentation',metric='model_risk',
                value='missing',scope='uploaded_package')
        if line.startswith("Sponsor's preliminary risk rationale:"):
            add('model_card.txt',line,kind='documentation',metric='model_risk',
                value='present',scope='uploaded_package')
        if line.startswith('No modeling limitations'):
            add('model_card.txt',line,kind='documentation',metric='limitations_bias',
                value='missing',scope='uploaded_package')
        if line.startswith('Limitations:'):
            add('model_card.txt',line,kind='documentation',metric='limitations_bias',
                value='present',scope='uploaded_package')
    return claims, documents


def verify_fixture_quotes(claims: list[dict], documents: dict[str,str]) -> bool:
    for c in claims:
        if c.get('page') != 1 or c.get('document') not in documents:
            return False
        if c.get('evidence') not in documents[c['document']].splitlines():
            return False
    return True
