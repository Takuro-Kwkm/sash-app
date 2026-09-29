import assert from 'node:assert/strict';
import {fetchWithRetry,rememberVerifiedShard,alreadyVerifiedSingleShard,accountedBatch} from './uchirimo-carry-transport.mjs';
const head='a'.repeat(40),old='b'.repeat(40),covered=new Set();
const report={exact_head:head,shard_index:10,partition_key:'P',case_artifact_sha256:'CASE',current_head_binding:{status:'PASS',current_exact_head:head,partition_key:'P',source_case_artifact_sha256:'CASE',source_exact_head:old,source_shard_index:7}};
rememberVerifiedShard(covered,report);
assert.equal(alreadyVerifiedSingleShard(covered,old,`uchirimo-selector-proof-shard-7-${old}-attempt-1`),true);
assert.equal(alreadyVerifiedSingleShard(covered,old,`uchirimo-selector-proof-shard-8-${old}-attempt-1`),false);
assert.equal(alreadyVerifiedSingleShard(covered,head,`uchirimo-selector-proof-shard-7-${old}-attempt-1`),false);
assert.equal(alreadyVerifiedSingleShard(covered,old,`uchirimo-selector-proof-batch-lane-0-${old}-attempt-1`),false);
assert.equal(alreadyVerifiedSingleShard(covered,old,`uchirimo-v12-batch-v12-g0-lane-0-0-${old}`),false);
for(const override of [{status:'FAIL'},{partition_key:'OTHER'},{source_case_artifact_sha256:'OTHER'},{current_exact_head:old}]){
 const values=new Set();rememberVerifiedShard(values,{...report,current_head_binding:{...report.current_head_binding,...override}});assert.equal(values.has(old+':7'),false);
}
for(const status of [401,403,404]){
 let calls=0,waits=0;
 await assert.rejects(()=>fetchWithRetry('https://example.invalid',{},'TEST',{fetchFn:async()=>{calls++;return new Response('',{status,headers:{'x-ratelimit-remaining':'0'}});},wait:async()=>{waits++;},log:()=>{}}),e=>e.httpStatus===status);
 assert.equal(calls,1);assert.equal(waits,0);
}
for(const status of [429,500,503]){
 let calls=0;
 const r=await fetchWithRetry('https://example.invalid',{},'TEST',{fetchFn:async()=>new Response('',{status:++calls===1?status:200}),wait:async()=>{},log:()=>{}});
 assert.equal(r.status,200);assert.equal(calls,2);
}
let calls=0;
await assert.rejects(()=>fetchWithRetry('https://example.invalid',{},'TEST',{fetchFn:async()=>{calls++;throw new TypeError('fetch failed');},wait:async()=>{},log:()=>{}}),/NETWORK_ERROR/);
assert.equal(calls,4);
const row={partition_key:'A',node_id:'N',room_specification:'R',window_type:'W',glass_family:'G',sash_configuration:'S',size_class:'Z',partition_seed_json:'{}'};
const second={...row,partition_key:'B'};
const batchId='lane-0-normal-000',artifact={name:`uchirimo-selector-proof-batch-${batchId}-${head}-attempt-2`};
const run={id:12,head_sha:head,run_attempt:2};
const plan={status:'PASS',exact_head:head,lane_index:0,matrix:{include:[{batch_id:batchId,batch_json:JSON.stringify([row,second])}]}};
const args={plan,artifact,run,currentByKey:new Map([['A',row],['B',second]]),reusedKeys:new Set(['A']),heavyByKey:new Map()};
assert.equal(accountedBatch(args),false); // One unclosed parent keeps the entire batch eligible.
assert.equal(accountedBatch({...args,reusedKeys:new Set(['A','B'])}),true);
const observation={timed_out:true,source_run_id:12,source_exact_head:head,source_artifact_identity:artifact.name};
assert.equal(accountedBatch({...args,heavyByKey:new Map([['B',observation]])}),true);
for(const change of [{timed_out:false},{source_run_id:13},{source_exact_head:old},{source_artifact_identity:'other'}])assert.equal(accountedBatch({...args,heavyByKey:new Map([['B',{...observation,...change}]])}),false);
assert.equal(accountedBatch({...args,reusedKeys:new Set(['A','B']),run:{...run,run_attempt:1}}),false);
assert.equal(accountedBatch({...args,reusedKeys:new Set(['A','B']),currentByKey:new Map([['A',{...row,partition_seed_json:'changed'}],['B',second]])}),false);
assert.equal(accountedBatch({...args,reusedKeys:new Set(['A','B']),plan:{...plan,exact_head:old}}),false);
console.log('UCHIRIMO_CARRY_TRANSPORT_TEST=PASS permanent-denial-no-retry; transient-bounded-retry; verified-single-shard-only-elision; batch-preserved');
