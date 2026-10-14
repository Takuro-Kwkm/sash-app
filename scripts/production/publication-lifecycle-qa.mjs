/** Bind the existing identity/browser evidence to the selected native release profile. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,relative,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const args=process.argv.slice(2);
const values={};
for(let i=0;i<args.length;i+=2){
 assert.ok(['--profile','--url','--expect-commit','--output-dir'].includes(args[i])&&!values[args[i]]&&args[i+1],'Invalid or duplicate QA argument');
 values[args[i]]=args[i+1];
}
for(const flag of ['--profile','--url','--expect-commit','--output-dir'])assert.ok(values[flag],`${flag} required`);
assert.match(values['--expect-commit'],/^[0-9a-f]{40}$/);
const profilePath=resolve(ROOT,values['--profile']);
const registry=JSON.parse(readFileSync(resolve(ROOT,'contracts/production/release-profiles.v1.json')));
assert.ok(registry.profiles.some(row=>resolve(ROOT,row.path)===profilePath),'Profile is not selected by the native registry');
const profile=JSON.parse(readFileSync(profilePath));
const admission=profile.scope_admission;
assert.equal(profile.repository,'Takuro-Kwkm/sash-app');
assert.equal(profile.persistence_boundary,'BROWSER_LOCAL_STORAGE');
assert.ok(registry.profiles.some(row=>row.product_id===admission.product_id&&row.scope===admission.scope&&resolve(ROOT,row.path)===profilePath));
const base=new URL(values['--url']);
assert.equal(base.origin,values['--url'].replace(/\/$/,''),'QA URL must be an origin');
const out=resolve(ROOT,values['--output-dir']);
mkdirSync(out,{recursive:true});
const ref=path=>({path:resolve(path),sha256:createHash('sha256').update(readFileSync(path)).digest('hex'),location:resolve(path),observed_at:new Date().toISOString()});
function run(script,arguments_,env={}){
 const result=spawnSync(process.execPath,[script,...arguments_],{cwd:ROOT,env:{...process.env,...env},encoding:'utf8'});
 if(result.status!==0){
  // Preserve the existing native failure report; never normalize a failed run to PASS.
  process.stderr.write(result.stderr||result.stdout||`${script} failed`);
  process.exit(result.status||2);
 }
}
const identityRawPath=resolve(out,'release-identity.raw.json');
run('scripts/production/verify-app-release.mjs',['--url',base.origin,'--expect-commit',values['--expect-commit'],'--require-release-commit','--output',identityRawPath]);
const identityRaw=JSON.parse(readFileSync(identityRawPath));
assert.equal(identityRaw.status,'PASS');assert.equal(identityRaw.url,base.origin);assert.equal(identityRaw.releaseCommitSha,values['--expect-commit']);
writeFileSync(resolve(out,'release-identity.json'),JSON.stringify({schema:'SASH_EXECUTED_RELEASE_IDENTITY_V1',status:'PASS',origin:base.origin,commit:identityRaw.releaseCommitSha,checks:identityRaw.checks,assets:identityRaw.assets,raw_native_report:ref(identityRawPath)},null,2)+'\n');
run('test/browser/eight-series-business-flow-qa.mjs',[],{QA_BASE_URL:base.origin,QA_OUTPUT_DIR:resolve(out,'browser'),QA_EXPECTED_COMMIT:values['--expect-commit'],QA_PRODUCT_IDS:JSON.stringify([admission.product_id])});
const rawPath=resolve(out,'browser/report.json');
const raw=JSON.parse(readFileSync(rawPath));
assert.equal(raw.status,'PASS');
assert.deepEqual(raw.errors,[]);
assert.equal(raw.url,base.origin);
assert.equal(raw.observedCommit,values['--expect-commit']);
assert.equal(raw.persistence,'BROWSER_LOCAL_STORAGE');
assert.deepEqual(raw.viewports.map(row=>row.width),[1280,768,390]);
const results=raw.viewports.map(viewport=>{
 const selected=viewport.products.filter(row=>row.id===admission.product_id);
 assert.equal(selected.length,1);
 assert.equal(viewport.products.length,1);
 assert.equal(selected[0].saveReopen,'PASS');
 assert.equal(viewport.excel,'PASS');assert.equal(viewport.pdf,'PASS');assert.equal(viewport.print,'PASS');
 return {name:`${admission.product_id}-${viewport.width}-selection-save-reopen-output`,status:'PASS',detail:selected[0],native_report:ref(rawPath)};
});
const normalizedPath=resolve(out,'native-product-qa.json');
writeFileSync(normalizedPath,JSON.stringify({schema:'ORDER5_BATCH3_EXECUTED_PRODUCT_QA_V1',status:'PASS',url:base.origin,observed_commit:raw.observedCommit,product_id:admission.product_id,scope:admission.scope,viewports:[1280,768,390],persistence:'BROWSER_LOCAL_STORAGE',runtime_errors:0,errors:[],case_count:results.length,results,raw_native_reports:[ref(rawPath)],print_boundary:'PRINT_HANDLER_AND_CSS; PDF_VISUAL_ACCEPTANCE_IS_SEPARATE'},null,2)+'\n');
const identityRef=ref(resolve(out,'release-identity.json'));
const productRef=ref(normalizedPath);
const healthRefs=[1280,768,390].map(width=>ref(resolve(out,`browser/health-${width}.json`)));
const outputRefs=[1280,768,390].flatMap(width=>['xlsx','pdf','png'].map(extension=>ref(resolve(out,`browser/output-${width}.${extension}`))));
const snapshotRefs=[1280,768,390].map(width=>ref(resolve(out,`browser/snapshot-${admission.product_id}-${width}.json`)));
const evidence={schema:'SASH_PUBLICATION_LIFECYCLE_QA_EVIDENCE_V1',status:'PASS',repository:profile.repository,product_id:admission.product_id,scope:admission.scope,url:base.origin,observed_commit:raw.observedCommit,profile:ref(profilePath),native_qa:{release_identity:identityRef,batch3_product:productRef},checks:{release_identity:{state:'PASS',evidence:[identityRef]},health:{state:'PASS',evidence:[ref(identityRawPath),...healthRefs]},browser:{state:'PASS',evidence:[ref(rawPath)]},output:{state:'PASS',evidence:[ref(rawPath),...outputRefs]},persistence_boundary:{state:'PASS',evidence:[ref(rawPath),...snapshotRefs]},deployment_logs:{state:'NOT_EXECUTED',evidence:[]}},raw_report:ref(rawPath),artifacts_root:relative(ROOT,out),persistence_boundary:'BROWSER_LOCAL_STORAGE'};
writeFileSync(resolve(out,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence));
