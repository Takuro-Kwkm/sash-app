import './uchirimo-heavy-partition-analysis-core.mjs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { currentExactHead, writeJson } from './governance-lib.mjs';

const OUT=String(process.env.UCHIRIMO_HEAVY_ANALYSIS_OUT ?? 'artifacts/uchirimo-heavy-recovery');
const DEPTH2_MICRO_CHILD_TIMEOUT_MS=Number(process.env.UCHIRIMO_DEPTH2_MICRO_CHILD_TIMEOUT_MS ?? 60000);
const head=currentExactHead();

const stable=(value)=>{
  if(Array.isArray(value))return value.map(stable);
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,stable(v)]));
};
const stableJson=(value)=>JSON.stringify(stable(value));
const hash=(value)=>createHash('sha256').update(typeof value==='string'?value:stableJson(value)).digest('hex');
const readJson=(path)=>JSON.parse(readFileSync(path,'utf8'));
const readJsonSafe=(path)=>{try{return readJson(path);}catch{return null;}};
function durationMs(startedAt,completedAt){
  const a=Date.parse(startedAt??'');
  const b=Date.parse(completedAt??'');
  return Number.isFinite(a)&&Number.isFinite(b)&&b>=a?b-a:null;
}
function microBatchRow(child){
  const prefix=child.SELECTOR_PREFIX??{};
  const baseKeys=new Set(['room_specification','window_type','glass_family','sash_configuration','size_class']);
  const extra=Object.fromEntries(Object.entries(prefix).filter(([key])=>!baseKeys.has(key)));
  return {
    shard:0,
    node_id:child.PRODUCT_NODE,
    partition_key:child.PARTITION_ID,
    room_specification:String(prefix.room_specification),
    window_type:String(prefix.window_type),
    sash_configuration:prefix.sash_configuration==null?'__UNSET__':String(prefix.sash_configuration),
    size_class:prefix.size_class==null?'__UNSET__':String(prefix.size_class),
    glass_family:String(prefix.glass_family),
    partition_seed_json:stableJson(extra)
  };
}

if(!Number.isFinite(DEPTH2_MICRO_CHILD_TIMEOUT_MS)||DEPTH2_MICRO_CHILD_TIMEOUT_MS<30000)throw new Error('DEPTH2_MICRO_CHILD_TIMEOUT_INVALID');
const depth1=readJson(`${OUT}/depth1-micro-calibration.json`);
const depth2Plan=readJson(`${OUT}/depth2-recursive-partition-plan.json`);
const depth2Proof=readJson(`${OUT}/depth2-coverage-preservation-proof.json`);
if(depth1.exact_head!==head||depth2Plan.exact_head!==head||depth2Proof.exact_head!==head)throw new Error('DEPTH2_MICRO_EXACT_HEAD_MISMATCH');
if(depth1.decision!=='DEPTH2_REQUIRED_FOR_FAILED_NODES'||Number(depth1.calibration_invalid_count??1)!==0)throw new Error('DEPTH2_MICRO_DEPTH1_PRECONDITION_INVALID');
if(depth2Plan.status!=='PLAN_READY'||depth2Proof.coverage_preservation_status!=='PASS')throw new Error('DEPTH2_MICRO_PLAN_PRECONDITION_INVALID');
if(depth2Plan.PARTITION_OVERLAP_COUNT!==0||depth2Plan.PARTITION_GAP_COUNT!==0||depth2Plan.UNSPLITTABLE_PARENT_COUNT!==0)throw new Error('DEPTH2_MICRO_COVERAGE_SHAPE_INVALID');

