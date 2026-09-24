import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { currentExactHead, writeJson } from './governance-lib.mjs';

const SOURCE_RUN='35988553229';
const SOURCE_HEAD='71d47fc53069c65616723854dbc35919155e0900';
const SOURCE_ANALYSIS_BLOB='3804d2a073f75a10614a57babb560e5fa664963b';
const SOURCE_BATCH_BLOB='435a48d054d74798f61368234bc6775cdaa0c770';
const SOURCE_FULL_BLOB='94a86542cace253dc45e7b1f8589f98b837a4cce';
const CURRENT_BATCH_BLOB='65a57854ab7adf45fa0486b465530686d76cb09f';
const SOURCE_ART=`uchirimo-heavy-recovery-analysis-${SOURCE_HEAD}`;
const SOURCE_HARD_REL='source-run-35987594269/source-run-35985579293/explicit-decision-constraint-model-hard-proof.json';
const SOURCE_MODEL_REL='source-run-35987594269/source-run-35985579293/source-run-35982709102/explicit-decision-constraint-partition-model-proof.json';
const PATH='scripts/governance/uchirimo-heavy-partition-analysis.mjs';
const BATCH_PATH='scripts/governance/uchirimo-selector-batch-runner.mjs';
const FULL_RUNNER_PATH='scripts/uchirimo-full-selector-proof.mjs';
const OUT=String(process.env.UCHIRIMO_HEAVY_ANALYSIS_OUT??'artifacts/uchirimo-heavy-recovery');
const TIMEOUT=Number(process.env.UCHIRIMO_CONSTRAINT_RUNNER_MICRO_TIMEOUT_MS??60000);
const head=currentExactHead();
if(!Number.isFinite(TIMEOUT)||TIMEOUT<60000)throw new Error('CONSTRAINT_RUNNER_TIMEOUT_INVALID');
mkdirSync(OUT,{recursive:true});

const stable=(value)=>Array.isArray(value)
  ? value.map(stable)
  : (!value||typeof value!=='object')
    ? value
    : Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>[key,stable(v)]));
const sj=(value)=>JSON.stringify(stable(value));
const hash=(value)=>createHash('sha256').update(typeof value==='string'?value:sj(value)).digest('hex');
const read=(path)=>JSON.parse(readFileSync(path,'utf8'));
const safeRead=(path)=>{try{return read(path)}catch{return null}};

function runnerRow(lane,index){
  const prefix=stable(lane.selector_prefix??{});
  const baseKeys=new Set(['room_specification','window_type','glass_family','sash_configuration','size_class']);
  const constraints=[{field_key:lane.selected_constraint_field,decision:{kind:'UNSET'}}];
  return {
    shard:0,
    node_id:lane.product_node,
    partition_key:`${lane.lane_id}|constraint-micro-${index}|${lane.selected_constraint_field}=EXPLICIT_UNSET`,
    room_specification:String(prefix.room_specification),
    window_type:String(prefix.window_type),
    sash_configuration:prefix.sash_configuration==null?'__UNSET__':String(prefix.sash_configuration),
    size_class:prefix.size_class==null?'__UNSET__':String(prefix.size_class),
    glass_family:String(prefix.glass_family),
    partition_seed_json:sj(Object.fromEntries(Object.entries(prefix).filter(([key])=>!baseKeys.has(key)))),
    decision_constraints_json:sj(constraints),
    expected_constraint_hash:hash(constraints)
  };
}

