import importlib.util,json,subprocess,tempfile,unittest,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('batch2',ROOT/'scripts/production/order5-batch2-scope.py');guard=importlib.util.module_from_spec(spec);spec.loader.exec_module(guard)
class ScopeTest(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.root=Path(self.temp.name)/'repo'
  subprocess.run(['git','clone','--quiet','--shared',str(ROOT),str(self.root)],check=True)
  subprocess.run(['git','checkout','--quiet','--detach',guard.BASELINE],cwd=self.root,check=True)
  for p in guard.ALLOWED:
   target=self.root/p;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/p,target)
 def reject(self):
  result=guard.validate(self.root);self.assertEqual(result['status'],'FAIL_CLOSED',result);self.assertEqual(result['authorized_paths'],[]);self.assertEqual(result['verified_unchanged_sha256'],{})
 def test_exact_candidate_pass(self):self.assertEqual(guard.validate(self.root)['status'],'PASS')
 def test_formal_bytes_cannot_change(self):
  profile=json.loads((self.root/'contracts/production/order5-batch2-assets.v1.json').read_text());p=self.root/profile['assets']['Formal']['path'];p.write_bytes(p.read_bytes()+b'\n');self.reject()
 def test_other_scope_cannot_be_admitted(self):
  p=self.root/guard.SCOPE_FILE;d=json.loads(p.read_text());d['scope']='UNADMITTED';p.write_text(json.dumps(d));self.reject()
 def test_approval_roles_cannot_be_lowered(self):
  p=self.root/'contracts/production/release-profile.v1.json';d=json.loads(p.read_text());d['mandatory_approvals']=[];p.write_text(json.dumps(d));self.reject()
 def test_native_qa_binding_cannot_be_relaxed(self):
  p=self.root/'contracts/production/release-profile.v1.json';d=json.loads(p.read_text());d['publication_policy']['native_qa_bindings']['batch2_product']['minimums'][0]['value']=0;p.write_text(json.dumps(d));self.reject()
 def test_publication_alias_cannot_change(self):
  p=self.root/'contracts/production/release-profile.v1.json';d=json.loads(p.read_text());d['destination']['url']='https://other.invalid';p.write_text(json.dumps(d));self.reject()
 def test_untracked_scope_cannot_be_added(self):
  (self.root/'unadmitted-product.json').write_text('{}');self.reject()
 def test_former_released_profile_cannot_be_rewritten(self):
  (self.root/'contracts/production/authority-successors/order5-batch2-predecessor-profile.v1.json').write_text('{}');self.reject()
if __name__=='__main__':unittest.main()
