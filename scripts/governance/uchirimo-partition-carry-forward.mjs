import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';

const HEAD=String(process.env.HEAD_SHA??process.env.GITHUB_SHA??'');
const REPO=String(process.env.GITHUB_REPOSITORY??'');
const RUN_ID=Number(process.env.GITHUB_RUN_ID??0);
const RUN_ATTEMPT=Number(process.env.GITHUB_RUN_ATTEMPT??1);
const BRANCH=String(process.env.GITHUB_HEAD_REF??process.env.GITHUB_REF_NAME??'');
const API=String(process.env.GITHUB_API_URL??'https://api.github.com');
const TOKEN=String(process.env.GH_TOKEN??process.env.GITHUB_TOKEN??'');
const PLAN_PATH=String(process.env.UCHIRIMO_SELECTOR_CURRENT_PLAN??'artifacts/uchirimo-selector-proof-current-plan/all-partitions.json');
const OUT=String(process.env.UCHIRIMO_SELECTOR_CARRY_FORWARD_OUT??'artifacts/uchirimo-selector-proof-carry-forward');
const MAX_SOURCE_RUNS=Number(process.env.UCHIRIMO_CARRY_FORWARD_SOURCE_RUNS??100);
const MAX_CANDIDATE_RUNS=Number(process.env.UCHIRIMO_CARRY_FORWARD_CANDIDATE_RUNS??32);
const PROOF_SCRIPT='scripts/uchirimo-full-selector-proof.mjs';
const BATCH_RUNNER='scripts/governance/uchirimo-selector-batch-runner.mjs';
const POLICY_PATH='project-governance/evidence-dependency-policy.json';

if(!HEAD||!REPO||!RUN_ID||!TOKEN)throw new Error('UCHIRIMO_CARRY_FORWARD_ENV_MISSING');
mkdirSync(OUT,{recursive:true});

const stable=(value)=>{
  if(Array.isArray(value))return value.map(stable);
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,stable(v)]));
};
const stableJson=(value)=>JSON.stringify(stable(value));
const sha=(value)=>createHash('sha256').update(Buffer.isBuffer(value)?value:typeof value==='string'?value:stableJson(value)).digest('hex');