function measureRunnerConstraint(lane,index){
  const row=runnerRow(lane,index);
  const id=String(index).padStart(2,'0');
  const dir=`${OUT}/constraint-runner-micro/case-${id}`;
  const batchId=`constraint-runner-micro-${id}`;
  mkdirSync(dir,{recursive:true});
  let executionError=null;
  try{
    execFileSync(process.execPath,[BATCH_PATH],{
      env:{
        ...process.env,
        HEAD_SHA:head,
        UCHIRIMO_SELECTOR_BATCH_ID:batchId,
        UCHIRIMO_SELECTOR_BATCH_JSON:JSON.stringify([row]),
        UCHIRIMO_SELECTOR_CHILD_TIMEOUT_MS:String(TIMEOUT),
        UCHIRIMO_SELECTOR_EXPECTED_SHARDS:'1',
        UCHIRIMO_SELECTOR_MAX_STATES:'1000000',
        UCHIRIMO_SELECTOR_MAX_TERMINALS:'1000000',
        UCHIRIMO_RESOLVER_CACHE_MAX:'512',
        UCHIRIMO_FULL_SELECTOR_OUT:dir
      },
      encoding:'utf8',
      timeout:TIMEOUT+20000,
      maxBuffer:64*1024*1024
    });
  }catch(error){
    executionError={message:String(error?.message??error),code:error?.code??null,signal:error?.signal??null};
  }
  const batch=safeRead(`${dir}/batch-${batchId}-report.json`);
  const start=safeRead(`${dir}/shard-0-constraint-start.json`);
  const progress=safeRead(`${dir}/shard-0-constraint-progress.json`);
  const report=safeRead(`${dir}/shard-0-report.json`);
  const failure=safeRead(`${dir}/shard-0-failure.json`);
  const digest=`${dir}/shard-0-terminal-digests.jsonl`;
  if(existsSync(digest))unlinkSync(digest);
  const result=batch?.results?.[0]??null;
  const started=Date.parse(result?.started_at??'');
  const completed=Date.parse(result?.completed_at??'');
  const elapsedMs=Number.isFinite(started)&&Number.isFinite(completed)&&completed>=started?completed-started:null;
  const startValid=start?.status==='PASS'
    &&start.exact_head===head
    &&start.runner==='UCHIRIMO_EXPLICIT_DECISION_CONSTRAINT_SHARD_V1'
    &&start.decision_constraints_sha256===row.expected_constraint_hash
    &&start.runtime_integrity_match===true;
  const progressValid=progress?.exact_head===head
    &&progress.decision_constraints_sha256===row.expected_constraint_hash
    &&Number(progress.visited_state_count??0)>0;
  const completedPass=batch?.status==='PASS'
    &&report?.status==='PASS'
    &&report?.exact_head===head
    &&report?.runtime_integrity_match===true
    &&report?.decision_constraints_sha256===row.expected_constraint_hash
    &&Number(report?.unverified_discrete_selector_case_count??1)===0;
  const message=String(failure?.message??'');
  const timedOut=result?.timed_out===true;
  const stateLimit=/UCHIRIMO_SELECTOR_STATE_LIMIT_REACHED/.test(message);
  const terminalLimit=/UCHIRIMO_TERMINAL_LIMIT_REACHED/.test(message);
  const outcome=completedPass
    ? 'COMPLETED'
    : timedOut&&startValid&&progressValid
      ? 'TIMEOUT_CONSTRAINT_ACTIVE'
      : stateLimit&&startValid
        ? 'STATE_LIMIT_REACHED'
        : terminalLimit&&startValid
          ? 'TERMINAL_LIMIT_REACHED'
          : 'INVALID';
  return {
    outcome,
    elapsed_ms:elapsedMs,
    timed_out:timedOut,
    runner_path:result?.runner??null,
    constraint_count:result?.constraint_count??null,
    constraint_start_valid:startValid,
    constraint_progress_valid:progressValid,
    visited_state_count:report?.visited_state_count??progress?.visited_state_count??null,
    terminal_context_count:report?.terminal_context_count??progress?.terminal_context_count??null,
    transition_check_count:report?.transition_check_count??progress?.transition_check_count??null,
    dependency_rejection_count:report?.dependency_rejection_count??progress?.dependency_rejection_count??null,
    constraint_rejection_count:report?.constraint_rejection_count??progress?.constraint_rejection_count??null,
    failure_message:message||null,
    execution_error:executionError
  };
}

execFileSync('git',['merge-base','--is-ancestor',SOURCE_HEAD,head],{stdio:'ignore'});
const sourceAnalysisBlob=execFileSync('git',['rev-parse',`${SOURCE_HEAD}:${PATH}`],{encoding:'utf8'}).trim();
const sourceBatchBlob=execFileSync('git',['rev-parse',`${SOURCE_HEAD}:${BATCH_PATH}`],{encoding:'utf8'}).trim();
const sourceFullBlob=execFileSync('git',['rev-parse',`${SOURCE_HEAD}:${FULL_RUNNER_PATH}`],{encoding:'utf8'}).trim();
if(sourceAnalysisBlob!==SOURCE_ANALYSIS_BLOB)throw new Error(`SOURCE_ANALYSIS_BLOB_MISMATCH:${sourceAnalysisBlob}`);
if(sourceBatchBlob!==SOURCE_BATCH_BLOB)throw new Error(`SOURCE_BATCH_BLOB_MISMATCH:${sourceBatchBlob}`);
if(sourceFullBlob!==SOURCE_FULL_BLOB)throw new Error(`SOURCE_FULL_BLOB_MISMATCH:${sourceFullBlob}`);
const currentBatchBlob=execFileSync('git',['rev-parse',`${head}:${BATCH_PATH}`],{encoding:'utf8'}).trim();
const currentFullBlob=execFileSync('git',['rev-parse',`${head}:${FULL_RUNNER_PATH}`],{encoding:'utf8'}).trim();
if(currentBatchBlob!==CURRENT_BATCH_BLOB)throw new Error(`CURRENT_BATCH_BLOB_MISMATCH:${currentBatchBlob}`);
if(currentFullBlob!==SOURCE_FULL_BLOB)throw new Error('FULL_SELECTOR_RUNNER_UNREQUESTED_CHANGE');
const changed=execFileSync('git',['diff','--name-only',`${SOURCE_HEAD}..${head}`],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean).sort();
const expectedChanged=[PATH,BATCH_PATH].sort();
if(sj(changed)!==sj(expectedChanged))throw new Error(`RUNNER_SCOPE_INVALID:${changed.join(',')}`);

