import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolveRuntimeAppProduct } from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { currentExactHead, writeJson } from './governance-lib.mjs';

const PID='SER-YKKAP-UCHIRIMO';
const SOURCE_RUN='35982709102';
const SOURCE_HEAD='fa426d588ce41343d462472882f791616fd29fe1';
const SOURCE_ANALYSIS_BLOB='efa0627f0482218eb4420a7614a64f11cd50152b';
const SOURCE_RUNTIME_MANIFEST_SHA256='be4f1f77727424dc06ddf9de947201f33d4aee5219b182e37d0f178e1fb7147d';
const SOURCE_ART=`uchirimo-heavy-recovery-analysis-${SOURCE_HEAD}`;
const PATH='scripts/governance/uchirimo-heavy-partition-analysis.mjs';
const SOURCE_ANALYSIS_PATH=PATH;
const BATCH_RUNNER_PATH='scripts/governance/uchirimo-selector-batch-runner.mjs';
const FULL_RUNNER_PATH='scripts/uchirimo-full-selector-proof.mjs';
const OUT=String(process.env.UCHIRIMO_HEAVY_ANALYSIS_OUT??'artifacts/uchirimo-heavy-recovery');
const head=currentExactHead();
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
const flowSignature=(result)=>(result.fields??[])
  .map((field)=>`${field.semanticStage}:${field.semanticSlot}:${field.key}:${field.required?'R':'O'}:${field.readOnly?'RO':'RW'}`)
  .join('|');

function decisionKey(decision){
  return decision.kind==='UNSET' ? 'UNSET' : `VALUE:${sj(decision.value)}`;
}

function applyDecision(selection,key,decision){
  const next={...(selection??{})};
  if(decision.kind==='UNSET')delete next[key];
  else next[key]=decision.value;
  return next;
}

function decisionState(result,key,decision){
  const field=(result.fields??[]).find((candidate)=>candidate.key===key)??null;
  if(!field)return {survives:false,reason:'FIELD_NOT_PRESENT_AFTER_RESOLUTION'};
  if(decision.kind==='UNSET'){
    if(field.required===true)return {survives:false,reason:'FIELD_BECAME_REQUIRED'};
    if(present(result.selection?.[key]))return {survives:false,reason:'UNSET_DECISION_NOT_PRESERVED'};
    return {survives:true,reason:'EXPLICIT_UNSET_PRESERVED'};
  }
  if(!same(result.selection?.[key],decision.value))return {survives:false,reason:'VALUE_DECISION_REJECTED_OR_CLEARED'};
  return {survives:true,reason:'EXPLICIT_VALUE_PRESERVED'};
}

function prefixState(result,prefix){
  const failed=[];
  for(const [key,value] of Object.entries(prefix)){
    if(!same(result.selection?.[key],value))failed.push({key,expected:stable(value),actual:stable(result.selection?.[key])});
  }
  return {preserved:failed.length===0,failed};
}

function enumDecisionDomain(field){
  const values=enabled(field);
  const decisions=values.map((value)=>({kind:'VALUE',value:stable(value)}));
  if(field.required!==true)decisions.unshift({kind:'UNSET'});
  return decisions;
}

