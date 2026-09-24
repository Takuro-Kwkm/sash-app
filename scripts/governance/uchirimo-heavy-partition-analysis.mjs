import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { resolveRuntimeAppProduct } from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { currentExactHead, writeJson } from './governance-lib.mjs';

const PRODUCT_ID='SER-YKKAP-UCHIRIMO';
const SOURCE_RUN_ID='35963229341';
const SOURCE_HEAD='2a8e007fd0a6c4eeac5aa24db45c7d4c9006e793';
const SOURCE_BLOB='95a2077eb3612ac63850332c980ea9ad2c80c53f';
const ANALYSIS_PATH='scripts/governance/uchirimo-heavy-partition-analysis.mjs';
const SOURCE_ARTIFACT='uchirimo-heavy-recovery-analysis-'+SOURCE_HEAD;
const OUT=String(process.env.UCHIRIMO_HEAVY_ANALYSIS_OUT??'artifacts/uchirimo-heavy-recovery');
const CHILD_TIMEOUT_MS=Number(process.env.UCHIRIMO_DEPTH5_MEASUREMENT_CHILD_TIMEOUT_MS??60000);
const STATE_PROBE_LIMIT=Number(process.env.UCHIRIMO_DEPTH5_MEASUREMENT_STATE_PROBE_LIMIT??100);
const head=currentExactHead();

if(!Number.isFinite(CHILD_TIMEOUT_MS)||CHILD_TIMEOUT_MS<60000)throw new Error('DEPTH5_MEASUREMENT_TIMEOUT_INVALID');
if(!Number.isInteger(STATE_PROBE_LIMIT)||STATE_PROBE_LIMIT<10)throw new Error('DEPTH5_MEASUREMENT_STATE_PROBE_LIMIT_INVALID');
mkdirSync(OUT,{recursive:true});

const stable=(value)=>{
  if(Array.isArray(value))return value.map(stable);
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,stable(v)]));
};
const stableJson=(value)=>JSON.stringify(stable(value));
const sha=(value)=>createHash('sha256').update(typeof value==='string'?value:stableJson(value)).digest('hex');
const shaBuffer=(value)=>createHash('sha256').update(value).digest('hex');
const same=(a,b)=>Array.isArray(b)
  ? Array.isArray(a)&&stableJson(a.map(String).sort())===stableJson(b.map(String).sort())
  : Object.is(a,b)||String(a)===String(b);
const readJson=(path)=>JSON.parse(readFileSync(path,'utf8'));
const readJsonSafe=(path)=>{ try{return readJson(path);}catch{return null;} };

function terminalDigestCount(path){
  if(!existsSync(path))return 0;
  const text=readFileSync(path,'utf8');
  if(text.length===0)return 0;
  return text.split('\n').filter(Boolean).length;
}

function batchRow(partition){
  const seed=partition.SELECTOR_PREFIX??{};
  const baseKeys=new Set(['room_specification','window_type','glass_family','sash_configuration','size_class']);
  return {
    shard:0,
    node_id:partition.PRODUCT_NODE,
    partition_key:partition.PARTITION_ID,
    room_specification:String(seed.room_specification),
    window_type:String(seed.window_type),
    sash_configuration:seed.sash_configuration==null?'__UNSET__':String(seed.sash_configuration),
    size_class:seed.size_class==null?'__UNSET__':String(seed.size_class),
    glass_family:String(seed.glass_family),
    partition_seed_json:stableJson(Object.fromEntries(Object.entries(seed).filter(([key])=>!baseKeys.has(key))))
  };
}

