/** NON-PRODUCT-MASTER: frozen work inventory, durable continuation, safe handoff.
 * No Runtime/UI writes, no sampling, no independent release authority.
 */
import {createHash} from 'node:crypto';
import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync} from 'node:fs';
import {basename, dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {atomicJson, hash, instrumentV10, readCheckpoint, stable} from './uchirimo-checkpoint-hook.mjs';

export const SOURCE = Object.freeze({run:36189422570, head:'f6ea438bbf22fcfd459511af13f89499dd0ad5d1', artifact:10887444330,
  name:'uchirimo-nonbath-root-input-f6ea438bbf22fcfd459511af13f89499dd0ad5d1',
  digest:'sha256:4caa1a680d773061d74eb49070f92c31ee333f9f2078ff79632b128b550e9a7e',
  input_sha256:'cf629ec29437e20b0508f39fceef31e14d84591358af235095f357c290f75a85',
  runtime:'be4f1f77727424dc06ddf9de947201f33d4aee5219b182e37d0f178e1fb7147d',
  legacy_root2_run:36211199655, legacy_root2_head:'4c01e670c6302fafddbb7d34cce797b9e299441c',
  proof_blob:'94a86542cace253dc45e7b1f8589f98b837a4cce'});
const PROOF='scripts/uchirimo-full-selector-proof.mjs';
const DEPENDENCIES=['src/catalog','project-governance/runtime-snapshot.json','package.json','package-lock.json',PROOF,'scripts/governance/uchirimo-selector-batch-runner.mjs','scripts/governance/uchirimo-checkpoint-hook.mjs','scripts/governance/uchirimo-durable-recovery.mjs'];
const rd=p=>JSON.parse(readFileSync(p,'utf8'));
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
function api(path,method='GET') { return JSON.parse(execFileSync('gh',['api','--method',method,`repos/${process.env.GITHUB_REPOSITORY}/${path}`],{encoding:'utf8',maxBuffer:32*1024*1024})||'null'); }
function pages(path,key){const rows=[];for(let page=1;page<=100;page++){const x=api(`${path}${path.includes('?')?'&':'?'}per_page=100&page=${page}`);rows.push(...x[key]);if(x[key].length<100)return rows;}throw new Error('API_PAGINATION_LIMIT');}
function files(dir){return !existsSync(dir)?[]:readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?files(join(dir,x.name)):[join(dir,x.name)]);}
function exactHead(){const h=git('rev-parse','HEAD');if(h!==process.env.HEAD_SHA)throw new Error('EXACT_HEAD_MISMATCH');return h;}
function fingerprint(){return hash(git('ls-tree','-r','HEAD','--',...DEPENDENCIES));}
function verifyLegacySource(){if(git('rev-parse',`HEAD:${PROOF}`)!==SOURCE.proof_blob)throw new Error('LEGACY_PROOF_SOURCE_DRIFT');instrumentV10(readFileSync(PROOF,'utf8'));}

export function buildInventory(input, {head,semanticFingerprint,heldRoots=[]}) {
  if(input.status!=='READY'||input.exact_head!==SOURCE.head||input.root_count!==476||input.roots?.length!==476||input.runtime_manifest_sha256!==SOURCE.runtime)throw new Error('FROZEN_INPUT_INVALID');
  const roots=new Set(),partitions=new Set(),indices=new Set(),tasks=[];
  for(const root of input.roots){
    if(roots.has(root.original_parent_partition_id)||indices.has(root.root_index)||!Number.isInteger(root.root_index)||root.root_index<0||root.root_index>=476)throw new Error('ROOT_DUPLICATE_OR_INVALID');
    roots.add(root.original_parent_partition_id);indices.add(root.root_index);
    if(!Array.isArray(root.depth2_items)||!root.depth2_items.length)throw new Error('ROOT_EMPTY');
    for(const item of root.depth2_items){
      if(!item.PARTITION_ID||partitions.has(item.PARTITION_ID)||item.ROOT_HEAVY_PARENT_PARTITION_ID!==root.original_parent_partition_id||item.PRODUCT_NODE!==root.product_node)throw new Error('PARTITION_DUPLICATE_OR_PARENT_MISMATCH');
      partitions.add(item.PARTITION_ID);
      tasks.push({id:item.PARTITION_ID,root_index:root.root_index,original_parent_partition_id:root.original_parent_partition_id,node_id:item.PRODUCT_NODE,seed:stable(item.SELECTOR_PREFIX)});
    }
  }
  if(tasks.length!==7364||input.source_depth2_partition_count!==7364)throw new Error('PARTITION_UNIVERSE_MISMATCH');
  tasks.sort((a,b)=>a.id.localeCompare(b.id));
  for(let i=0;i<tasks.length;i++)tasks[i].lane=i%8;
  const universe={input_sha256:SOURCE.input_sha256,runtime_manifest_sha256:SOURCE.runtime,semantic_fingerprint:semanticFingerprint,tasks};
  return {schema:'UCHIRIMO_DURABLE_PLAN_V1',exact_head:head,plan_id:hash(universe),...universe,held_root_indices:[...new Set(heldRoots)].sort((a,b)=>a-b),
    source:SOURCE,original_parent_count:514,nonbath_parent_count:476,bath_parent_count:38,
    historical_bath_evidence:'RETAINED_NOT_CURRENT_HEAD_PASS',task_classification:'NON-PRODUCT-MASTER',product_master_mutation:0,
    recovery_reason:'CHECKPOINTED_EXECUTOR_REPLACES_TIMEOUT_AND_RESTART; V10_ENUMERATION_UNCHANGED',
    APP_INTEGRATION_READY:false,RELEASE_INPUT_GATE:'BLOCKED'};
}

