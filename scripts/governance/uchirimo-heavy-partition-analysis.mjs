import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolveRuntimeAppProduct } from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { currentExactHead, writeJson } from './governance-lib.mjs';

const PID='SER-YKKAP-UCHIRIMO';
const SOURCE_RUN='35987594269';
const SOURCE_HEAD='96464df6b1848c936afc305ad708f8a4d82eaab8';
const SOURCE_ANALYSIS_BLOB='6dddc4a44ab5d5783549cfef1434d0c10ef2e5e9';
const SOURCE_BATCH_BLOB='435a48d054d74798f61368234bc6775cdaa0c770';
const SOURCE_FULL_BLOB='94a86542cace253dc45e7b1f8589f98b837a4cce';
const SOURCE_ART=`uchirimo-heavy-recovery-analysis-${SOURCE_HEAD}`;
const SOURCE_HARD_REL='source-run-35985579293/explicit-decision-constraint-model-hard-proof.json';
const SOURCE_MODEL_REL='source-run-35985579293/source-run-35982709102/explicit-decision-constraint-partition-model-proof.json';
const PATH='scripts/governance/uchirimo-heavy-partition-analysis.mjs';
const BATCH_RUNNER_PATH='scripts/governance/uchirimo-selector-batch-runner.mjs';
const FULL_RUNNER_PATH='scripts/uchirimo-full-selector-proof.mjs';
const OUT=String(process.env.UCHIRIMO_HEAVY_ANALYSIS_OUT??'artifacts/uchirimo-heavy-recovery');
const CONSTRAINT_TIMEOUT=Number(process.env.UCHIRIMO_CONSTRAINT_MICRO_TIMEOUT_MS??60000);
const MAXS=1000000;
const MAXT=1000000;
const MAX_CACHE=512;
const CONT=new Set(['size_w','size_h','frame_projection','fukashi_dimension','custom_w','custom_h','custom_width','custom_height']);
const TECH=new Set(['legacyConstruction','legacyConfiguration','internal_construction']);
const head=currentExactHead();
if(!Number.isFinite(CONSTRAINT_TIMEOUT)||CONSTRAINT_TIMEOUT<60000)throw new Error('CONSTRAINT_TIMEOUT_INVALID');
mkdirSync(OUT,{recursive:true});

const stable=(value)=>Array.isArray(value)
  ? value.map(stable)
  : (!value||typeof value!=='object')
    ? value
    : Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>[key,stable(v)]));
const sj=(value)=>JSON.stringify(stable(value));
const hash=(value)=>createHash('sha256').update(typeof value==='string'?value:sj(value)).digest('hex');
const same=(a,b)=>Array.isArray(b)
  ? Array.isArray(a)&&sj(a.map(String).sort())===sj(b.map(String).sort())
  : Object.is(a,b)||String(a)===String(b);
const present=(value)=>value!==undefined&&value!==null&&value!==''&&(!Array.isArray(value)||value.length>0);
const read=(path)=>JSON.parse(readFileSync(path,'utf8'));
const enabled=(field)=>[...new Map((field?.values??[]).filter((row)=>row.disabled!==true).map((row)=>[sj(row.value),row.value])).values()];
const normalizeMulti=(rows)=>[...new Map(rows.map((value)=>[String(value),value])).values()].sort((a,b)=>String(a).localeCompare(String(b)));

function decisionBranches(field){
  const values=enabled(field);
  if(field.dataType==='MULTI_ENUM'){
    if(values.length>12)throw new Error(`CONSTRAINT_MULTI_ENUM_SYMBOLIC_REQUIRED:${field.key}:${values.length}`);
    const out=[];
    if(field.required!==true)out.push({kind:'UNSET'});
    const total=2**values.length;
    for(let mask=1;mask<total;mask+=1){
      const subset=[];
      for(let index=0;index<values.length;index+=1)if(mask&(1<<index))subset.push(values[index]);
      out.push({kind:'VALUE',value:normalizeMulti(subset)});
    }
    return out;
  }
  const out=values.map((value)=>({kind:'VALUE',value:stable(value)}));
  if(field.required!==true)out.unshift({kind:'UNSET'});
  return out;
}

