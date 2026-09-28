import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { CONTROLLER_CONTRACT_VERSION, sha256, stable } from './uchirimo-v11-recovery-controller.mjs';
import {bindControllerEvidenceReport} from './uchirimo-controller-evidence-binding.mjs';
import {fetchWithRetry} from './uchirimo-carry-transport.mjs';

const HEAD=String(process.env.HEAD_SHA??process.env.GITHUB_SHA??'');
const REPO=String(process.env.GITHUB_REPOSITORY??'');
const TOKEN=String(process.env.GH_TOKEN??process.env.GITHUB_TOKEN??'');
const API=String(process.env.GITHUB_API_URL??'https://api.github.com');
const PLAN_PATH=String(process.env.UCHIRIMO_V12_PARENT_PLAN??'artifacts/uchirimo-v12-parent-plan/all-partitions.json');
const STATE_PATH=String(process.env.UCHIRIMO_V12_STATE??'artifacts/uchirimo-v12-controller/controller-state.json');
const UNITS_PATH=String(process.env.UCHIRIMO_V12_UNITS??'artifacts/uchirimo-v12-controller/recovery-units.json');
const PARENTS_PATH=String(process.env.UCHIRIMO_V12_PARENT_STATUS??'artifacts/uchirimo-v12-controller/parent-status.json');
const CARRY_DIR=String(process.env.UCHIRIMO_V12_CARRY_FORWARD_DIR??'artifacts/uchirimo-selector-proof-carry-forward');
const LOCAL_EVIDENCE_ROOT=String(process.env.UCHIRIMO_V12_LOCAL_EVIDENCE_ROOT??'');
const OUT=String(process.env.UCHIRIMO_V12_FINALIZED_OUT??'artifacts/uchirimo-v12-finalized-shards');

if(!HEAD)throw new Error('UCHIRIMO_V12_FINALIZER_HEAD_REQUIRED');
mkdirSync(OUT,{recursive:true});

const readJson=(path)=>JSON.parse(readFileSync(path,'utf8'));
const rawSha=(bytes)=>createHash('sha256').update(bytes).digest('hex');
const fileSha=(path)=>rawSha(readFileSync(path));
const writeJson=(path,value)=>writeFileSync(path,JSON.stringify(value,null,2)+'\n');

function walk(dir){
  const out=[];
  if(!existsSync(dir))return out;
  const visit=(path)=>{
    const stat=statSync(path);
    if(stat.isDirectory())for(const name of readdirSync(path))visit(join(path,name));
    else out.push(path);
  };
  visit(dir);
  return out;
}

function byBase(dir){
  const map=new Map();
  for(const path of walk(dir)){
    const base=basename(path);
    if(!map.has(base))map.set(base,[]);
    map.get(base).push(path);
  }
  return map;
}

function uniqueLocal(index,base){
  const paths=index.get(base)??[];
  if(!paths.length)return null;
  const rows=paths.map((path)=>({path,hash:fileSha(path)}));
  if(new Set(rows.map((row)=>row.hash)).size!==1)throw new Error('UCHIRIMO_V12_FINALIZER_LOCAL_CONFLICT:'+base);
  return rows[0];
}

async function apiJson(path){
  if(!REPO||!TOKEN)throw new Error('UCHIRIMO_V12_FINALIZER_GITHUB_ENV_MISSING');
  const response=await fetchWithRetry(API+path,{headers:{Authorization:'Bearer '+TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}},'GITHUB_API:'+path);
  return response.json();
}

async function apiBuffer(path){
  if(!REPO||!TOKEN)throw new Error('UCHIRIMO_V12_FINALIZER_GITHUB_ENV_MISSING');
  const response=await fetchWithRetry(API+path,{headers:{Authorization:'Bearer '+TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},redirect:'follow'},'GITHUB_DOWNLOAD:'+path);
  return Buffer.from(await response.arrayBuffer());
}

const runArtifactCache=new Map();
async function listArtifacts(runId){
  const cacheKey=String(runId);
  if(runArtifactCache.has(cacheKey))return runArtifactCache.get(cacheKey);
  const rows=[];
  for(let page=1;;page+=1){
    const payload=await apiJson('/repos/'+REPO+'/actions/runs/'+runId+'/artifacts?per_page=100&page='+page);
    const batch=payload.artifacts??[];
    rows.push(...batch);
    if(batch.length<100||rows.length>=Number(payload.total_count??rows.length))break;
  }
  runArtifactCache.set(cacheKey,rows);
  return rows;
}