function git(args,{allowFailure=false}={}){
  const result=spawnSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024});
  if(result.status!==0){
    if(allowFailure)return null;
    throw new Error('GIT_FAILED:'+args.join(' ')+':'+String(result.stderr??'').trim());
  }
  return String(result.stdout??'').trim();
}
function gitShow(ref,path){
  const result=spawnSync('git',['show',ref+':'+path],{encoding:'utf8',maxBuffer:128*1024*1024});
  if(result.status!==0)throw new Error('GIT_SHOW_FAILED:'+ref+':'+path);
  return String(result.stdout??'');
}
function extractFunction(source,name){
  const marker='function '+name+'(';
  let start=source.indexOf(marker);
  if(start<0){
    const asyncMarker='async function '+name+'(';
    start=source.indexOf(asyncMarker);
  }
  if(start<0)throw new Error('FUNCTION_NOT_FOUND:'+name);
  const brace=source.indexOf('{',start);
  if(brace<0)throw new Error('FUNCTION_BRACE_NOT_FOUND:'+name);
  let depth=0;
  let quote=null;
  let escape=false;
  for(let i=brace;i<source.length;i+=1){
    const ch=source[i];
    if(quote){
      if(escape){escape=false;continue;}
      if(ch==='\\'){escape=true;continue;}
      if(ch===quote)quote=null;
      continue;
    }
    if(ch==="'"||ch==='"`'||ch==='"'){quote=ch;continue;}
    if(ch==='{')depth+=1;
    if(ch==='}'){
      depth-=1;
      if(depth===0)return source.slice(start,i+1);
    }
  }
  throw new Error('FUNCTION_UNTERMINATED:'+name);
}
function executionSemanticSource(ref){
  const source=gitShow(ref,PROOF_SCRIPT);
  const constants=[
    'PRODUCT_ID','SHARD_INDEX','SHARD_NODE_ID','TARGET_ROOM','TARGET_WINDOW','TARGET_SASH',
    'TARGET_SIZE_CLASS','TARGET_GLASS_FAMILY','TARGET_PARTITION_KEY','TARGET_PARTITION_SEED_JSON',
    'TARGET_PARTITION_SEED','MAX_STATES','MAX_TERMINALS','MAX_RESOLVER_CACHE','CONTINUOUS_KEYS','TECHNICAL_KEYS'
  ].map((name)=>{
    const re=new RegExp('^const '+name+'=.*;$','m');
    const match=source.match(re);
    if(!match)throw new Error('EXECUTION_CONSTANT_NOT_FOUND:'+name+':'+ref);
    return match[0];
  }).join('\n');
  const helperStart=source.indexOf('const stable=');
  const helperEnd=source.indexOf('\nfunction walk(',helperStart);
  if(helperStart<0||helperEnd<0)throw new Error('EXECUTION_HELPER_BLOCK_NOT_FOUND:'+ref);
  const helpers=source.slice(helperStart,helperEnd);
  const runShard=extractFunction(source,'runShard');
  return [constants,helpers,runShard].join('\n---\n');
}
function executionDependencyFingerprint(ref){
  const policy=JSON.parse(gitShow(ref,POLICY_PATH));
  const family=policy.families?.UCHIRIMO_SELECTOR;
  if(!family)throw new Error('UCHIRIMO_SELECTOR_POLICY_MISSING:'+ref);
  const deps=[];
  for(const path of family.dependencies??[]){
    if(path===PROOF_SCRIPT||path===BATCH_RUNNER)continue;
    if(path.includes('*'))throw new Error('UCHIRIMO_CARRY_FORWARD_GLOB_DEPENDENCY_UNSUPPORTED:'+path);
    const blob=git(['rev-parse',ref+':'+path],{allowFailure:true});
    // Match proof-dependency-fingerprint.mjs semantics: dependency patterns identify
    // tracked files when present; an absent optional path (for example package-lock.json)
    // is not itself a proof dependency and therefore is omitted consistently.
    if(!blob)continue;
    deps.push({path,blob_sha:blob});
  }
  return sha({
    family:'UCHIRIMO_SELECTOR_PARTITION_EXECUTION',
    proof_model:'UCHIRIMO_REACHABLE_DISCRETE_SELECTOR_EXHAUSTIVE_SHARD_V10',
    semantic_source_sha256:sha(executionSemanticSource(ref)),
    dependencies:deps
  });
}
function isAncestor(source,current){
  const r=spawnSync('git',['merge-base','--is-ancestor',source,current],{encoding:'utf8'});
  return r.status===0;
}
function changedPaths(source,current){
  if(source===current)return [];
  const out=git(['diff','--name-only',source+'..'+current]);
  return out?out.split('\n').map((x)=>x.trim()).filter(Boolean):[];
}
async function fetchWithRetry(url,options,label){
  let lastError;
  for(let attempt=1;attempt<=4;attempt+=1){
    try{
      const response=await fetch(url,options);
      if(response.ok)return response;
      if(response.status<500&&response.status!==429)throw new Error(label+'_HTTP_'+response.status);
      lastError=new Error(label+'_HTTP_'+response.status);
    }catch(error){
      lastError=error;
    }
    if(attempt<4){
      const delayMs=attempt*1500;
      console.warn(label+'_RETRY attempt='+attempt+' delay_ms='+delayMs+' reason='+String(lastError?.message??lastError));
      await new Promise((resolve)=>setTimeout(resolve,delayMs));
    }
  }
  throw new Error(label+'_RETRY_EXHAUSTED:'+String(lastError?.message??lastError));
}
async function apiJson(path){
  const response=await fetchWithRetry(API+path,{headers:{
    Authorization:'Bearer '+TOKEN,
    Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28'
  }},'GITHUB_API:'+path);
  return response.json();
}
async function apiBuffer(path){
  const response=await fetchWithRetry(API+path,{headers:{
    Authorization:'Bearer '+TOKEN,
    Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28'
  },redirect:'follow'},'GITHUB_DOWNLOAD:'+path);
  return Buffer.from(await response.arrayBuffer());
}
async function listArtifacts(runId){
  const out=[];
  for(let page=1;page<=20;page+=1){
    const payload=await apiJson('/repos/'+REPO+'/actions/runs/'+runId+'/artifacts?per_page=100&page='+page);
    const rows=payload.artifacts??[];
    out.push(...rows);
    if(rows.length<100)break;
  }
  return out;
}
function unzipList(zipPath){
  const r=spawnSync('unzip',['-Z1',zipPath],{encoding:'utf8',maxBuffer:64*1024*1024});
  if(r.status!==0)throw new Error('UNZIP_LIST_FAILED:'+zipPath);
  return String(r.stdout??'').split('\n').map((x)=>x.trim()).filter(Boolean);
}
function unzipEntry(zipPath,entry,{binary=false}={}){
  const r=spawnSync('unzip',['-p',zipPath,entry],{encoding:binary?null:'utf8',maxBuffer:256*1024*1024});
  if(r.status!==0)throw new Error('UNZIP_ENTRY_FAILED:'+entry);
  return r.stdout;
}
function currentSeed(row){
  const seed={room_specification:row.room_specification,window_type:row.window_type};
  if(row.sash_configuration!=='__UNSET__')seed.sash_configuration=row.sash_configuration;
  if(row.size_class!=='__UNSET__')seed.size_class=row.size_class;
  seed.glass_family=row.glass_family;
  Object.assign(seed,JSON.parse(row.partition_seed_json??'{}'));
  return stable(seed);
}

