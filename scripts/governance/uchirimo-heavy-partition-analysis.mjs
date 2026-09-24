import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { currentExactHead, writeJson } from './governance-lib.mjs';

const SOURCE_RUN='36001721647';
const SOURCE_HEAD='da5c7b64aec8fd0d09460064ae1ceea2a645ae99';
const SOURCE_ART=`uchirimo-heavy-recovery-analysis-${SOURCE_HEAD}`;
const SOURCE_ART_DIGEST='sha256:656173538f4eba86a53fcdaa19fe16133fb7b8ae8b11eb06151c8057056d7908';
const SOURCE_ANALYSIS_BLOB='e99da8d9390806a9dba4eb9662b75da2ef72d653';
const SOURCE_BATCH_BLOB='65a57854ab7adf45fa0486b465530686d76cb09f';
const SOURCE_FULL_BLOB='94a86542cace253dc45e7b1f8589f98b837a4cce';
const PATH='scripts/governance/uchirimo-heavy-partition-analysis.mjs';
const BATCH='scripts/governance/uchirimo-selector-batch-runner.mjs';
const FULL='scripts/uchirimo-full-selector-proof.mjs';
const OUT=String(process.env.UCHIRIMO_HEAVY_ANALYSIS_OUT??'artifacts/uchirimo-heavy-recovery');
const TIMEOUT=Number(process.env.UCHIRIMO_CONSTRAINT_DEPTH4_ALL_BRANCH_TIMEOUT_MS??60000);
const REPO=String(process.env.GITHUB_REPOSITORY??'Takuro-Kwkm/sash-app');
const head=currentExactHead();
if(!Number.isFinite(TIMEOUT)||TIMEOUT<60000)throw new Error('CONSTRAINT_DEPTH4_ALL_BRANCH_TIMEOUT_INVALID');
mkdirSync(OUT,{recursive:true});

const stable=(v)=>Array.isArray(v)?v.map(stable):(!v||typeof v!=='object')?v:Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,stable(x)]));
const sj=(v)=>JSON.stringify(stable(v));
const hash=(v)=>createHash('sha256').update(typeof v==='string'?v:sj(v)).digest('hex');
const fileHash=(p)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const read=(p)=>JSON.parse(readFileSync(p,'utf8'));
const safeRead=(p)=>{try{return read(p)}catch{return null}};
const dkey=(d)=>d?.kind==='UNSET'?'UNSET':`VALUE:${sj(d?.value)}`;

function constraintRow(parent,index,constraints){
  const s=parent.selector_prefix??{};
  const base=new Set(['room_specification','window_type','glass_family','sash_configuration','size_class']);
  return {
    shard:0,
    node_id:parent.product_node,
    partition_key:`${parent.parent_child_id}|constraint-depth4-all-branch-${index}`,
    room_specification:String(s.room_specification),
    window_type:String(s.window_type),
    sash_configuration:s.sash_configuration==null?'__UNSET__':String(s.sash_configuration),
    size_class:s.size_class==null?'__UNSET__':String(s.size_class),
    glass_family:String(s.glass_family),
    partition_seed_json:sj(Object.fromEntries(Object.entries(s).filter(([k])=>!base.has(k)))),
    decision_constraints_json:sj(constraints),
    expected_hash:hash(constraints)
  };
}