const targetNodes=[...(depth1.failed_product_nodes??[])].sort();
if(targetNodes.length===0)throw new Error('DEPTH2_MICRO_TARGET_NODE_EMPTY');
const selected=[];
for(const node of targetNodes){
  const source=depth1.results?.find((row)=>row.product_node===node&&row.status==='NEEDS_DEEPER_SPLIT');
  if(!source?.child_partition_id)throw new Error(`DEPTH2_MICRO_SOURCE_CHILD_MISSING:${node}`);
  const candidates=(depth2Plan.children??[])
    .filter((row)=>row.PRODUCT_NODE===node&&row.PARENT_PARTITION_ID===source.child_partition_id)
    .sort((a,b)=>stableJson(a.SPLIT_VALUE).localeCompare(stableJson(b.SPLIT_VALUE))||String(a.PARTITION_ID).localeCompare(String(b.PARTITION_ID)));
  const child=candidates[0];
  if(!child)throw new Error(`DEPTH2_MICRO_CHILD_SELECTION_FAILED:${node}:${source.child_partition_id}`);
  selected.push({node,source,child});
}

const microOut=`${OUT}/depth2-micro-calibration`;
mkdirSync(microOut,{recursive:true});
const results=[];
for(const [index,{node,source,child}] of selected.entries()){
  const caseId=String(index).padStart(2,'0');
  const caseOut=`${microOut}/case-${caseId}`;
  const batchId=`depth2-micro-${caseId}`;
  mkdirSync(caseOut,{recursive:true});
  const row=microBatchRow(child);
  let executionError=null;
  try{
    execFileSync(process.execPath,['scripts/governance/uchirimo-selector-batch-runner.mjs'],{
      env:{
        ...process.env,
        HEAD_SHA:head,
        UCHIRIMO_SELECTOR_BATCH_ID:batchId,
        UCHIRIMO_SELECTOR_BATCH_JSON:JSON.stringify([row]),
        UCHIRIMO_SELECTOR_CHILD_TIMEOUT_MS:String(DEPTH2_MICRO_CHILD_TIMEOUT_MS),
        UCHIRIMO_SELECTOR_EXPECTED_SHARDS:'1',
        UCHIRIMO_FULL_SELECTOR_OUT:caseOut
      },
      encoding:'utf8',
      timeout:DEPTH2_MICRO_CHILD_TIMEOUT_MS+20000,
      maxBuffer:64*1024*1024
    });
  }catch(error){
    executionError={message:String(error?.message??error),code:error?.code??null,signal:error?.signal??null,killed:error?.killed??null};
  }
  const batchReport=readJsonSafe(`${caseOut}/batch-${batchId}-report.json`);
  const shardReport=readJsonSafe(`${caseOut}/shard-0-report.json`);
  const failureReport=readJsonSafe(`${caseOut}/shard-0-failure.json`);
  let caseArtifactShaMatch=null;
  if(shardReport?.case_artifact){
    const casePath=`${caseOut}/${shardReport.case_artifact}`;
    if(existsSync(casePath)){
      const actual=createHash('sha256').update(readFileSync(casePath)).digest('hex');
      caseArtifactShaMatch=actual===shardReport.case_artifact_sha256;
      unlinkSync(casePath);
    }
  }
  const terminalDigest=`${caseOut}/shard-0-terminal-digests.jsonl`;
  if(existsSync(terminalDigest))unlinkSync(terminalDigest);
  const elapsed=durationMs(batchReport?.results?.[0]?.started_at,batchReport?.results?.[0]?.completed_at);
  const pass=
    batchReport?.status==='PASS'&&
    batchReport?.results?.[0]?.timed_out!==true&&
    shardReport?.status==='PASS'&&
    shardReport?.runtime_integrity_match===true&&
    Number(shardReport?.unverified_discrete_selector_case_count??1)===0&&
    caseArtifactShaMatch===true&&
    Number.isFinite(elapsed)&&elapsed<=DEPTH2_MICRO_CHILD_TIMEOUT_MS;
  const failureMessage=String(failureReport?.message??'');
  const needsDeeperSplit=
    batchReport?.results?.[0]?.timed_out===true||
    /UCHIRIMO_SELECTOR_STATE_LIMIT_REACHED|UCHIRIMO_TERMINAL_LIMIT_REACHED/.test(failureMessage);
  const status=pass?'PASS':needsDeeperSplit?'NEEDS_DEEPER_SPLIT':'CALIBRATION_INVALID';
  const result={
    index,
    product_node:node,
    source_depth1_child_partition_id:source.child_partition_id,
    depth2_child_partition_id:child.PARTITION_ID,
    depth2_parent_partition_id:child.PARENT_PARTITION_ID,
    root_heavy_parent_partition_id:child.ROOT_HEAVY_PARENT_PARTITION_ID,
    split_field:child.SPLIT_FIELD,
    split_value:child.SPLIT_VALUE,
    child_timeout_ms:DEPTH2_MICRO_CHILD_TIMEOUT_MS,
    elapsed_ms:elapsed,
    timed_out:batchReport?.results?.[0]?.timed_out??null,
    visited_state_count:shardReport?.visited_state_count??null,
    terminal_context_count:shardReport?.terminal_context_count??null,
    observed_peak_heap_mb:shardReport?.observed_peak_heap_mb??null,
    runtime_integrity_match:shardReport?.runtime_integrity_match??false,
    unverified_discrete_selector_case_count:shardReport?.unverified_discrete_selector_case_count??null,
    case_artifact_sha256_match:caseArtifactShaMatch,
    execution_error:executionError,
    failure_artifact_present:Boolean(failureReport),
    failure_message:failureMessage||null,
    status
  };
  results.push(result);
  console.log(`DEPTH2_MICRO_CASE node=${node} status=${status} elapsed_ms=${String(elapsed)} states=${String(result.visited_state_count)} terminals=${String(result.terminal_context_count)}`);
}

