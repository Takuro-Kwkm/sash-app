"""Admission integrity and refusal tests; no product approval or mutation."""
import hashlib,importlib.util,json,os,shutil,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
loader=importlib.util.spec_from_file_location('connection',ROOT/'scripts/production/validate-domain-runtime-connection.py')
connection=importlib.util.module_from_spec(loader);loader.loader.exec_module(connection)

class CandidateConnection(unittest.TestCase):
    def setUp(self):
        tmp=tempfile.TemporaryDirectory();self.addCleanup(tmp.cleanup);self.root=Path(tmp.name)
        paths={'contracts/production/work-connections.v2.json','contracts/production/validator-registry.v2.json'}
        routes=json.loads((ROOT/'contracts/production/work-connections.v2.json').read_bytes())
        for row in routes['products']:
            if 'runtime_candidate_profile' not in row:continue
            p=row['runtime_candidate_profile']['path'];paths.add(p)
            paths.update(json.loads((ROOT/p).read_bytes())['native_paths'])
        for name in paths:
            p=self.root/name;p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,p)
    def rejected(self):
        with self.assertRaises((AssertionError,KeyError,ValueError)):connection.validate(self.root)
    def test_both_admitted_candidates_validate(self):
        result=connection.validate(self.root);self.assertEqual(result['profiles'],2);self.assertFalse(result['formal_adoption'])
    def test_changed_formal_source_is_rejected(self):
        p=self.root/'changes/apw511-runtime-ui-r2/sources/PRODUCT_MASTER.json';p.write_bytes(p.read_bytes()+b' ');self.rejected()
    def test_changed_adoption_manifest_is_rejected(self):
        p=self.root/'changes/apw511-runtime-ui-r2/sources/PRODUCT_MASTER_MANIFEST.json';p.write_bytes(p.read_bytes()+b' ');self.rejected()
    def test_manifest_without_adoption_state_is_rejected_even_if_rehashed(self):
        p=self.root/'changes/apw511-runtime-ui-r2/sources/PRODUCT_MASTER_MANIFEST.json';d=json.loads(p.read_bytes());d['formal_state']='DRAFT';p.write_text(json.dumps(d))
        p2=self.root/'changes/apw511-runtime-ui-r2/projection.json';d=json.loads(p2.read_bytes());d['adopted_snapshot_manifest']['sha256']=hashlib.sha256(p.read_bytes()).hexdigest();p2.write_text(json.dumps(d));self.rejected()
    def test_changed_candidate_module_is_rejected(self):
        p=self.root/'changes/apw511-runtime-ui-r2/candidates/module.json';p.write_bytes(p.read_bytes()+b' ');self.rejected()
    def test_changed_profile_is_rejected(self):
        p=self.root/'contracts/production/runtime-candidates/apw511-r2.profile.json';p.write_bytes(p.read_bytes()+b' ');self.rejected()
    def test_preparation_without_flow_decision_still_refuses(self):
        shared=os.environ['SHARED_HARNESS_ROOT'];loader=importlib.util.spec_from_file_location('prepare',ROOT/'scripts/production/prepare-domain-runtime-candidate.py')
        prepare=importlib.util.module_from_spec(loader);loader.loader.exec_module(prepare)
        import sys
        sys.path.insert(0,shared)
        from harness.core import Blocked
        capture=self.root/'captures.json';capture.write_text(json.dumps({'inputs':{}}))
        with self.assertRaises(Blocked) as error:prepare.prepare(shared,ROOT,capture,self.root/'work','APW511のUI接続を反映する')
        self.assertEqual(error.exception.data['code'],'HUMAN_FLOW_REVIEW_REQUIRED')
        self.assertFalse((self.root/'work').exists())

if __name__=='__main__':unittest.main()