function executeConstraint(parent,index,constraints){
  const row=constraintRow(parent,index,constraints);
  const id=`constraint-depth4-all-branch-${String(index).padStart(2,'0')}`;
  const dir=`${OUT}/constraint-depth4-all-branches/case-${String(index).padStart(2,'0')}`;
  mkdirSync(dir,{recursive:true});
  let executionError=null;
  try{
    execFileSync(process.execPath,[BATCH],{
      env:{...process.env,HEAD_SHA:head,UCHIRIMO_SELECTOR_BATCH_ID:id,UCHIRIMO_SELECTOR_BATCH_JSON:JSON.stringify([row]),UCHIRIMO_SELECTOR_CHILD_TIMEOUT_MS:String(TIMEOUT),UCHIRIMO_SELECTOR_EXPECTED_SHARDS:'1',UCHIRIMO_SELECTOR_MAX_STATES:'1000000',UCHIRIMO_SELECTOR_MAX_TERMINALS:'1000000',UCHIRIMO_RESOLVER_CACHE_MAX:'512',UCHIRIMO_FULL_SELECTOR_OUT:dir},
      encoding:'utf8',timeout:TIMEOUT+20000,maxBuffer:64*1024*1024
    });
  }catch(error){executionError={message:String(error?.message??error),code:error?.code??null,signal:error?.signal??null};}
  const batch=safeRead(`${dir}/batch-${id}-report.json`);
  const report=safeRead(`${dir}/shard-0-report.json`);
  const failure=safeRead(`${dir}/shard-0-failure.json`);
  const start=safeRead(`${dir}/shard-0-constraint-start.json`);
  const progress=safeRead(`${dir}/shard-0-constraint-progress.json`);
  const digest=`${dir}/shard-0-terminal-digests.jsonl`;
  if(existsSync(digest))unlinkSync(digest);
  const br=batch?.results?.[0]??null;
  const a=Date.parse(br?.started_at??'');
  const b=Date.parse(br?.completed_at??'');
  const elapsed=Number.isFinite(a)&&Number.isFinite(b)&&b>=a?b-a:null;
  const message=String(failure?.message??br?.error??'');
  const timedOut=br?.timed_out===true;
  const startOk=start?.status==='PASS'&&start.exact_head===head&&start.runner==='UCHIRIMO_EXPLICIT_DECISION_CONSTRAINT_SHARD_V1'&&start.decision_constraints_sha256===row.expected_hash&&start.runtime_integrity_match===true;
  const progressOk=progress?.exact_head===head&&progress.decision_constraints_sha256===row.expected_hash&&Number(progress.visited_state_count??0)>0;
  const pass=batch?.status==='PASS'&&report?.status==='PASS'&&report?.exact_head===head&&report?.decision_constraints_sha256===row.expected_hash&&report?.runtime_integrity_match===true&&Number(report?.unverified_discrete_selector_case_count??1)===0;
  const outcome=pass?'COMPLETED':timedOut&&startOk&&progressOk?'TIMEOUT_CONSTRAINT_ACTIVE':/STATE_LIMIT/.test(message)&&startOk?'STATE_LIMIT_REACHED':/TERMINAL_LIMIT/.test(message)&&startOk?'TERMINAL_LIMIT_REACHED':'INVALID';
  return {outcome,elapsed_ms:elapsed,timed_out:timedOut,runner_path:br?.runner??null,constraint_count:br?.constraint_count??null,constraint_start_valid:startOk,constraint_progress_valid:progressOk,visited_state_count:report?.visited_state_count??progress?.visited_state_count??null,terminal_context_count:report?.terminal_context_count??progress?.terminal_context_count??null,transition_check_count:report?.transition_check_count??progress?.transition_check_count??null,constraint_rejection_count:report?.constraint_rejection_count??progress?.constraint_rejection_count??null,failure_message:message||null,execution_error:executionError};
}

execFileSync('git',['merge-base','--is-ancestor',SOURCE_HEAD,head],{stdio:'ignore'});
for(const [path,expected] of [[PATH,SOURCE_ANALYSIS_BLOB],[BATCH,SOURCE_BATCH_BLOB],[FULL,SOURCE_FULL_BLOB]]){
  const actual=execFileSync('git',['rev-parse',`${SOURCE_HEAD}:${path}`],{encoding:'utf8'}).trim();
  if(actual!==expected)throw new Error(`SOURCE_BLOB_MISMATCH:${path}:${actual}`);
}
const changed=execFileSync('git',['diff','--name-only',`${SOURCE_HEAD}..${head}`],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean).sort();
if(sj(changed)!==sj([PATH]))throw new Error('NEXT_STAGE_SCOPE_INVALID:'+changed.join(','));
if(execFileSync('git',['rev-parse',`${head}:${BATCH}`],{encoding:'utf8'}).trim()!==SOURCE_BATCH_BLOB)throw new Error('BATCH_RUNNER_IDENTITY_CHANGED');
if(execFileSync('git',['rev-parse',`${head}:${FULL}`],{encoding:'utf8'}).trim()!==SOURCE_FULL_BLOB)throw new Error('FULL_SELECTOR_RUNNER_IDENTITY_CHANGED');

