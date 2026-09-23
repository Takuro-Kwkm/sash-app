import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { currentExactHead } from './governance-lib.mjs';
import { loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { resolveRuntimeAppProduct } from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';

const MODE=String(process.env.UCHIRIMO_RECOVERY_PILOT_MODE ?? 'plan');
const BASE_PLAN=String(process.env.UCHIRIMO_RECOVERY_PILOT_BASE_PLAN ?? 'artifacts/uchirimo-recovery-pilot-base-plan/all-partitions.json');
const PLAN_OUT=String(process.env.UCHIRIMO_RECOVERY_PILOT_PLAN_OUT ?? 'artifacts/uchirimo-recovery-pilot-plan');
const SHARD_OUT=String(process.env.UCHIRIMO_FULL_SELECTOR_OUT ?? 'artifacts/uchirimo-recovery-pilot-shard');
const SOURCE_ROOT=String(process.env.UCHIRIMO_RECOVERY_PILOT_SOURCE_ROOT ?? 'artifacts/uchirimo-recovery-pilot-source');
const AGGREGATE_OUT=String(process.env.UCHIRIMO_RECOVERY_PILOT_AGGREGATE_OUT ?? 'artifacts/uchirimo-recovery-pilot-aggregate');
const TARGET_COUNT=Number(process.env.UCHIRIMO_RECOVERY_PILOT_TARGET_COUNT ?? 16);
const PASS_MAX_ELAPSED_MS=Number(process.env.UCHIRIMO_RECOVERY_PILOT_PASS_MAX_ELAPSED_MS ?? 1800000);
const CHILD_TIMEOUT_MS=Number(process.env.UCHIRIMO_RECOVERY_PILOT_CHILD_TIMEOUT_MS ?? 2100000);
const TARGET_QUOTAS=new Map([
  ['UCH-RES-SL2-T',7],
  ['UCH-RES-SL2-W',3],
  ['UCH-RES-SL4-T',3],
  ['UCH-RES-SL4-W',3]
]);
const TARGET_NODE_IDS=new Set(TARGET_QUOTAS.keys());
const CONTINUOUS_KEYS=new Set(['size_w','size_h','frame_projection','fukashi_dimension','custom_w','custom_h','custom_width','custom_height']);
const TECHNICAL_KEYS=new Set(['legacyConstruction','legacyConfiguration','internal_construction']);

const stable=(value)=>{
  if(Array.isArray(value))return value.map(stable);
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,stable(v)]));
};
const stableJson=(value)=>JSON.stringify(stable(value));
const same=(a,b)=>Array.isArray(b)
  ? Array.isArray(a)&&stableJson(a.map(String).sort())===stableJson(b.map(String).sort())
  : Object.is(a,b)||String(a)===String(b);
const enabled=(field)=>(field?.values??[]).filter((row)=>row?.disabled!==true);

function walk(dir){
  const out=[];
  if(!dir||!statSafe(dir)?.isDirectory())return out;
  for(const name of readdirSync(dir)){
    const path=join(dir,name);
    const stat=statSafe(path);
    if(!stat)continue;
    if(stat.isDirectory())out.push(...walk(path));
    else out.push(path);
  }
  return out;
}
function statSafe(path){
  try{return statSync(path);}catch{return null;}
}
function durationMs(startedAt,completedAt){
  const a=Date.parse(startedAt??'');
  const b=Date.parse(completedAt??'');
  return Number.isFinite(a)&&Number.isFinite(b)&&b>=a ? b-a : null;
}
function baseSelection(row){
  const selection={
    room_specification:String(row.room_specification),
    window_type:String(row.window_type),
    glass_family:String(row.glass_family)
  };
  if(String(row.sash_configuration??'__UNSET__')!=='__UNSET__')selection.sash_configuration=String(row.sash_configuration);
  if(String(row.size_class??'__UNSET__')!=='__UNSET__')selection.size_class=String(row.size_class);
  Object.assign(selection,JSON.parse(String(row.partition_seed_json??'{}')));
  return selection;
}
function nextRequiredEnumPartition(result,seed){
  for(const field of result.fields??[]){
    if(field?.required!==true||field?.readOnly===true||field?.dataType!=='ENUM')continue;
    if(TECHNICAL_KEYS.has(field.key)||CONTINUOUS_KEYS.has(field.key))continue;
    if(Object.prototype.hasOwnProperty.call(seed,field.key))continue;
    const values=[...new Map(enabled(field).map((row)=>[stableJson(row.value),row.value])).values()];
    if(values.length>1)return {field,values};
  }
  return null;
}
function remainingEnumFanoutScore(result,seed){
  let score=0;
  for(const field of result.fields??[]){
    if(field?.required!==true||field?.readOnly===true||field?.dataType!=='ENUM')continue;
    if(TECHNICAL_KEYS.has(field.key)||CONTINUOUS_KEYS.has(field.key))continue;
    if(Object.prototype.hasOwnProperty.call(seed,field.key))continue;
    const values=[...new Map(enabled(field).map((row)=>[stableJson(row.value),row.value])).values()];
    if(values.length>1)score+=values.length;
  }
  return score;
}
function severityScore(row){
  const key=String(row.partition_key??'');
  let score=0;
  if(String(row.node_id)==='UCH-RES-SL2-T')score+=1000;
  if(key.includes('reverse_handing="reverse"'))score+=200;
  if(key.includes('frame_color="clear"'))score+=120;
  if(key.includes('frame_color="medium_oak"'))score+=110;
  if(key.includes('glass_structure="F4"'))score+=80;
  if(key.includes('glass_structure="T4"'))score+=80;
  if(key.includes('glass_structure="W5"'))score+=80;
  score+=Object.keys(JSON.parse(String(row.partition_seed_json??'{}'))).length*10;
  return score;
}