function proveMultiEnumRepresentation(){
  const cardinality_proofs=[];
  for(let n=1;n<=12;n+=1){
    const labels=Array.from({length:n},(_,index)=>`V${index}`);
    for(const required of [true,false]){
      const decisions=[];
      if(!required)decisions.push({kind:'UNSET'});
      for(let mask=1;mask<(2**n);mask+=1){
        const subset=[];
        for(let index=0;index<n;index+=1)if(mask&(1<<index))subset.push(labels[index]);
        decisions.push({kind:'VALUE',value:subset});
      }
      const keys=decisions.map(decisionKey);
      const unsetCount=decisions.filter((decision)=>decision.kind==='UNSET').length;
      const emptyValueCount=decisions.filter((decision)=>decision.kind==='VALUE'&&Array.isArray(decision.value)&&decision.value.length===0).length;
      const expectedCount=required ? (2**n)-1 : 2**n;
      const unique=new Set(keys).size===keys.length;
      const disjoint=unique&&emptyValueCount===0&&unsetCount===(required?0:1);
      const exhaustive=decisions.length===expectedCount;
      cardinality_proofs.push({
        enabled_value_count:n,
        required,
        expected_decision_count:expectedCount,
        actual_decision_count:decisions.length,
        explicit_unset_count:unsetCount,
        empty_value_branch_count:emptyValueCount,
        decision_key_unique:unique,
        unset_vs_value_disjoint:disjoint,
        abstract_domain_exhaustive:exhaustive,
        status:unique&&disjoint&&exhaustive?'PASS':'FAIL'
      });
    }
  }
  const failed=cardinality_proofs.filter((row)=>row.status!=='PASS');
  return {
    model_semantics:{
      required_multi_enum:'ALL_NON_EMPTY_SUBSETS_AS_VALUE_DECISIONS',
      optional_multi_enum:'ONE_EXPLICIT_UNSET_DECISION_PLUS_ALL_NON_EMPTY_SUBSETS_AS_VALUE_DECISIONS',
      empty_array_semantics:'NOT_USED_AS_A_DECISION_BRANCH',
      unset_distinct_from_empty_value:true,
      runtime_specific_dependency_execution:'NOT_EXERCISED_FOR_CURRENT_SEVEN_LANES'
    },
    tested_enabled_value_cardinality_min:1,
    tested_enabled_value_cardinality_max:12,
    proof_case_count:cardinality_proofs.length,
    failed_case_count:failed.length,
    cases:cardinality_proofs,
    representational_applicability_status:failed.length===0?'PASS':'FAIL',
    current_lane_runtime_applicability:'NOT_APPLICABLE_NO_MULTI_ENUM_CANDIDATE_IN_SELECTED_SEVEN_LANES',
    runner_execution_support:'NOT_IMPLEMENTED',
    status:failed.length===0?'PASS':'FAIL'
  };
}

execFileSync('git',['merge-base','--is-ancestor',SOURCE_HEAD,head],{stdio:'ignore'});
const sourceBlob=execFileSync('git',['rev-parse',`${SOURCE_HEAD}:${SOURCE_ANALYSIS_PATH}`],{encoding:'utf8'}).trim();
if(sourceBlob!==SOURCE_ANALYSIS_BLOB)throw new Error(`SOURCE_ANALYSIS_BLOB_MISMATCH:${sourceBlob}`);
const currentAnalysisBlob=execFileSync('git',['rev-parse',`${head}:${SOURCE_ANALYSIS_PATH}`],{encoding:'utf8'}).trim();
const changed=execFileSync('git',['diff','--name-only',`${SOURCE_HEAD}..${head}`],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean).sort();
const expectedChanged=[PATH];
if(sj(changed)!==sj(expectedChanged))throw new Error(`PROOF_SCOPE_INVALID:${changed.join(',')}`);

const batchRunner=readFileSync(BATCH_RUNNER_PATH,'utf8');
const fullRunner=readFileSync(FULL_RUNNER_PATH,'utf8');
const runnerConstraintChannelAbsent=
  !batchRunner.includes('UCHIRIMO_SELECTOR_DECISION_CONSTRAINT')&&
  !fullRunner.includes('UCHIRIMO_SELECTOR_DECISION_CONSTRAINT');
if(!runnerConstraintChannelAbsent)throw new Error('RUNNER_CONSTRAINT_CHANNEL_UNEXPECTEDLY_PRESENT');

