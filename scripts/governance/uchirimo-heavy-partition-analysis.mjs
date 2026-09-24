import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolveRuntimeAppProduct } from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { currentExactHead, writeJson } from './governance-lib.mjs';

const PRODUCT_ID='SER-YKKAP-UCHIRIMO';
const BASE_ANALYSIS_COMMIT='9487ab753962e71b737d49c21c2a875523560260';
const BASE_ANALYSIS_BLOB='f74843323373de4fa87cf69f636e9b738abb7beb';
const ANALYSIS_PATH='scripts/governance/uchirimo-heavy-partition-analysis.mjs';
const OUT=String(process.env.UCHIRIMO_HEAVY_ANALYSIS_OUT ?? 'artifacts/uchirimo-heavy-recovery');
const DEPTH1_REPLAY_CHILD_TIMEOUT_MS=Number(process.env.UCHIRIMO_DEPTH1_REPLAY_CHILD_TIMEOUT_MS ?? 60000);
const DEPTH2_MICRO_CHILD_TIMEOUT_MS=Number(process.env.UCHIRIMO_DEPTH2_MICRO_CHILD_TIMEOUT_MS ?? 60000);
const DEPTH3_MICRO_CHILD_TIMEOUT_MS=Number(process.env.UCHIRIMO_DEPTH3_MICRO_CHILD_TIMEOUT_MS ?? 60000);
const head=currentExactHead();

if(!Number.isFinite(DEPTH1_REPLAY_CHILD_TIMEOUT_MS)||DEPTH1_REPLAY_CHILD_TIMEOUT_MS<60000)throw new Error('DEPTH1_REPLAY_CHILD_TIMEOUT_INVALID');
if(!Number.isFinite(DEPTH2_MICRO_CHILD_TIMEOUT_MS)||DEPTH2_MICRO_CHILD_TIMEOUT_MS<60000)throw new Error('DEPTH2_MICRO_CHILD_TIMEOUT_INVALID');
if(!Number.isFinite(DEPTH3_MICRO_CHILD_TIMEOUT_MS)||DEPTH3_MICRO_CHILD_TIMEOUT_MS<60000)throw new Error('DEPTH3_MICRO_CHILD_TIMEOUT_INVALID');

// Re-execute the accepted analysis body at the current Exact HEAD. The source
// blob is pinned and mechanically verified. Prior-head QA artifacts are not
// carried forward as current-head PASS evidence.
execFileSync('git',['merge-base','--is-ancestor',BASE_ANALYSIS_COMMIT,head],{stdio:'ignore'});
const baseSource=execFileSync('git',['show',`${BASE_ANALYSIS_COMMIT}:${ANALYSIS_PATH}`],{encoding:'utf8',maxBuffer:8*1024*1024});
const actualBlob=execFileSync('git',['hash-object','--stdin'],{input:baseSource,encoding:'utf8'}).trim();
if(actualBlob!==BASE_ANALYSIS_BLOB)throw new Error(`DEPTH3_MICRO_BASE_ANALYSIS_BLOB_MISMATCH:${actualBlob}`);
const tempCore=`scripts/governance/.uchirimo-heavy-partition-analysis-core-${process.pid}.mjs`;
const priorDepth1Timeout=process.env.UCHIRIMO_DEPTH1_MICRO_CHILD_TIMEOUT_MS;
process.env.UCHIRIMO_DEPTH1_MICRO_CHILD_TIMEOUT_MS=String(DEPTH1_REPLAY_CHILD_TIMEOUT_MS);
writeFileSync(tempCore,baseSource);
try{
  await import(`${pathToFileURL(tempCore).href}?head=${head}`);
}finally{
  if(priorDepth1Timeout===undefined)delete process.env.UCHIRIMO_DEPTH1_MICRO_CHILD_TIMEOUT_MS;
  else process.env.UCHIRIMO_DEPTH1_MICRO_CHILD_TIMEOUT_MS=priorDepth1Timeout;
  if(existsSync(tempCore))unlinkSync(tempCore);
}

const stable=(value)=>{
  if(Array.isArray(value))return value.map(stable);
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,stable(v)]));
};
const stableJson=(value)=>JSON.stringify(stable(value));
const hash=(value)=>createHash('sha256').update(typeof value==='string'?value:stableJson(value)).digest('hex');
const same=(a,b)=>Object.is(a,b)||String(a)===String(b);
const readJson=(path)=>JSON.parse(readFileSync(path,'utf8'));
const readJsonSafe=(path)=>{try{return readJson(path);}catch{return null;}};
const enabled=(field)=>(field?.values??[]).filter((row)=>row.disabled!==true);
const CONTINUOUS_KEYS=new Set(['size_w','size_h','frame_projection','fukashi_dimension','custom_w','custom_h','custom_width','custom_height']);
const TECHNICAL_KEYS=new Set(['legacyConstruction','legacyConfiguration','internal_construction']);
function flowSignature(result){
  return (result.fields??[])
    .filter((field)=>!TECHNICAL_KEYS.has(field.key))
    .map((field)=>String(field.semanticStage)+':'+String(field.semanticSlot)+':'+String(field.key)+':'+(field.required?'R':'O')+':'+(field.readOnly?'RO':'RW'))
    .join('|');
}
function nextSplit(result,seed){
  for(const field of result.fields??[]){
    if(field.required!==true||field.readOnly===true||field.dataType!=='ENUM')continue;
    if(TECHNICAL_KEYS.has(field.key)||CONTINUOUS_KEYS.has(field.key))continue;
    if(Object.prototype.hasOwnProperty.call(seed,field.key))continue;
    const values=[...new Map(enabled(field).map((row)=>[stableJson(row.value),row.value])).values()];
    if(values.length>1)return {field_key:field.key,field_required:true,field_data_type:'ENUM',values};
  }
  return null;
}
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
function runMicroCase({child,index,depth,timeoutMs}){
  const microOut=`${OUT}/depth${depth}-micro-calibration`;
  mkdirSync(microOut,{recursive:true});
  const caseId=String(index).padStart(2,'0');
  const caseOut=`${microOut}/case-${caseId}`;
  const batchId=`depth${depth}-micro-${caseId}`;
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
        UCHIRIMO_SELECTOR_CHILD_TIMEOUT_MS:String(timeoutMs),
        UCHIRIMO_SELECTOR_EXPECTED_SHARDS:'1',
        UCHIRIMO_FULL_SELECTOR_OUT:caseOut
      },
      encoding:'utf8',
      timeout:timeoutMs+20000,
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
    Number.isFinite(elapsed)&&elapsed<=timeoutMs;
  const failureMessage=String(failureReport?.message??'');
  const needsDeeperSplit=
    batchReport?.results?.[0]?.timed_out===true||
    /UCHIRIMO_SELECTOR_STATE_LIMIT_REACHED|UCHIRIMO_TERMINAL_LIMIT_REACHED/.test(failureMessage);
  return {
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
    status:pass?'PASS':needsDeeperSplit?'NEEDS_DEEPER_SPLIT':'CALIBRATION_INVALID'
  };
}

