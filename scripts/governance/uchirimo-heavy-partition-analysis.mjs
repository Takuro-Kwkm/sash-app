import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { appRuntimeIntegrationRegistry } from '../../src/catalog/runtime-master/app-runtime-integration-registry.mjs';
import { loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { resolveRuntimeAppProduct } from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { currentExactHead, readJson, writeJson } from './governance-lib.mjs';

const PRODUCT_ID='SER-YKKAP-UCHIRIMO';
const SOURCE_RUN_ID=Number(process.env.UCHIRIMO_HEAVY_SOURCE_RUN_ID ?? 35670279840);
const SOURCE_EXACT_HEAD=String(process.env.UCHIRIMO_HEAVY_SOURCE_HEAD ?? '508021c64897039b2fa6e0391058ad88394536af');
const OUT=String(process.env.UCHIRIMO_HEAVY_ANALYSIS_OUT ?? 'artifacts/uchirimo-heavy-recovery');
const REPO=String(process.env.GITHUB_REPOSITORY ?? 'Takuro-Kwkm/sash-app');
const DEPTH1_MICRO_CHILD_TIMEOUT_MS=Number(process.env.UCHIRIMO_DEPTH1_MICRO_CHILD_TIMEOUT_MS ?? 120000);
const head=currentExactHead();
const scope=readJson('project-governance/release-scope.json');
const canonicalSnapshot=readJson('project-governance/runtime-snapshot.json');
mkdirSync(OUT,{recursive:true});

const stable=(value)=>{
  if(Array.isArray(value))return value.map(stable);
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,stable(v)]));
};
const stableJson=(value)=>JSON.stringify(stable(value));
const hash=(value)=>createHash('sha256').update(typeof value==='string'?value:stableJson(value)).digest('hex');
const same=(a,b)=>Object.is(a,b)||String(a)===String(b);
const enabled=(field)=>(field?.values??[]).filter((row)=>row.disabled!==true);
const CONTINUOUS_KEYS=new Set(['size_w','size_h','frame_projection','fukashi_dimension','custom_w','custom_h','custom_width','custom_height']);
const TECHNICAL_KEYS=new Set(['legacyConstruction','legacyConfiguration','internal_construction']);

if(scope.product_master_mutation!==0)throw new Error('RELEASE_SCOPE_PRODUCT_MASTER_MUTATION_INVALID');
const deferred=scope.deferred_targets?.find((row)=>row.integration_id===PRODUCT_ID);
if(!deferred||deferred.status!=='DEFERRED'||deferred.qa_status==='PASS'||deferred.release_eligibility!==false)throw new Error('UCHIRIMO_DEFERRED_SCOPE_NOT_ENFORCED');
if(scope.current_release_targets?.some((row)=>row.integration_id===PRODUCT_ID))throw new Error('UCHIRIMO_PRESENT_IN_CURRENT_RELEASE_SCOPE');

