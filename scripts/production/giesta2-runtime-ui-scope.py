"""Bounded UI successor; reuse the existing immutable scope verifier."""
import hashlib,importlib.util,json
from pathlib import Path
PATH='contracts/production/giesta2-runtime-ui-scope.v1.json'
BASE='8618e395cd6181eb400dd68d4f0072387c480a08'
ALLOWED=set(['changes/giesta2-runtime-ui-r4/candidates/module.json', 'changes/giesta2-runtime-ui-r4/index.json', 'changes/giesta2-runtime-ui-r4/projection.json', 'changes/giesta2-runtime-ui-r4/review/browser-qa.json', 'changes/giesta2-runtime-ui-r4/review/carried-content-qa.json', 'changes/giesta2-runtime-ui-r4/review/flow.json', 'changes/giesta2-runtime-ui-r4/review/formal-provenance.json', 'changes/giesta2-runtime-ui-r4/review/saved-candidate-identity.json', 'changes/giesta2-runtime-ui-r4/sources/PRODUCT_MASTER.json', 'changes/giesta2-runtime-ui-r4/sources/UI_STANDARD_v2.1.docx', 'contracts/production/formal-state/current/LIXIL_GIESTA2_NON_FIRE.json', 'contracts/production/formal-state/formal/GIESTA2_R4_NATIVE_FORMAL_SUCCESSOR_20261016_R4/AUTHORITY.json', 'contracts/production/formal-state/formal/GIESTA2_R4_NATIVE_FORMAL_SUCCESSOR_20261016_R4/EVIDENCE.json', 'contracts/production/formal-state/formal/GIESTA2_R4_NATIVE_FORMAL_SUCCESSOR_20261016_R4/FORMAL_CONTENT_QA.json', 'contracts/production/formal-state/formal/GIESTA2_R4_NATIVE_FORMAL_SUCCESSOR_20261016_R4/FORMAL_REGISTRY_PROPOSAL.json', 'contracts/production/formal-state/formal/GIESTA2_R4_NATIVE_FORMAL_SUCCESSOR_20261016_R4/FORMAL_SELECTION_SCOPE.json', 'contracts/production/formal-state/formal/GIESTA2_R4_NATIVE_FORMAL_SUCCESSOR_20261016_R4/PRODUCT_MASTER.json', 'contracts/production/formal-state/formal/GIESTA2_R4_NATIVE_FORMAL_SUCCESSOR_20261016_R4/PRODUCT_MASTER_MANIFEST.json', 'contracts/production/formal-state/formal/GIESTA2_R4_NATIVE_FORMAL_SUCCESSOR_20261016_R4/PROMOTION_PLAN.json', 'contracts/production/formal-state/formal/GIESTA2_R4_NATIVE_FORMAL_SUCCESSOR_20261016_R4/ProductMaster_v0.8-R4.zip', 'contracts/production/formal-state/formal/GIESTA2_R4_NATIVE_FORMAL_SUCCESSOR_20261016_R4/SOURCE_BASELINE.json', 'contracts/production/formal-state/formal/GIESTA2_R4_NATIVE_FORMAL_SUCCESSOR_20261016_R4/completion.json', 'contracts/production/formal-state/formal/GIESTA2_R4_NATIVE_FORMAL_SUCCESSOR_20261016_R4/human-decision-source.json', 'contracts/production/formal-state/formal/GIESTA2_R4_NATIVE_FORMAL_SUCCESSOR_20261016_R4/human-decision.json', 'contracts/production/formal-state/formal/GIESTA2_R4_NATIVE_FORMAL_SUCCESSOR_20261016_R4/native-formal-readback.json', 'contracts/production/giesta2-runtime-ui-scope.v1.json', 'contracts/production/runtime-candidates/giesta2-nonfire-r4.profile.json', 'contracts/production/validator-registry.v2.json', 'contracts/production/work-connections.v2.json', 'docs/GIESTA2_RUNTIME_UI_R4.md', 'scripts/production/compile-tabular-projection.py', 'scripts/production/domain-runtime-candidate.py', 'scripts/production/giesta2-runtime-ui-scope.py', 'scripts/production/product-conditions-scope.py', 'scripts/production/validate-domain-runtime-connection.py', 'scripts/production/validate-tabular-runtime-projection.mjs', 'src/catalog/runtime-master/declared-selection-views.mjs'])
def validate(root):
 root=Path(root).resolve();s=importlib.util.spec_from_file_location('immutable_scope',root/'scripts/production/native-change-scope.py');g=importlib.util.module_from_spec(s);s.loader.exec_module(g);g.SCOPE_PATH=PATH
 result=g.validate(root)
 if result['status']!='PASS':return result
 try:
  scope=json.loads((root/PATH).read_bytes());assert scope['baseline_commit']==BASE and set(scope['allowed_paths'])==ALLOWED,'SCOPE_EXPANSION'
  before=g.snapshot(root,BASE);target='NATIVE_REGISTRY:LIXIL::ジエスタ2'
  for name in ['work-connections.v2.json','validator-registry.v2.json']:
   old=json.loads(before['contracts/production/'+name]);new=json.loads((root/'contracts/production'/name).read_bytes())
   assert {k:v for k,v in old.items() if k!='products'}=={k:v for k,v in new.items() if k!='products'},'ROUTING_POLICY_CHANGED'
   if isinstance(old['products'],list):
    assert [r for r in old['products'] if r['product_id']!=target]==[r for r in new['products'] if r['product_id']!=target],'OTHER_PRODUCT_CHANGED'
    a=next(r for r in old['products'] if r['product_id']==target);b=next(r for r in new['products'] if r['product_id']==target)
    keys={'runtime_candidate_profile','current_formal_version','formal_state_root','current_formal_selector'}
   else:
    assert {k:v for k,v in old['products'].items() if k!=target}=={k:v for k,v in new['products'].items() if k!=target},'OTHER_VALIDATOR_CHANGED'
    a=old['products'][target];b=new['products'][target];keys={'runtime_candidate_profile'}
   assert {k:v for k,v in a.items() if k not in keys}=={k:v for k,v in b.items() if k not in keys},'PRODUCT_MASTER_WORK_CHANGED'
  base=root/'contracts/production/formal-state';current=json.loads((base/'current/LIXIL_GIESTA2_NON_FIRE.json').read_bytes())
  assert current['lifecycle_state']=='FORMAL' and current['revision']=='v0.8-R4','FORMAL_IDENTITY'
  for p,h in current['artifacts'].items():assert hashlib.sha256((base/p).read_bytes()).hexdigest()==h,'FORMAL_BYTE_DRIFT:'+p
  decision=current['human_decision'];actual=json.loads((base/decision['path']).read_bytes())
  assert hashlib.sha256(json.dumps(actual,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()==decision['sha256'],'FORMAL_DECISION_CHANGED'
  master=(base/'formal/GIESTA2_R4_NATIVE_FORMAL_SUCCESSOR_20261016_R4/PRODUCT_MASTER.json').read_bytes()
  assert master==(root/'changes/giesta2-runtime-ui-r4/sources/PRODUCT_MASTER.json').read_bytes(),'PROJECTION_SOURCE_CHANGED'
  assert hashlib.sha256(master).hexdigest()=='8656beeb27ad8c7b44c85fc587b80af7db73340d721e6ea4c55bd31fe7dcd5bd','FORMAL_SOURCE_CHANGED'
  scopeqa=json.loads((base/'formal/GIESTA2_R4_NATIVE_FORMAL_SUCCESSOR_20261016_R4/FORMAL_CONTENT_QA.json').read_bytes());qa=json.loads((root/'changes/giesta2-runtime-ui-r4/review/carried-content-qa.json').read_bytes())
  assert scopeqa['formal_pass_count']==18 and qa['passed']==195 and len(json.loads(master)['confirmations'])==6,'CARRY_FORWARD_CHANGED'
  protected=scope['protected_sha256']
  return {**result,'scope':'GIESTA2_FORMAL_PROJECTION_AND_UI_REVIEW','authorized_paths':sorted(ALLOWED),'verified_unchanged_sha256':protected,'source_fact_mutations':0,'completed_formal':'INSPECT_ONLY','human_flow_review':'EXTERNAL_DECISION_REQUIRED','deployment':'NOT_EXECUTED'}
 except (AssertionError,OSError,ValueError,KeyError) as e:return {'status':'FAIL_CLOSED','errors':[str(e)],'authorized_paths':[],'verified_unchanged_sha256':{}}
if __name__=='__main__':
 import sys
 result=validate(Path(__file__).resolve().parents[2]);print(json.dumps({k:v for k,v in result.items() if k not in ('authorized_paths','verified_unchanged_sha256')}));sys.exit(0 if result['status']=='PASS' else 2)