const artifactsPayload=JSON.parse(execFileSync('gh',['api',`repos/${REPO}/actions/runs/${SOURCE_RUN}/artifacts?per_page=100`],{encoding:'utf8',timeout:120000,maxBuffer:16*1024*1024}));
const sourceArtifactMeta=(artifactsPayload.artifacts??[]).find(row=>row.name===SOURCE_ART);
if(!sourceArtifactMeta)throw new Error('SOURCE_ARTIFACT_NOT_FOUND');
if(sourceArtifactMeta.expired===true)throw new Error('SOURCE_ARTIFACT_EXPIRED');
if(sourceArtifactMeta.digest!==SOURCE_ART_DIGEST)throw new Error(`SOURCE_ARTIFACT_DIGEST_MISMATCH:${sourceArtifactMeta.digest}`);
const srcRoot=String(process.env.RUNNER_TEMP??'/tmp');
const src=`${srcRoot}/uchirimo-heavy-source-${SOURCE_RUN}`;
mkdirSync(src,{recursive:true});
execFileSync('gh',['run','download',SOURCE_RUN,'--repo',REPO,'--name',SOURCE_ART,'--dir',src],{stdio:'inherit',timeout:120000});

const heavy=read(`${src}/heavy-partition-analysis.json`);
const recursive=read(`${src}/recursive-partition-plan.json`);
const sourceBinding=read(`${src}/constraint-depth4-representative-source-binding.json`);
const depth3Model=read(`${src}/explicit-decision-constraint-depth3-partition-model-proof.json`);
const depth3Representative=read(`${src}/explicit-decision-constraint-depth3-representative-micro-calibration.json`);
const depth3Calibration=read(`${src}/explicit-decision-constraint-depth3-all-branch-calibration.json`);
const depth4Model=read(`${src}/explicit-decision-constraint-depth4-partition-model-proof.json`);
const depth4Micro=read(`${src}/explicit-decision-constraint-depth4-representative-micro-calibration.json`);
const sourceDecision=read(`${src}/constraint-depth4-representative-decision.json`);
const sourceDepth11Plan=read(`${src}/depth11-safe-representative-partition-plan.json`);
const sourceDepth11Proof=read(`${src}/depth11-safe-representative-coverage-preservation-proof.json`);
const sourceDepth11Micro=read(`${src}/depth11-safe-representative-micro-calibration.json`);
for(const artifact of [heavy,recursive,sourceBinding,depth3Model,depth3Representative,depth3Calibration,depth4Model,depth4Micro,sourceDecision,sourceDepth11Plan,sourceDepth11Proof,sourceDepth11Micro])if(artifact.exact_head!==SOURCE_HEAD)throw new Error('SOURCE_HEAD_MISMATCH');
if(heavy.task_classification!=='NON-PRODUCT-MASTER'||heavy.product_master_mutation!==0||heavy.deferred_scope_status!=='DEFERRED_UNVERIFIED')throw new Error('SOURCE_CLASSIFICATION_INVALID');
if(recursive.status!=='PLAN_READY'||recursive.PARTITION_OVERLAP_COUNT!==0||recursive.PARTITION_GAP_COUNT!==0)throw new Error('SOURCE_RECURSIVE_PLAN_INVALID');
if(sourceBinding.status!=='PASS'||sourceBinding.current_runtime_manifest_sha256==null||sourceBinding.batch_runner_unchanged!==true||sourceBinding.full_selector_runner_unchanged!==true)throw new Error('SOURCE_BINDING_INVALID');
if(depth3Calibration.expected_branch_count!==12||depth3Calibration.executed_branch_count!==12||depth3Calibration.pass_count!==10||depth3Calibration.needs_further_partitioning_count!==2||depth3Calibration.calibration_invalid_count!==0||depth3Calibration.constraint_depth3_all_branch_runner_verified!==true)throw new Error('SOURCE_DEPTH3_CALIBRATION_INVALID');
if(depth4Model.status!=='PASS'||depth4Model.coverage_preservation_status!=='PASS'||depth4Model.parent_partition_count!==2||depth4Model.child_partition_count!==6||depth4Model.PARTITION_OVERLAP_COUNT!==0||depth4Model.PARTITION_GAP_COUNT!==0)throw new Error('SOURCE_DEPTH4_MODEL_INVALID');
if(depth4Micro.representative_count!==2||depth4Micro.pass_count!==2||depth4Micro.needs_further_partitioning_count!==0||depth4Micro.calibration_invalid_count!==0||depth4Micro.constraint_depth4_representative_verified!==true)throw new Error('SOURCE_DEPTH4_REPRESENTATIVE_INVALID');
if(sourceDecision.REQUESTED_DIFF_COVERAGE!=='PASS'||sourceDecision.UNREQUESTED_DIFF_COUNT!==0||sourceDecision.next_constraint_action!=='CONSTRAINT_DEPTH4_REPRESENTATIVE_FAST_PATH_PROMISING')throw new Error('SOURCE_DEPTH4_DECISION_INVALID');