const depth1=readJson(`${OUT}/depth1-micro-calibration.json`);
const depth2Plan=readJson(`${OUT}/depth2-recursive-partition-plan.json`);
const depth2Proof=readJson(`${OUT}/depth2-coverage-preservation-proof.json`);
if(depth1.exact_head!==head||depth2Plan.exact_head!==head||depth2Proof.exact_head!==head)throw new Error('DEPTH2_MICRO_EXACT_HEAD_MISMATCH');
if(depth1.decision!=='DEPTH2_REQUIRED_FOR_FAILED_NODES'||Number(depth1.calibration_invalid_count??1)!==0)throw new Error('DEPTH2_MICRO_DEPTH1_PRECONDITION_INVALID');
if(depth2Plan.status!=='PLAN_READY'||depth2Proof.coverage_preservation_status!=='PASS')throw new Error('DEPTH2_MICRO_PLAN_PRECONDITION_INVALID');
if(depth2Plan.PARTITION_OVERLAP_COUNT!==0||depth2Plan.PARTITION_GAP_COUNT!==0||depth2Plan.UNSPLITTABLE_PARENT_COUNT!==0)throw new Error('DEPTH2_MICRO_COVERAGE_SHAPE_INVALID');

const targetNodes=[...(depth1.failed_product_nodes??[])].sort();
if(targetNodes.length===0)throw new Error('DEPTH2_MICRO_TARGET_NODE_EMPTY');
const depth2Selected=[];
for(const node of targetNodes){
  const source=depth1.results?.find((row)=>row.product_node===node&&row.status==='NEEDS_DEEPER_SPLIT');
  if(!source?.child_partition_id)throw new Error(`DEPTH2_MICRO_SOURCE_CHILD_MISSING:${node}`);
  const candidates=(depth2Plan.children??[])
    .filter((row)=>row.PRODUCT_NODE===node&&row.PARENT_PARTITION_ID===source.child_partition_id)
    .sort((a,b)=>stableJson(a.SPLIT_VALUE).localeCompare(stableJson(b.SPLIT_VALUE))||String(a.PARTITION_ID).localeCompare(String(b.PARTITION_ID)));
  const child=candidates[0];
  if(!child)throw new Error(`DEPTH2_MICRO_CHILD_SELECTION_FAILED:${node}:${source.child_partition_id}`);
  depth2Selected.push({node,source,child});
}

const depth2Results=[];
for(const [index,{node,source,child}] of depth2Selected.entries()){
  const measured=runMicroCase({child,index,depth:2,timeoutMs:DEPTH2_MICRO_CHILD_TIMEOUT_MS});
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
    ...measured
  };
  depth2Results.push(result);
  console.log(`DEPTH2_MICRO_CASE node=${node} status=${result.status} elapsed_ms=${String(result.elapsed_ms)} states=${String(result.visited_state_count)} terminals=${String(result.terminal_context_count)}`);
}
const depth2PassRows=depth2Results.filter((row)=>row.status==='PASS');
const depth2DeeperRows=depth2Results.filter((row)=>row.status==='NEEDS_DEEPER_SPLIT');
const depth2InvalidRows=depth2Results.filter((row)=>row.status==='CALIBRATION_INVALID');
const depth2Summary={
  schema_version:'1.1.0',
  artifact_type:'UCHIRIMO_DEPTH2_MICRO_CALIBRATION',
  exact_head:head,
  task_classification:'NON-PRODUCT-MASTER',
  product_master_mutation:0,
  base_analysis_commit:BASE_ANALYSIS_COMMIT,
  base_analysis_blob:BASE_ANALYSIS_BLOB,
  base_analysis_reexecuted_at_current_head:true,
  depth1_replay_child_timeout_ms:DEPTH1_REPLAY_CHILD_TIMEOUT_MS,
  source_depth1_micro_sha256:hash(depth1),
  source_depth2_plan_sha256:hash(depth2Plan),
  source_depth2_coverage_proof_sha256:hash(depth2Proof),
  source_depth2_plan_status:depth2Plan.status,
  source_depth2_coverage_preservation_status:depth2Proof.coverage_preservation_status,
  selected_product_node_count:targetNodes.length,
  selected_child_count:depth2Results.length,
  child_timeout_ms:DEPTH2_MICRO_CHILD_TIMEOUT_MS,
  pass_count:depth2PassRows.length,
  needs_deeper_split_count:depth2DeeperRows.length,
  calibration_invalid_count:depth2InvalidRows.length,
  pass_product_nodes:depth2PassRows.map((row)=>row.product_node),
  failed_product_nodes:depth2DeeperRows.map((row)=>row.product_node),
  invalid_product_nodes:depth2InvalidRows.map((row)=>row.product_node),
  results:depth2Results,
  full_depth2_execution_authorized:false,
  decision:depth2InvalidRows.length>0
    ?'CALIBRATION_INVALID'
    :depth2PassRows.length===depth2Results.length
      ?'DEPTH2_FAST_PATH_PROMISING'
      :'DEPTH3_REQUIRED_FOR_FAILED_NODES',
  status:depth2InvalidRows.length>0?'BLOCKED':'MEASURED_CALIBRATION_ONLY'
};
writeJson(`${OUT}/depth2-micro-calibration.json`,depth2Summary);
console.log(`DEPTH2_MICRO_CALIBRATION_PASS_COUNT=${depth2PassRows.length}/${depth2Results.length}`);
console.log(`DEPTH2_MICRO_CALIBRATION_INVALID_COUNT=${depth2InvalidRows.length}`);
console.log(`DEPTH2_MICRO_CALIBRATION_DECISION=${depth2Summary.decision}`);
if(depth2InvalidRows.length>0)throw new Error('DEPTH2_MICRO_CALIBRATION_INVALID');

