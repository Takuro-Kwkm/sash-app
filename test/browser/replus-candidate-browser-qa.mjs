import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4193',OUT='artifacts/replus-runtime-v5/browser';
const index=JSON.parse(await readFile('changes/replus-runtime-v5/index.json'));
const report={state:'RUNNING',storage:'BROWSER_LOCAL_STORAGE',multi_device_db_e2e:'NOT_EXECUTED',cases:[],errors:[]};
await mkdir(OUT,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const width of [1280,768,390]){
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  for(const row of index.products){
   await page.goto(BASE+'/runtime-lab?product='+encodeURIComponent(row.id),{waitUntil:'networkidle'});
   await page.waitForSelector('#dynamicForm[data-resolve-revision]');
   const savedResult=JSON.parse(await readFile('artifacts/replus-runtime-v5/'+row.id.replace(':','-')+'.json'));
   const ids=await page.evaluate(async ({row,seed})=>{
    
    const runtime=await(await fetch('/api/runtime-master/resolve?'+new URLSearchParams({productId:row.id,selection:JSON.stringify(seed)}))).json();
    if(runtime.code||!runtime.selection)throw new Error(runtime.code??'Resolver failed');
    const {createProductConfigurationSnapshot}=await import('/work-management/domain.mjs');
    const products=await(await fetch('/api/runtime-master/integrations')).json(),product={...products.find(p=>p.id===row.id),sourceType:'RUNTIME_MASTER'};
    const snapshot=createProductConfigurationSnapshot({product,result:runtime});
    const {BrowserStorageDocumentStore}=await import('/work-management/storage.mjs');
    const {createRepositoryBundle}=await import('/work-management/repositories.mjs');
    const {WorkManagementService}=await import('/work-management/service.mjs');
    const service=new WorkManagementService(createRepositoryBundle(new BrowserStorageDocumentStore(localStorage)));
    const created=await service.createProject({project_name:'リプラス候補QA',request_company:'QA会社',request_company_contact:'QA担当',sales_person:'QA',customer_name:'QA',address_text:'QA'});
    const {project,estimate}=created;
    const opening=await service.createOpening(project.project_id,estimate.estimate_id,{room_name:'QA',product_configuration_snapshot:snapshot});
    return {project:project.project_id,estimate:estimate.estimate_id,opening:opening.opening_id,snapshot};
   },{row,seed:savedResult.selection});
   assert.ok(ids.snapshot.product_id.startsWith('CANDIDATE:'));assert.equal(ids.snapshot.runtime_manifest_identity,process.env.SASH_CANDIDATE_MANIFEST_FILE_ID);assert.equal(ids.snapshot.price??null,null);
   const url=BASE+'/projects/'+ids.project+'/estimates/'+ids.estimate+'/openings/'+ids.opening;
   await page.goto(url,{waitUntil:'networkidle'});await page.waitForSelector('#dynamicForm[data-resolve-revision]');
   assert.equal(await page.locator('#product').inputValue(),row.productSelectionGroup.id);
   assert.equal(await page.locator('#productSpecification').inputValue(),row.id);
   assert.equal(await page.locator('#product option').filter({hasText:'リプラス住宅用'}).count(),1);
   assert.equal(await page.locator('#product option').filter({hasText:/リプラス (居室|浴室|アタッチ|汎用)/}).count(),0);
   assert.ok((await page.locator('#selectionSummary').innerText()).length>10);
   assert.ok(await page.locator('#warnings').innerText());
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'horizontal overflow '+row.id+' '+width);
   const labels=await page.locator('#dynamicForm option').allTextContents();
   assert.ok(labels.every(label=>!/(SER-LIX|WT-S2H|RPL_|SWT-LIX|NOT_APPLICABLE|SYSTEM_BATH)/.test(label)),row.id+' enum leak');
   const controls=['window_type','referenced_series_id','referenced_window_id','spec_height_category','frame_type','sash_exterior_color'];
   let key,select,choices;
   for(const control of controls){
    const candidate=page.locator('[data-spec-key="'+control+'"]');
    if(!await candidate.count())continue;
    const values=await candidate.locator('option').evaluateAll(ns=>ns.filter(n=>n.value).map(n=>n.value));
    if(values.length>1){key=control;select=candidate;choices=values;break;}
   }
   assert.ok(key,'No conditional test control: '+row.id);
   let cleared=[];
   if(key){
    const current=await select.inputValue(),next=choices.find(v=>v!==current);
    const revision=await page.locator('#dynamicForm').getAttribute('data-resolve-revision');
    const response=page.waitForResponse(r=>r.url().includes('/api/runtime-master/resolve')&&r.status()===200&&JSON.parse(new URL(r.url()).searchParams.get('selection'))[key]===next);
    await select.selectOption(next);
    const after=await(await response).json();cleared=after.clearedFields;
    assert.equal(after.selection[key],next);
    await page.waitForFunction(old=>document.querySelector('#dynamicForm').dataset.resolveRevision!==old,revision);
    const persisted=await page.evaluate(async ids=>{
     const {BrowserStorageDocumentStore}=await import('/work-management/storage.mjs');const {createRepositoryBundle}=await import('/work-management/repositories.mjs');return (await createRepositoryBundle(new BrowserStorageDocumentStore(localStorage)).openings.require(ids.opening)).product_configuration_snapshot;
    },ids);
    assert.ok(persisted.product_id.startsWith('CANDIDATE:'));
    await page.locator('#saveOpening').click();
    await page.waitForURL('**/projects/'+ids.project+'/estimates/'+ids.estimate);
    const stored=await page.evaluate(async ids=>{const {BrowserStorageDocumentStore}=await import('/work-management/storage.mjs');const {createRepositoryBundle}=await import('/work-management/repositories.mjs');return (await createRepositoryBundle(new BrowserStorageDocumentStore(localStorage)).openings.require(ids.opening)).product_configuration_snapshot;},ids);
    assert.equal(stored.configuration[key],next);ids.snapshot=stored;
    await page.goto(url,{waitUntil:'networkidle'});await page.waitForSelector('#dynamicForm[data-resolve-revision]');
   }
   await page.screenshot({path:OUT+'/'+row.id.replace(':','-')+'-'+width+'.png',fullPage:true});
   await page.reload({waitUntil:'networkidle'});await page.waitForSelector('#dynamicForm[data-resolve-revision]');
   assert.equal(await page.locator('#product').inputValue(),row.productSelectionGroup.id);
   assert.equal(await page.locator('#productSpecification').inputValue(),row.id);
   const actual=await page.evaluate(async ids=>{
    const {BrowserStorageDocumentStore}=await import('/work-management/storage.mjs');const {createRepositoryBundle}=await import('/work-management/repositories.mjs');return (await createRepositoryBundle(new BrowserStorageDocumentStore(localStorage)).openings.require(ids.opening)).product_configuration_snapshot;
   },ids);
   assert.deepEqual(actual,ids.snapshot);
   report.cases.push({product:row.id,width,save_reload:'PASS',change:'PASS',changed_field:key,cleared_fields:cleared,candidate_identity:'PASS',price:null});
  }
  await context.close();
 }
 assert.equal(report.errors.length,0,report.errors.join('\n'));report.state='PASS';
}catch(e){report.state='FAIL';report.failure=e.stack;throw e;}finally{
 await writeFile(OUT+'/report.json',JSON.stringify(report,null,2));await browser.close();
}