function applyDecision(selection,key,decision){
  const next={...(selection??{})};
  if(decision.kind==='UNSET')delete next[key];
  else next[key]=decision.value;
  return next;
}

function branchSurvives(result,key,decision,{constraint=false}={}){
  const field=(result.fields??[]).find((candidate)=>candidate.key===key)??null;
  if(!field)return constraint?false:true;
  if(decision.kind==='UNSET')return field.required!==true&&!present(result.selection?.[key]);
  return same(result.selection?.[key],decision.value);
}

async function measureConstraintLane(lane){
  const startedAt=Date.now();
  const deadline=startedAt+CONSTRAINT_TIMEOUT;
  const prefix=stable(lane.selector_prefix??{});
  const key=String(lane.selected_constraint_field??'');
  const constraint={field_key:key,decision:{kind:'UNSET'}};
  const resolverCache=new Map();
  let cacheHits=0;
  let cacheMisses=0;
  const resolveCached=async(selection)=>{
    const cacheKey=hash(selection??{});
    if(resolverCache.has(cacheKey)){cacheHits+=1;return resolverCache.get(cacheKey);}
    const result=await resolveRuntimeAppProduct(PID,selection);
    resolverCache.set(cacheKey,result);
    while(resolverCache.size>MAX_CACHE)resolverCache.delete(resolverCache.keys().next().value);
    cacheMisses+=1;
    return result;
  };

  if(!Object.keys(prefix).length){
    return {outcome:'INVALID',reason:'SELECTOR_PREFIX_MISSING',elapsed_ms:Date.now()-startedAt};
  }
  const parent=await resolveCached(prefix);
  for(const [fieldKey,value] of Object.entries(prefix)){
    if(!same(parent.selection?.[fieldKey],value)){
      return {outcome:'INVALID',reason:`PARENT_PREFIX_REJECTED:${fieldKey}`,elapsed_ms:Date.now()-startedAt};
    }
  }
  const field=(parent.fields??[]).find((candidate)=>candidate.key===key)??null;
  if(!field||field.readOnly===true||field.required===true||!['ENUM','MULTI_ENUM'].includes(field.dataType)){
    return {
      outcome:'INVALID',
      reason:'CONSTRAINT_FIELD_NOT_OPTIONAL_DISCRETE',
      observed_field:field?{key:field.key,dataType:field.dataType,required:field.required===true,readOnly:field.readOnly===true}:null,
      elapsed_ms:Date.now()-startedAt
    };
  }
  if(field.dataType!==lane.selected_constraint_data_type||field.required===true!==Boolean(lane.selected_constraint_required)){
    return {outcome:'INVALID',reason:'HARD_PROOF_FIELD_CLASSIFICATION_DRIFT',elapsed_ms:Date.now()-startedAt};
  }
  const initialInput=applyDecision(parent.selection??prefix,key,constraint.decision);
  const selected=await resolveCached(initialInput);
  if(!branchSurvives(selected,key,constraint.decision,{constraint:true})){
    return {outcome:'INVALID',reason:'EXPLICIT_UNSET_NOT_PRESERVED_AT_ENTRY',elapsed_ms:Date.now()-startedAt};
  }
  const initialDecisions=Object.fromEntries(Object.entries(prefix).map(([fieldKey,value])=>[fieldKey,{kind:'VALUE',value}]));
  initialDecisions[key]=constraint.decision;
  const stack=[{selection:selected.selection??initialInput,decisions:initialDecisions,result:selected}];
  const visited=new Set();
  let terminalCount=0;
  let transitionChecks=0;
  let dependencyRejections=0;
  let constraintRejections=0;
  let maxStack=stack.length;

  while(stack.length){
    if(Date.now()>=deadline){
      return {outcome:'TIMEOUT',elapsed_ms:Date.now()-startedAt,visited_state_count:visited.size,terminal_context_count:terminalCount,transition_check_count:transitionChecks,dependency_rejection_count:dependencyRejections,constraint_rejection_count:constraintRejections,max_stack_depth:maxStack,resolver_cache_hits:cacheHits,resolver_cache_misses:cacheMisses};
    }
    if(visited.size>=MAXS){
      return {outcome:'STATE_LIMIT_REACHED',elapsed_ms:Date.now()-startedAt,visited_state_count:visited.size,terminal_context_count:terminalCount,transition_check_count:transitionChecks,dependency_rejection_count:dependencyRejections,constraint_rejection_count:constraintRejections,max_stack_depth:maxStack,resolver_cache_hits:cacheHits,resolver_cache_misses:cacheMisses};
    }
    const current=stack.pop();
    const result=current.result??await resolveCached(current.selection);
    if(!branchSurvives(result,key,constraint.decision,{constraint:true})){
      constraintRejections+=1;
      continue;
    }
    const visibleKeys=new Set((result.fields??[]).map((candidate)=>candidate.key));
    const decisions=Object.fromEntries(Object.entries(current.decisions).filter(([fieldKey])=>visibleKeys.has(fieldKey)));
    decisions[key]=constraint.decision;
    const stateKey=hash({selection:stable(result.selection??{}),decisions:stable(decisions),constraint});
    if(visited.has(stateKey))continue;
    visited.add(stateKey);

    for(const visibleField of result.fields??[]){
      if(TECH.has(visibleField.key))return {outcome:'INVALID',reason:`TECHNICAL_FIELD_VISIBLE:${visibleField.key}`,elapsed_ms:Date.now()-startedAt};
      if(!visibleField.semanticStage||!visibleField.semanticSlot)return {outcome:'INVALID',reason:`UNMAPPED_UI_FIELD:${visibleField.key}`,elapsed_ms:Date.now()-startedAt};
    }
    const nextField=(result.fields??[]).find((candidate)=>
      !candidate.readOnly&&
      !CONT.has(candidate.key)&&
      candidate.dataType!=='NUMBER'&&
      enabled(candidate).length>0&&
      !Object.prototype.hasOwnProperty.call(decisions,candidate.key)
    );
    if(!nextField){
      if(terminalCount>=MAXT){
        return {outcome:'TERMINAL_LIMIT_REACHED',elapsed_ms:Date.now()-startedAt,visited_state_count:visited.size,terminal_context_count:terminalCount,transition_check_count:transitionChecks,dependency_rejection_count:dependencyRejections,constraint_rejection_count:constraintRejections,max_stack_depth:maxStack,resolver_cache_hits:cacheHits,resolver_cache_misses:cacheMisses};
      }
      terminalCount+=1;
      continue;
    }
    const branches=decisionBranches(nextField);
    for(let index=branches.length-1;index>=0;index-=1){
      if(Date.now()>=deadline)break;
      const branch=branches[index];
      transitionChecks+=1;
      const input=applyDecision(result.selection,nextField.key,branch);
      const child=await resolveCached(input);
      const branchOk=branchSurvives(child,nextField.key,branch);
      const priorOk=Object.entries(decisions)
        .filter(([fieldKey])=>fieldKey!==key)
        .every(([fieldKey,decision])=>branchSurvives(child,fieldKey,decision));
      const constraintOk=branchSurvives(child,key,constraint.decision,{constraint:true});
      if(!branchOk||!priorOk||!constraintOk){
        dependencyRejections+=1;
        if(!constraintOk)constraintRejections+=1;
        continue;
      }
      const nextDecisions={...decisions,[nextField.key]:branch,[key]:constraint.decision};
      stack.push({selection:child.selection,decisions:nextDecisions,result:child});
    }
    if(stack.length>maxStack)maxStack=stack.length;
  }

  return {
    outcome:terminalCount>0?'COMPLETED':'INVALID',
    reason:terminalCount>0?null:'NO_TERMINAL_CONTEXT',
    elapsed_ms:Date.now()-startedAt,
    visited_state_count:visited.size,
    terminal_context_count:terminalCount,
    transition_check_count:transitionChecks,
    dependency_rejection_count:dependencyRejections,
    constraint_rejection_count:constraintRejections,
    max_stack_depth:maxStack,
    resolver_cache_hits:cacheHits,
    resolver_cache_misses:cacheMisses
  };
}

