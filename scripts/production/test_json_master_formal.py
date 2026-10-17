import unittest,importlib.util,copy,sys,json,tempfile,csv,io
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
class JsonFormalBaseline(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        def ref(name,value):
            p=self.root/name;p.write_text(json.dumps(value));return {'path':str(p),'sha256':a.sha(p.read_bytes())}
        self.ref=ref
        master=json.loads((Path(__file__).resolve().parents[2]/'changes/giesta2-json-r5/sources/ADOPTED_R4.json').read_text())
        self.profile=json.loads((Path(__file__).resolve().parents[2]/'contracts/production/giesta2-json-formal-profile.v1.json').read_text())
        self.row=dict(manufacturer='LIXIL',series='ジエスタ2',master_status='FORMAL_PASS',package_version='v0.8-R4',authoring_file_id='master',**{k:self.profile[k] for k in ['canonical_folder_id','old_folder_id','working_folder_id']})
        csv_data=io.StringIO();w=csv.DictWriter(csv_data,fieldnames=list(self.row));w.writeheader();w.writerow(self.row)
        self.master_ref=ref('master.json',master)
        self.manifest=dict(formal_revision='v0.8-R4',canonical_product_id=self.profile['canonical_product_id'],primary_master_sha256=self.master_ref['sha256'])
        self.c=dict(registry_response=ref('registry.json',{'content':csv_data.getvalue()}),registry_before=self.row,baseline_master=self.master_ref,baseline_live_master=self.master_ref,baseline_live_manifest=ref('manifest.json',self.manifest),baseline_authoring_metadata=ref('metadata.json',dict(id='master',mime_type='application/json',parent_ids=[self.profile['canonical_folder_id']])))
    def test_formal_revision_without_package_version(self):
        self.assertEqual(a.baseline(self.c,self.profile),self.row)
    def test_conflicting_revision_rejected(self):
        self.manifest['package_version']='v0.8-R3';self.c['baseline_live_manifest']=self.ref('manifest.json',self.manifest)
        with self.assertRaises(Blocked):a.baseline(self.c,self.profile)
    def test_other_product_manifest_rejected(self):
        self.manifest['canonical_product_id']='OTHER';self.c['baseline_live_manifest']=self.ref('manifest.json',self.manifest)
        with self.assertRaises(Blocked):a.baseline(self.c,self.profile)
    def test_stale_master_hash_rejected(self):
        self.manifest['primary_master_sha256']='0'*64;self.c['baseline_live_manifest']=self.ref('manifest.json',self.manifest)
        with self.assertRaises(Blocked):a.baseline(self.c,self.profile)
if __name__=='__main__':unittest.main()