function ghJson(path){
  return JSON.parse(execFileSync('gh',['api',path],{encoding:'utf8',maxBuffer:64*1024*1024}));
}
function ghText(path){
  return execFileSync('gh',['api','--allow-escape-sequences',path],{encoding:'utf8',maxBuffer:64*1024*1024});
}
function logUnavailable(error){
  const text=[error?.message,error?.stderr,error?.stdout].map((value)=>String(value??'')).join('\n');
  return /HTTP 404|BlobNotFound|specified blob does not exist/i.test(text);
}
async function listJobs(){
  const first=ghJson(`/repos/${REPO}/actions/runs/${SOURCE_RUN_ID}/jobs?per_page=100&page=1`);
  const pages=Math.ceil(Number(first.total_count??0)/100);
  const jobs=[...(first.jobs??[])];
  for(let page=2;page<=pages;page+=1){
    const payload=ghJson(`/repos/${REPO}/actions/runs/${SOURCE_RUN_ID}/jobs?per_page=100&page=${page}`);
    jobs.push(...(payload.jobs??[]));
  }
  return jobs;
}
function parseBatch(log){
  const matches=[...log.matchAll(/UCHIRIMO_SELECTOR_BATCH_JSON:\s*(\[[^\n]+\])/g)];
  if(!matches.length)return null;
  for(let i=matches.length-1;i>=0;i-=1){
    try{
      const rows=JSON.parse(matches[i][1]);
      if(Array.isArray(rows)&&rows.length)return rows;
    }catch{}
  }
  return null;
}
function lastProgress(log){
  const matches=[...log.matchAll(/UCHIRIMO_SHARD_PROGRESS shard=(\d+) states=(\d+) terminals=(\d+) stack=(\d+) heap_mb=(\d+)/g)];
  if(!matches.length)return null;
  const m=matches.at(-1);
  return {shard:Number(m[1]),states:Number(m[2]),terminals:Number(m[3]),stack:Number(m[4]),heap_mb:Number(m[5])};
}
function timeoutMs(log){
  const match=log.match(/UCHIRIMO_SELECTOR_CHILD_TIMEOUT_MS:\s*(\d+)/);
  return match?Number(match[1]):null;
}
function elapsedMs(job){
  const start=Date.parse(job.started_at??'');
  const end=Date.parse(job.completed_at??'');
  return Number.isFinite(start)&&Number.isFinite(end)?Math.max(0,end-start):null;
}
function classify(job,log,progress,timeout){
  const elapsed=elapsedMs(job);
  if(/heap out of memory|FATAL ERROR.*heap/i.test(log))return 'OOM';
  if(/NON_CONVERGENCE|convergence/i.test(log))return 'NON_CONVERGENCE';
  if(/RUNTIME_|SCHEMA_/i.test(log)&&!/RUNTIME-SNAPSHOT/i.test(log))return 'RUNTIME_OR_SCHEMA_DEFECT';
  if(job.conclusion==='cancelled')return 'CANCELLED';
  if(timeout&&elapsed&&elapsed>=timeout-30000)return 'TIMEOUT';
  if(progress&&progress.states>=500000)return 'DATA_EXPLOSION';
  return 'WORKFLOW_FAILURE';
}
function flowSignature(result){
  return (result.fields??[])
    .filter((field)=>!TECHNICAL_KEYS.has(field.key))
    .map((field)=>String(field.semanticStage)+':'+String(field.semanticSlot)+':'+String(field.key)+':'+(field.required?'R':'O')+':'+(field.readOnly?'RO':'RW'))
    .join('|');
}
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
function baseSeed(row){
  const seed={room_specification:row.room_specification,window_type:row.window_type,glass_family:row.glass_family};
  if(row.sash_configuration&&row.sash_configuration!=='__UNSET__')seed.sash_configuration=row.sash_configuration;
  if(row.size_class&&row.size_class!=='__UNSET__')seed.size_class=row.size_class;
  return {...seed,...JSON.parse(row.partition_seed_json??'{}')};
}

const sourcePlanCache=new Map();
function sourceBatchIdentity(job){
  const match=String(job.name??'').match(/\b(lane-(\d+)-(?:heavy|normal)-\d+)\b/);
  if(!match)throw new Error(`SOURCE_JOB_BATCH_ID_UNPARSEABLE:${job.id}`);
  return {batch_id:match[1],lane:Number(match[2])};
}
function sourcePlanLane(lane){
  if(sourcePlanCache.has(lane))return sourcePlanCache.get(lane);
  const artifactName=`uchirimo-selector-proof-plan-${lane}-${SOURCE_EXACT_HEAD}`;
  const lookup=ghJson(`/repos/${REPO}/actions/runs/${SOURCE_RUN_ID}/artifacts?name=${encodeURIComponent(artifactName)}`);
  const artifact=(lookup.artifacts??[]).find((row)=>row.name===artifactName&&row.expired!==true);
  if(!artifact)throw new Error(`SOURCE_PLAN_ARTIFACT_NOT_FOUND:${lane}:${artifactName}`);
  const zipPath=`/tmp/uchirimo-source-plan-${SOURCE_RUN_ID}-${lane}-${process.pid}.zip`;
  const zip=execFileSync('gh',['api','--allow-escape-sequences',`/repos/${REPO}/actions/artifacts/${artifact.id}/zip`],{maxBuffer:16*1024*1024});
  writeFileSync(zipPath,zip);
  let matrix;
  try{
    matrix=JSON.parse(execFileSync('unzip',['-p',zipPath,'matrix.json'],{encoding:'utf8',maxBuffer:4*1024*1024}));
  }finally{
    unlinkSync(zipPath);
  }
  const rows=new Map((matrix.matrix?.include??[]).map((row)=>[String(row.batch_id),row]));
  if(rows.size===0)throw new Error(`SOURCE_PLAN_MATRIX_EMPTY:${lane}`);
  sourcePlanCache.set(lane,rows);
  return rows;
}
function sourcePlanBatch(job){
  const {batch_id,lane}=sourceBatchIdentity(job);
  const entry=sourcePlanLane(lane).get(batch_id);
  if(!entry)throw new Error(`SOURCE_PLAN_BATCH_NOT_FOUND:${job.id}:${batch_id}`);
  let rows;
  try{
    rows=JSON.parse(entry.batch_json);
  }catch{
    throw new Error(`SOURCE_PLAN_BATCH_JSON_INVALID:${job.id}:${batch_id}`);
  }
  if(!Array.isArray(rows)||rows.length===0)throw new Error(`SOURCE_PLAN_BATCH_EMPTY:${job.id}:${batch_id}`);
  const timeoutRaw=entry.child_timeout_ms;
  const childTimeout=timeoutRaw==null?null:Number(timeoutRaw);
  if(childTimeout!==null&&!Number.isFinite(childTimeout))throw new Error(`SOURCE_PLAN_TIMEOUT_INVALID:${job.id}:${batch_id}`);
  return {batch_id,lane,rows,childTimeout};
}

