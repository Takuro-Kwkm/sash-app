import unittest,importlib.util,copy,sys
from pathlib import Path
spec=importlib.util.spec_from_file_location('adapter',Path(__file__).with_name('json-master-formal.py'))
a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a);a.setup(sys.argv[1]);sys.argv=sys.argv[:1]

from harness.core import Blocked

class JsonMasterChange(unittest.TestCase):
    def setUp(self):
        self.before={'metadata':{'canonical_product_id':'P','formal_pass':True,'status':'FORMAL_PASS'},'masters':{'M':[{'id':'old'}]},'maps':{},'confirmations':[{'gap_id':'G','automatic_orderability':False}],'commercial_policy':{'price':None},'evidence_registry':[],'source_registry':[],'reviewed_rules':[]}
        self.after=copy.deepcopy(self.before);self.after['metadata'].update(formal_pass=False,status='DRAFT');self.after['masters']['NEW']=[{'id':'new'}];self.after['evidence_registry']=[{'evidence_id':'E'}]
    def review(self):
        return {'status':'COMPLETE_REVIEWED','review_ref':'review','baseline_sha256':a.fingerprint(self.before),'candidate_sha256':a.fingerprint(self.after),'delta':a.changed_sections(self.before,self.after),'blockers':[],'claims':[{'evidence_id':'E','source_sha256':'source','locator':'p1','verified_visual':True}],'qa_input_sha256':'qa'}
    def test_additive_candidate(self):self.assertEqual(a.validate_change(self.before,self.after,self.review())['controlled_unresolved'],1)
    def test_stale_delta(self):
        r=self.review();self.after['maps']['X']=[]
        with self.assertRaises(Blocked):a.validate_change(self.before,self.after,r)
    def test_original_rows_cannot_be_changed_even_with_new_review(self):
        self.after['masters']['M'][0]['id']='changed'
        with self.assertRaises(Blocked):a.validate_change(self.before,self.after,self.review())
    def test_confirmations_cannot_be_dropped(self):
        self.after['confirmations']=[]
        with self.assertRaises(Blocked):a.validate_change(self.before,self.after,self.review())
    def test_price_cannot_be_invented(self):
        self.after['commercial_policy']['price']=1
        with self.assertRaises(Blocked):a.validate_change(self.before,self.after,self.review())
    def test_incomplete_scope_blocks(self):
        r=self.review();r['blockers']=['custom_frame_unknown']
        with self.assertRaises(Blocked):a.validate_change(self.before,self.after,r)
    def test_unreviewed_source_blocks(self):
        r=self.review();r['claims'][0]['verified_visual']=False
        with self.assertRaises(Blocked):a.validate_change(self.before,self.after,r)
    def test_missing_is_not_null(self):
        delta=a.changed_sections({}, {'a':None});self.assertFalse(delta[0]['before_present']);self.assertTrue(delta[0]['after_present'])
if __name__=='__main__':unittest.main()
