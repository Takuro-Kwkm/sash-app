import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { resolveRuntimeAppProduct } from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { currentExactHead, writeJson } from './governance-lib.mjs';

const PID='SER-YKKAP-UCHIRIMO';
const SOURCE_RUN='35996224781';
const SOURCE_HEAD='f6eae0bc58ed2571171f602cd7db688565dded3a';
const SOURCE_ART=`uchirimo-heavy-recovery-analysis-${SOURCE_HEAD}`;
const SOURCE_ART_DIGEST='sha256:32972dfdccc8c357af38e1806ff3b90d0d2c1b0860d5563221c99a73d1d3d4f9';
const SOURCE_ANALYSIS_BLOB='d27fe242f41f168c4d7d4a7c96c59be175b981de';
const SOURCE_BATCH_BLOB='65a57854ab7adf45fa0486b465530686d76cb09f';
const SOURCE_FULL_BLOB='94a86542cace253dc45e7b1f8589f98b837a4cce';
const PATH='scripts/governance/uchirimo-heavy-partition-analysis.mjs';
const BATCH='scripts/governance/uchirimo-selector-batch-runner.mjs';
const FULL='scripts/uchirimo-full-selector-proof.mjs';
const OUT=String(process.env.UCHIRIMO_HEAVY_ANALYSIS_OUT??'artifacts/uchirimo-heavy-recovery');
const TIMEOUT=Number(process.env.UCHIRIMO_CONSTRAINT_DEPTH3_ALL_BRANCH_TIMEOUT_MS??60000);
const REPO=String(process.env.GITHUB_REPOSITORY??'Takuro-Kwkm/sash-app');
const head=currentExactHead();
if(!Number.isFinite(TIMEOUT)||TIMEOUT<60000)throw new Error('CONSTRAINT_DEPTH3_ALL_BRANCH_TIMEOUT_INVALID');
mkdirSync(OUT,{recursive:true});

const stable=(v)=>Array.isArray(v)?v.map(stable):(!v||typeof v!=='object')?v:Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,stable(x)]));
const sj=(v)=>JSON.stringify(stable(v));
const hash=(v)=>createHash('sha256').update(typeof v==='string'?v:sj(v)).digest('hex');
const fileHash=(p)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const read=(p)=>JSON.parse(readFileSync(p,'utf8'));
const safeRead=(p)=>{try{return read(p)}catch{return null}};
const same=(a,b)=>Array.isArray(b)?Array.isArray(a)&&sj(a.map(String).sort())===sj(b.map(String).sort()):Object.is(a,b)||String(a)===String(b);
const present=(v)=>v!==undefined&&v!==null&&v!==''&&(!Array.isArray(v)||v.length>0);
const enabled=(f)=>[...new Map((f?.values??[]).filter(x=>x.disabled!==true).map(x=>[sj(x.value),x.value])).values()];
const normalizeMulti=(rows)=>[...new Map(rows.map(v=>[String(v),v])).values()].sort((a,b)=>String(a).localeCompare(String(b)));
const prefixPreserved=(result,prefix)=>Object.entries(prefix).every(([k,v])=>same(result.selection?.[k],v));
const dkey=(d)=>d.kind==='UNSET'?'UNSET':`VALUE:${sj(d.value)}`;

function decisionDomain(field){
  const values=enabled(field);
  if(field.dataType==='MULTI_ENUM'){
    if(values.length>12)throw new Error('MULTI_ENUM_SYMBOLIC_REQUIRED:'+field.key);
    const out=[];
    if(field.required!==true)out.push({kind:'UNSET'});
    for(let mask=1;mask<2**values.length;mask+=1){
      const subset=[];
      for(let i=0;i<values.length;i+=1)if(mask&(1<<i))subset.push(values[i]);
      out.push({kind:'VALUE',value:normalizeMulti(subset)});
    }
    return out;
  }
  const out=values.map(v=>({kind:'VALUE',value:stable(v)}));
  if(field.required!==true)out.unshift({kind:'UNSET'});
  return out;
}

function applyDecision(selection,key,decision){
  const next={...(selection??{})};
  if(decision.kind==='UNSET')delete next[key];
  else next[key]=decision.value;
  return next;
}

