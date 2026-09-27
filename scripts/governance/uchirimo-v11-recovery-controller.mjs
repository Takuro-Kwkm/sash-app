import { createHash } from 'node:crypto';

export const CONTROLLER_CONTRACT_VERSION='UCHIRIMO_V12_DETERMINISTIC_RECOVERY_CONTROLLER_V1';
export const MATRIX_LIMIT=256;
export const MAX_NORMAL_BATCH_SIZE=2;
export const MAX_INFRA_RETRIES=2;
export const MAX_AUTOMATIC_GENERATIONS=12;

const TECHNICAL_KEYS=new Set(['legacyConstruction','legacyConfiguration','internal_construction']);
const CONTINUOUS_KEYS=new Set(['size_w','size_h','frame_projection','fukashi_dimension','custom_w','custom_h','custom_width','custom_height']);

export function stable(value){
  if(Array.isArray(value))return value.map(stable);
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,stable(v)]));
}
export const stableJson=(value)=>JSON.stringify(stable(value));
export const sha256=(value)=>createHash('sha256').update(typeof value==='string'?value:stableJson(value)).digest('hex');

export function canonicalConstraints(constraints=[]){
  if(!Array.isArray(constraints))throw new Error('RECOVERY_CONSTRAINTS_INVALID');
  const seen=new Set();
  return constraints.map((entry,index)=>{
    const fieldKey=String(entry?.field_key??'');
    const decision=stable(entry?.decision);
    if(!fieldKey||!decision||!['VALUE','UNSET'].includes(String(decision.kind??'')))throw new Error('RECOVERY_CONSTRAINT_INVALID:'+index);
    if(seen.has(fieldKey))throw new Error('RECOVERY_CONSTRAINT_DUPLICATE_FIELD:'+fieldKey);
    seen.add(fieldKey);
    return {field_key:fieldKey,decision};
  });
}

export function recoveryUnitId(parentPartitionKey,constraints=[]){
  const key=String(parentPartitionKey??'');
  if(!key)throw new Error('RECOVERY_PARENT_PARTITION_KEY_REQUIRED');
  return sha256(key+'\0'+stableJson(canonicalConstraints(constraints)));
}

export function recoveryEvidenceNames({parent_shard_index,recovery_unit_id}){
  const shard=Number(parent_shard_index);
  const unitId=String(recovery_unit_id??'');
  if(!Number.isInteger(shard)||shard<0)throw new Error('RECOVERY_EVIDENCE_PARENT_SHARD_INVALID');
  if(!/^[0-9a-f]{64}$/.test(unitId))throw new Error('RECOVERY_EVIDENCE_UNIT_ID_INVALID');
  const prefix='unit-'+shard+'-'+unitId;
  return {
    prefix,
    start:prefix+'-start.json',
    progress:prefix+'-progress.json',
    failure:prefix+'-failure.json',
    report:prefix+'-report.json',
    terminal_digests:prefix+'-terminal-digests.jsonl'
  };
}

export function classifyExecutionResult(result={}){
  if(result.status==='PASS'&&result.timed_out!==true)return 'PASS';
  const code=String(result.code??'');
  const message=String(result.error??result.message??'');
  if(result.timed_out===true||/UCHIRIMO_(?:CONSTRAINT_)?CHILD_TIMEOUT|STATE_LIMIT_REACHED|TERMINAL_LIMIT_REACHED/.test(code+' '+message))return 'COMPUTE_RECOVERABLE';
  if(/(?:HTTP_)?(?:429|500|502|503|504)\b|ECONNRESET|ETIMEDOUT|EAI_AGAIN|SERVICE_UNAVAILABLE|GITHUB_API_TRANSIENT/.test(code+' '+message))return 'INFRA_TRANSIENT';
  if(/HASH_MISMATCH|EXACT_HEAD_MISMATCH|DEPENDENCY_.*MISMATCH|IDENTITY_MISMATCH|DUPLICATE_PARTITION|COVERAGE_MISMATCH|RUNTIME_INTEGRITY/.test(code+' '+message))return 'INTEGRITY_BLOCK';
  return 'SEMANTIC_BLOCK';
}

