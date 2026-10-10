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
  assert.equal(byId.get('SER-LIX-EW').sourceHash,'e3c5976d46268cb9e670491e2256613330ab776c1fb0cc9e6ad5b8e65bb01199');
  assert.equal(byId.get('SER-LIX-SAMOS2H').sourceHash,'993481b2f0ab1d519a091e1b9f99a329eef7c67ec89cd1c82ddfab0d3c624955');
  assert.equal(byId.get('SER-LIX-SAMOSL').sourceHash,'0fed18a4d317fa03cb0ef0463a0c17eb9f83e1bb84baa6628a6bdce73de62257');
  assert.equal(byId.get('SER-LIXIL-TW').sourceHash,'783b6d1c705adc5dc31d504373a4a86e3ce498a75a570e67dd15cd8d2ee148d3');
  assert.equal(byId.get('SER-LIXIL-INPLUS').sourceHash,'d408bd64237ba5d44f9ebbf3ab3c869e9b64864ff0da28609568718b881607d1');
  assert.equal(byId.get('SER-YKK-APW430').sourceHash,'e2755a735fc3a7c94afacc58175a390bf00784cf1f13521a1263076d7bfae1c7');
  assert.equal(byId.get('SER-YKK-APW431').sourceHash,'54ab51e9936ef6d249a16e3a9b4a31dd934cd176e2c081b2cf64f53b340ec57f');
  assert.equal(byId.get('SER-YKKAP-UCHIRIMO').sourceHash,'9da322b90cacd3b0657c3fffb4baadf1d2a9b7e2e197553191b568173283fa18');
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

