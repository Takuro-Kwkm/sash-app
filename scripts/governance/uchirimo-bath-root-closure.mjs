import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveRuntimeAppProduct } from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { currentExactHead } from './governance-lib.mjs';

const PRODUCT_ID='SER-YKKAP-UCHIRIMO';
const HEAD=String(process.env.HEAD_SHA??'');
const INPUT_PATH=String(process.env.UCHIRIMO_BATH_CLOSURE_INPUT??'artifacts/uchirimo-bath-closure-input/bath-root-closure-input.json');
const ROOT_INDEX=Number(process.env.UCHIRIMO_BATH_ROOT_INDEX??-1);
const OUT=String(process.env.UCHIRIMO_BATH_ROOT_OUT??'artifacts/uchirimo-bath-root-closure');
const CHILD_TIMEOUT_MS=Number(process.env.UCHIRIMO_BATH_CHILD_TIMEOUT_MS??120000);
const MAX_DEPTH=Number(process.env.UCHIRIMO_BATH_MAX_DEPTH??12);
const MAX_PARTITIONS=Number(process.env.UCHIRIMO_BATH_MAX_PARTITIONS_PER_ROOT??2000);
const CONTINUOUS_KEYS=new Set(['size_w','size_h','frame_projection','fukashi_dimension','custom_w','custom_h','custom_width','custom_height']);
const TECHNICAL_KEYS=new Set(['legacyConstruction','legacyConfiguration','internal_construction']);

if(!HEAD||currentExactHead()!==HEAD)throw new Error('BATH_CLOSURE_HEAD_MISMATCH');
if(!Number.isInteger(ROOT_INDEX)||ROOT_INDEX<0)throw new Error('BATH_CLOSURE_ROOT_INDEX_INVALID');
if(!Number.isFinite(CHILD_TIMEOUT_MS)||CHILD_TIMEOUT_MS<60000)throw new Error('BATH_CLOSURE_TIMEOUT_INVALID');
if(!Number.isInteger(MAX_DEPTH)||MAX_DEPTH<2)throw new Error('BATH_CLOSURE_MAX_DEPTH_INVALID');
if(!Number.isInteger(MAX_PARTITIONS)||MAX_PARTITIONS<10)throw new Error('BATH_CLOSURE_MAX_PARTITIONS_INVALID');
mkdirSync(OUT,{recursive:true});

const stable=(value)=>Array.isArray(value)?value.map(stable):(!value||typeof value!=='object')?value:Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,stable(v)]));
const stableJson=(value)=>JSON.stringify(stable(value));
const hash=(value)=>createHash('sha256').update(typeof value==='string'?value:stableJson(value)).digest('hex');
const same=(a,b)=>Array.isArray(b)?Array.isArray(a)&&stableJson(a.map(String).sort())===stableJson(b.map(String).sort()):Object.is(a,b)||String(a)===String(b);
const enabled=(field)=>(field?.values??[]).filter((row)=>row.disabled!==true);
const readJson=(path)=>JSON.parse(readFileSync(path,'utf8'));
const readJsonSafe=(path)=>{try{return readJson(path);}catch{return null;}};