export function transitionUnit(unit,event){
  const executionClass=String(unit?.execution_class??'NORMAL');
  const infraRetries=Number(unit?.infra_retry_count??0);
  if(!['NORMAL','HEAVY'].includes(executionClass))throw new Error('RECOVERY_EXECUTION_CLASS_INVALID:'+executionClass);
  if(event==='PASS')return {...unit,state:'PASS',next_action:'NONE'};
  if(event==='COMPUTE_RECOVERABLE'){
    if(executionClass==='NORMAL')return {...unit,state:'PENDING_HEAVY',execution_class:'HEAVY',next_action:'PROMOTE_HEAVY'};
    return {...unit,state:'SPLIT_REQUIRED',next_action:'SPLIT'};
  }
  if(event==='INFRA_TRANSIENT'){
    if(infraRetries<MAX_INFRA_RETRIES)return {...unit,state:executionClass==='HEAVY'?'PENDING_HEAVY':'PENDING_NORMAL',infra_retry_count:infraRetries+1,next_action:'RETRY_SAME_UNIT'};
    return {...unit,state:'BLOCKED_INFRA',next_action:'BLOCKED'};
  }
  if(event==='INTEGRITY_BLOCK')return {...unit,state:'BLOCKED_INTEGRITY',next_action:'BLOCKED'};
  return {...unit,state:'BLOCKED_SEMANTIC',next_action:'BLOCKED'};
}

function enabledEnumValues(field){
  return [...new Map((field?.values??[])
    .filter((entry)=>entry.disabled!==true)
    .map((entry)=>[stableJson(entry.value),entry.value])).values()];
}

export function chooseNextSplitAxis(fields=[],fixedKeys=[]){
  const fixed=new Set([...fixedKeys].map(String));
  for(const field of fields??[]){
    const key=String(field?.key??'');
    if(!key||fixed.has(key)||TECHNICAL_KEYS.has(key)||CONTINUOUS_KEYS.has(key))continue;
    if(field.required!==true||field.readOnly===true||field.dataType!=='ENUM')continue;
    const values=enabledEnumValues(field);
    if(values.length>1)return {field_key:key,values:values.map(stable)};
  }
  return null;
}

export function buildSplitCertificate({
  exact_head,
  runtime_manifest_sha256,
  proof_execution_fingerprint,
  parent_partition_key,
  parent_recovery_unit_id,
  parent_constraints=[],
  split_field_key,
  domain_values=[],
  parent_selection_sha256
}){
  const constraints=canonicalConstraints(parent_constraints);
  const fieldKey=String(split_field_key??'');
  if(!fieldKey||constraints.some((entry)=>entry.field_key===fieldKey))throw new Error('RECOVERY_SPLIT_FIELD_INVALID:'+fieldKey);
  const values=[...new Map((domain_values??[]).map((value)=>[stableJson(value),stable(value)])).values()];
  if(values.length<2)throw new Error('RECOVERY_SPLIT_DOMAIN_TOO_SMALL');
  const children=values.map((value)=>{
    const childConstraints=[...constraints,{field_key:fieldKey,decision:{kind:'VALUE',value}}];
    return {
      decision:value,
      decision_sha256:sha256(value),
      constraints:childConstraints,
      decision_constraints_sha256:sha256(childConstraints),
      recovery_unit_id:recoveryUnitId(parent_partition_key,childConstraints)
    };
  });
  const computedParentUnitId=recoveryUnitId(parent_partition_key,constraints);
  if(parent_recovery_unit_id&&String(parent_recovery_unit_id)!==computedParentUnitId)throw new Error('RECOVERY_SPLIT_PARENT_UNIT_ID_MISMATCH');
  const body={
    schema_version:'1.0.0',
    controller_contract_version:CONTROLLER_CONTRACT_VERSION,
    exact_head:String(exact_head??''),
    runtime_manifest_sha256:String(runtime_manifest_sha256??''),
    proof_execution_fingerprint:String(proof_execution_fingerprint??''),
    parent_partition_key:String(parent_partition_key??''),
    parent_recovery_unit_id:computedParentUnitId,
    parent_constraints:constraints,
    parent_constraints_sha256:sha256(constraints),
    split_field_key:fieldKey,
    split_field_domain_sha256:sha256(values),
    domain_values:values,
    children,
    parent_selection_sha256:String(parent_selection_sha256??'')
  };
  return {...body,certificate_sha256:sha256(body)};
}