function runDepth5Measurement(partition,index){
  const caseId=String(index).padStart(2,'0');
  const caseOut=`${OUT}/depth5-measurement-gap/case-${caseId}`;
  const batchId=`depth5-measurement-${caseId}`;
  mkdirSync(caseOut,{recursive:true});
  let executionError=null;
  try{
    execFileSync(process.execPath,['scripts/governance/uchirimo-selector-batch-runner.mjs'],{
      env:{
        ...process.env,
        HEAD_SHA:head,
        UCHIRIMO_SELECTOR_BATCH_ID:batchId,
        UCHIRIMO_SELECTOR_BATCH_JSON:JSON.stringify([batchRow(partition)]),
        UCHIRIMO_SELECTOR_CHILD_TIMEOUT_MS:String(CHILD_TIMEOUT_MS),
        UCHIRIMO_SELECTOR_EXPECTED_SHARDS:'1',
        UCHIRIMO_SELECTOR_MAX_STATES:String(STATE_PROBE_LIMIT),
        UCHIRIMO_SELECTOR_MAX_TERMINALS:'1000000',
        UCHIRIMO_FULL_SELECTOR_OUT:caseOut
      },
      encoding:'utf8',
      timeout:CHILD_TIMEOUT_MS+20000,
      maxBuffer:64*1024*1024
    });
  }catch(error){
    executionError={
      message:String(error?.message??error),
      code:error?.code??null,
      signal:error?.signal??null,
      killed:error?.killed??null
    };
  }

  const batch=readJsonSafe(`${caseOut}/batch-${batchId}-report.json`);
  const report=readJsonSafe(`${caseOut}/shard-0-report.json`);
  const failure=readJsonSafe(`${caseOut}/shard-0-failure.json`);
  const digestPath=`${caseOut}/shard-0-terminal-digests.jsonl`;
  const partialTerminalCount=terminalDigestCount(digestPath);

  let caseArtifactShaMatch=null;
  if(report?.case_artifact){
    const casePath=`${caseOut}/${report.case_artifact}`;
    if(existsSync(casePath)){
      caseArtifactShaMatch=shaBuffer(readFileSync(casePath))===report.case_artifact_sha256;
      unlinkSync(casePath);
    }
  }
  if(existsSync(digestPath))unlinkSync(digestPath);

  const started=Date.parse(batch?.results?.[0]?.started_at??'');
  const completed=Date.parse(batch?.results?.[0]?.completed_at??'');
  const elapsedMs=Number.isFinite(started)&&Number.isFinite(completed)&&completed>=started ? completed-started : null;
  const failureMessage=String(failure?.message??'');
  const timedOut=batch?.results?.[0]?.timed_out===true;
  const stateLimitReached=/UCHIRIMO_SELECTOR_STATE_LIMIT_REACHED/.test(failureMessage);
  const terminalLimitReached=/UCHIRIMO_TERMINAL_LIMIT_REACHED/.test(failureMessage);
  const completedPass=
    batch?.status==='PASS' &&
    !timedOut &&
    report?.status==='PASS' &&
    report?.runtime_integrity_match===true &&
    Number(report?.unverified_discrete_selector_case_count??1)===0 &&
    caseArtifactShaMatch===true;

  let outcome='INVALID';
  if(completedPass)outcome='COMPLETED';
  else if(stateLimitReached)outcome='STATE_PROBE_LIMIT_REACHED';
  else if(timedOut)outcome='TIMEOUT_BEFORE_STATE_PROBE_LIMIT';

  const exactStateCount=completedPass ? Number(report?.visited_state_count) : stateLimitReached ? STATE_PROBE_LIMIT : null;
  const stateCountUpperBound=timedOut&&!stateLimitReached ? STATE_PROBE_LIMIT-1 : exactStateCount;
  const elapsedSeconds=Number.isFinite(elapsedMs)&&elapsedMs>0 ? elapsedMs/1000 : null;

  return {
    elapsed_ms:elapsedMs,
    timed_out:timedOut,
    state_probe_limit:STATE_PROBE_LIMIT,
    state_probe_limit_reached:stateLimitReached,
    terminal_limit_reached:terminalLimitReached,
    visited_state_count:report?.visited_state_count??null,
    exact_or_threshold_state_progress_count:exactStateCount,
    state_progress_upper_bound:stateCountUpperBound,
    terminal_context_count:report?.terminal_context_count??null,
    partial_terminal_digest_count:partialTerminalCount,
    states_per_second_wall_clock_actual:exactStateCount!=null&&elapsedSeconds ? exactStateCount/elapsedSeconds : null,
    states_per_second_wall_clock_upper_bound:timedOut&&!stateLimitReached&&elapsedSeconds ? (STATE_PROBE_LIMIT-1)/elapsedSeconds : null,
    batch_report_present:Boolean(batch),
    shard_report_present:Boolean(report),
    failure_report_present:Boolean(failure),
    runtime_integrity_match:report?.runtime_integrity_match??null,
    unverified_discrete_selector_case_count:report?.unverified_discrete_selector_case_count??null,
    case_artifact_sha256_match:caseArtifactShaMatch,
    failure_message:failureMessage||null,
    execution_error:executionError,
    outcome
  };
}

