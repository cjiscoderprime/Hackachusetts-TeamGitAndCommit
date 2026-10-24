"""Score human-mapped results of an ACTUAL integrated ReguLens demo run.

Usage: python evaluation/score_live_run.py evaluation/live_predictions.json
Human mapping of AI findings to the known F01..F08 labels is necessary;
no undocumented automated matching or invented results.
"""
import json
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def score(predictions_path):
    oracle=json.loads((ROOT/'tests'/'ground_truth.json').read_text())
    observed=json.loads(Path(predictions_path).read_text())
    if observed.get('completed_by_researcher') is not True:
        raise ValueError('Live run has not been marked complete. Fill observed predictions after executing the backend and set completed_by_researcher=true.')
    valid_ids=set(oracle['defects'])
    metrics={}
    for case in ('flawed','corrected'):
        block=observed[case]
        hits=block.get('matched_defect_ids')
        if not isinstance(hits,list):
            raise ValueError(f'{case}: provide matched_defect_ids as list')
        if len(hits)!=len(set(hits)) or set(hits)-valid_ids:
            raise ValueError(f'{case}: duplicate or unknown defect ID')
        unmatched=block.get('unmatched_findings_count')
        if type(unmatched) is not int or unmatched < 0:
            raise ValueError(f'{case}: unmatched_findings_count must be nonnegative integer')
        expected=set(oracle['cases'][case]['expected_defect_ids'])
        predicted=set(hits)
        tp=len(predicted & expected)
        fp=len(predicted-expected)+unmatched
        fn=len(expected-predicted)
        metrics[case]={'known_defects':len(expected),'true_positives':tp,
                       'false_positives':fp,'false_negatives':fn,
                       'precision':round(tp/(tp+fp),4) if tp+fp else None,
                       'recall':round(tp/(tp+fn),4) if tp+fn else None}
    tp=sum(metrics[c]['true_positives'] for c in metrics)
    fp=sum(metrics[c]['false_positives'] for c in metrics)
    fn=sum(metrics[c]['false_negatives'] for c in metrics)
    metrics['combined']={'true_positives':tp,'false_positives':fp,'false_negatives':fn,
                         'precision':round(tp/(tp+fp),4) if tp+fp else None,
                         'recall':round(tp/(tp+fn),4) if tp+fn else None}
    metrics['scope']='End-to-end performance on two synthetic document packets only, subject to human matching of issue IDs.'
    print(json.dumps(metrics,indent=2))
    return metrics

if __name__=='__main__':
    if len(sys.argv)!=2: raise SystemExit('Usage: python evaluation/score_live_run.py evaluation/live_predictions.json')
    score(sys.argv[1])