export function validateSplitCertificate(certificate){
  if(certificate?.controller_contract_version!==CONTROLLER_CONTRACT_VERSION)throw new Error('RECOVERY_SPLIT_CONTRACT_MISMATCH');
  const body={...certificate}; delete body.certificate_sha256;
  if(sha256(body)!==certificate.certificate_sha256)throw new Error('RECOVERY_SPLIT_CERTIFICATE_HASH_MISMATCH');
  const constraints=canonicalConstraints(certificate.parent_constraints??[]);
  if(sha256(constraints)!==certificate.parent_constraints_sha256)throw new Error('RECOVERY_PARENT_CONSTRAINT_HASH_MISMATCH');
  const values=[...new Map((certificate.domain_values??[]).map((value)=>[stableJson(value),stable(value)])).values()];
  if(values.length<2||sha256(values)!==certificate.split_field_domain_sha256)throw new Error('RECOVERY_SPLIT_DOMAIN_MISMATCH');
  if((certificate.children??[]).length!==values.length)throw new Error('RECOVERY_SPLIT_CHILD_COUNT_MISMATCH');
  const expected=new Map(values.map((value)=>[stableJson(value),value]));
  const childIds=new Set();
  for(const child of certificate.children??[]){
    const key=stableJson(child.decision);
    if(!expected.has(key))throw new Error('RECOVERY_SPLIT_CHILD_OUT_OF_DOMAIN');
    expected.delete(key);
    const childConstraints=[...constraints,{field_key:certificate.split_field_key,decision:{kind:'VALUE',value:stable(child.decision)}}];
    const expectedId=recoveryUnitId(certificate.parent_partition_key,childConstraints);
    if(expectedId!==child.recovery_unit_id)throw new Error('RECOVERY_SPLIT_CHILD_ID_MISMATCH');
    if(sha256(childConstraints)!==child.decision_constraints_sha256)throw new Error('RECOVERY_SPLIT_CHILD_CONSTRAINT_HASH_MISMATCH');
    if(childIds.has(expectedId))throw new Error('RECOVERY_SPLIT_CHILD_DUPLICATE');
    childIds.add(expectedId);
  }
  if(expected.size)throw new Error('RECOVERY_SPLIT_DOMAIN_GAP');
  return true;
}

export function validateRecoveryTree({root_unit_id,units={},certificates={}}){
  const visiting=new Set();
  const visit=(unitId)=>{
    if(visiting.has(unitId))throw new Error('RECOVERY_TREE_CYCLE:'+unitId);
    const unit=units[unitId];
    if(!unit)throw new Error('RECOVERY_TREE_UNIT_MISSING:'+unitId);
    if(unit.state==='PASS')return {leaf_ids:[unitId],closed:true};
    if(unit.state!=='PENDING_CHILDREN'&&unit.state!=='SPLIT_REQUIRED')return {leaf_ids:[],closed:false};
    const certificate=certificates[unitId];
    if(!certificate)return {leaf_ids:[],closed:false};
    validateSplitCertificate(certificate);
    if(certificate.parent_recovery_unit_id!==unitId)throw new Error('RECOVERY_TREE_CERTIFICATE_PARENT_MISMATCH:'+unitId);
    visiting.add(unitId);
    const leaves=[];
    for(const child of certificate.children){
      const result=visit(child.recovery_unit_id);
      if(!result.closed){visiting.delete(unitId);return {leaf_ids:[],closed:false};}
      leaves.push(...result.leaf_ids);
    }
    visiting.delete(unitId);
    return {leaf_ids:leaves.sort(),closed:true};
  };
  return visit(root_unit_id);
}