async function buildPlus1Candidates(base){
  const candidatesByNode=new Map([...TARGET_NODE_IDS].map((id)=>[id,[]]));
  const parents=base.partitions
    .filter((row)=>TARGET_NODE_IDS.has(String(row.node_id)))
    .sort((a,b)=>severityScore(b)-severityScore(a)||String(a.partition_key).localeCompare(String(b.partition_key)));

  for(const row of parents){
    const seed=baseSelection(row);
    const resolved=await resolveRuntimeAppProduct('SER-YKKAP-UCHIRIMO',seed);
    for(const [key,value] of Object.entries(seed)){
      if(!same(resolved.selection?.[key],value))throw new Error('UCHIRIMO_RECOVERY_PILOT_PARENT_SEED_REJECTED:'+String(row.partition_key)+':'+key);
    }
    const split=nextRequiredEnumPartition(resolved,seed);
    if(!split)continue;
    const parentExtra=JSON.parse(String(row.partition_seed_json??'{}'));
    for(const value of split.values){
      const childSeed={...seed,[split.field.key]:value};
      const childResolved=await resolveRuntimeAppProduct('SER-YKKAP-UCHIRIMO',childSeed);
      if(!same(childResolved.selection?.[split.field.key],value))continue;
      const childExtra={...parentExtra,[split.field.key]:value};
      const candidate={
        node_id:String(row.node_id),
        root_parent_shard:Number(row.shard),
        root_parent_partition_key:String(row.partition_key),
        root_parent_partition_depth:Object.keys(parentExtra).length,
        first_split_field:String(split.field.key),
        first_split_cardinality:split.values.length,
        first_split_value:value,
        room_specification:String(row.room_specification),
        window_type:String(row.window_type),
        sash_configuration:String(row.sash_configuration??'__UNSET__'),
        size_class:String(row.size_class??'__UNSET__'),
        glass_family:String(row.glass_family),
        partition_key:String(row.partition_key)+'|'+String(split.field.key)+'='+stableJson(value),
        partition_seed_json:JSON.stringify(stable(childExtra)),
        severity_score:severityScore(row)
      };
      candidatesByNode.get(String(row.node_id)).push(candidate);
    }
  }
  return candidatesByNode;
}

function selectPlus1PilotBranches(candidatesByNode){
  const selected=[];
  for(const [nodeId,quota] of TARGET_QUOTAS){
    const rows=(candidatesByNode.get(nodeId)??[])
      .sort((a,b)=>b.severity_score-a.severity_score||a.root_parent_partition_key.localeCompare(b.root_parent_partition_key)||stableJson(a.first_split_value).localeCompare(stableJson(b.first_split_value)));
    const unique=[];
    const seen=new Set();
    for(const row of rows){
      if(seen.has(row.partition_key))continue;
      seen.add(row.partition_key);
      unique.push(row);
      if(unique.length===quota)break;
    }
    if(unique.length!==quota)throw new Error('UCHIRIMO_RECOVERY_PILOT_QUOTA_UNSATISFIED:'+nodeId+':'+unique.length+':'+quota);
    selected.push(...unique);
  }
  return selected;
}

