"""The new infrastructure guard rejects product bytes and scope expansion."""
import importlib.util,json,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
s=importlib.util.spec_from_file_location('conditions',ROOT/'scripts/production/product-conditions-scope.py')
g=importlib.util.module_from_spec(s);s.loader.exec_module(g)
class ConditionsScope(unittest.TestCase):
 def test_candidate(self):self.assertEqual(g.validate(ROOT)['status'],'PASS')
 def test_protected_product_and_expansion(self):
  rec=ROOT/'contracts/production/product-master-conditions-scope.v1.json';original=rec.read_bytes();scope=json.loads(original)
  protected=next(p for p in scope['protected_sha256'] if p.startswith(('src/','apps/','packages/')) and p.endswith(('.ts','.mjs','.tsx','.js')))
  target=ROOT/protected;before=target.read_bytes()
  try:
   target.write_bytes(before+b' ');self.assertEqual(g.validate(ROOT)['status'],'FAIL_CLOSED')
  finally:target.write_bytes(before)
  try:
   scope['allowed_paths'].append(protected);rec.write_text(json.dumps(scope));self.assertEqual(g.validate(ROOT)['status'],'FAIL_CLOSED')
  finally:rec.write_bytes(original)
if __name__=='__main__':unittest.main()
