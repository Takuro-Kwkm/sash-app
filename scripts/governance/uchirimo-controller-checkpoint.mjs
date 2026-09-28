// Controller bookkeeping only. Import never manufactures selector PASS evidence.
import {createHash} from 'node:crypto';
import {CONTROLLER_CONTRACT_VERSION,buildControllerState,sha256,recoveryUnitId,canonicalConstraints,validateSplitCertificate,validateRecoveryTree,synthesizeParentClosure} from './uchirimo-v11-recovery-controller.mjs';

const fail=message=>{throw new Error('UCHIRIMO_CHECKPOINT_'+message);};
const same=(a,b)=>sha256(a)===sha256(b);
export const parentPopulationHash=plan=>sha256(plan.partitions.map(row=>({shard:Number(row.shard),node_id:String(row.node_id),partition_key:String(row.partition_key),room_specification:String(row.room_specification),window_type:String(row.window_type),sash_configuration:String(row.sash_configuration),size_class:String(row.size_class),glass_family:String(row.glass_family),partition_seed_json:String(row.partition_seed_json)})));
export function checkpointTreeHash(units,certificates,parents){
 return sha256({
  units:Object.values(units).map(unit=>({parent_shard_index:unit.parent_shard_index,recovery_unit_id:unit.recovery_unit_id,parent_recovery_unit_id:unit.parent_recovery_unit_id,recovery_depth:unit.recovery_depth,decision_constraints_sha256:unit.decision_constraints_sha256,execution_class:unit.execution_class,infra_retry_count:unit.infra_retry_count,state:unit.state,proof_report_sha256:unit.proof_report_sha256??null,split_certificate_sha256:unit.split_certificate_sha256??null})).sort((a,b)=>a.parent_shard_index-b.parent_shard_index||a.recovery_depth-b.recovery_depth||a.recovery_unit_id.localeCompare(b.recovery_unit_id)),
  certificates:Object.values(certificates).map(row=>row.certificate_sha256).sort(),
  parents:Object.values(parents).map(row=>({parent_shard_index:row.parent_shard_index,status:row.status,recovery_tree_root_sha256:row.recovery_tree_root_sha256??null,proof_report_sha256:row.proof_report_sha256??null})).sort((a,b)=>a.parent_shard_index-b.parent_shard_index)
 });
}
export function validateCheckpoint({state,unitsEnvelope,certificatesEnvelope,parentsEnvelope,plan,expected}){
 const source=String(state.exact_head??'');
 if(!/^[0-9a-f]{40}$/.test(source))fail('HEAD_INVALID');
 for(const envelope of [state,unitsEnvelope,certificatesEnvelope,parentsEnvelope])if(envelope.controller_contract_version!==CONTROLLER_CONTRACT_VERSION||envelope.exact_head!==source)fail('ENVELOPE_IDENTITY_MISMATCH');
 if(!['DISPATCH_NEXT_GENERATION','FINAL_AGGREGATE','BLOCKED'].includes(state.next_action))fail('CHECKPOINT_NOT_ADVANCED');
 if(plan.status!=='PASS'||plan.partitions?.length!==3956||plan.shard_count!==3956)fail('PLAN_INVALID');
 const population=parentPopulationHash(plan);
 for(const field of ['runtime_manifest_sha256','execution_fingerprint','planner_fingerprint'])if(!expected[field]||state[field]!==expected[field])fail('INCOMPATIBLE_'+field);
 if(state.parent_population_count!==3956||state.parent_population_sha256!==population||parentsEnvelope.parent_population_sha256!==population)fail('POPULATION_MISMATCH');
 const rebuilt=buildControllerState({...state,prior_state_sha256:null});
 if(rebuilt.current_state_sha256!==state.current_state_sha256)fail('STATE_HASH_MISMATCH');
 const units=unitsEnvelope.units??{},certificates=certificatesEnvelope.certificates??{},parents=parentsEnvelope.parents??{};
 if(Object.keys(parents).length!==3956)fail('PARENT_COUNT_MISMATCH');
 if(checkpointTreeHash(units,certificates,parents)!==state.recovery_tree_root_hash)fail('TREE_HASH_MISMATCH');
 const byKey=new Map(plan.partitions.map(row=>[String(row.partition_key),row]));
 let closed=0,pass=0,normal=0,heavy=0,split=0;const blocked={};
 for(const [key,status] of Object.entries(parents)){
  const parent=byKey.get(key);if(!parent||status.parent_partition_key!==key||status.parent_shard_index!==parent.shard)fail('PARENT_IDENTITY_MISMATCH');
  if(!['OPEN','ROOT_PASS_CARRY_FORWARD','ROOT_PASS_FRESH','RECOVERY_TREE_PASS'].includes(status.status))fail('PARENT_STATUS_UNKNOWN');
  if(status.status==='ROOT_PASS_CARRY_FORWARD'){
   if(!status.current_carry_forward_run_id||!status.current_carry_forward_artifact_identity||!status.current_carry_forward_artifact_id||!status.current_carry_forward_artifact_digest)fail('CARRY_SOURCE_INCOMPLETE');
   closed++;continue;
  }
  const root=units[status.root_recovery_unit_id];if(!root||root.parent_partition_key!==key)fail('PARENT_ROOT_MISSING');
  if(status.status==='ROOT_PASS_FRESH'){if(root.state!=='PASS'||status.proof_report_sha256!==root.proof_report_sha256||!same(status.proof_report,root.proof_report))fail('ROOT_PROOF_MISMATCH');closed++;}
  if(status.status==='RECOVERY_TREE_PASS'){
   const tree=validateRecoveryTree({root_unit_id:root.recovery_unit_id,units,certificates});
   const synthesized=synthesizeParentClosure({parent,root_unit_id:root.recovery_unit_id,units,certificates,leaf_reports:Object.fromEntries(tree.leaf_ids.map(id=>[id,units[id].proof_report]))});
   if(!same(synthesized,status.synthesized_parent_report)||synthesized.recovery_tree_root_sha256!==status.recovery_tree_root_sha256)fail('SYNTHESIS_MISMATCH');closed++;
  }
 }
 for(const [id,unit] of Object.entries(units)){
  if(!byKey.has(unit.parent_partition_key)||id!==unit.recovery_unit_id||id!==recoveryUnitId(unit.parent_partition_key,unit.decision_constraints)||unit.decision_constraints_sha256!==sha256(canonicalConstraints(unit.decision_constraints)))fail('UNIT_IDENTITY_MISMATCH');
  if(unit.state==='PASS'){
   pass++;const proof=unit.proof_report;
   if(!proof||proof.status!=='PASS'||proof.exact_head!==source||proof.runtime_integrity_match!==true||proof.runtime_manifest_sha256!==state.runtime_manifest_sha256||proof.unverified_discrete_selector_case_count!==0||!unit.evidence_source_run_id||!unit.evidence_artifact_identity||!unit.proof_report_file||!/^[0-9a-f]{64}$/.test(unit.proof_report_sha256??''))fail('PASS_EVIDENCE_INCOMPLETE');
   if(proof.evidence_case_file_sha256!==proof.case_artifact_sha256)fail('CASE_HASH_MISMATCH');
   const rawProof=structuredClone(unit.source_proof_report??proof);delete rawProof.evidence_case_file_sha256;
   if(createHash('sha256').update(JSON.stringify(rawProof,null,2)+'\n').digest('hex')!==unit.proof_report_sha256)fail('RAW_PROOF_HASH_MISMATCH');
   const rebound={...rawProof,exact_head:source,evidence_case_file_sha256:rawProof.case_artifact_sha256};if(!same(rebound,proof))fail('REBOUND_PROOF_MISMATCH');
   if(Number(unit.recovery_depth)>0&&(proof.recovery_unit_id!==id||proof.decision_constraints_sha256!==unit.decision_constraints_sha256))fail('PROOF_UNIT_MISMATCH');
  }else if(unit.state==='PENDING_NORMAL')normal++;else if(unit.state==='PENDING_HEAVY')heavy++;else if(unit.state==='SPLIT_REQUIRED')split++;else if(String(unit.state).startsWith('BLOCKED_'))blocked[unit.state]=(blocked[unit.state]??0)+1;
 }
 for(const [id,cert] of Object.entries(certificates)){
  validateSplitCertificate(cert);
  if(cert.exact_head!==source||cert.runtime_manifest_sha256!==state.runtime_manifest_sha256||cert.proof_execution_fingerprint!==state.execution_fingerprint||cert.parent_recovery_unit_id!==id||units[id]?.split_certificate_sha256!==cert.certificate_sha256)fail('CERTIFICATE_IDENTITY_MISMATCH');
  for(const child of cert.children)if(!units[child.recovery_unit_id]||units[child.recovery_unit_id].parent_recovery_unit_id!==id||units[child.recovery_unit_id].decision_constraints_sha256!==child.decision_constraints_sha256)fail('CERTIFICATE_CHILD_MISSING');
 }
 if(closed!==state.closed_parent_count||3956-closed!==state.open_parent_count||pass!==state.pass_unit_count||normal!==state.pending_normal_count||heavy!==state.pending_heavy_count||split!==state.split_required_count)fail('COUNTER_MISMATCH');
 // BLOCKED_NO_PROGRESS is controller-level, not attached to a single unit.
 const expectedBlocked={...state.blocked_counts};delete expectedBlocked.BLOCKED_NO_PROGRESS;if(!same(blocked,expectedBlocked))fail('BLOCKED_COUNTER_MISMATCH');
 return {closed,pass,population,source};
}
export function importCompatibleCheckpoint(input){
 const {plan,expected,head,generation=0,source}=input;
 if(!/^[0-9a-f]{40}$/.test(head)||head!==plan.exact_head)fail('TARGET_HEAD_INVALID');
 if(source?.ancestor_verified!==true||source?.execution_files_identical!==true||!Number.isSafeInteger(source?.run_id)||source.run_id<=0||!Number.isSafeInteger(source?.artifact_id)||source.artifact_id<=0||!source.artifact_identity||!/^(?:sha256:)?[0-9a-f]{64}$/.test(source.artifact_digest??''))fail('SOURCE_VERIFICATION_REQUIRED');
 const validated=validateCheckpoint(input);
 const {state:old,unitsEnvelope:oldUnits,certificatesEnvelope:oldCerts,parentsEnvelope:oldParents}=input;
 const units=structuredClone(oldUnits.units),certificates=structuredClone(oldCerts.certificates),parents=structuredClone(oldParents.parents);
 const binding={status:'PASS',source_exact_head:old.exact_head,current_exact_head:head,source_controller_run_id:source.run_id,source_state_sha256:old.current_state_sha256,source_artifact_id:source.artifact_id,source_artifact_identity:source.artifact_identity,source_artifact_digest:'sha256:'+source.artifact_digest.replace(/^sha256:/,''),runtime_manifest_sha256:expected.runtime_manifest_sha256,execution_fingerprint:expected.execution_fingerprint,planner_fingerprint:expected.planner_fingerprint,parent_population_sha256:validated.population};
 const bindings=[...(old.compatible_head_bindings??[]),...(old.exact_head===head?[]:[binding])];
 for(const unit of Object.values(units))if(unit.state==='PASS'){unit.source_proof_report??=structuredClone(unit.proof_report);delete unit.source_proof_report.evidence_case_file_sha256;unit.proof_report={...unit.proof_report,exact_head:head};}
 for(const [id,cert] of Object.entries(certificates)){cert.exact_head=head;const body={...cert};delete body.certificate_sha256;cert.certificate_sha256=sha256(body);units[id].split_certificate_sha256=cert.certificate_sha256;}
 const byKey=new Map(plan.partitions.map(row=>[String(row.partition_key),row]));
 for(const [key,status] of Object.entries(parents)){
  if(status.status==='ROOT_PASS_FRESH')status.proof_report=units[status.root_recovery_unit_id].proof_report;
  if(status.status==='RECOVERY_TREE_PASS'){
   const tree=validateRecoveryTree({root_unit_id:status.root_recovery_unit_id,units,certificates});
   status.synthesized_parent_report=synthesizeParentClosure({parent:byKey.get(key),root_unit_id:status.root_recovery_unit_id,units,certificates,leaf_reports:Object.fromEntries(tree.leaf_ids.map(id=>[id,units[id].proof_report]))});
   status.recovery_tree_root_sha256=status.synthesized_parent_report.recovery_tree_root_sha256;
  }
 }
 const state=buildControllerState({...old,exact_head:head,generation,source_controller_run_id:source.run_id,recovery_tree_root_hash:checkpointTreeHash(units,certificates,parents),prior_state_sha256:old.current_state_sha256,compatible_head_bindings:bindings});
 if(state.closed_parent_count!==old.closed_parent_count||state.pass_unit_count!==old.pass_unit_count)fail('PROGRESS_REGRESSION');
 // Same-HEAD resume must not trigger no-progress solely because bookkeeping is unchanged.
 if(old.exact_head===head){state.blocked_counts=old.blocked_counts;Object.assign(state,buildControllerState({...state,prior_state_sha256:null}));state.prior_state_sha256=old.current_state_sha256;}
 const wrap=(original,key,value)=>({...original,exact_head:head,[key]:value});
 return {state,unitsEnvelope:wrap(oldUnits,'units',units),certificatesEnvelope:wrap(oldCerts,'certificates',certificates),parentsEnvelope:wrap(oldParents,'parents',parents),report:{status:'PASS',source_exact_head:old.exact_head,current_exact_head:head,source_run_id:source.run_id,preserved_closed_parent_count:old.closed_parent_count,preserved_pass_unit_count:old.pass_unit_count,preserved_unit_count:Object.keys(units).length,preserved_split_certificate_count:Object.keys(certificates).length,compute_execution_count:0}};
}