async function deepenPlus1Branch(row){
  const seed=baseSelection(row);
  const resolved=await resolveRuntimeAppProduct('SER-YKKAP-UCHIRIMO',seed);
  for(const [key,value] of Object.entries(seed)){
    if(!same(resolved.selection?.[key],value))throw new Error('UCHIRIMO_RECOVERY_PILOT_PLUS1_SEED_REJECTED:'+String(row.partition_key)+':'+key);
  }
  const split=nextRequiredEnumPartition(resolved,seed);
  if(!split)throw new Error('UCHIRIMO_RECOVERY_PILOT_PLUS2_SPLIT_UNAVAILABLE:'+String(row.partition_key));
  const parentExtra=JSON.parse(String(row.partition_seed_json??'{}'));
  const grandchildren=[];
  for(const value of split.values){
    const grandchildSeed={...seed,[split.field.key]:value};
    const grandchildResolved=await resolveRuntimeAppProduct('SER-YKKAP-UCHIRIMO',grandchildSeed);
    if(!same(grandchildResolved.selection?.[split.field.key],value))continue;
    const grandchildExtra={...parentExtra,[split.field.key]:value};
    grandchildren.push({
      node_id:row.node_id,
      root_parent_shard:row.root_parent_shard,
      root_parent_partition_key:row.root_parent_partition_key,
      root_parent_partition_depth:row.root_parent_partition_depth,
      plus1_partition_key:row.partition_key,
      plus1_partition_depth:Object.keys(parentExtra).length,
      first_split_field:row.first_split_field,
      first_split_cardinality:row.first_split_cardinality,
      first_split_value:row.first_split_value,
      second_split_field:String(split.field.key),
      second_split_cardinality:split.values.length,
      second_split_value:value,
      room_specification:row.room_specification,
      window_type:row.window_type,
      sash_configuration:row.sash_configuration,
      size_class:row.size_class,
      glass_family:row.glass_family,
      partition_key:String(row.partition_key)+'|'+String(split.field.key)+'='+stableJson(value),
      partition_seed_json:JSON.stringify(stable(grandchildExtra)),
      severity_score:row.severity_score,
      remaining_enum_fanout_score:remainingEnumFanoutScore(grandchildResolved,grandchildSeed)
    });
  }
  if(!grandchildren.length)throw new Error('UCHIRIMO_RECOVERY_PILOT_PLUS2_CHILD_UNAVAILABLE:'+String(row.partition_key));
  grandchildren.sort((a,b)=>
    b.remaining_enum_fanout_score-a.remaining_enum_fanout_score ||
    stableJson(a.second_split_value).localeCompare(stableJson(b.second_split_value))
  );
  return grandchildren[0];
}