let depth3Plan=null;
let depth3Proof=null;
if(depth2Summary.decision==='DEPTH3_REQUIRED_FOR_FAILED_NODES'){
  const parentRows=[];
  const childRows=[];
  for(const timeoutRow of depth2DeeperRows){
    const depth2Child=(depth2Plan.children??[]).find((row)=>row.PARTITION_ID===timeoutRow.depth2_child_partition_id);
    if(!depth2Child)throw new Error(`DEPTH3_PARENT_NOT_FOUND:${timeoutRow.product_node}:${timeoutRow.depth2_child_partition_id}`);
    const seed=depth2Child.SELECTOR_PREFIX??{};
    const resolved=await resolveRuntimeAppProduct(PRODUCT_ID,seed);
    for(const [key,value] of Object.entries(seed))if(!same(resolved.selection?.[key],value))throw new Error(`DEPTH3_PARENT_SEED_REJECTED:${depth2Child.PARTITION_ID}:${key}`);
    const split=nextSplit(resolved,seed);
    const parent={
      PARTITION_ID:depth2Child.PARTITION_ID,
      PRODUCT_NODE:depth2Child.PRODUCT_NODE,
      WINDOW_ID:depth2Child.WINDOW_ID,
      FLOW_SIGNATURE:flowSignature(resolved),
      SELECTOR_PREFIX:seed,
      SOURCE_DEPTH2_PARTITION_ID:depth2Child.PARTITION_ID,
      ROOT_HEAVY_PARENT_PARTITION_ID:depth2Child.ROOT_HEAVY_PARENT_PARTITION_ID,
      NEXT_SPLIT_FIELD:split?.field_key??null,
      NEXT_SPLIT_FIELD_REQUIRED:split?.field_required??null,
      NEXT_SPLIT_FIELD_DATA_TYPE:split?.field_data_type??null,
      NEXT_SPLIT_CARDINALITY:split?.values?.length??0,
      NEXT_SPLIT_VALUES:split?.values?.map(stable)??[],
      EXACT_HEAD:head,
      RUNTIME_SNAPSHOT_ID:depth2Plan.runtime_snapshot_id,
      STATUS:split?'DEPTH3_SPLIT_PLANNED':'DEPTH3_UNSPLITTABLE'
    };
    parentRows.push(parent);
    if(!split)continue;
    for(const value of split.values){
      const childSeed={...seed,[split.field_key]:value};
      const childResolved=await resolveRuntimeAppProduct(PRODUCT_ID,childSeed);
      if(!same(childResolved.selection?.[split.field_key],value))throw new Error(`DEPTH3_CHILD_SEED_REJECTED:${depth2Child.PARTITION_ID}:${split.field_key}`);
      childRows.push({
        PARTITION_ID:`UHC3-${hash(stableJson([depth2Child.PARTITION_ID,split.field_key,value])).slice(0,20)}`,
        PARENT_PARTITION_ID:depth2Child.PARTITION_ID,
        ROOT_HEAVY_PARENT_PARTITION_ID:depth2Child.ROOT_HEAVY_PARENT_PARTITION_ID,
        PRODUCT_NODE:depth2Child.PRODUCT_NODE,
        WINDOW_ID:depth2Child.WINDOW_ID,
        FLOW_SIGNATURE:flowSignature(childResolved),
        SELECTOR_PREFIX:childSeed,
        SPLIT_FIELD:split.field_key,
        SPLIT_VALUE:value,
        PARTITION_DEPTH:3,
        EXECUTED_CASE_COUNT:0,
        PASS:0,
        FAIL:0,
        BLOCKED:0,
        UNVERIFIED:1,
        EXACT_HEAD:head,
        RUNTIME_SNAPSHOT_ID:depth2Plan.runtime_snapshot_id,
        STATUS:'PLANNED_UNVERIFIED'
      });
    }
  }

  const ids=childRows.map((row)=>row.PARTITION_ID);
  const overlapCount=ids.length-new Set(ids).size;
  const parentsWithChildren=new Set(childRows.map((row)=>row.PARENT_PARTITION_ID));
  const unsplittableParents=parentRows.filter((row)=>!parentsWithChildren.has(row.PARTITION_ID));
  let gapCount=0;
  let unionMismatchCount=0;
  let prefixMismatchCount=0;
  let semanticMismatchCount=0;
  let cardinalityMismatchCount=0;
  const proofRows=[];
  for(const parent of parentRows.filter((row)=>parentsWithChildren.has(row.PARTITION_ID))){
    const matching=childRows.filter((row)=>row.PARENT_PARTITION_ID===parent.PARTITION_ID);
    if(matching.length!==parent.NEXT_SPLIT_CARDINALITY)gapCount+=1;
    const expectedSet=new Set((parent.NEXT_SPLIT_VALUES??[]).map(stableJson));
    const actualSet=new Set(matching.map((row)=>stableJson(row.SPLIT_VALUE)));
    const unionMatch=expectedSet.size===actualSet.size&&[...expectedSet].every((value)=>actualSet.has(value));
    const cardinalityMatch=matching.length===parent.NEXT_SPLIT_CARDINALITY&&actualSet.size===matching.length;
    const semanticMatch=parent.NEXT_SPLIT_FIELD_REQUIRED===true&&parent.NEXT_SPLIT_FIELD_DATA_TYPE==='ENUM'&&Boolean(parent.NEXT_SPLIT_FIELD);
    let prefixMatch=true;
    for(const child of matching){
      const parentPreserved=Object.entries(parent.SELECTOR_PREFIX??{}).every(([key,value])=>same(child.SELECTOR_PREFIX?.[key],value));
      const extraKeys=Object.keys(child.SELECTOR_PREFIX??{}).filter((key)=>!Object.prototype.hasOwnProperty.call(parent.SELECTOR_PREFIX??{},key));
      const oneSplitAxis=extraKeys.length===1&&extraKeys[0]===parent.NEXT_SPLIT_FIELD&&same(child.SELECTOR_PREFIX?.[parent.NEXT_SPLIT_FIELD],child.SPLIT_VALUE);
      if(!parentPreserved||!oneSplitAxis){prefixMatch=false;break;}
    }
    if(!unionMatch)unionMismatchCount+=1;
    if(!prefixMatch)prefixMismatchCount+=1;
    if(!semanticMatch)semanticMismatchCount+=1;
    if(!cardinalityMatch)cardinalityMismatchCount+=1;
    proofRows.push({
      PARENT_PARTITION_ID:parent.PARTITION_ID,
      PRODUCT_NODE:parent.PRODUCT_NODE,
      SPLIT_FIELD:parent.NEXT_SPLIT_FIELD,
      SPLIT_FIELD_REQUIRED:parent.NEXT_SPLIT_FIELD_REQUIRED,
      SPLIT_FIELD_DATA_TYPE:parent.NEXT_SPLIT_FIELD_DATA_TYPE,
      EXPECTED_VALUE_COUNT:expectedSet.size,
      ACTUAL_CHILD_COUNT:matching.length,
      EXPECTED_VALUE_SET_SHA256:hash([...expectedSet].sort()),
      ACTUAL_VALUE_SET_SHA256:hash([...actualSet].sort()),
      PARENT_UNION_EQUALS_CHILDREN:unionMatch,
      CHILD_PREFIX_PRESERVATION:prefixMatch,
      CHILD_CARDINALITY_AND_UNIQUENESS:cardinalityMatch,
      SPLIT_SEMANTICS_VALID:semanticMatch,
      STATUS:unionMatch&&prefixMatch&&cardinalityMatch&&semanticMatch?'PASS':'FAIL'
    });
  }
  const preservationPass=
    overlapCount===0&&gapCount===0&&unsplittableParents.length===0&&
    unionMismatchCount===0&&prefixMismatchCount===0&&semanticMismatchCount===0&&cardinalityMismatchCount===0&&
    parentsWithChildren.size===parentRows.length;
  depth3Proof={
    schema_version:'1.0.0',
    artifact_type:'UCHIRIMO_DEPTH3_REPRESENTATIVE_COVERAGE_PRESERVATION_PROOF',
    exact_head:head,
    runtime_snapshot_id:depth2Plan.runtime_snapshot_id,
    diagnostic_scope:'DEPTH2_TIMEOUT_REPRESENTATIVE_BRANCHES_ONLY',
    source_depth2_micro_sha256:hash(depth2Summary),
    parent_partition_count:parentRows.length,
    child_partition_count:childRows.length,
    PARTITION_OVERLAP_COUNT:overlapCount,
    PARTITION_GAP_COUNT:gapCount,
    UNSPLITTABLE_PARENT_COUNT:unsplittableParents.length,
    PARENT_UNION_MISMATCH_COUNT:unionMismatchCount,
    CHILD_PREFIX_MISMATCH_COUNT:prefixMismatchCount,
    SPLIT_SEMANTIC_MISMATCH_COUNT:semanticMismatchCount,
    PARENT_CHILD_CARDINALITY_MISMATCH_COUNT:cardinalityMismatchCount,
    proof_semantics:'For each representative Depth-2 child measured as NEEDS_DEEPER_SPLIT, the complete enabled value set of the next Formal Runtime required multi-valued ENUM is materialized as unique Depth-3 children. Each child preserves the complete Depth-2 selector prefix and adds exactly one split-axis value. This proves union preservation for the ten representative timeout branches only; it is not Full Coverage evidence for all Depth-2 children.',
    parents:proofRows,
    coverage_preservation_status:preservationPass?'PASS':'FAIL',
    full_coverage_authorized:false,
    status:preservationPass?'PASS':'FAIL'
  };
  depth3Plan={
    schema_version:'1.0.0',
    artifact_type:'UCHIRIMO_DEPTH3_REPRESENTATIVE_RECURSIVE_PARTITION_PLAN',
    exact_head:head,
    runtime_snapshot_id:depth2Plan.runtime_snapshot_id,
    partition_depth:3,
    diagnostic_scope:'DEPTH2_TIMEOUT_REPRESENTATIVE_BRANCHES_ONLY',
    target_product_nodes:[...new Set(parentRows.map((row)=>row.PRODUCT_NODE))].sort(),
    parent_partition_count:parentRows.length,
    child_partition_count:childRows.length,
    PARTITION_OVERLAP_COUNT:overlapCount,
    PARTITION_GAP_COUNT:gapCount,
    UNSPLITTABLE_PARENT_COUNT:unsplittableParents.length,
    PARENT_UNION_MISMATCH_COUNT:unionMismatchCount,
    CHILD_PREFIX_MISMATCH_COUNT:prefixMismatchCount,
    SPLIT_SEMANTIC_MISMATCH_COUNT:semanticMismatchCount,
    PARENT_CHILD_CARDINALITY_MISMATCH_COUNT:cardinalityMismatchCount,
    COVERAGE_PRESERVATION_STATUS:depth3Proof.coverage_preservation_status,
    parents:parentRows,
    children:childRows,
    unsplittable_parent_ids:unsplittableParents.map((row)=>row.PARTITION_ID),
    full_depth3_execution_authorized:false,
    full_coverage_authorized:false,
    status:preservationPass?'DIAGNOSTIC_PLAN_READY':'BLOCKED'
  };
  writeJson(`${OUT}/depth3-representative-partition-plan.json`,depth3Plan);
  writeJson(`${OUT}/depth3-representative-coverage-preservation-proof.json`,depth3Proof);
  console.log(`DEPTH3_REPRESENTATIVE_PARENT_COUNT=${parentRows.length}`);
  console.log(`DEPTH3_REPRESENTATIVE_CHILD_COUNT=${childRows.length}`);
  console.log(`DEPTH3_PARTITION_OVERLAP_COUNT=${overlapCount}`);
  console.log(`DEPTH3_PARTITION_GAP_COUNT=${gapCount}`);
  console.log(`DEPTH3_UNSPLITTABLE_PARENT_COUNT=${unsplittableParents.length}`);
  console.log(`DEPTH3_COVERAGE_PRESERVATION_STATUS=${depth3Proof.coverage_preservation_status}`);
  console.log(`DEPTH3_PLAN_STATUS=${depth3Plan.status}`);
  if(!preservationPass)throw new Error('DEPTH3_REPRESENTATIVE_PLAN_BLOCKED');

  const depth3Results=[];
  for(const [index,parent] of parentRows.entries()){
    const child=childRows
      .filter((row)=>row.PARENT_PARTITION_ID===parent.PARTITION_ID)
      .sort((a,b)=>stableJson(a.SPLIT_VALUE).localeCompare(stableJson(b.SPLIT_VALUE))||String(a.PARTITION_ID).localeCompare(String(b.PARTITION_ID)))[0];
    if(!child)throw new Error(`DEPTH3_MICRO_CHILD_SELECTION_FAILED:${parent.PRODUCT_NODE}:${parent.PARTITION_ID}`);
    const measured=runMicroCase({child,index,depth:3,timeoutMs:DEPTH3_MICRO_CHILD_TIMEOUT_MS});
    const result={
      index,
      product_node:parent.PRODUCT_NODE,
      source_depth2_child_partition_id:parent.PARTITION_ID,
      depth3_child_partition_id:child.PARTITION_ID,
      split_field:child.SPLIT_FIELD,
      split_value:child.SPLIT_VALUE,
      child_timeout_ms:DEPTH3_MICRO_CHILD_TIMEOUT_MS,
      ...measured
    };
    depth3Results.push(result);
    console.log(`DEPTH3_MICRO_CASE node=${parent.PRODUCT_NODE} status=${result.status} elapsed_ms=${String(result.elapsed_ms)} states=${String(result.visited_state_count)} terminals=${String(result.terminal_context_count)}`);
  }
  const passRows=depth3Results.filter((row)=>row.status==='PASS');
  const deeperRows=depth3Results.filter((row)=>row.status==='NEEDS_DEEPER_SPLIT');
  const invalidRows=depth3Results.filter((row)=>row.status==='CALIBRATION_INVALID');
  const depth3Summary={
    schema_version:'1.0.0',
    artifact_type:'UCHIRIMO_DEPTH3_REPRESENTATIVE_MICRO_CALIBRATION',
    exact_head:head,
    task_classification:'NON-PRODUCT-MASTER',
    product_master_mutation:0,
    diagnostic_scope:'DEPTH2_TIMEOUT_REPRESENTATIVE_BRANCHES_ONLY',
    source_depth3_plan_sha256:hash(depth3Plan),
    source_depth3_coverage_proof_sha256:hash(depth3Proof),
    selected_product_node_count:parentRows.length,
    selected_child_count:depth3Results.length,
    child_timeout_ms:DEPTH3_MICRO_CHILD_TIMEOUT_MS,
    pass_count:passRows.length,
    needs_deeper_split_count:deeperRows.length,
    calibration_invalid_count:invalidRows.length,
    pass_product_nodes:passRows.map((row)=>row.product_node),
    failed_product_nodes:deeperRows.map((row)=>row.product_node),
    invalid_product_nodes:invalidRows.map((row)=>row.product_node),
    results:depth3Results,
    full_depth3_execution_authorized:false,
    full_coverage_authorized:false,
    decision:invalidRows.length>0
      ?'CALIBRATION_INVALID'
      :passRows.length===depth3Results.length
        ?'DEPTH3_REPRESENTATIVE_FAST_PATH_PROMISING'
        :'DEPTH4_REQUIRED_FOR_FAILED_REPRESENTATIVES',
    status:invalidRows.length>0?'BLOCKED':'MEASURED_CALIBRATION_ONLY'
  };
  writeJson(`${OUT}/depth3-representative-micro-calibration.json`,depth3Summary);
  console.log(`DEPTH3_MICRO_CALIBRATION_PASS_COUNT=${passRows.length}/${depth3Results.length}`);
  console.log(`DEPTH3_MICRO_CALIBRATION_INVALID_COUNT=${invalidRows.length}`);
  console.log(`DEPTH3_MICRO_CALIBRATION_DECISION=${depth3Summary.decision}`);
  if(invalidRows.length>0)throw new Error('DEPTH3_MICRO_CALIBRATION_INVALID');
}