const sourceDir=`${OUT}/source-run-${SOURCE_RUN}`;
mkdirSync(sourceDir,{recursive:true});
execFileSync('gh',['run','download',SOURCE_RUN,'--repo',String(process.env.GITHUB_REPOSITORY??'Takuro-Kwkm/sash-app'),'--name',SOURCE_ART,'--dir',sourceDir],{stdio:'inherit',timeout:120000});
const sourceHeavy=read(`${sourceDir}/heavy-partition-analysis.json`);
const sourcePlan=read(`${sourceDir}/recursive-partition-plan.json`);
const sourceDepth9Plan=read(`${sourceDir}/depth9-safe-representative-partition-plan.json`);
const sourceDepth9Proof=read(`${sourceDir}/depth9-safe-representative-coverage-preservation-proof.json`);
const sourceDepth9Micro=read(`${sourceDir}/depth9-safe-representative-micro-calibration.json`);
const sourceConstraintMicro=read(`${sourceDir}/explicit-decision-constraint-representative-micro-calibration.json`);
const sourceDecision=read(`${sourceDir}/depth9-and-constraint-micro-decision.json`);
const sourceHard=read(`${sourceDir}/${SOURCE_HARD_REL}`);
const sourceModel=read(`${sourceDir}/${SOURCE_MODEL_REL}`);
if(sourceDecision.exact_head!==SOURCE_HEAD||sourceDecision.runner_implementation_authorized!==true||sourceDecision.constraint_micro_calibration_invalid_count!==0)throw new Error('SOURCE_RUNNER_AUTHORIZATION_NOT_PASS');
if(sourceConstraintMicro.exact_head!==SOURCE_HEAD||sourceConstraintMicro.calibration_invalid_count!==0||sourceConstraintMicro.needs_further_partitioning_count!==2)throw new Error('SOURCE_CONSTRAINT_MICRO_SHAPE_INVALID');
if(sourceDepth9Micro.decision!=='DEPTH10_REQUIRED_FOR_FAILED_SAFE_REPRESENTATIVES'||sourceDepth9Micro.calibration_invalid_count!==0)throw new Error('SOURCE_DEPTH9_DECISION_INVALID');
if(sourceHard.EXPLICIT_DECISION_CONSTRAINT_MODEL_GATE!=='PASS'||sourceHard.lane_pass_count!==7||sourceHard.lane_fail_count!==0)throw new Error('SOURCE_HARD_PROOF_NOT_PASS');
if(sourceModel.explicit_decision_constraint_model_status!=='PASS'||sourceModel.lane_count!==7)throw new Error('SOURCE_MODEL_PROOF_NOT_PASS');

const modelByLane=new Map(sourceModel.lanes.map((lane)=>[lane.lane_id,lane]));
const reps=[];
for(const sourceLane of ['DEPTH7_SAFE_FRONTIER_EXHAUSTED','DEPTH6_SAFE_FRONTIER_EXHAUSTED']){
  const hardLane=sourceHard.lanes.filter((candidate)=>candidate.source_lane===sourceLane).sort((a,b)=>String(a.lane_id).localeCompare(String(b.lane_id)))[0];
  if(!hardLane)throw new Error(`RUNNER_REPRESENTATIVE_HARD_LANE_MISSING:${sourceLane}`);
  const modelLane=modelByLane.get(hardLane.lane_id);
  if(!modelLane?.selector_prefix||!Object.keys(modelLane.selector_prefix).length)throw new Error(`RUNNER_REPRESENTATIVE_PREFIX_MISSING:${hardLane.lane_id}`);
  reps.push({...hardLane,selector_prefix:stable(modelLane.selector_prefix)});
}