function unzipList(zipPath){
  const p=spawnSync('unzip',['-Z1',zipPath],{encoding:'utf8',maxBuffer:64*1024*1024});
  if(p.status!==0)throw new Error('UCHIRIMO_V12_FINALIZER_UNZIP_LIST_FAIL:'+zipPath);
  return String(p.stdout??'').split('\n').map((x)=>x.trim()).filter(Boolean);
}

function unzipEntry(zipPath,entry,{binary=false}={}){
  const p=spawnSync('unzip',['-p',zipPath,entry],{encoding:binary?null:'utf8',maxBuffer:512*1024*1024});
  if(p.status!==0)throw new Error('UCHIRIMO_V12_FINALIZER_UNZIP_ENTRY_FAIL:'+entry);
  return p.stdout;
}

const artifactCache=new Map();
async function artifactSource(runId,artifactIdentity,temp){
  const cacheKey=String(runId)+':'+String(artifactIdentity);
  if(artifactCache.has(cacheKey))return artifactCache.get(cacheKey);
  if(LOCAL_EVIDENCE_ROOT){
    const candidate=join(LOCAL_EVIDENCE_ROOT,String(artifactIdentity));
    if(existsSync(candidate)&&statSync(candidate).isDirectory()){
      const source={type:'local',root:candidate,index:byBase(candidate),identity:String(artifactIdentity),run_id:Number(runId)};
      artifactCache.set(cacheKey,source);
      return source;
    }
  }
  const artifacts=await listArtifacts(runId);
  const matches=artifacts.filter((row)=>!row.expired&&String(row.name)===String(artifactIdentity));
  if(matches.length!==1)throw new Error('UCHIRIMO_V12_FINALIZER_ARTIFACT_IDENTITY_COUNT:'+artifactIdentity+':'+matches.length);
  const artifact=matches[0];
  const zip=await apiBuffer('/repos/'+REPO+'/actions/artifacts/'+artifact.id+'/zip');
  const zipPath=join(temp,String(artifact.id)+'.zip');
  writeFileSync(zipPath,zip);
  const entries=unzipList(zipPath);
  const source={type:'zip',zipPath,entries,identity:String(artifactIdentity),artifact_id:Number(artifact.id),artifact_zip_sha256:rawSha(zip),run_id:Number(runId)};
  artifactCache.set(cacheKey,source);
  return source;
}

function sourceBytes(source,base){
  if(source.type==='local'){
    const row=uniqueLocal(source.index,base);
    if(!row)throw new Error('UCHIRIMO_V12_FINALIZER_SOURCE_FILE_MISSING:'+source.identity+':'+base);
    return readFileSync(row.path);
  }
  const matches=source.entries.filter((entry)=>basename(entry)===base);
  if(matches.length!==1)throw new Error('UCHIRIMO_V12_FINALIZER_SOURCE_FILE_COUNT:'+source.identity+':'+base+':'+matches.length);
  return Buffer.from(unzipEntry(source.zipPath,matches[0],{binary:true}));
}

function validateCanonicalReport(report,parent,runtimeHash){
  if(report.status!=='PASS'||Number(report.unverified_discrete_selector_case_count??0)!==0)throw new Error('UCHIRIMO_V12_FINALIZER_REPORT_NOT_PASS:'+parent.shard);
  if(String(report.exact_head??'')!==HEAD)throw new Error('UCHIRIMO_V12_FINALIZER_REPORT_HEAD_MISMATCH:'+parent.shard);
  if(String(report.partition_key??'')!==String(parent.partition_key))throw new Error('UCHIRIMO_V12_FINALIZER_REPORT_PARTITION_MISMATCH:'+parent.shard);
  if(Number(report.shard_index)!==Number(parent.shard))throw new Error('UCHIRIMO_V12_FINALIZER_REPORT_SHARD_MISMATCH:'+parent.shard);
  if(report.runtime_integrity_match!==true||String(report.runtime_manifest_sha256??'')!==runtimeHash)throw new Error('UCHIRIMO_V12_FINALIZER_REPORT_RUNTIME_MISMATCH:'+parent.shard);
  if(!String(report.case_artifact??'')||!/^[0-9a-f]{64}$/.test(String(report.case_artifact_sha256??'')))throw new Error('UCHIRIMO_V12_FINALIZER_REPORT_CASE_IDENTITY_INVALID:'+parent.shard);
}

