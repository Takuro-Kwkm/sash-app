import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,basename} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {checkpointSession,atomicJson,hash,readCheckpoint,instrumentV10} from './uchirimo-checkpoint-hook.mjs';
import {SOURCE,buildInventory,aggregatePlan,validateResult,legacyHeldRoots,nextCursor,rebindCheckpointEnvelope} from './uchirimo-durable-recovery.mjs';
const temp=()=>fs.mkdtempSync(join(tmpdir(),'uchirimo-durable-test-'));
const H='1'.repeat(40),F='2'.repeat(64),R='3'.repeat(64);
const identity={exact_head:H,semantic_fingerprint:F,seed:{x:'a'},partition_key:'P',runtime_manifest_sha256:R};
function session(out){process.env.UCHIRIMO_DURABLE_FINGERPRINT=F;process.env.UCHIRIMO_DURABLE_SLICE_MS='100000';return checkpointSession({head:H,seed:{x:'a'},partitionKey:'P',runtimeHash:R,out});}
function checkpointFixture(){const out=temp(),s=session(out),path=join(out,'cases.jsonl'),{casesFd,caseHash}=s.openTerminal(path);fs.writeSync(casesFd,'abc\n');caseHash.update('abc\n');s.save({stack:[{selection:{x:'a'}}],visited:['v'],signatureCounts:[],terminalCount:1},casesFd,path,caseHash,'YIELDED');fs.closeSync(casesFd);return {out,path};}
test('checkpoint round-trip and certified terminal prefix',()=>{const {out,path}=checkpointFixture();const s=session(out);assert.equal(s.saved.state.terminalCount,1);const x=s.openTerminal(path);assert.equal(x.caseHash.digest('hex'),hash('abc\n'));fs.closeSync(x.casesFd);});
test('corrupt checkpoint is rejected',()=>{const {out}=checkpointFixture();const p=join(out,'continuation.json'),x=JSON.parse(fs.readFileSync(p));x.body.state.terminalCount=999;atomicJson(p,x);assert.throws(()=>session(out),/CORRUPT/);});
test('wrong HEAD/seed/runtime/fingerprint are all rejected',()=>{const {out}=checkpointFixture();for(const [k,v] of [['exact_head','bad'],['seed',{x:'b'}],['runtime_manifest_sha256','bad'],['semantic_fingerprint','bad']])assert.throws(()=>readCheckpoint(join(out,'continuation.json'),{...identity,[k]:v}),/IDENTITY/);});
test('cross-head continuation rebind preserves certified state but changes only identity',()=>{
  const {out}=checkpointFixture(),p=join(out,'continuation.json'),envelope=JSON.parse(fs.readFileSync(p));
  const task={id:'P',seed:{x:'a'}},target='4'.repeat(40),targetFp='5'.repeat(64);
  const rebound=rebindCheckpointEnvelope(envelope,{sourceHead:H,targetHead:target,sourceFingerprint:F,targetFingerprint:targetFp,task,runtimeHash:R});
  atomicJson(p,rebound);
  const body=readCheckpoint(p,{exact_head:target,semantic_fingerprint:targetFp,seed:{x:'a'},partition_key:'P',runtime_manifest_sha256:R});
  assert.equal(body.state.terminalCount,1);assert.equal(body.terminal_sha256,hash('abc\n'));
  assert.throws(()=>rebindCheckpointEnvelope({...envelope,sha256:'bad'},{sourceHead:H,targetHead:target,sourceFingerprint:F,targetFingerprint:targetFp,task,runtimeHash:R}),/CORRUPT/);
});
test('terminal corruption is rejected without truncation',()=>{const {out,path}=checkpointFixture();fs.writeFileSync(path,'bad\nTAIL');assert.throws(()=>session(out).openTerminal(path),/HASH_MISMATCH/);assert.equal(fs.readFileSync(path,'utf8'),'bad\nTAIL');});
test('only uncommitted crash tail is rolled back',()=>{const {out,path}=checkpointFixture();fs.appendFileSync(path,'uncommitted');const s=session(out),x=s.openTerminal(path);fs.closeSync(x.casesFd);assert.equal(fs.readFileSync(path,'utf8'),'abc\n');});
test('missing terminal file and orphan evidence fail closed',()=>{const {out,path}=checkpointFixture();fs.unlinkSync(path);assert.throws(()=>session(out).openTerminal(path),/MISSING/);const o=temp(),p=join(o,'cases.jsonl');fs.writeFileSync(p,'evidence');assert.throws(()=>session(o).openTerminal(p),/ORPHAN/);});
function inputFixture(){const roots=Array.from({length:476},(_,i)=>({root_index:i,original_parent_partition_id:`R${i}`,product_node:'NODE',depth2_items:[]}));for(let i=0;i<7364;i++){const r=roots[i%476];r.depth2_items.push({PARTITION_ID:`P${String(i).padStart(5,'0')}`,ROOT_HEAVY_PARENT_PARTITION_ID:r.original_parent_partition_id,PRODUCT_NODE:r.product_node,SELECTOR_PREFIX:{room_specification:'residential',window_type:'fix_window',glass_family:'g',n:i}});}return {exact_head:SOURCE.head,status:'READY',root_count:476,source_depth2_partition_count:7364,runtime_manifest_sha256:SOURCE.runtime,roots};}
test('fixed complete universe has no duplicate or omitted units',()=>{const p=buildInventory(inputFixture(),{head:H,semanticFingerprint:F,heldRoots:[2]});assert.equal(p.tasks.length,7364);assert.equal(new Set(p.tasks.map(t=>t.id)).size,7364);assert.deepEqual(Array.from({length:8},(_,i)=>p.tasks.filter(t=>t.lane===i).length),Array(8).fill(920).map((n,i)=>n+(i<4?1:0)));assert.equal(p.held_root_indices[0],2);assert.equal(p.original_parent_count,514);});
test('holding a running root never removes it from the universe',()=>{const i=inputFixture(),a=buildInventory(i,{head:H,semanticFingerprint:F}),b=buildInventory(i,{head:H,semanticFingerprint:F,heldRoots:[2]});assert.equal(a.plan_id,b.plan_id);assert.equal(a.tasks.length,b.tasks.length);});
test('duplicate roots, partitions and wrong parent are rejected',()=>{let i=inputFixture();i.roots[1].original_parent_partition_id=i.roots[0].original_parent_partition_id;assert.throws(()=>buildInventory(i,{head:H,semanticFingerprint:F}));i=inputFixture();i.roots[1].depth2_items[0].PARTITION_ID=i.roots[0].depth2_items[0].PARTITION_ID;assert.throws(()=>buildInventory(i,{head:H,semanticFingerprint:F}));i=inputFixture();i.roots[0].depth2_items[0].ROOT_HEAVY_PARENT_PARTITION_ID='bad';assert.throws(()=>buildInventory(i,{head:H,semanticFingerprint:F}));});
test('empty aggregate cannot claim closure or release',()=>{const p=buildInventory(inputFixture(),{head:H,semanticFingerprint:F}),a=aggregatePlan(p,[]);assert.equal(a.verified_partitions,0);assert.equal(a.pending_partitions,7364);assert.equal(a.nonbath_closure_proven,false);assert.equal(a.original_514_closure_proven,false);assert.equal(a.APP_INTEGRATION_READY,false);assert.equal(a.RELEASE_INPUT_GATE,'BLOCKED');assert.match(a.errors.join(),/MISSING_LANES/);});
test('source drift refuses instrumentation',()=>assert.throws(()=>instrumentV10('not the original proof'),/BOUNDARY/));
const proofPath='scripts/uchirimo-full-selector-proof.mjs';
test('legacy V10 identity remains bound while current V11 equals repeatedly resumed traversal', {skip:!fs.existsSync(proofPath)}, async()=>{
  const original=fs.readFileSync(proofPath,'utf8');
  const blob=createHash('sha1').update(`blob ${Buffer.byteLength(original)}\0`).update(original).digest('hex');
  assert.notEqual(blob,SOURCE.proof_blob,'current V11 must not masquerade as legacy V10');
  assert.equal(execFileSync('git',['rev-parse',`${SOURCE.head}:${proofPath}`],{encoding:'utf8'}).trim(),SOURCE.proof_blob,'legacy V10 blob identity must remain verifiable at source HEAD');
  const instrumented=instrumentV10(original),plain=temp(),durable=temp();
  const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
  const base=['room_specification','window_type','glass_family'];
  async function resolver(_id,input){
    // Deterministic slow fixture forces yields during ENUM/MULTI_ENUM traversal.
    await new Promise(r=>setTimeout(r,1));
    const selection={...input};const clearedFields=[];
    if(input.mode!=='b'&&'survey' in selection){delete selection.survey;clearedFields.push('survey');}
    const field=(key,values,required=false,readOnly=false,type='ENUM')=>({key,dataType:type,required,readOnly,semanticStage:'CONFIGURATION',semanticSlot:key,values:values.map(value=>({value}))});
    const fields=[...base.map(k=>field(k,[input[k]],true,true)),field('mode',['a','b'])];
    if(input.mode==='b')fields.push(field('survey',['yes','no'],true));
    fields.push(field('option',['x','y','z'],false,false,'MULTI_ENUM'));
    return {selection,fields,clearedFields,validation:{status:'VALID'}};
  }
  async function run(source,out,slice){
    process.env.UCHIRIMO_DURABLE_SLICE_MS=String(slice);process.env.UCHIRIMO_DURABLE_FINGERPRINT=F;
    const text=source.replace(/^import[\s\S]*?from ['"][^'"]+['"];\s*/gm,'').split('const failurePath=join(OUT,MODE')[0]+'\nawait runShard();';
    const deps={...fs,createHash,join,dirname,basename,checkpointSession,currentExactHead:()=>H,loadRegisteredRuntime:async()=>({sourcePackageIntegrity:{match:true,actual:R},master:{canonical:{product_nodes:[{node_id:'N',room:'residential',window_type:'fix_window'}]}}}),resolveRuntimeAppProduct:resolver};
    delete deps.default;
    const env={UCHIRIMO_SELECTOR_MODE:'shard',UCHIRIMO_FULL_SELECTOR_OUT:out,UCHIRIMO_WINDOW_SHARD_INDEX:'0',UCHIRIMO_SELECTOR_EXPECTED_SHARDS:'1',UCHIRIMO_SELECTOR_NODE_ID:'N',UCHIRIMO_SELECTOR_ROOM:'residential',UCHIRIMO_SELECTOR_WINDOW:'fix_window',UCHIRIMO_SELECTOR_GLASS_FAMILY:'g',UCHIRIMO_SELECTOR_PARTITION_KEY:'P'};
    await new AsyncFunction(...Object.keys(deps),'process','console',text)(...Object.values(deps),{env,memoryUsage:()=>process.memoryUsage()},{log:()=>{}});
  }
  await run(original,plain,100000);
  let calls=0;while(!fs.existsSync(join(durable,'shard-0-report.json'))&&calls<200){await run(instrumented,durable,8);calls++;}
  assert.ok(calls>1&&calls<200,'must yield and eventually finish');
  const a=JSON.parse(fs.readFileSync(join(plain,'shard-0-report.json'))),b=JSON.parse(fs.readFileSync(join(durable,'shard-0-report.json')));
  for(const key of ['status','terminal_context_count','visited_state_count','transition_check_count','dependency_rejection_count','downstream_clear_event_count','case_artifact_sha256','flow_signature_sha256s','unverified_discrete_selector_case_count'])assert.deepEqual(b[key],a[key],key);
  assert.equal(fs.readFileSync(join(plain,a.case_artifact),'utf8'),fs.readFileSync(join(durable,b.case_artifact),'utf8'));
});

