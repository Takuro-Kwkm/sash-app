import assert from 'node:assert/strict';
import {configureProtectedQaBrowser,protectedQaGet,safeQaError} from '../../scripts/production/protected-qa-access.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const {chromium}=await import(process.env.QA_PLAYWRIGHT_MODULE??'playwright');
const base=process.env.QA_BASE_URL??'http://127.0.0.1:4276',out=process.env.QA_OUTPUT_DIR,contract=JSON.parse(fs.readFileSync(process.env.QA_RUNTIME_QA_CONTRACT??'contracts/production/runtime-ui-qa/samosa-r7.json'));
assert.ok(out);fs.mkdirSync(out,{recursive:true});
const cases=JSON.parse(fs.readFileSync(contract.cases)).cases,expected=JSON.parse(fs.readFileSync(contract.expected_inventory));
const report={status:'RUNNING',product_id:contract.product_id,url:base,normal_runtime:true,execution:'INDEPENDENT_VIEWPORT_CONTEXTS_CONCURRENT',candidate_environment_variables:Object.keys(process.env).filter(k=>/^SASH_CANDIDATE_|^SASH_PRIVATE_FORMAL_/.test(k)),observedCommit:null,viewports:[],errors:[],consoleErrors:[],failedResponses:[]};assert.deepEqual(report.candidate_environment_variables,[]);
const browser=await chromium.launch({headless:true});
try{
 const viewportRuns=await Promise.allSettled(contract.viewports.map(async width=>{
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage();await configureProtectedQaBrowser(context,new URL(base).origin);page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});page.on('response',r=>{if(r.status()>=400)report.failedResponses.push({url:r.url(),status:r.status()});});
  await page.goto(base,{waitUntil:'networkidle'});report.observedCommit=(await(await protectedQaGet(context.request,base+'/api/health',new URL(base).origin)).json()).releaseCommitSha;if(process.env.QA_EXPECTED_COMMIT)assert.equal(report.observedCommit,process.env.QA_EXPECTED_COMMIT);
  const products=[],snapshots=[];
  for(const row of cases){
   const saved=await page.evaluate(async({id,input})=>{
    const product=(await(await fetch('/api/runtime-master/integrations')).json()).find(p=>p.id===id),result=await(await fetch('/api/runtime-master/resolve?'+new URLSearchParams({productId:id,selection:JSON.stringify(input)}))).json();
    if(!result.selection)throw new Error(JSON.stringify(result));const {createProductConfigurationSnapshot}=await import('/work-management/domain.mjs');const {BrowserStorageDocumentStore}=await import('/work-management/storage.mjs');const {createRepositoryBundle}=await import('/work-management/repositories.mjs');const {WorkManagementService}=await import('/work-management/service.mjs');
    const repo=createRepositoryBundle(new BrowserStorageDocumentStore(localStorage)),service=new WorkManagementService(repo),snapshot=createProductConfigurationSnapshot({product:{...product,sourceType:'RUNTIME_MASTER'},result}),{project,estimate}=await service.createProject({project_name:'Normal Runtime QA'}),opening=await service.createOpening(project.project_id,estimate.estimate_id,{room_name:'QA',product_configuration_snapshot:snapshot});return {project:project.project_id,estimate:estimate.estimate_id,opening:opening.opening_id,snapshot,result};
   },{id:contract.product_id,input:row.input});
   assert.equal(saved.result.candidateOnly,false);assert.equal(saved.result.orderReady,false);assert.equal(saved.snapshot.runtime_manifest_identity,contract.manifest_file_id);
   const url=`${base}/projects/${saved.project}/estimates/${saved.estimate}/openings/${saved.opening}`;await page.goto(url,{waitUntil:'networkidle'});await page.waitForSelector('#dynamicForm[data-resolve-revision]');
   assert.equal(await page.locator('#product').inputValue(),contract.product_id);assert.equal(await page.locator('[data-special-specification-request]').count(),1);assert.equal(await page.locator('[data-workflow-control="user_requirements"]').count(),1);assert.equal(await page.locator('#dynamicForm img').count(),0);
   for(const f of expected.fields.filter(f=>['SELECTOR','DERIVED'].includes(f.role)&&f.state_id===row.id&&!f.field_id.startsWith('__workflow.'))){
    const control=page.locator(`[data-spec-key="${f.field_id}"]`);assert.equal(await control.count(),1,row.id+': '+f.field_id);assert.equal(await control.getAttribute('data-label'),f.label);
    if(f.control==='checkbox-group')assert.equal(await page.locator(`[data-multi-key="${f.field_id}"] input[type="checkbox"]`).count(),f.candidate_values.length);
    if(f.control==='select-add-remove')assert.equal(await page.locator(`[data-multi-add-key="${f.field_id}"]`).count(),1);
   }
   if(row.id==='PRIMARY'){
    await page.locator('[data-image-preview-field="color_combination"]').click();const choice=page.locator('dialog[open] [data-image-choice-field="color_combination"][aria-pressed="true"]');await choice.click();await page.locator('dialog[data-choice-image-preview]').waitFor({state:'detached'});assert.equal(await page.locator('[data-image-preview-field="color_combination"]').evaluate(e=>document.activeElement===e),true);
    assert.equal(await page.locator('[data-multi-add-key="catalogue_options"]').count(),0);assert.equal(await page.locator('.field[data-key="glazing_functions"] input[type="checkbox"]').count(),0);
    await page.screenshot({path:path.join(out,`normal-runtime-${width}.png`),fullPage:false});
   }
   await page.locator('#saveOpening').click();await page.waitForURL(`**/projects/${saved.project}/estimates/${saved.estimate}`);await page.goto(url,{waitUntil:'networkidle'});await page.waitForSelector('#dynamicForm[data-resolve-revision]');await page.reload({waitUntil:'networkidle'});await page.waitForSelector('#dynamicForm[data-resolve-revision]');
   const stored=await page.evaluate(async saved=>{const {BrowserStorageDocumentStore}=await import('/work-management/storage.mjs');const {createRepositoryBundle}=await import('/work-management/repositories.mjs');return(await createRepositoryBundle(new BrowserStorageDocumentStore(localStorage)).openings.require(saved.opening)).product_configuration_snapshot;},saved);
   assert.deepEqual(stored.configuration,saved.snapshot.configuration);assert.deepEqual(stored.confirmation_requests,saved.snapshot.confirmation_requests);assert.equal(stored.runtime_manifest_identity,contract.manifest_file_id);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);snapshots.push(stored);products.push({id:row.id,status:'PASS',saveReopen:'PASS',sourceIdentity:'PASS',confirmations:'PASS'});
  }
  const output=await page.evaluate(async snapshots=>{const {createEstimateOutputModel}=await import('/estimate-output/model.mjs');const {createEstimatePdfBytes}=await import('/estimate-output/pdf-renderer.mjs');const {createEstimateXlsxBytes}=await import('/estimate-output/xlsx-renderer.mjs');const model=createEstimateOutputModel({project:{project_id:'qa',project_name:'Normal Runtime'},estimate:{estimate_id:'qa',project_id:'qa'},openings:snapshots.map((s,i)=>({opening_id:String(i),opening_no:i+1,status:'COMPLETE',room_name:'QA',product_configuration_snapshot:s}))});return {model,pdf:Array.from(createEstimatePdfBytes(model)),xlsx:Array.from(createEstimateXlsxBytes(model))};},snapshots);
  assert.equal(output.model.rows.length,cases.length);for(const [i,s]of snapshots.entries()){for(const dim of ['width','height'])if(s.configuration[dim])assert.ok(output.model.rows[i].size.includes(String(s.configuration[dim])));assert.equal(output.model.rows[i].price,null);}
  fs.writeFileSync(path.join(out,`output-${width}.pdf`),new Uint8Array(output.pdf));fs.writeFileSync(path.join(out,`output-${width}.xlsx`),new Uint8Array(output.xlsx));fs.writeFileSync(path.join(out,`output-model-${width}.json`),JSON.stringify(output.model,null,2)+'\n');report.viewports.push({width,products,output:'GENERATED_AND_MODEL_VERIFIED',print:'NOT_VISUALLY_VERIFIED'});await context.close();
 }));
 const failedViewport=viewportRuns.find(run=>run.status==='rejected');if(failedViewport)throw failedViewport.reason;
 report.viewports.sort((a,b)=>contract.viewports.indexOf(a.width)-contract.viewports.indexOf(b.width));
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.consoleErrors,[]);assert.deepEqual(report.failedResponses,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.failure={message:safeQaError(e)};throw new Error(safeQaError(e));}finally{await browser.close();const bytes=JSON.stringify(report,null,2)+'\n';fs.writeFileSync(path.join(out,'report.json'),bytes);console.log(JSON.stringify({status:report.status,browser_report_sha256:createHash('sha256').update(bytes).digest('hex')}));}
