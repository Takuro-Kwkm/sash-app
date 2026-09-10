import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/index.mjs';

function invoke(url){
  return new Promise((resolve,reject)=>{
    const req={url,headers:{host:'localhost'}};
    let status=0,headers={},body='';
    const res={
      writeHead(code,nextHeaders={}){status=code;headers=nextHeaders;},
      end(chunk=''){body+=Buffer.isBuffer(chunk)?chunk.toString('utf8'):String(chunk);resolve({status,headers,body});},
    };
    Promise.resolve(handler(req,res)).catch(reject);
  });
}

const READY_IDS=new Set(['SER-LIX-EW','SER-LIXIL-TW','SER-YKKAP-UCHIRIMO']);
const BLOCKED_IDS=new Set(['SER-LIX-SAMOS2H','SER-LIX-SAMOSL','SER-YKK-APW430','SER-YKK-APW431']);

test('Vercel repository adapter health preserves loaded READY Runtime identities', async()=>{
  const response=await invoke('/api/index.mjs?__path=api/health');
  assert.equal(response.status,200);
  const health=JSON.parse(response.body);
  assert.equal(health.ok,true);
  assert.equal(health.entrypoint,'api/index.mjs');
  assert.match(health.backend,/repository Vercel adapter/);
  assert.equal(health.runtimeMasterIntegrations.length,3);
  assert.deepEqual(new Set(health.runtimeMasterIntegrations.map((row)=>row.id)),READY_IDS);
  const byId=new Map(health.runtimeMasterIntegrations.map((row)=>[row.id,row]));
  assert.equal(byId.get('SER-LIX-EW').sourceHash,'082442f82f51c4a81050d8e16d5fe3b9cb142004deb371a3e2bbb21384ca37dd');
  assert.equal(byId.get('SER-LIXIL-TW').sourceHash,'52af3e462f940df67c267de5f715250290136afdd67a70611e684fcc3d5d064e');
  assert.equal(byId.get('SER-YKKAP-UCHIRIMO').sourceHash,'be4f1f77727424dc06ddf9de947201f33d4aee5219b182e37d0f178e1fb7147d');
});

test('Vercel Runtime integration route includes READY and fail-closed declared identities', async()=>{
  const response=await invoke('/api/index.mjs?__path=api/runtime-master/integrations');
  assert.equal(response.status,200);
  const rows=JSON.parse(response.body);
  assert.equal(rows.length,7);
  const ready=rows.filter((row)=>row.selectable).map((row)=>row.id);
  const blocked=rows.filter((row)=>!row.selectable).map((row)=>row.id);
  assert.deepEqual(new Set(ready),READY_IDS);
  assert.deepEqual(new Set(blocked),BLOCKED_IDS);
});
