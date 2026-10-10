"""Bounded native successor; prior released profiles and all other bytes stay fixed."""
import hashlib,io,json,subprocess,tarfile
from pathlib import Path
BASELINE='1b0bdb270a88e2540f79352cdb4f58730cff4c3c'
PRODUCT='SER-LIX-SAMOS2H'
SCOPE='SAMOS2H_V09R4_SELECTION_SAVE_OUTPUT_ORDER5_BATCH2_V1'
ALLOWED={'contracts/production/reviewed-ui-profiles/order5-batch2.v1.json', 'scripts/production/validate-order5-release.py', 'scripts/production/test_order5_batch2_scope.py', 'src/ui/web/app.js', 'contracts/production/authority-successors/order5-batch2.v1.json', 'contracts/production/order5-batch2-scope.v1.json', 'contracts/production/current-authority-successor.json', '.github/workflows/common-release-contract.yml', 'contracts/production/shared-release-authority.v1.json', 'contracts/production/authority-successors/order5-batch2-predecessor-selection.v1.json', 'contracts/production/work-connections.v2.json', 'contracts/production/release-profile.v1.json', 'scripts/production/order5-batch2-scope.py', 'src/ui/web/product-configuration-editor.mjs', 'scripts/production/validate-order4-release.py', 'contracts/production/shared-release-authority.v1.bundle', 'contracts/production/authority-successors/order5-batch2-predecessor-profile.v1.json', 'contracts/production/order5-batch2-assets.v1.json', 'scripts/production/release-contract.py', 'contracts/production/order5-batch2-assets/predecessor-ui.json', 'docs/ORDER5_BATCH2.md'}
SCOPE_FILE='contracts/production/order5-batch2-scope.v1.json'
def digest(b):return hashlib.sha256(b).hexdigest()
def validate(root):
 root=Path(root);errors=[];protected={}
 try:
  with tarfile.open(fileobj=io.BytesIO(subprocess.check_output(['git','archive',BASELINE],cwd=root))) as ar:before={m.name:ar.extractfile(m).read() for m in ar if m.isfile()}
  s=json.loads((root/SCOPE_FILE).read_text());assert s['schema']=='ORDER5_NATIVE_REVIEWED_UI_SCOPE_V1' and s['starting_main']==BASELINE and s['product_id']==PRODUCT and s['scope']==SCOPE and s['product_fact_mutation_allowed'] is False and set(s['allowed_paths'])==ALLOWED,'BATCH2_SCOPE_IDENTITY'
  protected={p:digest(b) for p,b in before.items() if p not in ALLOWED};assert s['protected_sha256']==protected,'INCOMPLETE_NATIVE_PROTECTION'
  for p,h in protected.items():assert (root/p).is_file() and not (root/p).is_symlink() and digest((root/p).read_bytes())==h,'PROTECTED_DRIFT:'+p
  changed=set(subprocess.check_output(['git','diff','--name-only',BASELINE],cwd=root,text=True).splitlines())|set(subprocess.check_output(['git','ls-files','--others','--exclude-standard'],cwd=root,text=True).splitlines());assert changed<=ALLOWED,'UNAUTHORIZED_NATIVE_PATH'
  pins=s['candidate_files_sha256'];assert set(pins)==ALLOWED-{SCOPE_FILE,'contracts/production/release-profile.v1.json','contracts/production/current-authority-successor.json','contracts/production/authority-successors/order5-batch2.v1.json'},'CANDIDATE_PIN_SET'
  for p,h in pins.items():assert (root/p).is_file() and not (root/p).is_symlink() and digest((root/p).read_bytes())==h,'CANDIDATE_BYTES_DRIFT:'+p
  assert (root/'contracts/production/authority-successors/order5-batch2-predecessor-profile.v1.json').read_bytes()==before['contracts/production/release-profile.v1.json'],'PREDECESSOR_PROFILE_DRIFT'
  assert (root/'contracts/production/authority-successors/order5-batch2-predecessor-selection.v1.json').read_bytes()==before['contracts/production/current-authority-successor.json'],'PREDECESSOR_SELECTOR_DRIFT'
  old=json.loads(before['contracts/production/release-profile.v1.json']);profile=json.loads((root/'contracts/production/release-profile.v1.json').read_text())
  for field in ['repository','destination','approval_roles','mandatory_approvals','gate_approval_roles','minimum_qa','required_ci','terminal_policy']:assert profile[field]==old[field],'RELEASE_GUARANTEE_CHANGED:'+field
  assert profile['publication_policy']['protected_files']==protected and profile['publication_policy']['mode']==old['publication_policy']['mode'] and profile['publication_policy']['auto_assign_custom_domains'] is False and not profile['publication_policy']['allowed_merge_differences'],'PUBLICATION_PROTECTION_CHANGED'
  assert profile['publication_policy']['native_qa_bindings']==s['native_qa_bindings'],'NATIVE_QA_BINDING_CHANGED'
  assert s['native_qa_bindings']=={'batch2_product': {'url_pointer': ['url'], 'sha_pointer': ['observed_commit'], 'claims': [{'pointer': ['schema'], 'value': 'ORDER5_BATCH2_EXECUTED_PRODUCT_QA_V1'}, {'pointer': ['status'], 'value': 'PASS'}, {'pointer': ['errors'], 'value': []}, {'pointer': ['product_id'], 'value': 'SER-LIX-SAMOS2H'}, {'pointer': ['scope'], 'value': 'SAMOS2H_V09R4_SELECTION_SAVE_OUTPUT_ORDER5_BATCH2_V1'}, {'pointer': ['viewports'], 'value': [1280, 768, 390]}, {'pointer': ['persistence'], 'value': 'BROWSER_LOCAL_STORAGE'}, {'pointer': ['runtime_errors'], 'value': 0}, {'pointer': ['candidate_ui_sha256'], 'value': {'src/ui/web/app.js': '8767f968393bd0dd3df15da9906525939002ca58ff5dca0560b744e1a85b39eb', 'src/ui/web/product-configuration-editor.mjs': '4d454860646085bdad132916217a470bb95daab6672944928b65eb8669b1b96d'}}], 'minimums': [{'pointer': ['case_count'], 'value': 3}], 'results_pointer': ['results'], 'result_state_key': 'status', 'count_pointer': ['case_count']}, 'release_identity': {'url_pointer': ['origin'], 'sha_pointer': ['commit'], 'claims': [{'pointer': ['status'], 'value': 'PASS'}]}},'NATIVE_QA_CONTRACT_CHANGED'
  assets=json.loads((root/'contracts/production/order5-batch2-assets.v1.json').read_text());admission=profile['scope_admission'];assert admission['mode']=='REVIEWED_UI_OUTPUT_SUCCESSOR_V1' and admission['product_id']==PRODUCT and admission['scope']==SCOPE and admission['product_fact_mutation_allowed'] is False,'RELEASE_SCOPE_MISMATCH'
  for k,v in assets['assets'].items():assert digest((root/v['path']).read_bytes())==v['sha256'] and {f:x for f,x in v.items() if f!='path'}==admission['asset_identities'][k],'RELEASE_ASSET_DRIFT:'+k
  assert all(assets['assets'][k]==assets['predecessor_assets'][k] for k in ['Source','Formal','Contract','Runtime']) and assets['assets']['UI']['sha256']!=assets['predecessor_assets']['UI']['sha256'],'FORMAL_RUNTIME_FACT_DRIFT'
  assert set(profile['native_paths'])==set(profile['native_files']) and set(old['native_paths'])<=set(profile['native_paths']),'NATIVE_DEPENDENCY_COVERAGE'
  for p,h in profile['native_files'].items():assert (root/p).is_file() and digest((root/p).read_bytes())==h,'NATIVE_IMPLEMENTATION_CHANGED:'+p
 except (AssertionError,OSError,KeyError,ValueError,subprocess.CalledProcessError) as e:errors.append(str(e))
 return {'status':'FAIL_CLOSED' if errors else 'PASS','errors':errors,'authorized_paths':sorted(ALLOWED) if not errors else [],'verified_unchanged_sha256':protected if not errors else {},'protected_files':len(protected),'product_id':PRODUCT,'scope':SCOPE,'product_fact_mutations':0,'completed_work':'INSPECT_ONLY','deployment':'NOT_EXECUTED'}
if __name__=='__main__':
 import sys
 d=validate(Path(__file__).resolve().parents[2]);print(json.dumps({k:v for k,v in d.items() if k not in ['authorized_paths','verified_unchanged_sha256']}));sys.exit(0 if d['status']=='PASS' else 2)