const plan=JSON.parse(readFileSync(PLAN_PATH,'utf8'));
if(plan.exact_head!==HEAD)throw new Error('UCHIRIMO_CARRY_FORWARD_PLAN_HEAD_MISMATCH');
const partitions=Array.isArray(plan.partitions)?plan.partitions:[];
if(!partitions.length||Number(plan.shard_count)!==partitions.length)throw new Error('UCHIRIMO_CARRY_FORWARD_PLAN_INVALID');
const currentByKey=new Map(partitions.map((row)=>[String(row.partition_key),row]));
if(currentByKey.size!==partitions.length)throw new Error('UCHIRIMO_CARRY_FORWARD_CURRENT_PLAN_DUPLICATE');

const runtime=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');
if(!runtime?.sourcePackageIntegrity?.match)throw new Error('UCHIRIMO_CARRY_FORWARD_RUNTIME_INTEGRITY_FAIL');
const currentRuntimeHash=String(runtime.sourcePackageIntegrity.actual??'');
const currentExecutionFingerprint=executionDependencyFingerprint(HEAD);

const runsPayload=await apiJson('/repos/'+REPO+'/actions/workflows/project-governance-gate.yml/runs?branch='+encodeURIComponent(BRANCH)+'&per_page=100');
// Resume is deliberately allowed from the same Exact HEAD and, on a rerun,
 // from earlier attempts of the same workflow run. A timeout must never erase
 // already-PASS partition evidence.
const priorRuns=(runsPayload.workflow_runs??[])
  .filter((run)=>{
    if(!run.head_sha)return false;
    if(Number(run.id)===RUN_ID)return RUN_ATTEMPT>1;
    return true;
  })
  .slice(0,MAX_SOURCE_RUNS);

const candidates=[];
for(const run of priorRuns){
  const sourceHead=String(run.head_sha??'');
  if(!/^[0-9a-f]{40}$/.test(sourceHead)||!isAncestor(sourceHead,HEAD))continue;
  let fp;
  try{fp=executionDependencyFingerprint(sourceHead);}catch{continue;}
  if(fp!==currentExecutionFingerprint)continue;
  const artifacts=await listArtifacts(run.id);
  const shardArtifacts=artifacts.filter((a)=>/^uchirimo-selector-proof-(?:shard-\d+|batch-[A-Za-z0-9._-]+)-[0-9a-f]{40}-attempt-\d+$/.test(String(a.name??''))&&!a.expired);
  if(!shardArtifacts.length)continue;
  candidates.push({run,sourceHead,artifacts:shardArtifacts});
}
candidates.sort((a,b)=>
  Number(b.sourceHead===HEAD)-Number(a.sourceHead===HEAD) ||
  Number(Number(b.run.id)===RUN_ID)-Number(Number(a.run.id)===RUN_ID) ||
  b.artifacts.length-a.artifacts.length ||
  Date.parse(b.run.created_at??0)-Date.parse(a.run.created_at??0)
);
const selectedSources=candidates.slice(0,MAX_CANDIDATE_RUNS);
const HEAVY_DURATION_THRESHOLD_MS=10*60*1000;
const heavyByKey=new Map();

