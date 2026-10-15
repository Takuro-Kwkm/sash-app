const {chromium}=await import(process.env.QA_PLAYWRIGHT_MODULE??'playwright');
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';

const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4195';
const OUT=process.env.QA_OUTPUT_DIR,contract=JSON.parse(await readFile(process.env.QA_RUNTIME_QA_CONTRACT));
assert.ok(OUT);await mkdir(OUT,{recursive:true});
const report={status:'RUNNING',url:BASE,persistence:'BROWSER_LOCAL_STORAGE',multi_device_db_e2e:'NOT_EXECUTED',observedCommit:null,viewports:[],errors:[],consoleErrors:[],failedResponses:[]};
const browser=await chromium.launch({headless:true});
try{
  for(const width of contract.viewports){
    const context=await browser.newContext({viewport:{width,height:1100}}),page=await context.newPage();
    page.on('pageerror',error=>report.errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error')report.consoleErrors.push(message.text());});
    page.on('response',response=>{if(response.status()>=400)report.failedResponses.push({url:response.url(),status:response.status()});});
    await page.goto(BASE,{waitUntil:'networkidle'});
    const health=await(await context.request.get(BASE+'/api/health')).json();report.observedCommit=health.releaseCommitSha;
    if(process.env.QA_EXPECTED_COMMIT)assert.equal(report.observedCommit,process.env.QA_EXPECTED_COMMIT);
    const snapshots=[],cases=[];
    for(const row of contract.rows){
      const saved=await page.evaluate(async({row,contract})=>{
        const result=await(await fetch('/api/runtime-master/resolve?'+new URLSearchParams({productId:contract.product_id,selection:JSON.stringify(row.seed)}))).json();
        if(!result.selection)throw new Error(JSON.stringify(result));
        const product=(await(await fetch('/api/runtime-master/integrations')).json()).find(p=>p.id===contract.product_id);
        const {createProductConfigurationSnapshot}=await import('/work-management/domain.mjs');
        const snapshot=createProductConfigurationSnapshot({product:{...product,sourceType:'RUNTIME_MASTER'},result});
        const {BrowserStorageDocumentStore}=await import('/work-management/storage.mjs');
        const {createRepositoryBundle}=await import('/work-management/repositories.mjs');
        const {WorkManagementService}=await import('/work-management/service.mjs');
        const service=new WorkManagementService(createRepositoryBundle(new BrowserStorageDocumentStore(localStorage)));
        const {project,estimate}=await service.createProject({project_name:'営業見積依頼UI QA',request_company:'QA会社',request_company_contact:'QA担当',sales_person:'QA',customer_name:'QA',address_text:'QA'});
        const opening=await service.createOpening(project.project_id,estimate.estimate_id,{room_name:row.id,product_configuration_snapshot:snapshot});
        return {project:project.project_id,estimate:estimate.estimate_id,opening:opening.opening_id,snapshot,result};
      },{row,contract});
      assert.equal(saved.snapshot.runtime_manifest_identity,contract.manifest_file_id);
      assert.equal(saved.result.sales_request_handoff.request_valid,row.expected_valid);
      assert.equal(saved.result.sales_request_handoff.quantity,row.expected_quantity);
      assert.deepEqual(saved.result.confirmationRequests.map(r=>r.id).sort(),[...row.expected_confirmation_ids].sort());
      assert.equal(saved.result.orderReady,false);assert.equal(saved.result.pricing.price,null);
      snapshots.push(saved.snapshot);
      const url=`${BASE}/projects/${saved.project}/estimates/${saved.estimate}/openings/${saved.opening}`;
      await page.goto(url,{waitUntil:'networkidle'});await page.waitForSelector('#dynamicForm[data-resolve-revision]');
      assert.equal(await page.locator('#product').inputValue(),contract.product_id);
      for(const key of contract.hidden_fields)assert.equal(await page.locator(`[data-spec-key="${key}"]`).count(),0);
      for(const key of contract.number_fields)assert.equal(await page.locator(`[data-spec-key="${key}"]`).getAttribute('type'),'number');
      const visible=await page.locator('#dynamicForm').innerText();
      for(const token of contract.internal_tokens)assert.ok(!visible.includes(token),'INTERNAL_TOKEN:'+token);
      const visibleKeys=await page.locator('#dynamicForm [data-spec-key]').evaluateAll(nodes=>nodes.map(node=>node.dataset.specKey));
      const expectedOrder=(contract.ordered_fields??[]).filter(key=>visibleKeys.includes(key));
      assert.deepEqual(visibleKeys.filter(key=>expectedOrder.includes(key)),expectedOrder);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
      await page.screenshot({path:`${OUT}/${row.id}-${width}.png`,fullPage:true});
      const transitions=[];
      for(const action of row.actions??[]){
        const control=page.locator(`[data-spec-key="${action.field}"]`),old=await page.locator('#dynamicForm').getAttribute('data-resolve-revision');
        const response=page.waitForResponse(r=>r.url().includes('/api/runtime-master/resolve')&&r.status()===200&&JSON.parse(new URL(r.url()).searchParams.get('selection'))[action.field]===action.value);
        if(['number','text'].includes(await control.getAttribute('type'))){await control.fill(String(action.value));await control.dispatchEvent('change');}
        else await control.selectOption(String(action.value));
        const result=await(await response).json();
        await page.waitForFunction(value=>document.querySelector('#dynamicForm')?.dataset.resolveRevision!==value,old);
        for(const [key,value] of Object.entries(action.expected??{}))assert.deepEqual(result.selection[key],value,key);
        for(const key of action.cleared??[])assert.equal(result.selection[key],undefined,key);
        for(const key of action.missing??[])assert.ok(result.validation.missingRequiredFields.includes(key),key);
        transitions.push({field:action.field,status:'PASS'});
      }
      await page.locator('#saveOpening').click();await page.waitForURL(`**/projects/${saved.project}/estimates/${saved.estimate}`);
      const persisted=await page.evaluate(async saved=>{
        const {BrowserStorageDocumentStore}=await import('/work-management/storage.mjs');const {createRepositoryBundle}=await import('/work-management/repositories.mjs');
        return (await createRepositoryBundle(new BrowserStorageDocumentStore(localStorage)).openings.require(saved.opening)).product_configuration_snapshot;
      },saved);
      await page.goto(url,{waitUntil:'networkidle'});await page.waitForSelector('#dynamicForm[data-resolve-revision]');
      await page.reload({waitUntil:'networkidle'});await page.waitForSelector('#dynamicForm[data-resolve-revision]');
      const actual=await page.evaluate(async saved=>{
        const {BrowserStorageDocumentStore}=await import('/work-management/storage.mjs');const {createRepositoryBundle}=await import('/work-management/repositories.mjs');
        return (await createRepositoryBundle(new BrowserStorageDocumentStore(localStorage)).openings.require(saved.opening)).product_configuration_snapshot;
      },saved);
      assert.deepEqual(actual.configuration,persisted.configuration);
      assert.deepEqual(actual.confirmation_requests,persisted.confirmation_requests);
      assert.equal(actual.runtime_manifest_identity,contract.manifest_file_id);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
      cases.push({id:row.id,saveReopen:'PASS',identity:'PASS',confirmations:'PASS',overflow:'PASS',transitions});
    }
    const output=await page.evaluate(async snapshots=>{
      const {createEstimateOutputModel}=await import('/estimate-output/model.mjs');const {createEstimatePdfBytes}=await import('/estimate-output/pdf-renderer.mjs');const {createEstimateXlsxBytes}=await import('/estimate-output/xlsx-renderer.mjs');
      const model=createEstimateOutputModel({project:{project_id:'qa',project_name:'玄関ドア 営業見積依頼',request_company:'QA会社',sales_person:'QA'},estimate:{estimate_id:'qa',project_id:'qa',estimate_title:'営業依頼',estimate_no:1,revision_no:0},openings:snapshots.map((snapshot,i)=>({opening_id:String(i),opening_no:i+1,status:'COMPLETE',room_name:'QA',product_configuration_snapshot:snapshot}))});
      return {model,pdf:Array.from(createEstimatePdfBytes(model)),xlsx:Array.from(createEstimateXlsxBytes(model))};
    },snapshots);
    assert.equal(output.model.rows.length,contract.rows.length);
    assert.ok(output.model.rows.every(row=>row.price===null&&row.size.includes(contract.output_size_label??'新設枠発注寸法')));
    assert.deepEqual(output.model.rows.map(row=>row.request_quantity),contract.rows.map(row=>row.expected_quantity));
    assert.ok(output.model.rows.at(-1).issues.length);assert.equal(output.model.rows.at(-1).state,'INVALID');
    await writeFile(`${OUT}/output-${width}.pdf`,new Uint8Array(output.pdf));
    await writeFile(`${OUT}/output-${width}.xlsx`,new Uint8Array(output.xlsx));
    await writeFile(`${OUT}/output-model-${width}.json`,JSON.stringify(output.model,null,2));
    report.viewports.push({width,products:cases,output:'GENERATED_AND_MODEL_VERIFIED',print:'NOT_VISUALLY_VERIFIED'});
    await context.close();console.log(JSON.stringify({width,status:'PASS',cases:cases.length}));
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.consoleErrors,[]);assert.deepEqual(report.failedResponses,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.stack;throw error;}
finally{await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2)+'\n');await browser.close();}