const passRows=results.filter((row)=>row.status==='PASS');
const deeperRows=results.filter((row)=>row.status==='NEEDS_DEEPER_SPLIT');
const invalidRows=results.filter((row)=>row.status==='CALIBRATION_INVALID');
const summary={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_DEPTH2_MICRO_CALIBRATION',
  exact_head:head,
  task_classification:'NON-PRODUCT-MASTER',
  product_master_mutation:0,
  source_depth1_micro_sha256:hash(depth1),
  source_depth2_plan_sha256:hash(depth2Plan),
  source_depth2_coverage_proof_sha256:hash(depth2Proof),
  source_depth2_plan_status:depth2Plan.status,
  source_depth2_coverage_preservation_status:depth2Proof.coverage_preservation_status,
  selected_product_node_count:targetNodes.length,
  selected_child_count:results.length,
  child_timeout_ms:DEPTH2_MICRO_CHILD_TIMEOUT_MS,
  pass_count:passRows.length,
  needs_deeper_split_count:deeperRows.length,
  calibration_invalid_count:invalidRows.length,
  pass_product_nodes:passRows.map((row)=>row.product_node),
  failed_product_nodes:deeperRows.map((row)=>row.product_node),
  invalid_product_nodes:invalidRows.map((row)=>row.product_node),
  results,
  full_depth2_execution_authorized:false,
  decision:invalidRows.length>0
    ?'CALIBRATION_INVALID'
    :passRows.length===results.length
      ?'DEPTH2_FAST_PATH_PROMISING'
      :'DEPTH3_REQUIRED_FOR_FAILED_NODES',
  status:invalidRows.length>0?'BLOCKED':'MEASURED_CALIBRATION_ONLY'
};
writeJson(`${OUT}/depth2-micro-calibration.json`,summary);
console.log(`DEPTH2_MICRO_CALIBRATION_PASS_COUNT=${passRows.length}/${results.length}`);
console.log(`DEPTH2_MICRO_CALIBRATION_INVALID_COUNT=${invalidRows.length}`);
console.log(`DEPTH2_MICRO_CALIBRATION_DECISION=${summary.decision}`);
console.log('UCHIRIMO_FULL_COVERAGE_QA_GATE=BLOCKED');
console.log('APP_INTEGRATION_READY=FALSE');
console.log('RELEASE_INPUT_GATE=BLOCKED');
if(invalidRows.length>0)throw new Error('DEPTH2_MICRO_CALIBRATION_INVALID');