const integrations=appRuntimeIntegrationRegistry.filter((row)=>['NEW_CONSTRUCTION_EXTERIOR_WINDOW','INNER_WINDOW'].includes(row.uiCategory));
const snapshotByKey=new Map(canonicalSnapshot.entries.map((row)=>[row.registry_series_key,row]));
const canonicalProjection=integrations.map((integration)=>({
  registry_series_key:integration.registrySeriesKey,
  package_version:snapshotByKey.get(integration.registrySeriesKey)?.package_version??null,
  runtime_manifest_id:snapshotByKey.get(integration.registrySeriesKey)?.runtime_manifest_id??null,
  source_hash:integration.sourceHash??null,
})).sort((a,b)=>a.registry_series_key.localeCompare(b.registry_series_key));
const canonicalRuntimeSnapshotId=`RUNTIME-SNAPSHOT-${hash(canonicalProjection).slice(0,20)}`;

const sourceRun=ghJson(`/repos/${REPO}/actions/runs/${SOURCE_RUN_ID}`);
if(sourceRun.head_sha!==SOURCE_EXACT_HEAD)throw new Error(`SOURCE_RUN_HEAD_MISMATCH:${sourceRun.head_sha}:${SOURCE_EXACT_HEAD}`);
const jobs=await listJobs();
const candidates=jobs.filter((job)=>
  ['failure','cancelled'].includes(job.conclusion)
  &&String(job.name??'').includes('uchirimo-selector-proof-')
  &&(job.steps??[]).some((step)=>String(step.name??'').startsWith('Run isolated Uchirimo selector batch lane'))
);

const observations=[];
let logUnavailableJobCount=0;
const logUnavailableJobIds=[];
let sourcePlanFallbackPartitionCount=0;
for(const [index,job] of candidates.entries()){
  let log=null;
  let batch=null;
  let progress=null;
  let childTimeout=null;
  let sourceEvidence='JOB_LOG';
  let metricsVerificationStatus='MEASURED_FROM_JOB_LOG';
  try{
    log=ghText(`/repos/${REPO}/actions/jobs/${job.id}/logs`);
  }catch(error){
    if(!logUnavailable(error))throw error;
    logUnavailableJobCount+=1;
    logUnavailableJobIds.push(job.id);
    sourceEvidence='SOURCE_PLAN_ARTIFACT_FALLBACK';
    metricsVerificationStatus='LOG_UNAVAILABLE_IDENTITY_RECOVERED';
  }
  if(log!==null){
    batch=parseBatch(log);
    progress=lastProgress(log);
    childTimeout=timeoutMs(log);
  }
  if(!batch){
    const fallback=sourcePlanBatch(job);
    batch=fallback.rows;
    if(childTimeout===null)childTimeout=fallback.childTimeout;
    sourcePlanFallbackPartitionCount+=batch.length;
    if(log!==null)sourceEvidence='JOB_LOG_PLUS_SOURCE_PLAN_IDENTITY';
  }
  for(const row of batch){
    observations.push({
      job_id:job.id,
      job_name:job.name,
      conclusion:job.conclusion,
      elapsed_time_ms:elapsedMs(job),
      child_timeout_ms:childTimeout,
      failure_class:classify(job,log??'',progress,childTimeout),
      measured_progress:progress,
      source_evidence:sourceEvidence,
      metrics_verification_status:metricsVerificationStatus,
      ...row,
    });
  }
  if((index+1)%25===0)console.log(`HEAVY_LOG_SCAN_PROGRESS=${index+1}/${candidates.length}`);
}

const heavyMap=new Map();
for(const obs of observations){
  const key=String(obs.partition_key);
  const prior=heavyMap.get(key);
  if(!prior||Number(obs.measured_progress?.states??0)>Number(prior.measured_progress?.states??0))heavyMap.set(key,obs);
}
const heavy=[...heavyMap.values()].sort((a,b)=>String(a.partition_key).localeCompare(String(b.partition_key)));
if(!heavy.length)throw new Error('HEAVY_PARTITION_ANALYSIS_EMPTY');

