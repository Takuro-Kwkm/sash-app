import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/index.mjs';
import { appRuntimeIntegrationRegistry } from '../src/catalog/runtime-master/app-runtime-integration-registry.mjs';

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

const READY_IDS=new Set(appRuntimeIntegrationRegistry.map((row)=>row.id));
const BLOCKED_IDS=new Set();

test('Vercel repository adapter health preserves loaded READY Runtime identities', async()=>{
  const response=await invoke('/api/index.mjs?__path=api/health');
  assert.equal(response.status,200);
  const health=JSON.parse(response.body);
  assert.equal(health.ok,true);
  assert.equal(health.entrypoint,'api/index.mjs');
  assert.match(health.backend,/repository Vercel adapter/);
  assert.equal(health.runtimeMasterIntegrations.length,READY_IDS.size);
  assert.deepEqual(new Set(health.runtimeMasterIntegrations.map((row)=>row.id)),READY_IDS);
  const byId=new Map(health.runtimeMasterIntegrations.map((row)=>[row.id,row]));
  assert.equal(byId.get('SER-LIX-EW').sourceHash,'a59848642ae301dcf8a275b7a43bdceb64a7d9e6488a5c79eca21584178be830');
  assert.equal(byId.get('SER-LIX-SAMOS2H').sourceHash,'993481b2f0ab1d519a091e1b9f99a329eef7c67ec89cd1c82ddfab0d3c624955');
  assert.equal(byId.get('SER-LIX-SAMOSL').sourceHash,'4cf2a4b1572f68288fa108ccd33d30cc80d5170f2f5303864ca56ca67c34cec3');
  assert.equal(byId.get('SER-LIXIL-TW').sourceHash,'95380f5cab261edf03bf868e0f2120b9d57e941d6618b4543afe7a6ffd00c68e');
  assert.equal(byId.get('SER-LIXIL-INPLUS').sourceHash,'cbbdb6ba315c985f7d27f75a237e861be8ce635962ce1cd5a746d7f152c8e1f8');
  assert.equal(byId.get('SER-YKK-APW430').sourceHash,'08f3ad4bef73e32b00e9a69af7e0278539bc8899d64713c8f903924cd43de78b');
  assert.equal(byId.get('SER-YKK-APW431').sourceHash,'f83998aa540ff39907627089adbe84eae32ba9850b36fa8ad7f40a30e2502511');
  assert.equal(byId.get('SER-YKKAP-UCHIRIMO').sourceHash,'be4f1f77727424dc06ddf9de947201f33d4aee5219b182e37d0f178e1fb7147d');
});

test('Vercel Runtime integration route includes all registered READY identities', async()=>{
  const response=await invoke('/api/index.mjs?__path=api/runtime-master/integrations');
  assert.equal(response.status,200);
  const rows=JSON.parse(response.body);
  assert.equal(rows.length,READY_IDS.size);
  const ready=rows.filter((row)=>row.selectable).map((row)=>row.id);
  const blocked=rows.filter((row)=>!row.selectable).map((row)=>row.id);
  assert.deepEqual(new Set(ready),READY_IDS);
  assert.deepEqual(new Set(blocked),BLOCKED_IDS);
});