execFileSync('git',['merge-base','--is-ancestor',SOURCE_HEAD,head],{stdio:'ignore'});
const sourceAnalysisBlob=execFileSync('git',['rev-parse',`${SOURCE_HEAD}:${PATH}`],{encoding:'utf8'}).trim();
const sourceBatchBlob=execFileSync('git',['rev-parse',`${SOURCE_HEAD}:${BATCH_RUNNER_PATH}`],{encoding:'utf8'}).trim();
const sourceFullBlob=execFileSync('git',['rev-parse',`${SOURCE_HEAD}:${FULL_RUNNER_PATH}`],{encoding:'utf8'}).trim();
if(sourceAnalysisBlob!==SOURCE_ANALYSIS_BLOB)throw new Error(`SOURCE_ANALYSIS_BLOB_MISMATCH:${sourceAnalysisBlob}`);
if(sourceBatchBlob!==SOURCE_BATCH_BLOB)throw new Error(`SOURCE_BATCH_BLOB_MISMATCH:${sourceBatchBlob}`);
if(sourceFullBlob!==SOURCE_FULL_BLOB)throw new Error(`SOURCE_FULL_BLOB_MISMATCH:${sourceFullBlob}`);
const currentBatchBlob=execFileSync('git',['rev-parse',`${head}:${BATCH_RUNNER_PATH}`],{encoding:'utf8'}).trim();
const currentFullBlob=execFileSync('git',['rev-parse',`${head}:${FULL_RUNNER_PATH}`],{encoding:'utf8'}).trim();
if(currentBatchBlob!==SOURCE_BATCH_BLOB||currentFullBlob!==SOURCE_FULL_BLOB)throw new Error('RUNNER_CHANGED_BEFORE_CONSTRAINT_MICRO');
const changed=execFileSync('git',['diff','--name-only',`${SOURCE_HEAD}..${head}`],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean).sort();
if(sj(changed)!==sj([PATH]))throw new Error(`RECOVERY_SCOPE_INVALID:${changed.join(',')}`);