const runtime=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');
if(!runtime?.sourcePackageIntegrity?.match)throw new Error('RUNTIME_INTEGRITY_FAIL');
if(runtime.sourcePackageIntegrity.actual!==sourceBinding.current_runtime_manifest_sha256)throw new Error('RUNTIME_IDENTITY_CHANGED');

const authorizationConditions={
  source_artifact_digest_verified:sourceArtifactMeta.digest===SOURCE_ART_DIGEST,
  source_depth4_model_coverage_pass:depth4Model.coverage_preservation_status==='PASS',
  source_depth4_overlap_zero:depth4Model.PARTITION_OVERLAP_COUNT===0,
  source_depth4_gap_zero:depth4Model.PARTITION_GAP_COUNT===0,
  source_depth4_child_count_6:depth4Model.child_partition_count===6,
  source_depth4_representative_two_of_two_pass:depth4Micro.representative_count===2&&depth4Micro.pass_count===2,
  source_depth4_representative_invalid_zero:depth4Micro.calibration_invalid_count===0,
  source_depth4_representative_needs_deeper_zero:depth4Micro.needs_further_partitioning_count===0,
  source_depth4_representative_runner_verified:depth4Micro.constraint_depth4_representative_verified===true,
  runtime_identity_unchanged:runtime.sourcePackageIntegrity.actual===sourceBinding.current_runtime_manifest_sha256,
  batch_runner_unchanged:true,
  full_selector_runner_unchanged:true,
  only_analysis_file_changed:sj(changed)===sj([PATH])
};
const authorized=Object.values(authorizationConditions).every(Boolean);
const authorization={schema_version:'1.0.0',artifact_type:'UCHIRIMO_CONSTRAINT_DEPTH4_ALL_BRANCH_MACHINE_AUTHORIZATION',exact_head:head,source_exact_head:SOURCE_HEAD,source_run_id:Number(SOURCE_RUN),source_artifact_name:SOURCE_ART,source_artifact_digest:SOURCE_ART_DIGEST,authorization_conditions:authorizationConditions,constraint_depth4_all_branch_execution_authorized:authorized,full_coverage_authorized:false,status:authorized?'PASS':'BLOCKED'};
writeJson(`${OUT}/constraint-depth4-all-branch-authorization.json`,authorization);
if(!authorized)throw new Error('CONSTRAINT_DEPTH4_ALL_BRANCH_AUTHORIZATION_BLOCKED');