const runtime=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');
if(!runtime?.sourcePackageIntegrity?.match)throw new Error('UCHIRIMO_RUNTIME_INTEGRITY_NOT_PASS');
const parentRecords=[];
const children=[];
for(const obs of heavy){
  const seed=baseSeed(obs);
  const resolved=await resolveRuntimeAppProduct(PRODUCT_ID,seed);
  for(const [key,value] of Object.entries(seed))if(!same(resolved.selection?.[key],value))throw new Error(`HEAVY_PARENT_SEED_REJECTED:${obs.partition_key}:${key}`);
  const signature=flowSignature(resolved);
  const split=nextSplit(resolved,seed);
  const parentId=`UHP-${hash(obs.partition_key).slice(0,20)}`;
  const estimateStatus=obs.failure_class==='CANCELLED'
    ?'UNBOUNDED_PARENT_CANCELLED'
    :['TIMEOUT','DATA_EXPLOSION'].includes(obs.failure_class)
      ?'UNBOUNDED_PARENT_TIMEOUT'
      :'UNBOUNDED_PARENT_INCOMPLETE';
  parentRecords.push({
    PARTITION_ID:parentId,
    PARENT_PARTITION_ID:null,
    PRODUCT_NODE:obs.node_id,
    WINDOW_ID:obs.window_type,
    FLOW_SIGNATURE:signature,
    SELECTOR_PREFIX:seed,
    ESTIMATED_CASE_COUNT:null,
    ESTIMATED_CASE_COUNT_STATUS:estimateStatus,
    GENERATED_CASE_COUNT:obs.measured_progress?.terminals??null,
    EXECUTED_CASE_COUNT:obs.measured_progress?.terminals??null,
    OBSERVED_STATE_COUNT:obs.measured_progress?.states??null,
    OBSERVED_TERMINAL_COUNT:obs.measured_progress?.terminals??null,
    OBSERVED_PEAK_HEAP_MB:obs.measured_progress?.heap_mb??null,
    PASS_COUNT:0,
    FAIL_COUNT:obs.conclusion==='failure'?1:0,
    BLOCKED_COUNT:1,
    UNVERIFIED_COUNT:1,
    ELAPSED_TIME:obs.elapsed_time_ms,
    FAILURE_CLASS:obs.failure_class,
    SOURCE_EVIDENCE:obs.source_evidence,
    METRICS_VERIFICATION_STATUS:obs.metrics_verification_status,
    EXACT_HEAD:head,
    SOURCE_EXACT_HEAD:SOURCE_EXACT_HEAD,
    RUNTIME_SNAPSHOT_ID:canonicalRuntimeSnapshotId,
    SOURCE_PARTITION_KEY:obs.partition_key,
    NEXT_SPLIT_FIELD:split?.field_key??null,
    NEXT_SPLIT_FIELD_REQUIRED:split?.field_required??null,
    NEXT_SPLIT_FIELD_DATA_TYPE:split?.field_data_type??null,
    NEXT_SPLIT_CARDINALITY:split?.values?.length??0,
    NEXT_SPLIT_VALUES:split?.values?.map(stable)??[],
  });
  if(!split)continue;
  for(const value of split.values){
    const childSeed={...seed,[split.field_key]:value};
    const childResolved=await resolveRuntimeAppProduct(PRODUCT_ID,childSeed);
    if(!same(childResolved.selection?.[split.field_key],value))throw new Error(`HEAVY_CHILD_SEED_REJECTED:${obs.partition_key}:${split.field_key}`);
    const childId=`UHC-${hash(stableJson([obs.partition_key,split.field_key,value])).slice(0,20)}`;
    children.push({
      PARTITION_ID:childId,
      PARENT_PARTITION_ID:parentId,
      PRODUCT_NODE:obs.node_id,
      WINDOW_ID:obs.window_type,
      FLOW_SIGNATURE:flowSignature(childResolved),
      SELECTOR_PREFIX:childSeed,
      SPLIT_FIELD:split.field_key,
      SPLIT_VALUE:value,
      EXPECTED_CASE_COUNT:null,
      EXECUTED_CASE_COUNT:0,
      PASS:0,
      FAIL:0,
      BLOCKED:0,
      UNVERIFIED:1,
      EXACT_HEAD:head,
      RUNTIME_SNAPSHOT_ID:canonicalRuntimeSnapshotId,
      STATUS:'PLANNED_UNVERIFIED'
    });
  }
}

const childIds=children.map((row)=>row.PARTITION_ID);
const overlapCount=childIds.length-new Set(childIds).size;
const parentsWithChildren=new Set(children.map((row)=>row.PARENT_PARTITION_ID));
const unsplittableParents=parentRecords.filter((row)=>!parentsWithChildren.has(row.PARTITION_ID));
const splitParents=parentRecords.filter((row)=>parentsWithChildren.has(row.PARTITION_ID));
let splitGapCount=0;
for(const parent of splitParents){
  const matching=children.filter((row)=>row.PARENT_PARTITION_ID===parent.PARTITION_ID);
  if(matching.length!==parent.NEXT_SPLIT_CARDINALITY)splitGapCount+=1;
}

