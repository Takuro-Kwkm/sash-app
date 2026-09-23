import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { appRuntimeIntegrationRegistry } from '../../src/catalog/runtime-master/app-runtime-integration-registry.mjs';
import { loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { resolveRuntimeAppProduct } from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { currentExactHead, readJson, writeJson } from './governance-lib.mjs';

const PRODUCT_ID='SER-YKKAP-UCHIRIMO';
const SOURCE_RUN_ID=Number(process.env.UCHIRIMO_HEAVY_SOURCE_RUN_ID ?? 35670279840);
const SOURCE_EXACT_HEAD=String(process.env.UCHIRIMO_HEAVY_SOURCE_HEAD ?? '508021c64897039b2fa6e0391058ad88394536af');
const OUT=String(process.env.UCHIRIMO_HEAVY_ANALYSIS_OUT ?? 'artifacts/uchirimo-heavy-recovery');
const REPO=String(process.env.GITHUB_REPOSITORY ?? 'Takuro-Kwkm/sash-app');
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
    if(values.length>1)return {field_key:field.key,values};
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
    NEXT_SPLIT_CARDINALITY:split?.values?.length??0,
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

const productNodes=[...new Set(parentRecords.map((row)=>row.PRODUCT_NODE))].sort();
const analysis={
  schema_version:'1.0.0',
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
const plan={
  schema_version:'1.0.0',
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
  coverage_semantics:'Each split parent is partitioned over the complete enabled value set of the next Formal Runtime required multi-valued ENUM selector. Unsplittable parents remain BLOCKED/UNVERIFIED and are not PASS.',
  children,
  unsplittable_parent_ids:unsplittableParents.map((row)=>row.PARTITION_ID),
  status:overlapCount===0&&splitGapCount===0?'PLAN_READY':'BLOCKED'
};
writeJson(`${OUT}/heavy-partition-analysis.json`,analysis);
writeJson(`${OUT}/recursive-partition-plan.json`,plan);
console.log(`HEAVY_PARTITION_IDENTIFIED=${parentRecords.length>0?'TRUE':'FALSE'}`);
console.log(`HEAVY_PARTITION_COUNT=${parentRecords.length}`);
console.log(`HEAVY_PRODUCT_NODES=${productNodes.join(',')}`);
console.log(`RECURSIVE_CHILD_PARTITION_COUNT=${children.length}`);
console.log(`PARTITION_OVERLAP_COUNT=${overlapCount}`);
console.log(`PARTITION_GAP_COUNT=${splitGapCount}`);
console.log(`UNSPLITTABLE_PARENT_COUNT=${unsplittableParents.length}`);
console.log(`LOG_UNAVAILABLE_JOB_COUNT=${logUnavailableJobCount}`);
console.log(`SOURCE_PLAN_FALLBACK_PARTITION_COUNT=${sourcePlanFallbackPartitionCount}`);
console.log('UCHIRIMO_DEFERRED_SCOPE=DEFERRED_UNVERIFIED');