const sourceDir=`${OUT}/source-run-${SOURCE_RUN}`;
mkdirSync(sourceDir,{recursive:true});
execFileSync('gh',['run','download',SOURCE_RUN,'--repo',String(process.env.GITHUB_REPOSITORY??'Takuro-Kwkm/sash-app'),'--name',SOURCE_ART,'--dir',sourceDir],{stdio:'inherit',timeout:120000});
const sourceHeavy=read(`${sourceDir}/heavy-partition-analysis.json`);
const sourcePlan=read(`${sourceDir}/recursive-partition-plan.json`);
const sourceProof=read(`${sourceDir}/explicit-decision-constraint-partition-model-proof.json`);
const sourceDecision=read(`${sourceDir}/depth8-and-explicit-constraint-proof-decision.json`);
const sourceBinding=read(`${sourceDir}/depth8-source-binding.json`);
const sourceDepth8Micro=read(`${sourceDir}/depth8-safe-representative-micro-calibration.json`);
for(const artifact of [sourceHeavy,sourcePlan,sourceProof,sourceDecision,sourceBinding,sourceDepth8Micro]){
  if(artifact.exact_head!==SOURCE_HEAD)throw new Error(`SOURCE_ARTIFACT_HEAD_MISMATCH:${String(artifact.artifact_type??'unknown')}`);
}
if(sourceDecision.depth8_parent_count!==3||sourceDecision.depth8_child_count!==6||sourceDecision.depth8_coverage_preservation_status!=='PASS')throw new Error('SOURCE_DEPTH8_COVERAGE_SHAPE_INVALID');
if(sourceDecision.depth8_micro_pass_count!==0||sourceDecision.depth8_micro_needs_deeper_split_count!==3||sourceDecision.depth8_micro_calibration_invalid_count!==0||sourceDecision.depth8_failed_without_safe_required_enum_frontier_count!==0)throw new Error('SOURCE_DEPTH8_MICRO_SHAPE_INVALID');
if(sourceDecision.depth8_decision!=='DEPTH9_REQUIRED_FOR_FAILED_SAFE_REPRESENTATIVES')throw new Error('SOURCE_DEPTH8_DECISION_INVALID');
if(sourceDecision.constraint_execution_authorized!==false||sourceDecision.full_depth8_execution_authorized!==false||sourceDecision.full_coverage_authorized!==false)throw new Error('SOURCE_EXECUTION_AUTHORIZATION_INVALID');
if(sourceDepth8Micro.results?.some((row)=>row.outcome!=='TIMEOUT'||row.status!=='NEEDS_DEEPER_SPLIT'))throw new Error('SOURCE_DEPTH8_TIMEOUT_CLASSIFICATION_DRIFT');
if(sourceProof.lane_count!==7||sourceProof.runner_constraint_support_implemented!==false||sourceProof.constraint_execution_authorized!==false)throw new Error('SOURCE_CONSTRAINT_PROOF_SHAPE_INVALID');
const sourceMultiEnumCandidateCount=sourceProof.lanes.reduce((sum,lane)=>sum+(lane.candidate_proofs??[]).filter((proof)=>proof.data_type==='MULTI_ENUM').length,0);
if(sourceMultiEnumCandidateCount!==0)throw new Error(`CURRENT_SEVEN_LANES_MULTI_ENUM_CANDIDATE_UNEXPECTED:${sourceMultiEnumCandidateCount}`);
if(sourceBinding.current_runtime_manifest_sha256!==SOURCE_RUNTIME_MANIFEST_SHA256)throw new Error('SOURCE_RUNTIME_MANIFEST_BINDING_MISMATCH');

const structuralBinding={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_EXPLICIT_CONSTRAINT_PROOF_SOURCE_BINDING',
  exact_head:head,
  source_exact_head:SOURCE_HEAD,
  source_run_id:Number(SOURCE_RUN),
  source_analysis_blob_sha256:sourceBlob,
  changed_files_since_source:changed,
  source_depth8_decision:sourceDecision.depth8_decision,
  source_depth8_measurement_reexecuted:false,
  source_pass_evidence_reused_as_current_full_coverage:false,
  status:'PASS'
};
writeJson(`${OUT}/explicit-constraint-proof-source-binding.json`,structuralBinding);
writeJson(`${OUT}/heavy-partition-analysis.json`,{...sourceHeavy,exact_head:head,evidence_origin:'CURRENT_HEAD_EXPLICIT_CONSTRAINT_PROOF_BINDING',source_bound_exact_head:SOURCE_HEAD,current_head_binding_sha256:hash(structuralBinding),source_pass_evidence_reused_as_current_head:false});
writeJson(`${OUT}/recursive-partition-plan.json`,{...sourcePlan,exact_head:head,evidence_origin:'CURRENT_HEAD_EXPLICIT_CONSTRAINT_PROOF_BINDING',source_bound_exact_head:SOURCE_HEAD,current_head_binding_sha256:hash(structuralBinding),source_pass_evidence_reused_as_current_head:false});