let parentUnionMismatchCount=0;
let childPrefixMismatchCount=0;
let splitSemanticMismatchCount=0;
let parentChildCardinalityMismatchCount=0;
const coverageProofRows=[];
for(const parent of splitParents){
  const matching=children.filter((row)=>row.PARENT_PARTITION_ID===parent.PARTITION_ID);
  const expectedSet=new Set((parent.NEXT_SPLIT_VALUES??[]).map(stableJson));
  const actualSet=new Set(matching.map((row)=>stableJson(row.SPLIT_VALUE)));
  const unionMatch=expectedSet.size===actualSet.size&&[...expectedSet].every((value)=>actualSet.has(value));
  const cardinalityMatch=matching.length===parent.NEXT_SPLIT_CARDINALITY&&actualSet.size===matching.length;
  const splitSemanticMatch=parent.NEXT_SPLIT_FIELD_REQUIRED===true&&parent.NEXT_SPLIT_FIELD_DATA_TYPE==='ENUM'&&Boolean(parent.NEXT_SPLIT_FIELD);
  let prefixMatch=true;
  for(const child of matching){
    const parentEntries=Object.entries(parent.SELECTOR_PREFIX??{});
    const parentPreserved=parentEntries.every(([key,value])=>same(child.SELECTOR_PREFIX?.[key],value));
    const extraKeys=Object.keys(child.SELECTOR_PREFIX??{}).filter((key)=>!Object.prototype.hasOwnProperty.call(parent.SELECTOR_PREFIX??{},key));
    const oneSplitAxis=extraKeys.length===1&&extraKeys[0]===parent.NEXT_SPLIT_FIELD&&same(child.SELECTOR_PREFIX?.[parent.NEXT_SPLIT_FIELD],child.SPLIT_VALUE);
    if(!parentPreserved||!oneSplitAxis){
      prefixMatch=false;
      break;
    }
  }
  if(!unionMatch)parentUnionMismatchCount+=1;
  if(!prefixMatch)childPrefixMismatchCount+=1;
  if(!splitSemanticMatch)splitSemanticMismatchCount+=1;
  if(!cardinalityMatch)parentChildCardinalityMismatchCount+=1;
  coverageProofRows.push({
    PARENT_PARTITION_ID:parent.PARTITION_ID,
    SOURCE_PARTITION_KEY:parent.SOURCE_PARTITION_KEY,
    SPLIT_FIELD:parent.NEXT_SPLIT_FIELD,
    SPLIT_FIELD_REQUIRED:parent.NEXT_SPLIT_FIELD_REQUIRED,
    SPLIT_FIELD_DATA_TYPE:parent.NEXT_SPLIT_FIELD_DATA_TYPE,
    EXPECTED_VALUE_COUNT:expectedSet.size,
    ACTUAL_CHILD_COUNT:matching.length,
    EXPECTED_VALUE_SET_SHA256:hash([...expectedSet].sort()),
    ACTUAL_VALUE_SET_SHA256:hash([...actualSet].sort()),
    PARENT_UNION_EQUALS_CHILDREN:unionMatch,
    CHILD_PREFIX_PRESERVATION:prefixMatch,
    CHILD_CARDINALITY_AND_UNIQUENESS:cardinalityMatch,
    SPLIT_SEMANTICS_VALID:splitSemanticMatch,
    STATUS:unionMatch&&prefixMatch&&cardinalityMatch&&splitSemanticMatch?'PASS':'FAIL'
  });
}
const coveragePreservationPass=
  parentUnionMismatchCount===0&&
  childPrefixMismatchCount===0&&
  splitSemanticMismatchCount===0&&
  parentChildCardinalityMismatchCount===0&&
  unsplittableParents.length===0&&
  splitParents.length===parentRecords.length;

const productNodes=[...new Set(parentRecords.map((row)=>row.PRODUCT_NODE))].sort();
const analysis={
  schema_version:'1.1.0',
  artifact_type:'UCHIRIMO_HEAVY_PARTITION_ANALYSIS',
  exact_head:head,
  source_exact_head:SOURCE_EXACT_HEAD,
  source_run_id:SOURCE_RUN_ID,
  task_classification:'NON-PRODUCT-MASTER',
  product_master_mutation:0,
  deferred_scope_status:'DEFERRED_UNVERIFIED',
  runtime_snapshot_id:canonicalRuntimeSnapshotId,
  heavy_partition_count:parentRecords.length,
  heavy_product_nodes:productNodes,
  observed_failure_job_count:candidates.length,
  observed_partition_count:observations.length,
  log_unavailable_job_count:logUnavailableJobCount,
  log_unavailable_job_ids:logUnavailableJobIds,
  source_plan_fallback_partition_count:sourcePlanFallbackPartitionCount,
  source_job_identity_recovery_status:'COMPLETE',
  failure_class_counts:Object.fromEntries([...new Set(parentRecords.map((row)=>row.FAILURE_CLASS))].map((key)=>[key,parentRecords.filter((row)=>row.FAILURE_CLASS===key).length])),
  partitions:parentRecords,
  status:'PASS_ANALYSIS_ONLY'
};
const coverageProof={
  schema_version:'1.0.0',
  artifact_type:'UCHIRIMO_RECURSIVE_COVERAGE_PRESERVATION_PROOF',
  exact_head:head,
  source_run_id:SOURCE_RUN_ID,
  runtime_snapshot_id:canonicalRuntimeSnapshotId,
  parent_partition_count:parentRecords.length,
  split_parent_count:splitParents.length,
  child_partition_count:children.length,
  UNSPLITTABLE_PARENT_COUNT:unsplittableParents.length,
  PARENT_UNION_MISMATCH_COUNT:parentUnionMismatchCount,
  CHILD_PREFIX_MISMATCH_COUNT:childPrefixMismatchCount,
  SPLIT_SEMANTIC_MISMATCH_COUNT:splitSemanticMismatchCount,
  PARENT_CHILD_CARDINALITY_MISMATCH_COUNT:parentChildCardinalityMismatchCount,
  proof_semantics:'For each heavy parent, the chosen axis is a required Formal Runtime ENUM. The expected enabled value set at the parent equals the unique child split-value set, every child preserves the complete parent selector prefix, and the child adds exactly one split-axis value. Therefore Parent branch space = Union(All Child branch spaces) for this split level.',
  parents:coverageProofRows,
  coverage_preservation_status:coveragePreservationPass?'PASS':'FAIL',
  status:coveragePreservationPass?'PASS':'FAIL'
};
const planReady=
  overlapCount===0&&
  splitGapCount===0&&
  unsplittableParents.length===0&&
  coveragePreservationPass;
