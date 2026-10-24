"""Independent arithmetic helper: no LLM required. Import or adapt in backend/verifier.py."""
def recompute_metrics(tp: int, fn: int, tn: int, fp: int) -> dict:
    counts=(tp,fn,tn,fp)
    if any(type(x) is not int or x<0 for x in counts):
        raise ValueError('Counts must be nonnegative integers')
    total=sum(counts)
    return {'n':total,
            'sensitivity':tp/(tp+fn) if tp+fn else None,
            'specificity':tn/(tn+fp) if tn+fp else None,
            'accuracy':(tp+tn)/total if total else None,
            'precision':tp/(tp+fp) if tp+fp else None}
if __name__=='__main__':
    result=recompute_metrics(32,8,54,6)
    assert result['n']==100 and result['sensitivity']==.8
    assert result['specificity']==.9 and result['accuracy']==.86
    assert recompute_metrics(0,0,4,2)['sensitivity'] is None
    print('PASS:',result)