const sourceDir=`${OUT}/source-run-${SOURCE_RUN}`;
mkdirSync(sourceDir,{recursive:true});
execFileSync('gh',['run','download',SOURCE_RUN,'--repo',String(process.env.GITHUB_REPOSITORY??'Takuro-Kwkm/sash-app'),'--name',SOURCE_ART,'--dir',sourceDir],{stdio:'inherit',timeout:120000});
const sourceHeavy=read(`${sourceDir}/heavy-partition-analysis.json`);
const sourcePlan=read(`${sourceDir}/recursive-partition-plan.json`);
const sourceDepth9Plan=read(`${sourceDir}/depth9-safe-representative-partition-plan.json`);
const sourceDepth9Proof=read(`${sourceDir}/depth9-safe-representative-coverage-preservation-proof.json`);
const sourceDepth9Micro=read(`${sourceDir}/depth9-safe-representative-micro-calibration.json`);
const sourceFailedConstraint=read(`${sourceDir}/explicit-decision-constraint-representative-micro-calibration.json`);
const sourceFailedDecision=read(`${sourceDir}/depth9-and-constraint-micro-decision.json`);
const sourceHard=read(`${sourceDir}/${SOURCE_HARD_REL}`);
const sourceModel=read(`${sourceDir}/${SOURCE_MODEL_REL}`);