const reused=[];
const reusedKeys=new Set();
const sourceSummaries=[];
const temp=mkdtempSync(join(tmpdir(),'uchirimo-carry-'));
try{
  for(const source of selectedSources){
    if(reusedKeys.size===currentByKey.size)break;
    const sourceChanges=changedPaths(source.sourceHead,HEAD);
    let acceptedFromSource=0;
    for(const artifact of source.artifacts){
      if(reusedKeys.size===currentByKey.size)break;
      const zip=await apiBuffer('/repos/'+REPO+'/actions/artifacts/'+artifact.id+'/zip');
      const zipPath=join(temp,String(artifact.id)+'.zip');
      writeFileSync(zipPath,zip);
      const entries=unzipList(zipPath);
      const batchEntries=entries.filter((name)=>/batch-[A-Za-z0-9._-]+-report\.json$/.test(name));
      for(const batchEntry of batchEntries){
        const batchReport=JSON.parse(String(unzipEntry(zipPath,batchEntry)));
        if(String(batchReport.exact_head??'')!==source.sourceHead)continue;
        for(const result of batchReport.results??[]){
          const partitionKey=String(result.partition_key??'');
          if(!currentByKey.has(partitionKey))continue;
          const started=Date.parse(String(result.started_at??''));
          const completed=Date.parse(String(result.completed_at??''));
          const durationMs=Number.isFinite(started)&&Number.isFinite(completed)&&completed>=started ? completed-started : 0;
          const timedOut=result.timed_out===true;
          if(!timedOut&&durationMs<HEAVY_DURATION_THRESHOLD_MS)continue;
          const prior=heavyByKey.get(partitionKey);
          const observation={
            partition_key:partitionKey,
            source_run_id:Number(source.run.id),
            source_exact_head:source.sourceHead,
            source_artifact_identity:String(artifact.name),
            timed_out:timedOut,
            duration_ms:durationMs,
            classification:timedOut?'OBSERVED_TIMEOUT':'OBSERVED_SLOW'
          };
          if(!prior || Number(observation.timed_out)>Number(prior.timed_out) || observation.duration_ms>prior.duration_ms){
            heavyByKey.set(partitionKey,observation);
          }
        }
      }
      const reportEntries=entries.filter((name)=>/shard-\d+-report\.json$/.test(name));
      if(!reportEntries.length)continue;
      for(const reportEntry of reportEntries){
        if(reusedKeys.size===currentByKey.size)break;
        const report=JSON.parse(String(unzipEntry(zipPath,reportEntry)));
        if(report.status!=='PASS'||report.unverified_discrete_selector_case_count!==0||report.runtime_integrity_match!==true)continue;
        if(String(report.exact_head??'')!==source.sourceHead)continue;
        if(String(report.runtime_manifest_sha256??'')!==currentRuntimeHash)continue;
        if(String(report.proof_model??'')!=='UCHIRIMO_REACHABLE_DISCRETE_SELECTOR_EXHAUSTIVE_SHARD_V10')continue;
        const partitionKey=String(report.partition_key??'');
        const current=currentByKey.get(partitionKey);
        if(!current||reusedKeys.has(partitionKey))continue;
        if(stableJson(report.seed??{})!==stableJson(currentSeed(current)))continue;
        const caseName=String(report.case_artifact??'');
        const caseEntry=entries.find((name)=>basename(name)===basename(caseName));
        if(!caseEntry)continue;
        const caseBytes=Buffer.from(unzipEntry(zipPath,caseEntry,{binary:true}));
        const caseSha=sha(caseBytes);
        if(caseSha!==String(report.case_artifact_sha256??''))continue;
        const currentCaseName='shard-'+current.shard+'-terminal-digests.jsonl';
        const currentReportName='shard-'+current.shard+'-report.json';
        const bindingName='shard-'+current.shard+'-current-head-binding.json';
        const binding={schema_version:'1.0.0',binding_type:'CURRENT_HEAD_PARTITION_PROOF_CARRY_FORWARD',status:'PASS',family:'UCHIRIMO_SELECTOR',source_exact_head:source.sourceHead,current_exact_head:HEAD,source_run_id:Number(source.run.id),source_artifact_identity:String(artifact.name),source_artifact_id:Number(artifact.id),source_artifact_sha256:sha(zip),source_case_artifact_sha256:caseSha,partition_key:partitionKey,current_shard_index:Number(current.shard),source_shard_index:Number(report.shard_index),runtime_manifest_sha256:currentRuntimeHash,execution_dependency_fingerprint:currentExecutionFingerprint,changed_paths:sourceChanges,impact_decision:'PARTITION_IDENTITY_AND_EXECUTION_DEPENDENCIES_UNCHANGED',generated_at:new Date().toISOString()};
        const rebound={...report,exact_head:HEAD,shard_index:Number(current.shard),shard_count:Number(plan.shard_count),run_attempt:Number(process.env.GITHUB_RUN_ATTEMPT??1),case_artifact:currentCaseName,evidence_origin:'CURRENT_HEAD_CARRY_FORWARD',source_exact_head:source.sourceHead,source_run_id:Number(source.run.id),source_artifact_identity:String(artifact.name),current_head_binding:binding,status:'PASS'};
        writeFileSync(join(OUT,currentCaseName),caseBytes);
        writeFileSync(join(OUT,currentReportName),JSON.stringify(rebound,null,2)+'\n');
        writeFileSync(join(OUT,bindingName),JSON.stringify(binding,null,2)+'\n');
        reusedKeys.add(partitionKey);
        acceptedFromSource+=1;
        reused.push({shard:Number(current.shard),partition_key:partitionKey,source_run_id:Number(source.run.id),source_exact_head:source.sourceHead,source_shard_index:Number(report.shard_index),source_artifact_identity:String(artifact.name)});
      }
    }
    sourceSummaries.push({
      run_id:Number(source.run.id),
      exact_head:source.sourceHead,
      available_artifact_count:source.artifacts.length,
      accepted_partition_count:acceptedFromSource
    });
  }
}finally{
  rmSync(temp,{recursive:true,force:true});
}

