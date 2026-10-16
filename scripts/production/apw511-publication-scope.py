"""Reuse the shared native immutable guard for an explicitly adopted UI successor."""
import importlib.util,json,hashlib
from pathlib import Path
BASE='429d7b603d9646795df5ba63f9be263880c865c0'
PATH='contracts/production/apw511-publication-scope.v1.json'
ALLOWED={'contracts/production/release-profiles.v1.json', 'scripts/production/domain-runtime-connection-scope.py', 'contracts/production/authority-successors/apw511-release-current.v1.json', 'contracts/production/release-profiles/order5-batch3-tw.v1.json', 'contracts/production/authority-successors/apw511-release-predecessor-selection.v1.json', '.release/app-production-hotfix-v1', 'contracts/production/current-authority-successor.json', 'contracts/production/release-profiles/order5-batch3-apw430.v1.json', 'scripts/production/apw511-publication-scope.py', 'docs/APW511_R3_PUBLICATION.md', 'contracts/production/release-profiles/apw511-r3.v1.json', 'contracts/production/validator-registry.v2.json', 'contracts/production/authority-successors/apw511-release-predecessor-profile.v1.json', 'contracts/production/apw511-publication-lifecycle.v1.json', 'contracts/production/release-profiles/order5-batch3-thermosl.v1.json', 'contracts/production/runtime-ui-qa/apw511-r3.json', 'contracts/production/apw511-publication-scope.v1.json', 'contracts/production/release-profiles/order5-batch3-apw431.v1.json', 'contracts/production/release-profiles/replus-runtime-ui-v1.2-r1.json', 'contracts/production/release-profile.v1.json'}
def validate(root):
 root=Path(root);loader=importlib.util.spec_from_file_location('immutable_scope',root/'scripts/production/native-change-scope.py')
 guard=importlib.util.module_from_spec(loader);loader.loader.exec_module(guard);guard.SCOPE_PATH=PATH
 result=guard.validate(root)
 if result['status']!='PASS':return result
 try:
  scope=json.loads((root/PATH).read_bytes());assert scope['baseline_commit']==BASE and set(scope['allowed_paths'])==ALLOWED,'SCOPE_EXPANSION'
  before=guard.snapshot(root,BASE);target='NATIVE_REGISTRY:YKK AP::APW511'
  for name in ['work-connections.v2.json','validator-registry.v2.json']:
   old=json.loads(before['contracts/production/'+name]);new=json.loads((root/'contracts/production'/name).read_bytes())
   assert {k:v for k,v in old.items() if k!='products'}=={k:v for k,v in new.items() if k!='products'},'ROUTING_POLICY_CHANGED'
   if isinstance(old['products'],list):assert [p for p in old['products'] if p['product_id']!=target]==[p for p in new['products'] if p['product_id']!=target],'OTHER_PRODUCT_CHANGED'
   else:assert {k:v for k,v in old['products'].items() if k!=target}=={k:v for k,v in new['products'].items() if k!=target},'OTHER_VALIDATOR_CHANGED'
  registry=json.loads((root/'contracts/production/release-profiles.v1.json').read_bytes());original=json.loads(before['contracts/production/release-profiles.v1.json']);assert registry['profiles'][:-1]==original['profiles'] and registry['profiles'][-1]=={'product_id': 'NATIVE_REGISTRY:YKK AP::APW511', 'scope': 'APW511_R3_ADOPTED_SALES_UI_PUBLICATION_20261016_R1', 'path': 'contracts/production/release-profiles/apw511-r3.v1.json'},'RELEASE_REGISTRY_SCOPE'
  profiles={p['path'] for p in json.loads(before['contracts/production/release-profiles.v1.json'])['profiles']}|{'contracts/production/release-profile.v1.json'}
  for name in profiles:
   old=json.loads(before[name]);new=json.loads((root/name).read_bytes())
   assert {k:v for k,v in old.items() if k not in ('native_paths','native_files','publication_policy')}=={k:v for k,v in new.items() if k not in ('native_paths','native_files','publication_policy')},'RELEASE_GUARANTEE_CHANGED'
   assert {k:v for k,v in old['publication_policy'].items() if k!='protected_files'}=={k:v for k,v in new['publication_policy'].items() if k!='protected_files'},'PUBLICATION_POLICY_CHANGED'
   assert set(old['native_paths'])<=set(new['native_paths'])==set(new['native_files']),'PIN_COVERAGE'
   assert set(old['publication_policy']['protected_files'])<=set(new['publication_policy']['protected_files']),'PROTECTION_SHRANK'
   for path,digest in {**new['native_files'],**new['publication_policy']['protected_files']}.items():assert hashlib.sha256((root/path).read_bytes()).hexdigest()==digest,'PROFILE_DRIFT:'+path
  return {**result,'scope':'APW511_ADOPTED_R3_PUBLICATION_CONNECTION','master_work':'INSPECT_ONLY','release':False}
 except (AssertionError,OSError,KeyError,ValueError) as e:return {'status':'FAIL_CLOSED','errors':[str(e)]}
if __name__=='__main__':
 import sys
 result=validate(Path(__file__).resolve().parents[2]);print(json.dumps(result));sys.exit(0 if result['status']=='PASS' else 2)