for(const artifact of [sourceHeavy,sourcePlan,sourceDepth9Plan,sourceDepth9Proof,sourceDepth9Micro,sourceFailedConstraint,sourceFailedDecision]){
  if(artifact.exact_head!==SOURCE_HEAD)throw new Error(`SOURCE_ARTIFACT_HEAD_MISMATCH:${String(artifact.artifact_type??'unknown')}`);
}
if(sourceDepth9Proof.coverage_preservation_status!=='PASS'||sourceDepth9Plan.COVERAGE_PRESERVATION_STATUS!=='PASS')throw new Error('SOURCE_DEPTH9_COVERAGE_NOT_PASS');
if(sourceDepth9Micro.pass_count!==0||sourceDepth9Micro.needs_deeper_split_count!==3||sourceDepth9Micro.calibration_invalid_count!==0||sourceDepth9Micro.failed_without_safe_required_enum_frontier_count!==0)throw new Error('SOURCE_DEPTH9_MICRO_SHAPE_INVALID');
if(sourceDepth9Micro.decision!=='DEPTH10_REQUIRED_FOR_FAILED_SAFE_REPRESENTATIVES')throw new Error('SOURCE_DEPTH9_DECISION_INVALID');
if(sourceFailedConstraint.calibration_invalid_count!==2||sourceFailedConstraint.pass_count!==0||sourceFailedConstraint.results.some((row)=>row.reason!=='CONSTRAINT_FIELD_NOT_OPTIONAL_DISCRETE'))throw new Error('SOURCE_CONSTRAINT_FAILURE_CLASSIFICATION_DRIFT');
if(sourceFailedDecision.runner_implementation_authorized!==false||sourceFailedDecision.constraint_micro_calibration_invalid_count!==2)throw new Error('SOURCE_FAILED_DECISION_INVALID');
if(sourceHard.EXPLICIT_DECISION_CONSTRAINT_MODEL_GATE!=='PASS'||sourceHard.lane_pass_count!==7||sourceHard.lane_fail_count!==0)throw new Error('SOURCE_HARD_PROOF_NOT_PASS');
if(sourceModel.explicit_decision_constraint_model_status!=='PASS'||sourceModel.lane_count!==7)throw new Error('SOURCE_MODEL_PROOF_NOT_PASS');

const modelByLane=new Map(sourceModel.lanes.map((lane)=>[lane.lane_id,lane]));
const provenanceRepresentatives=[];
for(const sourceLane of ['DEPTH7_SAFE_FRONTIER_EXHAUSTED','DEPTH6_SAFE_FRONTIER_EXHAUSTED']){
  const hardLane=sourceHard.lanes
    .filter((candidate)=>candidate.source_lane===sourceLane)
    .sort((a,b)=>String(a.lane_id).localeCompare(String(b.lane_id)))[0];
  if(!hardLane)throw new Error(`CONSTRAINT_HARD_REPRESENTATIVE_MISSING:${sourceLane}`);
  const modelLane=modelByLane.get(hardLane.lane_id);
  if(!modelLane?.selector_prefix||!Object.keys(modelLane.selector_prefix).length)throw new Error(`CONSTRAINT_SELECTOR_PREFIX_SOURCE_MISSING:${hardLane.lane_id}`);
  if(modelLane.selected_constraint_field!==hardLane.selected_constraint_field)throw new Error(`CONSTRAINT_FIELD_SOURCE_MISMATCH:${hardLane.lane_id}`);
  provenanceRepresentatives.push({...hardLane,selector_prefix:stable(modelLane.selector_prefix)});
}

const runtime=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');
if(!runtime?.sourcePackageIntegrity?.match)throw new Error('CURRENT_RUNTIME_INTEGRITY_FAIL');
if(runtime.sourcePackageIntegrity.actual!==sourceHard.current_runtime_manifest_sha256)throw new Error(`CURRENT_RUNTIME_MANIFEST_CHANGED:${runtime.sourcePackageIntegrity.actual}`);

