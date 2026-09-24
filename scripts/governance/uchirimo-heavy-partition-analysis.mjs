import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { resolveRuntimeAppProduct } from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { currentExactHead, writeJson } from './governance-lib.mjs';

const PID='SER-YKKAP-UCHIRIMO';
const SOURCE_RUN='35974701120';
const SOURCE_HEAD='d08acda45b89a9719b00f652d097f6f58344dd15';
const SOURCE_BLOB='78b74b547f65ebe958fa5d32ee97c956147391f6';
const PATH='scripts/governance/uchirimo-heavy-partition-analysis.mjs';
const SOURCE_ART='uchirimo-heavy-recovery-analysis-'+SOURCE_HEAD;
const OUT=String(process.env.UCHIRIMO_HEAVY_ANALYSIS_OUT??'artifacts/uchirimo-heavy-recovery');
const TIMEOUT=Number(process.env.UCHIRIMO_DEPTH8_MICRO_CHILD_TIMEOUT_MS??60000);
const MAXS=1000000;
const MAXT=1000000;
const head=currentExactHead();
if(!Number.isFinite(TIMEOUT)||TIMEOUT<60000)throw new Error('DEPTH8_TIMEOUT_INVALID');
mkdirSync(OUT,{recursive:true});

const stable=(value)=>Array.isArray(value)
  ? value.map(stable)
  : (!value||typeof value!=='object')
    ? value
    : Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>[key,stable(v)]));
const sj=(value)=>JSON.stringify(stable(value));
const hash=(value)=>createHash('sha256').update(typeof value==='string'?value:sj(value)).digest('hex');
const hashBytes=(value)=>createHash('sha256').update(value).digest('hex');
const same=(a,b)=>Array.isArray(b)
  ? Array.isArray(a)&&sj(a.map(String).sort())===sj(b.map(String).sort())
  : Object.is(a,b)||String(a)===String(b);
const present=(value)=>value!==undefined&&value!==null&&value!==''&&(!Array.isArray(value)||value.length>0);
const read=(path)=>JSON.parse(readFileSync(path,'utf8'));
const safeRead=(path)=>{try{return read(path)}catch{return null}};
const enabled=(field)=>(field?.values??[]).filter((row)=>row.disabled!==true);
const normalizeMulti=(rows)=>[...new Map(rows.map((value)=>[String(value),value])).values()].sort((a,b)=>String(a).localeCompare(String(b)));
const CONT=new Set(['size_w','size_h','frame_projection','fukashi_dimension','custom_w','custom_h','custom_width','custom_height']);
const TECH=new Set(['legacyConstruction','legacyConfiguration','internal_construction']);

function unresolvedAxes(result,seed){
  return (result.fields??[])
    .filter((field)=>
      !field.readOnly&&
      !TECH.has(field.key)&&
      !CONT.has(field.key)&&
      !Object.prototype.hasOwnProperty.call(seed,field.key)&&
      ['ENUM','MULTI_ENUM'].includes(field.dataType)
    )
    .map((field)=>{
      const values=[...new Map(enabled(field).map((entry)=>[sj(entry.value),entry.value])).values()];
      return {
        key:field.key,
        type:field.dataType,
        required:field.required===true,
        count:values.length,
        values:values.map(stable),
        safe:field.required===true&&field.dataType==='ENUM'&&values.length>1,
        field
      };
    })
    .filter((axis)=>axis.count>0);
}
const safeSplit=(result,seed)=>unresolvedAxes(result,seed).find((axis)=>axis.safe)??null;
const flowSignature=(result)=>(result.fields??[])
  .filter((field)=>!TECH.has(field.key))
  .map((field)=>`${field.semanticStage}:${field.semanticSlot}:${field.key}:${field.required?'R':'O'}:${field.readOnly?'RO':'RW'}`)
  .join('|');

function row(partition){
  const seed=partition.SELECTOR_PREFIX??{};
  const base=new Set(['room_specification','window_type','glass_family','sash_configuration','size_class']);
  return {
    shard:0,
    node_id:partition.PRODUCT_NODE,
    partition_key:partition.PARTITION_ID,
    room_specification:String(seed.room_specification),
    window_type:String(seed.window_type),
    sash_configuration:seed.sash_configuration==null?'__UNSET__':String(seed.sash_configuration),
    size_class:seed.size_class==null?'__UNSET__':String(seed.size_class),
    glass_family:String(seed.glass_family),
    partition_seed_json:sj(Object.fromEntries(Object.entries(seed).filter(([key])=>!base.has(key))))
  };
}