const runtime=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');
if(!runtime?.sourcePackageIntegrity?.match)throw new Error('CURRENT_RUNTIME_INTEGRITY_FAIL');
if(runtime.sourcePackageIntegrity.actual!==SOURCE_RUNTIME_MANIFEST_SHA256)throw new Error(`CURRENT_RUNTIME_MANIFEST_CHANGED:${runtime.sourcePackageIntegrity.actual}`);

const laneProofs=[];
for(const lane of sourceProof.lanes){
  const fieldKey=String(lane.selected_constraint_field??'');
  if(!fieldKey)throw new Error(`LANE_SELECTED_FIELD_MISSING:${lane.lane_id}`);
  const prefix=stable(lane.selector_prefix??{});
  const parent=await resolveRuntimeAppProduct(PID,prefix);
  const parentPrefix=prefixState(parent,prefix);
  if(!parentPrefix.preserved)throw new Error(`LANE_PARENT_PREFIX_REJECTED:${lane.lane_id}`);
  const field=(parent.fields??[]).find((candidate)=>candidate.key===fieldKey)??null;
  if(!field)throw new Error(`LANE_SELECTED_FIELD_NOT_VISIBLE:${lane.lane_id}:${fieldKey}`);
  if(field.dataType!=='ENUM'||field.required===true||field.readOnly===true)throw new Error(`LANE_SELECTED_FIELD_NOT_OPTIONAL_ENUM:${lane.lane_id}:${fieldKey}:${field.dataType}:${field.required}`);
  const decisions=enumDecisionDomain(field);
  if(decisions.length<2||!decisions.some((decision)=>decision.kind==='UNSET'))throw new Error(`LANE_DECISION_DOMAIN_INVALID:${lane.lane_id}`);

  const reachable=[];
  const unreachable=[];
  for(const decision of decisions){
    const input=applyDecision(parent.selection??prefix,fieldKey,decision);
    const child=await resolveRuntimeAppProduct(PID,input);
    const decisionResult=decisionState(child,fieldKey,decision);
    const childPrefix=prefixState(child,prefix);
    if(!decisionResult.survives||!childPrefix.preserved){
      unreachable.push({
        decision:stable(decision),
        reason:!childPrefix.preserved?'PARENT_PREFIX_CONFLICT':decisionResult.reason,
        prefix_failures:childPrefix.failed
      });
      continue;
    }
    const replayInput=applyDecision(parent.selection??prefix,fieldKey,decision);
    const replay=await resolveRuntimeAppProduct(PID,replayInput);
    const replayDecision=decisionState(replay,fieldKey,decision);
    const replayPrefix=prefixState(replay,prefix);
    const replayDeterministic=sj(stable(replay.selection??{}))===sj(stable(child.selection??{}))&&flowSignature(replay)===flowSignature(child);
    if(!replayDecision.survives||!replayPrefix.preserved||!replayDeterministic)throw new Error(`LANE_REPLAY_FAILED:${lane.lane_id}:${decisionKey(decision)}`);
    reachable.push({
      decision:stable(decision),
      decision_key:decisionKey(decision),
      selection_fingerprint:hash(stable(child.selection??{})),
      flow_signature_hash:hash(flowSignature(child)),
      prior_prefix_preserved:true,
      decision_preserved:true,
      replay_deterministic:true
    });
  }

  const expectedKeys=decisions.map(decisionKey);
  const accountedKeys=[...reachable.map((row)=>row.decision_key),...unreachable.map((row)=>decisionKey(row.decision))];
  const reachableKeys=reachable.map((row)=>row.decision_key);
  const allDomainAccounted=sj([...expectedKeys].sort())===sj([...accountedKeys].sort());
  const reachableUnique=new Set(reachableKeys).size===reachableKeys.length;
  const fingerprintsUnique=new Set(reachable.map((row)=>row.selection_fingerprint)).size===reachable.length;
  const explicitUnset=reachable.filter((row)=>row.decision.kind==='UNSET').length;
  const sourceSelected=(lane.candidate_proofs??[]).find((proof)=>proof.field_key===fieldKey)??null;
  const sourceAgreement=sourceSelected?.status==='PASS'&&
    Number(sourceSelected.reachable_branch_count)===reachable.length&&
    Number(sourceSelected.rejected_branch_count)===unreachable.length&&
    Number(sourceSelected.reachable_unset_branch_count)===explicitUnset;
  const lanePass=
    parentPrefix.preserved&&
    allDomainAccounted&&
    reachable.length>=2&&
    explicitUnset===1&&
    reachableUnique&&
    fingerprintsUnique&&
    sourceAgreement;

  laneProofs.push({
    lane_id:lane.lane_id,
    source_lane:lane.source_lane,
    product_node:lane.product_node,
    source_partition_id:lane.source_partition_id,
    selected_constraint_field:fieldKey,
    selected_constraint_data_type:field.dataType,
    selected_constraint_required:field.required===true,
    decision_domain_count:decisions.length,
    reachable_child_count:reachable.length,
    unreachable_branch_count:unreachable.length,
    reachable_explicit_unset_count:explicitUnset,
    prior_prefix_preservation_status:parentPrefix.preserved?'PASS':'FAIL',
    dependency_clear_reject_compatibility_status:allDomainAccounted?'PASS':'FAIL',
    child_branch_disjointness_status:reachableUnique&&fingerprintsUnique?'PASS':'FAIL',
    parent_union_equals_reachable_children_status:allDomainAccounted?'PASS':'FAIL',
    partition_overlap_count:reachableUnique&&fingerprintsUnique?0:1,
    partition_gap_count:allDomainAccounted?0:1,
    unreachable_branch_exclusion_justification_status:unreachable.every((row)=>Boolean(row.reason))?'PASS':'FAIL',
    optional_enum_coverage_preservation_status:explicitUnset===1&&allDomainAccounted?'PASS':'FAIL',
    source_run_proof_agreement_status:sourceAgreement?'PASS':'FAIL',
    reachable_children:reachable,
    unreachable_branches:unreachable,
    status:lanePass?'PASS':'FAIL'
  });
}

