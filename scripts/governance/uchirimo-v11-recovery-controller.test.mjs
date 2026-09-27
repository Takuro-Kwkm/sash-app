import assert from 'node:assert/strict';
import {
  CONTROLLER_CONTRACT_VERSION,
  recoveryUnitId,
  recoveryEvidenceNames,
  classifyExecutionResult,
  transitionUnit,
  chooseNextSplitAxis,
  buildSplitCertificate,
  validateSplitCertificate,
  validateRecoveryTree,
  recoveryTreeHash,
  synthesizeParentClosure,
  scheduleLane,
  buildControllerState,
  sha256
} from './uchirimo-v11-recovery-controller.mjs';

const parent='UCH-X|insulating_glass|a="1"';
const rootId=recoveryUnitId(parent,[]);
assert.equal(rootId,recoveryUnitId(parent,[]));
assert.notEqual(rootId,recoveryUnitId(parent,[{field_key:'x',decision:{kind:'VALUE',value:'A'}}]));
const rootNames=recoveryEvidenceNames({parent_shard_index:7,recovery_unit_id:rootId});
const childId=recoveryUnitId(parent,[{field_key:'x',decision:{kind:'VALUE',value:'A'}}]);
const childNames=recoveryEvidenceNames({parent_shard_index:7,recovery_unit_id:childId});
assert.notEqual(rootNames.report,childNames.report);
assert.match(rootNames.report,/^unit-7-[0-9a-f]{64}-report\.json$/);
assert.throws(()=>recoveryEvidenceNames({parent_shard_index:7,recovery_unit_id:'bad'}),/UNIT_ID_INVALID/);

assert.equal(classifyExecutionResult({status:'PASS'}),'PASS');
assert.equal(classifyExecutionResult({status:'FAIL',timed_out:true}),'COMPUTE_RECOVERABLE');
assert.equal(classifyExecutionResult({status:'FAIL',error:'HTTP_502'}),'INFRA_TRANSIENT');
assert.equal(classifyExecutionResult({status:'FAIL',error:'UCHIRIMO_SHARD_RUNTIME_INTEGRITY_FAIL'}),'INTEGRITY_BLOCK');
assert.equal(classifyExecutionResult({status:'FAIL',error:'UCHIRIMO_UNMAPPED_UI_FIELD:x'}),'SEMANTIC_BLOCK');

let unit={execution_class:'NORMAL',infra_retry_count:0};
unit=transitionUnit(unit,'COMPUTE_RECOVERABLE');
assert.equal(unit.execution_class,'HEAVY');
assert.equal(unit.state,'PENDING_HEAVY');
unit=transitionUnit(unit,'COMPUTE_RECOVERABLE');
assert.equal(unit.state,'SPLIT_REQUIRED');

let infra={execution_class:'NORMAL',infra_retry_count:0};
infra=transitionUnit(infra,'INFRA_TRANSIENT');
assert.equal(infra.infra_retry_count,1);
infra=transitionUnit(infra,'INFRA_TRANSIENT');
assert.equal(infra.infra_retry_count,2);
infra=transitionUnit(infra,'INFRA_TRANSIENT');
assert.equal(infra.state,'BLOCKED_INFRA');

const axis=chooseNextSplitAxis([
  {key:'size_w',required:true,readOnly:false,dataType:'ENUM',values:[{value:'x'},{value:'y'}]},
  {key:'color',required:true,readOnly:false,dataType:'ENUM',values:[{value:'A'},{value:'B'}]},
  {key:'later',required:true,readOnly:false,dataType:'ENUM',values:[{value:'1'},{value:'2'}]}
],[]);
assert.equal(axis.field_key,'color');
assert.deepEqual(axis.values,['A','B']);

const cert=buildSplitCertificate({
  exact_head:'a'.repeat(40),
  runtime_manifest_sha256:'r',
  proof_execution_fingerprint:'p',
  parent_partition_key:parent,
  parent_recovery_unit_id:rootId,
  parent_constraints:[],
  split_field_key:'color',
  domain_values:['A','B'],
  parent_selection_sha256:'s'
});
assert.equal(cert.controller_contract_version,CONTROLLER_CONTRACT_VERSION);
assert.equal(validateSplitCertificate(cert),true);
const bad=structuredClone(cert);
bad.children.pop();
assert.throws(()=>validateSplitCertificate(bad),/CERTIFICATE_HASH_MISMATCH/);
const structurallyBad=structuredClone(cert);
structurallyBad.children.pop();
const structurallyBadBody={...structurallyBad};
delete structurallyBadBody.certificate_sha256;
structurallyBad.certificate_sha256=sha256(structurallyBadBody);
assert.throws(()=>validateSplitCertificate(structurallyBad),/CHILD_COUNT_MISMATCH/);
assert.throws(()=>buildSplitCertificate({
  exact_head:'a'.repeat(40),
  runtime_manifest_sha256:'r',
  proof_execution_fingerprint:'p',
  parent_partition_key:parent,
  parent_recovery_unit_id:'wrong',
  parent_constraints:[],
  split_field_key:'color',
  domain_values:['A','B'],
  parent_selection_sha256:'s'
}),/PARENT_UNIT_ID_MISMATCH/);

