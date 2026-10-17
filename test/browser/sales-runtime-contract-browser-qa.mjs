import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {configureProtectedQaBrowser,protectedQaGet} from '../../scripts/production/protected-qa-access.mjs';

const base=process.env.QA_BASE_URL;
const output=process.env.QA_OUTPUT_DIR;
const contract=JSON.parse(await readFile(process.env.QA_RUNTIME_QA_CONTRACT));
assert.ok(base&&output&&contract.product_id&&contract.manifest_file_id&&contract.rows?.length);
await mkdir(output,{recursive:true});
const report={status:'RUNNING',url:base,persistence:'BROWSER_LOCAL_STORAGE',observedCommit:null,viewports:[],errors:[]};
const browser=await chromium.launch({headless:true});
try{
 for(const width of contract.viewports){
  const context=await browser.newContext({viewport:{width,height:1100}});
  await configureProtectedQaBrowser(context,new URL(base).origin);
  const page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto(base,{waitUntil:'networkidle'});
  const health=await(await protectedQaGet(context.request,base+'/api/health',new URL(base).origin)).json();
  assert.equal(health.ok,true);
  if(process.env.QA_EXPECTED_COMMIT)assert.equal(health.releaseCommitSha,process.env.QA_EXPECTED_COMMIT);
  report.observedCommit=health.releaseCommitSha;
  const cases=[],snapshots=[];
  for(const row of contract.rows){
   const saved=await page.evaluate(async({row,productId})=>{
    const result=await(await fetch('/api/runtime-master/resolve?'+new URLSearchParams({productId,selection:JSON.stringify(row.seed)}))).json();
    if(!result.selection)throw new Error(JSON.stringify(result));
    const product=(await(await fetch('/api/runtime-master/integrations')).json()).find(item=>item.id===productId);
    if(!product?.selectable)throw new Error('PRODUCT_NOT_SELECTABLE');
    const {createProductConfigurationSnapshot}=await import('/work-management/domain.mjs');
    const snapshot=createProductConfigurationSnapshot({product:{...product,sourceType:'RUNTIME_MASTER'},result});
    const {BrowserStorageDocumentStore}=await import('/work-management/storage.mjs');
    const {createRepositoryBundle}=await import('/work-management/repositories.mjs');
    const {WorkManagementService}=await import('/work-management/service.mjs');
    const service=new WorkManagementService(createRepositoryBundle(new BrowserStorageDocumentStore(localStorage)));
    const {project,estimate}=await service.createProject({project_name:'Runtime QA',request_company:'QA会社',request_company_contact:'QA担当',sales_person:'QA',customer_name:'QA',address_text:'QA'});
    const opening=await service.createOpening(project.project_id,estimate.estimate_id,{room_name:row.id,product_configuration_snapshot:snapshot});
    return {project:project.project_id,estimate:estimate.estimate_id,opening:opening.opening_id,snapshot,result};
   },{row,productId:contract.product_id});
   assert.equal(saved.snapshot.runtime_manifest_identity,contract.manifest_file_id);
   assert.equal(saved.result.orderReady,false);
   assert.deepEqual(saved.result.pricing,{price:null,bom:null,set_code:null});
   for(const [key,value] of Object.entries(row.selection??{}))assert.deepEqual(saved.result.selection[key],value,key);
   snapshots.push(saved.snapshot);
   const url=`${base}/projects/${saved.project}/estimates/${saved.estimate}/openings/${saved.opening}`;
   await page.goto(url,{waitUntil:'networkidle'});
   await page.waitForSelector('#dynamicForm[data-resolve-revision]');
   assert.equal(await page.locator('#product').inputValue(),contract.product_id);
   const visible=await page.locator('#dynamicForm [data-spec-key]').evaluateAll(nodes=>nodes.map(node=>node.dataset.specKey));
   for(const key of row.visible??[])assert.ok(visible.includes(key),key);
   for(const key of row.hidden??[])assert.ok(!visible.includes(key),key);
   const order=(contract.ordered_fields??[]).filter(key=>visible.includes(key));
   assert.deepEqual(visible.filter(key=>order.includes(key)),order);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
   await page.screenshot({path:`${output}/${row.id}-${width}.png`,fullPage:true});
   await page.reload({waitUntil:'networkidle'});
   await page.waitForSelector('#dynamicForm[data-resolve-revision]');
   const persisted=await page.evaluate(async saved=>{
    const {BrowserStorageDocumentStore}=await import('/work-management/storage.mjs');
    const {createRepositoryBundle}=await import('/work-management/repositories.mjs');
    return (await createRepositoryBundle(new BrowserStorageDocumentStore(localStorage)).openings.require(saved.opening)).product_configuration_snapshot;
   },saved);
   assert.deepEqual(persisted.configuration,saved.snapshot.configuration);
   cases.push({id:row.id,identity:'PASS',render:'PASS',saveReopen:'PASS',overflow:'PASS'});
  }
  const generated=await page.evaluate(async snapshots=>{
   const {createEstimateOutputModel}=await import('/estimate-output/model.mjs');
   const {createEstimatePdfBytes}=await import('/estimate-output/pdf-renderer.mjs');
   const {createEstimateXlsxBytes}=await import('/estimate-output/xlsx-renderer.mjs');
   const model=createEstimateOutputModel({project:{project_id:'qa',project_name:'Runtime QA',request_company:'QA会社',sales_person:'QA'},estimate:{estimate_id:'qa',project_id:'qa',estimate_title:'営業依頼',estimate_no:1,revision_no:0},openings:snapshots.map((snapshot,index)=>({opening_id:String(index),opening_no:index+1,room_name:'QA',product_configuration_snapshot:snapshot}))});
   return {model,pdf:Array.from(createEstimatePdfBytes(model)),xlsx:Array.from(createEstimateXlsxBytes(model))};
  },snapshots);
  assert.equal(generated.model.rows.length,contract.rows.length);
  assert.ok(generated.model.rows.every(row=>row.price===null));
  await writeFile(`${output}/output-${width}.pdf`,new Uint8Array(generated.pdf));
  await writeFile(`${output}/output-${width}.xlsx`,new Uint8Array(generated.xlsx));
  await writeFile(`${output}/output-model-${width}.json`,JSON.stringify(generated.model,null,2));
  report.viewports.push({width,products:cases,output:'GENERATED_AND_MODEL_VERIFIED',print:'NOT_VISUALLY_VERIFIED'});
  await context.close();
 }
 assert.deepEqual(report.errors,[]);
 report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.stack;throw error;}
finally{await writeFile(`${output}/report.json`,JSON.stringify(report,null,2)+'\n');await browser.close();}
