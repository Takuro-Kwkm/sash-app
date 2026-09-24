import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { resolveRuntimeAppProduct } from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { currentExactHead, writeJson } from './governance-lib.mjs';

const PID='SER-YKKAP-UCHIRIMO';
const SOURCE_RUN='35985579293';
const SOURCE_HEAD='113da52821e041391fccb8854768b3a88afccf06';
const SOURCE_ANALYSIS_BLOB='b27af93ae11962ebcce5b4a71c1709985f290557';
const SOURCE_BATCH_BLOB='435a48d054d74798f61368234bc6775cdaa0c770';
const SOURCE_FULL_BLOB='94a86542cace253dc45e7b1f8589f98b837a4cce';
const SOURCE_ART=`uchirimo-heavy-recovery-analysis-${SOURCE_HEAD}`;
const SOURCE_DEPTH8_DIR='source-run-35982709102';
const PATH='scripts/governance/uchirimo-heavy-partition-analysis.mjs';
const BATCH_RUNNER_PATH='scripts/governance/uchirimo-selector-batch-runner.mjs';
const FULL_RUNNER_PATH='scripts/uchirimo-full-selector-proof.mjs';
const OUT=String(process.env.UCHIRIMO_HEAVY_ANALYSIS_OUT??'artifacts/uchirimo-heavy-recovery');
const DEPTH9_TIMEOUT=Number(process.env.UCHIRIMO_DEPTH9_MICRO_CHILD_TIMEOUT_MS??60000);
const CONSTRAINT_TIMEOUT=Number(process.env.UCHIRIMO_CONSTRAINT_MICRO_TIMEOUT_MS??60000);
const MAXS=1000000;
const MAXT=1000000;
const MAX_CACHE=512;
const CONT=new Set(['size_w','size_h','frame_projection','fukashi_dimension','custom_w','custom_h','custom_width','custom_height']);
const TECH=new Set(['legacyConstruction','legacyConfiguration','internal_construction']);
const head=currentExactHead();
if(!Number.isFinite(DEPTH9_TIMEOUT)||DEPTH9_TIMEOUT<60000)throw new Error('DEPTH9_TIMEOUT_INVALID');
if(!Number.isFinite(CONSTRAINT_TIMEOUT)||CONSTRAINT_TIMEOUT<60000)throw new Error('CONSTRAINT_TIMEOUT_INVALID');
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
const enabled=(field)=>[...new Map((field?.values??[]).filter((row)=>row.disabled!==true).map((row)=>[sj(row.value),row.value])).values()];
const normalizeMulti=(rows)=>[...new Map(rows.map((value)=>[String(value),value])).values()].sort((a,b)=>String(a).localeCompare(String(b)));
const flowSignature=(result)=>(result.fields??[])
  .filter((field)=>!TECH.has(field.key))
  .map((field)=>`${field.semanticStage}:${field.semanticSlot}:${field.key}:${field.required?'R':'O'}:${field.readOnly?'RO':'RW'}`)
  .join('|');

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
      const values=enabled(field);
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