const plan={
  schema_version:'1.1.0',
  artifact_type:'UCHIRIMO_RECURSIVE_PARTITION_PLAN',
  exact_head:head,
  runtime_snapshot_id:canonicalRuntimeSnapshotId,
  source_run_id:SOURCE_RUN_ID,
  parent_partition_count:parentRecords.length,
  child_partition_count:children.length,
  partition_depth:1,
  PARTITION_OVERLAP_COUNT:overlapCount,
  PARTITION_GAP_COUNT:splitGapCount,
  UNSPLITTABLE_PARENT_COUNT:unsplittableParents.length,
  PARENT_UNION_MISMATCH_COUNT:parentUnionMismatchCount,
  CHILD_PREFIX_MISMATCH_COUNT:childPrefixMismatchCount,
  SPLIT_SEMANTIC_MISMATCH_COUNT:splitSemanticMismatchCount,
  PARENT_CHILD_CARDINALITY_MISMATCH_COUNT:parentChildCardinalityMismatchCount,
  COVERAGE_PRESERVATION_STATUS:coverageProof.coverage_preservation_status,
  coverage_semantics:'Each heavy parent is partitioned over the complete enabled value set of the next Formal Runtime required multi-valued ENUM selector. Parent/child selector-prefix preservation and exact set union are independently materialized in coverage-preservation-proof.json. Unsplittable parents remain BLOCKED/UNVERIFIED and make the plan BLOCKED.',
  children,
  unsplittable_parent_ids:unsplittableParents.map((row)=>row.PARTITION_ID),
  status:planReady?'PLAN_READY':'BLOCKED'
};
writeJson(`${OUT}/heavy-partition-analysis.json`,analysis);
writeJson(`${OUT}/recursive-partition-plan.json`,plan);
writeJson(`${OUT}/coverage-preservation-proof.json`,coverageProof);

function readJsonSafe(path){
  try{return JSON.parse(readFileSync(path,'utf8'));}catch{return null;}
}
function microSeverity(parent){
  const classRank={CANCELLED:4,DATA_EXPLOSION:3,TIMEOUT:2,WORKFLOW_FAILURE:1}[parent.FAILURE_CLASS]??0;
  const fallbackBonus=parent.SOURCE_EVIDENCE==='SOURCE_PLAN_ARTIFACT_FALLBACK'?1:0;
  return classRank*1e15+fallbackBonus*1e14+Number(parent.OBSERVED_STATE_COUNT??0)*1e6+Number(parent.ELAPSED_TIME??0)*1e2+Number(parent.NEXT_SPLIT_CARDINALITY??0);
}
function microBatchRow(child){
  const prefix=child.SELECTOR_PREFIX??{};
  const baseKeys=new Set(['room_specification','window_type','glass_family','sash_configuration','size_class']);
  const extra=Object.fromEntries(Object.entries(prefix).filter(([key])=>!baseKeys.has(key)));
  return {
    shard:0,
    node_id:child.PRODUCT_NODE,
    partition_key:child.PARTITION_ID,
    room_specification:String(prefix.room_specification),
    window_type:String(prefix.window_type),
    sash_configuration:prefix.sash_configuration==null?'__UNSET__':String(prefix.sash_configuration),
    size_class:prefix.size_class==null?'__UNSET__':String(prefix.size_class),
    glass_family:String(prefix.glass_family),
    partition_seed_json:stableJson(extra)
  };
}
function durationMs(startedAt,completedAt){
  const a=Date.parse(startedAt??'');
  const b=Date.parse(completedAt??'');
  return Number.isFinite(a)&&Number.isFinite(b)&&b>=a?b-a:null;
}

