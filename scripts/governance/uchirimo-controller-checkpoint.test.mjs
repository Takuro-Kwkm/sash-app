// Synthetic checkpoint mechanics tests; never product QA evidence.
import assert from 'node:assert/strict';
import {createHash}from'node:crypto';
import {CONTROLLER_CONTRACT_VERSION,buildControllerState,buildSplitCertificate,recoveryUnitId,sha256,synthesizeParentClosure} from './uchirimo-v11-recovery-controller.mjs';
import {parentPopulationHash,checkpointTreeHash,importCompatibleCheckpoint,validateCheckpoint,checkpointCoverage} from './uchirimo-controller-checkpoint.mjs';
const old='a'.repeat(40),head='b'.repeat(40),runtime='c'.repeat(64),execution='d'.repeat(64);
const plan={status:'PASS',exact_head:head,shard_count:3956,partitions:Array.from({length:3956},(_,shard)=>({shard,node_id:'FIXTURE',partition_key:'FIXTURE-'+shard,room_specification:'fixture',window_type:'fixture',sash_configuration:'__UNSET__',size_class:'__UNSET__',glass_family:'fixture',partition_seed_json:'{}'}))};
const parents=Object.fromEntries(plan.partitions.map(p=>[p.partition_key,{parent_shard_index:p.shard,parent_partition_key:p.partition_key,status:'ROOT_PASS_CARRY_FORWARD',closure_type:'ROOT_PASS',current_carry_forward_run_id:1,current_carry_forward_artifact_identity:'fixture-carry',current_carry_forward_artifact_id:2,current_carry_forward_artifact_digest:'sha256:'+'f'.repeat(64)}]));
const units={},certificates={};
const root=(p,state)=>{const id=recoveryUnitId(p.partition_key,[]);return {controller_contract_version:CONTROLLER_CONTRACT_VERSION,parent_shard_index:p.shard,parent_partition_key:p.partition_key,recovery_unit_id:id,parent_recovery_unit_id:null,recovery_depth:0,decision_constraints:[],decision_constraints_sha256:sha256([]),state,execution_class:'NORMAL',infra_retry_count:0};};
function proof(unit){return {status:'PASS',exact_head:old,shard_index:unit.parent_shard_index,parent_shard_index:unit.parent_shard_index,partition_key:unit.parent_partition_key,parent_partition_key:unit.parent_partition_key,recovery_unit_id:unit.recovery_unit_id,decision_constraints_sha256:unit.decision_constraints_sha256,runtime_integrity_match:true,runtime_manifest_sha256:runtime,unverified_discrete_selector_case_count:0,case_artifact:'fixture-'+unit.recovery_unit_id+'.jsonl',case_artifact_sha256:'e'.repeat(64),evidence_case_file_sha256:'e'.repeat(64),terminal_context_count:1,visited_state_count:1,transition_check_count:1,flow_signature_sha256s:['FIXTURE']};}
function pass(unit){const p=proof(unit),raw={...p};delete raw.evidence_case_file_sha256;const h=createHash('sha256').update(JSON.stringify(raw,null,2)+'\n').digest('hex');return {...unit,state:'PASS',proof_report:p,proof_report_sha256:h,proof_report_file:'fixture-'+unit.recovery_unit_id+'.json',evidence_source_run_id:7,evidence_artifact_identity:'fixture-artifact'};}
for(const n of [0,1]){
 const p=plan.partitions[n],u=root(p,'PENDING_CHILDREN');units[u.recovery_unit_id]=u;
 const cert=buildSplitCertificate({exact_head:old,runtime_manifest_sha256:runtime,proof_execution_fingerprint:execution,parent_partition_key:p.partition_key,parent_recovery_unit_id:u.recovery_unit_id,split_field_key:'fixture-axis',domain_values:['x','y'],parent_selection_sha256:'0'.repeat(64)});
 certificates[u.recovery_unit_id]=cert;u.split_certificate_sha256=cert.certificate_sha256;
 for(const [i,c]of cert.children.entries()){const child={...root(p,'PENDING_NORMAL'),recovery_unit_id:c.recovery_unit_id,parent_recovery_unit_id:u.recovery_unit_id,recovery_depth:1,decision_constraints:c.constraints,decision_constraints_sha256:c.decision_constraints_sha256};units[c.recovery_unit_id]=n===0||i===0?pass(child):child;}
 parents[p.partition_key]={parent_shard_index:n,parent_partition_key:p.partition_key,status:'OPEN',closure_type:null,root_recovery_unit_id:u.recovery_unit_id};
 if(n===0){const synthesized=synthesizeParentClosure({parent:p,root_unit_id:u.recovery_unit_id,units,certificates,leaf_reports:Object.fromEntries(cert.children.map(c=>[c.recovery_unit_id,units[c.recovery_unit_id].proof_report]))});Object.assign(parents[p.partition_key],{status:'RECOVERY_TREE_PASS',closure_type:'RECOVERY_TREE_PASS',synthesized_parent_report:synthesized,recovery_tree_root_sha256:synthesized.recovery_tree_root_sha256});}
}
const population=parentPopulationHash(plan),planner=sha256({controller_contract_version:CONTROLLER_CONTRACT_VERSION,parent_population_sha256:population});
const state=buildControllerState({exact_head:old,generation:9,parent_population_count:3956,parent_population_sha256:population,runtime_manifest_sha256:runtime,execution_fingerprint:execution,planner_fingerprint:planner,closed_parent_count:3955,open_parent_count:1,pass_unit_count:3,pending_normal_count:1,blocked_counts:{},recovery_tree_root_hash:checkpointTreeHash(units,certificates,parents),after_generation:true});
const envelope=(key,value)=>({controller_contract_version:CONTROLLER_CONTRACT_VERSION,exact_head:old,[key]:value});
const input={state,unitsEnvelope:envelope('units',units),certificatesEnvelope:envelope('certificates',certificates),parentsEnvelope:{...envelope('parents',parents),parent_population_sha256:population},plan,expected:{runtime_manifest_sha256:runtime,execution_fingerprint:execution,planner_fingerprint:planner},head,source:{ancestor_verified:true,execution_files_identical:true,run_id:7,artifact_id:8,artifact_identity:'fixture-state',artifact_digest:'sha256:'+'9'.repeat(64)}};
const before=structuredClone(input);const migrated=importCompatibleCheckpoint(input);
assert.deepEqual(input,before);assert.equal(migrated.state.closed_parent_count,3955);assert.equal(migrated.state.pass_unit_count,3);assert.equal(migrated.state.pending_normal_count,1);
for(const [id,u]of Object.entries(units)){const a=migrated.unitsEnvelope.units[id];assert.equal(a.state,u.state);assert.equal(a.proof_report_sha256,u.proof_report_sha256);assert.equal(a.evidence_source_run_id,u.evidence_source_run_id);assert.equal(a.evidence_artifact_identity,u.evidence_artifact_identity);if(u.state==='PASS')assert.equal(a.proof_report.exact_head,head);}
assert.equal(migrated.state.compatible_head_bindings.length,1);assert.equal(migrated.state.next_action,'EXECUTE');
// A subsequent advance produces DISPATCH_NEXT_GENERATION; second migration keeps complete chain.
const secondHead='1'.repeat(40),secondState={...migrated.state,next_action:'DISPATCH_NEXT_GENERATION'};
const second=importCompatibleCheckpoint({...input,...migrated,state:secondState,head:secondHead,plan:{...plan,exact_head:secondHead},source:{...input.source,run_id:9,artifact_id:10}});
assert.equal(second.state.compatible_head_bindings.length,2);assert.equal(second.state.closed_parent_count,3955);
for(const field of ['runtime_manifest_sha256','execution_fingerprint','planner_fingerprint'])assert.throws(()=>importCompatibleCheckpoint({...input,expected:{...input.expected,[field]:'0'.repeat(64)}}),/INCOMPATIBLE/);
assert.throws(()=>importCompatibleCheckpoint({...input,state:{...state,closed_parent_count:3956}}),/STATE_HASH/);
const broken=structuredClone(input);delete broken.unitsEnvelope.units[Object.keys(units)[1]];assert.throws(()=>importCompatibleCheckpoint(broken),/TREE_HASH/);
const certBad=structuredClone(input);Object.values(certBad.certificatesEnvelope.certificates)[0].certificate_sha256='0'.repeat(64);assert.throws(()=>importCompatibleCheckpoint(certBad),/TREE_HASH|CERTIFICATE/);
assert.throws(()=>importCompatibleCheckpoint({...input,source:{...input.source,artifact_digest:''}}),/SOURCE_VERIFICATION/);
assert.throws(()=>importCompatibleCheckpoint({...input,source:{...input.source,execution_files_identical:false}}),/SOURCE_VERIFICATION/);
const noProgress={...input,state:buildControllerState({...state,blocked_counts:{BLOCKED_NO_PROGRESS:1},prior_state_sha256:null})};
const blocked=importCompatibleCheckpoint({...noProgress,head:old,plan:{...plan,exact_head:old}});assert.equal(blocked.state.next_action,'BLOCKED');assert.equal(blocked.state.blocked_counts.BLOCKED_NO_PROGRESS,1);
// A prior unsplit PASS and a newer fully certified subtree prove the same domain.
const priorUnsplit=structuredClone(input),p0=plan.partitions[0],root0=recoveryUnitId(p0.partition_key,[]);
priorUnsplit.unitsEnvelope.units[root0]=pass(priorUnsplit.unitsEnvelope.units[root0]);
const rootPass=priorUnsplit.unitsEnvelope.units[root0];
priorUnsplit.parentsEnvelope.parents[p0.partition_key]={parent_shard_index:0,parent_partition_key:p0.partition_key,status:'ROOT_PASS_FRESH',closure_type:'ROOT_PASS',root_recovery_unit_id:root0,proof_report:rootPass.proof_report,proof_report_sha256:rootPass.proof_report_sha256};
priorUnsplit.state=buildControllerState({...state,pass_unit_count:4,recovery_tree_root_hash:checkpointTreeHash(priorUnsplit.unitsEnvelope.units,priorUnsplit.certificatesEnvelope.certificates,priorUnsplit.parentsEnvelope.parents),after_generation:true});
const importedUnsplit=importCompatibleCheckpoint(priorUnsplit);
const coverage=checkpointCoverage(migrated,importedUnsplit);assert.equal(coverage.dominates,true);
const mapped=coverage.covered_prior_pass_evidence.find(row=>row.prior_recovery_unit_id===root0);
assert.equal(mapped.coverage.coverage_type,'CERTIFIED_SUBTREE_PASS');assert.equal(mapped.coverage.covering_leaf_evidence.length,2);assert.equal(mapped.coverage.covering_split_certificates.length,1);
// One unproved child invalidates the claimed coverage, even if stale parent metadata says closed.
const incomplete=structuredClone(migrated),missingChild=certificates[root0].children[0].recovery_unit_id;
incomplete.unitsEnvelope.units[missingChild].state='PENDING_NORMAL';
const missingCoverage=checkpointCoverage(incomplete,importedUnsplit);assert.equal(missingCoverage.dominates,false);assert.ok(missingCoverage.uncovered.some(row=>row.id===root0));
// A newer verified ancestor PASS covers an older split; children are never replayed.
assert.equal(checkpointCoverage(importedUnsplit,migrated).dominates,true);
assert.ok(checkpointCoverage(importedUnsplit,migrated).covered_prior_split_evidence.some(row=>row.prior_recovery_unit_id===root0&&row.coverage.coverage_type==='EXACT_UNIT_PASS'));
console.log('UCHIRIMO_COMPATIBLE_CHECKPOINT_TEST=PASS synthetic preservation/lineage/mismatch/corruption/no-progress/certified-subtree-dominance/incomplete-subtree-rejection; NOT_PRODUCT_QA_EVIDENCE');