export function recoveryTreeHash({root_unit_id,units={},certificates={}}){
  const seen=new Set();
  const visit=(unitId)=>{
    if(seen.has(unitId))throw new Error('RECOVERY_TREE_HASH_CYCLE:'+unitId);
    seen.add(unitId);
    const unit=units[unitId];
    if(!unit)throw new Error('RECOVERY_TREE_HASH_UNIT_MISSING:'+unitId);
    const certificate=certificates[unitId]??null;
    if(certificate)validateSplitCertificate(certificate);
    const children=certificate
      ? certificate.children.map((child)=>visit(child.recovery_unit_id))
      : [];
    seen.delete(unitId);
    return {
      recovery_unit_id:unitId,
      state:String(unit.state??''),
      execution_class:String(unit.execution_class??''),
      decision_constraints_sha256:String(unit.decision_constraints_sha256??''),
      certificate_sha256:certificate?.certificate_sha256??null,
      children
    };
  };
  return sha256(visit(root_unit_id));
}

export function synthesizeParentClosure({
  parent,
  root_unit_id,
  units={},
  certificates={},
  leaf_reports={}
}){
  const parentShard=Number(parent?.shard);
  const parentKey=String(parent?.partition_key??'');
  if(!Number.isInteger(parentShard)||parentShard<0||!parentKey)throw new Error('RECOVERY_PARENT_IDENTITY_INVALID');
  const tree=validateRecoveryTree({root_unit_id,units,certificates});
  if(!tree.closed)throw new Error('RECOVERY_PARENT_TREE_NOT_CLOSED:'+parentKey);
  if(!tree.leaf_ids.length)throw new Error('RECOVERY_PARENT_TREE_EMPTY:'+parentKey);
  const reports=tree.leaf_ids.map((unitId)=>{
    const report=leaf_reports[unitId];
    if(!report)throw new Error('RECOVERY_PARENT_LEAF_REPORT_MISSING:'+unitId);
    if(report.status!=='PASS'||Number(report.unverified_discrete_selector_case_count??0)!==0)throw new Error('RECOVERY_PARENT_LEAF_NOT_PASS:'+unitId);
    if(String(report.recovery_unit_id??'')!==unitId)throw new Error('RECOVERY_PARENT_LEAF_UNIT_ID_MISMATCH:'+unitId);
    if(Number(report.parent_shard_index??report.shard_index)!==parentShard)throw new Error('RECOVERY_PARENT_LEAF_SHARD_MISMATCH:'+unitId);
    if(String(report.parent_partition_key??report.partition_key)!==parentKey)throw new Error('RECOVERY_PARENT_LEAF_PARTITION_MISMATCH:'+unitId);
    if(report.runtime_integrity_match!==true)throw new Error('RECOVERY_PARENT_LEAF_RUNTIME_INTEGRITY_FAIL:'+unitId);
    return report;
  });
  const heads=new Set(reports.map((report)=>String(report.exact_head??'')));
  const runtimes=new Set(reports.map((report)=>String(report.runtime_manifest_sha256??'')));
  if(heads.size!==1||![...heads][0])throw new Error('RECOVERY_PARENT_LEAF_HEAD_MISMATCH:'+parentKey);
  if(runtimes.size!==1||![...runtimes][0])throw new Error('RECOVERY_PARENT_LEAF_RUNTIME_MISMATCH:'+parentKey);
  const flowSignatures=new Set();
  const leafEvidence=[];
  let terminals=0,states=0,transitions=0,dependencyRejections=0,downstreamClearChecks=0,resolverCacheHits=0,resolverCacheMisses=0,maxStack=0,peakHeap=0;
  for(const report of reports){
    for(const sig of report.flow_signature_sha256s??[])flowSignatures.add(String(sig));
    terminals+=Number(report.terminal_context_count??0);
    states+=Number(report.visited_state_count??0);
    transitions+=Number(report.transition_check_count??0);
    dependencyRejections+=Number(report.dependency_rejection_count??0);
    downstreamClearChecks+=Number(report.downstream_clear_event_count??0);
    resolverCacheHits+=Number(report.resolver_cache_hits??0);
    resolverCacheMisses+=Number(report.resolver_cache_misses??0);
    maxStack=Math.max(maxStack,Number(report.max_stack_depth??0));
    peakHeap=Math.max(peakHeap,Number(report.observed_peak_heap_mb??0));
    leafEvidence.push({
      recovery_unit_id:String(report.recovery_unit_id),
      decision_constraints_sha256:String(report.decision_constraints_sha256??''),
      case_artifact:String(report.case_artifact??''),
      case_artifact_sha256:String(report.case_artifact_sha256??'')
    });
  }
  leafEvidence.sort((a,b)=>a.recovery_unit_id.localeCompare(b.recovery_unit_id));
  if(leafEvidence.some((row)=>!row.case_artifact||!/^[0-9a-f]{64}$/.test(row.case_artifact_sha256)))throw new Error('RECOVERY_PARENT_LEAF_CASE_IDENTITY_INVALID:'+parentKey);
  const treeHash=recoveryTreeHash({root_unit_id,units,certificates});
  return {
    schema_version:'1.0.0',
    exact_head:[...heads][0],
    task_classification:'NON-PRODUCT-MASTER',
    product_master_mutation:0,
    proof_model:'UCHIRIMO_REACHABLE_DISCRETE_SELECTOR_RECOVERY_TREE_PARENT_V1',
    shard_index:parentShard,
    node_id:String(parent.node_id??''),
    partition_key:parentKey,
    partition_seed:stable(JSON.parse(String(parent.partition_seed_json??'{}'))),
    glass_family:String(parent.glass_family??''),
    window_type:String(parent.window_type??''),
    runtime_manifest_sha256:[...runtimes][0],
    runtime_integrity_match:true,
    terminal_context_count:terminals,
    visited_state_count:states,
    transition_check_count:transitions,
    dependency_rejection_count:dependencyRejections,
    downstream_clear_event_count:downstreamClearChecks,
    flow_signature_count:flowSignatures.size,
    flow_signature_sha256s:[...flowSignatures].sort(),
    unverified_discrete_selector_case_count:0,
    max_stack_depth:maxStack,
    observed_peak_heap_mb:peakHeap,
    resolver_cache_hits:resolverCacheHits,
    resolver_cache_misses:resolverCacheMisses,
    recovery_tree_root_unit_id:root_unit_id,
    recovery_tree_root_sha256:treeHash,
    recovery_leaf_count:leafEvidence.length,
    recovery_leaf_evidence:leafEvidence,
    status:'PASS'
  };
}

