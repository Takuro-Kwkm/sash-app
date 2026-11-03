"""Synthetic format-contract tests. These are not actual Drive readback evidence."""
import hashlib,importlib.util,io,json,sys,tempfile,types,unittest,zipfile
from pathlib import Path
from unittest.mock import patch
digest=lambda b:hashlib.sha256(b).hexdigest()
def require(ok,code,reason,*args):
 if not ok:raise ValueError(code+': '+reason)
def capture(root,ref):
 b=Path(ref['path']).read_bytes();require(digest(b)==ref['sha256'],'FIXTURE_INPUT','Fixture bytes changed');return b
class ReadbackFormatTests(unittest.TestCase):
 def verify(self,change=None,composed=False):
  with tempfile.TemporaryDirectory()as folder:
   root=Path(folder);pid='FIXTURE:ROW_TABLE';module={'projection_policy':{'native_product_id':pid}}if not composed else{'product_module':{'product':{'id':pid}}};mod=json.dumps(module).encode()
   dependencies={'reviewed-ui.json':mod,'master.json':b'{"fixture":true}','source-digests.json':b'{"fixture":true}','adoption/ui-decision.json':b'{"fixture":true}'}
   index={'schema':'ROW_TABLE_RUNTIME_INDEX_V1','product':{'id':pid,'adapterType':'ROW_TABLE_RUNTIME_V1'},'document':{'path':'reviewed-ui.json','sha256':digest(mod)},'files':{n:digest(b)for n,b in dependencies.items()}}if not composed else{'schema':'FORMAL_COMPOSED_RUNTIME_INDEX_V1','products':[{'id':pid,'sha256':digest(mod)}]}
   members={**dependencies,'runtime_index.json':json.dumps(index).encode()}if not composed else{'reviewed-ui.json':mod,'runtime_index.json':json.dumps(index).encode()}
   if change:change(members)
   archive=io.BytesIO()
   with zipfile.ZipFile(archive,'w')as z:
    for n,b in members.items():z.writestr(n,b)
   values={'index':json.dumps(index).encode(),'module':mod,'package':archive.getvalue()};expected={'members':{n:{'bytes':len(b),'sha256':digest(b)}for n,b in members.items()}};rows=[]
   def ref(name,b):
    path=root/name;path.write_bytes(b);return {'path':str(path),'sha256':digest(b)}
   for kind,b in values.items():
    name='fixture-'+kind;package_path={'index':'runtime_index.json','module':'reviewed-ui.json','package':'package.zip'}[kind];expected[kind]={'name':name,'bytes':len(b),'sha256':digest(b),'package_path':package_path}
    meta={'id':name,'title':name,'size':len(b),'parent_ids':['fixture-folder']};download={'id':name,'parent_ids':['fixture-folder'],'file_size_bytes':len(b)}
    rows.append({'kind':kind,'file_id':name,'metadata':ref(kind+'-metadata.json',json.dumps(meta).encode()),'download':ref(kind+'-download.json',json.dumps(download).encode()),'bytes':ref(kind+'.bin',b)})
   record={'schema':'PRIVATE_RUNTIME_NATIVE_CAPTURE_V1','source':'CONNECTED_GOOGLE_DRIVE_TOOL','product_id':pid,'formal_product_id':pid,'work_id':'FIXTURE_ONLY','folder_id':'fixture-folder','files':rows}
   spec=importlib.util.spec_from_file_location('format_readback',Path(__file__).with_name('private-runtime-readback.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
   core=types.ModuleType('harness.core');core.require=require;core.sha=digest;resolvers=types.ModuleType('harness.resolvers');resolvers.capture=capture
   with patch.dict(sys.modules,{'harness':types.ModuleType('harness'),'harness.core':core,'harness.resolvers':resolvers}):return m.verify_capture(root,record,expected,pid,pid,'FIXTURE_ONLY','fixture-folder')
 def test_complete_row_package(self):self.assertTrue(self.verify()['full_bytes_verified'])
 def test_missing_index_dependency_rejected_even_if_expected_members_omits_it(self):
  with self.assertRaisesRegex(ValueError,'every declared dependency'):self.verify(lambda m:m.pop('master.json'))
 def test_caller_relabelled_tampered_member_rejected(self):
  with self.assertRaisesRegex(ValueError,'index dependency digest differs'):self.verify(lambda m:m.update({'master.json':b'CHANGED'}))
 def test_extra_unregistered_member_rejected(self):
  with self.assertRaisesRegex(ValueError,'every declared dependency'):self.verify(lambda m:m.update({'extra.txt':b'EXTRA'}))
 def test_original_composed_format_preserved(self):self.assertTrue(self.verify(composed=True)['full_bytes_verified'])
if __name__=='__main__':unittest.main()