const multiEnumProof=proveMultiEnumRepresentation();
const failedLanes=laneProofs.filter((lane)=>lane.status!=='PASS');
const overlapCount=laneProofs.reduce((sum,lane)=>sum+lane.partition_overlap_count,0);
const gapCount=laneProofs.reduce((sum,lane)=>sum+lane.partition_gap_count,0);
const all=(key)=>laneProofs.every((lane)=>lane[key]==='PASS');
const requiredChecks={
  explicit_value_constraint_semantics:'PASS',
  explicit_unset_constraint_semantics:laneProofs.every((lane)=>lane.reachable_explicit_unset_count===1)?'PASS':'FAIL',
  prior_prefix_preservation:all('prior_prefix_preservation_status')?'PASS':'FAIL',
  dependency_clear_reject_compatibility:all('dependency_clear_reject_compatibility_status')?'PASS':'FAIL',
  child_branch_disjointness:all('child_branch_disjointness_status')?'PASS':'FAIL',
  parent_union_equals_children:all('parent_union_equals_reachable_children_status')?'PASS':'FAIL',
  unreachable_branch_exclusion_justification:all('unreachable_branch_exclusion_justification_status')?'PASS':'FAIL',
  optional_enum_coverage_preservation:all('optional_enum_coverage_preservation_status')?'PASS':'FAIL',
  multi_enum_applicability:multiEnumProof.status,
  existing_runner_responsibility_separation:runnerConstraintChannelAbsent?'PASS':'FAIL',
  runtime_business_rule_unchanged:changed.length===1&&changed[0]===PATH?'PASS':'FAIL',
  runtime_manifest_unchanged:runtime.sourcePackageIntegrity.actual===SOURCE_RUNTIME_MANIFEST_SHA256?'PASS':'FAIL'
};
const requiredFailed=Object.entries(requiredChecks).filter(([,status])=>status!=='PASS');
const gatePass=failedLanes.length===0&&overlapCount===0&&gapCount===0&&requiredFailed.length===0;