function unitSort(a,b){
  return Number(a.parent_shard_index)-Number(b.parent_shard_index)
    || Number(a.recovery_depth??0)-Number(b.recovery_depth??0)
    || String(a.recovery_unit_id).localeCompare(String(b.recovery_unit_id));
}

export function scheduleLane(units,{matrixLimit=MATRIX_LIMIT}={}){
  const rows=[...units].map((row)=>{
    if(!['NORMAL','HEAVY'].includes(String(row?.execution_class??'')))throw new Error('RECOVERY_SCHEDULE_EXECUTION_CLASS_INVALID:'+String(row?.execution_class??''));
    return row;
  }).sort(unitSort);
  const heavy=rows.filter((row)=>row.execution_class==='HEAVY');
  const normal=rows.filter((row)=>row.execution_class!=='HEAVY');
  let normalBatchSize=1;
  if(heavy.length+normal.length>matrixLimit)normalBatchSize=2;
  const batches=[];
  for(let offset=0;offset<normal.length;offset+=normalBatchSize){
    const items=normal.slice(offset,offset+normalBatchSize);
    batches.push({execution_class:'NORMAL',units:items});
  }
  for(const row of heavy)batches.push({execution_class:'HEAVY',units:[row]});
  batches.sort((a,b)=>unitSort(a.units[0],b.units[0]));
  const scheduled=batches.slice(0,matrixLimit);
  const deferred=batches.slice(matrixLimit);
  return {
    matrix_limit:matrixLimit,
    effective_normal_batch_size:normalBatchSize,
    scheduled,
    deferred,
    scheduled_unit_count:scheduled.reduce((n,b)=>n+b.units.length,0),
    deferred_unit_count:deferred.reduce((n,b)=>n+b.units.length,0)
  };
}

