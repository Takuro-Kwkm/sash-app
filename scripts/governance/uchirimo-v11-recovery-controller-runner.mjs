import { appendFileSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CONTROLLER_CONTRACT_VERSION,
  MAX_AUTOMATIC_GENERATIONS,
  buildControllerState,
  buildSplitCertificate,
  canonicalConstraints,
  chooseNextSplitAxis,
  classifyExecutionResult,
  recoveryEvidenceNames,
  recoveryTreeHash,
  recoveryUnitId,
  scheduleLane,
  sha256,
  stable,
  stableJson,
  synthesizeParentClosure,
  transitionUnit,
  validateRecoveryTree
} from './uchirimo-v11-recovery-controller.mjs';
import { loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { resolveRuntimeAppProduct } from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';

const MODE=String(process.env.UCHIRIMO_V12_CONTROLLER_MODE??'init');
const HEAD=String(process.env.HEAD_SHA??process.env.GITHUB_SHA??'');
const OUT=String(process.env.UCHIRIMO_V12_CONTROLLER_OUT??'artifacts/uchirimo-v12-controller');
const PLAN_PATH=String(process.env.UCHIRIMO_V12_PARENT_PLAN??'artifacts/uchirimo-selector-proof-current-plan/all-partitions.json');
const CARRY_PATH=String(process.env.UCHIRIMO_V12_CARRY_MANIFEST??'artifacts/uchirimo-selector-proof-carry-forward/manifest.json');
const STATE_PATH=String(process.env.UCHIRIMO_V12_STATE??join(OUT,'controller-state.json'));
const UNITS_PATH=String(process.env.UCHIRIMO_V12_UNITS??join(OUT,'recovery-units.json'));
const CERTIFICATES_PATH=String(process.env.UCHIRIMO_V12_CERTIFICATES??join(OUT,'split-certificates.json'));
const PARENTS_PATH=String(process.env.UCHIRIMO_V12_PARENT_STATUS??join(OUT,'parent-status.json'));
const GENERATION=Number(process.env.UCHIRIMO_V12_GENERATION??0);
const SOURCE_RUN_ID=process.env.UCHIRIMO_V12_SOURCE_CONTROLLER_RUN_ID?Number(process.env.UCHIRIMO_V12_SOURCE_CONTROLLER_RUN_ID):null;
const LANE_COUNT=Number(process.env.UCHIRIMO_SELECTOR_PLAN_LANE_COUNT??16);
const LANE_INDEX=Number(process.env.UCHIRIMO_SELECTOR_PLAN_LANE_INDEX??0);
const NORMAL_TIMEOUT_MS=Number(process.env.UCHIRIMO_SELECTOR_NORMAL_CHILD_TIMEOUT_MS??1080000);
const HEAVY_TIMEOUT_MS=Number(process.env.UCHIRIMO_SELECTOR_HEAVY_CHILD_TIMEOUT_MS??3000000);
const EXECUTION_INPUT=String(process.env.UCHIRIMO_V12_EXECUTION_INPUT??'artifacts/uchirimo-v12-execution');
const PLAN_SUMMARY_INPUT=String(process.env.UCHIRIMO_V12_PLAN_SUMMARY_INPUT??'artifacts/uchirimo-v12-plans');

mkdirSync(OUT,{recursive:true});

const readJson=(path)=>JSON.parse(readFileSync(path,'utf8'));
const writeJson=(path,value)=>writeFileSync(path,JSON.stringify(value,null,2)+'\n');
const parentPopulationHash=(plan)=>sha256(plan.partitions.map((row)=>({
  shard:Number(row.shard),
  node_id:String(row.node_id),
  partition_key:String(row.partition_key),
  room_specification:String(row.room_specification),
  window_type:String(row.window_type),
  sash_configuration:String(row.sash_configuration),
  size_class:String(row.size_class),
  glass_family:String(row.glass_family),
  partition_seed_json:String(row.partition_seed_json)
})));

function validatePlan(plan){
  if(plan.status!=='PASS'||!Array.isArray(plan.partitions))throw new Error('UCHIRIMO_V12_PARENT_PLAN_INVALID');
  if(Number(plan.shard_count)!==plan.partitions.length)throw new Error('UCHIRIMO_V12_PARENT_PLAN_COUNT_MISMATCH');
  if(plan.partitions.length!==3956)throw new Error('UCHIRIMO_V12_PARENT_DENOMINATOR_DRIFT:'+plan.partitions.length);
  const keys=new Set(plan.partitions.map((row)=>String(row.partition_key)));
  if(keys.size!==plan.partitions.length)throw new Error('UCHIRIMO_V12_PARENT_PARTITION_DUPLICATE');
  const shards=[...plan.partitions].map((row)=>Number(row.shard)).sort((a,b)=>a-b);
  if(shards.some((value,index)=>value!==index))throw new Error('UCHIRIMO_V12_PARENT_SHARD_COVERAGE_INVALID');
  if(HEAD&&String(plan.exact_head??'')!==HEAD)throw new Error('UCHIRIMO_V12_PARENT_PLAN_HEAD_MISMATCH');
}

function init(){
  const plan=readJson(PLAN_PATH);
  const carry=readJson(CARRY_PATH);
  validatePlan(plan);
  if(carry.status!=='PASS'||String(carry.current_exact_head??'')!==String(plan.exact_head??''))throw new Error('UCHIRIMO_V12_CARRY_MANIFEST_INVALID');
  if(Number(carry.current_shard_count)!==3956)throw new Error('UCHIRIMO_V12_CARRY_PARENT_COUNT_MISMATCH:'+carry.current_shard_count);
  const byKey=new Map(plan.partitions.map((row)=>[String(row.partition_key),row]));
  const reused=new Set((carry.reused_partition_keys??[]).map(String));
  const heavy=new Set((carry.heavy_partition_keys??[]).map(String));
  for(const key of reused)if(!byKey.has(key))throw new Error('UCHIRIMO_V12_REUSED_PARENT_UNKNOWN:'+key);
  for(const key of heavy)if(!byKey.has(key))throw new Error('UCHIRIMO_V12_HEAVY_PARENT_UNKNOWN:'+key);

  const parentStatuses={};
  const units={};
  let pendingNormal=0;
  let pendingHeavy=0;
  for(const parent of plan.partitions){
    const key=String(parent.partition_key);
    if(reused.has(key)){
      parentStatuses[key]={
        parent_shard_index:Number(parent.shard),
        parent_partition_key:key,
        status:'ROOT_PASS_CARRY_FORWARD',
        closure_type:'ROOT_PASS',
        source:carry.reused_partitions?.find((row)=>String(row.partition_key)===key)??null
      };
      continue;
    }
    const rootId=recoveryUnitId(key,[]);
    const executionClass=heavy.has(key)?'HEAVY':'NORMAL';
    const state=executionClass==='HEAVY'?'PENDING_HEAVY':'PENDING_NORMAL';
    if(executionClass==='HEAVY')pendingHeavy+=1;
    else pendingNormal+=1;
    units[rootId]={
      controller_contract_version:CONTROLLER_CONTRACT_VERSION,
      parent_shard_index:Number(parent.shard),
      parent_partition_key:key,
      recovery_unit_id:rootId,
      parent_recovery_unit_id:null,
      recovery_depth:0,
      decision_constraints:[],
      decision_constraints_sha256:sha256([]),
      execution_class:executionClass,
      infra_retry_count:0,
      state,
      next_action:'EXECUTE'
    };
    parentStatuses[key]={
      parent_shard_index:Number(parent.shard),
      parent_partition_key:key,
      status:'OPEN',
      closure_type:null,
      root_recovery_unit_id:rootId
    };
  }
  const populationHash=parentPopulationHash(plan);
  const recoveryTreeRootHash=sha256({
    units:Object.values(units).sort((a,b)=>a.parent_shard_index-b.parent_shard_index),
    certificates:{},
    parent_statuses:Object.values(parentStatuses).sort((a,b)=>a.parent_shard_index-b.parent_shard_index)
  });
  const state=buildControllerState({
    exact_head:String(plan.exact_head),
    generation:GENERATION,
    source_controller_run_id:SOURCE_RUN_ID,
    parent_population_count:3956,
    parent_population_sha256:populationHash,
    runtime_manifest_sha256:String(carry.runtime_manifest_sha256??''),
    execution_fingerprint:String(carry.execution_dependency_fingerprint??''),
    planner_fingerprint:sha256({controller_contract_version:CONTROLLER_CONTRACT_VERSION,parent_population_sha256:populationHash}),
    closed_parent_count:reused.size,
    open_parent_count:3956-reused.size,
    pass_unit_count:0,
    pending_normal_count:pendingNormal,
    pending_heavy_count:pendingHeavy,
    split_required_count:0,
    deferred_count:0,
    blocked_counts:{},
    recovery_tree_root_hash:recoveryTreeRootHash,
    prior_state_sha256:null
  });
  writeJson(STATE_PATH,state);
  writeJson(UNITS_PATH,{schema_version:'1.0.0',controller_contract_version:CONTROLLER_CONTRACT_VERSION,exact_head:String(plan.exact_head),units});
  writeJson(CERTIFICATES_PATH,{schema_version:'1.0.0',controller_contract_version:CONTROLLER_CONTRACT_VERSION,exact_head:String(plan.exact_head),certificates:{}});
  writeJson(PARENTS_PATH,{schema_version:'1.0.0',controller_contract_version:CONTROLLER_CONTRACT_VERSION,exact_head:String(plan.exact_head),parent_population_count:3956,parent_population_sha256:populationHash,parents:parentStatuses});
  writeJson(join(OUT,'controller-manifest.json'),{
    schema_version:'1.0.0',
    controller_contract_version:CONTROLLER_CONTRACT_VERSION,
    exact_head:String(plan.exact_head),
    generation:GENERATION,
    parent_population_count:3956,
    parent_population_sha256:populationHash,
    carry_forward_parent_count:reused.size,
    open_parent_count:3956-reused.size,
    initial_pending_normal_count:pendingNormal,
    initial_pending_heavy_count:pendingHeavy,
    runtime_manifest_sha256:String(carry.runtime_manifest_sha256??''),
    execution_fingerprint:String(carry.execution_dependency_fingerprint??''),
    source_carry_forward_manifest_sha256:sha256(carry),
    status:'PASS'
  });
  console.log('UCHIRIMO_V12_CONTROLLER_INIT=PASS parents=3956 closed='+reused.size+' open='+(3956-reused.size)+' normal='+pendingNormal+' heavy='+pendingHeavy+' parent_population_sha256='+populationHash);
}

function planLane(){
  const plan=readJson(PLAN_PATH);
  const state=readJson(STATE_PATH);
  const unitsEnvelope=readJson(UNITS_PATH);
  validatePlan(plan);
  if(state.controller_contract_version!==CONTROLLER_CONTRACT_VERSION||unitsEnvelope.controller_contract_version!==CONTROLLER_CONTRACT_VERSION)throw new Error('UCHIRIMO_V12_CONTROLLER_CONTRACT_MISMATCH');
  if(String(state.exact_head)!==String(plan.exact_head)||String(unitsEnvelope.exact_head)!==String(plan.exact_head))throw new Error('UCHIRIMO_V12_CONTROLLER_HEAD_MISMATCH');
  if(Number(state.parent_population_count)!==3956||String(state.parent_population_sha256)!==parentPopulationHash(plan))throw new Error('UCHIRIMO_V12_CONTROLLER_POPULATION_MISMATCH');
  if(state.next_action!=='EXECUTE')throw new Error('UCHIRIMO_V12_CONTROLLER_NOT_EXECUTABLE:'+String(state.next_action));
  if(!Number.isInteger(LANE_COUNT)||LANE_COUNT<1||!Number.isInteger(LANE_INDEX)||LANE_INDEX<0||LANE_INDEX>=LANE_COUNT)throw new Error('UCHIRIMO_V12_LANE_INVALID:'+LANE_INDEX+':'+LANE_COUNT);
  const parentByKey=new Map(plan.partitions.map((row)=>[String(row.partition_key),row]));
  const eligible=Object.values(unitsEnvelope.units??{})
    .filter((unit)=>['PENDING_NORMAL','PENDING_HEAVY'].includes(String(unit.state)))
    .filter((unit)=>Number(unit.parent_shard_index)%LANE_COUNT===LANE_INDEX);
  const scheduled=scheduleLane(eligible);
  const toItem=(unit)=>{
    const parent=parentByKey.get(String(unit.parent_partition_key));
    if(!parent)throw new Error('UCHIRIMO_V12_UNIT_PARENT_UNKNOWN:'+unit.recovery_unit_id);
    return {
      shard:Number(parent.shard),
      node_id:String(parent.node_id),
      partition_key:String(parent.partition_key),
      parent_shard_index:Number(parent.shard),
      parent_partition_key:String(parent.partition_key),
      recovery_unit_id:String(unit.recovery_unit_id),
      parent_recovery_unit_id:unit.parent_recovery_unit_id,
      recovery_depth:Number(unit.recovery_depth),
      room_specification:String(parent.room_specification),
      window_type:String(parent.window_type),
      sash_configuration:String(parent.sash_configuration),
      size_class:String(parent.size_class),
      glass_family:String(parent.glass_family),
      partition_seed_json:String(parent.partition_seed_json),
      decision_constraints_json:JSON.stringify(canonicalConstraints(unit.decision_constraints??[]))
    };
  };
  const matrixEntries=scheduled.scheduled.map((batch,index)=>({
    skip:false,
    execution_class:batch.execution_class.toLowerCase(),
    child_timeout_ms:batch.execution_class==='HEAVY'?HEAVY_TIMEOUT_MS:NORMAL_TIMEOUT_MS,
    batch_id:'v12-g'+String(state.generation).padStart(2,'0')+'-lane-'+String(LANE_INDEX).padStart(2,'0')+'-'+String(index).padStart(3,'0'),
    batch_json:JSON.stringify(batch.units.map(toItem))
  }));
  const matrix={include:matrixEntries.length?matrixEntries:[{skip:true,execution_class:'reused',child_timeout_ms:NORMAL_TIMEOUT_MS,batch_id:'__V12_EMPTY_LANE__',batch_json:'[]'}]};
  const summary={
    schema_version:'1.0.0',
    controller_contract_version:CONTROLLER_CONTRACT_VERSION,
    exact_head:String(plan.exact_head),
    generation:Number(state.generation),
    lane_index:LANE_INDEX,
    lane_count:LANE_COUNT,
    eligible_unit_count:eligible.length,
    scheduled_unit_count:scheduled.scheduled_unit_count,
    deferred_unit_count:scheduled.deferred_unit_count,
    effective_normal_batch_size:scheduled.effective_normal_batch_size,
    scheduled_recovery_unit_ids:scheduled.scheduled.flatMap((batch)=>batch.units.map((unit)=>unit.recovery_unit_id)),
    deferred_recovery_unit_ids:scheduled.deferred.flatMap((batch)=>batch.units.map((unit)=>unit.recovery_unit_id)),
    matrix,
    status:'PASS'
  };
  writeJson(join(OUT,'lane-'+LANE_INDEX+'-plan.json'),summary);
  if(process.env.GITHUB_OUTPUT){
    appendFileSync(process.env.GITHUB_OUTPUT,'matrix='+JSON.stringify(matrix)+'\n');
    appendFileSync(process.env.GITHUB_OUTPUT,'parent_count=3956\n');
    appendFileSync(process.env.GITHUB_OUTPUT,'scheduled_unit_count='+String(summary.scheduled_unit_count)+'\n');
    appendFileSync(process.env.GITHUB_OUTPUT,'deferred_unit_count='+String(summary.deferred_unit_count)+'\n');
  }
  console.log('UCHIRIMO_V12_CONTROLLER_PLAN=PASS lane='+LANE_INDEX+'/'+LANE_COUNT+' eligible='+eligible.length+' scheduled='+summary.scheduled_unit_count+' deferred='+summary.deferred_unit_count+' normal_batch='+summary.effective_normal_batch_size);
}


function walkFiles(dir){
  const out=[];
  const visit=(path)=>{
    const stat=statSync(path);
    if(stat.isDirectory())for(const name of readdirSync(path))visit(join(path,name));
    else out.push(path);
  };
  visit(dir);
  return out;
}

const present=(value)=>value!==undefined&&value!==null&&value!==''&&(!Array.isArray(value)||value.length>0);
const same=(a,b)=>Array.isArray(b)
  ? Array.isArray(a)&&stableJson(a.map(String).sort())===stableJson(b.map(String).sort())
  : Object.is(a,b)||String(a)===String(b);

function applyDecision(selection,key,decision){
  const next={...(selection??{})};
  if(decision.kind==='UNSET')delete next[key];
  else next[key]=decision.value;
  return next;
}

function decisionInField(field,decision){
  if(decision?.kind==='UNSET')return field?.required!==true;
  if(decision?.kind!=='VALUE')return false;
  const enabled=(field?.values??[]).filter((entry)=>entry.disabled!==true).map((entry)=>entry.value);
  if(field?.dataType==='MULTI_ENUM'){
    if(!Array.isArray(decision.value)||!decision.value.length)return false;
    const allowed=new Set(enabled.map(String));
    return decision.value.every((value)=>allowed.has(String(value)));
  }
  return enabled.some((value)=>same(value,decision.value));
}

function baseSeed(parent){
  const seed={
    room_specification:String(parent.room_specification),
    window_type:String(parent.window_type),
    glass_family:String(parent.glass_family)
  };
  if(String(parent.sash_configuration??'__UNSET__')!=='__UNSET__')seed.sash_configuration=String(parent.sash_configuration);
  if(String(parent.size_class??'__UNSET__')!=='__UNSET__')seed.size_class=String(parent.size_class);
  Object.assign(seed,JSON.parse(String(parent.partition_seed_json??'{}')));
  return seed;
}

async function resolveUnitSelection(parent,unit){
  const seed=baseSeed(parent);
  let result=await resolveRuntimeAppProduct('SER-YKKAP-UCHIRIMO',seed);
  for(const [key,value] of Object.entries(seed))if(!same(result.selection?.[key],value))throw new Error('UCHIRIMO_V12_SPLIT_SEED_REJECTED:'+unit.recovery_unit_id+':'+key);
  const constraints=canonicalConstraints(unit.decision_constraints??[]);
  for(const constraint of constraints){
    const key=String(constraint.field_key);
    const field=(result.fields??[]).find((candidate)=>candidate.key===key);
    if(!field||!decisionInField(field,constraint.decision))throw new Error('UCHIRIMO_V12_SPLIT_CONSTRAINT_INVALID:'+unit.recovery_unit_id+':'+key);
    result=await resolveRuntimeAppProduct('SER-YKKAP-UCHIRIMO',applyDecision(result.selection,key,constraint.decision));
    if(constraint.decision.kind==='VALUE'&&!same(result.selection?.[key],constraint.decision.value))throw new Error('UCHIRIMO_V12_SPLIT_CONSTRAINT_REJECTED:'+unit.recovery_unit_id+':'+key);
    if(constraint.decision.kind==='UNSET'&&present(result.selection?.[key]))throw new Error('UCHIRIMO_V12_SPLIT_UNSET_REJECTED:'+unit.recovery_unit_id+':'+key);
    for(const [seedKey,value] of Object.entries(seed))if(!same(result.selection?.[seedKey],value))throw new Error('UCHIRIMO_V12_SPLIT_CLEARED_SEED:'+unit.recovery_unit_id+':'+seedKey);
  }
  return {seed,result,constraints};
}

function reportIndex(dir){
  const byBase=new Map();
  for(const path of walkFiles(dir)){
    const base=path.split('/').pop();
    if(!/\.json$/.test(base))continue;
    if(!byBase.has(base))byBase.set(base,[]);
    byBase.get(base).push(path);
  }
  return byBase;
}

function uniqueJsonByBase(index,base,{optional=false}={}){
  const paths=index.get(base)??[];
  if(!paths.length){
    if(optional)return null;
    throw new Error('UCHIRIMO_V12_EVIDENCE_FILE_MISSING:'+base);
  }
  const values=paths.map((path)=>({path,data:readJson(path),hash:sha256(readJson(path))}));
  const hashes=new Set(values.map((row)=>row.hash));
  if(hashes.size!==1)throw new Error('UCHIRIMO_V12_EVIDENCE_FILE_CONFLICT:'+base);
  return values[0];
}

function planSummaries(){
  if(!statSync(PLAN_SUMMARY_INPUT).isDirectory())throw new Error('UCHIRIMO_V12_PLAN_SUMMARY_INPUT_INVALID');
  const rows=walkFiles(PLAN_SUMMARY_INPUT)
    .filter((path)=>/lane-\d+-plan\.json$/.test(path))
    .map((path)=>readJson(path));
  const byLane=new Map(rows.map((row)=>[Number(row.lane_index),row]));
  if(byLane.size!==LANE_COUNT)throw new Error('UCHIRIMO_V12_PLAN_LANE_COVERAGE_INVALID:'+byLane.size+':'+LANE_COUNT);
  for(let lane=0;lane<LANE_COUNT;lane+=1)if(!byLane.has(lane))throw new Error('UCHIRIMO_V12_PLAN_LANE_MISSING:'+lane);
  return [...byLane.values()].sort((a,b)=>a.lane_index-b.lane_index);
}

function executionResults(index){
  const rows=[];
  for(const [base,paths] of index.entries()){
    if(!/^batch-.+-report\.json$/.test(base))continue;
    const parsed=paths.map((path)=>readJson(path));
    const hashes=new Set(parsed.map((value)=>sha256(value)));
    if(hashes.size!==1)throw new Error('UCHIRIMO_V12_BATCH_REPORT_CONFLICT:'+base);
    const report=parsed[0];
    if(String(report.exact_head??'')!==HEAD)throw new Error('UCHIRIMO_V12_BATCH_HEAD_MISMATCH:'+base);
    for(const result of report.results??[])rows.push({...result,batch_id:String(report.batch_id??''),batch_report:base});
  }
  const byUnit=new Map();
  for(const row of rows){
    const unitId=String(row.recovery_unit_id??'');
    if(!/^[0-9a-f]{64}$/.test(unitId))throw new Error('UCHIRIMO_V12_BATCH_RESULT_UNIT_ID_INVALID:'+String(row.batch_id));
    if(byUnit.has(unitId)&&sha256(byUnit.get(unitId))!==sha256(row))throw new Error('UCHIRIMO_V12_BATCH_RESULT_DUPLICATE_CONFLICT:'+unitId);
    byUnit.set(unitId,row);
  }
  return byUnit;
}

function validateProofReport(unit,parent,report){
  if(report.status!=='PASS'||Number(report.unverified_discrete_selector_case_count??0)!==0)throw new Error('UCHIRIMO_V12_PROOF_NOT_PASS:'+unit.recovery_unit_id);
  if(String(report.exact_head??'')!==HEAD)throw new Error('UCHIRIMO_V12_PROOF_HEAD_MISMATCH:'+unit.recovery_unit_id);
  if(report.runtime_integrity_match!==true)throw new Error('UCHIRIMO_V12_PROOF_RUNTIME_INTEGRITY_FAIL:'+unit.recovery_unit_id);
  if(String(report.partition_key??report.parent_partition_key??'')!==String(parent.partition_key))throw new Error('UCHIRIMO_V12_PROOF_PARENT_PARTITION_MISMATCH:'+unit.recovery_unit_id);
  if(Number(unit.recovery_depth)>0){
    if(String(report.recovery_unit_id??'')!==unit.recovery_unit_id)throw new Error('UCHIRIMO_V12_PROOF_UNIT_MISMATCH:'+unit.recovery_unit_id);
    if(String(report.decision_constraints_sha256??'')!==String(unit.decision_constraints_sha256??''))throw new Error('UCHIRIMO_V12_PROOF_CONSTRAINT_HASH_MISMATCH:'+unit.recovery_unit_id);
  }
  if(!String(report.case_artifact??'')||!/^[0-9a-f]{64}$/.test(String(report.case_artifact_sha256??'')))throw new Error('UCHIRIMO_V12_PROOF_CASE_IDENTITY_INVALID:'+unit.recovery_unit_id);
  return report;
}

async function advance(){
  const plan=readJson(PLAN_PATH);
  const priorState=readJson(STATE_PATH);
  const unitsEnvelope=readJson(UNITS_PATH);
  const certificatesEnvelope=readJson(CERTIFICATES_PATH);
  const parentsEnvelope=readJson(PARENTS_PATH);
  validatePlan(plan);
  if(priorState.controller_contract_version!==CONTROLLER_CONTRACT_VERSION||unitsEnvelope.controller_contract_version!==CONTROLLER_CONTRACT_VERSION||certificatesEnvelope.controller_contract_version!==CONTROLLER_CONTRACT_VERSION||parentsEnvelope.controller_contract_version!==CONTROLLER_CONTRACT_VERSION)throw new Error('UCHIRIMO_V12_ADVANCE_CONTRACT_MISMATCH');
  if(String(priorState.exact_head)!==HEAD||String(unitsEnvelope.exact_head)!==HEAD||String(certificatesEnvelope.exact_head)!==HEAD||String(parentsEnvelope.exact_head)!==HEAD)throw new Error('UCHIRIMO_V12_ADVANCE_HEAD_MISMATCH');
  if(Number(priorState.generation)!==GENERATION)throw new Error('UCHIRIMO_V12_ADVANCE_GENERATION_MISMATCH:'+priorState.generation+':'+GENERATION);
  const runtime=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');
  if(!runtime?.sourcePackageIntegrity?.match)throw new Error('UCHIRIMO_V12_ADVANCE_RUNTIME_INTEGRITY_FAIL');
  if(String(runtime.sourcePackageIntegrity.actual)!==String(priorState.runtime_manifest_sha256))throw new Error('UCHIRIMO_V12_ADVANCE_RUNTIME_HASH_MISMATCH');
  const parentByKey=new Map(plan.partitions.map((row)=>[String(row.partition_key),row]));
  const units=structuredClone(unitsEnvelope.units??{});
  const certificates=structuredClone(certificatesEnvelope.certificates??{});
  const parents=structuredClone(parentsEnvelope.parents??{});
  const index=reportIndex(EXECUTION_INPUT);
  const results=executionResults(index);
  const summaries=planSummaries();
  const scheduledIds=new Set(summaries.flatMap((row)=>row.scheduled_recovery_unit_ids??[]).map(String));
  const deferredIds=new Set(summaries.flatMap((row)=>row.deferred_recovery_unit_ids??[]).map(String));
  for(const unitId of scheduledIds)if(!units[unitId])throw new Error('UCHIRIMO_V12_SCHEDULED_UNIT_UNKNOWN:'+unitId);
  for(const unitId of deferredIds)if(!units[unitId])throw new Error('UCHIRIMO_V12_DEFERRED_UNIT_UNKNOWN:'+unitId);
  for(const unitId of results.keys())if(!scheduledIds.has(unitId))throw new Error('UCHIRIMO_V12_UNSCHEDULED_RESULT:'+unitId);

  for(const unitId of scheduledIds){
    const unit=units[unitId];
    if(!['PENDING_NORMAL','PENDING_HEAVY'].includes(String(unit.state)))throw new Error('UCHIRIMO_V12_SCHEDULED_UNIT_STATE_INVALID:'+unitId+':'+unit.state);
    const result=results.get(unitId)??{status:'FAIL',timed_out:false,error:'GITHUB_API_TRANSIENT:MISSING_SCHEDULED_BATCH_RESULT',code:'GITHUB_API_TRANSIENT'};
    const event=classifyExecutionResult(result);
    let transitioned=transitionUnit(unit,event);
    if(event==='PASS'){
      const parent=parentByKey.get(String(unit.parent_partition_key));
      if(!parent)throw new Error('UCHIRIMO_V12_PASS_PARENT_UNKNOWN:'+unitId);
      const proofBase=Number(unit.recovery_depth)===0
        ? 'shard-'+unit.parent_shard_index+'-report.json'
        : recoveryEvidenceNames(unit).report;
      const proofRow=uniqueJsonByBase(index,proofBase);
      const proof=validateProofReport(unit,parent,proofRow.data);
      transitioned={...transitioned,proof_report:proof,proof_report_sha256:proofRow.hash,proof_report_file:proofBase,evidence_batch_id:String(result.batch_id??''),evidence_batch_report:String(result.batch_report??'')};
    }
    if(transitioned.state==='SPLIT_REQUIRED'){
      const parent=parentByKey.get(String(unit.parent_partition_key));
      if(!parent)throw new Error('UCHIRIMO_V12_SPLIT_PARENT_UNKNOWN:'+unitId);
      const resolved=await resolveUnitSelection(parent,unit);
      const fixedKeys=[...Object.keys(resolved.seed),...resolved.constraints.map((entry)=>entry.field_key)];
      const axis=chooseNextSplitAxis(resolved.result.fields??[],fixedKeys);
      if(!axis){
        transitioned={...transitioned,state:'BLOCKED_UNSPLITTABLE',next_action:'BLOCKED'};
      }else{
        const certificate=buildSplitCertificate({
          exact_head:HEAD,
          runtime_manifest_sha256:String(priorState.runtime_manifest_sha256),
          proof_execution_fingerprint:String(priorState.execution_fingerprint),
          parent_partition_key:String(unit.parent_partition_key),
          parent_recovery_unit_id:unitId,
          parent_constraints:resolved.constraints,
          split_field_key:axis.field_key,
          domain_values:axis.values,
          parent_selection_sha256:sha256(resolved.result.selection??{})
        });
        certificates[unitId]=certificate;
        for(const child of certificate.children){
          if(units[child.recovery_unit_id])throw new Error('UCHIRIMO_V12_SPLIT_CHILD_ALREADY_EXISTS:'+child.recovery_unit_id);
          units[child.recovery_unit_id]={
            controller_contract_version:CONTROLLER_CONTRACT_VERSION,
            parent_shard_index:Number(unit.parent_shard_index),
            parent_partition_key:String(unit.parent_partition_key),
            recovery_unit_id:String(child.recovery_unit_id),
            parent_recovery_unit_id:unitId,
            recovery_depth:Number(unit.recovery_depth)+1,
            decision_constraints:child.constraints,
            decision_constraints_sha256:child.decision_constraints_sha256,
            execution_class:'NORMAL',
            infra_retry_count:0,
            state:'PENDING_NORMAL',
            next_action:'EXECUTE'
          };
        }
        transitioned={...transitioned,state:'PENDING_CHILDREN',next_action:'WAIT_CHILDREN',split_certificate_sha256:certificate.certificate_sha256};
      }
    }
    units[unitId]=transitioned;
  }

  for(const [parentKey,parentStatus] of Object.entries(parents)){
    if(parentStatus.status!=='OPEN')continue;
    const rootId=String(parentStatus.root_recovery_unit_id??'');
    const root=units[rootId];
    if(!root)throw new Error('UCHIRIMO_V12_PARENT_ROOT_UNIT_MISSING:'+parentKey);
    if(root.state==='PASS'){
      parentStatus.status='ROOT_PASS_FRESH';
      parentStatus.closure_type='ROOT_PASS';
      parentStatus.proof_report=root.proof_report;
      parentStatus.proof_report_sha256=root.proof_report_sha256;
      continue;
    }
    const tree=validateRecoveryTree({root_unit_id:rootId,units,certificates});
    if(tree.closed){
      const leafReports=Object.fromEntries(tree.leaf_ids.map((leafId)=>{
        const proof=units[leafId]?.proof_report;
        if(!proof)throw new Error('UCHIRIMO_V12_CLOSED_TREE_LEAF_PROOF_MISSING:'+leafId);
        return [leafId,proof];
      }));
      const parent=parentByKey.get(parentKey);
      const synthesized=synthesizeParentClosure({parent,root_unit_id:rootId,units,certificates,leaf_reports:leafReports});
      parentStatus.status='RECOVERY_TREE_PASS';
      parentStatus.closure_type='RECOVERY_TREE_PASS';
      parentStatus.synthesized_parent_report=synthesized;
      parentStatus.recovery_tree_root_sha256=synthesized.recovery_tree_root_sha256;
    }
  }

  const blockedCounts={};
  let pendingNormal=0,pendingHeavy=0,splitRequired=0,passUnits=0;
  for(const unit of Object.values(units)){
    if(unit.state==='PENDING_NORMAL')pendingNormal+=1;
    else if(unit.state==='PENDING_HEAVY')pendingHeavy+=1;
    else if(unit.state==='SPLIT_REQUIRED')splitRequired+=1;
    else if(unit.state==='PASS')passUnits+=1;
    else if(String(unit.state).startsWith('BLOCKED_'))blockedCounts[unit.state]=(blockedCounts[unit.state]??0)+1;
  }
  const closedParents=Object.values(parents).filter((row)=>row.status!=='OPEN').length;
  const openParents=3956-closedParents;
  const treeHash=sha256({
    units:Object.values(units).map((unit)=>({
      parent_shard_index:unit.parent_shard_index,
      recovery_unit_id:unit.recovery_unit_id,
      parent_recovery_unit_id:unit.parent_recovery_unit_id,
      recovery_depth:unit.recovery_depth,
      decision_constraints_sha256:unit.decision_constraints_sha256,
      execution_class:unit.execution_class,
      infra_retry_count:unit.infra_retry_count,
      state:unit.state,
      proof_report_sha256:unit.proof_report_sha256??null,
      split_certificate_sha256:unit.split_certificate_sha256??null
    })).sort((a,b)=>a.parent_shard_index-b.parent_shard_index||a.recovery_depth-b.recovery_depth||a.recovery_unit_id.localeCompare(b.recovery_unit_id)),
    certificates:Object.values(certificates).map((row)=>row.certificate_sha256).sort(),
    parents:Object.values(parents).map((row)=>({parent_shard_index:row.parent_shard_index,status:row.status,recovery_tree_root_sha256:row.recovery_tree_root_sha256??null,proof_report_sha256:row.proof_report_sha256??null})).sort((a,b)=>a.parent_shard_index-b.parent_shard_index)
  });
  const state=buildControllerState({
    exact_head:HEAD,
    generation:GENERATION,
    source_controller_run_id:Number(process.env.GITHUB_RUN_ID??SOURCE_RUN_ID??0)||null,
    parent_population_count:3956,
    parent_population_sha256:String(priorState.parent_population_sha256),
    runtime_manifest_sha256:String(priorState.runtime_manifest_sha256),
    execution_fingerprint:String(priorState.execution_fingerprint),
    planner_fingerprint:String(priorState.planner_fingerprint),
    closed_parent_count:closedParents,
    open_parent_count:openParents,
    pass_unit_count:passUnits,
    pending_normal_count:pendingNormal,
    pending_heavy_count:pendingHeavy,
    split_required_count:splitRequired,
    deferred_count:deferredIds.size,
    blocked_counts:blockedCounts,
    recovery_tree_root_hash:treeHash,
    prior_state_sha256:String(priorState.current_state_sha256),
    after_generation:true
  });
  writeJson(join(OUT,'controller-state.json'),state);
  writeJson(join(OUT,'recovery-units.json'),{schema_version:'1.0.0',controller_contract_version:CONTROLLER_CONTRACT_VERSION,exact_head:HEAD,units});
  writeJson(join(OUT,'split-certificates.json'),{schema_version:'1.0.0',controller_contract_version:CONTROLLER_CONTRACT_VERSION,exact_head:HEAD,certificates});
  writeJson(join(OUT,'parent-status.json'),{schema_version:'1.0.0',controller_contract_version:CONTROLLER_CONTRACT_VERSION,exact_head:HEAD,parent_population_count:3956,parent_population_sha256:String(priorState.parent_population_sha256),parents});
  writeJson(join(OUT,'advance-report.json'),{
    schema_version:'1.0.0',
    controller_contract_version:CONTROLLER_CONTRACT_VERSION,
    exact_head:HEAD,
    generation:GENERATION,
    scheduled_unit_count:scheduledIds.size,
    execution_result_count:results.size,
    deferred_unit_count:deferredIds.size,
    closed_parent_count:closedParents,
    open_parent_count:openParents,
    pending_normal_count:pendingNormal,
    pending_heavy_count:pendingHeavy,
    blocked_counts:blockedCounts,
    next_action:state.next_action,
    state_sha256:state.current_state_sha256,
    status:state.next_action==='BLOCKED'?'BLOCKED':'PASS'
  });
  console.log('UCHIRIMO_V12_CONTROLLER_ADVANCE='+state.next_action+' generation='+GENERATION+' closed='+closedParents+' open='+openParents+' normal='+pendingNormal+' heavy='+pendingHeavy+' deferred='+deferredIds.size+' blocked='+Object.values(blockedCounts).reduce((a,b)=>a+b,0));
}


function resumeGeneration(){
  const priorState=readJson(STATE_PATH);
  const unitsEnvelope=readJson(UNITS_PATH);
  const certificatesEnvelope=readJson(CERTIFICATES_PATH);
  const parentsEnvelope=readJson(PARENTS_PATH);
  if(priorState.controller_contract_version!==CONTROLLER_CONTRACT_VERSION||unitsEnvelope.controller_contract_version!==CONTROLLER_CONTRACT_VERSION||certificatesEnvelope.controller_contract_version!==CONTROLLER_CONTRACT_VERSION||parentsEnvelope.controller_contract_version!==CONTROLLER_CONTRACT_VERSION)throw new Error('UCHIRIMO_V12_RESUME_CONTRACT_MISMATCH');
  if(String(priorState.exact_head)!==HEAD||String(unitsEnvelope.exact_head)!==HEAD||String(certificatesEnvelope.exact_head)!==HEAD||String(parentsEnvelope.exact_head)!==HEAD)throw new Error('UCHIRIMO_V12_RESUME_HEAD_MISMATCH');
  if(priorState.next_action!=='DISPATCH_NEXT_GENERATION')throw new Error('UCHIRIMO_V12_RESUME_NOT_AUTHORIZED:'+String(priorState.next_action));
  const expectedGeneration=Number(priorState.generation)+1;
  if(GENERATION!==expectedGeneration)throw new Error('UCHIRIMO_V12_RESUME_GENERATION_MISMATCH:'+GENERATION+':'+expectedGeneration);
  if(GENERATION>MAX_AUTOMATIC_GENERATIONS)throw new Error('UCHIRIMO_V12_RESUME_GENERATION_LIMIT:'+GENERATION);
  const state={...priorState,generation:GENERATION,source_controller_run_id:SOURCE_RUN_ID,next_action:'EXECUTE'};
  writeJson(join(OUT,'controller-state.json'),state);
  writeJson(join(OUT,'recovery-units.json'),unitsEnvelope);
  writeJson(join(OUT,'split-certificates.json'),certificatesEnvelope);
  writeJson(join(OUT,'parent-status.json'),parentsEnvelope);
  writeJson(join(OUT,'resume-report.json'),{
    schema_version:'1.0.0',
    controller_contract_version:CONTROLLER_CONTRACT_VERSION,
    exact_head:HEAD,
    source_generation:Number(priorState.generation),
    generation:GENERATION,
    source_controller_run_id:SOURCE_RUN_ID,
    state_sha256:String(priorState.current_state_sha256),
    status:'PASS'
  });
  console.log('UCHIRIMO_V12_CONTROLLER_RESUME=PASS generation='+GENERATION+' source_generation='+priorState.generation+' open='+priorState.open_parent_count);
}

if(MODE==='init')init();
else if(MODE==='plan-lane')planLane();
else if(MODE==='advance')await advance();
else if(MODE==='resume-generation')resumeGeneration();
else throw new Error('UCHIRIMO_V12_CONTROLLER_MODE_UNSUPPORTED:'+MODE);