reused.sort((a,b)=>a.shard-b.shard);
const heavyObservations=[...heavyByKey.values()].sort((a,b)=>a.partition_key.localeCompare(b.partition_key));
const manifest={
  schema_version:'1.0.0',
  status:'PASS',
  current_exact_head:HEAD,
  current_shard_count:Number(plan.shard_count),
  runtime_manifest_sha256:currentRuntimeHash,
  execution_dependency_fingerprint:currentExecutionFingerprint,
  source_runs:sourceSummaries,
  resume_policy:'SAME_HEAD_AND_PRIOR_ATTEMPT_PARTITION_REUSE_V1',
  workflow_run_id:RUN_ID,
  workflow_run_attempt:RUN_ATTEMPT,
  candidate_run_limit:MAX_CANDIDATE_RUNS,
  reused_partition_count:reused.length,
  rerun_partition_count:Number(plan.shard_count)-reused.length,
  heavy_detection_policy:'OBSERVED_TIMEOUT_OR_10_MINUTE_DURATION_FROM_COMPATIBLE_SOURCE_RUNS_V1',
  heavy_duration_threshold_ms:HEAVY_DURATION_THRESHOLD_MS,
  heavy_partition_count:heavyObservations.length,
  heavy_partition_keys:heavyObservations.map((row)=>row.partition_key),
  heavy_partition_observations:heavyObservations,
  reused_shard_indices:reused.map((row)=>row.shard),
  reused_partition_keys:reused.map((row)=>row.partition_key),
  reused_partitions:reused
};
writeFileSync(join(OUT,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('UCHIRIMO_PARTITION_CARRY_FORWARD=PASS');
console.log('UCHIRIMO_CARRY_FORWARD_SOURCE_RUNS='+sourceSummaries.map((row)=>row.run_id+':'+row.accepted_partition_count).join(','));
console.log('UCHIRIMO_RESUME_POLICY='+manifest.resume_policy);
console.log('UCHIRIMO_CARRY_FORWARD_REUSED='+manifest.reused_partition_count);
console.log('UCHIRIMO_CARRY_FORWARD_RERUN='+manifest.rerun_partition_count);
console.log('UCHIRIMO_CARRY_FORWARD_HEAVY='+manifest.heavy_partition_count);