function partitionRow(partition){
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

function measureSeedPartition(partition,index){
  const id=String(index).padStart(2,'0');
  const dir=`${OUT}/depth9-safe-micro/case-${id}`;
  const batchId=`depth9-safe-micro-${id}`;
  mkdirSync(dir,{recursive:true});
  let executionError=null;
  try{
    execFileSync(process.execPath,['scripts/governance/uchirimo-selector-batch-runner.mjs'],{
      env:{
        ...process.env,
        HEAD_SHA:head,
        UCHIRIMO_SELECTOR_BATCH_ID:batchId,
        UCHIRIMO_SELECTOR_BATCH_JSON:JSON.stringify([partitionRow(partition)]),
        UCHIRIMO_SELECTOR_CHILD_TIMEOUT_MS:String(DEPTH9_TIMEOUT),
        UCHIRIMO_SELECTOR_EXPECTED_SHARDS:'1',
        UCHIRIMO_SELECTOR_MAX_STATES:String(MAXS),
        UCHIRIMO_SELECTOR_MAX_TERMINALS:String(MAXT),
        UCHIRIMO_FULL_SELECTOR_OUT:dir
      },
      encoding:'utf8',
      timeout:DEPTH9_TIMEOUT+20000,
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

async function measureConstraintLane(lane,index){
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

  const parent=await resolveCached(prefix);
  for(const [fieldKey,value] of Object.entries(prefix)){
    if(!same(parent.selection?.[fieldKey],value)){
      return {outcome:'INVALID',reason:`PARENT_PREFIX_REJECTED:${fieldKey}`,elapsed_ms:Date.now()-startedAt};
    }
  }
  const field=(parent.fields??[]).find((candidate)=>candidate.key===key)??null;
  if(!field||field.readOnly===true||field.required===true||!['ENUM','MULTI_ENUM'].includes(field.dataType)){
    return {outcome:'INVALID',reason:'CONSTRAINT_FIELD_NOT_OPTIONAL_DISCRETE',elapsed_ms:Date.now()-startedAt};
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
      return {
        outcome:'TIMEOUT',
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
    for(let i=branches.length-1;i>=0;i-=1){
      if(Date.now()>=deadline)break;
      const branch=branches[i];
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
if(sj(changed)!==sj([PATH]))throw new Error(`NEXT_SCOPE_INVALID:${changed.join(',')}`);

const sourceDir=`${OUT}/source-run-${SOURCE_RUN}`;
mkdirSync(sourceDir,{recursive:true});
execFileSync('gh',['run','download',SOURCE_RUN,'--repo',String(process.env.GITHUB_REPOSITORY??'Takuro-Kwkm/sash-app'),'--name',SOURCE_ART,'--dir',sourceDir],{stdio:'inherit',timeout:120000});
const sourceHard=read(`${sourceDir}/explicit-decision-constraint-model-hard-proof.json`);
const sourceHeavy=read(`${sourceDir}/heavy-partition-analysis.json`);
const sourcePlan=read(`${sourceDir}/recursive-partition-plan.json`);
if(sourceHard.exact_head!==SOURCE_HEAD||sourceHard.EXPLICIT_DECISION_CONSTRAINT_MODEL_GATE!=='PASS'||sourceHard.lane_pass_count!==7||sourceHard.lane_fail_count!==0)throw new Error('SOURCE_HARD_PROOF_NOT_PASS');
if(sourceHard.runner_constraint_support_implemented!==false||sourceHard.constraint_execution_authorized!==false)throw new Error('SOURCE_CONSTRAINT_EXECUTION_STATE_INVALID');
if(sourceHard.REQUESTED_DIFF_COVERAGE!=='PASS'||sourceHard.UNREQUESTED_DIFF_COUNT!==0)throw new Error('SOURCE_SCOPE_EVIDENCE_INVALID');

const depth8Root=`${sourceDir}/${SOURCE_DEPTH8_DIR}`;
const sourceDepth8Plan=read(`${depth8Root}/depth8-safe-representative-partition-plan.json`);
const sourceDepth8Proof=read(`${depth8Root}/depth8-safe-representative-coverage-preservation-proof.json`);
const sourceDepth8Micro=read(`${depth8Root}/depth8-safe-representative-micro-calibration.json`);
if(sourceDepth8Proof.coverage_preservation_status!=='PASS'||sourceDepth8Plan.COVERAGE_PRESERVATION_STATUS!=='PASS')throw new Error('SOURCE_DEPTH8_COVERAGE_NOT_PASS');
if(sourceDepth8Micro.pass_count!==0||sourceDepth8Micro.needs_deeper_split_count!==3||sourceDepth8Micro.calibration_invalid_count!==0||sourceDepth8Micro.failed_without_safe_required_enum_frontier_count!==0)throw new Error('SOURCE_DEPTH8_MICRO_SHAPE_INVALID');
if(sourceDepth8Micro.decision!=='DEPTH9_REQUIRED_FOR_FAILED_SAFE_REPRESENTATIVES')throw new Error('SOURCE_DEPTH8_DECISION_INVALID');

const runtime=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');
if(!runtime?.sourcePackageIntegrity?.match)throw new Error('CURRENT_RUNTIME_INTEGRITY_FAIL');
if(runtime.sourcePackageIntegrity.actual!==sourceHard.current_runtime_manifest_sha256)throw new Error(`CURRENT_RUNTIME_MANIFEST_CHANGED:${runtime.sourcePackageIntegrity.actual}`);

const binding={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_DEPTH9_AND_CONSTRAINT_MICRO_SOURCE_BINDING',
  exact_head:head,
  source_exact_head:SOURCE_HEAD,
  source_run_id:Number(SOURCE_RUN),
  changed_files_since_source:changed,
  source_explicit_constraint_model_gate:sourceHard.EXPLICIT_DECISION_CONSTRAINT_MODEL_GATE,
  source_depth8_decision:sourceDepth8Micro.decision,
  runner_unchanged_before_micro:true,
  current_runtime_manifest_sha256:runtime.sourcePackageIntegrity.actual,
  source_pass_evidence_reused_as_current_full_coverage:false,
  status:'PASS'
};
writeJson(`${OUT}/depth9-and-constraint-micro-source-binding.json`,binding);
writeJson(`${OUT}/heavy-partition-analysis.json`,{...sourceHeavy,exact_head:head,evidence_origin:'CURRENT_HEAD_DEPTH9_CONSTRAINT_MICRO_BINDING',source_bound_exact_head:SOURCE_HEAD,current_head_binding_sha256:hash(binding),source_pass_evidence_reused_as_current_head:false});
writeJson(`${OUT}/recursive-partition-plan.json`,{...sourcePlan,exact_head:head,evidence_origin:'CURRENT_HEAD_DEPTH9_CONSTRAINT_MICRO_BINDING',source_bound_exact_head:SOURCE_HEAD,current_head_binding_sha256:hash(binding),source_pass_evidence_reused_as_current_head:false});

const depth8ChildById=new Map(sourceDepth8Plan.children.map((child)=>[child.PARTITION_ID,child]));
const depth9SourceRows=sourceDepth8Micro.results.filter((entry)=>entry.status==='NEEDS_DEEPER_SPLIT'&&Boolean(entry.next_safe_split_field));
if(depth9SourceRows.length!==3)throw new Error(`DEPTH9_SOURCE_COUNT_INVALID:${depth9SourceRows.length}`);
const depth9Parents=[];
const depth9Children=[];
for(const source of depth9SourceRows){
  const depth8Child=depth8ChildById.get(source.depth8_child_partition_id);
  if(!depth8Child)throw new Error(`DEPTH9_SOURCE_CHILD_MISSING:${source.depth8_child_partition_id}`);
  const seed=depth8Child.SELECTOR_PREFIX??{};
  const resolved=await resolveRuntimeAppProduct(PID,seed);
  for(const [key,value] of Object.entries(seed))if(!same(resolved.selection?.[key],value))throw new Error(`DEPTH9_PARENT_SEED_REJECTED:${source.depth8_child_partition_id}:${key}`);
  const split=safeSplit(resolved,seed);
  if(!split||split.key!==source.next_safe_split_field||split.count!==source.next_safe_split_cardinality)throw new Error(`DEPTH9_SPLIT_DRIFT:${source.depth8_child_partition_id}`);
  const parent={
    PARTITION_ID:source.depth8_child_partition_id,
    PRODUCT_NODE:source.product_node,
    WINDOW_ID:String(seed.window_type),
    FLOW_SIGNATURE:flowSignature(resolved),
    SELECTOR_PREFIX:stable(seed),
    NEXT_SPLIT_FIELD:split.key,
    NEXT_SPLIT_FIELD_REQUIRED:true,
    NEXT_SPLIT_FIELD_DATA_TYPE:'ENUM',
    NEXT_SPLIT_CARDINALITY:split.count,
    NEXT_SPLIT_VALUES:split.values,
    PARTITION_DEPTH:8,
    EXACT_HEAD:head,
    STATUS:'DEPTH9_SAFE_SPLIT_PLANNED'
  };
  depth9Parents.push(parent);
  for(const value of split.values){
    const childSeed={...seed,[split.key]:value};
    const childResolved=await resolveRuntimeAppProduct(PID,childSeed);
    for(const [key,parentValue] of Object.entries(childSeed))if(!same(childResolved.selection?.[key],parentValue))throw new Error(`DEPTH9_CHILD_SEED_REJECTED:${parent.PARTITION_ID}:${key}`);
    const childAxes=unresolvedAxes(childResolved,childSeed);
    const next=safeSplit(childResolved,childSeed);
    depth9Children.push({
      PARTITION_ID:`UHC9-${hash([parent.PARTITION_ID,split.key,value]).slice(0,20)}`,
      PARENT_PARTITION_ID:parent.PARTITION_ID,
      PRODUCT_NODE:parent.PRODUCT_NODE,
      WINDOW_ID:parent.WINDOW_ID,
      FLOW_SIGNATURE:flowSignature(childResolved),
      SELECTOR_PREFIX:stable(childSeed),
      SPLIT_FIELD:split.key,
      SPLIT_VALUE:stable(value),
      PARTITION_DEPTH:9,
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

const depth9Ids=depth9Children.map((child)=>child.PARTITION_ID);
const depth9Overlap=depth9Ids.length-new Set(depth9Ids).size;
let depth9Gap=0;
let depth9UnionMismatch=0;
let depth9PrefixMismatch=0;
let depth9SemanticMismatch=0;
let depth9CardinalityMismatch=0;
const depth9ParentProofs=[];
for(const parent of depth9Parents){
  const children=depth9Children.filter((child)=>child.PARENT_PARTITION_ID===parent.PARTITION_ID);
  const expected=new Set(parent.NEXT_SPLIT_VALUES.map(sj));
  const actual=new Set(children.map((child)=>sj(child.SPLIT_VALUE)));
  const unionOk=expected.size===actual.size&&[...expected].every((value)=>actual.has(value));
  const cardinalityOk=children.length===parent.NEXT_SPLIT_CARDINALITY&&actual.size===children.length;
  const semanticOk=parent.NEXT_SPLIT_FIELD_REQUIRED===true&&parent.NEXT_SPLIT_FIELD_DATA_TYPE==='ENUM';
  const prefixOk=children.every((child)=>{
    const kept=Object.entries(parent.SELECTOR_PREFIX).every(([key,value])=>same(child.SELECTOR_PREFIX?.[key],value));
    const extra=Object.keys(child.SELECTOR_PREFIX).filter((key)=>!Object.prototype.hasOwnProperty.call(parent.SELECTOR_PREFIX,key));
    return kept&&extra.length===1&&extra[0]===parent.NEXT_SPLIT_FIELD;
  });
  if(children.length!==parent.NEXT_SPLIT_CARDINALITY)depth9Gap+=1;
  if(!unionOk)depth9UnionMismatch+=1;
  if(!prefixOk)depth9PrefixMismatch+=1;
  if(!semanticOk)depth9SemanticMismatch+=1;
  if(!cardinalityOk)depth9CardinalityMismatch+=1;
  depth9ParentProofs.push({
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
const depth9Unsplit=depth9Parents.filter((parent)=>!depth9Children.some((child)=>child.PARENT_PARTITION_ID===parent.PARTITION_ID));
const depth9CoverageOk=depth9Overlap===0&&depth9Gap===0&&depth9Unsplit.length===0&&depth9UnionMismatch===0&&depth9PrefixMismatch===0&&depth9SemanticMismatch===0&&depth9CardinalityMismatch===0;
const depth9Proof={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_DEPTH9_SAFE_LANE_REPRESENTATIVE_COVERAGE_PRESERVATION_PROOF',
  exact_head:head,
  parent_partition_count:depth9Parents.length,
  child_partition_count:depth9Children.length,
  PARTITION_OVERLAP_COUNT:depth9Overlap,
  PARTITION_GAP_COUNT:depth9Gap,
  UNSPLITTABLE_PARENT_COUNT:depth9Unsplit.length,
  PARENT_UNION_MISMATCH_COUNT:depth9UnionMismatch,
  CHILD_PREFIX_MISMATCH_COUNT:depth9PrefixMismatch,
  SPLIT_SEMANTIC_MISMATCH_COUNT:depth9SemanticMismatch,
  PARENT_CHILD_CARDINALITY_MISMATCH_COUNT:depth9CardinalityMismatch,
  parents:depth9ParentProofs,
  coverage_preservation_status:depth9CoverageOk?'PASS':'FAIL',
  full_depth9_execution_authorized:false,
  full_coverage_authorized:false,
  status:depth9CoverageOk?'PASS':'FAIL'
};
const depth9Plan={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_DEPTH9_SAFE_LANE_REPRESENTATIVE_PARTITION_PLAN',
  exact_head:head,
  partition_depth:9,
  source_depth8_failed_with_safe_frontier_count:depth9SourceRows.length,
  parent_partition_count:depth9Parents.length,
  child_partition_count:depth9Children.length,
  COVERAGE_PRESERVATION_STATUS:depth9Proof.coverage_preservation_status,
  parents:depth9Parents,
  children:depth9Children,
  full_depth9_execution_authorized:false,
  full_coverage_authorized:false,
  status:depth9CoverageOk?'DIAGNOSTIC_PLAN_READY':'BLOCKED'
};
writeJson(`${OUT}/depth9-safe-representative-partition-plan.json`,depth9Plan);
writeJson(`${OUT}/depth9-safe-representative-coverage-preservation-proof.json`,depth9Proof);
console.log(`DEPTH9_SAFE_PARENT_COUNT=${depth9Parents.length}`);
console.log(`DEPTH9_SAFE_CHILD_COUNT=${depth9Children.length}`);
console.log(`DEPTH9_SAFE_COVERAGE_PRESERVATION_STATUS=${depth9Proof.coverage_preservation_status}`);
if(!depth9CoverageOk)throw new Error('DEPTH9_SAFE_COVERAGE_BLOCKED');

const depth9MicroResults=[];
for(const [index,parent] of depth9Parents.entries()){
  const child=depth9Children
    .filter((candidate)=>candidate.PARENT_PARTITION_ID===parent.PARTITION_ID)
    .sort((a,b)=>sj(a.SPLIT_VALUE).localeCompare(sj(b.SPLIT_VALUE)))[0];
  const measured=measureSeedPartition(child,index);
  const passed=measured.outcome==='COMPLETED';
  const needsDeeper=['TIMEOUT','STATE_LIMIT_REACHED','TERMINAL_LIMIT_REACHED'].includes(measured.outcome);
  const status=passed?'PASS':needsDeeper?'NEEDS_DEEPER_SPLIT':'CALIBRATION_INVALID';
  depth9MicroResults.push({
    index,
    product_node:parent.PRODUCT_NODE,
    source_depth8_partition_id:parent.PARTITION_ID,
    depth9_child_partition_id:child.PARTITION_ID,
    split_field:child.SPLIT_FIELD,
    split_value:child.SPLIT_VALUE,
    next_safe_split_field:child.NEXT_SAFE_SPLIT_FIELD,
    next_safe_split_cardinality:child.NEXT_SAFE_SPLIT_CARDINALITY,
    ...measured,
    status
  });
  console.log(`DEPTH9_SAFE_MICRO node=${parent.PRODUCT_NODE} status=${status} elapsed_ms=${measured.elapsed_ms} states=${measured.visited_state_count} terminals=${measured.terminal_context_count}`);
}
const depth9Pass=depth9MicroResults.filter((entry)=>entry.status==='PASS');
const depth9Deep=depth9MicroResults.filter((entry)=>entry.status==='NEEDS_DEEPER_SPLIT');
const depth9Invalid=depth9MicroResults.filter((entry)=>entry.status==='CALIBRATION_INVALID');
const depth9NoFrontier=depth9Deep.filter((entry)=>!entry.next_safe_split_field);
let depth9Decision='DEPTH9_REPRESENTATIVE_FAST_PATH_PROMISING';
if(depth9Invalid.length)depth9Decision='DEPTH9_SAFE_CALIBRATION_INVALID';
else if(depth9NoFrontier.length)depth9Decision='SAFE_REQUIRED_ENUM_FRONTIER_EXHAUSTED_AFTER_DEPTH9';
else if(depth9Deep.length)depth9Decision='DEPTH10_REQUIRED_FOR_FAILED_SAFE_REPRESENTATIVES';
const depth9Micro={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_DEPTH9_SAFE_LANE_REPRESENTATIVE_MICRO_CALIBRATION',
  exact_head:head,
  task_classification:'NON-PRODUCT-MASTER',
  product_master_mutation:0,
  selected_child_count:depth9MicroResults.length,
  child_timeout_ms:DEPTH9_TIMEOUT,
  pass_count:depth9Pass.length,
  needs_deeper_split_count:depth9Deep.length,
  calibration_invalid_count:depth9Invalid.length,
  failed_without_safe_required_enum_frontier_count:depth9NoFrontier.length,
  results:depth9MicroResults,
  full_depth9_execution_authorized:false,
  full_coverage_authorized:false,
  decision:depth9Decision,
  status:depth9Invalid.length?'BLOCKED':'MEASURED_CALIBRATION_ONLY'
};
writeJson(`${OUT}/depth9-safe-representative-micro-calibration.json`,depth9Micro);

const provenanceRepresentatives=[];
for(const sourceLane of ['DEPTH7_SAFE_FRONTIER_EXHAUSTED','DEPTH6_SAFE_FRONTIER_EXHAUSTED']){
  const lane=sourceHard.lanes
    .filter((candidate)=>candidate.source_lane===sourceLane)
    .sort((a,b)=>String(a.lane_id).localeCompare(String(b.lane_id)))[0];
  if(!lane)throw new Error(`CONSTRAINT_PROVENANCE_REPRESENTATIVE_MISSING:${sourceLane}`);
  provenanceRepresentatives.push(lane);
}
const constraintResults=[];
for(const [index,lane] of provenanceRepresentatives.entries()){
  const measured=await measureConstraintLane(lane,index);
  const passed=measured.outcome==='COMPLETED';
  const bounded=['TIMEOUT','STATE_LIMIT_REACHED','TERMINAL_LIMIT_REACHED'].includes(measured.outcome);
  const status=passed?'PASS':bounded?'NEEDS_FURTHER_PARTITIONING':'CALIBRATION_INVALID';
  constraintResults.push({
    index,
    lane_id:lane.lane_id,
    source_lane:lane.source_lane,
    product_node:lane.product_node,
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
  artifact_type:'UCHIRIMO_EXPLICIT_DECISION_CONSTRAINT_REPRESENTATIVE_MICRO_CALIBRATION',
  exact_head:head,
  source_model_proof_exact_head:SOURCE_HEAD,
  source_model_gate:sourceHard.EXPLICIT_DECISION_CONSTRAINT_MODEL_GATE,
  execution_model:'ANALYSIS_SIDE_BOUNDED_DFS_PROOF_ONLY',
  existing_runner_modified:false,
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

const decision={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_DEPTH9_AND_CONSTRAINT_MICRO_DECISION',
  exact_head:head,
  source_exact_head:SOURCE_HEAD,
  source_run_id:Number(SOURCE_RUN),
  depth9_parent_count:depth9Parents.length,
  depth9_child_count:depth9Children.length,
  depth9_coverage_preservation_status:depth9Proof.coverage_preservation_status,
  depth9_micro_pass_count:depth9Pass.length,
  depth9_micro_needs_deeper_split_count:depth9Deep.length,
  depth9_micro_calibration_invalid_count:depth9Invalid.length,
  depth9_failed_without_safe_required_enum_frontier_count:depth9NoFrontier.length,
  depth9_decision:depth9Decision,
  explicit_constraint_model_gate:sourceHard.EXPLICIT_DECISION_CONSTRAINT_MODEL_GATE,
  constraint_micro_representative_count:constraintResults.length,
  constraint_micro_pass_count:constraintPass.length,
  constraint_micro_needs_further_partitioning_count:constraintFurther.length,
  constraint_micro_calibration_invalid_count:constraintInvalid.length,
  runner_constraint_support_implemented:false,
  runner_implementation_authorized:constraintInvalid.length===0,
  constraint_full_execution_authorized:false,
  full_depth9_execution_authorized:false,
  full_coverage_authorized:false,
  REQUESTED_DIFF_COVERAGE:changed.length===1&&changed[0]===PATH?'PASS':'FAIL',
  UNREQUESTED_DIFF_COUNT:changed.filter((path)=>path!==PATH).length,
  UCHIRIMO_FULL_COVERAGE_QA_GATE:'BLOCKED',
  UCHIRIMO_QA_STATUS:'UNVERIFIED',
  APP_INTEGRATION_READY:false,
  RELEASE_INPUT_GATE:'BLOCKED',
  status:depth9Invalid.length||constraintInvalid.length?'BLOCKED':'DIAGNOSTIC_COMPLETE'
};
writeJson(`${OUT}/depth9-and-constraint-micro-decision.json`,decision);

console.log(`DEPTH9_SAFE_MICRO_PASS_COUNT=${depth9Pass.length}/${depth9MicroResults.length}`);
console.log(`DEPTH9_SAFE_MICRO_INVALID_COUNT=${depth9Invalid.length}`);
console.log(`DEPTH9_SAFE_DECISION=${depth9Decision}`);
console.log(`CONSTRAINT_MICRO_PASS_COUNT=${constraintPass.length}/${constraintResults.length}`);
console.log(`CONSTRAINT_MICRO_INVALID_COUNT=${constraintInvalid.length}`);
console.log(`RUNNER_IMPLEMENTATION_AUTHORIZED=${String(decision.runner_implementation_authorized).toUpperCase()}`);
console.log('RUNNER_CONSTRAINT_SUPPORT_IMPLEMENTED=FALSE');
console.log('CONSTRAINT_FULL_EXECUTION_AUTHORIZED=FALSE');
console.log('UCHIRIMO_FULL_COVERAGE_QA_GATE=BLOCKED');
console.log('APP_INTEGRATION_READY=FALSE');
console.log('RELEASE_INPUT_GATE=BLOCKED');
if(depth9Invalid.length)throw new Error('DEPTH9_SAFE_MICRO_INVALID');
if(constraintInvalid.length)throw new Error('CONSTRAINT_MICRO_INVALID');
