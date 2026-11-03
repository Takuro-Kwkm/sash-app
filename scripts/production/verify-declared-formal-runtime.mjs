import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawn,spawnSync,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {adaptComposedProductRuntime} from '../../src/catalog/runtime-master/composed-product-runtime-adapter.mjs';
import {resolveRuntimeAppProduct} from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
import {applyDeclaredWindowFlow} from '../../src/catalog/runtime-master/declared-window-flow.mjs';
import {formalComposedRuntimeEntries,readFormalComposedModule} from '../../src/catalog/runtime-master/formal-composed-runtime-registry.mjs';
import {validatePrivateRuntimeUiPackage} from './validate-private-runtime-ui-adoption.mjs';
import {fieldLabel} from '../../contracts/ui-common/field-labels.v1.mjs';

const read=path=>JSON.parse(readFileSync(path));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const c=read(process.env.QA_ADOPTION_CONTRACT),p=read(c.profile.path),out=resolve(process.env.QA_OUTPUT_DIR);
mkdirSync(out,{recursive:true});
assert.ok(!process.env.SASH_CANDIDATE_MODE&&!process.env.SASH_CANDIDATE_RUNTIME_INDEX&&!process.env.SASH_WORKING_PREVIEW_MANIFEST);
validatePrivateRuntimeUiPackage(resolve(c.package_root,'runtime_index.json'),resolve(c.candidate_root,'index.json'),c.profile.path);
const prior=read(resolve(c.candidate_root,'index.json')).products[0],candidate=read(resolve(c.candidate_root,prior.path));
const reader=await adaptComposedProductRuntime(candidate,prior,()=>{throw Error('Unexpected reference');});
const formal=formalComposedRuntimeEntries.find(entry=>entry.id===p.formal_product_id);
assert.ok(formal?.runtimeManifestDriveFileId);
const current=readFormalComposedModule(formal).document,master=read(resolve(c.package_root,'sources/PRODUCT_MASTER.json'));
assert.equal(digest(readFileSync(resolve(c.package_root,'sources/PRODUCT_MASTER.json'))),p.formal_master.sha256);
let cases=0;
for(const row of master.handoff_tests){
  const input={...row.before,...row.changes},a=reader.uiResolver(input),b=await resolveRuntimeAppProduct(p.formal_product_id,input);
  for(const key of ['selection','validation','sales_request_handoff','confirmationRequests'])assert.deepEqual(b[key],a[key],row.case_id+':'+key);
  const fields=applyDeclaredWindowFlow(a.fields,prior).map(field=>({...field,values:field.values.map(({runtimeValueRow,...value})=>value)}));
  // Current Main's shared vocabulary names this same sales-request quantity.
  // Keep the original G12 label as provenance and assert the exact new label;
  // no field, value, help text, order, or other presentation property is omitted.
  for(const field of fields.filter(field=>field.key==='quantity')){
    assert.equal(field.displayLabel,'依頼数量');assert.equal(fieldLabel('quantity'),'見積依頼数量');
    field.displayLabel='見積依頼数量';
  }
  assert.deepEqual(b.fields,fields,row.case_id+':fields');
  assert.equal(b.runtimeCapabilities.formalAdoption,true);assert.equal(b.runtimeMaster.candidateOnly,false);
  assert.equal(b.orderReady,false);assert.deepEqual(b.pricing,{price:null,bom:null,set_code:null});cases++;
}
assert.ok(cases>0);
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:c.checkout,encoding:'utf8'}).trim();
const code="import {createServer} from 'node:http';import {createRecoveryRequestHandler} from './src/server/recovery-app.mjs';const s=createServer(createRecoveryRequestHandler());s.listen(0,'127.0.0.1',()=>console.log('NATIVE_TEST_PORT='+s.address().port));";
const server=spawn(process.execPath,['--input-type=module','-e',code],{cwd:c.checkout,env:{...process.env,SASH_RELEASE_COMMIT_SHA:head},stdio:['ignore','pipe','pipe']});
let stderr='';server.stderr.on('data',bytes=>stderr+=bytes);
try{
  const url=await new Promise((done,fail)=>{
    const timer=setTimeout(()=>fail(Error('Normal server did not start: '+stderr)),30000);
    server.stdout.on('data',bytes=>{const match=/NATIVE_TEST_PORT=(\d+)/.exec(String(bytes));if(match){clearTimeout(timer);done('http://127.0.0.1:'+match[1]);}});
    server.once('exit',status=>{clearTimeout(timer);fail(Error('Server exited '+status+': '+stderr));});
  });
  const visual=Object.values(current.presentation.choice_visuals).flatMap(Object.values).find(row=>row.src?.startsWith('data:image/'));
  assert.ok(visual);
  const match=/^data:image\/(png|jpeg|webp);base64,(.+)$/.exec(visual.src),bytes=Buffer.from(match[2],'base64'),sha256=digest(bytes),ext=match[1]==='jpeg'?'jpg':match[1];
  // This is the first application request in a new server process.
  const cold=await fetch(url+'/api/runtime-master/choice-image/'+sha256+'.'+ext+'?productId='+encodeURIComponent(formal.id));
  assert.equal(cold.status,200);assert.equal(cold.headers.get('content-type'),'image/'+match[1]);assert.deepEqual(Buffer.from(await cold.arrayBuffer()),bytes);
  const invalid=await fetch(url+'/api/runtime-master/choice-image/'+sha256+'.'+ext+'?productId=UNKNOWN');assert.equal(invalid.status,404);
  const child=spawn(process.execPath,['test/browser/doorremo-formal-runtime.browser.mjs'],{cwd:c.checkout,env:{...process.env,QA_BASE_URL:url,QA_EXPECTED_COMMIT:head,QA_OUTPUT_DIR:out},stdio:'inherit'});
  const status=await new Promise(done=>child.once('exit',done));assert.equal(status,0,'Normal UI Browser QA failed');
  const report=read(resolve(out,'report.json'));assert.equal(report.status,'PASS');assert.deepEqual(report.errors,[]);
  const result={status:'PASS',normal_runtime:true,parity_cases:cases,cold_image_bytes:'PASS',invalid_product_image:'REJECTED',viewports:report.viewports.map(row=>row.width),browser_cases:report.viewports.reduce((n,row)=>n+row.cases.length,0),product_id:p.product_id,formal_product_id:formal.id,product_master_mutations:0,release:false};
  writeFileSync(resolve(out,'native-summary.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{server.kill('SIGTERM');}
