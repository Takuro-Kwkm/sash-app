import importlib.util,json,subprocess,tempfile,unittest,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
s=importlib.util.spec_from_file_location('batch3',ROOT/'scripts/production/order5-batch3-scope.py');guard=importlib.util.module_from_spec(s);s.loader.exec_module(guard)
class ScopeTest(unittest.TestCase):
 def setUp(self):
  t=tempfile.TemporaryDirectory();self.addCleanup(t.cleanup);self.root=Path(t.name)/'repo';subprocess.run(['git','clone','--quiet','--shared',str(ROOT),str(self.root)],check=True);subprocess.run(['git','checkout','--quiet','--detach',guard.BASE],cwd=self.root,check=True)
  for p in guard.ALLOWED:
   target=self.root/p;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/p,target)
 def reject(self):
  r=guard.validate(self.root);self.assertEqual(r['status'],'FAIL_CLOSED',r);self.assertEqual(r['authorized_paths'],[])
 def test_exact_all_product_profiles(self):self.assertEqual(guard.validate(self.root)['status'],'PASS')
 def test_other_scope(self):
  p=self.root/'contracts/production/release-profiles.v1.json';d=json.loads(p.read_bytes());d['profiles'][0]['scope']='UNADMITTED';p.write_text(json.dumps(d));self.reject()
 def test_formal_change(self):
  s=json.loads((self.root/'contracts/production/order5-batch3-scope.v1.json').read_bytes());p=self.root/next(iter(s['protected_sha256']));p.write_bytes(p.read_bytes()+b' ');self.reject()
 def test_foreign_untracked(self):(self.root/'other-product.json').write_text('{}');self.reject()
 def test_pin_removal(self):
  p=self.root/'contracts/production/order5-batch3-scope.v1.json';d=json.loads(p.read_bytes());d['candidate_files_sha256']={};p.write_text(json.dumps(d));self.reject()
 def test_approval_downgrade(self):
  p=self.root/guard.IDENTITIES[-1][2];d=json.loads(p.read_bytes());d['mandatory_approvals']=[];p.write_text(json.dumps(d));self.reject()
 def test_qa_downgrade(self):
  p=self.root/guard.IDENTITIES[-1][2];d=json.loads(p.read_bytes());d['publication_policy']['native_qa_bindings']['batch3_product']['minimums'][0]['value']=0;p.write_text(json.dumps(d));self.reject()
 def test_previous_release_profile(self):
  (self.root/'contracts/production/authority-successors/order5-batch3-predecessor-profile.v1.json').write_text('{}');self.reject()
if __name__=='__main__':unittest.main()
