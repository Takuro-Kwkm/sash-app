import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/index.mjs';

function invoke(url){
  return new Promise((resolve,reject)=>{
    const req={url,headers:{host:'localhost'}};let status=0,headers={},body=Buffer.alloc(0);
    const res={
      writeHead(code,nextHeaders={}){status=code;headers=nextHeaders;},
      end(chunk=''){const next=Buffer.isBuffer(chunk)?chunk:Buffer.from(String(chunk));body=Buffer.concat([body,next]);resolve({status,headers,body});},
    };
    Promise.resolve(handler(req,res)).catch(reject);
  });
}

test('health advertises estimate output v1.0',async()=>{
  const response=await invoke('/api/index.mjs?__path=api/health');
  assert.equal(response.status,200);
  const health=JSON.parse(response.body.toString('utf8'));
  assert.equal(health.features.estimateOutput,'1.0');
});

for(const file of ['model.mjs','pdf-renderer.mjs','xlsx-renderer.mjs']){
  test(`Vercel rewrite serves estimate-output/${file} as JavaScript`,async()=>{
    const response=await invoke(`/api/index.mjs?__path=estimate-output/${file}`);
    assert.equal(response.status,200);
    assert.match(response.headers['content-type'],/text\/javascript/);
    assert.match(response.body.toString('utf8'),/export /);
  });
}

test('estimate output browser integration and stylesheet are served',async()=>{
  const moduleResponse=await invoke('/api/index.mjs?__path=estimate-output-integration.mjs');
  const cssResponse=await invoke('/api/index.mjs?__path=estimate-output.css');
  assert.equal(moduleResponse.status,200);assert.match(moduleResponse.body.toString('utf8'),/createEstimateOutputModel/);
  assert.equal(cssResponse.status,200);assert.match(cssResponse.headers['content-type'],/text\/css/);
});