async function plan(){
  if(!Number.isInteger(TARGET_COUNT)||TARGET_COUNT<12||TARGET_COUNT>20)throw new Error('UCHIRIMO_RECOVERY_PILOT_TARGET_COUNT_INVALID:'+TARGET_COUNT);
  const head=currentExactHead();
  const runtime=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');
  if(!runtime?.sourcePackageIntegrity?.match)throw new Error('UCHIRIMO_RECOVERY_PILOT_RUNTIME_INTEGRITY_NOT_PASS');
  const base=JSON.parse(readFileSync(BASE_PLAN,'utf8'));
  if(base.status!=='PASS'||base.exact_head!==head)throw new Error('UCHIRIMO_RECOVERY_PILOT_BASE_PLAN_INVALID');
  if(base.runtime_manifest_sha256!==runtime.sourcePackageIntegrity.actual)throw new Error('UCHIRIMO_RECOVERY_PILOT_RUNTIME_HASH_MISMATCH');

  const plus1Candidates=await buildPlus1Candidates(base);
  const selectedPlus1=selectPlus1PilotBranches(plus1Candidates);
  if(selectedPlus1.length!==TARGET_COUNT)throw new Error('UCHIRIMO_RECOVERY_PILOT_PLUS1_SELECTED_COUNT_MISMATCH:'+selectedPlus1.length+':'+TARGET_COUNT);

  const selected=[];
  for(const row of selectedPlus1)selected.push(await deepenPlus1Branch(row));
  if(selected.length!==TARGET_COUNT)throw new Error('UCHIRIMO_RECOVERY_PILOT_SELECTED_COUNT_MISMATCH:'+selected.length+':'+TARGET_COUNT);

  const pilotRows=selected.map((row,index)=>({
    ...row,
    shard:index,
    pilot_index:index
  }));
  const matrix={include:pilotRows.map((row)=>({
    pilot_index:row.pilot_index,
    node_id:row.node_id,
    parent_partition_key:row.plus1_partition_key,
    split_field:row.second_split_field,
    split_cardinality:row.second_split_cardinality,
    split_path:row.first_split_field+'>'+row.second_split_field,
    child_timeout_ms:CHILD_TIMEOUT_MS,
    batch_id:'recovery-pilot-'+String(row.pilot_index).padStart(2,'0'),
    batch_json:JSON.stringify([{
      shard:row.shard,
      node_id:row.node_id,
      partition_key:row.partition_key,
      room_specification:row.room_specification,
      window_type:row.window_type,
      sash_configuration:row.sash_configuration,
      size_class:row.size_class,
      glass_family:row.glass_family,
      partition_seed_json:row.partition_seed_json
    }])
  }))};

  mkdirSync(PLAN_OUT,{recursive:true});
  const planReport={
    schema_version:'1.1.0',
    exact_head:head,
    task_classification:'NON-PRODUCT-MASTER',
    product_master_mutation:0,
    purpose:'UCHIRIMO_HEAVY_PARTITION_RECOVERY_PILOT',
    partition_plan_version:'UCHIRIMO_RECOVERY_PILOT_ADAPTIVE_PLUS2_V2',
    recovery_split_depth:2,
    selection_strategy:'V1_QUOTA_BRANCHES_THEN_MAX_REMAINING_ENUM_FANOUT',
    target_node_ids:[...TARGET_NODE_IDS],
    target_quotas:Object.fromEntries(TARGET_QUOTAS),
    pilot_partition_count:pilotRows.length,
    child_timeout_ms:CHILD_TIMEOUT_MS,
    pass_max_elapsed_ms:PASS_MAX_ELAPSED_MS,
    runtime_manifest_sha256:runtime.sourcePackageIntegrity.actual,
    runtime_integrity_match:true,
    semantic_execution_source_unchanged:true,
    full_coverage_authorized:false,
    pilot_partitions:pilotRows,
    matrix,
    status:'PASS'
  };
  writeFileSync(join(PLAN_OUT,'plan.json'),JSON.stringify(planReport,null,2)+'\n');
  if(process.env.GITHUB_OUTPUT){
    writeFileSync(process.env.GITHUB_OUTPUT,'matrix='+JSON.stringify(matrix)+'\n'+'pilot_count='+String(pilotRows.length)+'\n',{flag:'a'});
  }
  console.log('UCHIRIMO_RECOVERY_PILOT_PLAN=PASS version='+planReport.partition_plan_version+' count='+pilotRows.length+' nodes='+[...TARGET_NODE_IDS].join(','));
}