const binding={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_CONSTRAINT_MICRO_PREFIX_RECOVERY_SOURCE_BINDING',
  exact_head:head,
  source_exact_head:SOURCE_HEAD,
  source_run_id:Number(SOURCE_RUN),
  changed_files_since_source:changed,
  failure_cause:'HARD_PROOF_LANE_DID_NOT_PERSIST_SELECTOR_PREFIX_AND_MICRO_READ_EMPTY_PREFIX',
  direct_state_change:'RECONSTRUCT_SELECTOR_PREFIX_FROM_SOURCE_MODEL_PROOF',
  source_depth9_measurement_reexecuted:false,
  source_depth9_decision:sourceDepth9Micro.decision,
  source_explicit_constraint_model_gate:sourceHard.EXPLICIT_DECISION_CONSTRAINT_MODEL_GATE,
  runner_unchanged_before_micro:true,
  current_runtime_manifest_sha256:runtime.sourcePackageIntegrity.actual,
  status:'PASS'
};
writeJson(`${OUT}/constraint-micro-prefix-recovery-source-binding.json`,binding);
writeJson(`${OUT}/heavy-partition-analysis.json`,{...sourceHeavy,exact_head:head,evidence_origin:'CURRENT_HEAD_CONSTRAINT_PREFIX_RECOVERY_BINDING',source_bound_exact_head:SOURCE_HEAD,current_head_binding_sha256:hash(binding),source_pass_evidence_reused_as_current_head:false});
writeJson(`${OUT}/recursive-partition-plan.json`,{...sourcePlan,exact_head:head,evidence_origin:'CURRENT_HEAD_CONSTRAINT_PREFIX_RECOVERY_BINDING',source_bound_exact_head:SOURCE_HEAD,current_head_binding_sha256:hash(binding),source_pass_evidence_reused_as_current_head:false});
writeJson(`${OUT}/depth9-safe-representative-partition-plan.json`,{...sourceDepth9Plan,exact_head:head,measurement_source_exact_head:SOURCE_HEAD,measurement_reexecuted:false,evidence_origin:'BOUND_SOURCE_DIAGNOSTIC_NOT_CURRENT_EXECUTION'});
writeJson(`${OUT}/depth9-safe-representative-coverage-preservation-proof.json`,{...sourceDepth9Proof,exact_head:head,measurement_source_exact_head:SOURCE_HEAD,measurement_reexecuted:false,evidence_origin:'BOUND_SOURCE_DIAGNOSTIC_NOT_CURRENT_EXECUTION'});
writeJson(`${OUT}/depth9-safe-representative-micro-calibration.json`,{...sourceDepth9Micro,exact_head:head,measurement_source_exact_head:SOURCE_HEAD,measurement_reexecuted:false,evidence_origin:'BOUND_SOURCE_DIAGNOSTIC_NOT_CURRENT_EXECUTION'});

const constraintResults=[];
for(const lane of provenanceRepresentatives){
  const measured=await measureConstraintLane(lane);
  const passed=measured.outcome==='COMPLETED';
  const bounded=['TIMEOUT','STATE_LIMIT_REACHED','TERMINAL_LIMIT_REACHED'].includes(measured.outcome);
  const status=passed?'PASS':bounded?'NEEDS_FURTHER_PARTITIONING':'CALIBRATION_INVALID';
  constraintResults.push({
    lane_id:lane.lane_id,
    source_lane:lane.source_lane,
    product_node:lane.product_node,
    selector_prefix_source:'SOURCE_MODEL_PROOF',
    selector_prefix_sha256:hash(lane.selector_prefix),
    selected_constraint_field:lane.selected_constraint_field,
    decision_constraint:{field_key:lane.selected_constraint_field,decision:{kind:'UNSET'}},
    ...measured,
    status
  });
  console.log(`CONSTRAINT_MICRO lane=${lane.lane_id} source=${lane.source_lane} status=${status} outcome=${measured.outcome} elapsed_ms=${measured.elapsed_ms} states=${measured.visited_state_count??null} terminals=${measured.terminal_context_count??null}`);
}
const constraintPass=constraintResults.filter((entry)=>entry.status==='PASS');
const constraintFurther=constraintResults.filter((entry)=>entry.status==='NEEDS_FURTHER_PARTITIONING');
const constraintInvalid=constraintResults.filter((entry)=>entry.status==='CALIBRATION_INVALID');
const constraintMicro={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_EXPLICIT_DECISION_CONSTRAINT_REPRESENTATIVE_MICRO_CALIBRATION_R2',
  exact_head:head,
  source_model_proof_exact_head:sourceHard.exact_head,
  source_failed_micro_exact_head:SOURCE_HEAD,
  source_model_gate:sourceHard.EXPLICIT_DECISION_CONSTRAINT_MODEL_GATE,
  execution_model:'ANALYSIS_SIDE_BOUNDED_DFS_PROOF_ONLY',
  failure_recovery:'SELECTOR_PREFIX_RECONSTRUCTED_FROM_SOURCE_MODEL_PROOF',
  existing_runner_modified:false,
  source_depth9_measurement_reexecuted:false,
  representative_selection:'ONE_EXPLICIT_UNSET_CASE_PER_EXHAUSTED_SOURCE_PROVENANCE_CLASS',
  representative_count:constraintResults.length,
  child_timeout_ms:CONSTRAINT_TIMEOUT,
  pass_count:constraintPass.length,
  needs_further_partitioning_count:constraintFurther.length,
  calibration_invalid_count:constraintInvalid.length,
  results:constraintResults,
  runner_constraint_support_implemented:false,
  constraint_full_execution_authorized:false,
  full_coverage_authorized:false,
  status:constraintInvalid.length?'BLOCKED':'MEASURED_CALIBRATION_ONLY'
};
writeJson(`${OUT}/explicit-decision-constraint-representative-micro-calibration.json`,constraintMicro);

