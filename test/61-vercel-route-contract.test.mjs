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

test('health identifies the served release commit without conflating it with Runtime build identity',async()=>{
  const prior=process.env.SASH_RELEASE_COMMIT_SHA;
  try {
    process.env.SASH_RELEASE_COMMIT_SHA='a'.repeat(40);
    const health=JSON.parse((await invoke('/api/health')).body.toString('utf8'));
    assert.equal(health.releaseCommitSha,'a'.repeat(40));
    assert.match(health.catalogVersion,/EW v1\.4/);
    assert.match(health.catalogVersion,/TW integrated-v0\.5/);
    assert.match(health.catalogVersion,/サーモスL v0\.7-R3/);
    assert.doesNotMatch(health.catalogVersion,/EW v1\.3|サーモスL v0\.7-R2/);
  } finally {
    if(prior===undefined)delete process.env.SASH_RELEASE_COMMIT_SHA;
    else process.env.SASH_RELEASE_COMMIT_SHA=prior;
  }
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

test('theme implementation is served for System, Light and Dark browser QA',async()=>{
  const jsResponse=await invoke('/api/index.mjs?__path=theme.js');
  assert.equal(jsResponse.status,200);
  assert.match(jsResponse.body.toString('utf8'),/sash\.theme/);
  const cssResponse=await invoke('/api/index.mjs?__path=theme.css');
  assert.equal(cssResponse.status,200);
  assert.match(cssResponse.body.toString('utf8'),/data-theme="dark"/);
});