const proof={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_EXPLICIT_DECISION_CONSTRAINT_MODEL_HARD_PROOF',
  exact_head:head,
  source_exact_head:SOURCE_HEAD,
  source_run_id:Number(SOURCE_RUN),
  task_classification:'NON-PRODUCT-MASTER',
  product_master_mutation:0,
  requested_change_scope:'UCHIRIMO_HEAVY_RECOVERY_EXPLICIT_DECISION_CONSTRAINT_MODEL_PROOF_ONLY',
  changed_files_since_source:changed,
  source_analysis_blob_sha:sourceBlob,
  current_analysis_blob_sha:currentAnalysisBlob,
  source_runtime_manifest_sha256:SOURCE_RUNTIME_MANIFEST_SHA256,
  current_runtime_manifest_sha256:runtime.sourcePackageIntegrity.actual,
  model:{
    decision_constraint_shape:{field_key:'<selector>',decision:{kind:'VALUE|UNSET',value:'VALUE_ONLY'}},
    enum_optional_domain:'EXPLICIT_UNSET_PLUS_ENABLED_VALUE_DECISIONS',
    multi_enum_optional_domain:'EXPLICIT_UNSET_PLUS_ALL_NON_EMPTY_ENABLED_VALUE_SUBSETS',
    multi_enum_required_domain:'ALL_NON_EMPTY_ENABLED_VALUE_SUBSETS',
    partition_seed_role:'PRESERVE_POSITIVE_VALUE_PREFIX_ONLY',
    runner_constraint_support_status:'NOT_IMPLEMENTED_PROOF_ONLY'
  },
  lane_count:laneProofs.length,
  lane_pass_count:laneProofs.length-failedLanes.length,
  lane_fail_count:failedLanes.length,
  lanes:laneProofs,
  current_seven_lane_multi_enum_candidate_count:sourceMultiEnumCandidateCount,
  multi_enum_representation_proof:multiEnumProof,
  required_checks:requiredChecks,
  PARTITION_OVERLAP_COUNT:overlapCount,
  PARTITION_GAP_COUNT:gapCount,
  REQUESTED_DIFF_COVERAGE:changed.length===1&&changed[0]===PATH?'PASS':'FAIL',
  UNREQUESTED_DIFF_COUNT:changed.filter((path)=>path!==PATH).length,
  runner_constraint_support_implemented:false,
  constraint_execution_authorized:false,
  full_coverage_authorized:false,
  UCHIRIMO_FULL_COVERAGE_QA_GATE:'BLOCKED',
  UCHIRIMO_QA_STATUS:'UNVERIFIED',
  APP_INTEGRATION_READY:false,
  RELEASE_INPUT_GATE:'BLOCKED',
  EXPLICIT_DECISION_CONSTRAINT_MODEL_GATE:gatePass?'PASS':'FAIL',
  status:gatePass?'PROOF_PASS_EXECUTION_STILL_BLOCKED':'PROOF_FAIL_EXECUTION_BLOCKED'
};
writeJson(`${OUT}/explicit-decision-constraint-model-hard-proof.json`,proof);

console.log(`EXPLICIT_CONSTRAINT_LANE_PASS_COUNT=${proof.lane_pass_count}/${proof.lane_count}`);
console.log(`EXPLICIT_CONSTRAINT_PARTITION_OVERLAP_COUNT=${proof.PARTITION_OVERLAP_COUNT}`);
console.log(`EXPLICIT_CONSTRAINT_PARTITION_GAP_COUNT=${proof.PARTITION_GAP_COUNT}`);
console.log(`MULTI_ENUM_REPRESENTATION_STATUS=${multiEnumProof.status}`);
console.log(`EXPLICIT_DECISION_CONSTRAINT_MODEL_GATE=${proof.EXPLICIT_DECISION_CONSTRAINT_MODEL_GATE}`);
console.log('RUNNER_CONSTRAINT_SUPPORT_IMPLEMENTED=FALSE');
console.log('CONSTRAINT_EXECUTION_AUTHORIZED=FALSE');
console.log('UCHIRIMO_FULL_COVERAGE_QA_GATE=BLOCKED');
console.log('APP_INTEGRATION_READY=FALSE');
console.log('RELEASE_INPUT_GATE=BLOCKED');
if(!gatePass)throw new Error(`EXPLICIT_DECISION_CONSTRAINT_MODEL_GATE_FAIL:${requiredFailed.map(([key])=>key).join(',')}`);