if(planReady){
  if(!Number.isFinite(DEPTH1_MICRO_CHILD_TIMEOUT_MS)||DEPTH1_MICRO_CHILD_TIMEOUT_MS<30000)throw new Error('DEPTH1_MICRO_CHILD_TIMEOUT_INVALID');
  const microOut=`${OUT}/depth1-micro-calibration`;
  mkdirSync(microOut,{recursive:true});
  const parentById=new Map(parentRecords.map((row)=>[row.PARTITION_ID,row]));
  const selected=[];
  for(const node of productNodes){
    const nodeChildren=children.filter((row)=>row.PRODUCT_NODE===node);
    const parentIds=[...new Set(nodeChildren.map((row)=>row.PARENT_PARTITION_ID))]
      .sort((a,b)=>microSeverity(parentById.get(b))-microSeverity(parentById.get(a))||String(a).localeCompare(String(b)));
    const parentId=parentIds[0];
    const child=nodeChildren
      .filter((row)=>row.PARENT_PARTITION_ID===parentId)
      .sort((a,b)=>stableJson(a.SPLIT_VALUE).localeCompare(stableJson(b.SPLIT_VALUE)))[0];
    if(!child)throw new Error(`DEPTH1_MICRO_CHILD_SELECTION_FAILED:${node}`);
    selected.push({child,parent:parentById.get(parentId)});
  }
  const results=[];
  for(const [index,{child,parent}] of selected.entries()){
    const caseId=String(index).padStart(2,'0');
    const caseOut=`${microOut}/case-${caseId}`;
    const batchId=`depth1-micro-${caseId}`;
    mkdirSync(caseOut,{recursive:true});
    const row=microBatchRow(child);
    let executionError=null;
    try{
      execFileSync(process.execPath,['scripts/governance/uchirimo-selector-batch-runner.mjs'],{
        env:{
          ...process.env,
          HEAD_SHA:head,
          UCHIRIMO_SELECTOR_BATCH_ID:batchId,
          UCHIRIMO_SELECTOR_BATCH_JSON:JSON.stringify([row]),
          UCHIRIMO_SELECTOR_CHILD_TIMEOUT_MS:String(DEPTH1_MICRO_CHILD_TIMEOUT_MS),
          UCHIRIMO_SELECTOR_EXPECTED_SHARDS:'1',
          UCHIRIMO_FULL_SELECTOR_OUT:caseOut
        },
        encoding:'utf8',
        timeout:DEPTH1_MICRO_CHILD_TIMEOUT_MS+20000,
        maxBuffer:64*1024*1024
      });
    }catch(error){
      executionError={message:String(error?.message??error),code:error?.code??null,signal:error?.signal??null,killed:error?.killed??null};
    }
    const batchReport=readJsonSafe(`${caseOut}/batch-${batchId}-report.json`);
    const shardReport=readJsonSafe(`${caseOut}/shard-0-report.json`);
    const failureReport=readJsonSafe(`${caseOut}/shard-0-failure.json`);
    let caseArtifactShaMatch=null;
    if(shardReport?.case_artifact){
      const casePath=`${caseOut}/${shardReport.case_artifact}`;
      if(existsSync(casePath)){
        const actual=createHash('sha256').update(readFileSync(casePath)).digest('hex');
        caseArtifactShaMatch=actual===shardReport.case_artifact_sha256;
        unlinkSync(casePath);
      }
    }
    const terminalDigest=`${caseOut}/shard-0-terminal-digests.jsonl`;
    if(existsSync(terminalDigest))unlinkSync(terminalDigest);
    const elapsed=durationMs(batchReport?.results?.[0]?.started_at,batchReport?.results?.[0]?.completed_at);
    const pass=
      batchReport?.status==='PASS'&&
      batchReport?.results?.[0]?.timed_out!==true&&
      shardReport?.status==='PASS'&&
      shardReport?.runtime_integrity_match===true&&
      Number(shardReport?.unverified_discrete_selector_case_count??1)===0&&
      caseArtifactShaMatch===true&&
      Number.isFinite(elapsed)&&elapsed<=DEPTH1_MICRO_CHILD_TIMEOUT_MS;
    const failureMessage=String(failureReport?.message??'');
    const needsDeeperSplit=
      batchReport?.results?.[0]?.timed_out===true||
      /UCHIRIMO_SELECTOR_STATE_LIMIT_REACHED|UCHIRIMO_TERMINAL_LIMIT_REACHED/.test(failureMessage);
    const status=pass?'PASS':needsDeeperSplit?'NEEDS_DEEPER_SPLIT':'CALIBRATION_INVALID';
    const result={
      index,
      product_node:child.PRODUCT_NODE,
      parent_partition_id:child.PARENT_PARTITION_ID,
      child_partition_id:child.PARTITION_ID,
      split_field:child.SPLIT_FIELD,
      split_value:child.SPLIT_VALUE,
      source_parent_failure_class:parent.FAILURE_CLASS,
      source_parent_elapsed_ms:parent.ELAPSED_TIME,
      source_parent_state_count:parent.OBSERVED_STATE_COUNT,
      child_timeout_ms:DEPTH1_MICRO_CHILD_TIMEOUT_MS,
      elapsed_ms:elapsed,
      timed_out:batchReport?.results?.[0]?.timed_out??null,
      runtime_integrity_match:shardReport?.runtime_integrity_match??false,
      unverified_discrete_selector_case_count:shardReport?.unverified_discrete_selector_case_count??null,
      case_artifact_sha256_match:caseArtifactShaMatch,
      execution_error:executionError,
      failure_artifact_present:Boolean(failureReport),
      failure_message:failureMessage||null,
      status
    };
    results.push(result);
    console.log(`DEPTH1_MICRO_CASE node=${child.PRODUCT_NODE} status=${result.status} elapsed_ms=${String(elapsed)}`);
  }
  const passCount=results.filter((row)=>row.status==='PASS').length;
  const deeperSplitRows=results.filter((row)=>row.status==='NEEDS_DEEPER_SPLIT');
  const invalidRows=results.filter((row)=>row.status==='CALIBRATION_INVALID');
  const microSummary={
    schema_version:'1.1.0',
    artifact_type:'UCHIRIMO_DEPTH1_MICRO_CALIBRATION',
    exact_head:head,
    runtime_snapshot_id:canonicalRuntimeSnapshotId,
    task_classification:'NON-PRODUCT-MASTER',
    product_master_mutation:0,
    source_partition_plan_status:plan.status,
    coverage_preservation_status:coverageProof.coverage_preservation_status,
    selected_product_node_count:productNodes.length,
    selected_child_count:results.length,
    child_timeout_ms:DEPTH1_MICRO_CHILD_TIMEOUT_MS,
    pass_count:passCount,
    needs_deeper_split_count:deeperSplitRows.length,
    calibration_invalid_count:invalidRows.length,
    failed_product_nodes:deeperSplitRows.map((row)=>row.product_node),
    invalid_product_nodes:invalidRows.map((row)=>row.product_node),
    results,
    full_child_execution_authorized:false,
    decision:invalidRows.length>0
      ?'CALIBRATION_INVALID'
      :passCount===results.length
        ?'DEPTH1_FAST_PATH_PROMISING'
        :'DEPTH2_REQUIRED_FOR_FAILED_NODES',
    status:invalidRows.length>0?'BLOCKED':'MEASURED_CALIBRATION_ONLY'
  };
  writeJson(`${OUT}/depth1-micro-calibration.json`,microSummary);
  console.log(`DEPTH1_MICRO_CALIBRATION_PASS_COUNT=${passCount}/${results.length}`);
  console.log(`DEPTH1_MICRO_CALIBRATION_INVALID_COUNT=${invalidRows.length}`);
  console.log(`DEPTH1_MICRO_CALIBRATION_DECISION=${microSummary.decision}`);
}

