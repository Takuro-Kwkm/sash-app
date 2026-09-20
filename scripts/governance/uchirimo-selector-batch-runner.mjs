import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT=String(process.env.UCHIRIMO_FULL_SELECTOR_OUT ?? 'artifacts/uchirimo-selector-proof-shard');
const BATCH_ID=String(process.env.UCHIRIMO_SELECTOR_BATCH_ID ?? '');
const CHILD_TIMEOUT_MS=Number(process.env.UCHIRIMO_SELECTOR_CHILD_TIMEOUT_MS ?? 1080000);
const batch=JSON.parse(String(process.env.UCHIRIMO_SELECTOR_BATCH_JSON ?? '[]'));

if(!BATCH_ID)throw new Error('UCHIRIMO_BATCH_ID_REQUIRED');
if(!Array.isArray(batch)||batch.length<1||batch.length>2)throw new Error('UCHIRIMO_BATCH_ITEMS_INVALID:'+String(batch?.length));
if(!Number.isFinite(CHILD_TIMEOUT_MS)||CHILD_TIMEOUT_MS<60000)throw new Error('UCHIRIMO_CHILD_TIMEOUT_INVALID:'+CHILD_TIMEOUT_MS);
mkdirSync(OUT,{recursive:true});

function envFor(row){
  return {
    ...process.env,
    UCHIRIMO_SELECTOR_MODE:'shard',
    UCHIRIMO_WINDOW_SHARD_INDEX:String(row.shard),
    UCHIRIMO_SELECTOR_NODE_ID:String(row.node_id),
    UCHIRIMO_SELECTOR_ROOM:String(row.room_specification),
    UCHIRIMO_SELECTOR_WINDOW:String(row.window_type),
    UCHIRIMO_SELECTOR_SASH:String(row.sash_configuration ?? '__UNSET__'),
    UCHIRIMO_SELECTOR_SIZE_CLASS:String(row.size_class ?? '__UNSET__'),
    UCHIRIMO_SELECTOR_GLASS_FAMILY:String(row.glass_family),
    UCHIRIMO_SELECTOR_PARTITION_KEY:String(row.partition_key),
    UCHIRIMO_SELECTOR_PARTITION_SEED_JSON:String(row.partition_seed_json ?? '{}'),
    UCHIRIMO_FULL_SELECTOR_OUT:OUT
  };
}

function runOne(row){
  return new Promise((resolve)=>{
    const startedAt=new Date().toISOString();
    const child=spawn(process.execPath,['scripts/uchirimo-full-selector-proof.mjs'],{env:envFor(row),stdio:'inherit'});
    let timedOut=false;
    const timer=setTimeout(()=>{
      timedOut=true;
      child.kill('SIGTERM');
      setTimeout(()=>{ try{ child.kill('SIGKILL'); }catch{} },10000).unref();
    },CHILD_TIMEOUT_MS);
    child.on('error',(error)=>{
      clearTimeout(timer);
      resolve({shard:Number(row.shard),partition_key:String(row.partition_key),status:'FAIL',timed_out:timedOut,exit_code:null,signal:null,error:error?.message??String(error),started_at:startedAt,completed_at:new Date().toISOString()});
    });
    child.on('exit',(code,signal)=>{
      clearTimeout(timer);
      resolve({shard:Number(row.shard),partition_key:String(row.partition_key),status:code===0&&!timedOut?'PASS':'FAIL',timed_out:timedOut,exit_code:code,signal:signal??null,started_at:startedAt,completed_at:new Date().toISOString()});
    });
  });
}

console.log('UCHIRIMO_SELECTOR_BATCH_START id='+BATCH_ID+' items='+batch.length);
const results=await Promise.all(batch.map(runOne));
const failed=results.filter((row)=>row.status!=='PASS');
const report={schema_version:'1.0.0',exact_head:process.env.HEAD_SHA??process.env.GITHUB_SHA??null,batch_id:BATCH_ID,item_count:results.length,pass_count:results.length-failed.length,fail_count:failed.length,child_timeout_ms:CHILD_TIMEOUT_MS,results,status:failed.length?'FAIL':'PASS'};
writeFileSync(join(OUT,'batch-'+BATCH_ID+'-report.json'),JSON.stringify(report,null,2)+'\n');
if(failed.length){
  console.error('UCHIRIMO_SELECTOR_BATCH=FAIL id='+BATCH_ID+' failed='+failed.map((row)=>row.shard).join(','));
  process.exit(1);
}
console.log('UCHIRIMO_SELECTOR_BATCH=PASS id='+BATCH_ID+' items='+results.length);
