"""JSON dispatch must fail closed before any candidate write for incomplete review."""
import importlib.util,json,os,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('worker',ROOT/'scripts/production/sheet-package-change.py')
w=importlib.util.module_from_spec(spec);spec.loader.exec_module(w)
class JsonChange(unittest.TestCase):
 @classmethod
 def setUpClass(cls):w.setup(os.environ['SHARED_HARNESS_ROOT'])
 def ref(self,p):
  p=ROOT/p;return {'path':str(p),'sha256':w.sha(p.read_bytes())}
 def test_real_partial_review_never_enters_qa_ready(self):
  base='changes/giesta2-json-r5/'
  p=json.loads((ROOT/'contracts/production/giesta2-json-change-profile.v1.json').read_text())
  c={'checkout':str(ROOT),'review':self.ref(base+'SOURCE_REVIEW.json'),'baseline_master':self.ref(base+'sources/ADOPTED_R4.json'),'candidate_master':self.ref(base+'PRODUCT_MASTER_CANDIDATE.json')}
  with self.assertRaises(w.Blocked) as caught:w.review(c,p)
  self.assertEqual(caught.exception.data['code'],'JSON_REVIEW_BINDING')
 def test_json_adapter_hash_is_required(self):
  p=json.loads((ROOT/'contracts/production/giesta2-json-change-profile.v1.json').read_text());p['domain_adapter']['sha256']='0'*64
  with self.assertRaises(w.Blocked):w.json_adapter({'checkout':str(ROOT)},p)
 def test_existing_workbook_profile_keeps_original_path(self):
  self.assertIsNone(w.json_adapter({}, {'schema':'NATIVE_SHEETS_PACKAGE_CHANGE_PROFILE_V1'}))
if __name__=='__main__':unittest.main()
