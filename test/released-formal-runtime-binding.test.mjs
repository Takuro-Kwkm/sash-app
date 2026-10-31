import test from 'node:test';import assert from 'node:assert/strict';import{mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync}from'node:fs';import{join}from'node:path';import{tmpdir}from'node:os';import{createHash}from'node:crypto';import{releasedFormalRuntimeIndexes}from'../src/catalog/runtime-master/released-formal-runtime-binding.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
function fixture(){const root=mkdtempSync(join(tmpdir(),'released-runtime-')),data=join(root,'src/catalog/runtime-release-data/test');mkdirSync(data,{recursive:true});mkdirSync(join(root,'contracts/production'),{recursive:true});const values={'module.json':JSON.stringify({id:'P'}),'candidate.json':'{}','authorization.json':JSON.stringify({decision:'APPROVED',authorization_kind:'EXPLICIT_USER_SCOPE',decision_ref:'actual-user'}),'review.json':'{}','human.json':'{}'};const r=p=>({path:p,sha256:hash(values[p])});values['index.json']=JSON.stringify({products:[{id:'P',path:'module.json',sha256:hash(values['module.json'])}],runtimeOnlyAdoption:{schema:'HUMAN_ADOPTED_RUNTIME_ONLY_V1',productMasterMutations:0,release:false,candidateIndex:r('candidate.json'),authorization:r('authorization.json'),review:r('review.json'),humanSource:r('human.json')}});for(const[name,b]of Object.entries(values))writeFileSync(join(data,name),b);const registry={schema:'RELEASE_FORMAL_RUNTIME_PACKAGE_REGISTRY_V1',packages:[{id:'pkg',product_id:'P',root:'src/catalog/runtime-release-data/test',files:Object.fromEntries(Object.entries(values).map(([name,b])=>[name,{sha256:hash(b),bytes:Buffer.byteLength(b)}])),index:{path:'index.json',sha256:hash(values['index.json']),manifestFileId:'actual-id'},adoption_work_id:'actual-work',adoption_result_sha256:'fixed-actual-result',product_master_mutations:0,publication_requires_native_release_gate:true}]};const save=()=>writeFileSync(join(root,'contracts/production/released-runtime-packages.v1.json'),JSON.stringify(registry));save();return{root,data,registry,save,done:()=>rmSync(root,{recursive:true,force:true})};}
test('loads complete hash-bound released data in production',()=>{const f=fixture();try{const r=releasedFormalRuntimeIndexes(f.root,{VERCEL:'1'});assert.equal(r.length,1);assert.equal(r[0].manifestFileId,'actual-id');}finally{f.done();}});
for(const issue of ['missing','modified','extra','traversal','symlink','wrong-product','no-adoption'])test('fails closed: '+issue,()=>{const f=fixture();try{if(issue==='missing')rmSync(f.data,{recursive:true});if(issue==='modified')writeFileSync(join(f.data,'module.json'),'changed');if(issue==='extra'){writeFileSync(join(f.data,'raw-master.json'),'{}');f.registry.packages[0].files['raw-master.json']={sha256:hash('{}'),bytes:2};f.save();}if(issue==='traversal'){f.registry.packages[0].root='../test';f.save();}if(issue==='symlink'){rmSync(join(f.data,'module.json'));symlinkSync(join(f.data,'review.json'),join(f.data,'module.json'));}if(issue==='wrong-product'){f.registry.packages[0].product_id='OTHER';f.save();}if(issue==='no-adoption'){f.registry.packages[0].adoption_work_id='';f.save();}assert.throws(()=>releasedFormalRuntimeIndexes(f.root,{NODE_ENV:'production'}));}finally{f.done();}});
test('source-only local inspection omits missing provider payload; production fails closed',()=>{const f=fixture();try{rmSync(f.data,{recursive:true});assert.deepEqual(releasedFormalRuntimeIndexes(f.root,{}),[]);assert.throws(()=>releasedFormalRuntimeIndexes(f.root,{VERCEL:'1'}),/RELEASE_RUNTIME_PACKAGE_REQUIRED/);}finally{f.done();}});

