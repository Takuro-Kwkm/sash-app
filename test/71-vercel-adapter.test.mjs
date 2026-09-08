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

test('Vercel repository adapter preserves rewritten health path and EW identity', async()=>{
  const response=await invoke('/api/index.mjs?__path=api/health');
  assert.equal(response.status,200);
  const health=JSON.parse(response.body);
  assert.equal(health.ok,true);
  assert.equal(health.entrypoint,'api/index.mjs');
  assert.match(health.backend,/repository Vercel adapter/);
  assert.equal(health.runtimeMasterIntegrations.length,1);
  assert.equal(health.runtimeMasterIntegrations[0].id,'SER-LIX-EW');
  assert.equal(health.runtimeMasterIntegrations[0].sourceHash,'082442f82f51c4a81050d8e16d5fe3b9cb142004deb371a3e2bbb21384ca37dd');
});

test('Vercel repository adapter preserves rewritten Runtime integration route', async()=>{
  const response=await invoke('/api/index.mjs?__path=api/runtime-master/integrations');
  assert.equal(response.status,200);
  const rows=JSON.parse(response.body);
  assert.equal(rows.length,1);
  assert.equal(rows[0].id,'SER-LIX-EW');
  assert.equal(rows[0].selectable,true);
});