const runnerImplementationAuthorized=constraintInvalid.length===0&&constraintResults.every((entry)=>entry.visited_state_count>0||entry.status==='PASS');
const decision={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_CONSTRAINT_MICRO_PREFIX_RECOVERY_DECISION',
  exact_head:head,
  source_exact_head:SOURCE_HEAD,
  source_run_id:Number(SOURCE_RUN),
  source_depth9_parent_count:sourceDepth9Plan.parent_partition_count,
  source_depth9_child_count:sourceDepth9Plan.child_partition_count,
  source_depth9_coverage_preservation_status:sourceDepth9Proof.coverage_preservation_status,
  source_depth9_micro_pass_count:sourceDepth9Micro.pass_count,
  source_depth9_micro_needs_deeper_split_count:sourceDepth9Micro.needs_deeper_split_count,
  source_depth9_micro_calibration_invalid_count:sourceDepth9Micro.calibration_invalid_count,
  source_depth9_decision:sourceDepth9Micro.decision,
  source_depth9_measurement_reexecuted:false,
  explicit_constraint_model_gate:sourceHard.EXPLICIT_DECISION_CONSTRAINT_MODEL_GATE,
  constraint_micro_representative_count:constraintResults.length,
  constraint_micro_pass_count:constraintPass.length,
  constraint_micro_needs_further_partitioning_count:constraintFurther.length,
  constraint_micro_calibration_invalid_count:constraintInvalid.length,
  runner_constraint_support_implemented:false,
  runner_implementation_authorized:runnerImplementationAuthorized,
  constraint_full_execution_authorized:false,
  full_coverage_authorized:false,
  REQUESTED_DIFF_COVERAGE:changed.length===1&&changed[0]===PATH?'PASS':'FAIL',
  UNREQUESTED_DIFF_COUNT:changed.filter((path)=>path!==PATH).length,
  UCHIRIMO_FULL_COVERAGE_QA_GATE:'BLOCKED',
  UCHIRIMO_QA_STATUS:'UNVERIFIED',
  APP_INTEGRATION_READY:false,
  RELEASE_INPUT_GATE:'BLOCKED',
  status:constraintInvalid.length?'BLOCKED':'DIAGNOSTIC_COMPLETE'
};
writeJson(`${OUT}/depth9-and-constraint-micro-decision.json`,decision);

console.log('SOURCE_DEPTH9_MEASUREMENT_REEXECUTED=FALSE');
console.log(`SOURCE_DEPTH9_DECISION=${sourceDepth9Micro.decision}`);
console.log(`CONSTRAINT_MICRO_PASS_COUNT=${constraintPass.length}/${constraintResults.length}`);
console.log(`CONSTRAINT_MICRO_NEEDS_FURTHER_PARTITIONING_COUNT=${constraintFurther.length}`);
console.log(`CONSTRAINT_MICRO_INVALID_COUNT=${constraintInvalid.length}`);
console.log(`RUNNER_IMPLEMENTATION_AUTHORIZED=${String(runnerImplementationAuthorized).toUpperCase()}`);
console.log('RUNNER_CONSTRAINT_SUPPORT_IMPLEMENTED=FALSE');
console.log('CONSTRAINT_FULL_EXECUTION_AUTHORIZED=FALSE');
console.log('UCHIRIMO_FULL_COVERAGE_QA_GATE=BLOCKED');
console.log('APP_INTEGRATION_READY=FALSE');
console.log('RELEASE_INPUT_GATE=BLOCKED');
if(constraintInvalid.length)throw new Error('CONSTRAINT_MICRO_R2_INVALID');
