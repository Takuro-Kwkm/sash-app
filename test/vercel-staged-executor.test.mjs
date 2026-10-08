import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';

test('existing executor holds alias and resumes created Deployment after only result-file failure',async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'order4-sash-executor-'));
  try {
    const native=path.join(root,'native');await mkdir(path.join(native,'contracts/production'),{recursive:true});await mkdir(path.join(native,'scripts'));
    const target=JSON.parse(await readFile(new URL('../contracts/production/app-release.v1.json',import.meta.url),'utf8'));
    await writeFile(path.join(native,'contracts/production/app-release.v1.json'),JSON.stringify(target));
    await writeFile(path.join(native,'scripts/vercel-rest-deploy.mjs'),await readFile(new URL('../scripts/vercel-rest-deploy.mjs',import.meta.url)));
    await writeFile(path.join(native,'fixture.txt'),'isolated same bytes');
    const git=(...args)=>execFileSync('git',args,{cwd:native,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
    git('init','-b','main');git('add','.');git('-c','user.name=Isolated Test','-c','user.email=test@example.invalid','commit','-m','isolated');
    const head=git('rev-parse','HEAD'),log=path.join(root,'requests.jsonl'),stub=path.join(root,'provider-stub.mjs');
    await writeFile(stub,`
      import assert from 'node:assert/strict';import {appendFileSync} from 'node:fs';
      globalThis.fetch=async(url,init={})=>{
        const method=init.method??'GET';appendFileSync(process.env.REQUEST_LOG,JSON.stringify({url,method})+'\\n');
        if(url.includes('/aliases/'))return new Response(JSON.stringify({alias:'sash-app-wave3-preview.vercel.app',projectId:process.env.VERCEL_PROJECT_ID,deploymentId:'verified-old',uid:'old-alias',redirect:null}),{status:200});
        if(url.includes('/v2/files'))return new Response('{}',{status:200});
        if(method==='POST'&&url.includes('/deployments?')){
          const p=JSON.parse(init.body);assert.equal(p.target,'production');assert.equal(p.autoAssignCustomDomains,false);
          return new Response(JSON.stringify({id:'isolated-dpl',url:'isolated.invalid',target:'production',projectId:process.env.VERCEL_PROJECT_ID,readyState:'READY',meta:p.meta}),{status:200});
        }
        throw new Error('UNEXPECTED_PROVIDER_OPERATION:'+url);
      };
    `);
    const out=path.join(root,'unwritable-result');await mkdir(out);
    const env={...process.env,GITHUB_SHA:head,GITHUB_REF_NAME:'main',GITHUB_REPOSITORY:target.repository,
      VERCEL_TOKEN_EFFECTIVE:'ISOLATED_NOT_A_CREDENTIAL',VERCEL_ORG_ID:target.deployment.team_id,VERCEL_PROJECT_ID:target.deployment.project_id,
      VERCEL_PROJECT_NAME:target.deployment.project_name,VERCEL_DEPLOY_SOURCE:'files',REQUEST_LOG:log};
    delete env.GITHUB_ENV;
    const invoke=()=>spawnSync(process.execPath,['--import',stub,'scripts/vercel-rest-deploy.mjs','production',out],{cwd:native,env,encoding:'utf8'});
    assert.notEqual(invoke().status,0); // Provider success, caller result write alone fails.
    const saved=JSON.parse(await readFile(out+'.operation.json','utf8'));
    assert.equal(saved.providerResponse.id,'isolated-dpl');assert.equal(saved.state,'DEPLOYMENT_ACQUIRED');
    await rm(out,{recursive:true});const resumed=invoke();assert.equal(resumed.status,0,resumed.stderr);
    const result=JSON.parse(await readFile(out,'utf8'));assert.equal(result.releaseState,'STAGED_NOT_RELEASED');
    assert.equal(result.aliasBefore.deploymentId,result.aliasAfter.deploymentId);
    assert.equal(result.externalCreateOperations,0);assert.equal(result.resumedExistingOperation,true);
    const requests=(await readFile(log,'utf8')).trim().split('\n').map(JSON.parse);
    assert.equal(requests.filter(r=>r.method==='POST'&&r.url.includes('/deployments?')).length,1);
    assert.equal(requests.filter(r=>r.url.includes('/promote')||r.method==='POST'&&r.url.includes('/aliases')).length,0);
  } finally {await rm(root,{recursive:true,force:true});}
});