function controllerSemanticState(state){
  return {
    controller_contract_version:state.controller_contract_version,
    exact_head:state.exact_head,
    parent_population_count:state.parent_population_count,
    parent_population_sha256:state.parent_population_sha256,
    runtime_manifest_sha256:state.runtime_manifest_sha256,
    execution_fingerprint:state.execution_fingerprint,
    planner_fingerprint:state.planner_fingerprint,
    closed_parent_count:state.closed_parent_count,
    open_parent_count:state.open_parent_count,
    pass_unit_count:state.pass_unit_count,
    pending_normal_count:state.pending_normal_count,
    pending_heavy_count:state.pending_heavy_count,
    split_required_count:state.split_required_count,
    deferred_count:state.deferred_count,
    blocked_counts:stable(state.blocked_counts??{}),
    recovery_tree_root_hash:state.recovery_tree_root_hash
  };
}

export function buildControllerState(input){
  const state={
    schema_version:'1.0.0',
    controller_contract_version:CONTROLLER_CONTRACT_VERSION,
    exact_head:String(input.exact_head??''),
    generation:Number(input.generation??0),
    source_controller_run_id:input.source_controller_run_id==null?null:Number(input.source_controller_run_id),
    parent_population_count:Number(input.parent_population_count??0),
    parent_population_sha256:String(input.parent_population_sha256??''),
    runtime_manifest_sha256:String(input.runtime_manifest_sha256??''),
    execution_fingerprint:String(input.execution_fingerprint??''),
    planner_fingerprint:String(input.planner_fingerprint??''),
    closed_parent_count:Number(input.closed_parent_count??0),
    open_parent_count:Number(input.open_parent_count??0),
    pass_unit_count:Number(input.pass_unit_count??0),
    pending_normal_count:Number(input.pending_normal_count??0),
    pending_heavy_count:Number(input.pending_heavy_count??0),
    split_required_count:Number(input.split_required_count??0),
    deferred_count:Number(input.deferred_count??0),
    blocked_counts:stable(input.blocked_counts??{}),
    recovery_tree_root_hash:String(input.recovery_tree_root_hash??''),
    prior_state_sha256:input.prior_state_sha256??null
  };
  let blocked=Object.values(state.blocked_counts).reduce((a,b)=>a+Number(b||0),0);
  if(state.generation>=MAX_AUTOMATIC_GENERATIONS&&state.open_parent_count>0){
    state.blocked_counts={...state.blocked_counts,BLOCKED_GENERATION_LIMIT:Number(state.blocked_counts.BLOCKED_GENERATION_LIMIT??0)+1};
    blocked+=1;
  }
  state.current_state_sha256=sha256(controllerSemanticState(state));
  if(state.prior_state_sha256&&state.prior_state_sha256===state.current_state_sha256&&state.open_parent_count>0){
    state.blocked_counts={...state.blocked_counts,BLOCKED_NO_PROGRESS:Number(state.blocked_counts.BLOCKED_NO_PROGRESS??0)+1};
    state.current_state_sha256=sha256(controllerSemanticState(state));
    blocked+=1;
  }
  if(blocked>0)state.next_action='BLOCKED';
  else if(state.open_parent_count===0&&state.deferred_count===0)state.next_action='FINAL_AGGREGATE';
  else if(state.pending_normal_count+state.pending_heavy_count+state.split_required_count+state.deferred_count>0)state.next_action=input.after_generation===true?'DISPATCH_NEXT_GENERATION':'EXECUTE';
  else state.next_action='BLOCKED';
  return state;
}