async function verify(){
  const head=process.env.HEAD_SHA??process.env.GITHUB_SHA??currentExactHead();
  mkdirSync(SHARD_OUT,{recursive:true});
  const batchPaths=walk(SHARD_OUT).filter((path)=>/batch-recovery-pilot-\d+-report\.json$/.test(path));
  const shardPaths=walk(SHARD_OUT).filter((path)=>/shard-\d+-report\.json$/.test(path));
  const failurePaths=walk(SHARD_OUT).filter((path)=>/shard-\d+-failure\.json$/.test(path));
  const errors=[];
  let batch=null;
  let shard=null;
  let elapsed=null;
  let caseShaMatch=false;

  if(batchPaths.length!==1)errors.push('BATCH_REPORT_COUNT_'+batchPaths.length);
  else{
    batch=JSON.parse(readFileSync(batchPaths[0],'utf8'));
    if(batch.exact_head!==head)errors.push('BATCH_HEAD_MISMATCH');
    if(batch.status!=='PASS'||batch.fail_count!==0||batch.pass_count!==1)errors.push('BATCH_NOT_PASS');
    const item=batch.results?.[0];
    elapsed=durationMs(item?.started_at,item?.completed_at);
    if(item?.timed_out===true)errors.push('CHILD_TIMEOUT');
    if(item?.status!=='PASS')errors.push('CHILD_NOT_PASS');
  }

  if(shardPaths.length!==1)errors.push('SHARD_REPORT_COUNT_'+shardPaths.length);
  else{
    shard=JSON.parse(readFileSync(shardPaths[0],'utf8'));
    if(shard.exact_head!==head)errors.push('SHARD_HEAD_MISMATCH');
    if(shard.status!=='PASS')errors.push('SHARD_NOT_PASS');
    if(shard.runtime_integrity_match!==true)errors.push('RUNTIME_INTEGRITY_FAIL');
    if(shard.unverified_discrete_selector_case_count!==0)errors.push('UNVERIFIED_NONZERO');
    const casePath=join(SHARD_OUT,String(shard.case_artifact??''));
    if(!statSafe(casePath)?.isFile())errors.push('CASE_ARTIFACT_MISSING');
    else{
      const actual=createHash('sha256').update(readFileSync(casePath)).digest('hex');
      caseShaMatch=actual===shard.case_artifact_sha256;
      if(!caseShaMatch)errors.push('CASE_ARTIFACT_SHA_MISMATCH');
    }
  }
  if(failurePaths.length)errors.push('SHARD_FAILURE_ARTIFACT_PRESENT');
  const report={
    schema_version:'1.0.0',
    exact_head:head,
    batch_id:batch?.batch_id??null,
    shard_index:shard?.shard_index??null,
    node_id:shard?.node_id??null,
    partition_key:shard?.partition_key??null,
    elapsed_ms:elapsed,
    timed_out:batch?.results?.[0]?.timed_out??null,
    runtime_integrity_match:shard?.runtime_integrity_match??false,
    unverified_discrete_selector_case_count:shard?.unverified_discrete_selector_case_count??null,
    case_artifact_sha256_match:caseShaMatch,
    failure_artifact_count:failurePaths.length,
    errors,
    status:errors.length?'FAIL':'PASS'
  };
  writeFileSync(join(SHARD_OUT,'pilot-verification-'+String(report.shard_index??'unknown')+'.json'),JSON.stringify(report,null,2)+'\n');
  console.log('UCHIRIMO_RECOVERY_PILOT_CHILD_VERIFY='+report.status+' elapsed_ms='+String(elapsed));
  if(errors.length)process.exit(1);
}

