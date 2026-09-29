// Scheduling only: immutable pending units are redistributed; proof execution is unchanged.
import {appendFileSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {CONTROLLER_CONTRACT_VERSION,assertComputeSchedule,assertKnownHeavyRootNotScheduled,canonicalConstraints,scheduleLane} from './uchirimo-v11-recovery-controller.mjs';
import {parentPopulationHash} from './uchirimo-controller-checkpoint.mjs';
const NORMAL_TIMEOUT_MS=300000;
const HEAVY_TIMEOUT_MS=3000000;
// A branch update can be picked up by the old run's automatic successor dispatch.
// Route that first new-HEAD run through the existing verified checkpoint importer.
export function continuationGeneration({requestedGeneration,head,sourceHead}){
  if(!Number.isSafeInteger(requestedGeneration)||requestedGeneration<0)throw new Error('UCHIRIMO_GENERATION_INVALID');
  if(!/^[0-9a-f]{40}$/.test(head))throw new Error('UCHIRIMO_TARGET_HEAD_INVALID');
  if(requestedGeneration===0)return 0;
  if(!/^[0-9a-f]{40}$/.test(sourceHead??''))throw new Error('UCHIRIMO_SOURCE_HEAD_REQUIRED');
  return sourceHead===head?requestedGeneration:0;
}
function validatePlan(plan,HEAD){
  if(plan.status!=='PASS'||!Array.isArray(plan.partitions))throw new Error('UCHIRIMO_V12_PARENT_PLAN_INVALID');
  if(Number(plan.shard_count)!==plan.partitions.length)throw new Error('UCHIRIMO_V12_PARENT_PLAN_COUNT_MISMATCH');
  if(plan.partitions.length!==3956)throw new Error('UCHIRIMO_V12_PARENT_DENOMINATOR_DRIFT:'+plan.partitions.length);
  const keys=new Set(plan.partitions.map((row)=>String(row.partition_key)));
  if(keys.size!==plan.partitions.length)throw new Error('UCHIRIMO_V12_PARENT_PARTITION_DUPLICATE');
  const shards=[...plan.partitions].map((row)=>Number(row.shard)).sort((a,b)=>a-b);
  if(shards.some((value,index)=>value!==index))throw new Error('UCHIRIMO_V12_PARENT_SHARD_COVERAGE_INVALID');
  if(HEAD&&String(plan.exact_head??'')!==HEAD)throw new Error('UCHIRIMO_V12_PARENT_PLAN_HEAD_MISMATCH');
}

export function planBalancedLane({plan,state,unitsEnvelope,laneIndex:LANE_INDEX,laneCount:LANE_COUNT=16,head=plan.exact_head}){
  validatePlan(plan,head);
  if(state.controller_contract_version!==CONTROLLER_CONTRACT_VERSION||unitsEnvelope.controller_contract_version!==CONTROLLER_CONTRACT_VERSION)throw new Error('UCHIRIMO_V12_CONTROLLER_CONTRACT_MISMATCH');
  if(String(state.exact_head)!==String(plan.exact_head)||String(unitsEnvelope.exact_head)!==String(plan.exact_head))throw new Error('UCHIRIMO_V12_CONTROLLER_HEAD_MISMATCH');
  if(Number(state.parent_population_count)!==3956||String(state.parent_population_sha256)!==parentPopulationHash(plan))throw new Error('UCHIRIMO_V12_CONTROLLER_POPULATION_MISMATCH');
  if(!['EXECUTE','FINAL_AGGREGATE'].includes(String(state.next_action)))throw new Error('UCHIRIMO_V12_CONTROLLER_NOT_EXECUTABLE:'+String(state.next_action));
  if(!Number.isInteger(LANE_COUNT)||LANE_COUNT<1||!Number.isInteger(LANE_INDEX)||LANE_INDEX<0||LANE_INDEX>=LANE_COUNT)throw new Error('UCHIRIMO_V12_LANE_INVALID:'+LANE_INDEX+':'+LANE_COUNT);
  const parentByKey=new Map(plan.partitions.map((row)=>[String(row.partition_key),row]));
  const eligible=state.next_action==='FINAL_AGGREGATE'
    ? []
    : Object.values(unitsEnvelope.units??{})
      .filter((unit)=>['PENDING_NORMAL','PENDING_HEAVY'].includes(String(unit.state)))
      .sort((a,b)=>Number(a.parent_shard_index)-Number(b.parent_shard_index)
        || Number(a.recovery_depth??0)-Number(b.recovery_depth??0)
        || String(a.recovery_unit_id).localeCompare(String(b.recovery_unit_id)))
      .filter((unit,index)=>index%LANE_COUNT===LANE_INDEX);
  for(const unit of eligible){
    assertComputeSchedule(unit,unitsEnvelope.units);
    assertKnownHeavyRootNotScheduled(unit);
  }
  const scheduled=scheduleLane(eligible,{waveLimit:8});
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
    artifact_identity:'uchirimo-v12-batch-v12-g'+String(state.generation).padStart(2,'0')+'-lane-'+String(LANE_INDEX).padStart(2,'0')+'-'+String(index).padStart(3,'0')+'-'+String(plan.exact_head),
    batch_json:JSON.stringify(batch.units.map(toItem))
  }));
  const matrix={include:matrixEntries.length?matrixEntries:[{skip:true,execution_class:'reused',child_timeout_ms:NORMAL_TIMEOUT_MS,batch_id:'__V12_EMPTY_LANE__',batch_json:'[]'}]};
  const summary={
    scheduling_policy:'BALANCED_FRONTIER_16_LANES_8_SINGLE_UNIT_BATCHES',
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
  return summary;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const read=path=>JSON.parse(readFileSync(path,'utf8'));
  const out=process.env.UCHIRIMO_V12_CONTROLLER_OUT;
  const summary=planBalancedLane({
    plan:read(process.env.UCHIRIMO_V12_PARENT_PLAN),
    state:read(process.env.UCHIRIMO_V12_STATE),
    unitsEnvelope:read(process.env.UCHIRIMO_V12_UNITS),
    laneIndex:Number(process.env.UCHIRIMO_SELECTOR_PLAN_LANE_INDEX),
    laneCount:Number(process.env.UCHIRIMO_SELECTOR_PLAN_LANE_COUNT??16),
    head:process.env.HEAD_SHA
  });
  mkdirSync(out,{recursive:true});
  writeFileSync(join(out,'lane-'+summary.lane_index+'-plan.json'),JSON.stringify(summary,null,2)+'\n');
  if(process.env.GITHUB_OUTPUT)for(const [key,value] of Object.entries({matrix:JSON.stringify(summary.matrix),parent_count:3956,scheduled_unit_count:summary.scheduled_unit_count,deferred_unit_count:summary.deferred_unit_count}))appendFileSync(process.env.GITHUB_OUTPUT,key+'='+value+'\n');
  console.log('UCHIRIMO_BALANCED_PLAN=PASS lane='+summary.lane_index+'/'+summary.lane_count+' scheduled='+summary.scheduled_unit_count+' deferred='+summary.deferred_unit_count);
}