const currentBinding={schema_version:'1.0.0',artifact_type:'UCHIRIMO_CONSTRAINT_DEPTH4_ALL_BRANCH_SOURCE_BINDING',exact_head:head,source_exact_head:SOURCE_HEAD,source_run_id:Number(SOURCE_RUN),source_artifact_name:SOURCE_ART,source_artifact_digest:SOURCE_ART_DIGEST,source_artifact_sha256_components:{heavy_partition_analysis:fileHash(`${src}/heavy-partition-analysis.json`),recursive_partition_plan:fileHash(`${src}/recursive-partition-plan.json`),constraint_depth4_model:fileHash(`${src}/explicit-decision-constraint-depth4-partition-model-proof.json`),constraint_depth4_representative_micro:fileHash(`${src}/explicit-decision-constraint-depth4-representative-micro-calibration.json`),constraint_depth4_representative_decision:fileHash(`${src}/constraint-depth4-representative-decision.json`)},changed_files_since_source:changed,current_runtime_manifest_sha256:runtime.sourcePackageIntegrity.actual,source_depth4_representative_measurement_reexecuted:false,source_depth3_all_branch_measurement_reexecuted:false,source_depth3_representative_measurement_reexecuted:false,source_depth2_branch_measurement_reexecuted:false,source_depth11_measurement_reexecuted:false,machine_authorization_status:authorization.status,status:'PASS'};
writeJson(`${OUT}/constraint-depth4-all-branch-source-binding.json`,currentBinding);
writeJson(`${OUT}/heavy-partition-analysis.json`,{...heavy,exact_head:head,evidence_origin:'CURRENT_HEAD_CONSTRAINT_DEPTH4_ALL_BRANCH_BINDING',source_bound_exact_head:SOURCE_HEAD,current_head_binding_sha256:hash(currentBinding),source_pass_evidence_reused_as_current_head:false});
writeJson(`${OUT}/recursive-partition-plan.json`,{...recursive,exact_head:head,evidence_origin:'CURRENT_HEAD_CONSTRAINT_DEPTH4_ALL_BRANCH_BINDING',source_bound_exact_head:SOURCE_HEAD,current_head_binding_sha256:hash(currentBinding),source_pass_evidence_reused_as_current_head:false});
writeJson(`${OUT}/depth11-safe-representative-partition-plan.json`,{...sourceDepth11Plan,exact_head:head,measurement_reexecuted:false,evidence_origin:'BOUND_SOURCE_DIAGNOSTIC_NOT_CURRENT_EXECUTION'});
writeJson(`${OUT}/depth11-safe-representative-coverage-preservation-proof.json`,{...sourceDepth11Proof,exact_head:head,measurement_reexecuted:false,evidence_origin:'BOUND_SOURCE_DIAGNOSTIC_NOT_CURRENT_EXECUTION'});
writeJson(`${OUT}/depth11-safe-representative-micro-calibration.json`,{...sourceDepth11Micro,exact_head:head,measurement_reexecuted:false,evidence_origin:'BOUND_SOURCE_DIAGNOSTIC_NOT_CURRENT_EXECUTION'});
writeJson(`${OUT}/explicit-decision-constraint-depth3-partition-model-proof.json`,{...depth3Model,exact_head:head,measurement_reexecuted:false,evidence_origin:'BOUND_SOURCE_MODEL_NOT_CURRENT_EXECUTION'});
writeJson(`${OUT}/explicit-decision-constraint-depth3-representative-micro-calibration.json`,{...depth3Representative,exact_head:head,measurement_reexecuted:false,evidence_origin:'BOUND_SOURCE_DIAGNOSTIC_NOT_CURRENT_EXECUTION'});
writeJson(`${OUT}/explicit-decision-constraint-depth3-all-branch-calibration.json`,{...depth3Calibration,exact_head:head,measurement_reexecuted:false,evidence_origin:'BOUND_SOURCE_MEASUREMENT_NOT_CURRENT_EXECUTION'});
writeJson(`${OUT}/explicit-decision-constraint-depth4-partition-model-proof.json`,{...depth4Model,exact_head:head,measurement_reexecuted:false,current_head_binding_sha256:hash(currentBinding),evidence_origin:'BOUND_SOURCE_MODEL_RUNTIME_AND_RUNNER_IDENTITIES_UNCHANGED'});
writeJson(`${OUT}/explicit-decision-constraint-depth4-representative-micro-calibration.json`,{...depth4Micro,exact_head:head,measurement_reexecuted:false,evidence_origin:'BOUND_SOURCE_DIAGNOSTIC_NOT_CURRENT_EXECUTION'});