const plan=readJson(PLAN_PATH);
const state=readJson(STATE_PATH);
const unitsEnvelope=readJson(UNITS_PATH);
const parentsEnvelope=readJson(PARENTS_PATH);
if(plan.status!=='PASS'||Number(plan.shard_count)!==3956||!Array.isArray(plan.partitions)||plan.partitions.length!==3956)throw new Error('UCHIRIMO_V12_FINALIZER_PARENT_PLAN_INVALID');
if(state.controller_contract_version!==CONTROLLER_CONTRACT_VERSION||unitsEnvelope.controller_contract_version!==CONTROLLER_CONTRACT_VERSION||parentsEnvelope.controller_contract_version!==CONTROLLER_CONTRACT_VERSION)throw new Error('UCHIRIMO_V12_FINALIZER_CONTRACT_MISMATCH');
if(String(state.exact_head)!==HEAD||String(unitsEnvelope.exact_head)!==HEAD||String(parentsEnvelope.exact_head)!==HEAD)throw new Error('UCHIRIMO_V12_FINALIZER_HEAD_MISMATCH');
if(state.next_action!=='FINAL_AGGREGATE'||Number(state.closed_parent_count)!==3956||Number(state.open_parent_count)!==0)throw new Error('UCHIRIMO_V12_FINALIZER_STATE_NOT_READY:'+String(state.next_action)+':'+state.closed_parent_count+':'+state.open_parent_count);
if(String(parentsEnvelope.parent_population_sha256??'')!==String(state.parent_population_sha256??''))throw new Error('UCHIRIMO_V12_FINALIZER_POPULATION_HASH_MISMATCH');

const parentByKey=new Map(plan.partitions.map((row)=>[String(row.partition_key),row]));
const units=unitsEnvelope.units??{};
const parents=parentsEnvelope.parents??{};
if(Object.keys(parents).length!==3956)throw new Error('UCHIRIMO_V12_FINALIZER_PARENT_STATUS_COUNT:'+Object.keys(parents).length);

