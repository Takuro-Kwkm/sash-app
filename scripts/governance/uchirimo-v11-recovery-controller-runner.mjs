import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CONTROLLER_CONTRACT_VERSION,
  buildControllerState,
  canonicalConstraints,
  recoveryUnitId,
  scheduleLane,
  sha256,
  stable
} from './uchirimo-v11-recovery-controller.mjs';

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
    const {appendFileSync}=await import('node:fs');
    appendFileSync(process.env.GITHUB_OUTPUT,'matrix='+JSON.stringify(matrix)+'\n');
    appendFileSync(process.env.GITHUB_OUTPUT,'parent_count=3956\n');
    appendFileSync(process.env.GITHUB_OUTPUT,'scheduled_unit_count='+String(summary.scheduled_unit_count)+'\n');
    appendFileSync(process.env.GITHUB_OUTPUT,'deferred_unit_count='+String(summary.deferred_unit_count)+'\n');
  }
  console.log('UCHIRIMO_V12_CONTROLLER_PLAN=PASS lane='+LANE_INDEX+'/'+LANE_COUNT+' eligible='+eligible.length+' scheduled='+summary.scheduled_unit_count+' deferred='+summary.deferred_unit_count+' normal_batch='+summary.effective_normal_batch_size);
}

if(MODE==='init')init();
else if(MODE==='plan-lane')await planLane();
else throw new Error('UCHIRIMO_V12_CONTROLLER_MODE_UNSUPPORTED:'+MODE);
