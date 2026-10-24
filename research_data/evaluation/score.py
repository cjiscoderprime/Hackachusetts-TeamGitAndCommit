import argparse, json
from pathlib import Path
parser=argparse.ArgumentParser(description='Score ReguLens findings against manually verified seeded defects')
parser.add_argument('predictions',help='JSON manually mapped from ACTUAL system reports')
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
oracle=json.loads((root/'samples/ground_truth.json').read_text())
pred=json.loads(Path(args.predictions).read_text())
valid=set(oracle['defects'])
flawed=pred['flawed']; corrected=pred['corrected']
a=flawed['detected_defect_ids']; b=corrected['detected_defect_ids']
if len(a)!=len(set(a)) or len(b)!=len(set(b)):
    raise ValueError('Deduplicate repeated findings about same ground-truth issue before scoring')
if any(x not in valid for x in a+b):
    raise ValueError('Only F01-F08 can appear in detected_defect_ids; record unrelated false positives in other_false_positive_count')
truth=set(oracle['flawed']['expected_defect_ids'])
tp=len(set(a)&truth)
fn=len(truth-set(a))
fp=(len(set(a)-truth)+len(b)+flawed.get('other_false_positive_count',0)+corrected.get('other_false_positive_count',0))
recall=tp/(tp+fn) if tp+fn else None
precision=tp/(tp+fp) if tp+fp else None
print('Number of seeded defects:',len(truth))
print('TP:',tp,'FP:',fp,'FN:',fn)
print('Seeded-defect recall:',f'{recall:.1%}' if recall is not None else 'undefined')
print('Finding precision:',f'{precision:.1%}' if precision is not None else 'undefined')
print('False positives in corrected package:',len(b)+corrected.get('other_false_positive_count',0))
checked=pred.get('citations_checked',0); verified=pred.get('citations_valid',0)
if not 0<=verified<=checked: raise ValueError('Invalid citation counts')
print('Citation validity:',f'{verified/checked:.1%}' if checked else 'not measured')
print('DISCLAIMER: This two-case synthetic demo does not establish generalization accuracy or FDA compliance.')
