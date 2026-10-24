"""Run: python -m unittest discover -s tests -v"""
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from verifier import recompute_metrics, verify


def metric(value, dataset="TEST-01", version="v2.1", endpoint="HepG2_assay_positive", file="a.txt"):
    return {"kind": "metric", "subject": "HepaRisk", "model_version": version,
            "endpoint": endpoint, "dataset_id": dataset,
            "evaluation_split": "train" if dataset == "TRAIN-01" else "test",
            "metric": "sensitivity", "metric_definition": "TP/(TP+FN)",
            "unit": "proportion", "value": value, "filename": file,
            "page": 1, "quote": f"sensitivity {value}"}


def counts():
    return [{"kind": "count", "subject": "HepaRisk", "model_version": "v2.1",
             "endpoint": "HepG2_assay_positive", "dataset_id": "TEST-01",
             "evaluation_split": "test", "label": k, "value": v, "filename": "report.txt",
             "page": 1, "quote": f"{k}={v}"}
            for k,v in (("TP",32),("FN",8),("TN",54),("FP",6))]


def identity(version, role="intended_use", file="x.txt"):
    return {"kind": "model_identity", "subject": "HepaRisk", "model_version": version,
            "role": role, "filename": file, "page": 1, "quote": f"HepaRisk {version}"}


class TestVerifier(unittest.TestCase):
    def test_calculations(self):
        m = recompute_metrics(32,8,54,6)
        self.assertEqual((m["n"],m["sensitivity"],m["specificity"],m["accuracy"]),(100,.8,.9,.86))
    def test_undefined(self):
        self.assertIsNone(recompute_metrics(0,0,4,2)["sensitivity"])
        with self.assertRaises(ValueError): recompute_metrics(-1,0,0,1)
    def test_same_context_mismatch(self):
        out = verify([metric(.95),metric(.80,file="b.txt")]+counts())
        self.assertEqual(len(out),1)
        self.assertEqual(out[0]["type"],"metric_mismatch")
        self.assertIsNone(out[0]["guidance_reference"])
    def test_against_counts(self):
        self.assertEqual(verify([metric(.95)]+counts())[0]["type"],"metric_mismatch")
    def test_no_different_dataset_mismatch(self):
        self.assertEqual(verify([metric(.99,dataset="TRAIN-01"),metric(.80)]+counts()),[])
    def test_no_different_endpoint_mismatch(self):
        self.assertEqual(verify([metric(.95,endpoint="OTHER"),metric(.80)]),[])
    def test_intended_version(self):
        out=verify([identity("v2.0"),identity("v2.1",file="b.txt")])
        self.assertEqual([i["type"] for i in out],["model_version_mismatch"])
    def test_historical_version_not_compared(self):
        self.assertEqual(verify([identity("v2.0",role="historical"),identity("v2.1")]),[])
    def test_corrected(self):
        self.assertEqual(verify([metric(.80)]+counts()+[identity("v2.1"),identity("v2.1",file="b.txt")]),[])
    def test_unknown_context_not_compared(self):
        c=metric(.95); c["dataset_id"]=None
        self.assertEqual(verify([c,metric(.80)]),[])

if __name__ == "__main__": unittest.main()
