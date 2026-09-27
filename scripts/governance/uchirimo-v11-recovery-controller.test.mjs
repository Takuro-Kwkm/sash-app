import assert from 'node:assert/strict';
import {
  CONTROLLER_CONTRACT_VERSION,
  recoveryUnitId,
  classifyExecutionResult,
  transitionUnit,
  chooseNextSplitAxis,
  buildSplitCertificate,
  validateSplitCertificate,
  validateRecoveryTree,
  scheduleLane,
  buildControllerState,
  sha256
} from './uchirimo-v11-recovery-controller.mjs';

const parent='UCH-X|insulating_glass|a="1"';
const rootId=recoveryUnitId(parent,[]);
assert.equal(rootId,recoveryUnitId(parent,[]));
assert.notEqual(rootId,recoveryUnitId(parent,[{field_key:'x',decision:{kind:'VALUE',value:'A'}}]));

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