function validReportFixture(){
  const plan=buildInventory(inputFixture(),{head:H,semanticFingerprint:F}),task=plan.tasks[0],dir=temp();
  const bytes='{"case_id":"UCHIRIMO-S0-000001","terminal_sha256":"digest"}\n';
  fs.writeFileSync(join(dir,'cases.jsonl'),bytes);
  const report={exact_head:H,partition_key:task.id,node_id:task.node_id,seed:task.seed,runtime_manifest_sha256:plan.runtime_manifest_sha256,runtime_integrity_match:true,status:'PASS',unverified_discrete_selector_case_count:0,terminal_context_count:1,visited_state_count:1,transition_check_count:1,proof_model:'UCHIRIMO_REACHABLE_DISCRETE_SELECTOR_EXHAUSTIVE_SHARD_V10',shard_index:0,shard_count:1,case_artifact_format:'UCHIRIMO_TERMINAL_DIGEST_JSONL_V1',case_artifact:'cases.jsonl',case_artifact_sha256:hash(bytes)};
  atomicJson(join(dir,'shard-0-report.json'),report);return {plan,task,dir,report};
}
test('result identity, missing bytes and proof-model failures block aggregation',()=>{
  const {plan,task,dir,report}=validReportFixture();assert.equal(validateResult(plan,task,dir).status,'PASS');
  for(const patch of [{exact_head:'wrong'},{proof_model:'OTHER_MODEL'},{seed:{}},{case_artifact:'../cases.jsonl'},{case_artifact_sha256:'wrong'},{unverified_discrete_selector_case_count:1}]){atomicJson(join(dir,'shard-0-report.json'),{...report,...patch});assert.throws(()=>validateResult(plan,task,dir));}
  atomicJson(join(dir,'shard-0-report.json'),report);fs.unlinkSync(join(dir,'cases.jsonl'));assert.throws(()=>validateResult(plan,task,dir),/TERMINAL_HASH/);
});
test('duplicate result and partial parent coverage never close a parent',()=>{
  const {plan,dir}=validReportFixture(),a=aggregatePlan(plan,[dir,dir]);assert.ok(a.errors.some(e=>e.startsWith('DUPLICATE_RESULT')));assert.equal(a.closed_nonbath_roots,0);assert.equal(a.nonbath_closure_proven,false);
});

