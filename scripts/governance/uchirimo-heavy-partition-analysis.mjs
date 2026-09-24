import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { resolveRuntimeAppProduct } from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { currentExactHead, writeJson } from './governance-lib.mjs';

const PID='SER-YKKAP-UCHIRIMO';
const SOURCE_RUN='35971594281';
const SOURCE_HEAD='5817e64afaf207568d63fe039c6c36ca98f9c84c';
const SOURCE_BLOB='5952a87362e14364c38567ebafd520a3f2639031';
const PATH='scripts/governance/uchirimo-heavy-partition-analysis.mjs';
const SOURCE_ART='uchirimo-heavy-recovery-analysis-'+SOURCE_HEAD;
const OUT=String(process.env.UCHIRIMO_HEAVY_ANALYSIS_OUT??'artifacts/uchirimo-heavy-recovery');
const TIMEOUT=Number(process.env.UCHIRIMO_DEPTH7_MICRO_CHILD_TIMEOUT_MS??60000);
const MAXS=1000000;
const MAXT=1000000;
const head=currentExactHead();
if(!Number.isFinite(TIMEOUT)||TIMEOUT<60000)throw new Error('DEPTH7_TIMEOUT_INVALID');
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
  const dir=`${OUT}/depth7-safe-micro/case-${id}`;
  const batchId=`depth7-safe-micro-${id}`;
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
  if(decision.kind==='UNSET')return !result.fields.find((field)=>field.key===key)?.required||!present(result.selection?.[key]);
  return same(result.selection?.[key],decision.value);
}

async function proveAlternateCandidate(parent,field){
  const sourceSeed=parent.SELECTOR_PREFIX;
  const branchModel=runnerBranches(field);
  if(branchModel.symbolic_required){
    return {
      field_key:field.key,
      data_type:field.dataType,
      required:field.required===true,
      enabled_value_count:enabled(field).length,
      status:'BLOCKED',
      reason:'MULTI_ENUM_SYMBOLIC_PROOF_REQUIRED',
      seed_representable:false,
      reachable_branch_count:null,
      dependency_rejected_branch_count:null,
      children:[]
    };
  }
  const sourceResolved=await resolveRuntimeAppProduct(PID,sourceSeed);
  const priorDecisions=Object.fromEntries(Object.entries(sourceSeed).map(([key,value])=>[key,{kind:'VALUE',value}]));
  const accepted=[];
  const rejected=[];
  const unrepresentable=[];
  for(const branch of branchModel.branches){
    const input=applyBranch(sourceResolved.selection??sourceSeed,field,branch);
    const child=await resolveRuntimeAppProduct(PID,input);
    const branchSurvives=branch.kind==='UNSET'
      ? (!field.required&&!present(child.selection?.[field.key]))
      : same(child.selection?.[field.key],branch.value);
    const priorSurvive=Object.entries(priorDecisions).every(([key,decision])=>decisionSurvives(child,key,decision));
    if(!branchSurvives||!priorSurvive){
      rejected.push({branch:stable(branch),reason:!branchSurvives?'BRANCH_REJECTED_OR_CLEARED':'PRIOR_PREFIX_CLEARED'});
      continue;
    }
    if(branch.kind==='UNSET'){
      unrepresentable.push({branch:stable(branch),reason:'CURRENT_PARTITION_SEED_CANNOT_ENCODE_EXPLICIT_UNSET'});
      continue;
    }
    const childSeed={...sourceSeed,[field.key]:branch.value};
    const seeded=await resolveRuntimeAppProduct(PID,childSeed);
    const seedPreserved=Object.entries(childSeed).every(([key,value])=>same(seeded.selection?.[key],value));
    if(!seedPreserved){
      unrepresentable.push({branch:stable(branch),reason:'EXPLICIT_SEED_NOT_PRESERVED'});
      continue;
    }
    accepted.push({
      branch:stable(branch),
      selector_prefix:stable(childSeed),
      flow_signature:flowSignature(seeded)
    });
  }
  const branchKeys=accepted.map((row)=>sj(row.branch));
  const seedKeys=accepted.map((row)=>sj(row.selector_prefix));
  const uniqueBranches=new Set(branchKeys).size===branchKeys.length;
  const uniqueSeeds=new Set(seedKeys).size===seedKeys.length;
  const reachableCount=accepted.length+unrepresentable.length;
  const coverageRepresentable=unrepresentable.length===0&&accepted.length>=2&&uniqueBranches&&uniqueSeeds;
  return {
    field_key:field.key,
    data_type:field.dataType,
    required:field.required===true,
    enabled_value_count:enabled(field).length,
    runner_branch_count:branchModel.branches.length,
    reachable_branch_count:reachableCount,
    dependency_rejected_branch_count:rejected.length,
    unrepresentable_reachable_branch_count:unrepresentable.length,
    child_partition_count:accepted.length,
    branch_uniqueness:uniqueBranches,
    seed_uniqueness:uniqueSeeds,
    coverage_preservation_status:coverageRepresentable?'PASS':'FAIL',
    seed_representable:coverageRepresentable,
    status:coverageRepresentable?'PASS':'BLOCKED',
    reason:coverageRepresentable?'ALL_REACHABLE_BRANCHES_EXPLICITLY_SEED_REPRESENTABLE':unrepresentable.length?'REACHABLE_BRANCH_NOT_SEED_REPRESENTABLE':accepted.length<2?'INSUFFICIENT_REPRESENTABLE_BRANCHES':'UNIQUENESS_FAILURE',
    rejected_branches:rejected,
    unrepresentable_branches:unrepresentable,
    children:accepted
  };
}

