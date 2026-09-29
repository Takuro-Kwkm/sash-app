// Scheduler regression only; no synthetic PASS is product QA evidence.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planBalancedLane,continuationGeneration} from './uchirimo-balanced-scheduler.mjs';
import {CONTROLLER_CONTRACT_VERSION,sha256,recoveryUnitId} from './uchirimo-v11-recovery-controller.mjs';
import {parentPopulationHash} from './uchirimo-controller-checkpoint.mjs';
const head='a'.repeat(40);
const plan={status:'PASS',exact_head:head,shard_count:3956,partitions:Array.from({length:3956},(_,shard)=>({shard,node_id:'TEST',partition_key:'P'+shard,partition_seed_json:'{}'}))};
const state={controller_contract_version:CONTROLLER_CONTRACT_VERSION,exact_head:head,generation:28,parent_population_count:3956,parent_population_sha256:parentPopulationHash(plan),next_action:'EXECUTE'};
const make=(n,status='PENDING_NORMAL')=>{const constraints=[{field_key:'test',decision:{kind:'VALUE',value:n}}],key='P16',id=recoveryUnitId(key,constraints);return {recovery_unit_id:id,parent_partition_key:key,parent_shard_index:16,parent_recovery_unit_id:'root',recovery_depth:1,decision_constraints:constraints,decision_constraints_sha256:sha256(constraints),state:status,execution_class:'NORMAL'};};
const envelope=rows=>({controller_contract_version:CONTROLLER_CONTRACT_VERSION,exact_head:head,units:Object.fromEntries(rows.map(u=>[u.recovery_unit_id,u]))});
const all=e=>Array.from({length:16},(_,laneIndex)=>planBalancedLane({plan,state,unitsEnvelope:e,laneIndex}));
for(const count of [0,1,15,16,17,64,128,129,1491]){
 const e=envelope([...Array.from({length:count},(_,n)=>make(n)),make(-1,'PASS'),make(-2,'PENDING_CHILDREN'),make(-3,'BLOCKED_INFRA')]);
 const before=JSON.stringify(e),lanes=all(e),scheduled=lanes.flatMap(l=>l.scheduled_recovery_unit_ids),deferred=lanes.flatMap(l=>l.deferred_recovery_unit_ids);
 assert.equal(scheduled.length,Math.min(count,128));
 assert.equal(new Set([...scheduled,...deferred]).size,count);
 assert.equal(scheduled.length+deferred.length,count);
 const counts=lanes.map(l=>l.eligible_unit_count);assert.ok(Math.max(...counts)-Math.min(...counts)<=1);
 assert.equal(JSON.stringify(e),before,'planning must not mutate state or proofs');
 assert.deepEqual(all({...e,units:Object.fromEntries(Object.entries(e.units).reverse())}),lanes,'independent planners must agree regardless of JSON order');
 for(const lane of lanes)for(const entry of lane.matrix.include)if(!entry.skip){const [unit]=JSON.parse(entry.batch_json);assert.equal(unit.parent_shard_index,16);assert.equal(unit.partition_key,'P16');assert.equal(entry.child_timeout_ms,300000);}
 // Completed work disappears on the next wave; nothing is replayed.
 for(const id of scheduled)e.units[id].state='PASS';
 const next=all(e).flatMap(l=>l.scheduled_recovery_unit_ids);assert.ok(next.every(id=>!scheduled.includes(id)));
}
const bad=envelope([make(0)]);bad.units[Object.keys(bad.units)[0]].compute_failed=true;
assert.throws(()=>all(bad),/SAME_UNIT_COMPUTE_RETRY_FORBIDDEN/);
assert.throws(()=>planBalancedLane({plan,state:{...state,exact_head:'b'.repeat(40)},unitsEnvelope:envelope([]),laneIndex:0}),/HEAD_MISMATCH/);
assert.throws(()=>planBalancedLane({plan,state:{...state,parent_population_sha256:'bad'},unitsEnvelope:envelope([]),laneIndex:0}),/POPULATION_MISMATCH/);
const workflow=readFileSync(new URL('../../.github/workflows/uchirimo-v12-selector-controller.yml',import.meta.url),'utf8');
assert.equal((workflow.match(/node scripts\/governance\/uchirimo-balanced-scheduler.mjs/g)||[]).length,16);
assert.equal((workflow.match(/max-parallel: 2/g)||[]).length,16);
assert.ok(workflow.includes('node scripts/governance/uchirimo-balanced-scheduler.test.mjs'));
console.log('UCHIRIMO_BALANCED_SCHEDULER=PASS skew/128-limit/exact-once/deferred/pass-preservation/order-determinism/identity/timeout/workflow; NOT_PRODUCT_QA_EVIDENCE');

assert.equal(continuationGeneration({requestedGeneration:0,head}),0);
assert.equal(continuationGeneration({requestedGeneration:30,head,sourceHead:head}),30);
assert.equal(continuationGeneration({requestedGeneration:30,head,sourceHead:'b'.repeat(40)}),0);
assert.throws(()=>continuationGeneration({requestedGeneration:30,head}),/SOURCE_HEAD_REQUIRED/);
assert.throws(()=>continuationGeneration({requestedGeneration:-1,head}),/GENERATION_INVALID/);
const parentWorkflow=readFileSync(new URL('../../.github/workflows/project-governance-gate.yml',import.meta.url),'utf8');
assert.ok(parentWorkflow.includes("fromJSON(needs.governance.outputs.uchirimo_v12_generation || '0')"));
console.log('UCHIRIMO_CONTINUATION_ROUTING=PASS same-head-resume/new-head-verified-import/missing-source-rejection');