const carryIndex=byBase(CARRY_DIR);
const temp=mkdtempSync(join(tmpdir(),'uchirimo-v12-finalizer-'));
const sourceArtifacts=new Map();
let carryCount=0,freshRootCount=0,recoveryCount=0;
try{
  for(const parent of [...plan.partitions].sort((a,b)=>Number(a.shard)-Number(b.shard))){
    const key=String(parent.partition_key);
    const status=parents[key];
    if(!status)throw new Error('UCHIRIMO_V12_FINALIZER_PARENT_STATUS_MISSING:'+key);
    const targetReport=join(OUT,'shard-'+parent.shard+'-report.json');
    if(status.closure_type==='ROOT_PASS'&&status.status==='ROOT_PASS_CARRY_FORWARD'){
      const reportBase='shard-'+parent.shard+'-report.json';
      const localReport=uniqueLocal(carryIndex,reportBase);
      let reportBytes,report,caseBytes;
      if(localReport){
        reportBytes=readFileSync(localReport.path);
        report=JSON.parse(String(reportBytes));
        const caseRow=uniqueLocal(carryIndex,String(report.case_artifact));
        if(!caseRow)throw new Error('UCHIRIMO_V12_FINALIZER_CARRY_CASE_MISSING:'+parent.shard);
        caseBytes=readFileSync(caseRow.path);
      }else{
        const runId=Number(status.current_carry_forward_run_id??0);
        const artifactIdentity=String(status.current_carry_forward_artifact_identity??'');
        if(!runId||!artifactIdentity)throw new Error('UCHIRIMO_V12_FINALIZER_CARRY_SOURCE_IDENTITY_MISSING:'+parent.shard);
        const source=await artifactSource(runId,artifactIdentity,temp);
        reportBytes=sourceBytes(source,reportBase);
        report=JSON.parse(String(reportBytes));
        caseBytes=sourceBytes(source,String(report.case_artifact));
        sourceArtifacts.set(String(source.identity),{run_id:source.run_id,artifact_id:source.artifact_id??null,artifact_identity:source.identity,artifact_zip_sha256:source.artifact_zip_sha256??null});
      }
      const requiresRebind=report.exact_head!==HEAD;
      report=bindControllerEvidenceReport(report,{head:HEAD,state,sourceReportSha256:rawSha(reportBytes)});
      validateCanonicalReport(report,parent,String(state.runtime_manifest_sha256));
      if(report.evidence_origin!=='CURRENT_HEAD_CARRY_FORWARD'||report.current_head_binding?.status!=='PASS'||String(report.current_head_binding?.current_exact_head??'')!==HEAD)throw new Error('UCHIRIMO_V12_FINALIZER_CARRY_BINDING_INVALID:'+parent.shard);
      if(rawSha(caseBytes)!==String(report.case_artifact_sha256))throw new Error('UCHIRIMO_V12_FINALIZER_CARRY_CASE_SHA_MISMATCH:'+parent.shard);
      if(requiresRebind)writeJson(targetReport,report);
      else writeFileSync(targetReport,reportBytes);
      writeFileSync(join(OUT,String(report.case_artifact)),caseBytes);
      carryCount+=1;
      continue;
    }
    const rootId=String(status.root_recovery_unit_id??'');
    const root=units[rootId];
    if(!root)throw new Error('UCHIRIMO_V12_FINALIZER_ROOT_UNIT_MISSING:'+parent.shard);
    if(status.closure_type==='ROOT_PASS'&&status.status==='ROOT_PASS_FRESH'){
      if(root.state!=='PASS'||!root.evidence_source_run_id||!root.evidence_artifact_identity)throw new Error('UCHIRIMO_V12_FINALIZER_FRESH_ROOT_EVIDENCE_MISSING:'+parent.shard);
      const source=await artifactSource(root.evidence_source_run_id,root.evidence_artifact_identity,temp);
      const reportBytes=sourceBytes(source,String(root.proof_report_file));
      if(rawSha(reportBytes)!==String(root.proof_report_sha256))throw new Error('UCHIRIMO_V12_FINALIZER_FRESH_ROOT_REPORT_SHA_MISMATCH:'+parent.shard);
      const sourceReport=JSON.parse(String(reportBytes));
      const requiresRebind=sourceReport.exact_head!==HEAD;
      const report=bindControllerEvidenceReport(sourceReport,{head:HEAD,state,sourceReportSha256:rawSha(reportBytes)});
      validateCanonicalReport(report,parent,String(state.runtime_manifest_sha256));
      const caseBytes=sourceBytes(source,String(report.case_artifact));
      if(rawSha(caseBytes)!==String(report.case_artifact_sha256))throw new Error('UCHIRIMO_V12_FINALIZER_FRESH_ROOT_CASE_SHA_MISMATCH:'+parent.shard);
      if(requiresRebind)writeJson(targetReport,report);
      else writeFileSync(targetReport,reportBytes);
      writeFileSync(join(OUT,String(report.case_artifact)),caseBytes);
      sourceArtifacts.set(String(source.identity),{run_id:source.run_id,artifact_id:source.artifact_id??null,artifact_identity:source.identity,artifact_zip_sha256:source.artifact_zip_sha256??null});
      freshRootCount+=1;
      continue;
    }
    if(status.closure_type==='RECOVERY_TREE_PASS'&&status.status==='RECOVERY_TREE_PASS'){
      const synthesized=structuredClone(status.synthesized_parent_report);
      if(!synthesized||synthesized.status!=='PASS')throw new Error('UCHIRIMO_V12_FINALIZER_SYNTHESIZED_REPORT_MISSING:'+parent.shard);
      const leafLines=[];
      for(const leaf of synthesized.recovery_leaf_evidence??[]){
        const unit=units[String(leaf.recovery_unit_id)];
        if(!unit||unit.state!=='PASS'||!unit.evidence_source_run_id||!unit.evidence_artifact_identity)throw new Error('UCHIRIMO_V12_FINALIZER_LEAF_EVIDENCE_MISSING:'+leaf.recovery_unit_id);
        const source=await artifactSource(unit.evidence_source_run_id,unit.evidence_artifact_identity,temp);
        const reportBytes=sourceBytes(source,String(unit.proof_report_file));
        if(rawSha(reportBytes)!==String(unit.proof_report_sha256))throw new Error('UCHIRIMO_V12_FINALIZER_LEAF_REPORT_SHA_MISMATCH:'+leaf.recovery_unit_id);
        const report=JSON.parse(String(reportBytes));
        if(String(report.recovery_unit_id??'')!==String(leaf.recovery_unit_id)||String(report.parent_partition_key??report.partition_key??'')!==key)throw new Error('UCHIRIMO_V12_FINALIZER_LEAF_IDENTITY_MISMATCH:'+leaf.recovery_unit_id);
        const caseBytes=sourceBytes(source,String(report.case_artifact));
        const caseSha=rawSha(caseBytes);
        if(caseSha!==String(report.case_artifact_sha256)||caseSha!==String(leaf.case_artifact_sha256))throw new Error('UCHIRIMO_V12_FINALIZER_LEAF_CASE_SHA_MISMATCH:'+leaf.recovery_unit_id);
        leafLines.push(JSON.stringify({
          recovery_unit_id:String(leaf.recovery_unit_id),
          decision_constraints_sha256:String(leaf.decision_constraints_sha256),
          proof_report_sha256:String(unit.proof_report_sha256),
          case_artifact_sha256:caseSha,
          terminal_context_count:Number(report.terminal_context_count??0),
          evidence_source_run_id:Number(unit.evidence_source_run_id),
          evidence_artifact_identity:String(unit.evidence_artifact_identity)
        }));
        sourceArtifacts.set(String(source.identity),{run_id:source.run_id,artifact_id:source.artifact_id??null,artifact_identity:source.identity,artifact_zip_sha256:source.artifact_zip_sha256??null});
      }
      leafLines.sort();
      const manifestBytes=Buffer.from(leafLines.join('\n')+'\n');
      const caseName='shard-'+parent.shard+'-recovery-tree-leaf-manifest.jsonl';
      const caseSha=rawSha(manifestBytes);
      const report={
        ...synthesized,
        schema_version:'2.0.0',
        exact_head:HEAD,
        shard_count:3956,
        run_attempt:Number(process.env.GITHUB_RUN_ATTEMPT??1),
        case_artifact:caseName,
        case_artifact_format:'UCHIRIMO_RECOVERY_TREE_LEAF_MANIFEST_JSONL_V1',
        case_artifact_sha256:caseSha,
        evidence_origin:'RECOVERY_TREE_SYNTHESIS',
        source_leaf_manifest_sha256:caseSha,
        status:'PASS'
      };
      validateCanonicalReport(report,parent,String(state.runtime_manifest_sha256));
      writeJson(targetReport,report);
      writeFileSync(join(OUT,caseName),manifestBytes);
      recoveryCount+=1;
      continue;
    }
    throw new Error('UCHIRIMO_V12_FINALIZER_PARENT_NOT_CLOSED:'+parent.shard+':'+String(status.status)+':'+String(status.closure_type));
  }

  const reports=walk(OUT).filter((path)=>/^shard-\d+-report\.json$/.test(basename(path))).map((path)=>readJson(path));
  if(reports.length!==3956)throw new Error('UCHIRIMO_V12_FINALIZER_REPORT_COUNT:'+reports.length);
  const keys=new Set(reports.map((report)=>String(report.partition_key)));
  if(keys.size!==3956||[...parentByKey.keys()].some((key)=>!keys.has(key)))throw new Error('UCHIRIMO_V12_FINALIZER_PARENT_COVERAGE_MISMATCH:'+keys.size);
  for(const report of reports){
    const casePath=join(OUT,String(report.case_artifact));
    if(!existsSync(casePath)||fileSha(casePath)!==String(report.case_artifact_sha256))throw new Error('UCHIRIMO_V12_FINALIZER_OUTPUT_CASE_SHA_MISMATCH:'+report.shard_index);
  }
  const manifest={
    schema_version:'1.0.0',
    controller_contract_version:CONTROLLER_CONTRACT_VERSION,
    exact_head:HEAD,
    parent_population_count:3956,
    parent_population_sha256:String(state.parent_population_sha256),
    carry_forward_parent_count:carryCount,
    fresh_root_parent_count:freshRootCount,
    recovery_tree_parent_count:recoveryCount,
    report_count:reports.length,
    source_artifacts:[...sourceArtifacts.values()].sort((a,b)=>String(a.artifact_identity).localeCompare(String(b.artifact_identity))),
    finalized_report_set_sha256:sha256(reports.map((report)=>({shard_index:report.shard_index,partition_key:report.partition_key,proof_model:report.proof_model,case_artifact_sha256:report.case_artifact_sha256,recovery_tree_root_sha256:report.recovery_tree_root_sha256??null})).sort((a,b)=>a.shard_index-b.shard_index)),
    status:'PASS'
  };
  writeJson(join(OUT,'v12-finalization-manifest.json'),manifest);
  console.log('UCHIRIMO_V12_FINALIZER=PASS parents=3956 carry='+carryCount+' fresh='+freshRootCount+' recovery='+recoveryCount+' evidence_sha256='+manifest.finalized_report_set_sha256);
}finally{
  rmSync(temp,{recursive:true,force:true});
}
