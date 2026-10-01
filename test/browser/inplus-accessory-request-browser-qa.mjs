import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4173';
const OUT='artifacts/inplus-accessory-request';
const PRODUCT='SER-LIXIL-INPLUS';
const ids=['OP-REPLACEMENT-CRESCENT','OP-YKKAP-GENERIC-HANDLE'];
const cases=[
  {variant:'standard',selection:{product_variant:'standard',window_type:'引違い窓',sash_configuration:'2枚建',glass_family:'一般複層',glass_type:'透明',frame_color:'ホワイト',frame_spec:'standard',upper_frame_spec:'standard',lower_frame_spec:'general',fukashi_presence:'none',order_width:1000,order_height:1000}},
  {variant:'bathroom',selection:{product_variant:'bathroom',window_type:'sliding',fit:'tile',glass_family:'ordinary_double',glass_design:'transparent',gas:'dry_air',position_mode:'default',width:1000,height:1000,quantity:2}},
];
const report={status:'RUNNING',exactHead:process.env.GITHUB_SHA??process.env.HEAD_SHA??null,baseUrl:BASE,cases:[],errors:[]};
await mkdir(OUT,{recursive:true});
const browser=await chromium.launch();
try{
  for(const row of cases){
    const page=await browser.newPage({viewport:{width:1280,height:1000}});
    page.on('pageerror',error=>report.errors.push(error.message));
    await page.goto(BASE,{waitUntil:'networkidle'});
    const keys=await page.evaluate(async({productId,selection,variant})=>{
      const {createProductConfigurationSnapshot}=await import('/work-management/domain.mjs');
      const {BrowserStorageDocumentStore}=await import('/work-management/storage.mjs');
      const {createRepositoryBundle}=await import('/work-management/repositories.mjs');
      const {WorkManagementService}=await import('/work-management/service.mjs');
      localStorage.removeItem('sash.work-management.v1');
      const product=(await(await fetch('/api/runtime-master/integrations')).json()).find(p=>p.id===productId);
      const result=await(await fetch('/api/runtime-master/resolve?'+new URLSearchParams({productId,selection:JSON.stringify(selection)}))).json();
      const snapshot=createProductConfigurationSnapshot({product,result});
      const service=new WorkManagementService(createRepositoryBundle(new BrowserStorageDocumentStore(localStorage)));
      const {project,estimate}=await service.createProject({project_name:'アクセサリ依頼 '+variant});
      const opening=await service.createOpening(project.project_id,estimate.estimate_id,{room_name:variant,product_configuration_snapshot:snapshot});
      return {project:project.project_id,estimate:estimate.estimate_id,opening:opening.opening_id};
    },{productId:PRODUCT,...row});
    const url=`${BASE}/projects/${keys.project}/estimates/${keys.estimate}/openings/${keys.opening}`;
    await page.goto(url,{waitUntil:'networkidle'});await page.waitForSelector('#dynamicForm[data-resolve-revision]');
    for(const id of ids){
      const revision=await page.locator('#dynamicForm').getAttribute('data-resolve-revision');
      await page.locator(`[data-multi-key="option_items"] input[value="${id}"]`).check();
      await page.waitForFunction(old=>document.querySelector('#dynamicForm').dataset.resolveRevision!==old,revision);
    }
    for(const id of ids)assert.equal(await page.locator(`[data-multi-key="option_items"] input[value="${id}"]`).isChecked(),true);
    const options=await page.locator('[data-spec-key="option_items"] option').evaluateAll(nodes=>nodes.map(n=>({id:n.value,label:n.textContent})));
    if(row.variant==='bathroom')assert.deepEqual(options.map(o=>o.id),ids);
    await page.locator('#saveOpening').click();await page.waitForURL(`**/projects/${keys.project}/estimates/${keys.estimate}`);
    await page.goto(url,{waitUntil:'networkidle'});await page.waitForSelector('#dynamicForm[data-resolve-revision]');
    await page.reload({waitUntil:'networkidle'});await page.waitForSelector('#dynamicForm[data-resolve-revision]');
    for(const id of ids)assert.equal(await page.locator(`[data-multi-key="option_items"] input[value="${id}"]`).isChecked(),true);
    const saved=await page.evaluate(()=>window.__sashWorkApp.readDatabase().openings[0]);
    assert.equal(saved.status,'COMPLETE');
    assert.deepEqual(saved.product_configuration_snapshot.configuration.option_items,ids);
    const request=saved.product_configuration_snapshot.sales_request_handoff.additional_accessory_requests.find(r=>r.manufacturer==='YKK AP');
    assert.equal(request.status,'ESTIMATE_CONFIRM_REQUIRED');assert.equal(request.auto_resolved,false);
    for(const width of [1280,768,390]){
      await page.setViewportSize({width,height:1000});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.screenshot({path:`${OUT}/${row.variant}-${width}.png`,fullPage:true});
    }
    await page.goto(`${BASE}/projects/${keys.project}/estimates/${keys.estimate}/summary?estimateOutput=1`,{waitUntil:'networkidle'});
    await page.waitForSelector('#estimateOutputPdf');
    const text=await page.locator('body').innerText();
    assert.ok(text.includes('外窓用 交換用クレセント（汎用クレセント）'));
    assert.ok(text.includes('外窓用 汎用ハンドル（YKK AP製）'));
    assert.ok(text.includes('適合・取付可否・手配品番'));
    report.cases.push({variant:row.variant,checkbox:'PASS',multiSelect:'PASS',save:'PASS',reload:'PASS',handoff:'PASS',manufacturerAttribution:'PASS',confirmation:'PASS',options,viewports:[1280,768,390]});
    await page.close();
  }
  assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.stack;throw error;}
finally{await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report));}