const units={
  [rootId]:{state:'PENDING_CHILDREN'},
  [cert.children[0].recovery_unit_id]:{state:'PASS'},
  [cert.children[1].recovery_unit_id]:{state:'PASS'}
};
const tree=validateRecoveryTree({root_unit_id:rootId,units,certificates:{[rootId]:cert}});
assert.equal(tree.closed,true);
assert.equal(tree.leaf_ids.length,2);
units[cert.children[1].recovery_unit_id]={state:'PENDING_HEAVY'};
assert.equal(validateRecoveryTree({root_unit_id:rootId,units,certificates:{[rootId]:cert}}).closed,false);

units[cert.children[1].recovery_unit_id]={state:'PASS'};
const leafReports=Object.fromEntries(cert.children.map((child,index)=>[child.recovery_unit_id,{
  status:'PASS',
  unverified_discrete_selector_case_count:0,
  recovery_unit_id:child.recovery_unit_id,
  parent_shard_index:7,
  parent_partition_key:parent,
  decision_constraints_sha256:child.decision_constraints_sha256,
  exact_head:'a'.repeat(40),
  runtime_manifest_sha256:'r',
  runtime_integrity_match:true,
  terminal_context_count:10+index,
  visited_state_count:100+index,
  transition_check_count:200+index,
  dependency_rejection_count:index,
  downstream_clear_event_count:index+1,
  resolver_cache_hits:5,
  resolver_cache_misses:7,
  max_stack_depth:3+index,
  observed_peak_heap_mb:40+index,
  flow_signature_sha256s:['f'+index],
  case_artifact:'unit-'+index+'.jsonl',
  case_artifact_sha256:String(index+1).repeat(64).slice(0,64)
}]));
const parentRow={shard:7,partition_key:parent,node_id:'UCH-X',partition_seed_json:'{}',glass_family:'insulating_glass',window_type:'sliding_window'};
const synthesized=synthesizeParentClosure({parent:parentRow,root_unit_id:rootId,units,certificates:{[rootId]:cert},leaf_reports:leafReports});
assert.equal(synthesized.status,'PASS');
assert.equal(synthesized.recovery_leaf_count,2);
assert.equal(synthesized.terminal_context_count,21);
assert.equal(synthesized.partition_key,parent);
assert.equal(synthesized.recovery_tree_root_sha256,recoveryTreeHash({root_unit_id:rootId,units,certificates:{[rootId]:cert}}));
const badLeaf=structuredClone(leafReports);
badLeaf[cert.children[0].recovery_unit_id].parent_partition_key='wrong';
assert.throws(()=>synthesizeParentClosure({parent:parentRow,root_unit_id:rootId,units,certificates:{[rootId]:cert},leaf_reports:badLeaf}),/LEAF_PARTITION_MISMATCH/);

const normals=Array.from({length:258},(_,i)=>({parent_shard_index:i,recovery_depth:0,recovery_unit_id:'n'+String(i).padStart(3,'0'),execution_class:'NORMAL'}));
const plan=scheduleLane(normals);
assert.equal(plan.effective_normal_batch_size,2);
assert.equal(plan.scheduled.length,129);
assert.equal(plan.deferred.length,0);

const capacity=[
  ...Array.from({length:250},(_,i)=>({parent_shard_index:i,recovery_depth:0,recovery_unit_id:'h'+i,execution_class:'HEAVY'})),
  ...Array.from({length:20},(_,i)=>({parent_shard_index:300+i,recovery_depth:0,recovery_unit_id:'n'+i,execution_class:'NORMAL'}))
];
const wave=scheduleLane(capacity);
assert.equal(wave.effective_normal_batch_size,2);
assert.equal(wave.scheduled.length,256);
assert.equal(wave.deferred.length,4);
assert.equal(wave.deferred_unit_count,8);

const state=buildControllerState({
  exact_head:'b'.repeat(40),
  generation:2,
  parent_population_count:3956,
  parent_population_sha256:'pop',
  runtime_manifest_sha256:'run',
  execution_fingerprint:'exec',
  planner_fingerprint:'plan',
  closed_parent_count:3900,
  open_parent_count:56,
  pass_unit_count:4000,
  pending_normal_count:10,
  pending_heavy_count:20,
  split_required_count:1,
  deferred_count:25,
  blocked_counts:{}
});
assert.equal(state.next_action,'EXECUTE');

const noProgress=buildControllerState({
  exact_head:'b'.repeat(40),
  generation:3,
  parent_population_count:3956,
  parent_population_sha256:'pop',
  runtime_manifest_sha256:'run',
  execution_fingerprint:'exec',
  planner_fingerprint:'plan',
  closed_parent_count:3900,
  open_parent_count:56,
  pass_unit_count:4000,
  pending_normal_count:10,
  pending_heavy_count:20,
  split_required_count:1,
  deferred_count:25,
  blocked_counts:{},
  prior_state_sha256:state.current_state_sha256
});
assert.equal(noProgress.next_action,'BLOCKED');
assert.equal(noProgress.blocked_counts.BLOCKED_NO_PROGRESS,1);

assert.throws(()=>scheduleLane([{parent_shard_index:0,recovery_depth:0,recovery_unit_id:'x',execution_class:'UNKNOWN'}]),/EXECUTION_CLASS_INVALID/);

console.log('UCHIRIMO_V12_DETERMINISTIC_CONTROLLER_TEST=PASS');