function nextSplit(result,seed){
  for(const field of result.fields??[]){
    if(field.required!==true||field.readOnly===true||field.dataType!=='ENUM')continue;
    if(TECHNICAL_KEYS.has(field.key)||CONTINUOUS_KEYS.has(field.key))continue;
    if(Object.prototype.hasOwnProperty.call(seed,field.key))continue;
    const values=[...new Map(enabled(field).map((row)=>[stableJson(row.value),row.value])).values()];
    if(values.length>1)return {field_key:field.key,field_required:true,field_data_type:'ENUM',values};
  }
  return null;
}
function seedFromRunnerRow(row){
  const seed={
    room_specification:row.room_specification,
    window_type:row.window_type,
    sash_configuration:row.sash_configuration,
    size_class:row.size_class,
    glass_family:row.glass_family,
    ...JSON.parse(String(row.partition_seed_json??'{}'))
  };
  for(const [key,value] of Object.entries(seed))if(value==='__UNSET__'||value==null||value==='')delete seed[key];
  return stable(seed);
}
function runnerRow(task){
  const seed=task.seed;
  const baseKeys=new Set(['room_specification','window_type','sash_configuration','size_class','glass_family']);
  const extra=Object.fromEntries(Object.entries(seed).filter(([key])=>!baseKeys.has(key)));
  return {
    shard:0,
    node_id:'UCH-BATH-SL2-W',
    partition_key:task.partition_key,
    room_specification:String(seed.room_specification),
    window_type:String(seed.window_type),
    sash_configuration:seed.sash_configuration==null?'__UNSET__':String(seed.sash_configuration),
    size_class:seed.size_class==null?'__UNSET__':String(seed.size_class),
    glass_family:String(seed.glass_family),
    partition_seed_json:stableJson(extra),
    decision_constraints_json:'[]'
  };
}
function removeLargeArtifacts(dir,shard){
  for(const name of [`shard-${shard}-terminal-digests.jsonl`]){
    const path=join(dir,name);if(existsSync(path))unlinkSync(path);
  }
}
function runPartition(task,sequence){
  const caseDir=join(OUT,`case-${String(sequence).padStart(4,'0')}`);
  mkdirSync(caseDir,{recursive:true});
  const batchId=`bath-root-${String(ROOT_INDEX).padStart(2,'0')}-${String(sequence).padStart(4,'0')}`;
  const row=runnerRow(task);
  let executionError=null;
  try{
    execFileSync(process.execPath,['scripts/governance/uchirimo-selector-batch-runner.mjs'],{
      env:{
        ...process.env,
        HEAD_SHA:HEAD,
        UCHIRIMO_SELECTOR_BATCH_ID:batchId,
        UCHIRIMO_SELECTOR_BATCH_JSON:JSON.stringify([row]),
        UCHIRIMO_SELECTOR_CHILD_TIMEOUT_MS:String(CHILD_TIMEOUT_MS),
        UCHIRIMO_SELECTOR_EXPECTED_SHARDS:'1',
        UCHIRIMO_FULL_SELECTOR_OUT:caseDir
      },
      encoding:'utf8',
      timeout:CHILD_TIMEOUT_MS+30000,
      maxBuffer:64*1024*1024
    });
  }catch(error){
    executionError={message:String(error?.message??error),code:error?.code??null,signal:error?.signal??null,killed:error?.killed??null};
  }
  const batch=readJsonSafe(join(caseDir,`batch-${batchId}-report.json`));
  const shard=readJsonSafe(join(caseDir,'shard-0-report.json'));
  const failure=readJsonSafe(join(caseDir,'shard-0-failure.json'));
  const result=batch?.results?.[0]??null;
  let caseShaMatch=null;
  if(shard?.case_artifact){
    const casePath=join(caseDir,String(shard.case_artifact));
    if(existsSync(casePath)){
      caseShaMatch=createHash('sha256').update(readFileSync(casePath)).digest('hex')===shard.case_artifact_sha256;
      unlinkSync(casePath);
    }
  }
  removeLargeArtifacts(caseDir,0);
  const pass=batch?.status==='PASS'&&result?.status==='PASS'&&result?.timed_out!==true&&shard?.status==='PASS'&&shard?.runtime_integrity_match===true&&Number(shard?.unverified_discrete_selector_case_count??1)===0&&caseShaMatch===true;
  const failureMessage=String(failure?.message??result?.error??executionError?.message??'');
  const splittableFailure=result?.timed_out===true||/UCHIRIMO_SELECTOR_STATE_LIMIT_REACHED|UCHIRIMO_TERMINAL_LIMIT_REACHED/.test(failureMessage);
  return {
    status:pass?'PASS':splittableFailure?'SPLIT_REQUIRED':'BLOCKED',
    timed_out:result?.timed_out===true,
    failure_message:failureMessage||null,
    execution_error:executionError,
    runtime_integrity_match:shard?.runtime_integrity_match??false,
    unverified_discrete_selector_case_count:shard?.unverified_discrete_selector_case_count??null,
    visited_state_count:shard?.visited_state_count??null,
    terminal_context_count:shard?.terminal_context_count??null,
    case_artifact_sha256_match:caseShaMatch,
    batch_id:batchId
  };
}
async function splitTask(task,reason){
  if(task.depth>=MAX_DEPTH)return {status:'BLOCKED',reason:'MAX_DEPTH_REACHED',children:[]};
  const resolved=await resolveRuntimeAppProduct(PRODUCT_ID,task.seed);
  for(const [key,value] of Object.entries(task.seed))if(!same(resolved.selection?.[key],value))return {status:'BLOCKED',reason:`PARENT_SEED_REJECTED:${key}`,children:[]};
  const split=nextSplit(resolved,task.seed);
  if(!split)return {status:'BLOCKED',reason:'SAFE_REQUIRED_ENUM_SPLIT_EXHAUSTED',children:[]};
  const childRows=[];
  for(const value of split.values){
    const seed=stable({...task.seed,[split.field_key]:value});
    const childResolved=await resolveRuntimeAppProduct(PRODUCT_ID,seed);
    for(const [key,expected] of Object.entries(seed))if(!same(childResolved.selection?.[key],expected))return {status:'BLOCKED',reason:`CHILD_SEED_REJECTED:${split.field_key}:${key}`,children:[]};
    childRows.push({
      partition_key:`UBC-${hash({parent:task.partition_key,field:split.field_key,value}).slice(0,20)}`,
      source_partition_key:task.source_partition_key,
      parent_partition_key:task.partition_key,
      depth:task.depth+1,
      seed,
      split_field:split.field_key,
      split_value:stable(value),
      split_reason:reason
    });
  }
  if(new Set(childRows.map((row)=>row.partition_key)).size!==childRows.length)return {status:'BLOCKED',reason:'CHILD_PARTITION_ID_COLLISION',children:[]};
  return {status:'SPLIT',reason,field:split.field_key,values:split.values.map(stable),children:childRows};
}