execFileSync('git',['merge-base','--is-ancestor',SOURCE_HEAD,head],{stdio:'ignore'});
const sourceBlob=execFileSync('git',['rev-parse',`${SOURCE_HEAD}:${PATH}`],{encoding:'utf8'}).trim();
if(sourceBlob!==SOURCE_BLOB)throw new Error('NEXT_STAGE_SOURCE_BLOB_MISMATCH:'+sourceBlob);
const changed=execFileSync('git',['diff','--name-only',`${SOURCE_HEAD}..${head}`],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
if(changed.length!==1||changed[0]!==PATH)throw new Error('NEXT_STAGE_SCOPE_INVALID:'+changed.join(','));
const sourceDir=`${OUT}/depth6-source-${SOURCE_RUN}`;
mkdirSync(sourceDir,{recursive:true});
execFileSync('gh',['run','download',SOURCE_RUN,'--repo',String(process.env.GITHUB_REPOSITORY??'Takuro-Kwkm/sash-app'),'--name',SOURCE_ART,'--dir',sourceDir],{stdio:'inherit',timeout:120000});

const heavy=read(`${sourceDir}/heavy-partition-analysis.json`);
const recursive=read(`${sourceDir}/recursive-partition-plan.json`);
const depth6Plan=read(`${sourceDir}/depth6-representative-partition-plan.json`);
const depth6Proof=read(`${sourceDir}/depth6-representative-coverage-preservation-proof.json`);
const depth6Micro=read(`${sourceDir}/depth6-representative-micro-calibration.json`);
const depth6Decision=read(`${sourceDir}/depth6-diagnostic-decision.json`);
for(const artifact of [heavy,recursive,depth6Plan,depth6Proof,depth6Micro,depth6Decision]){
  if(artifact.exact_head!==SOURCE_HEAD)throw new Error('NEXT_STAGE_SOURCE_HEAD_MISMATCH:'+String(artifact.artifact_type??'unknown'));
}
if(depth6Proof.coverage_preservation_status!=='PASS'||depth6Plan.COVERAGE_PRESERVATION_STATUS!=='PASS')throw new Error('DEPTH6_COVERAGE_SOURCE_NOT_PASS');
if(depth6Micro.pass_count!==0||depth6Micro.needs_deeper_split_count!==10||depth6Micro.calibration_invalid_count!==0||depth6Micro.failed_without_safe_required_enum_frontier_count!==2)throw new Error('DEPTH6_MICRO_SOURCE_SHAPE_INVALID');
if(depth6Decision.representative_decision!=='SAFE_REQUIRED_ENUM_FRONTIER_EXHAUSTED_FOR_FAILED_REPRESENTATIVES'||depth6Decision.full_depth6_execution_authorized!==false||depth6Decision.full_coverage_authorized!==false)throw new Error('DEPTH6_DECISION_SOURCE_INVALID');

const runtime=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');
if(!runtime?.sourcePackageIntegrity?.match)throw new Error('NEXT_STAGE_RUNTIME_INTEGRITY_FAIL');
const binding={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_DEPTH7_AND_EXHAUSTED_PROOF_SOURCE_BINDING',
  exact_head:head,
  source_exact_head:SOURCE_HEAD,
  source_run_id:Number(SOURCE_RUN),
  source_analysis_blob:sourceBlob,
  changed_files_since_source:changed,
  current_runtime_manifest_sha256:runtime.sourcePackageIntegrity.actual,
  source_depth6_coverage_status:depth6Proof.coverage_preservation_status,
  source_depth6_micro_decision:depth6Micro.decision,
  source_pass_evidence_reused_as_current_head:false,
  status:'PASS'
};
writeJson(`${OUT}/next-stage-source-binding.json`,binding);
writeJson(`${OUT}/heavy-partition-analysis.json`,{...heavy,exact_head:head,evidence_origin:'CURRENT_HEAD_NEXT_STAGE_BINDING',source_bound_exact_head:SOURCE_HEAD,current_head_binding_sha256:hash(binding),source_pass_evidence_reused_as_current_head:false});
writeJson(`${OUT}/recursive-partition-plan.json`,{...recursive,exact_head:head,evidence_origin:'CURRENT_HEAD_NEXT_STAGE_BINDING',source_bound_exact_head:SOURCE_HEAD,current_head_binding_sha256:hash(binding),source_pass_evidence_reused_as_current_head:false});

const childById=new Map(depth6Plan.children.map((child)=>[child.PARTITION_ID,child]));
const failed=depth6Micro.results.filter((row)=>row.status==='NEEDS_DEEPER_SPLIT');
const safeLaneRows=failed.filter((row)=>Boolean(row.next_safe_split_field));
const exhaustedRows=failed.filter((row)=>!row.next_safe_split_field);
if(failed.length!==10||safeLaneRows.length!==8||exhaustedRows.length!==2)throw new Error(`NEXT_STAGE_LANE_SPLIT_INVALID:${failed.length}:${safeLaneRows.length}:${exhaustedRows.length}`);

const safeParents=[];
const safeChildren=[];
for(const source of safeLaneRows){
  const depth6Child=childById.get(source.depth6_child_partition_id);
  if(!depth6Child)throw new Error('DEPTH7_SOURCE_CHILD_MISSING:'+source.depth6_child_partition_id);
  const seed=depth6Child.SELECTOR_PREFIX??{};
  const resolved=await resolveRuntimeAppProduct(PID,seed);
  for(const [key,value] of Object.entries(seed))if(!same(resolved.selection?.[key],value))throw new Error(`DEPTH7_PARENT_SEED_REJECTED:${source.depth6_child_partition_id}:${key}`);
  const split=safeSplit(resolved,seed);
  if(!split||split.key!==source.next_safe_split_field||split.count!==source.next_safe_split_cardinality)throw new Error('DEPTH7_SPLIT_DRIFT:'+source.depth6_child_partition_id);
  const parent={
    PARTITION_ID:source.depth6_child_partition_id,
    SOURCE_DEPTH5_PARTITION_ID:source.source_depth5_partition_id,
    PRODUCT_NODE:source.product_node,
    WINDOW_ID:String(seed.window_type),
    FLOW_SIGNATURE:flowSignature(resolved),
    SELECTOR_PREFIX:stable(seed),
    NEXT_SPLIT_FIELD:split.key,
    NEXT_SPLIT_FIELD_REQUIRED:true,
    NEXT_SPLIT_FIELD_DATA_TYPE:'ENUM',
    NEXT_SPLIT_CARDINALITY:split.count,
    NEXT_SPLIT_VALUES:split.values,
    PARTITION_DEPTH:6,
    EXACT_HEAD:head,
    STATUS:'DEPTH7_SAFE_SPLIT_PLANNED'
  };
  safeParents.push(parent);
  for(const value of split.values){
    const childSeed={...seed,[split.key]:value};
    const childResolved=await resolveRuntimeAppProduct(PID,childSeed);
    for(const [key,parentValue] of Object.entries(childSeed))if(!same(childResolved.selection?.[key],parentValue))throw new Error(`DEPTH7_CHILD_SEED_REJECTED:${parent.PARTITION_ID}:${key}`);
    const childAxes=unresolvedAxes(childResolved,childSeed);
    const next=safeSplit(childResolved,childSeed);
    safeChildren.push({
      PARTITION_ID:`UHC7-${hash([parent.PARTITION_ID,split.key,value]).slice(0,20)}`,
      PARENT_PARTITION_ID:parent.PARTITION_ID,
      PRODUCT_NODE:parent.PRODUCT_NODE,
      WINDOW_ID:parent.WINDOW_ID,
      FLOW_SIGNATURE:flowSignature(childResolved),
      SELECTOR_PREFIX:stable(childSeed),
      SPLIT_FIELD:split.key,
      SPLIT_VALUE:stable(value),
      PARTITION_DEPTH:7,
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

const safeIds=safeChildren.map((child)=>child.PARTITION_ID);
const safeOverlap=safeIds.length-new Set(safeIds).size;
const safeParentCoverage=new Set(safeChildren.map((child)=>child.PARENT_PARTITION_ID));
let safeGap=0;
let safeUnionMismatch=0;
let safePrefixMismatch=0;
let safeSemanticMismatch=0;
let safeCardinalityMismatch=0;
const safeParentProofs=[];
for(const parent of safeParents){
  const children=safeChildren.filter((child)=>child.PARENT_PARTITION_ID===parent.PARTITION_ID);
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
  if(children.length!==parent.NEXT_SPLIT_CARDINALITY)safeGap+=1;
  if(!unionOk)safeUnionMismatch+=1;
  if(!prefixOk)safePrefixMismatch+=1;
  if(!semanticOk)safeSemanticMismatch+=1;
  if(!cardinalityOk)safeCardinalityMismatch+=1;
  safeParentProofs.push({
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
const safeUnsplit=safeParents.filter((parent)=>!safeParentCoverage.has(parent.PARTITION_ID));
const safeCoverageOk=!safeOverlap&&!safeGap&&!safeUnsplit.length&&!safeUnionMismatch&&!safePrefixMismatch&&!safeSemanticMismatch&&!safeCardinalityMismatch&&safeParentCoverage.size===safeParents.length;
const safeProof={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_DEPTH7_SAFE_LANE_REPRESENTATIVE_COVERAGE_PRESERVATION_PROOF',
  exact_head:head,
  parent_partition_count:safeParents.length,
  child_partition_count:safeChildren.length,
  PARTITION_OVERLAP_COUNT:safeOverlap,
  PARTITION_GAP_COUNT:safeGap,
  UNSPLITTABLE_PARENT_COUNT:safeUnsplit.length,
  PARENT_UNION_MISMATCH_COUNT:safeUnionMismatch,
  CHILD_PREFIX_MISMATCH_COUNT:safePrefixMismatch,
  SPLIT_SEMANTIC_MISMATCH_COUNT:safeSemanticMismatch,
  PARENT_CHILD_CARDINALITY_MISMATCH_COUNT:safeCardinalityMismatch,
  parents:safeParentProofs,
  coverage_preservation_status:safeCoverageOk?'PASS':'FAIL',
  full_depth7_execution_authorized:false,
  full_coverage_authorized:false,
  status:safeCoverageOk?'PASS':'FAIL'
};
const safePlan={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_DEPTH7_SAFE_LANE_REPRESENTATIVE_PARTITION_PLAN',
  exact_head:head,
  partition_depth:7,
  source_depth6_failed_count:failed.length,
  safe_lane_parent_count:safeParents.length,
  child_partition_count:safeChildren.length,
  exhausted_lane_count:exhaustedRows.length,
  COVERAGE_PRESERVATION_STATUS:safeProof.coverage_preservation_status,
  parents:safeParents,
  children:safeChildren,
  full_depth7_execution_authorized:false,
  full_coverage_authorized:false,
  status:safeCoverageOk?'DIAGNOSTIC_PLAN_READY':'BLOCKED'
};
writeJson(`${OUT}/depth7-safe-representative-partition-plan.json`,safePlan);
writeJson(`${OUT}/depth7-safe-representative-coverage-preservation-proof.json`,safeProof);
console.log(`DEPTH7_SAFE_PARENT_COUNT=${safeParents.length}`);
console.log(`DEPTH7_SAFE_CHILD_COUNT=${safeChildren.length}`);
console.log(`DEPTH7_SAFE_COVERAGE_PRESERVATION_STATUS=${safeProof.coverage_preservation_status}`);
if(!safeCoverageOk)throw new Error('DEPTH7_SAFE_COVERAGE_BLOCKED');

const safeMicroResults=[];
for(const [index,parent] of safeParents.entries()){
  const child=safeChildren
    .filter((candidate)=>candidate.PARENT_PARTITION_ID===parent.PARTITION_ID)
    .sort((a,b)=>sj(a.SPLIT_VALUE).localeCompare(sj(b.SPLIT_VALUE)))[0];
  const measured=micro(child,index);
  const passed=measured.outcome==='COMPLETED';
  const needsDeeper=['TIMEOUT','STATE_LIMIT_REACHED','TERMINAL_LIMIT_REACHED'].includes(measured.outcome);
  const status=passed?'PASS':needsDeeper?'NEEDS_DEEPER_SPLIT':'CALIBRATION_INVALID';
  safeMicroResults.push({
    index,
    product_node:parent.PRODUCT_NODE,
    source_depth6_partition_id:parent.PARTITION_ID,
    depth7_child_partition_id:child.PARTITION_ID,
    split_field:child.SPLIT_FIELD,
    split_value:child.SPLIT_VALUE,
    next_safe_split_field:child.NEXT_SAFE_SPLIT_FIELD,
    next_safe_split_cardinality:child.NEXT_SAFE_SPLIT_CARDINALITY,
    ...measured,
    status
  });
  console.log(`DEPTH7_SAFE_MICRO node=${parent.PRODUCT_NODE} status=${status} elapsed_ms=${measured.elapsed_ms} states=${measured.visited_state_count} terminals=${measured.terminal_context_count}`);
}
const safeMicroPass=safeMicroResults.filter((row)=>row.status==='PASS');
const safeMicroDeep=safeMicroResults.filter((row)=>row.status==='NEEDS_DEEPER_SPLIT');
const safeMicroInvalid=safeMicroResults.filter((row)=>row.status==='CALIBRATION_INVALID');
const safeMicroNoFrontier=safeMicroDeep.filter((row)=>!row.next_safe_split_field);
let safeDecision='DEPTH7_SAFE_REPRESENTATIVE_FAST_PATH_PROMISING';
if(safeMicroInvalid.length)safeDecision='DEPTH7_SAFE_CALIBRATION_INVALID';
else if(safeMicroNoFrontier.length)safeDecision='SAFE_REQUIRED_ENUM_FRONTIER_EXHAUSTED_AFTER_DEPTH7';
else if(safeMicroDeep.length)safeDecision='DEPTH8_REQUIRED_FOR_FAILED_SAFE_REPRESENTATIVES';
const safeMicroSummary={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_DEPTH7_SAFE_LANE_REPRESENTATIVE_MICRO_CALIBRATION',
  exact_head:head,
  task_classification:'NON-PRODUCT-MASTER',
  product_master_mutation:0,
  selected_child_count:safeMicroResults.length,
  child_timeout_ms:TIMEOUT,
  pass_count:safeMicroPass.length,
  needs_deeper_split_count:safeMicroDeep.length,
  calibration_invalid_count:safeMicroInvalid.length,
  failed_without_safe_required_enum_frontier_count:safeMicroNoFrontier.length,
  results:safeMicroResults,
  full_depth7_execution_authorized:false,
  full_coverage_authorized:false,
  decision:safeDecision,
  status:safeMicroInvalid.length?'BLOCKED':'MEASURED_CALIBRATION_ONLY'
};
writeJson(`${OUT}/depth7-safe-representative-micro-calibration.json`,safeMicroSummary);

const exhaustedProofRows=[];
for(const source of exhaustedRows){
  const parent=childById.get(source.depth6_child_partition_id);
  if(!parent)throw new Error('EXHAUSTED_SOURCE_CHILD_MISSING:'+source.depth6_child_partition_id);
  const seed=parent.SELECTOR_PREFIX??{};
  const resolved=await resolveRuntimeAppProduct(PID,seed);
  for(const [key,value] of Object.entries(seed))if(!same(resolved.selection?.[key],value))throw new Error(`EXHAUSTED_PARENT_SEED_REJECTED:${parent.PARTITION_ID}:${key}`);
  if(safeSplit(resolved,seed))throw new Error('EXHAUSTED_SAFE_FRONTIER_DRIFT:'+parent.PARTITION_ID);
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
    const proof=await proveAlternateCandidate(parent,field);
    candidateProofs.push(proof);
    if(!chosen&&proof.status==='PASS')chosen=proof;
  }
  exhaustedProofRows.push({
    product_node:source.product_node,
    source_depth5_partition_id:source.source_depth5_partition_id,
    depth6_parent_partition_id:parent.PARTITION_ID,
    selector_prefix:stable(seed),
    unresolved_candidate_field_count:candidates.length,
    candidate_proofs:candidateProofs,
    selected_alternate_field:chosen?.field_key??null,
    selected_alternate_data_type:chosen?.data_type??null,
    selected_child_partition_count:chosen?.child_partition_count??0,
    alternate_partition_seed_representable:Boolean(chosen),
    alternate_partition_model_status:chosen?'PASS':'BLOCKED',
    execution_authorized:false,
    status:chosen?'PROOF_PASS_EXECUTION_NOT_AUTHORIZED':'BLOCKED'
  });
}
const exhaustedPass=exhaustedProofRows.filter((row)=>row.alternate_partition_model_status==='PASS');
const exhaustedBlocked=exhaustedProofRows.filter((row)=>row.alternate_partition_model_status!=='PASS');
const exhaustedProof={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_EXHAUSTED_LANE_ALTERNATE_PARTITION_MODEL_PROOF',
  exact_head:head,
  source_depth6_exhausted_lane_count:exhaustedRows.length,
  proof_pass_count:exhaustedPass.length,
  blocked_count:exhaustedBlocked.length,
  lanes:exhaustedProofRows,
  alternate_partition_model_status:exhaustedBlocked.length===0?'PASS':'BLOCKED',
  exhausted_lane_execution_authorized:false,
  full_coverage_authorized:false,
  status:exhaustedBlocked.length===0?'PROOF_COMPLETE':'PROOF_BLOCKED'
};
writeJson(`${OUT}/exhausted-lane-alternate-partition-model-proof.json`,exhaustedProof);

const finalStatus=safeMicroInvalid.length?'BLOCKED':'DIAGNOSTIC_COMPLETE';
const nextDecision={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_DEPTH7_SAFE_AND_EXHAUSTED_PROOF_DECISION',
  exact_head:head,
  source_depth6_exact_head:SOURCE_HEAD,
  safe_lane_parent_count:safeParents.length,
  safe_lane_child_count:safeChildren.length,
  safe_lane_coverage_preservation_status:safeProof.coverage_preservation_status,
  safe_lane_micro_pass_count:safeMicroPass.length,
  safe_lane_micro_needs_deeper_split_count:safeMicroDeep.length,
  safe_lane_micro_calibration_invalid_count:safeMicroInvalid.length,
  safe_lane_failed_without_safe_required_enum_frontier_count:safeMicroNoFrontier.length,
  safe_lane_decision:safeDecision,
  exhausted_lane_count:exhaustedRows.length,
  exhausted_alternate_partition_model_status:exhaustedProof.alternate_partition_model_status,
  exhausted_alternate_proof_pass_count:exhaustedPass.length,
  exhausted_alternate_proof_blocked_count:exhaustedBlocked.length,
  exhausted_lane_execution_authorized:false,
  full_depth7_execution_authorized:false,
  full_coverage_authorized:false,
  UCHIRIMO_QA_STATUS:'UNVERIFIED',
  APP_INTEGRATION_READY:false,
  RELEASE_INPUT_GATE:'BLOCKED',
  status:finalStatus
};
writeJson(`${OUT}/depth7-safe-and-exhausted-proof-decision.json`,nextDecision);
console.log(`DEPTH7_SAFE_MICRO_PASS_COUNT=${safeMicroPass.length}/${safeMicroResults.length}`);
console.log(`DEPTH7_SAFE_MICRO_INVALID_COUNT=${safeMicroInvalid.length}`);
console.log(`DEPTH7_SAFE_DECISION=${safeDecision}`);
console.log(`EXHAUSTED_ALTERNATE_MODEL_STATUS=${exhaustedProof.alternate_partition_model_status}`);
console.log(`EXHAUSTED_ALTERNATE_MODEL_PASS_COUNT=${exhaustedPass.length}/${exhaustedRows.length}`);
console.log('EXHAUSTED_LANE_EXECUTION_AUTHORIZED=FALSE');
console.log('UCHIRIMO_FULL_COVERAGE_QA_GATE=BLOCKED');
console.log('APP_INTEGRATION_READY=FALSE');
console.log('RELEASE_INPUT_GATE=BLOCKED');
if(safeMicroInvalid.length)throw new Error('DEPTH7_SAFE_MICRO_INVALID');
