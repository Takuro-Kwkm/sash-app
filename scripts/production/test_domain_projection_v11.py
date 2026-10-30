import copy,importlib.util,json,unittest,sys,tempfile,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('compiler',ROOT/'scripts/production/compile-domain-projection.py')
compiler=importlib.util.module_from_spec(spec);spec.loader.exec_module(compiler)
if '--candidate-root' not in sys.argv:raise SystemExit('Explicit --candidate-root private capture required')
arg=sys.argv.index('--candidate-root');BASE=Path(sys.argv[arg+1]).resolve();del sys.argv[arg:arg+2]

class DomainProjectionV11(unittest.TestCase):
 def test_current_formal_bytes_are_exact_and_not_mutated(self):
  import hashlib
  original=(BASE/'sources/PRODUCT_MASTER.json').read_bytes()
  self.assertEqual(hashlib.sha256(original).hexdigest(),'fef4b67b6f0622d7f6a343c45940196db80e97bb814d9222c371ac0a1a5422cc')
  projection=json.loads((BASE/'projection.json').read_bytes()); actual=compiler.compile_profile(projection,BASE)
  self.assertEqual(actual,json.loads((BASE/'candidates/module.json').read_bytes()))
  self.assertEqual(original,(BASE/'sources/PRODUCT_MASTER.json').read_bytes())
  definitions=actual['product_module']['specificationDefinitions'];hidden=[f for f in definitions if f.get('technical')]
  self.assertEqual(len(definitions),49);self.assertEqual(len(hidden),7)
  self.assertTrue(all(f['uiHidden'] for f in hidden));self.assertEqual(len(actual['product_module']['dependencies']),12)
 def test_evidence_only_role_cannot_hide_a_sales_field(self):
  p=json.loads((BASE/'projection.json').read_bytes());p['fields']['window']['role']='EVIDENCE_ONLY'
  with self.assertRaisesRegex(AssertionError,'UNREVIEWED_FIELD'):compiler.compile_profile(p,BASE)
 def test_field_comparison_is_explicit_and_unsupported_expression_refuses(self):
  self.assertEqual(compiler.selector(dict(field='a',op='eq',value_expr=dict(field='b'))),{'a':{'$compare':{'operator':'eq','field':'b'}}})
  with self.assertRaisesRegex(AssertionError,'UNSUPPORTED_DOMAIN_EXPRESSION'):compiler.selector(dict(field='a',op='eq',value_expr=dict(add=[1,2])))
 def test_old_schema_outputs_are_byte_semantically_unchanged(self):
  for folder in ('apw511-runtime-ui-r2','doorremo-runtime-ui-r1'):
   base=ROOT/'changes'/folder;p=json.loads((base/'projection.json').read_bytes());index=json.loads((base/'index.json').read_bytes());fixed=json.loads((base/index['products'][0]['path']).read_bytes())
   self.assertEqual(compiler.compile_profile(p,base),fixed,folder)
 def test_numeric_domain_and_prohibition_data_are_preserved(self):
  p=json.loads((BASE/'projection.json').read_bytes());actual=compiler.compile_profile(p,BASE)['product_module'];m=json.loads((BASE/'sources/PRODUCT_MASTER.json').read_bytes())
  self.assertEqual(len(actual['ruleSets'][0]['payload']['rules']),len(m['constraints']))
  self.assertIn('FIX_SQUARE_DIMENSION_MATCH',[x['id'] for x in actual['ruleSets'][0]['payload']['rules']])
  for f in m['fields']:
   if f['data_type']=='number':
    n=next(x for x in actual['ruleSets'][0]['payload']['numbers'] if x['key']==f['field_id'])
    self.assertEqual(n['minimum'],f['minimum']);self.assertFalse(n['integer'])
  self.assertEqual(actual['specificationDefinitions'][7]['step'],0.001)

class PrivateCaptureBoundary(unittest.TestCase):
 def setUp(self):
  s=importlib.util.spec_from_file_location('private',ROOT/'scripts/production/validate-domain-runtime-connection.py');self.module=importlib.util.module_from_spec(s);s.loader.exec_module(self.module)
  self.profile=json.loads((ROOT/'contracts/production/runtime-candidates/apw330-r1.profile.json').read_bytes())
 def test_exact_explicit_private_capture_is_bound(self):
  refs=self.module.capture_private_candidate(self.profile,BASE)
  self.assertEqual(len(refs),len(self.profile['private_candidate']['files']))
  self.assertTrue(all(Path(x['path']).is_absolute() for x in refs.values()))
 def test_escape_manifest_is_rejected(self):
  p=copy.deepcopy(self.profile);p['private_candidate']['files']['../outside']='0'*64
  with self.assertRaisesRegex(AssertionError,'PRIVATE_CANDIDATE_PATH_OR_HASH'):self.module.private_manifest(p)
 def test_missing_and_extra_capture_files_are_rejected(self):
  with tempfile.TemporaryDirectory() as tmp:
   with self.assertRaisesRegex(AssertionError,'PRIVATE_CANDIDATE_FILE_SET_CHANGED'):self.module.capture_private_candidate(self.profile,tmp)
   shutil.copytree(BASE,Path(tmp)/'copy');(Path(tmp)/'copy/extra.txt').write_text('extra')
   with self.assertRaisesRegex(AssertionError,'PRIVATE_CANDIDATE_FILE_SET_CHANGED'):self.module.capture_private_candidate(self.profile,Path(tmp)/'copy')
 def test_changed_capture_bytes_are_rejected(self):
  with tempfile.TemporaryDirectory() as tmp:
   target=Path(tmp)/'copy';shutil.copytree(BASE,target);(target/'index.json').write_text('{}')
   with self.assertRaisesRegex(AssertionError,'PRIVATE_CANDIDATE_BYTES_CHANGED'):self.module.capture_private_candidate(self.profile,target)

if __name__=='__main__':unittest.main()