test('native CLI deploy receives original binary/JSON files and skip-domain without token extraction',async()=>{
 const{readFileSync}=await import('node:fs');const{spawnSync,execFileSync}=await import('node:child_process');const root=mkdtempSync(join(tmpdir(),'native-cli-deploy-'));
 try{
 const native=join(root,'native');mkdirSync(join(native,'scripts'),{recursive:true});mkdirSync(join(native,'contracts/production'),{recursive:true});
 const target=JSON.parse(readFileSync(new URL('../contracts/production/app-release.v1.json',import.meta.url)));
 writeFileSync(join(native,'contracts/production/app-release.v1.json'),JSON.stringify(target));writeFileSync(join(native,'scripts/vercel-rest-deploy.mjs'),readFileSync(new URL('../scripts/vercel-rest-deploy.mjs',import.meta.url)));
 writeFileSync(join(native,'.vercelignore'),'.vercel\n');writeFileSync(join(native,'formatted.json'),Buffer.from('7b0a2020226f726967696e616c223a20747275650a7d0a','hex'));writeFileSync(join(native,'binary.bin'),Buffer.from([0,255,128,195,0,254]));
 const git=(...a)=>execFileSync('git',a,{cwd:native,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();git('init','-b','main');git('add','.');git('-c','user.name=QA','-c','user.email=qa@example.invalid','commit','-m','fixture');const head=git('rev-parse','HEAD'),cli=join(root,'cli.mjs'),log=join(root,'requests.jsonl');
 writeFileSync(cli,`#!${process.execPath}\n`+String.raw`
import{appendFileSync,readFileSync}from'node:fs';const a=process.argv.slice(2);appendFileSync(process.env.QA_REQUESTS,JSON.stringify(a)+'\n');
if(a[0]==='deploy'){
 if(!a.includes('--prod')||!a.includes('--skip-domain')||a.includes('--token'))process.exit(9);
 if(readFileSync('formatted.json').toString('hex')!=='7b0a2020226f726967696e616c223a20747275650a7d0a'||readFileSync('binary.bin').toString('hex')!=='00ff80c300fe')process.exit(8);
 console.log(JSON.stringify({id:'qa-deployment',url:'qa.invalid'}));
}else{
 if(a[1].includes('/v2/files'))process.exit(7);
 const data=a[1].includes('/aliases/')?{alias:'sash-app-wave3-preview.vercel.app',projectId:process.env.VERCEL_PROJECT_ID,deploymentId:'old'}:{id:'qa-deployment',url:'qa.invalid',readyState:'READY',meta:{releaseCommitSha:process.env.GITHUB_SHA}};
 console.log('HTTP 200 OK\ncontent-type: application/json\n\n'+JSON.stringify(data));
}`,{mode:0o755});
 const env={...process.env,VERCEL_API_CLI:cli,VERCEL_ORG_ID:target.deployment.team_id,VERCEL_PROJECT_ID:target.deployment.project_id,VERCEL_PROJECT_NAME:target.deployment.project_name,VERCEL_DEPLOY_SOURCE:'files',GITHUB_SHA:head,GITHUB_REF_NAME:'main',QA_REQUESTS:log};delete env.VERCEL_TOKEN;delete env.VERCEL_TOKEN_EFFECTIVE;
 const out=join(root,'result.json'),q=spawnSync(process.execPath,['scripts/vercel-rest-deploy.mjs','production',out],{cwd:native,env,encoding:'utf8'});assert.equal(q.status,0,q.stderr);const result=JSON.parse(readFileSync(out));assert.equal(result.releaseState,'STAGED_NOT_RELEASED');assert.equal(result.aliasBefore.deploymentId,result.aliasAfter.deploymentId);
 const calls=readFileSync(log,'utf8').trim().split('\n').map(JSON.parse);assert.equal(calls.filter(x=>x[0]==='deploy').length,1);assert.ok(calls.every(x=>x[0]!=='api'||!x[1].includes('/v2/files')));
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('carries exact native master source reference without transferring full master bytes',async()=>{
 const{readFileSync,existsSync}=await import('node:fs');const f=fixture();try{
  const p=f.registry.packages[0],index=JSON.parse(readFileSync(join(f.data,'index.json'))),source={path:'sources/PRODUCT_MASTER.json',sha256:hash('actual original master')};index.products[0].uiFlowContract={sourceFlow:source};const value=JSON.stringify(index);writeFileSync(join(f.data,'index.json'),value);p.files['index.json']={bytes:Buffer.byteLength(value),sha256:hash(value)};p.index.sha256=hash(value);p.sourceReferences={[source.path]:{schema:'ADOPTED_FORMAL_SOURCE_REFERENCE_V1',role:'FORMAL_PRODUCT_MASTER',sha256:source.sha256,bytes:22,file_id:'actual-native-master-id',verification:'INSPECT_COMPLETED_NATIVE_ADOPTION_SOURCE_BYTES',adoption_work_id:p.adoption_work_id}};f.save();assert.equal(releasedFormalRuntimeIndexes(f.root,{VERCEL:'1'}).length,1);assert.equal(existsSync(join(f.data,source.path)),false);p.sourceReferences[source.path].sha256=hash('wrong master');f.save();assert.throws(()=>releasedFormalRuntimeIndexes(f.root,{VERCEL:'1'}),/RELEASE_RUNTIME_SOURCE_REFERENCE/);
 }finally{f.done();}
});

test('common label connection preserves native window meaning for the public APW511 resolver',async()=>{
 const{resolveRuntimeAppProduct}=await import('../src/catalog/runtime-master/runtime-app-bridge.mjs');
 const qa=JSON.parse((await import('node:fs')).readFileSync('src/catalog/runtime-master-packages/apw511-ui-r3/adoption/browser-qa.json'));
 let checked=0;
 for(const row of qa.rows){const result=await resolveRuntimeAppProduct('SER-YKK-APW511',row.seed);const labels=Object.fromEntries(result.fields.map(f=>[f.key,f.displayLabel]));
  for(const[key,label]of Object.entries({handing:'左右勝手',width:'特注W（mm）',height:'特注H（mm）',request_quantity:'数量'}))if(Object.hasOwn(labels,key)){assert.equal(labels[key],label,key);checked++;}
 }
 assert.ok(checked>0,'Actual native resolver fields required');
});
