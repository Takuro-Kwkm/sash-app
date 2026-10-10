"""Exercise the actual native publication entry; provider transport must stay unused."""
import json,os,subprocess,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
CENTRAL=Path(os.environ.get('SHARED_TEST_ROOT',ROOT.parent/'product-ui-contracts'))
class PublicationEntry(unittest.TestCase):
 def execute(self,members):
  with tempfile.TemporaryDirectory() as temp:
   p=Path(temp);packet=p/'packet.json';empty=p/'empty.json';empty.write_text('{}')
   packet.write_text(json.dumps({'schema':'SASH_BATCH_PUBLICATION_REQUEST_V1','status':'PASS','members':[{**m,'binding':str(empty),'observations':str(empty),'publication':str(empty),'work':str(p/'work'),'cached_gate':{'status':'PASS','external_operations':0}} for m in members]}))
   child=subprocess.run(['node',str(ROOT/'scripts/production/publish-release.mjs'),'--central',str(CENTRAL),'--packet',str(packet),'--operation-dir',str(p/'operations'),'--connector-bridge'],cwd=ROOT,env={**os.environ,'PYTHON':sys.executable},capture_output=True,text=True,timeout=30)
   self.assertEqual(child.returncode,2,child.stdout+child.stderr)
   self.assertNotIn('ORDER5_PROVIDER_BRIDGE_REQUEST=',child.stdout)
   result=json.loads(child.stdout);self.assertEqual(result['external_operations'],0)
   self.assertFalse((p/'operations').exists())
   return result
 def scopes(self):return [{k:x[k] for k in ['product_id','scope']} for x in json.loads((ROOT/'contracts/production/release-profiles.v1.json').read_bytes())['profiles']]
 def test_omitted_product_cannot_bypass_a_later_gate(self):self.assertEqual(self.execute(self.scopes()[:-1])['condition'],'INCOMPLETE_PRODUCT_SCOPE_SET')
 def test_duplicate_product_cannot_bypass_a_later_gate(self):
  s=self.scopes();s[-1]=s[0];self.assertEqual(self.execute(s)['condition'],'INCOMPLETE_PRODUCT_SCOPE_SET')
 def test_claimed_success_does_not_replace_fresh_shared_authorization(self):self.assertEqual(self.execute(self.scopes())['condition'],'PRODUCT_GATE_FAILED')
if __name__=='__main__':unittest.main()