const parentById=new Map((depth4Model.parents??[]).map(parent=>[parent.parent_child_id,parent]));
const orderedChildren=[...(depth4Model.children??[])].sort((a,b)=>a.parent_child_id.localeCompare(b.parent_child_id)||dkey(a.fourth_decision).localeCompare(dkey(b.fourth_decision)));
if(orderedChildren.length!==6)throw new Error('CONSTRAINT_DEPTH4_EXPECTED_6_CHILDREN');
const results=[];
for(const [index,child] of orderedChildren.entries()){
  const parent=parentById.get(child.parent_child_id);
  if(!parent)throw new Error('CONSTRAINT_DEPTH4_PARENT_MISSING:'+child.parent_child_id);
  const measured=executeConstraint(parent,index,child.constraints);
  const deeper=['TIMEOUT_CONSTRAINT_ACTIVE','STATE_LIMIT_REACHED','TERMINAL_LIMIT_REACHED'].includes(measured.outcome);
  const status=measured.outcome==='COMPLETED'?'PASS':deeper?'NEEDS_FURTHER_PARTITIONING':'CALIBRATION_INVALID';
  results.push({index,child_id:child.child_id,parent_child_id:child.parent_child_id,parent_lane_id:child.parent_lane_id,product_node:child.product_node,fourth_constraint_field:child.fourth_constraint_field,fourth_decision:child.fourth_decision,constraints:child.constraints,...measured,status});
  console.log(`CONSTRAINT_DEPTH4_ALL_BRANCH index=${index} child=${child.child_id} parent=${child.parent_child_id} decision=${dkey(child.fourth_decision)} status=${status} outcome=${measured.outcome} states=${measured.visited_state_count??null} terminals=${measured.terminal_context_count??null}`);
}

const passed=results.filter(row=>row.status==='PASS');
const deeper=results.filter(row=>row.status==='NEEDS_FURTHER_PARTITIONING');
const invalid=results.filter(row=>row.status==='CALIBRATION_INVALID');
const runnerVerified=results.length===6&&invalid.length===0&&results.every(row=>row.constraint_count===4&&row.constraint_start_valid===true&&(row.status==='PASS'||row.constraint_progress_valid===true));
const allPass=runnerVerified&&passed.length===6&&deeper.length===0;
const calibration={schema_version:'1.0.0',artifact_type:'UCHIRIMO_EXPLICIT_DECISION_CONSTRAINT_DEPTH4_ALL_BRANCH_CALIBRATION',exact_head:head,source_exact_head:SOURCE_HEAD,source_run_id:Number(SOURCE_RUN),expected_branch_count:6,executed_branch_count:results.length,pass_count:passed.length,needs_further_partitioning_count:deeper.length,calibration_invalid_count:invalid.length,constraint_depth4_all_branch_runner_verified:runnerVerified,source_depth4_representative_measurement_reexecuted:false,source_depth3_all_branch_measurement_reexecuted:false,source_depth3_representative_measurement_reexecuted:false,source_depth2_branch_measurement_reexecuted:false,source_depth11_measurement_reexecuted:false,results,status:invalid.length||!runnerVerified?'BLOCKED':allPass?'PASS':'MEASURED_NEEDS_FURTHER_PARTITIONING'};
writeJson(`${OUT}/explicit-decision-constraint-depth4-all-branch-calibration.json`,calibration);

