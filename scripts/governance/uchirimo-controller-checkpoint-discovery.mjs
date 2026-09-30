import {createHash} from 'node:crypto';
import {appendFileSync,existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,basename} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {loadRegisteredRuntime} from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import {CONTROLLER_CONTRACT_VERSION,sha256} from './uchirimo-v11-recovery-controller.mjs';
import {importCompatibleCheckpoint,parentPopulationHash,checkpointCoverage} from './uchirimo-controller-checkpoint.mjs';
import {validateExecutionFrontier} from './uchirimo-v11-recovery-controller-runner.mjs';
import {fetchWithRetry} from './uchirimo-carry-transport.mjs';

const head=String(process.env.HEAD_SHA??'');
const repo=String(process.env.GITHUB_REPOSITORY??'');
const currentRun=Number(process.env.GITHUB_RUN_ID??0);
const token=String(process.env.GH_TOKEN??process.env.GITHUB_TOKEN??'');
const api=String(process.env.GITHUB_API_URL??'https://api.github.com');
const branch=String(process.env.HEAD_BRANCH??process.env.GITHUB_HEAD_REF??process.env.GITHUB_REF_NAME??'');
const pinnedRunId=Number(process.env.UCHIRIMO_CHECKPOINT_SOURCE_RUN_ID??0);
const pinnedArtifactId=Number(process.env.UCHIRIMO_CHECKPOINT_SOURCE_ARTIFACT_ID??0);
const out=String(process.env.UCHIRIMO_V12_CONTROLLER_OUT??'artifacts/uchirimo-v12-controller');
const plan=JSON.parse(readFileSync(process.env.UCHIRIMO_V12_PARENT_PLAN??'artifacts/uchirimo-v12-parent-plan/all-partitions.json','utf8'));
const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
if(!/^[0-9a-f]{40}$/.test(head)||!repo||!token||!currentRun||!branch)throw new Error('UCHIRIMO_CHECKPOINT_DISCOVERY_ENV');
if((pinnedRunId&&!Number.isSafeInteger(pinnedRunId))||(pinnedArtifactId&&!Number.isSafeInteger(pinnedArtifactId))||Boolean(pinnedRunId)!==Boolean(pinnedArtifactId))throw new Error('UCHIRIMO_CHECKPOINT_PIN_INVALID');
const git=args=>execFileSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const show=(ref,path)=>git(['show',ref+':'+path]);
const output=(key,value)=>{if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,key+'='+String(value)+'\n');};
const json=async path=>(await fetchWithRetry(api+'/repos/'+repo+'/'+path,{headers},'CHECKPOINT_API:'+path)).json();
const controllerPath='scripts/governance/uchirimo-v11-recovery-controller.mjs';
const runnerPath='scripts/governance/uchirimo-v11-recovery-controller-runner.mjs';
const proofPath='scripts/uchirimo-full-selector-proof.mjs';
const batchPath='scripts/governance/uchirimo-selector-batch-runner.mjs';
const omitted=new Set([proofPath,batchPath,controllerPath,runnerPath,'project-governance/evidence-dependency-policy.json','scripts/governance/uchirimo-v11-recovery-finalizer.mjs']);
const dependencies=ref=>{
 const policy=JSON.parse(show(ref,'project-governance/evidence-dependency-policy.json'));
 const paths=policy.families?.UCHIRIMO_SELECTOR?.dependencies;if(!Array.isArray(paths))throw new Error('CHECKPOINT_POLICY_MISSING');
 return paths.filter(path=>!omitted.has(path)).map(path=>{if(path.includes('*'))throw new Error('CHECKPOINT_GLOB_UNSUPPORTED');const result=spawnSync('git',['rev-parse',ref+':'+path],{encoding:'utf8'});return {path,blob_sha:result.status===0?result.stdout.trim():null,presence:result.status===0?'PRESENT':'MISSING'};});
};
// Only lineage bookkeeping additions are ignored; selector/resolver/split execution must be byte-identical.
const stripBindings=text=>text.split('\n').filter(line=>!line.includes('compatible_head_bindings')).join('\n').trimEnd();
const executionFilesIdentical=source=>{
 if(show(source,proofPath)!==show(head,proofPath)||show(source,batchPath)!==show(head,batchPath))return false;
 if(stripBindings(show(source,controllerPath))!==stripBindings(show(head,controllerPath)))return false;
 if(stripBindings(show(source,runnerPath))!==stripBindings(show(head,runnerPath)))return false;
 return sha256(dependencies(source))===sha256(dependencies(head));
};
const runtime=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');
if(!runtime?.sourcePackageIntegrity?.match)throw new Error('UCHIRIMO_CHECKPOINT_RUNTIME_INTEGRITY');
const runtimeHash=String(runtime.sourcePackageIntegrity.actual);
const population=parentPopulationHash(plan);
const planner=sha256({controller_contract_version:CONTROLLER_CONTRACT_VERSION,parent_population_sha256:population});
const runs=pinnedRunId?[await json('actions/runs/'+pinnedRunId)]:(await json('actions/workflows/project-governance-gate.yml/runs?branch='+encodeURIComponent(branch)+'&per_page=100')).workflow_runs??[];
const candidates=[];
for(const run of runs){
 if(pinnedRunId&&(Number(run.id)!==pinnedRunId||run.head_branch!==branch))throw new Error('UCHIRIMO_CHECKPOINT_PIN_RUN_MISMATCH');
 if(Number(run.id)===currentRun||!run.head_sha)continue;
 if(spawnSync('git',['merge-base','--is-ancestor',run.head_sha,head]).status!==0)continue;
 let compatible;try{compatible=executionFilesIdentical(run.head_sha);}catch(error){console.log('UCHIRIMO_CHECKPOINT_INCOMPATIBLE_SOURCE='+run.id+' reason='+String(error.message).split('\n')[0]);compatible=false;}if(!compatible)continue;
 for(let page=1;;page++){
  const listing=await json('actions/runs/'+run.id+'/artifacts?per_page=100&page='+page);const rows=listing.artifacts??[];
  for(const artifact of rows)if(!artifact.expired&&(!pinnedArtifactId||Number(artifact.id)===pinnedArtifactId)&&new RegExp('^uchirimo-v12-controller-state-'+run.head_sha+'-g[0-9]+$').test(artifact.name))candidates.push({run,artifact});
  if(rows.length<100||page*100>=listing.total_count)break;
 }
}
if(pinnedArtifactId&&(candidates.length!==1||Number(candidates[0].artifact.id)!==pinnedArtifactId))throw new Error('UCHIRIMO_CHECKPOINT_PIN_ARTIFACT_MISSING');
candidates.sort((a,b)=>Date.parse(b.artifact.created_at)-Date.parse(a.artifact.created_at));
const temporary=mkdtempSync(join(tmpdir(),'uchirimo-checkpoint-'));
const valid=[];
try{
 for(const {run,artifact} of candidates){
  // Never silently fall back to an older checkpoint if a compatible checkpoint is unavailable/corrupt.
  const response=await fetchWithRetry(api+'/repos/'+repo+'/actions/artifacts/'+artifact.id+'/zip',{headers,redirect:'follow'},'CHECKPOINT_DOWNLOAD:'+artifact.id);
  const bytes=Buffer.from(await response.arrayBuffer());const digest=createHash('sha256').update(bytes).digest('hex');
  if(!artifact.digest||String(artifact.digest).replace(/^sha256:/,'')!==digest)throw new Error('UCHIRIMO_CHECKPOINT_ARCHIVE_DIGEST_MISMATCH:'+artifact.id);
  const zip=join(temporary,String(artifact.id)+'.zip');writeFileSync(zip,bytes);
  const entries=execFileSync('unzip',['-Z1',zip],{encoding:'utf8'}).trim().split('\n');
  const read=name=>{const matches=entries.filter(path=>basename(path)===name);if(matches.length!==1)throw new Error('UCHIRIMO_CHECKPOINT_FILE_COUNT:'+name);return JSON.parse(execFileSync('unzip',['-p',zip,matches[0]],{encoding:'utf8',maxBuffer:128*1024*1024}));};
  const state=read('controller-state.json');if(state.controller_contract_version!==CONTROLLER_CONTRACT_VERSION)continue;
  const input={state,unitsEnvelope:read('recovery-units.json'),certificatesEnvelope:read('split-certificates.json'),parentsEnvelope:read('parent-status.json'),plan,head,expected:{runtime_manifest_sha256:runtimeHash,execution_fingerprint:state.execution_fingerprint,planner_fingerprint:planner},source:{ancestor_verified:true,execution_files_identical:true,run_id:Number(run.id),artifact_id:Number(artifact.id),artifact_identity:artifact.name,artifact_digest:artifact.digest}};
  if(state.exact_head!==run.head_sha||!/^[0-9a-f]{64}$/.test(state.execution_fingerprint??''))throw new Error('UCHIRIMO_CHECKPOINT_SOURCE_IDENTITY_MISMATCH');
  const result=importCompatibleCheckpoint(input);
  const pass=new Set(Object.entries(result.unitsEnvelope.units).filter(([,u])=>u.state==='PASS').map(([id])=>id));
  const closed=new Set(Object.entries(result.parentsEnvelope.parents).filter(([,p])=>p.status!=='OPEN').map(([key])=>key));
  const split=new Set(Object.keys(result.certificatesEnvelope.certificates));valid.push({run,artifact,result,pass,closed,split});
 }
 const dominates=(a,b)=>checkpointCoverage(a.result,b.result).dominates;
 const selected=valid.find(candidate=>valid.every(other=>dominates(candidate,other)));
 if(valid.length&&!selected)throw new Error('UCHIRIMO_CHECKPOINT_INCOMPARABLE_PROGRESS_REQUIRES_MERGE');
 if(!selected){output('restored','false');console.log('UCHIRIMO_COMPATIBLE_CHECKPOINT=NONE');}
 else{
  selected.result.report.covered_prior_checkpoints=valid.filter(other=>other!==selected).map(other=>({source_run_id:Number(other.run.id),source_artifact_id:Number(other.artifact.id),source_artifact_identity:other.artifact.name,source_artifact_digest:other.artifact.digest,source_state_sha256:other.result.state.prior_state_sha256,source_exact_head:other.run.head_sha,...checkpointCoverage(selected.result,other.result)}));
  const frontier=await validateExecutionFrontier({plan,units:selected.result.unitsEnvelope.units,certificates:selected.result.certificatesEnvelope.certificates,parents:selected.result.parentsEnvelope.parents,state:selected.result.state});
  if(frontier.status!=='PASS')throw new Error('UCHIRIMO_CHECKPOINT_FRONTIER_INVALID:'+frontier.errors.join(','));
  mkdirSync(out,{recursive:true});
  writeFileSync(join(out,'preflight-report.json'),JSON.stringify(frontier,null,2)+'\n');
  for(const [name,key] of [['controller-state.json','state'],['recovery-units.json','unitsEnvelope'],['split-certificates.json','certificatesEnvelope'],['parent-status.json','parentsEnvelope'],['checkpoint-import-report.json','report']])writeFileSync(join(out,name),JSON.stringify(selected.result[key],null,2)+'\n');
  output('restored','true');output('source_run_id',selected.run.id);output('closed_parent_count',selected.result.state.closed_parent_count);output('pass_unit_count',selected.result.state.pass_unit_count);
  console.log('UCHIRIMO_COMPATIBLE_CHECKPOINT=PASS source_run='+selected.run.id+' closed='+selected.result.state.closed_parent_count+' pass_units='+selected.result.state.pass_unit_count+' selector_execution_count=0');
 }
}finally{rmSync(temporary,{recursive:true,force:true});}