execFileSync('git',['merge-base','--is-ancestor',SOURCE_HEAD,head],{stdio:'ignore'});
const sourceBlob=execFileSync('git',['rev-parse',`${SOURCE_HEAD}:${ANALYSIS_PATH}`],{encoding:'utf8'}).trim();
if(sourceBlob!==SOURCE_BLOB)throw new Error('DEPTH5_MEASUREMENT_SOURCE_BLOB_MISMATCH:'+sourceBlob);
const changedRaw=execFileSync('git',['diff','--name-only',`${SOURCE_HEAD}..${head}`],{encoding:'utf8'}).trim();
const changedFiles=changedRaw?changedRaw.split(/\r?\n/).filter(Boolean):[];
if(changedFiles.length!==1||changedFiles[0]!==ANALYSIS_PATH){
  throw new Error('DEPTH5_MEASUREMENT_SCOPE_INVALID:'+changedFiles.join(','));
}

const sourceDir=`${OUT}/depth5-measurement-source-run-${SOURCE_RUN_ID}`;
mkdirSync(sourceDir,{recursive:true});
execFileSync('gh',[
  'run','download',SOURCE_RUN_ID,
  '--repo',String(process.env.GITHUB_REPOSITORY??'Takuro-Kwkm/sash-app'),
  '--name',SOURCE_ARTIFACT,
  '--dir',sourceDir
],{stdio:'inherit',timeout:120000});

const heavy=readJson(`${sourceDir}/heavy-partition-analysis.json`);
const recursive=readJson(`${sourceDir}/recursive-partition-plan.json`);
const depth5Plan=readJson(`${sourceDir}/depth5-representative-partition-plan.json`);
const depth5Proof=readJson(`${sourceDir}/depth5-representative-coverage-preservation-proof.json`);
const depth5Micro=readJson(`${sourceDir}/depth5-representative-micro-calibration.json`);

for(const artifact of [heavy,recursive,depth5Plan,depth5Proof,depth5Micro]){
  if(artifact.exact_head!==SOURCE_HEAD)throw new Error('DEPTH5_MEASUREMENT_SOURCE_ARTIFACT_HEAD_MISMATCH');
}
if(depth5Plan.status!=='DIAGNOSTIC_PLAN_READY')throw new Error('DEPTH5_MEASUREMENT_SOURCE_PLAN_INVALID');
if(depth5Proof.coverage_preservation_status!=='PASS')throw new Error('DEPTH5_MEASUREMENT_SOURCE_COVERAGE_INVALID');
if(depth5Micro.decision!=='DEPTH6_REQUIRED_FOR_FAILED_REPRESENTATIVES')throw new Error('DEPTH5_MEASUREMENT_SOURCE_DECISION_INVALID');
if(Number(depth5Micro.calibration_invalid_count??1)!==0)throw new Error('DEPTH5_MEASUREMENT_SOURCE_CALIBRATION_INVALID');
for(const key of [
  'PARTITION_OVERLAP_COUNT',
  'PARTITION_GAP_COUNT',
  'UNSPLITTABLE_PARENT_COUNT',
  'PARENT_UNION_MISMATCH_COUNT',
  'CHILD_PREFIX_MISMATCH_COUNT',
  'SPLIT_SEMANTIC_MISMATCH_COUNT',
  'PARENT_CHILD_CARDINALITY_MISMATCH_COUNT'
]){
  if(Number(depth5Plan[key]??1)!==0||Number(depth5Proof[key]??1)!==0)throw new Error('DEPTH5_MEASUREMENT_SOURCE_COVERAGE_COUNTER_INVALID:'+key);
}

const runtime=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');
if(!runtime?.sourcePackageIntegrity?.match)throw new Error('DEPTH5_MEASUREMENT_RUNTIME_INTEGRITY_FAIL');

const binding={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_DEPTH5_MEASUREMENT_GAP_SOURCE_BINDING',
  exact_head:head,
  source_exact_head:SOURCE_HEAD,
  source_run_id:Number(SOURCE_RUN_ID),
  source_artifact:SOURCE_ARTIFACT,
  source_analysis_blob:sourceBlob,
  changed_files_since_source:changedFiles,
  changed_file_count:changedFiles.length,
  source_evidence_role:'DIAGNOSTIC_TARGET_IDENTITY_ONLY',
  source_pass_evidence_reused_as_current_head:false,
  current_head_runtime_revalidation_required:true,
  current_runtime_manifest_sha256:runtime.sourcePackageIntegrity.actual,
  exhaustive_runner_source_modified:false,
  status:'PASS'
};
writeJson(`${OUT}/depth5-measurement-gap-source-binding.json`,binding);