console.log(`HEAVY_PARTITION_IDENTIFIED=${parentRecords.length>0?'TRUE':'FALSE'}`);
console.log(`HEAVY_PARTITION_COUNT=${parentRecords.length}`);
console.log(`HEAVY_PRODUCT_NODES=${productNodes.join(',')}`);
console.log(`RECURSIVE_CHILD_PARTITION_COUNT=${children.length}`);
console.log(`PARTITION_OVERLAP_COUNT=${overlapCount}`);
console.log(`PARTITION_GAP_COUNT=${splitGapCount}`);
console.log(`UNSPLITTABLE_PARENT_COUNT=${unsplittableParents.length}`);
console.log(`PARENT_UNION_MISMATCH_COUNT=${parentUnionMismatchCount}`);
console.log(`CHILD_PREFIX_MISMATCH_COUNT=${childPrefixMismatchCount}`);
console.log(`SPLIT_SEMANTIC_MISMATCH_COUNT=${splitSemanticMismatchCount}`);
console.log(`PARENT_CHILD_CARDINALITY_MISMATCH_COUNT=${parentChildCardinalityMismatchCount}`);
console.log(`COVERAGE_PRESERVATION_STATUS=${coverageProof.coverage_preservation_status}`);
console.log(`LOG_UNAVAILABLE_JOB_COUNT=${logUnavailableJobCount}`);
console.log(`SOURCE_PLAN_FALLBACK_PARTITION_COUNT=${sourcePlanFallbackPartitionCount}`);
console.log('UCHIRIMO_DEFERRED_SCOPE=DEFERRED_UNVERIFIED');