async function prepare(out) {
  const head=exactHead();verifyLegacySource();mkdirSync(out,{recursive:true});
  const runtime=await (await import('../../src/catalog/runtime-master/runtime-master-registry.mjs')).loadRegisteredRuntime('YKK AP','ウチリモ 内窓');
  if(!runtime?.sourcePackageIntegrity?.match||runtime.sourcePackageIntegrity.actual!==SOURCE.runtime)throw new Error('RUNTIME_SNAPSHOT_MISMATCH');
  const observations=[];let holdAll=false,holdRoot2=false;
  for(const [run,expectedHead] of [[SOURCE.run,SOURCE.head],[SOURCE.legacy_root2_run,SOURCE.legacy_root2_head]]){
    const before=api(`actions/runs/${run}`);
    if(before.head_sha!==expectedHead)throw new Error('LEGACY_RUN_IDENTITY_MISMATCH');
    const artifacts=pages(`actions/runs/${run}/artifacts`,'artifacts');
    for(const artifact of artifacts){
      if(artifact.expired||!/^sha256:[a-f0-9]{64}$/.test(artifact.digest??''))throw new Error('SOURCE_ARTIFACT_UNAVAILABLE');
      const dest=join(out,'legacy',String(run),String(artifact.id));mkdirSync(dest,{recursive:true});
      execFileSync('gh',['run','download',String(run),'--repo',process.env.GITHUB_REPOSITORY,'--name',artifact.name,'--dir',dest],{stdio:'inherit'});
    }
    const afterArtifacts=pages(`actions/runs/${run}/artifacts`,'artifacts');
    const snapshot=a=>a.map(x=>[x.id,x.digest]).sort((a,b)=>a[0]-b[0]);
    if(hash(snapshot(artifacts))!==hash(snapshot(afterArtifacts)))throw new Error('LEGACY_ARTIFACT_SET_CHANGED_REPLAN_WITHOUT_CANCEL');
    const jobs=pages(`actions/runs/${run}/jobs?filter=latest`,'jobs');
    const active=jobs.filter(j=>j.status!=='completed' && (j.status==='in_progress'||j.started_at));
    let after=api(`actions/runs/${run}`),cancellation='NOT_REQUESTED';
    // Only the old large queue may be drained, and only with all published
    // evidence preserved and no running job. Never cancel active root 2.
    if(run===SOURCE.run&&after.status!=='completed'&&active.length===0){
      const recheck=pages(`actions/runs/${run}/jobs?filter=latest`,'jobs');
      if(recheck.some(j=>j.status!=='completed'&&(j.status==='in_progress'||j.started_at)))throw new Error('LEGACY_BECAME_ACTIVE_NOT_CANCELLED');
      execFileSync('gh',['api','--method','POST',`repos/${process.env.GITHUB_REPOSITORY}/actions/runs/${run}/cancel`],{stdio:'inherit'});
      cancellation='QUEUED_ONLY_CANCEL_REQUESTED';
      for(let n=0;n<6;n++){await new Promise(r=>setTimeout(r,2000));after=api(`actions/runs/${run}`);if(after.status==='completed')break;}
    }
    if(after.status!=='completed'){if(run===SOURCE.run)holdAll=true;else holdRoot2=true;}
    observations.push({run_id:run,source_exact_head:expectedHead,status:after.status,conclusion:after.conclusion,cancellation,active_job_ids:active.map(j=>j.id),
      artifacts:artifacts.map(a=>({id:a.id,name:a.name,digest:a.digest,extracted_files:files(join(out,'legacy',String(run),String(a.id))).map(p=>({path:p.slice(out.length+1),sha256:hash(readFileSync(p))}))}))});
  }
  const inputArtifact=observations[0].artifacts.find(x=>x.id===SOURCE.artifact);
  if(inputArtifact?.name!==SOURCE.name||inputArtifact?.digest!==SOURCE.digest)throw new Error('FROZEN_ARTIFACT_IDENTITY_MISMATCH');
  const inputPath=join(out,'legacy',String(SOURCE.run),String(SOURCE.artifact),'nonbath-root-closure-input.json');
  if(hash(readFileSync(inputPath))!==SOURCE.input_sha256)throw new Error('FROZEN_INPUT_HASH_MISMATCH');
  const input=rd(inputPath),heldRoots=holdAll?input.roots.map(r=>r.root_index):holdRoot2?[2]:[];
  const plan=buildInventory(input,{head,semanticFingerprint:fingerprint(),heldRoots});
  atomicJson(join(out,'source-preservation.json'),{exact_head:head,observations,source_input_sha256:SOURCE.input_sha256});
  atomicJson(join(out,'plan.json'),plan);
  console.log(`DURABLE_PLAN_FROZEN tasks=${plan.tasks.length} roots=476 held_roots=${heldRoots.length} plan_id=${plan.plan_id}`);
}
function verifyPlan(plan){
  if(plan.schema!=='UCHIRIMO_DURABLE_PLAN_V1'||plan.exact_head!==exactHead()||plan.semantic_fingerprint!==fingerprint())throw new Error('PLAN_IDENTITY_MISMATCH');
  const universe={input_sha256:plan.input_sha256,runtime_manifest_sha256:plan.runtime_manifest_sha256,semantic_fingerprint:plan.semantic_fingerprint,tasks:plan.tasks};
  if(hash(universe)!==plan.plan_id)throw new Error('PLAN_HASH_MISMATCH');
}
function taskEnv(task,dir,fp,ms){
  const s=task.seed,extra={...s};for(const k of ['room_specification','window_type','sash_configuration','size_class','glass_family'])delete extra[k];
  return {...process.env,UCHIRIMO_SELECTOR_MODE:'shard',UCHIRIMO_WINDOW_SHARD_INDEX:'0',UCHIRIMO_SELECTOR_EXPECTED_SHARDS:'1',
    UCHIRIMO_SELECTOR_NODE_ID:task.node_id,UCHIRIMO_SELECTOR_ROOM:s.room_specification,UCHIRIMO_SELECTOR_WINDOW:s.window_type,
    UCHIRIMO_SELECTOR_SASH:s.sash_configuration??'__UNSET__',UCHIRIMO_SELECTOR_SIZE_CLASS:s.size_class??'__UNSET__',UCHIRIMO_SELECTOR_GLASS_FAMILY:s.glass_family,
    UCHIRIMO_SELECTOR_PARTITION_KEY:task.id,UCHIRIMO_SELECTOR_PARTITION_SEED_JSON:JSON.stringify(extra),UCHIRIMO_FULL_SELECTOR_OUT:dir,
    UCHIRIMO_DURABLE_FINGERPRINT:fp,UCHIRIMO_DURABLE_SLICE_MS:String(ms)};
}
export function validateResult(plan,task,dir){
  const reportPath=join(dir,'shard-0-report.json');if(!existsSync(reportPath))return null;
  const r=rd(reportPath);
  if(r.exact_head!==plan.exact_head||r.partition_key!==task.id||r.node_id!==task.node_id||hash(r.seed)!==hash(task.seed)||r.runtime_manifest_sha256!==plan.runtime_manifest_sha256||r.runtime_integrity_match!==true||r.status!=='PASS'||r.unverified_discrete_selector_case_count!==0||!(r.terminal_context_count>0))throw new Error('RESULT_IDENTITY_OR_STATUS_INVALID');
  if(r.proof_model!=='UCHIRIMO_REACHABLE_DISCRETE_SELECTOR_EXHAUSTIVE_SHARD_V10'||r.shard_index!==0||r.shard_count!==1||r.case_artifact_format!=='UCHIRIMO_TERMINAL_DIGEST_JSONL_V1')throw new Error('RESULT_PROOF_MODEL_INVALID');
  if(typeof r.case_artifact!=='string'||basename(r.case_artifact)!==r.case_artifact)throw new Error('RESULT_CASE_PATH_INVALID');
  const p=join(dir,r.case_artifact);
  if(!existsSync(p)||hash(readFileSync(p))!==r.case_artifact_sha256)throw new Error('RESULT_TERMINAL_HASH_INVALID');
  for(const k of ['terminal_context_count','visited_state_count','transition_check_count'])if(!Number.isSafeInteger(r[k])||r[k]<0)throw new Error('RESULT_COUNTER_INVALID');
  return r;
}
function restore(planPath,out,lane,run){
  const plan=rd(planPath);verifyPlan(plan);if(!/^\d+$/.test(run))throw new Error('RESUME_RUN_INVALID');
  const source=api(`actions/runs/${run}`);if(source.head_sha!==plan.exact_head||source.path!=='.github/workflows/project-governance-gate.yml')throw new Error('RESUME_SOURCE_IDENTITY_MISMATCH');
  const prefix=`uchirimo-durable-${plan.exact_head}-lane-${lane}-`;
  const candidates=pages(`actions/runs/${run}/artifacts`,'artifacts').filter(a=>a.name.startsWith(prefix)&&!a.expired).sort((a,b)=>b.id-a.id);
  if(!candidates.length)throw new Error('RESUME_ARTIFACT_MISSING');const selected=candidates[0];
  mkdirSync(out,{recursive:true});execFileSync('gh',['run','download',run,'--repo',process.env.GITHUB_REPOSITORY,'--name',selected.name,'--dir',out],{stdio:'inherit'});
  const record=rd(join(out,`lane-${lane}.json`));if(record.plan_id!==plan.plan_id||record.exact_head!==plan.exact_head||record.lane!==lane)throw new Error('RESUME_PLAN_MISMATCH');
  atomicJson(join(out,'resume-binding.json'),{source_run_id:Number(run),source_artifact_id:selected.id,source_artifact_digest:selected.digest,exact_head:plan.exact_head,plan_id:plan.plan_id,semantic_fingerprint:plan.semantic_fingerprint,status:'CONTINUATION_BOUND_NOT_QA_PASS'});
}
function worker(planPath,out,lane){
  const plan=rd(planPath);verifyPlan(plan);verifyLegacySource();
  if(!Number.isInteger(lane)||lane<0||lane>=8)throw new Error('LANE_INVALID');
  mkdirSync(out,{recursive:true});
  const generated=join('scripts',`.uchirimo-durable-${process.pid}.mjs`);writeFileSync(generated,instrumentV10(readFileSync(PROOF,'utf8')));
  const budget=Number(process.env.UCHIRIMO_DURABLE_WAVE_MS??300000);if(!Number.isFinite(budget)||budget<1||budget>1800000)throw new Error('WAVE_BUDGET_INVALID');
  const deadline=Date.now()+budget,held=new Set(plan.held_root_indices),tasks=plan.tasks.filter(t=>t.lane===lane&&!held.has(t.root_index));
  const progressPath=join(out,`lane-${lane}.json`);
  const previous=existsSync(progressPath)?rd(progressPath):null;
  if(previous&&(previous.exact_head!==plan.exact_head||previous.plan_id!==plan.plan_id||previous.lane!==lane))throw new Error('LANE_IDENTITY_MISMATCH');
  let cursor=previous?.cursor??0;
  if(!Number.isSafeInteger(cursor)||cursor<0)throw new Error('CURSOR_INVALID');
  try {
    let idle=0;
    while(tasks.length&&Date.now()<deadline&&idle<tasks.length){
      const task=tasks[cursor%tasks.length];cursor++;const dir=join(out,task.id);mkdirSync(dir,{recursive:true});
      if(existsSync(join(dir,'blocked.json'))){idle++;continue;}
      try {
        if(validateResult(plan,task,dir)){idle++;continue;}
        idle=0;
        const prior=existsSync(join(dir,'continuation.json'))?hash(readFileSync(join(dir,'continuation.json'))):null;
        const child=spawnSync(process.execPath,[generated],{env:taskEnv(task,dir,plan.semantic_fingerprint,Math.min(45000,Math.max(1,deadline-Date.now()))),stdio:'inherit',timeout:90000});
        if(child.status!==0)throw new Error(`EXECUTION_BLOCKED:${child.status}:${child.signal??''}`);
        if(!validateResult(plan,task,dir)){
          const cp=readCheckpoint(join(dir,'continuation.json'),{exact_head:plan.exact_head,semantic_fingerprint:plan.semantic_fingerprint,seed:stable(task.seed),partition_key:task.id,runtime_manifest_sha256:plan.runtime_manifest_sha256});
          if(cp.status!=='YIELDED')throw new Error('UNEXPECTED_CONTINUATION_STATUS');
          if(prior===hash(readFileSync(join(dir,'continuation.json'))))throw new Error('NO_FRONTIER_PROGRESS');
        }
      } catch(e) {atomicJson(join(dir,'blocked.json'),{exact_head:plan.exact_head,partition_key:task.id,status:'BLOCKED',reason:e.message,automatic_retry:false});}
      atomicJson(progressPath,{schema:'UCHIRIMO_LANE_V1',exact_head:plan.exact_head,plan_id:plan.plan_id,lane,cursor,status:'CHECKPOINTED',APP_INTEGRATION_READY:false});
    }
  } finally {unlinkSync(generated);}
  atomicJson(progressPath,{schema:'UCHIRIMO_LANE_V1',exact_head:plan.exact_head,plan_id:plan.plan_id,lane,cursor,status:'CHECKPOINTED',APP_INTEGRATION_READY:false});
  console.log(`DURABLE_WAVE_SAVED lane=${lane} cursor=${cursor}`);
}
export function aggregatePlan(plan,dirs){
  const byId=new Map(),errors=[],laneIds=new Set(),failures=new Map();
  for(const dir of dirs)for(const path of files(dir)){
    if(/^lane-[0-7]\.json$/.test(basename(path))){const x=rd(path);if(laneIds.has(x.lane)||x.exact_head!==plan.exact_head||x.plan_id!==plan.plan_id||!Number.isInteger(x.lane)||x.lane<0||x.lane>=8)errors.push('LANE_IDENTITY_OR_DUPLICATE');laneIds.add(x.lane);}
    if(basename(path)==='blocked.json'){const x=rd(path);failures.set(x.partition_key,x);}
  }
  if(laneIds.size!==8)errors.push(`MISSING_LANES:${8-laneIds.size}`);
  for(const dir of dirs)for(const path of files(dir).filter(p=>basename(p)==='shard-0-report.json')){
    const id=rd(path).partition_key;if(byId.has(id))errors.push(`DUPLICATE_RESULT:${id}`);else byId.set(id,dirname(path));
  }
  const expected=new Set(plan.tasks.map(t=>t.id));for(const id of byId.keys())if(!expected.has(id))errors.push(`UNEXPECTED_RESULT:${id}`);
  let verified=0,states=0,terminals=0;const roots=new Map(),pending=[],blocked=[];
  for(const task of plan.tasks){
    if(!roots.has(task.original_parent_partition_id))roots.set(task.original_parent_partition_id,{root_index:task.root_index,expected:0,verified:0});const root=roots.get(task.original_parent_partition_id);root.expected++;
    try {if(failures.has(task.id))throw new Error(failures.get(task.id).reason);const dir=byId.get(task.id);if(!dir){pending.push(task.id);continue;}const report=validateResult(plan,task,dir);verified++;root.verified++;states+=report.visited_state_count;terminals+=report.terminal_context_count;}
    catch(e){blocked.push({id:task.id,reason:e.message});}
  }
  const closed=[...roots].filter(([,r])=>r.verified===r.expected).map(([id,r])=>({original_parent_partition_id:id,...r}));
  // NonBath closure is not Original514, browser QA, dimension QA, or release.
  return {schema:'UCHIRIMO_DURABLE_AGGREGATE_V1',exact_head:plan.exact_head,plan_id:plan.plan_id,expected_partitions:plan.tasks.length,
    verified_partitions:verified,pending_partitions:pending.length,blocked_partitions:blocked.length,errors,blocked,pending_partition_ids:pending,
    expected_nonbath_roots:476,closed_nonbath_roots:closed.length,closed_roots:closed,visited_states:states,terminal_contexts:terminals,
    nonbath_closure_proven:verified===7364&&closed.length===476&&!errors.length&&!blocked.length,
    original_514_closure_proven:false,unverified_qa_case_count:null,UCHIRIMO_QA_STATUS:'UNVERIFIED',APP_INTEGRATION_READY:false,RELEASE_INPUT_GATE:'BLOCKED'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const [mode,a,b,c,d]=process.argv.slice(2);
  if(mode==='prepare')await prepare(a);
  else if(mode==='worker')worker(a,b,Number(c));
  else if(mode==='restore')restore(a,b,Number(c),String(d));
  else if(mode==='aggregate'){const p=rd(a);verifyPlan(p);const report=aggregatePlan(p,[b]);atomicJson(join(c,'report.json'),report);console.log(JSON.stringify({...report,pending_partition_ids:undefined,closed_roots:undefined}));if(report.errors.length||report.blocked_partitions)process.exitCode=1;}
  else throw new Error('UNKNOWN_DURABLE_MODE');
}
