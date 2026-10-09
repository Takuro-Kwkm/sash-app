"""Real native boundary checks; no Human receipt or provider operation is created."""
import copy,hashlib,importlib.util,json,os,pathlib,subprocess,tempfile,unittest
ROOT=pathlib.Path(__file__).resolve().parents[2]
MODULE=importlib.util.spec_from_file_location('ew_output',ROOT/'scripts/production/ew-change.py');adapter=importlib.util.module_from_spec(MODULE);MODULE.loader.exec_module(adapter)
adapter.setup(os.environ['SHARED_HARNESS_ROOT'])
class Boundary(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.temp=tempfile.TemporaryDirectory();cls.root=pathlib.Path(cls.temp.name);cls.before=cls.root/'baseline';cls.candidate=cls.root/'candidate'
  for d in [cls.before,cls.candidate]:
   subprocess.run(['git','clone','--quiet','--no-hardlinks',str(ROOT),str(d)],check=True)
   subprocess.run(['git','checkout','--quiet','8540167f0fc49f03a88f94b11e6fba8dd9314102'],cwd=d,check=True)
  cls.profile=json.loads((ROOT/'contracts/production/order5-ew-output.v2.json').read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
  cls.plan={'product_id':'SER-LIX-EW','revision':'v1.4','unknown_impact':[],'components':{'UI':'UPDATE_REQUIRED','Regression Tests':'UPDATE_REQUIRED'},'updates':[]}
  for p in cls.profile['changes']:
   (cls.candidate/p).write_bytes((ROOT/p).read_bytes());cls.plan['updates'].append({'component':'UI' if p.startswith('src/') else 'Regression Tests','path':p,'before_sha256':sha(cls.before/p),'after_sha256':sha(cls.candidate/p),'source':{'path':str(cls.candidate/p),'sha256':sha(cls.candidate/p)}})
  paths=subprocess.check_output(['git','ls-files','-z'],cwd=cls.before).decode().split('\0')[:-1];cls.plan['unchanged_paths']={p:sha(cls.before/p) for p in paths if p not in cls.profile['changes']}
 @classmethod
 def tearDownClass(cls):cls.temp.cleanup()
 def data(self,profile=None,plan=None):
  def put(name,value):
   p=self.root/name;p.write_text(json.dumps(value));return {'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
  return {'checkout':str(self.before),'output_candidate':str(self.candidate),'output_profile':put('profile.json',profile or self.profile),'output_plan':put('plan.json',plan or self.plan)}
 def test_fixed_scoped_output_is_admitted(self):
  profile,plan=adapter.output_plan(self.data());self.assertEqual(profile['product_id'],'SER-LIX-EW');self.assertEqual(len(plan['updates']),2)
 def test_another_scope_is_rejected(self):
  p=copy.deepcopy(self.profile);p['scope']='OTHER_PRODUCT_SCOPE'
  with self.assertRaises(adapter.Blocked):adapter.output_plan(self.data(profile=p))
 def test_sparse_unchanged_inventory_is_rejected(self):
  p=copy.deepcopy(self.plan);p['unchanged_paths'].pop(next(iter(p['unchanged_paths'])))
  with self.assertRaises(adapter.Blocked):adapter.output_plan(self.data(plan=p))
 def test_product_bytes_cannot_be_changed(self):
  path=next(p for p in self.plan['unchanged_paths'] if p.endswith('lixil-ew-v1.4/runtime_manifest.json'));f=self.candidate/path;old=f.read_bytes()
  try:
   f.write_bytes(old+b' ')
   with self.assertRaises(adapter.Blocked):adapter.output_plan(self.data())
  finally:f.write_bytes(old)
 def test_untracked_candidate_is_rejected(self):
  p=self.candidate/'untracked-product-fact.json';p.write_text('{}')
  try:
   with self.assertRaises(adapter.Blocked):adapter.output_plan(self.data())
  finally:p.unlink()
 def test_changed_source_hash_is_rejected(self):
  p=copy.deepcopy(self.plan);p['updates'][0]['source']['sha256']='0'*64
  with self.assertRaises(adapter.Blocked):adapter.output_plan(self.data(plan=p))
if __name__=='__main__':unittest.main()