const runtime=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');
if(!runtime?.sourcePackageIntegrity?.match)throw new Error('CURRENT_RUNTIME_INTEGRITY_FAIL');
if(runtime.sourcePackageIntegrity.actual!==sourceHard.current_runtime_manifest_sha256)throw new Error(`CURRENT_RUNTIME_MANIFEST_CHANGED:${runtime.sourcePackageIntegrity.actual}`);
const binding={
  schema_version:'1.0.0',artifact_type:'UCHIRIMO_CONSTRAINT_RUNNER_MICRO_SOURCE_BINDING',exact_head:head,source_exact_head:SOURCE_HEAD,source_run_id:Number(SOURCE_RUN),
  changed_files_since_source:changed,source_runner_implementation_authorized:sourceDecision.runner_implementation_authorized,source_constraint_micro_invalid_count:sourceDecision.constraint_micro_calibration_invalid_count,
  source_depth9_decision:sourceDepth9Micro.decision,source_depth9_measurement_reexecuted:false,current_runtime_manifest_sha256:runtime.sourcePackageIntegrity.actual,
  full_selector_runner_unchanged:true,status:'PASS'
};
writeJson(`${OUT}/constraint-runner-micro-source-binding.json`,binding);
writeJson(`${OUT}/heavy-partition-analysis.json`,{...sourceHeavy,exact_head:head,evidence_origin:'CURRENT_HEAD_CONSTRAINT_RUNNER_MICRO_BINDING',source_bound_exact_head:SOURCE_HEAD,current_head_binding_sha256:hash(binding),source_pass_evidence_reused_as_current_head:false});
writeJson(`${OUT}/recursive-partition-plan.json`,{...sourcePlan,exact_head:head,evidence_origin:'CURRENT_HEAD_CONSTRAINT_RUNNER_MICRO_BINDING',source_bound_exact_head:SOURCE_HEAD,current_head_binding_sha256:hash(binding),source_pass_evidence_reused_as_current_head:false});
writeJson(`${OUT}/depth9-safe-representative-partition-plan.json`,{...sourceDepth9Plan,exact_head:head,measurement_source_exact_head:sourceDepth9Plan.measurement_source_exact_head??SOURCE_HEAD,measurement_reexecuted:false,evidence_origin:'BOUND_SOURCE_DIAGNOSTIC_NOT_CURRENT_EXECUTION'});
writeJson(`${OUT}/depth9-safe-representative-coverage-preservation-proof.json`,{...sourceDepth9Proof,exact_head:head,measurement_source_exact_head:sourceDepth9Proof.measurement_source_exact_head??SOURCE_HEAD,measurement_reexecuted:false,evidence_origin:'BOUND_SOURCE_DIAGNOSTIC_NOT_CURRENT_EXECUTION'});
writeJson(`${OUT}/depth9-safe-representative-micro-calibration.json`,{...sourceDepth9Micro,exact_head:head,measurement_source_exact_head:sourceDepth9Micro.measurement_source_exact_head??SOURCE_HEAD,measurement_reexecuted:false,evidence_origin:'BOUND_SOURCE_DIAGNOSTIC_NOT_CURRENT_EXECUTION'});

