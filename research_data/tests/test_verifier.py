"""Run from package root: python -m unittest discover -s tests -v"""
import json
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(ROOT/'backend'),str(ROOT/'evaluation')]
from verifier import recompute_metrics,verify_evidence
from fixture_adapter import extract_fixture_claims,verify_fixture_quotes


def claim(kind, quote, document='x.txt', **kwargs):
    return {'kind':kind,'claim':quote,'value':None,'metric':'',
            'evidence':quote,'document':document,'page':1,**kwargs}


def metric(value,dataset='TEST-01',split='test',document='a.txt',endpoint='HepG2_assay_positive'):
    return claim('metric',f'Sensitivity: {value}',document,metric='sensitivity',
            value=value,model_name='HepaRisk',model_version='v2.1',endpoint=endpoint,
            dataset_id=dataset,evaluation_split=split,metric_definition='TP/(TP+FN)',unit='proportion')


def version(v,document='a.txt',intended=True):
    return claim('model_identity',f'Proposed HepaRisk {v}',document,
             metric='model_version',value=v,model_name='HepaRisk',
             model_version=v,intended_use=intended)


class ReguLensVerifierTests(unittest.TestCase):
    def test_metric_arithmetic(self):
        self.assertEqual(recompute_metrics(32,8,54,6),{
            'n':100,'sensitivity':0.8,'specificity':0.9,'accuracy':0.86,
            'precision':32/38})

    def test_zero_denominator(self):
        self.assertIsNone(recompute_metrics(0,0,4,2)['sensitivity'])

    def test_reject_invalid_counts(self):
        with self.assertRaises(ValueError): recompute_metrics(-1,0,0,0)
        with self.assertRaises(ValueError): recompute_metrics(True,0,0,0)

    def test_conflicting_same_context(self):
        output=verify_evidence([metric(.95),metric(.80,document='b.txt')])
        self.assertEqual([x['rule_id'] for x in output],['R04'])
        self.assertEqual(set(output[0]),{'id','rule_id','category','severity','title',
           'description','sources','recommendation','requires_human_review','regulatory_conclusion'})

    def test_no_training_vs_test_false_positive(self):
        self.assertEqual(verify_evidence([metric(.99,'TRAIN-01','train'),metric(.80)]),[])

    def test_no_different_endpoint_false_positive(self):
        self.assertEqual(verify_evidence([metric(.99,endpoint='other'),metric(.80)]),[])

    def test_missing_context_is_not_invented(self):
        c=metric(.95); c.pop('dataset_id')
        self.assertEqual(verify_evidence([c,metric(.80)]),[])

    def test_fraction_vs_percent(self):
        a=metric(80); a['unit']='percent'
        self.assertEqual(verify_evidence([a,metric(.80)]),[])

    def test_intended_version_conflict(self):
        self.assertEqual([x['rule_id'] for x in verify_evidence([version('v2.0'),version('v2.1','b.txt')])],['R03'])

    def test_historical_version_is_not_proposed_use(self):
        self.assertEqual(verify_evidence([version('v2.0',intended=False),version('v2.1')]),[])

    def test_explicit_external_evidence_conflict(self):
        a=claim('assertion','External lab confirmed',metric='external_lab_validation',
                model_name='HepaRisk',model_version='v2.1',value=True)
        b=claim('evidence_record','Lab A only',metric='external_lab_validation',
                model_name='HepaRisk',model_version='v2.1',value=False)
        self.assertEqual([x['rule_id'] for x in verify_evidence([a,b])],['R06'])

    def test_missing_is_scoped(self):
        a=claim('documentation','No uncertainty estimated',metric='uncertainty',
                value='missing',scope='uploaded_package')
        self.assertEqual([x['rule_id'] for x in verify_evidence([a])],['R10'])
        a.pop('scope')
        self.assertEqual(verify_evidence([a]),[])

    def test_present_overrides_missing_review(self):
        a=claim('documentation','No risk discussion found',metric='model_risk',
                value='missing',scope='uploaded_package')
        b=claim('documentation','Risk plan exists',metric='model_risk',
                value='present',scope='uploaded_package')
        self.assertEqual(verify_evidence([a,b]),[])

    def test_attachment_requires_inventory(self):
        a=claim('attachment_reference','Appendix: missing.pdf',value='missing.pdf')
        self.assertEqual(verify_evidence([a]),[])
        a['available_documents']=['other.txt']
        self.assertEqual([x['rule_id'] for x in verify_evidence([a])],['R12'])

    def test_unquoted_claim_skipped(self):
        a=metric(.95); a['evidence']=''
        self.assertEqual(verify_evidence([a,metric(.80)]),[])

    def test_no_fda_approval_labels(self):
        findings=verify_evidence([version('v2.0'),version('v2.1','b.txt')])
        self.assertTrue(all(not f['regulatory_conclusion'] for f in findings))

    def test_real_synthetic_flawed_eight(self):
        claims,docs=extract_fixture_claims(ROOT/'samples'/'flawed')
        self.assertTrue(verify_fixture_quotes(claims,docs))
        rules={f['rule_id'] for f in verify_evidence(claims)}
        expected={v['rule_id'] for v in json.loads((ROOT/'tests'/'ground_truth.json').read_text())['defects'].values()}
        self.assertEqual(rules,expected)

    def test_real_synthetic_corrected_zero(self):
        claims,docs=extract_fixture_claims(ROOT/'samples'/'corrected')
        self.assertTrue(verify_fixture_quotes(claims,docs))
        self.assertEqual(verify_evidence(claims),[])

    def test_source_citations_are_anchored(self):
        claims,docs=extract_fixture_claims(ROOT/'samples'/'flawed')
        for finding in verify_evidence(claims):
            self.assertGreater(len(finding['sources']),0)
            for source in finding['sources']:
                self.assertEqual(source['page'],1)
                self.assertIn(source['quote'],docs[source['document']])


if __name__ == '__main__': unittest.main()
