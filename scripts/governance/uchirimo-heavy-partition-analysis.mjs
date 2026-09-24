import { execFileSync } from 'node:child_process';
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const SOURCE_HEAD='04fa601fe061a5f4920337553f43abc42ae976ac';
const SOURCE_ANALYSIS_BLOB='1117bf774f419a7f429fcb34ae4b53b6304ffce6';
const ANALYSIS_PATH='scripts/governance/uchirimo-heavy-partition-analysis.mjs';
const sourceBlob=execFileSync('git',['rev-parse',SOURCE_HEAD+':'+ANALYSIS_PATH],{encoding:'utf8'}).trim();
if(sourceBlob!==SOURCE_ANALYSIS_BLOB)throw new Error('DEPTH5_SOURCE_ANALYSIS_BLOB_MISMATCH:'+sourceBlob);
const source=execFileSync('git',['show',SOURCE_HEAD+':'+ANALYSIS_PATH],{encoding:'utf8',maxBuffer:8*1024*1024});
const marker="const depth1=readJson(`${OUT}/depth1-micro-calibration.json`);";
const markerIndex=source.indexOf(marker);
if(markerIndex<0)throw new Error('DEPTH5_SOURCE_PREFIX_MARKER_MISSING');
const prefix=source.slice(0,markerIndex);
const depth5Code=String.raw`
const DEPTH5_SOURCE_RUN_ID='35957598209';
const DEPTH5_SOURCE_HEAD='04fa601fe061a5f4920337553f43abc42ae976ac';
const DEPTH5_SOURCE_ANALYSIS_BLOB='1117bf774f419a7f429fcb34ae4b53b6304ffce6';
const DEPTH5_SOURCE_ARTIFACT='uchirimo-heavy-recovery-analysis-'+DEPTH5_SOURCE_HEAD;
const DEPTH5_MICRO_CHILD_TIMEOUT_MS=Number(process.env.UCHIRIMO_DEPTH5_MICRO_CHILD_TIMEOUT_MS ?? 60000);
if(!Number.isFinite(DEPTH5_MICRO_CHILD_TIMEOUT_MS)||DEPTH5_MICRO_CHILD_TIMEOUT_MS<60000)throw new Error('DEPTH5_MICRO_CHILD_TIMEOUT_INVALID');

execFileSync('git',['merge-base','--is-ancestor',DEPTH5_SOURCE_HEAD,head],{stdio:'ignore'});
const changedFilesRaw=execFileSync('git',['diff','--name-only',DEPTH5_SOURCE_HEAD+'..'+head],{encoding:'utf8'}).trim();
const changedFiles=changedFilesRaw?changedFilesRaw.split(/\r?\n/).filter(Boolean):[];
if(changedFiles.length!==1||changedFiles[0]!==ANALYSIS_PATH)throw new Error('DEPTH5_SOURCE_BINDING_DIFF_SCOPE_INVALID:'+changedFiles.join(','));
const sourceAnalysisBlob=execFileSync('git',['rev-parse',DEPTH5_SOURCE_HEAD+':'+ANALYSIS_PATH],{encoding:'utf8'}).trim();
if(sourceAnalysisBlob!==DEPTH5_SOURCE_ANALYSIS_BLOB)throw new Error('DEPTH5_SOURCE_BINDING_BLOB_MISMATCH:'+sourceAnalysisBlob);

const repo=String(process.env.GITHUB_REPOSITORY??'Takuro-Kwkm/sash-app');
const sourceDir=OUT+'/depth5-source-run-'+DEPTH5_SOURCE_RUN_ID;
mkdirSync(sourceDir,{recursive:true});
execFileSync('gh',['run','download',DEPTH5_SOURCE_RUN_ID,'--repo',repo,'--name',DEPTH5_SOURCE_ARTIFACT,'--dir',sourceDir],{stdio:'inherit',timeout:120000});
const sourceDepth4Plan=readJson(sourceDir+'/depth4-representative-partition-plan.json');
const sourceDepth4Proof=readJson(sourceDir+'/depth4-representative-coverage-preservation-proof.json');
const sourceDepth4Structural=readJson(sourceDir+'/depth4-residual-search-space-analysis.json');
const sourceDepth4Micro=readJson(sourceDir+'/depth4-representative-micro-calibration.json');
for(const row of [sourceDepth4Plan,sourceDepth4Proof,sourceDepth4Structural,sourceDepth4Micro]){
  if(row.exact_head!==DEPTH5_SOURCE_HEAD)throw new Error('DEPTH5_SOURCE_ARTIFACT_HEAD_MISMATCH');
}
if(sourceDepth4Plan.status!=='DIAGNOSTIC_PLAN_READY'||sourceDepth4Proof.coverage_preservation_status!=='PASS')throw new Error('DEPTH5_SOURCE_DEPTH4_PLAN_INVALID');
for(const key of ['PARTITION_OVERLAP_COUNT','PARTITION_GAP_COUNT','UNSPLITTABLE_PARENT_COUNT','PARENT_UNION_MISMATCH_COUNT','CHILD_PREFIX_MISMATCH_COUNT','SPLIT_SEMANTIC_MISMATCH_COUNT','PARENT_CHILD_CARDINALITY_MISMATCH_COUNT']){
  if(Number(sourceDepth4Plan[key]??1)!==0||Number(sourceDepth4Proof[key]??1)!==0)throw new Error('DEPTH5_SOURCE_DEPTH4_COVERAGE_COUNTER_INVALID:'+key);
}
if(sourceDepth4Micro.decision!=='DEPTH5_REQUIRED_FOR_FAILED_REPRESENTATIVES'||Number(sourceDepth4Micro.calibration_invalid_count??1)!==0)throw new Error('DEPTH5_SOURCE_MICRO_PRECONDITION_INVALID');
if(Number(sourceDepth4Structural.safe_required_enum_frontier_count??0)!==Number(sourceDepth4Micro.needs_deeper_split_count??-1))throw new Error('DEPTH5_SOURCE_FRONTIER_COUNT_INVALID');

const binding={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_DEPTH5_SOURCE_DIAGNOSTIC_BINDING',
  exact_head:head,
  source_exact_head:DEPTH5_SOURCE_HEAD,
  source_run_id:Number(DEPTH5_SOURCE_RUN_ID),
  source_artifact:DEPTH5_SOURCE_ARTIFACT,
  source_analysis_blob:sourceAnalysisBlob,
  changed_files_since_source:changedFiles,
  changed_file_count:changedFiles.length,
  source_evidence_role:'DIAGNOSTIC_TARGET_IDENTITY_ONLY',
  source_pass_evidence_reused_as_current_head:false,
  current_head_runtime_revalidation_required:true,
  current_head_coverage_reproof_required:true,
  dependency_impact_decision:'ONLY_DEPTH5_ANALYSIS_ORCHESTRATOR_CHANGED',
  status:'PASS'
};
writeJson(OUT+'/depth5-source-diagnostic-binding.json',binding);

function remainingDiscreteAxesDepth5(result,seed){
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
function requiredEnumProduct(axes){
  return axes.filter((row)=>row.safe_required_enum_split_candidate).reduce((product,row)=>product*Math.max(1,row.enabled_value_count),1);
}
function lastProgress(text){
  const re=/UCHIRIMO_SHARD_PROGRESS shard=(\d+) states=(\d+) terminals=(\d+) stack=(\d+) heap_mb=(\d+)/g;
  let last=null;
  for(const match of String(text??'').matchAll(re))last={shard:Number(match[1]),states:Number(match[2]),terminals:Number(match[3]),stack:Number(match[4]),heap_mb:Number(match[5])};
  return last;
}
function runDepth5MicroCase(child,index){
  const microOut=OUT+'/depth5-micro-calibration';
  mkdirSync(microOut,{recursive:true});
  const caseId=String(index).padStart(2,'0');
  const caseOut=microOut+'/case-'+caseId;
  const batchId='depth5-micro-'+caseId;
  mkdirSync(caseOut,{recursive:true});
  const row=microBatchRow(child);
  let executionError=null;
  let stdout='';
  let stderr='';
  try{
    stdout=String(execFileSync(process.execPath,['scripts/governance/uchirimo-selector-batch-runner.mjs'],{
      env:{
        ...process.env,
        HEAD_SHA:head,
        UCHIRIMO_SELECTOR_BATCH_ID:batchId,
        UCHIRIMO_SELECTOR_BATCH_JSON:JSON.stringify([row]),
        UCHIRIMO_SELECTOR_CHILD_TIMEOUT_MS:String(DEPTH5_MICRO_CHILD_TIMEOUT_MS),
        UCHIRIMO_SELECTOR_EXPECTED_SHARDS:'1',
        UCHIRIMO_FULL_SELECTOR_OUT:caseOut
      },
      encoding:'utf8',
      timeout:DEPTH5_MICRO_CHILD_TIMEOUT_MS+20000,
      maxBuffer:64*1024*1024
    })??'');
  }catch(error){
    stdout=String(error?.stdout??'');
    stderr=String(error?.stderr??'');
    executionError={message:String(error?.message??error),code:error?.code??null,signal:error?.signal??null,killed:error?.killed??null};
  }
  const batchReport=readJsonSafe(caseOut+'/batch-'+batchId+'-report.json');
  const shardReport=readJsonSafe(caseOut+'/shard-0-report.json');
  const failureReport=readJsonSafe(caseOut+'/shard-0-failure.json');
  let caseArtifactShaMatch=null;
  if(shardReport?.case_artifact){
    const casePath=caseOut+'/'+shardReport.case_artifact;
    if(existsSync(casePath)){
      const actual=createHash('sha256').update(readFileSync(casePath)).digest('hex');
      caseArtifactShaMatch=actual===shardReport.case_artifact_sha256;
      unlinkSync(casePath);
    }
  }
  const terminalDigest=caseOut+'/shard-0-terminal-digests.jsonl';
  if(existsSync(terminalDigest))unlinkSync(terminalDigest);
  const elapsed=durationMs(batchReport?.results?.[0]?.started_at,batchReport?.results?.[0]?.completed_at);
  const pass=
    batchReport?.status==='PASS'&&
    batchReport?.results?.[0]?.timed_out!==true&&
    shardReport?.status==='PASS'&&
    shardReport?.runtime_integrity_match===true&&
    Number(shardReport?.unverified_discrete_selector_case_count??1)===0&&
    caseArtifactShaMatch===true&&
    Number.isFinite(elapsed)&&elapsed<=DEPTH5_MICRO_CHILD_TIMEOUT_MS;
  const failureMessage=String(failureReport?.message??'');
  const needsDeeperSplit=
    batchReport?.results?.[0]?.timed_out===true||
    /UCHIRIMO_SELECTOR_STATE_LIMIT_REACHED|UCHIRIMO_TERMINAL_LIMIT_REACHED/.test(failureMessage);
  const progress=lastProgress(stdout+'\n'+stderr);
  return {
    elapsed_ms:elapsed,
    timed_out:batchReport?.results?.[0]?.timed_out??null,
    batch_report_present:Boolean(batchReport),
    shard_report_present:Boolean(shardReport),
    failure_artifact_present:Boolean(failureReport),
    visited_state_count:shardReport?.visited_state_count??null,
    terminal_context_count:shardReport?.terminal_context_count??null,
    partial_progress_visited_state_count:progress?.states??null,
    partial_progress_terminal_context_count:progress?.terminals??null,
    partial_progress_stack_count:progress?.stack??null,
    partial_progress_heap_mb:progress?.heap_mb??null,
    observed_peak_heap_mb:shardReport?.observed_peak_heap_mb??progress?.heap_mb??null,
    runtime_integrity_match:shardReport?.runtime_integrity_match??false,
    unverified_discrete_selector_case_count:shardReport?.unverified_discrete_selector_case_count??null,
    case_artifact_sha256_match:caseArtifactShaMatch,
    execution_error:executionError,
    failure_message:failureMessage||null,
    status:pass?'PASS':needsDeeperSplit?'NEEDS_DEEPER_SPLIT':'CALIBRATION_INVALID'
  };
}

const batchRunnerSource=readFileSync('scripts/governance/uchirimo-selector-batch-runner.mjs','utf8');
const selectorProofSource=readFileSync('scripts/uchirimo-full-selector-proof.mjs','utf8');
const failureCatchIndex=selectorProofSource.lastIndexOf('catch(error){');
const failureCatchSource=failureCatchIndex>=0?selectorProofSource.slice(failureCatchIndex):'';
const runnerSeedContract={
  partition_seed_forwarded_to_child:batchRunnerSource.includes("UCHIRIMO_SELECTOR_PARTITION_SEED_JSON:String(row.partition_seed_json ?? '{}')"),
  partition_seed_merged_into_initial_seed:selectorProofSource.includes('for(const [key,value] of Object.entries(TARGET_PARTITION_SEED)){')&&selectorProofSource.includes('seed[key]=value;'),
  all_seed_keys_materialized_as_initial_decisions:selectorProofSource.includes("const decisions=Object.fromEntries(Object.entries(seed).map(([key,value])=>[key,{kind:'VALUE',value}]));"),
  dfs_next_field_excludes_existing_decisions:selectorProofSource.includes('!Object.prototype.hasOwnProperty.call(decisions,field.key)'),
  progress_logging_present:selectorProofSource.includes("console.log('UCHIRIMO_SHARD_PROGRESS shard='"),
  failure_report_includes_partial_state_counters:/visited_state_count|terminal_context_count/.test(failureCatchSource)
};
if(!runnerSeedContract.partition_seed_forwarded_to_child||!runnerSeedContract.partition_seed_merged_into_initial_seed||!runnerSeedContract.all_seed_keys_materialized_as_initial_decisions||!runnerSeedContract.dfs_next_field_excludes_existing_decisions||!runnerSeedContract.progress_logging_present)throw new Error('DEPTH5_RUNNER_SEED_CONTRACT_INVALID');
if(runnerSeedContract.failure_report_includes_partial_state_counters)throw new Error('DEPTH5_FAILURE_COUNTER_ASSUMPTION_CHANGED');

const timeoutRows=(sourceDepth4Micro.results??[]).filter((row)=>row.status==='NEEDS_DEEPER_SPLIT');
if(timeoutRows.length===0)throw new Error('DEPTH5_TARGET_REPRESENTATIVE_EMPTY');
const parentRows=[];
const childRows=[];
const structuralRows=[];
for(const timeoutRow of timeoutRows){
  const sourceChild=(sourceDepth4Plan.children??[]).find((row)=>row.PARTITION_ID===timeoutRow.depth4_child_partition_id);
  if(!sourceChild)throw new Error('DEPTH5_PARENT_NOT_FOUND:'+timeoutRow.product_node+':'+String(timeoutRow.depth4_child_partition_id));
  const seed=sourceChild.SELECTOR_PREFIX??{};
  const parentResolveStart=Date.now();
  const resolved=await resolveRuntimeAppProduct(PRODUCT_ID,seed);
  const parentResolveMs=Date.now()-parentResolveStart;
  for(const [key,value] of Object.entries(seed))if(!same(resolved.selection?.[key],value))throw new Error('DEPTH5_PARENT_SEED_REJECTED:'+sourceChild.PARTITION_ID+':'+key);
  const axes=remainingDiscreteAxesDepth5(resolved,seed);
  const safeRequiredAxes=axes.filter((row)=>row.safe_required_enum_split_candidate);
  const optionalOrMultiAxes=axes.filter((row)=>row.required!==true||row.data_type==='MULTI_ENUM');
  const split=nextSplit(resolved,seed);
  const beforeProduct=requiredEnumProduct(axes);
  const parent={
    PARTITION_ID:sourceChild.PARTITION_ID,
    PRODUCT_NODE:sourceChild.PRODUCT_NODE,
    WINDOW_ID:sourceChild.WINDOW_ID,
    FLOW_SIGNATURE:flowSignature(resolved),
    SELECTOR_PREFIX:seed,
    SOURCE_DEPTH4_PARTITION_ID:sourceChild.PARTITION_ID,
    SOURCE_DEPTH4_EXACT_HEAD:DEPTH5_SOURCE_HEAD,
    ROOT_HEAVY_PARENT_PARTITION_ID:sourceChild.ROOT_HEAVY_PARENT_PARTITION_ID,
    NEXT_SPLIT_FIELD:split?.field_key??null,
    NEXT_SPLIT_FIELD_REQUIRED:split?.field_required??null,
    NEXT_SPLIT_FIELD_DATA_TYPE:split?.field_data_type??null,
    NEXT_SPLIT_CARDINALITY:split?.values?.length??0,
    NEXT_SPLIT_VALUES:split?.values?.map(stable)??[],
    CURRENT_HEAD_PARENT_RESOLVE_MS:parentResolveMs,
    EXACT_HEAD:head,
    RUNTIME_SNAPSHOT_ID:sourceDepth4Plan.runtime_snapshot_id,
    STATUS:split?'DEPTH5_SPLIT_PLANNED':'DEPTH5_UNSPLITTABLE'
  };
  parentRows.push(parent);
  if(!split){
    structuralRows.push({
      PRODUCT_NODE:sourceChild.PRODUCT_NODE,
      DEPTH4_CHILD_PARTITION_ID:sourceChild.PARTITION_ID,
      SEEDED_SELECTOR_COUNT:Object.keys(seed).length,
      REMAINING_SAFE_REQUIRED_ENUM_AXIS_COUNT:safeRequiredAxes.length,
      REMAINING_OPTIONAL_OR_MULTI_AXIS_COUNT:optionalOrMultiAxes.length,
      CURRENT_VISIBLE_REQUIRED_ENUM_CARDINALITY_PRODUCT:beforeProduct,
      NEXT_SAFE_SPLIT_FIELD:null,
      NEXT_SAFE_SPLIT_CARDINALITY:0,
      PARENT_RESOLVE_PROBE_MS:parentResolveMs,
      STRUCTURAL_CLASSIFICATION:optionalOrMultiAxes.length>0?'SAFE_REQUIRED_ENUM_EXHAUSTED_OPTIONAL_OR_MULTI_REMAINS':'SAFE_DISCRETE_SPLIT_AXES_EXHAUSTED',
      REMAINING_AXES:axes
    });
    continue;
  }
  const generated=[];
  for(const value of split.values){
    const childSeed={...seed,[split.field_key]:value};
    const childResolveStart=Date.now();
    const childResolved=await resolveRuntimeAppProduct(PRODUCT_ID,childSeed);
    const childResolveMs=Date.now()-childResolveStart;
    for(const [key,parentValue] of Object.entries(seed))if(!same(childResolved.selection?.[key],parentValue))throw new Error('DEPTH5_CHILD_PARENT_SEED_REJECTED:'+sourceChild.PARTITION_ID+':'+key);
    if(!same(childResolved.selection?.[split.field_key],value))throw new Error('DEPTH5_CHILD_SPLIT_SEED_REJECTED:'+sourceChild.PARTITION_ID+':'+split.field_key);
    const afterAxes=remainingDiscreteAxesDepth5(childResolved,childSeed);
    const afterProduct=requiredEnumProduct(afterAxes);
    const nextAfter=nextSplit(childResolved,childSeed);
    const child={
      PARTITION_ID:'UHC5-'+hash(stableJson([sourceChild.PARTITION_ID,split.field_key,value])).slice(0,20),
      PARENT_PARTITION_ID:sourceChild.PARTITION_ID,
      ROOT_HEAVY_PARENT_PARTITION_ID:sourceChild.ROOT_HEAVY_PARENT_PARTITION_ID,
      PRODUCT_NODE:sourceChild.PRODUCT_NODE,
      WINDOW_ID:sourceChild.WINDOW_ID,
      FLOW_SIGNATURE:flowSignature(childResolved),
      SELECTOR_PREFIX:childSeed,
      SPLIT_FIELD:split.field_key,
      SPLIT_VALUE:value,
      PARTITION_DEPTH:5,
      CURRENT_HEAD_CHILD_RESOLVE_MS:childResolveMs,
      REMAINING_SAFE_REQUIRED_ENUM_AXIS_COUNT:afterAxes.filter((row)=>row.safe_required_enum_split_candidate).length,
      REMAINING_OPTIONAL_OR_MULTI_AXIS_COUNT:afterAxes.filter((row)=>row.required!==true||row.data_type==='MULTI_ENUM').length,
      CURRENT_VISIBLE_REQUIRED_ENUM_CARDINALITY_PRODUCT:afterProduct,
      NEXT_SAFE_SPLIT_FIELD:nextAfter?.field_key??null,
      NEXT_SAFE_SPLIT_CARDINALITY:nextAfter?.values?.length??0,
      SAFE_REQUIRED_ENUM_FRONTIER_EXHAUSTED:nextAfter==null,
      EXECUTED_CASE_COUNT:0,
      PASS:0,
      FAIL:0,
      BLOCKED:0,
      UNVERIFIED:1,
      EXACT_HEAD:head,
      RUNTIME_SNAPSHOT_ID:sourceDepth4Plan.runtime_snapshot_id,
      STATUS:'PLANNED_UNVERIFIED'
    };
    childRows.push(child);
    generated.push(child);
  }
  const selected=[...generated].sort((a,b)=>stableJson(a.SPLIT_VALUE).localeCompare(stableJson(b.SPLIT_VALUE))||String(a.PARTITION_ID).localeCompare(String(b.PARTITION_ID)))[0];
  structuralRows.push({
    PRODUCT_NODE:sourceChild.PRODUCT_NODE,
    DEPTH4_CHILD_PARTITION_ID:sourceChild.PARTITION_ID,
    SEEDED_SELECTOR_COUNT:Object.keys(seed).length,
    DEPTH5_SELECTED_CHILD_SEEDED_SELECTOR_COUNT:Object.keys(selected?.SELECTOR_PREFIX??{}).length,
    REMAINING_DISCRETE_AXIS_COUNT:axes.length,
    REMAINING_SAFE_REQUIRED_ENUM_AXIS_COUNT:safeRequiredAxes.length,
    REMAINING_OPTIONAL_OR_MULTI_AXIS_COUNT:optionalOrMultiAxes.length,
    CURRENT_VISIBLE_REQUIRED_ENUM_CARDINALITY_PRODUCT:beforeProduct,
    NEXT_SAFE_SPLIT_FIELD:split.field_key,
    NEXT_SAFE_SPLIT_CARDINALITY:split.values.length,
    PARENT_RESOLVE_PROBE_MS:parentResolveMs,
    SELECTED_DEPTH5_CHILD_PARTITION_ID:selected?.PARTITION_ID??null,
    SELECTED_CHILD_RESOLVE_PROBE_MS:selected?.CURRENT_HEAD_CHILD_RESOLVE_MS??null,
    SELECTED_CHILD_REMAINING_SAFE_REQUIRED_ENUM_AXIS_COUNT:selected?.REMAINING_SAFE_REQUIRED_ENUM_AXIS_COUNT??null,
    SELECTED_CHILD_REMAINING_OPTIONAL_OR_MULTI_AXIS_COUNT:selected?.REMAINING_OPTIONAL_OR_MULTI_AXIS_COUNT??null,
    SELECTED_CHILD_VISIBLE_REQUIRED_ENUM_CARDINALITY_PRODUCT:selected?.CURRENT_VISIBLE_REQUIRED_ENUM_CARDINALITY_PRODUCT??null,
    REQUIRED_ENUM_PRODUCT_REDUCTION_FACTOR:selected?.CURRENT_VISIBLE_REQUIRED_ENUM_CARDINALITY_PRODUCT>0?beforeProduct/selected.CURRENT_VISIBLE_REQUIRED_ENUM_CARDINALITY_PRODUCT:null,
    SELECTED_CHILD_NEXT_SAFE_SPLIT_FIELD:selected?.NEXT_SAFE_SPLIT_FIELD??null,
    SELECTED_CHILD_NEXT_SAFE_SPLIT_CARDINALITY:selected?.NEXT_SAFE_SPLIT_CARDINALITY??0,
    SELECTED_CHILD_SAFE_REQUIRED_ENUM_FRONTIER_EXHAUSTED:selected?.SAFE_REQUIRED_ENUM_FRONTIER_EXHAUSTED??null,
    STRUCTURAL_CLASSIFICATION:'SAFE_REQUIRED_ENUM_FRONTIER_REMAINS',
    REMAINING_AXES:axes
  });
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
const preservationPass=overlapCount===0&&gapCount===0&&unsplittableParents.length===0&&unionMismatchCount===0&&prefixMismatchCount===0&&semanticMismatchCount===0&&cardinalityMismatchCount===0&&parentsWithChildren.size===parentRows.length;
const depth5Proof={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_DEPTH5_REPRESENTATIVE_COVERAGE_PRESERVATION_PROOF',
  exact_head:head,
  source_depth4_exact_head:DEPTH5_SOURCE_HEAD,
  source_binding_sha256:hash(binding),
  diagnostic_scope:'SOURCE_BOUND_DEPTH4_TIMEOUT_REPRESENTATIVE_BRANCHES_ONLY',
  parent_partition_count:parentRows.length,
  child_partition_count:childRows.length,
  PARTITION_OVERLAP_COUNT:overlapCount,
  PARTITION_GAP_COUNT:gapCount,
  UNSPLITTABLE_PARENT_COUNT:unsplittableParents.length,
  PARENT_UNION_MISMATCH_COUNT:unionMismatchCount,
  CHILD_PREFIX_MISMATCH_COUNT:prefixMismatchCount,
  SPLIT_SEMANTIC_MISMATCH_COUNT:semanticMismatchCount,
  PARENT_CHILD_CARDINALITY_MISMATCH_COUNT:cardinalityMismatchCount,
  proof_semantics:'Current-head runtime re-resolution materializes the complete enabled value set of the next safe required writable ENUM for each source-bound Depth-4 representative timeout branch. Source-head evidence identifies the diagnostic targets only and is not reused as current-head PASS evidence.',
  parents:proofRows,
  coverage_preservation_status:preservationPass?'PASS':'FAIL',
  full_coverage_authorized:false,
  status:preservationPass?'PASS':'FAIL'
};
const depth5Plan={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_DEPTH5_REPRESENTATIVE_RECURSIVE_PARTITION_PLAN',
  exact_head:head,
  source_depth4_exact_head:DEPTH5_SOURCE_HEAD,
  partition_depth:5,
  diagnostic_scope:'SOURCE_BOUND_DEPTH4_TIMEOUT_REPRESENTATIVE_BRANCHES_ONLY',
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
  COVERAGE_PRESERVATION_STATUS:depth5Proof.coverage_preservation_status,
  parents:parentRows,
  children:childRows,
  unsplittable_parent_ids:unsplittableParents.map((row)=>row.PARTITION_ID),
  full_depth5_execution_authorized:false,
  full_coverage_authorized:false,
  status:preservationPass?'DIAGNOSTIC_PLAN_READY':'BLOCKED'
};
const structuralSummary={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_DEPTH5_RESIDUAL_SEARCH_SPACE_ANALYSIS',
  exact_head:head,
  source_depth4_exact_head:DEPTH5_SOURCE_HEAD,
  representative_count:structuralRows.length,
  safe_required_enum_frontier_count:structuralRows.filter((row)=>row.STRUCTURAL_CLASSIFICATION==='SAFE_REQUIRED_ENUM_FRONTIER_REMAINS').length,
  selected_child_safe_frontier_remaining_count:structuralRows.filter((row)=>row.SELECTED_CHILD_SAFE_REQUIRED_ENUM_FRONTIER_EXHAUSTED===false).length,
  selected_child_safe_frontier_exhausted_count:structuralRows.filter((row)=>row.SELECTED_CHILD_SAFE_REQUIRED_ENUM_FRONTIER_EXHAUSTED===true).length,
  resolver_probe_max_ms:Math.max(0,...structuralRows.flatMap((row)=>[row.PARENT_RESOLVE_PROBE_MS??0,row.SELECTED_CHILD_RESOLVE_PROBE_MS??0])),
  interpretation:'Required-ENUM cardinality products are structural indicators, not exact terminal counts. Optional UNSET, MULTI_ENUM subsets, and dynamic dependencies remain outside this product.',
  rows:structuralRows,
  full_coverage_authorized:false,
  status:'DIAGNOSTIC_ONLY'
};
const executionShape={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_DEPTH5_EXECUTION_SHAPE_ANALYSIS',
  exact_head:head,
  runner_seed_contract:runnerSeedContract,
  timeout_counter_null_explanation:runnerSeedContract.failure_report_includes_partial_state_counters?null:'Shard visited/terminal counters are emitted in the success report only; timeout termination does not persist them in the failure report. Depth-5 therefore also parses periodic progress lines when present.',
  parent_seed_revalidation_count:parentRows.length,
  generated_child_seed_revalidation_count:childRows.length,
  resolver_probe_max_ms:structuralSummary.resolver_probe_max_ms,
  full_coverage_authorized:false,
  status:'DIAGNOSTIC_ONLY'
};
writeJson(OUT+'/depth5-representative-partition-plan.json',depth5Plan);
writeJson(OUT+'/depth5-representative-coverage-preservation-proof.json',depth5Proof);
writeJson(OUT+'/depth5-residual-search-space-analysis.json',structuralSummary);
writeJson(OUT+'/depth5-execution-shape-analysis.json',executionShape);
console.log('DEPTH5_REPRESENTATIVE_PARENT_COUNT='+parentRows.length);
console.log('DEPTH5_REPRESENTATIVE_CHILD_COUNT='+childRows.length);
console.log('DEPTH5_PARTITION_OVERLAP_COUNT='+overlapCount);
console.log('DEPTH5_PARTITION_GAP_COUNT='+gapCount);
console.log('DEPTH5_UNSPLITTABLE_PARENT_COUNT='+unsplittableParents.length);
console.log('DEPTH5_PARENT_UNION_MISMATCH_COUNT='+unionMismatchCount);
console.log('DEPTH5_CHILD_PREFIX_MISMATCH_COUNT='+prefixMismatchCount);
console.log('DEPTH5_SPLIT_SEMANTIC_MISMATCH_COUNT='+semanticMismatchCount);
console.log('DEPTH5_PARENT_CHILD_CARDINALITY_MISMATCH_COUNT='+cardinalityMismatchCount);
console.log('DEPTH5_COVERAGE_PRESERVATION_STATUS='+depth5Proof.coverage_preservation_status);
if(!preservationPass)throw new Error('DEPTH5_REPRESENTATIVE_PLAN_BLOCKED');

const depth5Results=[];
for(const [index,parent] of parentRows.entries()){
  const child=childRows.filter((row)=>row.PARENT_PARTITION_ID===parent.PARTITION_ID).sort((a,b)=>stableJson(a.SPLIT_VALUE).localeCompare(stableJson(b.SPLIT_VALUE))||String(a.PARTITION_ID).localeCompare(String(b.PARTITION_ID)))[0];
  if(!child)throw new Error('DEPTH5_MICRO_CHILD_SELECTION_FAILED:'+parent.PRODUCT_NODE+':'+parent.PARTITION_ID);
  const structure=structuralRows.find((row)=>row.SELECTED_DEPTH5_CHILD_PARTITION_ID===child.PARTITION_ID);
  const measured=runDepth5MicroCase(child,index);
  const result={
    index,
    product_node:parent.PRODUCT_NODE,
    source_depth4_child_partition_id:parent.PARTITION_ID,
    depth5_child_partition_id:child.PARTITION_ID,
    split_field:child.SPLIT_FIELD,
    split_value:child.SPLIT_VALUE,
    child_timeout_ms:DEPTH5_MICRO_CHILD_TIMEOUT_MS,
    parent_seeded_selector_count:structure?.SEEDED_SELECTOR_COUNT??null,
    child_seeded_selector_count:structure?.DEPTH5_SELECTED_CHILD_SEEDED_SELECTOR_COUNT??null,
    required_enum_cardinality_product_before:structure?.CURRENT_VISIBLE_REQUIRED_ENUM_CARDINALITY_PRODUCT??null,
    required_enum_cardinality_product_after:structure?.SELECTED_CHILD_VISIBLE_REQUIRED_ENUM_CARDINALITY_PRODUCT??null,
    required_enum_product_reduction_factor:structure?.REQUIRED_ENUM_PRODUCT_REDUCTION_FACTOR??null,
    child_next_safe_split_field:structure?.SELECTED_CHILD_NEXT_SAFE_SPLIT_FIELD??null,
    child_next_safe_split_cardinality:structure?.SELECTED_CHILD_NEXT_SAFE_SPLIT_CARDINALITY??0,
    child_safe_required_enum_frontier_exhausted:structure?.SELECTED_CHILD_SAFE_REQUIRED_ENUM_FRONTIER_EXHAUSTED??null,
    ...measured
  };
  depth5Results.push(result);
  console.log('DEPTH5_MICRO_CASE node='+parent.PRODUCT_NODE+' status='+result.status+' elapsed_ms='+String(result.elapsed_ms)+' states='+String(result.visited_state_count)+' partial_states='+String(result.partial_progress_visited_state_count)+' terminals='+String(result.terminal_context_count)+' partial_terminals='+String(result.partial_progress_terminal_context_count));
}
const passRows=depth5Results.filter((row)=>row.status==='PASS');
const deeperRows=depth5Results.filter((row)=>row.status==='NEEDS_DEEPER_SPLIT');
const invalidRows=depth5Results.filter((row)=>row.status==='CALIBRATION_INVALID');
const deeperWithoutSafeFrontier=deeperRows.filter((row)=>row.child_safe_required_enum_frontier_exhausted!==false);
const decision=invalidRows.length>0
  ?'CALIBRATION_INVALID'
  :deeperRows.length===0
    ?'DEPTH5_REPRESENTATIVE_FAST_PATH_PROMISING'
    :deeperWithoutSafeFrontier.length>0
      ?'DEPTH6_BLOCKED_SAFE_REQUIRED_ENUM_FRONTIER_EXHAUSTED'
      :'DEPTH6_REQUIRED_FOR_FAILED_REPRESENTATIVES';
const depth5Summary={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_DEPTH5_REPRESENTATIVE_MICRO_CALIBRATION',
  exact_head:head,
  task_classification:'NON-PRODUCT-MASTER',
  product_master_mutation:0,
  diagnostic_scope:'SOURCE_BOUND_DEPTH4_TIMEOUT_REPRESENTATIVE_BRANCHES_ONLY',
  source_binding_sha256:hash(binding),
  source_depth5_plan_sha256:hash(depth5Plan),
  source_depth5_coverage_proof_sha256:hash(depth5Proof),
  source_depth5_structural_analysis_sha256:hash(structuralSummary),
  source_execution_shape_analysis_sha256:hash(executionShape),
  selected_product_node_count:parentRows.length,
  selected_child_count:depth5Results.length,
  child_timeout_ms:DEPTH5_MICRO_CHILD_TIMEOUT_MS,
  pass_count:passRows.length,
  needs_deeper_split_count:deeperRows.length,
  calibration_invalid_count:invalidRows.length,
  pass_product_nodes:passRows.map((row)=>row.product_node),
  failed_product_nodes:deeperRows.map((row)=>row.product_node),
  invalid_product_nodes:invalidRows.map((row)=>row.product_node),
  failed_without_safe_required_enum_frontier_product_nodes:deeperWithoutSafeFrontier.map((row)=>row.product_node),
  results:depth5Results,
  full_depth5_execution_authorized:false,
  full_coverage_authorized:false,
  decision,
  status:invalidRows.length>0?'BLOCKED':'MEASURED_CALIBRATION_ONLY'
};
writeJson(OUT+'/depth5-representative-micro-calibration.json',depth5Summary);
console.log('DEPTH5_MICRO_CALIBRATION_PASS_COUNT='+passRows.length+'/'+depth5Results.length);
console.log('DEPTH5_MICRO_CALIBRATION_INVALID_COUNT='+invalidRows.length);
console.log('DEPTH5_MICRO_CALIBRATION_DECISION='+decision);
if(invalidRows.length>0)throw new Error('DEPTH5_MICRO_CALIBRATION_INVALID');
console.log('UCHIRIMO_FULL_COVERAGE_QA_GATE=BLOCKED');
console.log('APP_INTEGRATION_READY=FALSE');
console.log('RELEASE_INPUT_GATE=BLOCKED');
`;
const temp='scripts/governance/.uchirimo-heavy-partition-analysis-depth5-'+process.pid+'.mjs';
writeFileSync(temp,prefix+depth5Code);
try{
  await import(pathToFileURL(temp).href+'?depth5='+Date.now());
}finally{
  if(existsSync(temp))unlinkSync(temp);
}