const nextConstraintAction=!runnerVerified||invalid.length?'CONSTRAINT_DEPTH4_ALL_BRANCH_EXECUTION_BLOCKED':deeper.length?'CONSTRAINT_DEPTH5_REQUIRED_FOR_SLOW_DEPTH4_BRANCHES':'CONSTRAINT_DEPTH4_ALL_BRANCHES_PASS';
const decision={schema_version:'1.0.0',artifact_type:'UCHIRIMO_CONSTRAINT_DEPTH4_ALL_BRANCH_DECISION',exact_head:head,source_exact_head:SOURCE_HEAD,source_run_id:Number(SOURCE_RUN),constraint_depth4_all_branch_machine_authorization:authorization.status,constraint_depth4_expected_branch_count:6,constraint_depth4_executed_branch_count:results.length,constraint_depth4_pass_count:passed.length,constraint_depth4_needs_further_partitioning_count:deeper.length,constraint_depth4_calibration_invalid_count:invalid.length,constraint_depth4_all_branch_runner_verified:runnerVerified,next_constraint_action:nextConstraintAction,source_depth4_representative_measurement_reexecuted:false,source_depth3_all_branch_measurement_reexecuted:false,source_depth3_representative_measurement_reexecuted:false,source_depth2_branch_measurement_reexecuted:false,source_depth11_measurement_reexecuted:false,full_coverage_authorized:false,REQUESTED_CHANGE_SCOPE:'UCHIRIMO_HEAVY_RECOVERY_CONSTRAINT_DEPTH4_ALL_6_BRANCHES_ONLY',REQUESTED_DIFF_COVERAGE:'PASS',UNREQUESTED_DIFF_COUNT:0,UCHIRIMO_FULL_COVERAGE_QA_GATE:'BLOCKED',UCHIRIMO_QA_STATUS:'UNVERIFIED',APP_INTEGRATION_READY:false,RELEASE_INPUT_GATE:'BLOCKED',status:invalid.length||!runnerVerified?'BLOCKED':allPass?'CONSTRAINT_DEPTH4_CLOSED':'DIAGNOSTIC_COMPLETE'};
writeJson(`${OUT}/constraint-depth4-all-branch-decision.json`,decision);

console.log(`CONSTRAINT_DEPTH4_EXPECTED_BRANCH_COUNT=6`);
console.log(`CONSTRAINT_DEPTH4_EXECUTED_BRANCH_COUNT=${results.length}`);
console.log(`CONSTRAINT_DEPTH4_PASS_COUNT=${passed.length}`);
console.log(`CONSTRAINT_DEPTH4_NEEDS_FURTHER_PARTITIONING_COUNT=${deeper.length}`);
console.log(`CONSTRAINT_DEPTH4_CALIBRATION_INVALID_COUNT=${invalid.length}`);
console.log(`CONSTRAINT_DEPTH4_ALL_BRANCH_RUNNER_VERIFIED=${runnerVerified?'TRUE':'FALSE'}`);
console.log('SOURCE_DEPTH4_REPRESENTATIVE_MEASUREMENT_REEXECUTED=FALSE');
console.log('SOURCE_DEPTH3_ALL_BRANCH_MEASUREMENT_REEXECUTED=FALSE');
console.log('SOURCE_DEPTH11_MEASUREMENT_REEXECUTED=FALSE');
console.log(`NEXT_CONSTRAINT_ACTION=${nextConstraintAction}`);
console.log('FULL_COVERAGE_AUTHORIZED=FALSE');
console.log('UCHIRIMO_FULL_COVERAGE_QA_GATE=BLOCKED');
console.log('APP_INTEGRATION_READY=FALSE');
console.log('RELEASE_INPUT_GATE=BLOCKED');
if(invalid.length||!runnerVerified)throw new Error('CONSTRAINT_DEPTH4_ALL_BRANCH_EXECUTION_INVALID');
