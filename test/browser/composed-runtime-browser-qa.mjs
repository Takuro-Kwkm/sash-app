import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {configureProtectedQaBrowser,protectedQaGet} from '../../scripts/production/protected-qa-access.mjs';
const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4201',OUT=process.env.QA_OUTPUT_DIR??'artifacts/replus-runtime-release/browser';
const contract=JSON.parse(await readFile(process.env.QA_RUNTIME_QA_CONTRACT??'contracts/production/runtime-ui-qa/replus-v1.2-r1.json'));
await mkdir(OUT,{recursive:true});
const report={status:'RUNNING',url:BASE,persistence:'BROWSER_LOCAL_STORAGE',observedCommit:null,viewports:[],errors:[]};
const browser=await chromium.launch({headless:true});
try{
 for(const width of [1280,768,390]){
  const context=await browser.newContext({viewport:{width,height:1100},acceptDownloads:true});
  await configureProtectedQaBrowser(context,new URL(BASE).origin);
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(BASE,{waitUntil:'networkidle'});
  const health=await(await protectedQaGet(context.request,BASE+'/api/health',new URL(BASE).origin)).json();
  assert.equal(health.ok,true);if(process.env.QA_EXPECTED_COMMIT)assert.equal(health.releaseCommitSha,process.env.QA_EXPECTED_COMMIT);
  report.observedCommit=health.releaseCommitSha;const cases=[];const snapshots=[];
  for(const row of contract.rows){
   const saved=await page.evaluate(async({row})=>{
    const result=await(await fetch('/api/runtime-master/resolve?'+new URLSearchParams({productId:row.id,selection:JSON.stringify(row.seed)}))).json();
    if(!result.selection)throw new Error(JSON.stringify(result));
    const product=(await(await fetch('/api/runtime-master/integrations')).json()).find(p=>p.id===row.id);
    const {createProductConfigurationSnapshot}=await import('/work-management/domain.mjs');
    const snapshot=createProductConfigurationSnapshot({product:{...product,sourceType:'RUNTIME_MASTER'},result});
    const {BrowserStorageDocumentStore}=await import('/work-management/storage.mjs');const {createRepositoryBundle}=await import('/work-management/repositories.mjs');const {WorkManagementService}=await import('/work-management/service.mjs');
    const service=new WorkManagementService(createRepositoryBundle(new BrowserStorageDocumentStore(localStorage)));
    const {project,estimate}=await service.createProject({project_name:'正式Runtime確認',request_company:'QA会社',request_company_contact:'QA担当',sales_person:'QA',customer_name:'QA',address_text:'QA'});
    const opening=await service.createOpening(project.project_id,estimate.estimate_id,{room_name:'QA',product_configuration_snapshot:snapshot});
    return {project:project.project_id,estimate:estimate.estimate_id,opening:opening.opening_id,snapshot,result};
   },{row});
   assert.equal(saved.snapshot.runtime_manifest_identity,contract.manifest_file_id);
   assert.equal(saved.result.runtimeCapabilities.candidateOnly,false);assert.equal(saved.result.orderReady,false);
   snapshots.push(saved.snapshot);
   await page.goto(`${BASE}/projects/${saved.project}/estimates/${saved.estimate}/openings/${saved.opening}`,{waitUntil:'networkidle'});
   await page.waitForSelector('#dynamicForm[data-resolve-revision]');
   assert.equal(await page.locator('#product').inputValue(),contract.group_id);
   assert.equal(await page.locator('#productSpecification').inputValue(),row.id);
   assert.equal(await page.locator('#product option').filter({hasText:contract.group_label}).count(),1);
   assert.equal(await page.locator('#productSpecification option[value]').count(),8);
   for(const key of contract.hidden_fields)assert.equal(await page.locator(`[data-spec-key="${key}"]`).count(),0);
   await page.screenshot({path:`${OUT}/initial-${row.id}-${width}.png`,fullPage:true});
   if(row.main_window){
    const order=await page.locator('#dynamicForm [data-spec-key]').evaluateAll(es=>es.map(e=>e.dataset.specKey));
    assert.deepEqual(order.filter(k=>contract.glass_order.includes(k)),contract.glass_order);
    const groups=await page.locator('#dynamicForm [data-semantic-group]').evaluateAll(es=>es.map(e=>e.dataset.semanticGroup));assert.equal(groups.at(-1),'size');
    assert.ok(order.indexOf('installation_method')>order.indexOf('glass_function'));
    assert.ok(order.includes('survey_width')&&order.includes('custom_width'));
    assert.equal(saved.result.selection.custom_width,1000);assert.equal(saved.result.selection.custom_height,1000);
    const choose=async(key,value)=>{const c=page.locator(`[data-spec-key="${key}"]`),old=await page.locator('#dynamicForm').getAttribute('data-resolve-revision');if(await c.isDisabled()){assert.equal(await c.inputValue(),value);return;}await c.selectOption(value);await page.waitForFunction(v=>document.querySelector('#dynamicForm').dataset.resolveRevision!==v,old);};
    await choose('glass_appearance','CLEAR');await choose('glass_function','NONE');await choose('glass_appearance','MILKY');
    assert.equal(await page.locator('[data-spec-key="glass_function"]').inputValue(),'');
    await choose('glass_function','MILKY');await choose('glass_appearance','CLEAR');assert.equal(await page.locator('[data-spec-key="glass_function"]').inputValue(),'');
    await choose('glass_function','NONE');await choose('window_type','');
    for(const key of contract.glass_order)assert.equal(await page.locator(`[data-spec-key="${key}"]`).count(),0);
   }
   await page.reload({waitUntil:'networkidle'});await page.waitForSelector('#dynamicForm[data-resolve-revision]');
   assert.equal(await page.locator('#productSpecification').inputValue(),row.id);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
   await page.screenshot({path:`${OUT}/${row.id}-${width}.png`,fullPage:true});
   cases.push({id:row.id,saveReopen:'PASS',dependencies:row.main_window?'PASS':'FIXED_REFERENCE_VERIFIED',overflow:'PASS'});
  }
  const output=await page.evaluate(async snapshots=>{
   const {createEstimateOutputModel}=await import('/estimate-output/model.mjs');const {createEstimatePdfBytes}=await import('/estimate-output/pdf-renderer.mjs');const {createEstimateXlsxBytes}=await import('/estimate-output/xlsx-renderer.mjs');
   const model=createEstimateOutputModel({project:{project_id:'qa',project_name:'正式Runtime仕様確認',request_company:'QA会社',sales_person:'QA'},estimate:{estimate_id:'qa',project_id:'qa',estimate_title:'7仕様',estimate_no:1,revision_no:0},openings:snapshots.map((s,i)=>({opening_id:String(i),opening_no:i+1,room_name:'QA',product_configuration_snapshot:s}))});
   return {model,pdf:Array.from(createEstimatePdfBytes(model)),xlsx:Array.from(createEstimateXlsxBytes(model))};
  },snapshots);
  assert.equal(output.model.rows.length,contract.rows.length);assert.ok(output.model.rows.every(r=>r.price===null));
  for(const label of contract.removed_labels)assert.ok(!JSON.stringify(output.model.rows).includes(label));
  await writeFile(`${OUT}/output-${width}.pdf`,new Uint8Array(output.pdf));await writeFile(`${OUT}/output-${width}.xlsx`,new Uint8Array(output.xlsx));await writeFile(`${OUT}/output-model-${width}.json`,JSON.stringify(output.model,null,2));
  report.viewports.push({width,products:cases,excel:'PASS',pdf:'PASS',print:'NOT_VISUALLY_VERIFIED'});await context.close();
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.stack;throw error;}
finally{await writeFile(OUT+'/report.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