const DEPTH4_MICRO_CHILD_TIMEOUT_MS=Number(process.env.UCHIRIMO_DEPTH4_MICRO_CHILD_TIMEOUT_MS ?? 45000);
if(!Number.isFinite(DEPTH4_MICRO_CHILD_TIMEOUT_MS)||DEPTH4_MICRO_CHILD_TIMEOUT_MS<30000)throw new Error('DEPTH4_MICRO_CHILD_TIMEOUT_INVALID');
function remainingDiscreteAxes(result,seed){
  const axes=[];
  for(const field of result.fields??[]){
    if(field.readOnly===true||TECHNICAL_KEYS.has(field.key)||CONTINUOUS_KEYS.has(field.key))continue;
    if(Object.prototype.hasOwnProperty.call(seed,field.key))continue;
    if(field.dataType!=='ENUM'&&field.dataType!=='MULTI_ENUM')continue;
    const values=[...new Map(enabled(field).map((row)=>[stableJson(row.value),row.value])).values()];
    if(values.length===0)continue;
    axes.push({
      field_key:field.key,
      data_type:field.dataType,
      required:field.required===true,
      semantic_stage:field.semanticStage??null,
      semantic_slot:field.semanticSlot??null,
      enabled_value_count:values.length,
      enabled_values:values.map(stable),
      safe_required_enum_split_candidate:field.required===true&&field.dataType==='ENUM'&&values.length>1
    });
  }
  return axes;
}
const depth3SummaryCurrent=readJsonSafe(`${OUT}/depth3-representative-micro-calibration.json`);
const depth3PlanCurrent=readJsonSafe(`${OUT}/depth3-representative-partition-plan.json`);
if(depth3SummaryCurrent?.decision==='DEPTH4_REQUIRED_FOR_FAILED_REPRESENTATIVES'){
  if(depth3SummaryCurrent.exact_head!==head||depth3PlanCurrent?.exact_head!==head)throw new Error('DEPTH4_SOURCE_EXACT_HEAD_MISMATCH');
  if(Number(depth3SummaryCurrent.calibration_invalid_count??1)!==0)throw new Error('DEPTH4_SOURCE_CALIBRATION_INVALID');
  const timeoutRows=(depth3SummaryCurrent.results??[]).filter((row)=>row.status==='NEEDS_DEEPER_SPLIT');
  const parentRows=[];
  const childRows=[];
  const structuralRows=[];
  for(const timeoutRow of timeoutRows){
    const depth3Child=(depth3PlanCurrent.children??[]).find((row)=>row.PARTITION_ID===timeoutRow.depth3_child_partition_id);
    if(!depth3Child)throw new Error(`DEPTH4_PARENT_NOT_FOUND:${timeoutRow.product_node}:${timeoutRow.depth3_child_partition_id}`);
    const seed=depth3Child.SELECTOR_PREFIX??{};
    const resolved=await resolveRuntimeAppProduct(PRODUCT_ID,seed);
    for(const [key,value] of Object.entries(seed))if(!same(resolved.selection?.[key],value))throw new Error(`DEPTH4_PARENT_SEED_REJECTED:${depth3Child.PARTITION_ID}:${key}`);
    const axes=remainingDiscreteAxes(resolved,seed);
    const safeRequiredAxes=axes.filter((row)=>row.safe_required_enum_split_candidate);
    const optionalOrMultiAxes=axes.filter((row)=>!row.safe_required_enum_split_candidate);
    const split=nextSplit(resolved,seed);
    const visibleRequiredProduct=safeRequiredAxes.reduce((product,row)=>product*Math.max(1,row.enabled_value_count),1);
    const structuralClassification=split
      ?'SAFE_REQUIRED_ENUM_FRONTIER_REMAINS'
      :optionalOrMultiAxes.length>0
        ?'SAFE_REQUIRED_ENUM_EXHAUSTED_OPTIONAL_OR_MULTI_REMAINS'
        :'SAFE_DISCRETE_SPLIT_AXES_EXHAUSTED';
    structuralRows.push({
      PRODUCT_NODE:depth3Child.PRODUCT_NODE,
      DEPTH3_CHILD_PARTITION_ID:depth3Child.PARTITION_ID,
      SEEDED_SELECTOR_COUNT:Object.keys(seed).length,
      REMAINING_DISCRETE_AXIS_COUNT:axes.length,
      REMAINING_SAFE_REQUIRED_ENUM_AXIS_COUNT:safeRequiredAxes.length,
      REMAINING_OPTIONAL_OR_MULTI_AXIS_COUNT:optionalOrMultiAxes.length,
      CURRENT_VISIBLE_REQUIRED_ENUM_CARDINALITY_PRODUCT:visibleRequiredProduct,
      NEXT_SAFE_SPLIT_FIELD:split?.field_key??null,
      NEXT_SAFE_SPLIT_CARDINALITY:split?.values?.length??0,
      STRUCTURAL_CLASSIFICATION:structuralClassification,
      REMAINING_AXES:axes
    });
    const parent={
      PARTITION_ID:depth3Child.PARTITION_ID,
      PRODUCT_NODE:depth3Child.PRODUCT_NODE,
      WINDOW_ID:depth3Child.WINDOW_ID,
      FLOW_SIGNATURE:flowSignature(resolved),
      SELECTOR_PREFIX:seed,
      SOURCE_DEPTH3_PARTITION_ID:depth3Child.PARTITION_ID,
      ROOT_HEAVY_PARENT_PARTITION_ID:depth3Child.ROOT_HEAVY_PARENT_PARTITION_ID,
      NEXT_SPLIT_FIELD:split?.field_key??null,
      NEXT_SPLIT_FIELD_REQUIRED:split?.field_required??null,
      NEXT_SPLIT_FIELD_DATA_TYPE:split?.field_data_type??null,
      NEXT_SPLIT_CARDINALITY:split?.values?.length??0,
      NEXT_SPLIT_VALUES:split?.values?.map(stable)??[],
      EXACT_HEAD:head,
      RUNTIME_SNAPSHOT_ID:depth3PlanCurrent.runtime_snapshot_id,
      STATUS:split?'DEPTH4_SPLIT_PLANNED':'DEPTH4_UNSPLITTABLE'
    };
    parentRows.push(parent);
    if(!split)continue;
    for(const value of split.values){
      const childSeed={...seed,[split.field_key]:value};
      const childResolved=await resolveRuntimeAppProduct(PRODUCT_ID,childSeed);
      if(!same(childResolved.selection?.[split.field_key],value))throw new Error(`DEPTH4_CHILD_SEED_REJECTED:${depth3Child.PARTITION_ID}:${split.field_key}`);
      childRows.push({
        PARTITION_ID:`UHC4-${hash(stableJson([depth3Child.PARTITION_ID,split.field_key,value])).slice(0,20)}`,
        PARENT_PARTITION_ID:depth3Child.PARTITION_ID,
        ROOT_HEAVY_PARENT_PARTITION_ID:depth3Child.ROOT_HEAVY_PARENT_PARTITION_ID,
        PRODUCT_NODE:depth3Child.PRODUCT_NODE,
        WINDOW_ID:depth3Child.WINDOW_ID,
        FLOW_SIGNATURE:flowSignature(childResolved),
        SELECTOR_PREFIX:childSeed,
        SPLIT_FIELD:split.field_key,
        SPLIT_VALUE:value,
        PARTITION_DEPTH:4,
        EXECUTED_CASE_COUNT:0,
        PASS:0,
        FAIL:0,
        BLOCKED:0,
        UNVERIFIED:1,
        EXACT_HEAD:head,
        RUNTIME_SNAPSHOT_ID:depth3PlanCurrent.runtime_snapshot_id,
        STATUS:'PLANNED_UNVERIFIED'
      });
    }
  }
  const ids=childRows.map((row)=>row.PARTITION_ID);
  const overlapCount=ids.length-new Set(ids).size;
  const parentsWithChildren=new Set(childRows.map((row)=>row.PARENT_PARTITION_ID));
  const unsplittableParents=parentRows.filter((row)=>!parentsWithChildren.has(row.PARTITION_ID));
  let gapCount=0;
  let unionMismatchCount=0;
  let prefixMismatchCount=0;
  let semanticMismatchCount=0;
  let cardinalityMismatchCount=0;
  const proofRows=[];
  for(const parent of parentRows.filter((row)=>parentsWithChildren.has(row.PARTITION_ID))){
    const matching=childRows.filter((row)=>row.PARENT_PARTITION_ID===parent.PARTITION_ID);
    if(matching.length!==parent.NEXT_SPLIT_CARDINALITY)gapCount+=1;
    const expectedSet=new Set((parent.NEXT_SPLIT_VALUES??[]).map(stableJson));
    const actualSet=new Set(matching.map((row)=>stableJson(row.SPLIT_VALUE)));
    const unionMatch=expectedSet.size===actualSet.size&&[...expectedSet].every((value)=>actualSet.has(value));
    const cardinalityMatch=matching.length===parent.NEXT_SPLIT_CARDINALITY&&actualSet.size===matching.length;
    const semanticMatch=parent.NEXT_SPLIT_FIELD_REQUIRED===true&&parent.NEXT_SPLIT_FIELD_DATA_TYPE==='ENUM'&&Boolean(parent.NEXT_SPLIT_FIELD);
    let prefixMatch=true;
    for(const child of matching){
      const parentPreserved=Object.entries(parent.SELECTOR_PREFIX??{}).every(([key,value])=>same(child.SELECTOR_PREFIX?.[key],value));
      const extraKeys=Object.keys(child.SELECTOR_PREFIX??{}).filter((key)=>!Object.prototype.hasOwnProperty.call(parent.SELECTOR_PREFIX??{},key));
      const oneSplitAxis=extraKeys.length===1&&extraKeys[0]===parent.NEXT_SPLIT_FIELD&&same(child.SELECTOR_PREFIX?.[parent.NEXT_SPLIT_FIELD],child.SPLIT_VALUE);
      if(!parentPreserved||!oneSplitAxis){prefixMatch=false;break;}
    }
    if(!unionMatch)unionMismatchCount+=1;
    if(!prefixMatch)prefixMismatchCount+=1;
    if(!semanticMatch)semanticMismatchCount+=1;
    if(!cardinalityMatch)cardinalityMismatchCount+=1;
    proofRows.push({
      PARENT_PARTITION_ID:parent.PARTITION_ID,
      PRODUCT_NODE:parent.PRODUCT_NODE,
      SPLIT_FIELD:parent.NEXT_SPLIT_FIELD,
      SPLIT_FIELD_REQUIRED:parent.NEXT_SPLIT_FIELD_REQUIRED,
      SPLIT_FIELD_DATA_TYPE:parent.NEXT_SPLIT_FIELD_DATA_TYPE,
      EXPECTED_VALUE_COUNT:expectedSet.size,
      ACTUAL_CHILD_COUNT:matching.length,
      EXPECTED_VALUE_SET_SHA256:hash([...expectedSet].sort()),
      ACTUAL_VALUE_SET_SHA256:hash([...actualSet].sort()),
      PARENT_UNION_EQUALS_CHILDREN:unionMatch,
      CHILD_PREFIX_PRESERVATION:prefixMatch,
      CHILD_CARDINALITY_AND_UNIQUENESS:cardinalityMatch,
      SPLIT_SEMANTICS_VALID:semanticMatch,
      STATUS:unionMatch&&prefixMatch&&cardinalityMatch&&semanticMatch?'PASS':'FAIL'
    });
  }
  const preservationPass=
    overlapCount===0&&gapCount===0&&unsplittableParents.length===0&&
    unionMismatchCount===0&&prefixMismatchCount===0&&semanticMismatchCount===0&&cardinalityMismatchCount===0&&
    parentsWithChildren.size===parentRows.length;
  const depth4Proof={
    schema_version:'1.0.0',
    artifact_type:'UCHIRIMO_DEPTH4_REPRESENTATIVE_COVERAGE_PRESERVATION_PROOF',
    exact_head:head,
    runtime_snapshot_id:depth3PlanCurrent.runtime_snapshot_id,
    diagnostic_scope:'DEPTH3_TIMEOUT_REPRESENTATIVE_BRANCHES_ONLY',
    source_depth3_micro_sha256:hash(depth3SummaryCurrent),
    parent_partition_count:parentRows.length,
    child_partition_count:childRows.length,
    PARTITION_OVERLAP_COUNT:overlapCount,
    PARTITION_GAP_COUNT:gapCount,
    UNSPLITTABLE_PARENT_COUNT:unsplittableParents.length,
    PARENT_UNION_MISMATCH_COUNT:unionMismatchCount,
    CHILD_PREFIX_MISMATCH_COUNT:prefixMismatchCount,
    SPLIT_SEMANTIC_MISMATCH_COUNT:semanticMismatchCount,
    PARENT_CHILD_CARDINALITY_MISMATCH_COUNT:cardinalityMismatchCount,
    proof_semantics:'For each representative Depth-3 child measured as NEEDS_DEEPER_SPLIT, the complete enabled value set of the next Formal Runtime required multi-valued ENUM is materialized as unique Depth-4 children. Each child preserves the complete Depth-3 selector prefix and adds exactly one safe split-axis value. This proves union preservation for the representative timeout branches only; it is not Full Coverage evidence.',
    parents:proofRows,
    coverage_preservation_status:preservationPass?'PASS':'FAIL',
    full_coverage_authorized:false,
    status:preservationPass?'PASS':'FAIL'
  };
  const depth4Plan={
    schema_version:'1.0.0',
    artifact_type:'UCHIRIMO_DEPTH4_REPRESENTATIVE_RECURSIVE_PARTITION_PLAN',
    exact_head:head,
    runtime_snapshot_id:depth3PlanCurrent.runtime_snapshot_id,
    partition_depth:4,
    diagnostic_scope:'DEPTH3_TIMEOUT_REPRESENTATIVE_BRANCHES_ONLY',
    target_product_nodes:[...new Set(parentRows.map((row)=>row.PRODUCT_NODE))].sort(),
    parent_partition_count:parentRows.length,
    child_partition_count:childRows.length,
    PARTITION_OVERLAP_COUNT:overlapCount,
    PARTITION_GAP_COUNT:gapCount,
    UNSPLITTABLE_PARENT_COUNT:unsplittableParents.length,
    PARENT_UNION_MISMATCH_COUNT:unionMismatchCount,
    CHILD_PREFIX_MISMATCH_COUNT:prefixMismatchCount,
    SPLIT_SEMANTIC_MISMATCH_COUNT:semanticMismatchCount,
    PARENT_CHILD_CARDINALITY_MISMATCH_COUNT:cardinalityMismatchCount,
    COVERAGE_PRESERVATION_STATUS:depth4Proof.coverage_preservation_status,
    parents:parentRows,
    children:childRows,
    unsplittable_parent_ids:unsplittableParents.map((row)=>row.PARTITION_ID),
    full_depth4_execution_authorized:false,
    full_coverage_authorized:false,
    status:preservationPass?'DIAGNOSTIC_PLAN_READY':'BLOCKED'
  };
  const structuralSummary={
    schema_version:'1.0.0',
    artifact_type:'UCHIRIMO_DEPTH4_RESIDUAL_SEARCH_SPACE_ANALYSIS',
    exact_head:head,
    diagnostic_scope:'DEPTH3_TIMEOUT_REPRESENTATIVE_BRANCHES_ONLY',
    representative_count:structuralRows.length,
    safe_required_enum_frontier_count:structuralRows.filter((row)=>row.STRUCTURAL_CLASSIFICATION==='SAFE_REQUIRED_ENUM_FRONTIER_REMAINS').length,
    safe_required_enum_exhausted_optional_or_multi_count:structuralRows.filter((row)=>row.STRUCTURAL_CLASSIFICATION==='SAFE_REQUIRED_ENUM_EXHAUSTED_OPTIONAL_OR_MULTI_REMAINS').length,
    safe_discrete_split_axes_exhausted_count:structuralRows.filter((row)=>row.STRUCTURAL_CLASSIFICATION==='SAFE_DISCRETE_SPLIT_AXES_EXHAUSTED').length,
    interpretation:'Current visible cardinality products are diagnostic search-space indicators only. They are not exact terminal-case counts because downstream dependency, optional UNSET, and MULTI_ENUM subset branches can change the realized space.',
    rows:structuralRows,
    full_coverage_authorized:false,
    status:'DIAGNOSTIC_ONLY'
  };
  writeJson(`${OUT}/depth4-representative-partition-plan.json`,depth4Plan);
  writeJson(`${OUT}/depth4-representative-coverage-preservation-proof.json`,depth4Proof);
  writeJson(`${OUT}/depth4-residual-search-space-analysis.json`,structuralSummary);
  console.log(`DEPTH4_REPRESENTATIVE_PARENT_COUNT=${parentRows.length}`);
  console.log(`DEPTH4_REPRESENTATIVE_CHILD_COUNT=${childRows.length}`);
  console.log(`DEPTH4_PARTITION_OVERLAP_COUNT=${overlapCount}`);
  console.log(`DEPTH4_PARTITION_GAP_COUNT=${gapCount}`);
  console.log(`DEPTH4_UNSPLITTABLE_PARENT_COUNT=${unsplittableParents.length}`);
  console.log(`DEPTH4_COVERAGE_PRESERVATION_STATUS=${depth4Proof.coverage_preservation_status}`);
  console.log(`DEPTH4_SAFE_REQUIRED_ENUM_FRONTIER_COUNT=${structuralSummary.safe_required_enum_frontier_count}`);
  console.log(`DEPTH4_OPTIONAL_MULTI_ONLY_COUNT=${structuralSummary.safe_required_enum_exhausted_optional_or_multi_count}`);
  console.log(`DEPTH4_DISCRETE_AXES_EXHAUSTED_COUNT=${structuralSummary.safe_discrete_split_axes_exhausted_count}`);
  console.log(`DEPTH4_PLAN_STATUS=${depth4Plan.status}`);
  if(preservationPass){
    const depth4Results=[];
    for(const [index,parent] of parentRows.entries()){
      const child=childRows
        .filter((row)=>row.PARENT_PARTITION_ID===parent.PARTITION_ID)
        .sort((a,b)=>stableJson(a.SPLIT_VALUE).localeCompare(stableJson(b.SPLIT_VALUE))||String(a.PARTITION_ID).localeCompare(String(b.PARTITION_ID)))[0];
      if(!child)throw new Error(`DEPTH4_MICRO_CHILD_SELECTION_FAILED:${parent.PRODUCT_NODE}:${parent.PARTITION_ID}`);
      const measured=runMicroCase({child,index,depth:4,timeoutMs:DEPTH4_MICRO_CHILD_TIMEOUT_MS});
      const result={
        index,
        product_node:parent.PRODUCT_NODE,
        source_depth3_child_partition_id:parent.PARTITION_ID,
        depth4_child_partition_id:child.PARTITION_ID,
        split_field:child.SPLIT_FIELD,
        split_value:child.SPLIT_VALUE,
        child_timeout_ms:DEPTH4_MICRO_CHILD_TIMEOUT_MS,
        ...measured
      };
      depth4Results.push(result);
      console.log(`DEPTH4_MICRO_CASE node=${parent.PRODUCT_NODE} status=${result.status} elapsed_ms=${String(result.elapsed_ms)} states=${String(result.visited_state_count)} terminals=${String(result.terminal_context_count)}`);
    }
    const passRows=depth4Results.filter((row)=>row.status==='PASS');
    const deeperRows=depth4Results.filter((row)=>row.status==='NEEDS_DEEPER_SPLIT');
    const invalidRows=depth4Results.filter((row)=>row.status==='CALIBRATION_INVALID');
    const depth4Summary={
      schema_version:'1.0.0',
      artifact_type:'UCHIRIMO_DEPTH4_REPRESENTATIVE_MICRO_CALIBRATION',
      exact_head:head,
      task_classification:'NON-PRODUCT-MASTER',
      product_master_mutation:0,
      diagnostic_scope:'DEPTH3_TIMEOUT_REPRESENTATIVE_BRANCHES_ONLY',
      source_depth4_plan_sha256:hash(depth4Plan),
      source_depth4_coverage_proof_sha256:hash(depth4Proof),
      source_depth4_structural_analysis_sha256:hash(structuralSummary),
      selected_product_node_count:parentRows.length,
      selected_child_count:depth4Results.length,
      child_timeout_ms:DEPTH4_MICRO_CHILD_TIMEOUT_MS,
      pass_count:passRows.length,
      needs_deeper_split_count:deeperRows.length,
      calibration_invalid_count:invalidRows.length,
      pass_product_nodes:passRows.map((row)=>row.product_node),
      failed_product_nodes:deeperRows.map((row)=>row.product_node),
      invalid_product_nodes:invalidRows.map((row)=>row.product_node),
      results:depth4Results,
      full_depth4_execution_authorized:false,
      full_coverage_authorized:false,
      decision:invalidRows.length>0
        ?'CALIBRATION_INVALID'
        :passRows.length===depth4Results.length
          ?'DEPTH4_REPRESENTATIVE_FAST_PATH_PROMISING'
          :'DEPTH5_REQUIRED_FOR_FAILED_REPRESENTATIVES',
      status:invalidRows.length>0?'BLOCKED':'MEASURED_CALIBRATION_ONLY'
    };
    writeJson(`${OUT}/depth4-representative-micro-calibration.json`,depth4Summary);
    console.log(`DEPTH4_MICRO_CALIBRATION_PASS_COUNT=${passRows.length}/${depth4Results.length}`);
    console.log(`DEPTH4_MICRO_CALIBRATION_INVALID_COUNT=${invalidRows.length}`);
    console.log(`DEPTH4_MICRO_CALIBRATION_DECISION=${depth4Summary.decision}`);
    if(invalidRows.length>0)throw new Error('DEPTH4_MICRO_CALIBRATION_INVALID');
  }else{
    console.log('DEPTH4_MICRO_CALIBRATION_DECISION=NOT_RUN_PLAN_BLOCKED');
  }
}

console.log('UCHIRIMO_FULL_COVERAGE_QA_GATE=BLOCKED');
console.log('APP_INTEGRATION_READY=FALSE');
console.log('RELEASE_INPUT_GATE=BLOCKED');