const input=readJson(INPUT_PATH);
if(input.exact_head!==HEAD||input.status!=='READY'||input.root_count!==38)throw new Error('BATH_CLOSURE_INPUT_INVALID');
const root=input.roots?.find((row)=>row.root_index===ROOT_INDEX);
if(!root||!Array.isArray(root.depth1_items)||root.depth1_items.length!==2)throw new Error('BATH_CLOSURE_ROOT_INPUT_INVALID');
const runtime=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');
if(!runtime?.sourcePackageIntegrity?.match||runtime.sourcePackageIntegrity.actual!==input.runtime_manifest_sha256)throw new Error('BATH_CLOSURE_RUNTIME_IDENTITY_INVALID');

const knownTimeouts=new Set(input.known_timeout_partition_keys??[]);
const queue=root.depth1_items.map((row)=>({partition_key:String(row.partition_key),source_partition_key:String(row.partition_key),parent_partition_key:null,depth:1,seed:seedFromRunnerRow(row),source_failure_evidence:knownTimeouts.has(String(row.partition_key))?'CURRENT_HEAD_TIMEOUT':'UNEXECUTED'}));
const nodes=[];
const blocked=[];
let sequence=0;
let splitCount=0;
let passLeafCount=0;
let timeoutEventCount=0;
let executedPartitionCount=0;
let directSplitKnownTimeoutCount=0;
let maxObservedDepth=1;