writeJson(`${OUT}/heavy-partition-analysis.json`,{
  ...heavy,
  exact_head:head,
  evidence_origin:'CURRENT_HEAD_DIAGNOSTIC_BINDING',
  source_bound_exact_head:SOURCE_HEAD,
  current_head_binding_sha256:sha(binding),
  source_pass_evidence_reused_as_current_head:false
});
writeJson(`${OUT}/recursive-partition-plan.json`,{
  ...recursive,
  exact_head:head,
  evidence_origin:'CURRENT_HEAD_DIAGNOSTIC_BINDING',
  source_bound_exact_head:SOURCE_HEAD,
  current_head_binding_sha256:sha(binding),
  source_pass_evidence_reused_as_current_head:false
});

const childrenById=new Map((depth5Plan.children??[]).map((row)=>[row.PARTITION_ID,row]));
const failedRepresentatives=(depth5Micro.results??[]).filter((row)=>row.status==='NEEDS_DEEPER_SPLIT');
if(failedRepresentatives.length!==10)throw new Error('DEPTH5_MEASUREMENT_REPRESENTATIVE_COUNT_INVALID:'+failedRepresentatives.length);

const results=[];
for(const [index,sourceResult] of failedRepresentatives.entries()){
  const partition=childrenById.get(sourceResult.depth5_child_partition_id);
  if(!partition)throw new Error('DEPTH5_MEASUREMENT_PARTITION_MISSING:'+String(sourceResult.depth5_child_partition_id));
  const seed=partition.SELECTOR_PREFIX??{};

  const resolveStarted=Date.now();
  const resolved=await resolveRuntimeAppProduct(PRODUCT_ID,seed);
  const initialResolveMs=Date.now()-resolveStarted;
  for(const [key,value] of Object.entries(seed)){
    if(!same(resolved.selection?.[key],value))throw new Error(`DEPTH5_MEASUREMENT_SEED_REJECTED:${partition.PARTITION_ID}:${key}`);
  }

  const measurement=runDepth5Measurement(partition,index);
  const concreteStateProgress=
    measurement.outcome==='STATE_PROBE_LIMIT_REACHED' ||
    measurement.outcome==='COMPLETED';
  const concreteTerminalProgress=Number(measurement.partial_terminal_digest_count??0)>0;
  const validOutcome=['STATE_PROBE_LIMIT_REACHED','COMPLETED','TIMEOUT_BEFORE_STATE_PROBE_LIMIT'].includes(measurement.outcome);
  const measurementValid=
    validOutcome &&
    Number.isFinite(initialResolveMs) &&
    initialResolveMs<CHILD_TIMEOUT_MS &&
    (concreteStateProgress||concreteTerminalProgress);

  results.push({
    index,
    product_node:partition.PRODUCT_NODE,
    depth5_partition_id:partition.PARTITION_ID,
    selector_prefix:seed,
    next_safe_split_field:sourceResult.next_safe_split_field??partition.NEXT_SAFE_SPLIT_FIELD??null,
    next_safe_split_cardinality:sourceResult.next_safe_split_cardinality??partition.NEXT_SAFE_SPLIT_CARDINALITY??null,
    initial_resolve_ms:initialResolveMs,
    concrete_state_progress_observed:concreteStateProgress,
    concrete_terminal_progress_observed:concreteTerminalProgress,
    measurement_valid:measurementValid,
    ...measurement
  });

  console.log(
    `DEPTH5_MEASUREMENT node=${partition.PRODUCT_NODE}`+
    ` resolve_ms=${initialResolveMs}`+
    ` outcome=${measurement.outcome}`+
    ` state_progress=${measurement.exact_or_threshold_state_progress_count??'<'+STATE_PROBE_LIMIT}`+
    ` terminals=${measurement.partial_terminal_digest_count}`+
    ` rate=${measurement.states_per_second_wall_clock_actual??measurement.states_per_second_wall_clock_upper_bound??'null'}`
  );
}

const invalid=results.filter((row)=>!row.measurement_valid);
const missingSafeSplit=results.filter((row)=>!row.next_safe_split_field);
const timeoutBeforeProbe=results.filter((row)=>row.outcome==='TIMEOUT_BEFORE_STATE_PROBE_LIMIT');
const stateProbeReached=results.filter((row)=>row.outcome==='STATE_PROBE_LIMIT_REACHED');
const completed=results.filter((row)=>row.outcome==='COMPLETED');
const initialResolveMaxMs=Math.max(...results.map((row)=>Number(row.initial_resolve_ms??0)));
const totalObservedTerminals=results.reduce((sum,row)=>sum+Number(row.partial_terminal_digest_count??0),0);