const results=[];
for(const [index,lane] of reps.entries()){
  const measured=measureRunnerConstraint(lane,index);
  const validTimedOut=measured.outcome==='TIMEOUT_CONSTRAINT_ACTIVE';
  const status=measured.outcome==='COMPLETED'?'PASS':validTimedOut||['STATE_LIMIT_REACHED','TERMINAL_LIMIT_REACHED'].includes(measured.outcome)?'NEEDS_FURTHER_PARTITIONING':'CALIBRATION_INVALID';
  results.push({index,lane_id:lane.lane_id,source_lane:lane.source_lane,product_node:lane.product_node,selected_constraint_field:lane.selected_constraint_field,decision_constraint:{field_key:lane.selected_constraint_field,decision:{kind:'UNSET'}},...measured,status});
  console.log(`CONSTRAINT_RUNNER_MICRO lane=${lane.lane_id} status=${status} outcome=${measured.outcome} start=${measured.constraint_start_valid} progress=${measured.constraint_progress_valid} states=${measured.visited_state_count??null} terminals=${measured.terminal_context_count??null}`);
}
const pass=results.filter((row)=>row.status==='PASS');
const further=results.filter((row)=>row.status==='NEEDS_FURTHER_PARTITIONING');
const invalid=results.filter((row)=>row.status==='CALIBRATION_INVALID');
const representativeVerified=invalid.length===0&&results.every((row)=>row.constraint_start_valid===true&&(row.status==='PASS'||row.constraint_progress_valid===true));
const runnerMicro={
  schema_version:'1.0.0',artifact_type:'UCHIRIMO_EXPLICIT_DECISION_CONSTRAINT_REAL_RUNNER_MICRO_CALIBRATION',exact_head:head,
  source_authorization_exact_head:SOURCE_HEAD,runner_model:'BATCH_INLINE_EXPLICIT_CONSTRAINT_SHARD_V1',representative_count:results.length,child_timeout_ms:TIMEOUT,
  pass_count:pass.length,needs_further_partitioning_count:further.length,calibration_invalid_count:invalid.length,results,
  runner_constraint_support_implemented:true,runner_constraint_representative_verified:representativeVerified,full_aggregate_constraint_support_implemented:false,
  constraint_full_execution_authorized:false,full_coverage_authorized:false,status:representativeVerified?'MEASURED_RUNNER_SUPPORT_ONLY':'BLOCKED'
};
writeJson(`${OUT}/explicit-decision-constraint-real-runner-micro-calibration.json`,runnerMicro);
const decision={
  schema_version:'1.0.0',artifact_type:'UCHIRIMO_CONSTRAINT_RUNNER_IMPLEMENTATION_DECISION',exact_head:head,source_exact_head:SOURCE_HEAD,source_run_id:Number(SOURCE_RUN),
  source_depth9_decision:sourceDepth9Micro.decision,source_depth9_measurement_reexecuted:false,explicit_constraint_model_gate:sourceHard.EXPLICIT_DECISION_CONSTRAINT_MODEL_GATE,
  runner_constraint_support_implemented:true,runner_constraint_representative_verified:representativeVerified,full_aggregate_constraint_support_implemented:false,
  runner_micro_pass_count:pass.length,runner_micro_needs_further_partitioning_count:further.length,runner_micro_calibration_invalid_count:invalid.length,
  next_constraint_action:representativeVerified?'DEEPER_OPTIONAL_CONSTRAINT_PARTITION_REQUIRED':'RUNNER_IMPLEMENTATION_BLOCKED',next_safe_lane_action:'DEPTH10_REQUIRED_FOR_FAILED_SAFE_REPRESENTATIVES',
  constraint_full_execution_authorized:false,full_coverage_authorized:false,REQUESTED_DIFF_COVERAGE:sj(changed)===sj(expectedChanged)?'PASS':'FAIL',UNREQUESTED_DIFF_COUNT:changed.filter((path)=>!expectedChanged.includes(path)).length,
  UCHIRIMO_FULL_COVERAGE_QA_GATE:'BLOCKED',UCHIRIMO_QA_STATUS:'UNVERIFIED',APP_INTEGRATION_READY:false,RELEASE_INPUT_GATE:'BLOCKED',status:representativeVerified?'RUNNER_MICRO_VERIFIED_FULL_EXECUTION_BLOCKED':'BLOCKED'
};
writeJson(`${OUT}/depth9-and-constraint-micro-decision.json`,decision);
console.log(`CONSTRAINT_RUNNER_MICRO_PASS_COUNT=${pass.length}/${results.length}`);
console.log(`CONSTRAINT_RUNNER_MICRO_NEEDS_FURTHER_PARTITIONING_COUNT=${further.length}`);
console.log(`CONSTRAINT_RUNNER_MICRO_INVALID_COUNT=${invalid.length}`);
console.log('RUNNER_CONSTRAINT_SUPPORT_IMPLEMENTED=TRUE');
console.log(`RUNNER_CONSTRAINT_REPRESENTATIVE_VERIFIED=${String(representativeVerified).toUpperCase()}`);
console.log('FULL_AGGREGATE_CONSTRAINT_SUPPORT_IMPLEMENTED=FALSE');
console.log('CONSTRAINT_FULL_EXECUTION_AUTHORIZED=FALSE');
console.log('UCHIRIMO_FULL_COVERAGE_QA_GATE=BLOCKED');
console.log('APP_INTEGRATION_READY=FALSE');
console.log('RELEASE_INPUT_GATE=BLOCKED');
if(!representativeVerified)throw new Error('CONSTRAINT_RUNNER_MICRO_NOT_VERIFIED');