while(queue.length){
  if(nodes.length+queue.length>MAX_PARTITIONS){blocked.push({reason:'MAX_PARTITION_BUDGET_EXCEEDED',remaining_queue:queue.length});break;}
  const task=queue.shift();
  maxObservedDepth=Math.max(maxObservedDepth,task.depth);
  if(task.source_failure_evidence==='CURRENT_HEAD_TIMEOUT'&&task.depth===1){
    directSplitKnownTimeoutCount+=1;
    const split=await splitTask(task,'BOUND_CURRENT_HEAD_TIMEOUT_NO_RETRY');
    nodes.push({...task,execution_performed:false,execution_status:'SKIPPED_KNOWN_TIMEOUT',split});
    if(split.status!=='SPLIT'){blocked.push({partition_key:task.partition_key,depth:task.depth,reason:split.reason});continue;}
    splitCount+=1;queue.push(...split.children);continue;
  }
  sequence+=1;executedPartitionCount+=1;
  const measured=runPartition(task,sequence);
  if(measured.timed_out)timeoutEventCount+=1;
  if(measured.status==='PASS'){
    passLeafCount+=1;
    nodes.push({...task,execution_performed:true,execution_status:'PASS',measured});
    continue;
  }
  if(measured.status==='SPLIT_REQUIRED'){
    const split=await splitTask(task,measured.timed_out?'CURRENT_HEAD_TIMEOUT':'CURRENT_HEAD_LIMIT');
    nodes.push({...task,execution_performed:true,execution_status:'FAIL_SPLIT_REQUIRED',measured,split});
    if(split.status!=='SPLIT'){blocked.push({partition_key:task.partition_key,depth:task.depth,reason:split.reason,measured});continue;}
    splitCount+=1;queue.push(...split.children);continue;
  }
  nodes.push({...task,execution_performed:true,execution_status:'BLOCKED',measured});
  blocked.push({partition_key:task.partition_key,depth:task.depth,reason:'NON_SPLITTABLE_EXECUTION_FAILURE',measured});
}

const status=blocked.length===0&&queue.length===0?'PASS':'BLOCKED';
const summary={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_BATH_ORIGINAL_ROOT_RECURSIVE_CLOSURE',
  exact_head:HEAD,
  task_classification:'NON-PRODUCT-MASTER',
  product_master_mutation:0,
  root_index:ROOT_INDEX,
  original_parent_partition_id:root.original_parent_partition_id,
  product_node:'UCH-BATH-SL2-W',
  runtime_manifest_sha256:runtime.sourcePackageIntegrity.actual,
  source_depth1_partition_count:2,
  source_depth1_partition_keys:root.depth1_items.map((row)=>row.partition_key).sort(),
  known_timeout_source_partition_count:root.depth1_items.filter((row)=>knownTimeouts.has(String(row.partition_key))).length,
  direct_split_known_timeout_count:directSplitKnownTimeoutCount,
  executed_partition_count:executedPartitionCount,
  pass_leaf_count:passLeafCount,
  timeout_event_count:timeoutEventCount,
  split_count:splitCount,
  max_observed_depth:maxObservedDepth,
  blocked_count:blocked.length,
  blocked,
  coverage_rule:'PARENT_UNION_EQUALS_ENUMERATED_REQUIRED_ENUM_CHILDREN; LEAF_CLOSURE_REQUIRES_TERMINAL_PASS',
  new_partition_rule:'ONLY_CHILDREN_OF_CURRENT_HEAD_TIMEOUT_OR_LIMITED_PARTITIONS',
  same_failed_partition_retry_performed:false,
  original_root_closure_proven:status==='PASS',
  nodes,
  UCHIRIMO_QA_STATUS:'UNVERIFIED',
  APP_INTEGRATION_READY:false,
  RELEASE_INPUT_GATE:'BLOCKED',
  status
};
writeFileSync(join(OUT,`bath-root-${String(ROOT_INDEX).padStart(2,'0')}-closure.json`),JSON.stringify(summary,null,2)+'\n');
console.log(`BATH_ROOT_CLOSURE root=${ROOT_INDEX} status=${status} executed=${executedPartitionCount} pass_leaves=${passLeafCount} timeouts=${timeoutEventCount} splits=${splitCount} blocked=${blocked.length} max_depth=${maxObservedDepth}`);