const depth6ExecutionAuthorized=
  invalid.length===0 &&
  missingSafeSplit.length===0 &&
  results.length===10;

let decision='DEPTH6_BLOCKED_MEASUREMENT_INVALID';
if(depth6ExecutionAuthorized)decision='DEPTH6_DIAGNOSTIC_EXECUTION_AUTHORIZED_FROM_MEASURED_DEPTH5_PROGRESS';
else if(missingSafeSplit.length>0)decision='DEPTH6_BLOCKED_SAFE_REQUIRED_ENUM_FRONTIER_MISSING';

const evidence={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_DEPTH5_MEASUREMENT_GAP_CLOSURE',
  exact_head:head,
  task_classification:'NON-PRODUCT-MASTER',
  product_master_mutation:0,
  source_exact_head:SOURCE_HEAD,
  source_run_id:Number(SOURCE_RUN_ID),
  representative_count:results.length,
  child_timeout_ms:CHILD_TIMEOUT_MS,
  state_probe_limit:STATE_PROBE_LIMIT,
  completed_count:completed.length,
  state_probe_limit_reached_count:stateProbeReached.length,
  timeout_before_state_probe_count:timeoutBeforeProbe.length,
  measurement_invalid_count:invalid.length,
  missing_safe_split_count:missingSafeSplit.length,
  max_initial_resolve_ms:initialResolveMaxMs,
  partial_terminal_digest_count_total:totalObservedTerminals,
  results,
  measurement_method:{
    runner_semantics_modified:false,
    bounded_state_probe:true,
    partial_terminal_progress_from_existing_terminal_digest:true,
    initial_resolve_probe:'resolveRuntimeAppProduct on the identical Depth5 representative seed before child traversal',
    rate_basis:'batch wall clock including child setup; exact when state threshold/completion observed, upper bound when timeout occurs before threshold'
  },
  depth6_execution_authorized:depth6ExecutionAuthorized,
  full_depth6_execution_authorized:false,
  full_coverage_authorized:false,
  UCHIRIMO_FULL_COVERAGE_QA_GATE:'BLOCKED',
  APP_INTEGRATION_READY:false,
  RELEASE_INPUT_GATE:'BLOCKED',
  decision,
  status:invalid.length===0?'MEASURED_DIAGNOSTIC_COMPLETE':'BLOCKED'
};
writeJson(`${OUT}/depth5-measurement-gap-closure.json`,evidence);
writeJson(`${OUT}/depth6-execution-decision.json`,{
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_DEPTH6_EXECUTION_DECISION',
  exact_head:head,
  evidence_artifact:'depth5-measurement-gap-closure.json',
  representative_count:results.length,
  measurement_invalid_count:invalid.length,
  missing_safe_split_count:missingSafeSplit.length,
  depth6_execution_authorized:depth6ExecutionAuthorized,
  authorization_scope:'REPRESENTATIVE_DIAGNOSTIC_ONLY',
  full_depth6_execution_authorized:false,
  full_coverage_authorized:false,
  decision,
  status:depth6ExecutionAuthorized?'AUTHORIZED_FOR_NEXT_DIAGNOSTIC_STEP':'BLOCKED'
});

console.log(`DEPTH5_MEASUREMENT_REPRESENTATIVE_COUNT=${results.length}`);
console.log(`DEPTH5_MEASUREMENT_INVALID_COUNT=${invalid.length}`);
console.log(`DEPTH5_STATE_PROBE_LIMIT_REACHED_COUNT=${stateProbeReached.length}`);
console.log(`DEPTH5_TIMEOUT_BEFORE_STATE_PROBE_COUNT=${timeoutBeforeProbe.length}`);
console.log(`DEPTH5_PARTIAL_TERMINAL_COUNT_TOTAL=${totalObservedTerminals}`);
console.log(`DEPTH5_MAX_INITIAL_RESOLVE_MS=${initialResolveMaxMs}`);
console.log(`DEPTH6_DIAGNOSTIC_EXECUTION_AUTHORIZED=${depth6ExecutionAuthorized?'TRUE':'FALSE'}`);
console.log(`DEPTH6_EXECUTION_DECISION=${decision}`);
console.log('UCHIRIMO_FULL_COVERAGE_QA_GATE=BLOCKED');
console.log('APP_INTEGRATION_READY=FALSE');
console.log('RELEASE_INPUT_GATE=BLOCKED');

if(invalid.length>0)throw new Error('DEPTH5_MEASUREMENT_GAP_NOT_CLOSED');