function survives(result,key,decision){
  const field=(result.fields??[]).find(x=>x.key===key)??null;
  if(!field)return false;
  if(decision.kind==='UNSET')return field.required!==true&&!present(result.selection?.[key]);
  return same(result.selection?.[key],decision.value);
}

async function applyConstraints(prefix,constraints){
  let result=await resolveRuntimeAppProduct(PID,prefix);
  if(!prefixPreserved(result,prefix))throw new Error('CONSTRAINT_DEPTH3_PREFIX_REJECTED');
  for(const constraint of constraints){
    result=await resolveRuntimeAppProduct(PID,applyDecision(result.selection??prefix,constraint.field_key,constraint.decision));
    if(!survives(result,constraint.field_key,constraint.decision))throw new Error('CONSTRAINT_DEPTH3_CONSTRAINT_NOT_PRESERVED:'+constraint.field_key);
    if(!prefixPreserved(result,prefix))throw new Error('CONSTRAINT_DEPTH3_CONSTRAINT_CLEARED_PREFIX:'+constraint.field_key);
  }
  return result;
}

function constraintRow(parent,index,constraints){
  const s=parent.selector_prefix??{};
  const base=new Set(['room_specification','window_type','glass_family','sash_configuration','size_class']);
  return {
    shard:0,
    node_id:parent.product_node,
    partition_key:`${parent.parent_child_id}|constraint-depth3-all-branch-${index}`,
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
  const id=`constraint-depth3-all-branch-${String(index).padStart(2,'0')}`;
  const dir=`${OUT}/constraint-depth3-all-branches/case-${String(index).padStart(2,'0')}`;
  mkdirSync(dir,{recursive:true});
  let executionError=null;
  try{
    execFileSync(process.execPath,[BATCH],{
      env:{
        ...process.env,
        HEAD_SHA:head,
        UCHIRIMO_SELECTOR_BATCH_ID:id,
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
  return {
    outcome,
    elapsed_ms:elapsed,
    timed_out:timedOut,
    runner_path:br?.runner??null,
    constraint_count:br?.constraint_count??null,
    constraint_start_valid:startOk,
    constraint_progress_valid:progressOk,
    visited_state_count:report?.visited_state_count??progress?.visited_state_count??null,
    terminal_context_count:report?.terminal_context_count??progress?.terminal_context_count??null,
    transition_check_count:report?.transition_check_count??progress?.transition_check_count??null,
    constraint_rejection_count:report?.constraint_rejection_count??progress?.constraint_rejection_count??null,
    failure_message:message||null,
    execution_error:executionError
  };
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
const sourceBinding=read(`${src}/constraint-depth3-representative-source-binding.json`);
const sourceModel=read(`${src}/explicit-decision-constraint-depth3-partition-model-proof.json`);
const sourceMicro=read(`${src}/explicit-decision-constraint-depth3-representative-micro-calibration.json`);
const sourceDecision=read(`${src}/constraint-depth3-representative-decision.json`);
const sourceDepth11Plan=read(`${src}/depth11-safe-representative-partition-plan.json`);
const sourceDepth11Proof=read(`${src}/depth11-safe-representative-coverage-preservation-proof.json`);
const sourceDepth11Micro=read(`${src}/depth11-safe-representative-micro-calibration.json`);
for(const artifact of [heavy,recursive,sourceBinding,sourceModel,sourceMicro,sourceDecision,sourceDepth11Plan,sourceDepth11Proof,sourceDepth11Micro])if(artifact.exact_head!==SOURCE_HEAD)throw new Error('SOURCE_HEAD_MISMATCH');
if(heavy.task_classification!=='NON-PRODUCT-MASTER'||heavy.product_master_mutation!==0||heavy.deferred_scope_status!=='DEFERRED_UNVERIFIED')throw new Error('SOURCE_CLASSIFICATION_INVALID');
if(recursive.status!=='PLAN_READY'||recursive.PARTITION_OVERLAP_COUNT!==0||recursive.PARTITION_GAP_COUNT!==0)throw new Error('SOURCE_RECURSIVE_PLAN_INVALID');
if(sourceBinding.status!=='PASS'||sourceBinding.current_runtime_manifest_sha256==null||sourceBinding.batch_runner_unchanged!==true||sourceBinding.full_selector_runner_unchanged!==true)throw new Error('SOURCE_BINDING_INVALID');
if(sourceModel.status!=='PASS'||sourceModel.coverage_preservation_status!=='PASS'||sourceModel.parent_partition_count!==2||sourceModel.child_partition_count!==12||sourceModel.PARTITION_OVERLAP_COUNT!==0||sourceModel.PARTITION_GAP_COUNT!==0)throw new Error('SOURCE_DEPTH3_MODEL_INVALID');
if(sourceMicro.representative_count!==2||sourceMicro.pass_count!==2||sourceMicro.needs_further_partitioning_count!==0||sourceMicro.calibration_invalid_count!==0||sourceMicro.constraint_depth3_representative_verified!==true)throw new Error('SOURCE_DEPTH3_REPRESENTATIVE_INVALID');
if(sourceDecision.REQUESTED_DIFF_COVERAGE!=='PASS'||sourceDecision.UNREQUESTED_DIFF_COUNT!==0||sourceDecision.next_constraint_action!=='CONSTRAINT_DEPTH3_REPRESENTATIVE_FAST_PATH_PROMISING')throw new Error('SOURCE_DEPTH3_DECISION_INVALID');
if(sourceDecision.next_safe_lane_action!=='SAFE_REQUIRED_ENUM_FRONTIER_EXHAUSTED_AFTER_DEPTH11')throw new Error('SOURCE_SAFE_LANE_DECISION_INVALID');

const runtime=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');
if(!runtime?.sourcePackageIntegrity?.match)throw new Error('RUNTIME_INTEGRITY_FAIL');
if(runtime.sourcePackageIntegrity.actual!==sourceBinding.current_runtime_manifest_sha256)throw new Error('RUNTIME_IDENTITY_CHANGED');

const sourceChildrenByParent=new Map();
for(const child of sourceModel.children??[]){
  const rows=sourceChildrenByParent.get(child.parent_child_id)??[];
  rows.push(child);
  sourceChildrenByParent.set(child.parent_child_id,rows);
}
const parentRevalidations=[];
let currentChildCount=0;
for(const parent of sourceModel.parents??[]){
  const constrained=await applyConstraints(parent.selector_prefix,parent.source_constraints);
  const field=(constrained.fields??[]).find(row=>row.key===parent.third_constraint_field)??null;
  if(!field)throw new Error('CURRENT_DEPTH3_FIELD_MISSING:'+parent.parent_child_id);
  if(field.dataType!==parent.third_constraint_data_type)throw new Error('CURRENT_DEPTH3_FIELD_TYPE_CHANGED:'+parent.parent_child_id);
  const sourceChildren=(sourceChildrenByParent.get(parent.parent_child_id)??[]).sort((a,b)=>dkey(a.third_decision).localeCompare(dkey(b.third_decision)));
  const sourceByDecision=new Map(sourceChildren.map(child=>[dkey(child.third_decision),child]));
  const currentReachable=[];
  const currentRejected=[];
  for(const decision of decisionDomain(field)){
    const child=await resolveRuntimeAppProduct(PID,applyDecision(constrained.selection??parent.selector_prefix,parent.third_constraint_field,decision));
    const sourceConstraintsOk=parent.source_constraints.every(constraint=>survives(child,constraint.field_key,constraint.decision));
    const thirdOk=survives(child,parent.third_constraint_field,decision);
    const prefixOk=prefixPreserved(child,parent.selector_prefix);
    if(sourceConstraintsOk&&thirdOk&&prefixOk){
      currentReachable.push({decision:stable(decision),decision_key:dkey(decision),selection_fingerprint:hash(stable(child.selection??{}))});
    }else{
      currentRejected.push({decision:stable(decision),reason:!sourceConstraintsOk?'SOURCE_CONSTRAINT_CLEARED':!thirdOk?'THIRD_DECISION_REJECTED_OR_CLEARED':'PREFIX_CLEARED'});
    }
  }
  const sourceKeys=sourceChildren.map(child=>dkey(child.third_decision)).sort();
  const currentKeys=currentReachable.map(row=>row.decision_key).sort();
  if(sj(sourceKeys)!==sj(currentKeys))throw new Error('CURRENT_DEPTH3_REACHABLE_SET_CHANGED:'+parent.parent_child_id);
  if(currentReachable.length!==parent.reachable_branch_count||currentRejected.length!==parent.rejected_branch_count)throw new Error('CURRENT_DEPTH3_BRANCH_CARDINALITY_CHANGED:'+parent.parent_child_id);
  for(const row of currentReachable){
    const sourceChild=sourceByDecision.get(row.decision_key);
    if(!sourceChild)throw new Error('CURRENT_DEPTH3_SOURCE_CHILD_MISSING:'+row.decision_key);
    if(sourceChild.selection_fingerprint!==row.selection_fingerprint)throw new Error('CURRENT_DEPTH3_SELECTION_FINGERPRINT_CHANGED:'+sourceChild.child_id);
  }
  currentChildCount+=currentReachable.length;
  parentRevalidations.push({
    parent_child_id:parent.parent_child_id,
    parent_lane_id:parent.parent_lane_id,
    product_node:parent.product_node,
    third_constraint_field:parent.third_constraint_field,
    source_branch_count:sourceChildren.length,
    current_reachable_branch_count:currentReachable.length,
    current_rejected_branch_count:currentRejected.length,
    source_decision_keys:sourceKeys,
    current_decision_keys:currentKeys,
    status:'PASS'
  });
}
const currentModelPass=parentRevalidations.length===2&&currentChildCount===12;
const modelRevalidation={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_CONSTRAINT_DEPTH3_CURRENT_HEAD_MODEL_REVALIDATION',
  exact_head:head,
  source_exact_head:SOURCE_HEAD,
  source_run_id:Number(SOURCE_RUN),
  source_artifact_name:SOURCE_ART,
  source_artifact_digest:SOURCE_ART_DIGEST,
  source_model_sha256:fileHash(`${src}/explicit-decision-constraint-depth3-partition-model-proof.json`),
  current_runtime_manifest_sha256:runtime.sourcePackageIntegrity.actual,
  source_parent_count:sourceModel.parent_partition_count,
  source_child_count:sourceModel.child_partition_count,
  current_parent_count:parentRevalidations.length,
  current_child_count:currentChildCount,
  source_partition_overlap_count:sourceModel.PARTITION_OVERLAP_COUNT,
  source_partition_gap_count:sourceModel.PARTITION_GAP_COUNT,
  source_representative_pass_count:sourceMicro.pass_count,
  source_representative_invalid_count:sourceMicro.calibration_invalid_count,
  parents:parentRevalidations,
  source_depth3_branch_measurement_reexecuted:false,
  source_depth2_branch_measurement_reexecuted:false,
  source_depth11_measurement_reexecuted:false,
  status:currentModelPass?'PASS':'BLOCKED'
};
writeJson(`${OUT}/constraint-depth3-current-head-model-revalidation.json`,modelRevalidation);
if(!currentModelPass)throw new Error('CURRENT_DEPTH3_MODEL_REVALIDATION_FAIL');

const authorizationConditions={
  source_artifact_digest_verified:sourceArtifactMeta.digest===SOURCE_ART_DIGEST,
  source_model_coverage_pass:sourceModel.coverage_preservation_status==='PASS',
  source_model_overlap_zero:sourceModel.PARTITION_OVERLAP_COUNT===0,
  source_model_gap_zero:sourceModel.PARTITION_GAP_COUNT===0,
  source_model_child_count_12:sourceModel.child_partition_count===12,
  source_representative_two_of_two_pass:sourceMicro.representative_count===2&&sourceMicro.pass_count===2,
  source_representative_invalid_zero:sourceMicro.calibration_invalid_count===0,
  source_representative_needs_deeper_zero:sourceMicro.needs_further_partitioning_count===0,
  source_representative_runner_verified:sourceMicro.constraint_depth3_representative_verified===true,
  current_head_model_revalidation_pass:modelRevalidation.status==='PASS',
  runtime_identity_unchanged:runtime.sourcePackageIntegrity.actual===sourceBinding.current_runtime_manifest_sha256,
  batch_runner_unchanged:true,
  full_selector_runner_unchanged:true,
  only_analysis_file_changed:sj(changed)===sj([PATH])
};
const authorized=Object.values(authorizationConditions).every(Boolean);
const authorization={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_CONSTRAINT_DEPTH3_ALL_BRANCH_MACHINE_AUTHORIZATION',
  exact_head:head,
  source_exact_head:SOURCE_HEAD,
  source_run_id:Number(SOURCE_RUN),
  source_artifact_name:SOURCE_ART,
  source_artifact_digest:SOURCE_ART_DIGEST,
  authorization_conditions:authorizationConditions,
  constraint_depth3_all_branch_execution_authorized:authorized,
  full_depth11_execution_authorized:false,
  full_coverage_authorized:false,
  status:authorized?'PASS':'BLOCKED'
};
writeJson(`${OUT}/constraint-depth3-all-branch-authorization.json`,authorization);
if(!authorized)throw new Error('CONSTRAINT_DEPTH3_ALL_BRANCH_AUTHORIZATION_BLOCKED');

const currentBinding={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_CONSTRAINT_DEPTH3_ALL_BRANCH_SOURCE_BINDING',
  exact_head:head,
  source_exact_head:SOURCE_HEAD,
  source_run_id:Number(SOURCE_RUN),
  source_artifact_name:SOURCE_ART,
  source_artifact_digest:SOURCE_ART_DIGEST,
  source_artifact_sha256_components:{
    heavy_partition_analysis:fileHash(`${src}/heavy-partition-analysis.json`),
    recursive_partition_plan:fileHash(`${src}/recursive-partition-plan.json`),
    constraint_depth3_model:fileHash(`${src}/explicit-decision-constraint-depth3-partition-model-proof.json`),
    constraint_depth3_representative_micro:fileHash(`${src}/explicit-decision-constraint-depth3-representative-micro-calibration.json`),
    constraint_depth3_representative_decision:fileHash(`${src}/constraint-depth3-representative-decision.json`)
  },
  changed_files_since_source:changed,
  current_runtime_manifest_sha256:runtime.sourcePackageIntegrity.actual,
  source_depth3_branch_measurement_reexecuted:false,
  source_depth2_branch_measurement_reexecuted:false,
  source_depth11_measurement_reexecuted:false,
  current_head_model_revalidation_status:modelRevalidation.status,
  machine_authorization_status:authorization.status,
  status:'PASS'
};
writeJson(`${OUT}/constraint-depth3-all-branch-source-binding.json`,currentBinding);
writeJson(`${OUT}/heavy-partition-analysis.json`,{...heavy,exact_head:head,evidence_origin:'CURRENT_HEAD_CONSTRAINT_DEPTH3_ALL_BRANCH_BINDING',source_bound_exact_head:SOURCE_HEAD,current_head_binding_sha256:hash(currentBinding),source_pass_evidence_reused_as_current_head:false});
writeJson(`${OUT}/recursive-partition-plan.json`,{...recursive,exact_head:head,evidence_origin:'CURRENT_HEAD_CONSTRAINT_DEPTH3_ALL_BRANCH_BINDING',source_bound_exact_head:SOURCE_HEAD,current_head_binding_sha256:hash(currentBinding),source_pass_evidence_reused_as_current_head:false});
writeJson(`${OUT}/depth11-safe-representative-partition-plan.json`,{...sourceDepth11Plan,exact_head:head,measurement_reexecuted:false,evidence_origin:'BOUND_SOURCE_DIAGNOSTIC_NOT_CURRENT_EXECUTION'});
writeJson(`${OUT}/depth11-safe-representative-coverage-preservation-proof.json`,{...sourceDepth11Proof,exact_head:head,measurement_reexecuted:false,evidence_origin:'BOUND_SOURCE_DIAGNOSTIC_NOT_CURRENT_EXECUTION'});
writeJson(`${OUT}/depth11-safe-representative-micro-calibration.json`,{...sourceDepth11Micro,exact_head:head,measurement_reexecuted:false,evidence_origin:'BOUND_SOURCE_DIAGNOSTIC_NOT_CURRENT_EXECUTION'});
writeJson(`${OUT}/explicit-decision-constraint-depth3-partition-model-proof.json`,{...sourceModel,exact_head:head,measurement_reexecuted:false,current_head_model_revalidation_sha256:hash(modelRevalidation),evidence_origin:'BOUND_SOURCE_MODEL_REVALIDATED_CURRENT_HEAD'});
writeJson(`${OUT}/explicit-decision-constraint-depth3-representative-micro-calibration.json`,{...sourceMicro,exact_head:head,measurement_reexecuted:false,evidence_origin:'BOUND_SOURCE_DIAGNOSTIC_NOT_CURRENT_EXECUTION'});

const parentById=new Map((sourceModel.parents??[]).map(parent=>[parent.parent_child_id,parent]));
const orderedChildren=[...(sourceModel.children??[])].sort((a,b)=>a.parent_child_id.localeCompare(b.parent_child_id)||dkey(a.third_decision).localeCompare(dkey(b.third_decision)));
if(orderedChildren.length!==12)throw new Error('CONSTRAINT_DEPTH3_EXPECTED_12_CHILDREN');
const results=[];
for(const [index,child] of orderedChildren.entries()){
  const parent=parentById.get(child.parent_child_id);
  if(!parent)throw new Error('CONSTRAINT_DEPTH3_PARENT_MISSING:'+child.parent_child_id);
  const measured=executeConstraint(parent,index,child.constraints);
  const deeper=['TIMEOUT_CONSTRAINT_ACTIVE','STATE_LIMIT_REACHED','TERMINAL_LIMIT_REACHED'].includes(measured.outcome);
  const status=measured.outcome==='COMPLETED'?'PASS':deeper?'NEEDS_FURTHER_PARTITIONING':'CALIBRATION_INVALID';
  const result={
    index,
    child_id:child.child_id,
    parent_child_id:child.parent_child_id,
    parent_lane_id:child.parent_lane_id,
    product_node:child.product_node,
    third_constraint_field:child.third_constraint_field,
    third_decision:child.third_decision,
    constraints:child.constraints,
    ...measured,
    status
  };
  results.push(result);
  console.log(`CONSTRAINT_DEPTH3_ALL_BRANCH index=${index} child=${child.child_id} parent=${child.parent_child_id} decision=${dkey(child.third_decision)} status=${status} outcome=${measured.outcome} states=${measured.visited_state_count??null} terminals=${measured.terminal_context_count??null}`);
}

const passed=results.filter(row=>row.status==='PASS');
const deeper=results.filter(row=>row.status==='NEEDS_FURTHER_PARTITIONING');
const invalid=results.filter(row=>row.status==='CALIBRATION_INVALID');
const executed=results.length;
const runnerVerified=executed===12&&invalid.length===0&&results.every(row=>row.constraint_count===3&&row.constraint_start_valid===true&&(row.status==='PASS'||row.constraint_progress_valid===true));
const allPass=runnerVerified&&passed.length===12&&deeper.length===0;
const calibration={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_EXPLICIT_DECISION_CONSTRAINT_DEPTH3_ALL_BRANCH_CALIBRATION',
  exact_head:head,
  source_exact_head:SOURCE_HEAD,
  source_run_id:Number(SOURCE_RUN),
  expected_branch_count:12,
  executed_branch_count:executed,
  pass_count:passed.length,
  needs_further_partitioning_count:deeper.length,
  calibration_invalid_count:invalid.length,
  constraint_depth3_all_branch_runner_verified:runnerVerified,
  source_depth3_branch_measurement_reexecuted:false,
  source_depth2_branch_measurement_reexecuted:false,
  source_depth11_measurement_reexecuted:false,
  results,
  status:invalid.length||!runnerVerified?'BLOCKED':allPass?'PASS':'MEASURED_NEEDS_FURTHER_PARTITIONING'
};
writeJson(`${OUT}/explicit-decision-constraint-depth3-all-branch-calibration.json`,calibration);

const nextConstraintAction=!runnerVerified||invalid.length?'CONSTRAINT_DEPTH3_ALL_BRANCH_EXECUTION_BLOCKED':deeper.length?'CONSTRAINT_DEPTH4_REQUIRED_FOR_SLOW_DEPTH3_BRANCHES':'CONSTRAINT_DEPTH3_ALL_BRANCHES_PASS';
const decision={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_CONSTRAINT_DEPTH3_ALL_BRANCH_DECISION',
  exact_head:head,
  source_exact_head:SOURCE_HEAD,
  source_run_id:Number(SOURCE_RUN),
  constraint_depth3_current_head_model_revalidation:modelRevalidation.status,
  constraint_depth3_all_branch_machine_authorization:authorization.status,
  constraint_depth3_expected_branch_count:12,
  constraint_depth3_executed_branch_count:executed,
  constraint_depth3_pass_count:passed.length,
  constraint_depth3_needs_further_partitioning_count:deeper.length,
  constraint_depth3_calibration_invalid_count:invalid.length,
  constraint_depth3_all_branch_runner_verified:runnerVerified,
  next_constraint_action:nextConstraintAction,
  next_safe_lane_action:sourceDecision.next_safe_lane_action,
  source_depth3_branch_measurement_reexecuted:false,
  source_depth2_branch_measurement_reexecuted:false,
  source_depth11_measurement_reexecuted:false,
  full_depth11_execution_authorized:false,
  full_coverage_authorized:false,
  REQUESTED_CHANGE_SCOPE:'UCHIRIMO_HEAVY_RECOVERY_CONSTRAINT_DEPTH3_ALL_12_BRANCHES_ONLY',
  REQUESTED_DIFF_COVERAGE:'PASS',
  UNREQUESTED_DIFF_COUNT:0,
  UCHIRIMO_FULL_COVERAGE_QA_GATE:'BLOCKED',
  UCHIRIMO_QA_STATUS:'UNVERIFIED',
  APP_INTEGRATION_READY:false,
  RELEASE_INPUT_GATE:'BLOCKED',
  status:invalid.length||!runnerVerified?'BLOCKED':allPass?'CONSTRAINT_DEPTH3_CLOSED':'DIAGNOSTIC_COMPLETE'
};
writeJson(`${OUT}/constraint-depth3-all-branch-decision.json`,decision);

console.log(`CONSTRAINT_DEPTH3_CURRENT_HEAD_MODEL_REVALIDATION=${modelRevalidation.status}`);
console.log(`CONSTRAINT_DEPTH3_ALL_BRANCH_MACHINE_AUTHORIZATION=${authorization.status}`);
console.log(`CONSTRAINT_DEPTH3_EXPECTED_BRANCH_COUNT=12`);
console.log(`CONSTRAINT_DEPTH3_EXECUTED_BRANCH_COUNT=${executed}`);
console.log(`CONSTRAINT_DEPTH3_PASS_COUNT=${passed.length}`);
console.log(`CONSTRAINT_DEPTH3_NEEDS_FURTHER_PARTITIONING_COUNT=${deeper.length}`);
console.log(`CONSTRAINT_DEPTH3_CALIBRATION_INVALID_COUNT=${invalid.length}`);
console.log(`CONSTRAINT_DEPTH3_ALL_BRANCH_RUNNER_VERIFIED=${runnerVerified?'TRUE':'FALSE'}`);
console.log('SOURCE_DEPTH3_BRANCH_MEASUREMENT_REEXECUTED=FALSE');
console.log('SOURCE_DEPTH2_BRANCH_MEASUREMENT_REEXECUTED=FALSE');
console.log('SOURCE_DEPTH11_MEASUREMENT_REEXECUTED=FALSE');
console.log(`NEXT_CONSTRAINT_ACTION=${nextConstraintAction}`);
console.log(`NEXT_SAFE_LANE_ACTION=${sourceDecision.next_safe_lane_action}`);
console.log('FULL_DEPTH11_EXECUTION_AUTHORIZED=FALSE');
console.log('FULL_COVERAGE_AUTHORIZED=FALSE');
console.log('UCHIRIMO_FULL_COVERAGE_QA_GATE=BLOCKED');
console.log('APP_INTEGRATION_READY=FALSE');
console.log('RELEASE_INPUT_GATE=BLOCKED');
if(invalid.length||!runnerVerified)throw new Error('CONSTRAINT_DEPTH3_ALL_BRANCH_EXECUTION_INVALID');