function micro(partition,index){
  const id=String(index).padStart(2,'0');
  const dir=`${OUT}/depth8-safe-micro/case-${id}`;
  const batchId=`depth8-safe-micro-${id}`;
  mkdirSync(dir,{recursive:true});
  let executionError=null;
  try{
    execFileSync(process.execPath,['scripts/governance/uchirimo-selector-batch-runner.mjs'],{
      env:{
        ...process.env,
        HEAD_SHA:head,
        UCHIRIMO_SELECTOR_BATCH_ID:batchId,
        UCHIRIMO_SELECTOR_BATCH_JSON:JSON.stringify([row(partition)]),
        UCHIRIMO_SELECTOR_CHILD_TIMEOUT_MS:String(TIMEOUT),
        UCHIRIMO_SELECTOR_EXPECTED_SHARDS:'1',
        UCHIRIMO_SELECTOR_MAX_STATES:String(MAXS),
        UCHIRIMO_SELECTOR_MAX_TERMINALS:String(MAXT),
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
  const report=safeRead(`${dir}/shard-0-report.json`);
  const failure=safeRead(`${dir}/shard-0-failure.json`);
  const digest=`${dir}/shard-0-terminal-digests.jsonl`;
  if(existsSync(digest))unlinkSync(digest);
  let artifactShaOk=null;
  if(report?.case_artifact){
    const artifactPath=`${dir}/${report.case_artifact}`;
    if(existsSync(artifactPath)){
      artifactShaOk=hashBytes(readFileSync(artifactPath))===report.case_artifact_sha256;
      unlinkSync(artifactPath);
    }
  }
  const started=Date.parse(batch?.results?.[0]?.started_at??'');
  const completed=Date.parse(batch?.results?.[0]?.completed_at??'');
  const elapsedMs=Number.isFinite(started)&&Number.isFinite(completed)&&completed>=started?completed-started:null;
  const message=String(failure?.message??'');
  const timedOut=batch?.results?.[0]?.timed_out===true;
  const stateLimit=/UCHIRIMO_SELECTOR_STATE_LIMIT_REACHED/.test(message);
  const terminalLimit=/UCHIRIMO_TERMINAL_LIMIT_REACHED/.test(message);
  const pass=batch?.status==='PASS'&&!timedOut&&report?.status==='PASS'&&report?.runtime_integrity_match===true&&Number(report?.unverified_discrete_selector_case_count??1)===0&&artifactShaOk===true;
  return {
    elapsed_ms:elapsedMs,
    timed_out:timedOut,
    state_limit_reached:stateLimit,
    terminal_limit_reached:terminalLimit,
    visited_state_count:report?.visited_state_count??null,
    terminal_context_count:report?.terminal_context_count??null,
    failure_message:message||null,
    execution_error:executionError,
    outcome:pass?'COMPLETED':timedOut?'TIMEOUT':stateLimit?'STATE_LIMIT_REACHED':terminalLimit?'TERMINAL_LIMIT_REACHED':'INVALID'
  };
}

function runnerBranches(field){
  const values=enabled(field).map((entry)=>entry.value);
  if(field.dataType==='MULTI_ENUM'){
    if(values.length>12)return {symbolic_required:true,branches:[]};
    const branches=[];
    const total=2**values.length;
    for(let mask=0;mask<total;mask+=1){
      const subset=[];
      for(let index=0;index<values.length;index+=1)if(mask&(1<<index))subset.push(values[index]);
      if(field.required&&subset.length===0)continue;
      branches.push({kind:'VALUE',value:normalizeMulti(subset)});
    }
    return {symbolic_required:false,branches};
  }
  const branches=values.map((value)=>({kind:'VALUE',value}));
  if(!field.required)branches.unshift({kind:'UNSET'});
  return {symbolic_required:false,branches};
}

function applyBranch(selection,field,branch){
  const next={...(selection??{})};
  if(branch.kind==='UNSET')delete next[field.key];
  else next[field.key]=branch.value;
  return next;
}

function decisionSurvives(result,key,decision){
  if(decision.kind==='UNSET')return !result.fields.find((field)=>field.key===key)?.required&&!present(result.selection?.[key]);
  return same(result.selection?.[key],decision.value);
}

async function proveExplicitConstraintCandidate(lane,field){
  const sourceSeed=lane.selector_prefix;
  const branchModel=runnerBranches(field);
  if(branchModel.symbolic_required){
    return {
      field_key:field.key,
      data_type:field.dataType,
      required:field.required===true,
      enabled_value_count:enabled(field).length,
      status:'BLOCKED',
      reason:'MULTI_ENUM_SYMBOLIC_PROOF_REQUIRED',
      explicit_constraint_representable:false,
      reachable_branch_count:null,
      reachable_unset_branch_count:null,
      rejected_branch_count:null,
      constraints:[]
    };
  }
  const sourceResolved=await resolveRuntimeAppProduct(PID,sourceSeed);
  const priorDecisions=Object.fromEntries(Object.entries(sourceSeed).map(([key,value])=>[key,{kind:'VALUE',value}]));
  const accepted=[];
  const rejected=[];
  for(const branch of branchModel.branches){
    const input=applyBranch(sourceResolved.selection??sourceSeed,field,branch);
    const child=await resolveRuntimeAppProduct(PID,input);
    const branchSurvives=decisionSurvives(child,field.key,branch);
    const priorSurvive=Object.entries(priorDecisions).every(([key,decision])=>decisionSurvives(child,key,decision));
    if(!branchSurvives||!priorSurvive){
      rejected.push({branch:stable(branch),reason:!branchSurvives?'BRANCH_REJECTED_OR_CLEARED':'PRIOR_PREFIX_CLEARED'});
      continue;
    }
    const decisionConstraint={field_key:field.key,decision:stable(branch)};
    const replayInput=applyBranch(sourceResolved.selection??sourceSeed,field,decisionConstraint.decision);
    const replay=await resolveRuntimeAppProduct(PID,replayInput);
    const replayBranch=decisionSurvives(replay,field.key,decisionConstraint.decision);
    const replayPrior=Object.entries(priorDecisions).every(([key,decision])=>decisionSurvives(replay,key,decision));
    if(!replayBranch||!replayPrior){
      rejected.push({branch:stable(branch),reason:'EXPLICIT_CONSTRAINT_REPLAY_FAILED'});
      continue;
    }
    accepted.push({
      branch:stable(branch),
      decision_constraint:decisionConstraint,
      flow_signature:flowSignature(replay),
      selection_fingerprint:hash(stable(replay.selection??{}))
    });
  }
  const branchKeys=accepted.map((entry)=>sj(entry.branch));
  const constraintKeys=accepted.map((entry)=>sj(entry.decision_constraint));
  const branchUnique=new Set(branchKeys).size===branchKeys.length;
  const constraintUnique=new Set(constraintKeys).size===constraintKeys.length;
  const reachableUnset=accepted.filter((entry)=>entry.branch.kind==='UNSET').length;
  const exhaustive=accepted.length+rejected.length===branchModel.branches.length;
  const modelPass=accepted.length>=2&&reachableUnset>=1&&branchUnique&&constraintUnique&&exhaustive;
  return {
    field_key:field.key,
    data_type:field.dataType,
    required:field.required===true,
    enabled_value_count:enabled(field).length,
    runner_branch_count:branchModel.branches.length,
    reachable_branch_count:accepted.length,
    reachable_unset_branch_count:reachableUnset,
    rejected_branch_count:rejected.length,
    branch_uniqueness:branchUnique,
    constraint_uniqueness:constraintUnique,
    coverage_exhaustive:exhaustive,
    coverage_disjoint_by_single_field_decision:branchUnique,
    explicit_constraint_representable:modelPass,
    status:modelPass?'PASS':'BLOCKED',
    reason:modelPass?'EXPLICIT_VALUE_AND_UNSET_DECISIONS_COVER_REACHABLE_BRANCHES':reachableUnset===0?'NO_REACHABLE_UNSET_BRANCH':accepted.length<2?'INSUFFICIENT_REACHABLE_BRANCHES':!exhaustive?'BRANCH_ACCOUNTING_GAP':'UNIQUENESS_FAILURE',
    rejected_branches:rejected,
    constraints:accepted
  };
}

execFileSync('git',['merge-base','--is-ancestor',SOURCE_HEAD,head],{stdio:'ignore'});
const sourceBlob=execFileSync('git',['rev-parse',`${SOURCE_HEAD}:${PATH}`],{encoding:'utf8'}).trim();
if(sourceBlob!==SOURCE_BLOB)throw new Error('DEPTH8_SOURCE_BLOB_MISMATCH:'+sourceBlob);
const changed=execFileSync('git',['diff','--name-only',`${SOURCE_HEAD}..${head}`],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
if(changed.length!==1||changed[0]!==PATH)throw new Error('DEPTH8_SCOPE_INVALID:'+changed.join(','));
const sourceDir=`${OUT}/depth7-source-${SOURCE_RUN}`;
mkdirSync(sourceDir,{recursive:true});
execFileSync('gh',['run','download',SOURCE_RUN,'--repo',String(process.env.GITHUB_REPOSITORY??'Takuro-Kwkm/sash-app'),'--name',SOURCE_ART,'--dir',sourceDir],{stdio:'inherit',timeout:120000});

const heavy=read(`${sourceDir}/heavy-partition-analysis.json`);
const recursive=read(`${sourceDir}/recursive-partition-plan.json`);
const depth7Plan=read(`${sourceDir}/depth7-safe-representative-partition-plan.json`);
const depth7Proof=read(`${sourceDir}/depth7-safe-representative-coverage-preservation-proof.json`);
const depth7Micro=read(`${sourceDir}/depth7-safe-representative-micro-calibration.json`);
const exhaustedSource=read(`${sourceDir}/exhausted-lane-alternate-partition-model-proof.json`);
const depth7Decision=read(`${sourceDir}/depth7-safe-and-exhausted-proof-decision.json`);
for(const artifact of [heavy,recursive,depth7Plan,depth7Proof,depth7Micro,exhaustedSource,depth7Decision]){
  if(artifact.exact_head!==SOURCE_HEAD)throw new Error('DEPTH8_SOURCE_HEAD_MISMATCH:'+String(artifact.artifact_type??'unknown'));
}
if(depth7Proof.coverage_preservation_status!=='PASS'||depth7Plan.COVERAGE_PRESERVATION_STATUS!=='PASS')throw new Error('DEPTH7_COVERAGE_SOURCE_NOT_PASS');
if(depth7Micro.pass_count!==0||depth7Micro.needs_deeper_split_count!==8||depth7Micro.calibration_invalid_count!==0||depth7Micro.failed_without_safe_required_enum_frontier_count!==5)throw new Error('DEPTH7_MICRO_SOURCE_SHAPE_INVALID');
if(exhaustedSource.source_depth6_exhausted_lane_count!==2||exhaustedSource.proof_pass_count!==0||exhaustedSource.blocked_count!==2||exhaustedSource.alternate_partition_model_status!=='BLOCKED')throw new Error('EXHAUSTED_SOURCE_SHAPE_INVALID');
if(depth7Decision.safe_lane_decision!=='SAFE_REQUIRED_ENUM_FRONTIER_EXHAUSTED_AFTER_DEPTH7'||depth7Decision.full_depth7_execution_authorized!==false||depth7Decision.full_coverage_authorized!==false)throw new Error('DEPTH7_DECISION_SOURCE_INVALID');

const runtime=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');
if(!runtime?.sourcePackageIntegrity?.match)throw new Error('DEPTH8_RUNTIME_INTEGRITY_FAIL');
const binding={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_DEPTH8_AND_EXPLICIT_CONSTRAINT_PROOF_SOURCE_BINDING',
  exact_head:head,
  source_exact_head:SOURCE_HEAD,
  source_run_id:Number(SOURCE_RUN),
  source_analysis_blob:sourceBlob,
  changed_files_since_source:changed,
  current_runtime_manifest_sha256:runtime.sourcePackageIntegrity.actual,
  source_depth7_coverage_status:depth7Proof.coverage_preservation_status,
  source_depth7_micro_decision:depth7Micro.decision,
  source_exhausted_alternate_model_status:exhaustedSource.alternate_partition_model_status,
  source_pass_evidence_reused_as_current_head:false,
  status:'PASS'
};
writeJson(`${OUT}/depth8-source-binding.json`,binding);
writeJson(`${OUT}/heavy-partition-analysis.json`,{...heavy,exact_head:head,evidence_origin:'CURRENT_HEAD_DEPTH8_BINDING',source_bound_exact_head:SOURCE_HEAD,current_head_binding_sha256:hash(binding),source_pass_evidence_reused_as_current_head:false});
writeJson(`${OUT}/recursive-partition-plan.json`,{...recursive,exact_head:head,evidence_origin:'CURRENT_HEAD_DEPTH8_BINDING',source_bound_exact_head:SOURCE_HEAD,current_head_binding_sha256:hash(binding),source_pass_evidence_reused_as_current_head:false});

const depth7ChildById=new Map(depth7Plan.children.map((child)=>[child.PARTITION_ID,child]));
const depth8SourceRows=depth7Micro.results.filter((entry)=>entry.status==='NEEDS_DEEPER_SPLIT'&&Boolean(entry.next_safe_split_field));
const depth7FrontierExhaustedRows=depth7Micro.results.filter((entry)=>entry.status==='NEEDS_DEEPER_SPLIT'&&!entry.next_safe_split_field);
if(depth8SourceRows.length!==3||depth7FrontierExhaustedRows.length!==5)throw new Error(`DEPTH8_LANE_SPLIT_INVALID:${depth8SourceRows.length}:${depth7FrontierExhaustedRows.length}`);

const depth8Parents=[];
const depth8Children=[];
for(const source of depth8SourceRows){
  const depth7Child=depth7ChildById.get(source.depth7_child_partition_id);
  if(!depth7Child)throw new Error('DEPTH8_SOURCE_CHILD_MISSING:'+source.depth7_child_partition_id);
  const seed=depth7Child.SELECTOR_PREFIX??{};
  const resolved=await resolveRuntimeAppProduct(PID,seed);
  for(const [key,value] of Object.entries(seed))if(!same(resolved.selection?.[key],value))throw new Error(`DEPTH8_PARENT_SEED_REJECTED:${source.depth7_child_partition_id}:${key}`);
  const split=safeSplit(resolved,seed);
  if(!split||split.key!==source.next_safe_split_field||split.count!==source.next_safe_split_cardinality)throw new Error('DEPTH8_SPLIT_DRIFT:'+source.depth7_child_partition_id);
  const parent={
    PARTITION_ID:source.depth7_child_partition_id,
    SOURCE_DEPTH6_PARTITION_ID:source.source_depth6_partition_id,
    PRODUCT_NODE:source.product_node,
    WINDOW_ID:String(seed.window_type),
    FLOW_SIGNATURE:flowSignature(resolved),
    SELECTOR_PREFIX:stable(seed),
    NEXT_SPLIT_FIELD:split.key,
    NEXT_SPLIT_FIELD_REQUIRED:true,
    NEXT_SPLIT_FIELD_DATA_TYPE:'ENUM',
    NEXT_SPLIT_CARDINALITY:split.count,
    NEXT_SPLIT_VALUES:split.values,
    PARTITION_DEPTH:7,
    EXACT_HEAD:head,
    STATUS:'DEPTH8_SAFE_SPLIT_PLANNED'
  };
  depth8Parents.push(parent);
  for(const value of split.values){
    const childSeed={...seed,[split.key]:value};
    const childResolved=await resolveRuntimeAppProduct(PID,childSeed);
    for(const [key,parentValue] of Object.entries(childSeed))if(!same(childResolved.selection?.[key],parentValue))throw new Error(`DEPTH8_CHILD_SEED_REJECTED:${parent.PARTITION_ID}:${key}`);
    const childAxes=unresolvedAxes(childResolved,childSeed);
    const next=safeSplit(childResolved,childSeed);
    depth8Children.push({
      PARTITION_ID:`UHC8-${hash([parent.PARTITION_ID,split.key,value]).slice(0,20)}`,
      PARENT_PARTITION_ID:parent.PARTITION_ID,
      PRODUCT_NODE:parent.PRODUCT_NODE,
      WINDOW_ID:parent.WINDOW_ID,
      FLOW_SIGNATURE:flowSignature(childResolved),
      SELECTOR_PREFIX:stable(childSeed),
      SPLIT_FIELD:split.key,
      SPLIT_VALUE:stable(value),
      PARTITION_DEPTH:8,
      REMAINING_SAFE_REQUIRED_ENUM_AXIS_COUNT:childAxes.filter((axis)=>axis.safe).length,
      REMAINING_OPTIONAL_OR_MULTI_AXIS_COUNT:childAxes.filter((axis)=>!axis.safe).length,
      NEXT_SAFE_SPLIT_FIELD:next?.key??null,
      NEXT_SAFE_SPLIT_CARDINALITY:next?.count??0,
      SAFE_REQUIRED_ENUM_FRONTIER_EXHAUSTED:!next,
      EXACT_HEAD:head,
      STATUS:'PLANNED_UNVERIFIED'
    });
  }
}

const depth8Ids=depth8Children.map((child)=>child.PARTITION_ID);
const depth8Overlap=depth8Ids.length-new Set(depth8Ids).size;
const depth8ParentCoverage=new Set(depth8Children.map((child)=>child.PARENT_PARTITION_ID));
let depth8Gap=0;
let depth8UnionMismatch=0;
let depth8PrefixMismatch=0;
let depth8SemanticMismatch=0;
let depth8CardinalityMismatch=0;
const depth8ParentProofs=[];
for(const parent of depth8Parents){
  const children=depth8Children.filter((child)=>child.PARENT_PARTITION_ID===parent.PARTITION_ID);
  const expected=new Set(parent.NEXT_SPLIT_VALUES.map(sj));
  const actual=new Set(children.map((child)=>sj(child.SPLIT_VALUE)));
  const unionOk=expected.size===actual.size&&[...expected].every((value)=>actual.has(value));
  const cardinalityOk=children.length===parent.NEXT_SPLIT_CARDINALITY&&actual.size===children.length;
  const semanticOk=parent.NEXT_SPLIT_FIELD_REQUIRED===true&&parent.NEXT_SPLIT_FIELD_DATA_TYPE==='ENUM';
  let prefixOk=true;
  for(const child of children){
    const kept=Object.entries(parent.SELECTOR_PREFIX).every(([key,value])=>same(child.SELECTOR_PREFIX?.[key],value));
    const extra=Object.keys(child.SELECTOR_PREFIX).filter((key)=>!Object.prototype.hasOwnProperty.call(parent.SELECTOR_PREFIX,key));
    if(!kept||extra.length!==1||extra[0]!==parent.NEXT_SPLIT_FIELD){prefixOk=false;break;}
  }
  if(children.length!==parent.NEXT_SPLIT_CARDINALITY)depth8Gap+=1;
  if(!unionOk)depth8UnionMismatch+=1;
  if(!prefixOk)depth8PrefixMismatch+=1;
  if(!semanticOk)depth8SemanticMismatch+=1;
  if(!cardinalityOk)depth8CardinalityMismatch+=1;
  depth8ParentProofs.push({
    PARENT_PARTITION_ID:parent.PARTITION_ID,
    PRODUCT_NODE:parent.PRODUCT_NODE,
    SPLIT_FIELD:parent.NEXT_SPLIT_FIELD,
    EXPECTED_VALUE_COUNT:expected.size,
    ACTUAL_CHILD_COUNT:children.length,
    PARENT_UNION_EQUALS_CHILDREN:unionOk,
    CHILD_PREFIX_PRESERVATION:prefixOk,
    CHILD_CARDINALITY_AND_UNIQUENESS:cardinalityOk,
    SPLIT_SEMANTICS_VALID:semanticOk,
    STATUS:unionOk&&prefixOk&&cardinalityOk&&semanticOk?'PASS':'FAIL'
  });
}
const depth8Unsplit=depth8Parents.filter((parent)=>!depth8ParentCoverage.has(parent.PARTITION_ID));
const depth8CoverageOk=!depth8Overlap&&!depth8Gap&&!depth8Unsplit.length&&!depth8UnionMismatch&&!depth8PrefixMismatch&&!depth8SemanticMismatch&&!depth8CardinalityMismatch&&depth8ParentCoverage.size===depth8Parents.length;
const depth8Proof={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_DEPTH8_SAFE_LANE_REPRESENTATIVE_COVERAGE_PRESERVATION_PROOF',
  exact_head:head,
  parent_partition_count:depth8Parents.length,
  child_partition_count:depth8Children.length,
  PARTITION_OVERLAP_COUNT:depth8Overlap,
  PARTITION_GAP_COUNT:depth8Gap,
  UNSPLITTABLE_PARENT_COUNT:depth8Unsplit.length,
  PARENT_UNION_MISMATCH_COUNT:depth8UnionMismatch,
  CHILD_PREFIX_MISMATCH_COUNT:depth8PrefixMismatch,
  SPLIT_SEMANTIC_MISMATCH_COUNT:depth8SemanticMismatch,
  PARENT_CHILD_CARDINALITY_MISMATCH_COUNT:depth8CardinalityMismatch,
  parents:depth8ParentProofs,
  coverage_preservation_status:depth8CoverageOk?'PASS':'FAIL',
  full_depth8_execution_authorized:false,
  full_coverage_authorized:false,
  status:depth8CoverageOk?'PASS':'FAIL'
};
const depth8Plan={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_DEPTH8_SAFE_LANE_REPRESENTATIVE_PARTITION_PLAN',
  exact_head:head,
  partition_depth:8,
  source_depth7_failed_with_safe_frontier_count:depth8SourceRows.length,
  parent_partition_count:depth8Parents.length,
  child_partition_count:depth8Children.length,
  COVERAGE_PRESERVATION_STATUS:depth8Proof.coverage_preservation_status,
  parents:depth8Parents,
  children:depth8Children,
  full_depth8_execution_authorized:false,
  full_coverage_authorized:false,
  status:depth8CoverageOk?'DIAGNOSTIC_PLAN_READY':'BLOCKED'
};
writeJson(`${OUT}/depth8-safe-representative-partition-plan.json`,depth8Plan);
writeJson(`${OUT}/depth8-safe-representative-coverage-preservation-proof.json`,depth8Proof);
console.log(`DEPTH8_SAFE_PARENT_COUNT=${depth8Parents.length}`);
console.log(`DEPTH8_SAFE_CHILD_COUNT=${depth8Children.length}`);
console.log(`DEPTH8_SAFE_COVERAGE_PRESERVATION_STATUS=${depth8Proof.coverage_preservation_status}`);
if(!depth8CoverageOk)throw new Error('DEPTH8_SAFE_COVERAGE_BLOCKED');

const depth8MicroResults=[];
for(const [index,parent] of depth8Parents.entries()){
  const child=depth8Children
    .filter((candidate)=>candidate.PARENT_PARTITION_ID===parent.PARTITION_ID)
    .sort((a,b)=>sj(a.SPLIT_VALUE).localeCompare(sj(b.SPLIT_VALUE)))[0];
  const measured=micro(child,index);
  const passed=measured.outcome==='COMPLETED';
  const needsDeeper=['TIMEOUT','STATE_LIMIT_REACHED','TERMINAL_LIMIT_REACHED'].includes(measured.outcome);
  const status=passed?'PASS':needsDeeper?'NEEDS_DEEPER_SPLIT':'CALIBRATION_INVALID';
  depth8MicroResults.push({
    index,
    product_node:parent.PRODUCT_NODE,
    source_depth7_partition_id:parent.PARTITION_ID,
    depth8_child_partition_id:child.PARTITION_ID,
    split_field:child.SPLIT_FIELD,
    split_value:child.SPLIT_VALUE,
    next_safe_split_field:child.NEXT_SAFE_SPLIT_FIELD,
    next_safe_split_cardinality:child.NEXT_SAFE_SPLIT_CARDINALITY,
    ...measured,
    status
  });
  console.log(`DEPTH8_SAFE_MICRO node=${parent.PRODUCT_NODE} status=${status} elapsed_ms=${measured.elapsed_ms} states=${measured.visited_state_count} terminals=${measured.terminal_context_count}`);
}
const depth8MicroPass=depth8MicroResults.filter((entry)=>entry.status==='PASS');
const depth8MicroDeep=depth8MicroResults.filter((entry)=>entry.status==='NEEDS_DEEPER_SPLIT');
const depth8MicroInvalid=depth8MicroResults.filter((entry)=>entry.status==='CALIBRATION_INVALID');
const depth8NoFrontier=depth8MicroDeep.filter((entry)=>!entry.next_safe_split_field);
let depth8Decision='DEPTH8_REPRESENTATIVE_FAST_PATH_PROMISING';
if(depth8MicroInvalid.length)depth8Decision='DEPTH8_SAFE_CALIBRATION_INVALID';
else if(depth8NoFrontier.length)depth8Decision='SAFE_REQUIRED_ENUM_FRONTIER_EXHAUSTED_AFTER_DEPTH8';
else if(depth8MicroDeep.length)depth8Decision='DEPTH9_REQUIRED_FOR_FAILED_SAFE_REPRESENTATIVES';
const depth8MicroSummary={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_DEPTH8_SAFE_LANE_REPRESENTATIVE_MICRO_CALIBRATION',
  exact_head:head,
  task_classification:'NON-PRODUCT-MASTER',
  product_master_mutation:0,
  selected_child_count:depth8MicroResults.length,
  child_timeout_ms:TIMEOUT,
  pass_count:depth8MicroPass.length,
  needs_deeper_split_count:depth8MicroDeep.length,
  calibration_invalid_count:depth8MicroInvalid.length,
  failed_without_safe_required_enum_frontier_count:depth8NoFrontier.length,
  results:depth8MicroResults,
  full_depth8_execution_authorized:false,
  full_coverage_authorized:false,
  decision:depth8Decision,
  status:depth8MicroInvalid.length?'BLOCKED':'MEASURED_CALIBRATION_ONLY'
};
writeJson(`${OUT}/depth8-safe-representative-micro-calibration.json`,depth8MicroSummary);

const exhaustedLanes=[];
for(const source of depth7FrontierExhaustedRows){
  const child=depth7ChildById.get(source.depth7_child_partition_id);
  if(!child)throw new Error('DEPTH7_EXHAUSTED_CHILD_MISSING:'+source.depth7_child_partition_id);
  exhaustedLanes.push({
    lane_id:child.PARTITION_ID,
    source_lane:'DEPTH7_SAFE_FRONTIER_EXHAUSTED',
    product_node:source.product_node,
    selector_prefix:stable(child.SELECTOR_PREFIX??{}),
    source_partition_id:child.PARTITION_ID
  });
}
for(const lane of exhaustedSource.lanes){
  exhaustedLanes.push({
    lane_id:lane.depth6_parent_partition_id,
    source_lane:'DEPTH6_SAFE_FRONTIER_EXHAUSTED',
    product_node:lane.product_node,
    selector_prefix:stable(lane.selector_prefix??{}),
    source_partition_id:lane.depth6_parent_partition_id
  });
}
if(exhaustedLanes.length!==7||new Set(exhaustedLanes.map((lane)=>lane.lane_id)).size!==7)throw new Error('EXPLICIT_CONSTRAINT_LANE_COUNT_INVALID');

const constraintLaneProofs=[];
for(const lane of exhaustedLanes){
  const seed=lane.selector_prefix;
  const resolved=await resolveRuntimeAppProduct(PID,seed);
  for(const [key,value] of Object.entries(seed))if(!same(resolved.selection?.[key],value))throw new Error(`EXPLICIT_CONSTRAINT_PARENT_SEED_REJECTED:${lane.lane_id}:${key}`);
  if(safeSplit(resolved,seed))throw new Error('EXPLICIT_CONSTRAINT_SAFE_FRONTIER_DRIFT:'+lane.lane_id);
  const candidates=(resolved.fields??[]).filter((field)=>
    !field.readOnly&&
    !TECH.has(field.key)&&
    !CONT.has(field.key)&&
    !Object.prototype.hasOwnProperty.call(seed,field.key)&&
    ['ENUM','MULTI_ENUM'].includes(field.dataType)&&
    enabled(field).length>0
  );
  const candidateProofs=[];
  let chosen=null;
  for(const field of candidates){
    const proof=await proveExplicitConstraintCandidate(lane,field);
    candidateProofs.push(proof);
    if(!chosen&&proof.status==='PASS'&&proof.reachable_unset_branch_count>0)chosen=proof;
  }
  constraintLaneProofs.push({
    lane_id:lane.lane_id,
    source_lane:lane.source_lane,
    product_node:lane.product_node,
    source_partition_id:lane.source_partition_id,
    selector_prefix:lane.selector_prefix,
    unresolved_candidate_field_count:candidates.length,
    candidate_proofs:candidateProofs,
    selected_constraint_field:chosen?.field_key??null,
    selected_constraint_data_type:chosen?.data_type??null,
    selected_reachable_branch_count:chosen?.reachable_branch_count??0,
    selected_reachable_unset_branch_count:chosen?.reachable_unset_branch_count??0,
    explicit_decision_constraint_model_status:chosen?'PASS':'BLOCKED',
    runner_constraint_support_implemented:false,
    execution_authorized:false,
    status:chosen?'MODEL_PROOF_PASS_IMPLEMENTATION_NOT_AUTHORIZED':'BLOCKED'
  });
}
const constraintPass=constraintLaneProofs.filter((lane)=>lane.explicit_decision_constraint_model_status==='PASS');
const constraintBlocked=constraintLaneProofs.filter((lane)=>lane.explicit_decision_constraint_model_status!=='PASS');
const constraintProof={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_EXPLICIT_DECISION_CONSTRAINT_PARTITION_MODEL_PROOF',
  exact_head:head,
  model:{
    partition_seed_role:'PRESERVE_POSITIVE_VALUE_PREFIX_ONLY',
    decision_constraint_shape:{field_key:'<selector>',decision:{kind:'VALUE|UNSET',value:'VALUE_ONLY'}},
    unset_semantics:'FIELD_MUST_REMAIN_UNSELECTED_AFTER_RUNTIME_RESOLUTION',
    value_semantics:'FIELD_MUST_EQUAL_THE_CONSTRAINED_VALUE_AFTER_RUNTIME_RESOLUTION',
    coverage_semantics:'ONE_CONSTRAINED_SELECTOR_BRANCH_PER_REACHABLE_DECISION',
    overlap_semantics:'BRANCHES_FOR_THE_SAME_FIELD_ARE_MUTUALLY_EXCLUSIVE',
    runner_support_status:'NOT_IMPLEMENTED_PROOF_ONLY'
  },
  lane_count:constraintLaneProofs.length,
  proof_pass_count:constraintPass.length,
  blocked_count:constraintBlocked.length,
  lanes:constraintLaneProofs,
  explicit_decision_constraint_model_status:constraintBlocked.length===0?'PASS':'BLOCKED',
  runner_constraint_support_implemented:false,
  constraint_execution_authorized:false,
  full_coverage_authorized:false,
  status:constraintBlocked.length===0?'MODEL_PROOF_COMPLETE_IMPLEMENTATION_NOT_AUTHORIZED':'MODEL_PROOF_BLOCKED'
};
writeJson(`${OUT}/explicit-decision-constraint-partition-model-proof.json`,constraintProof);

const finalStatus=depth8MicroInvalid.length||constraintBlocked.length?'BLOCKED':'DIAGNOSTIC_COMPLETE';
const nextDecision={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_DEPTH8_AND_EXPLICIT_CONSTRAINT_PROOF_DECISION',
  exact_head:head,
  source_depth7_exact_head:SOURCE_HEAD,
  depth8_parent_count:depth8Parents.length,
  depth8_child_count:depth8Children.length,
  depth8_coverage_preservation_status:depth8Proof.coverage_preservation_status,
  depth8_micro_pass_count:depth8MicroPass.length,
  depth8_micro_needs_deeper_split_count:depth8MicroDeep.length,
  depth8_micro_calibration_invalid_count:depth8MicroInvalid.length,
  depth8_failed_without_safe_required_enum_frontier_count:depth8NoFrontier.length,
  depth8_decision:depth8Decision,
  explicit_constraint_lane_count:constraintLaneProofs.length,
  explicit_constraint_model_status:constraintProof.explicit_decision_constraint_model_status,
  explicit_constraint_proof_pass_count:constraintPass.length,
  explicit_constraint_proof_blocked_count:constraintBlocked.length,
  runner_constraint_support_implemented:false,
  constraint_execution_authorized:false,
  full_depth8_execution_authorized:false,
  full_coverage_authorized:false,
  UCHIRIMO_QA_STATUS:'UNVERIFIED',
  APP_INTEGRATION_READY:false,
  RELEASE_INPUT_GATE:'BLOCKED',
  status:finalStatus
};
writeJson(`${OUT}/depth8-and-explicit-constraint-proof-decision.json`,nextDecision);
console.log(`DEPTH8_SAFE_MICRO_PASS_COUNT=${depth8MicroPass.length}/${depth8MicroResults.length}`);
console.log(`DEPTH8_SAFE_MICRO_INVALID_COUNT=${depth8MicroInvalid.length}`);
console.log(`DEPTH8_SAFE_DECISION=${depth8Decision}`);
console.log(`EXPLICIT_CONSTRAINT_MODEL_STATUS=${constraintProof.explicit_decision_constraint_model_status}`);
console.log(`EXPLICIT_CONSTRAINT_MODEL_PASS_COUNT=${constraintPass.length}/${constraintLaneProofs.length}`);
console.log('RUNNER_CONSTRAINT_SUPPORT_IMPLEMENTED=FALSE');
console.log('CONSTRAINT_EXECUTION_AUTHORIZED=FALSE');
console.log('UCHIRIMO_FULL_COVERAGE_QA_GATE=BLOCKED');
console.log('APP_INTEGRATION_READY=FALSE');
console.log('RELEASE_INPUT_GATE=BLOCKED');
if(depth8MicroInvalid.length)throw new Error('DEPTH8_SAFE_MICRO_INVALID');
if(constraintBlocked.length)throw new Error('EXPLICIT_CONSTRAINT_MODEL_PROOF_BLOCKED');
