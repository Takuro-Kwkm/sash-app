import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runtimeAppIntegrationInventory } from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { releaseBuildMetadata } from '../../src/server/recovery-app.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args=process.argv.slice(2);
const option=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const config=JSON.parse(await readFile(resolve(root,'contracts/production/app-release.v1.json'),'utf8'));
const base=new URL(option('--url',config.local.url));
assert.ok(['http:','https:'].includes(base.protocol),'HTTP_URL_REQUIRED');
assert.equal(base.username+base.password,'','CREDENTIAL_URL_FORBIDDEN');
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const expectedCommit=option('--expect-commit',process.env.GITHUB_SHA??head);
const output=resolve(root,option('--output','artifacts/app-release/verification.json'));
const identity=rows=>rows.map(({id,packageVersion,sourceHash,status,selectable,productMasterFormalReference,productVariantContract})=>({id,packageVersion,sourceHash,status,selectable,formalVersion:productMasterFormalReference?.packageVersion??null,productVariantContract:productVariantContract??null})).sort((a,b)=>a.id.localeCompare(b.id));
const digest=b=>createHash('sha256').update(b).digest('hex');
const report={status:'RUNNING',exactHead:head,expectedCommit,url:base.origin,checks:[],assets:[]};
const get=async path=>{
  const response=await fetch(new URL(path,base),{redirect:'error',signal:AbortSignal.timeout(30000)});
  assert.equal(response.status,200,`HTTP_OR_PROTECTION_FAILURE:${path}:${response.status}`);
  return response;
};
try {
  const health=await (await get('/api/health')).json();
  assert.equal(health.ok,true,'HEALTH_FAILED');
  assert.equal(health.buildId,releaseBuildMetadata.buildId,'BUILD_ID_DRIFT');
  assert.equal(health.catalogVersion,releaseBuildMetadata.catalogVersion,'CATALOG_LABEL_DRIFT');
  assert.equal(health.persistence?.type,config.persistence,'PERSISTENCE_BOUNDARY_DRIFT');
  assert.deepEqual(identity(health.runtimeMasterIntegrations),identity(runtimeAppIntegrationInventory().filter(r=>r.status==='READY'&&r.selectable)),'HEALTH_RUNTIME_DRIFT');
  if(args.includes('--require-release-commit'))assert.equal(health.releaseCommitSha,expectedCommit,'RELEASE_COMMIT_DRIFT');
  const integrations=await (await get('/api/runtime-master/integrations')).json();
  assert.deepEqual(identity(integrations),identity(runtimeAppIntegrationInventory()),'RUNTIME_REGISTRY_DRIFT');
  report.checks.push('HEALTH','BUILD_ID','CATALOG_LABEL','PERSISTENCE','RUNTIME_IDENTITIES');
  if(args.includes('--require-release-commit'))report.checks.push('RELEASE_COMMIT');
  for(const [url,file] of [
    ['/','src/ui/web/index.html'],['/app.js','src/ui/web/app.js'],['/styles.css','src/ui/web/styles.css'],
    ['/product-configuration-editor.mjs','src/ui/web/product-configuration-editor.mjs'],
    ['/estimate-output-integration.mjs','src/ui/web/estimate-output-integration.mjs'],
    ['/work-management/service.mjs','src/work-management/service.mjs'],
    ['/estimate-output/model.mjs','src/estimate-output/model.mjs']
  ]){
    const actual=Buffer.from(await (await get(url)).arrayBuffer());
    const expected=await readFile(resolve(root,file));
    assert.equal(digest(actual),digest(expected),`DEPLOYED_ASSET_DRIFT:${file}`);
    report.assets.push({path:file,sha256:digest(actual)});
  }
  report.runtimeIdentitySha256=digest(JSON.stringify(identity(integrations)));
  report.buildId=health.buildId;report.releaseCommitSha=health.releaseCommitSha??null;
  report.status='PASS';
} catch(error) {report.status='FAIL';report.reason=error.message;process.exitCode=1;}
await mkdir(dirname(output),{recursive:true});
await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