test('terminal old groups release only their two roots, active/queued/unknown remain held',()=>{
 const jobs=[{name:'prepare',status:'completed'},{name:'close-root (0, 0, 1)',status:'completed'},{name:'close-root (1, 2, 3)',status:'completed'},{name:'close-root (2, 4, 5)',status:'in_progress'},{name:'close-root (3, 6, 7)',status:'queued'}];
 const held=legacyHeldRoots(jobs,{runStatus:'queued',holdRoot2:true});assert.equal(held.length,473);for(const i of [0,1,3])assert.equal(held.includes(i),false);for(const i of [2,4,5,6,7,475])assert.equal(held.includes(i),true);
 const p=buildInventory(inputFixture(),{head:H,semanticFingerprint:F,heldRoots:held});assert.equal(p.tasks.length,7364);assert.ok(p.tasks.some(t=>!held.includes(t.root_index)));
});
test('legacy job identity errors and missing ownership fail closed',()=>{
 assert.equal(legacyHeldRoots([],{runStatus:'queued'}).length,476);
 for(const name of ['close-root (2, 1, 2)','close-root (238, 476, 477)','close-root (garbled)'])assert.throws(()=>legacyHeldRoots([{name,status:'completed'}],{runStatus:'queued'}),/LEGACY_/);
 const j={name:'close-root (0, 0, 1)',status:'completed'};assert.throws(()=>legacyHeldRoots([j,j],{runStatus:'queued'}),/IDENTITY/);
 assert.deepEqual(legacyHeldRoots([],{runStatus:'completed',holdRoot2:true}),[2]);
});
test('a yielded checkpoint continues its partition before opening another one',()=>{
 assert.equal(nextCursor(7,'YIELDED'),7);assert.equal(nextCursor(7,'PASS'),8);assert.equal(nextCursor(7,'BLOCKED'),8);assert.throws(()=>nextCursor(7,'UNKNOWN'));
});