function aggregate(){
  const head=process.env.HEAD_SHA??process.env.GITHUB_SHA??currentExactHead();
  const plan=JSON.parse(readFileSync(join(PLAN_OUT,'plan.json'),'utf8'));
  if(plan.status!=='PASS'||plan.exact_head!==head)throw new Error('UCHIRIMO_RECOVERY_PILOT_AGGREGATE_PLAN_INVALID');
  const planned=plan.pilot_partitions??[];
  const verificationPaths=walk(SOURCE_ROOT).filter((path)=>/pilot-verification-\d+\.json$/.test(path));
  const verifications=verificationPaths.map((path)=>JSON.parse(readFileSync(path,'utf8')));
  const batchPaths=walk(SOURCE_ROOT).filter((path)=>/batch-recovery-pilot-\d+-report\.json$/.test(path));
  const batches=batchPaths.map((path)=>JSON.parse(readFileSync(path,'utf8')));
  const shardPaths=walk(SOURCE_ROOT).filter((path)=>/shard-\d+-report\.json$/.test(path));
  const shards=shardPaths.map((path)=>JSON.parse(readFileSync(path,'utf8')));

  const errors=[];
  if(planned.length<TARGET_COUNT||planned.length>20)errors.push('PLANNED_COUNT_INVALID_'+planned.length);
  if(verifications.length!==planned.length)errors.push('VERIFICATION_COUNT_'+verifications.length+'_'+planned.length);
  if(batches.length!==planned.length)errors.push('BATCH_COUNT_'+batches.length+'_'+planned.length);
  if(shards.length!==planned.length)errors.push('SHARD_COUNT_'+shards.length+'_'+planned.length);

  const plannedKeys=new Set(planned.map((row)=>String(row.partition_key)));
  const seenKeys=new Set();
  let timeoutCount=0;
  let failureCount=0;
  let unverifiedCount=0;
  let runtimeIntegrityFailures=0;
  let artifactIntegrityFailures=0;
  let noMarginCount=0;
  let maxElapsedMs=0;
  const runtimeHashes=new Set();

  for(const verification of verifications){
    if(verification.exact_head!==head)errors.push('VERIFY_HEAD_MISMATCH');
    if(verification.status!=='PASS')failureCount+=1;
    if(verification.timed_out===true)timeoutCount+=1;
    if(verification.runtime_integrity_match!==true)runtimeIntegrityFailures+=1;
    if(verification.case_artifact_sha256_match!==true)artifactIntegrityFailures+=1;
    if(Number(verification.unverified_discrete_selector_case_count??1)!==0)unverifiedCount+=1;
    const elapsed=Number(verification.elapsed_ms??Number.NaN);
    if(Number.isFinite(elapsed)){
      maxElapsedMs=Math.max(maxElapsedMs,elapsed);
      if(elapsed>PASS_MAX_ELAPSED_MS)noMarginCount+=1;
    }else{
      noMarginCount+=1;
    }
  }
  for(const batch of batches){
    if(batch.exact_head!==head||batch.status!=='PASS'||batch.fail_count!==0)failureCount+=1;
    if(batch.results?.some((row)=>row.timed_out===true))timeoutCount+=1;
  }
  for(const shard of shards){
    const key=String(shard.partition_key??'');
    if(!plannedKeys.has(key))errors.push('UNPLANNED_SHARD_'+key);
    if(seenKeys.has(key))errors.push('DUPLICATE_SHARD_'+key);
    seenKeys.add(key);
    if(shard.exact_head!==head||shard.status!=='PASS')failureCount+=1;
    if(shard.runtime_integrity_match!==true)runtimeIntegrityFailures+=1;
    if(Number(shard.unverified_discrete_selector_case_count??1)!==0)unverifiedCount+=1;
    runtimeHashes.add(String(shard.runtime_manifest_sha256??''));
  }
  if(seenKeys.size!==plannedKeys.size)errors.push('PARTITION_COVERAGE_'+seenKeys.size+'_'+plannedKeys.size);
  if(runtimeHashes.size!==1||![...runtimeHashes].includes(String(plan.runtime_manifest_sha256)))errors.push('RUNTIME_HASH_SET_MISMATCH');

  const hardGatePass=
    errors.length===0 &&
    failureCount===0 &&
    timeoutCount===0 &&
    unverifiedCount===0 &&
    runtimeIntegrityFailures===0 &&
    artifactIntegrityFailures===0 &&
    noMarginCount===0 &&
    maxElapsedMs<=PASS_MAX_ELAPSED_MS;

  mkdirSync(AGGREGATE_OUT,{recursive:true});
  const report={
    schema_version:'1.0.0',
    exact_head:head,
    task_classification:'NON-PRODUCT-MASTER',
    product_master_mutation:0,
    purpose:'UCHIRIMO_HEAVY_PARTITION_RECOVERY_PILOT',
    partition_plan_version:plan.partition_plan_version,
    target_node_ids:plan.target_node_ids,
    pilot_partition_count:planned.length,
    pass_max_elapsed_ms:PASS_MAX_ELAPSED_MS,
    child_timeout_ms:CHILD_TIMEOUT_MS,
    max_elapsed_ms:maxElapsedMs,
    timeout_count:timeoutCount,
    failure_count:failureCount,
    unverified_count:unverifiedCount,
    runtime_integrity_failure_count:runtimeIntegrityFailures,
    artifact_integrity_failure_count:artifactIntegrityFailures,
    no_margin_count:noMarginCount,
    runtime_manifest_sha256:plan.runtime_manifest_sha256,
    semantic_execution_source_unchanged:true,
    full_coverage_authorized:hardGatePass,
    errors,
    recovery_pilot_hard_gate:hardGatePass?'PASS':'FAIL',
    status:hardGatePass?'PASS':'FAIL'
  };
  writeFileSync(join(AGGREGATE_OUT,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log('RECOVERY_PILOT_HARD_GATE='+report.recovery_pilot_hard_gate+' count='+planned.length+' max_elapsed_ms='+maxElapsedMs+' timeout='+timeoutCount+' failure='+failureCount+' no_margin='+noMarginCount);
  if(!hardGatePass)process.exit(1);
}

if(MODE==='plan')await plan();
else if(MODE==='verify')await verify();
else if(MODE==='aggregate')aggregate();
else throw new Error('UCHIRIMO_RECOVERY_PILOT_MODE_INVALID:'+MODE);
