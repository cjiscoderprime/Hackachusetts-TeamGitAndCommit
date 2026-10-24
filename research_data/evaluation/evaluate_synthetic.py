"""Evaluate narrow, RULE-ENGINE smoke tests, NOT the Gemini document pipeline."""
import json
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'backend'))
sys.path.insert(0,str(ROOT/'evaluation'))
from verifier import verify_evidence
from fixture_adapter import extract_fixture_claims, verify_fixture_quotes


def evaluate():
    oracle=json.loads((ROOT/'tests'/'ground_truth.json').read_text())
    results={}
    for case in ('flawed','corrected'):
        claims, documents = extract_fixture_claims(ROOT/'samples'/case)
        assert verify_fixture_quotes(claims, documents), 'Invalid source spans'
        findings=verify_evidence(claims)
        assert all(s['quote'] in documents[s['document']] for f in findings for s in f['sources'])
        expected={oracle['defects'][id]['rule_id'] for id in oracle['cases'][case]['expected_defect_ids']}
        predicted={f['rule_id'] for f in findings}
        tp=len(predicted & expected)
        fp=len(predicted - expected)
        fn=len(expected - predicted)
        results[case]={
            'known_defects':len(expected),'rule_engine_claims':len(claims),
            'findings':findings, 'true_positives':tp, 'false_positives':fp,
            'false_negatives':fn,
            'precision':round(tp/(tp+fp),4) if tp+fp else None,
            'recall':round(tp/(tp+fn),4) if tp+fn else None,
            'citation_strings_valid':True,
        }
    results['scope_note']='Fixture-specific extraction + deterministic verification on two authored synthetic cases only. NOT performance of Gemini or general FDA documentation review.'
    (ROOT/'evaluation'/'synthetic_results.json').write_text(json.dumps(results,indent=2)+'\n')
    print(json.dumps({k:{m:v for m,v in x.items() if m!='findings'} if isinstance(x,dict) else x for k,x in results.items()},indent=2))
    return results

if __name__=='__main__': evaluate()
