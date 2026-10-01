import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4173';
const OUT='artifacts/inplus-reverse-handing';
const report={status:'RUNNING',exactHead:process.env.HEAD_SHA??null,baseUrl:BASE,cases:[],errors:[]};
await mkdir(OUT,{recursive:true});
const browser=await chromium.launch();
const selector=key=>`[data-spec-key="${key}"]`;
async function choose(page,key,value){
  const old=await page.locator('#dynamicForm').getAttribute('data-resolve-revision');
  await page.selectOption(selector(key),value);
  await page.waitForFunction(old=>document.querySelector('#dynamicForm').dataset.resolveRevision!==old,old);
}
try{
  const page=await browser.newPage({viewport:{width:1280,height:1000}});
  page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto(`${BASE}/runtime-lab`,{waitUntil:'networkidle'});
  await page.selectOption('#manufacturer','LIXIL');await page.selectOption('#product','SER-LIXIL-INPLUS');
  await page.waitForSelector(selector('window_type'));
  await choose(page,'window_type','引違い窓');
  assert.equal(await page.locator(selector('reverse_handing')).count(),0);
  await choose(page,'sash_configuration','2枚建');
  assert.equal(await page.locator(selector('reverse_handing')).count(),1);
  assert.equal(await page.locator(selector('reverse_handing')).getAttribute('data-label'),'勝手');
  const order=await page.locator('#dynamicForm [data-spec-key]').evaluateAll(nodes=>nodes.map(n=>n.dataset.specKey));
  assert.ok(order.indexOf('sash_configuration')<order.indexOf('reverse_handing'));
  assert.ok(order.indexOf('reverse_handing')<order.indexOf('body_color'));
  for(const sash of ['2枚建','2枚建（障子W指定）'])for(const value of ['標準','逆勝手']){
    const keys=await page.evaluate(async({sash})=>{
      const {createProductConfigurationSnapshot}=await import('/work-management/domain.mjs');
      const {BrowserStorageDocumentStore}=await import('/work-management/storage.mjs');
      const {createRepositoryBundle}=await import('/work-management/repositories.mjs');
      const {WorkManagementService}=await import('/work-management/service.mjs');
      localStorage.removeItem('sash.work-management.v1');
      const product=(await(await fetch('/api/runtime-master/integrations')).json()).find(p=>p.id==='SER-LIXIL-INPLUS');
      const selection={product_variant:'standard',window_type:'引違い窓',sash_configuration:sash,glass_family:'一般複層',glass_type:'透明',frame_color:'ホワイト',frame_spec:'standard',upper_frame_spec:'standard',lower_frame_spec:'general',fukashi_presence:'none',order_width:1000,order_height:1000};
      const result=await(await fetch('/api/runtime-master/resolve?'+new URLSearchParams({productId:product.id,selection:JSON.stringify(selection)}))).json();
      const service=new WorkManagementService(createRepositoryBundle(new BrowserStorageDocumentStore(localStorage)));
      const {project,estimate}=await service.createProject({project_name:'勝手Browser QA'});
      const opening=await service.createOpening(project.project_id,estimate.estimate_id,{room_name:'居室',product_configuration_snapshot:createProductConfigurationSnapshot({product,result})});
      return {project:project.project_id,estimate:estimate.estimate_id,opening:opening.opening_id};
    },{sash});
    const url=`${BASE}/projects/${keys.project}/estimates/${keys.estimate}/openings/${keys.opening}`;
    const outputUrl=`${BASE}/projects/${keys.project}/estimates/${keys.estimate}/summary?estimateOutput=1`;
    await page.goto(url,{waitUntil:'networkidle'});await page.waitForSelector(selector('reverse_handing'));
    await choose(page,'reverse_handing',value);
    await page.locator('#saveOpening').click();await page.waitForURL(`**/projects/${keys.project}/estimates/${keys.estimate}`);
    await page.goto(url,{waitUntil:'networkidle'});await page.reload({waitUntil:'networkidle'});await page.waitForSelector(selector('reverse_handing'));
    assert.equal(await page.locator(selector('reverse_handing')).inputValue(),value);
    const saved=await page.evaluate(()=>window.__sashWorkApp.readDatabase().openings[0]);
    assert.equal(saved.product_configuration_snapshot.configuration.reverse_handing,value);
    const label=value==='標準'?'標準勝手':'逆勝手';
    assert.ok(saved.product_configuration_snapshot.display_summary.some(row=>row.key==='reverse_handing'&&row.value===label));
    for(const width of [1280,768,390]){
      await page.setViewportSize({width,height:1000});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      assert.equal(await page.locator(selector('reverse_handing')).isVisible(),true);
      if(sash==='2枚建'&&value==='逆勝手')await page.screenshot({path:`${OUT}/reverse-${width}.png`,fullPage:true});
    }
    await page.goto(outputUrl,{waitUntil:'networkidle'});await page.waitForSelector('#estimateOutputPdf');
    assert.ok((await page.locator('body').innerText()).includes(`勝手: ${label}`));
    await page.goto(url,{waitUntil:'networkidle'});await page.waitForSelector(selector('reverse_handing'));
    const other=sash==='2枚建'?'2枚建（障子W指定）':'2枚建';
    await choose(page,'sash_configuration',other);
    assert.equal(await page.locator(selector('reverse_handing')).inputValue(),value);
    await choose(page,'sash_configuration','4枚建');
    assert.equal(await page.locator(selector('reverse_handing')).count(),0);
    await page.locator('#saveOpening').click();await page.waitForURL(`**/projects/${keys.project}/estimates/${keys.estimate}`);
    const cleared=await page.evaluate(()=>window.__sashWorkApp.readDatabase().openings[0].product_configuration_snapshot);
    assert.equal(cleared.configuration.reverse_handing,undefined);
    assert.equal(cleared.display_summary.some(row=>row.key==='reverse_handing'),false);
    await page.goto(outputUrl,{waitUntil:'networkidle'});await page.waitForSelector('#estimateOutputPdf');
    assert.equal((await page.locator('body').innerText()).includes('勝手:'),false);
    report.cases.push({sash,value,status:'PASS',save:'PASS',reload:'PASS',handoff:'PASS',compatibleRetain:'PASS',unsupportedClear:'PASS',viewports:[1280,768,390],openingStatus:saved.status});
  }
  await page.goto(`${BASE}/runtime-lab`,{waitUntil:'networkidle'});
  await page.selectOption('#manufacturer','LIXIL');await page.selectOption('#product','SER-LIXIL-INPLUS');await page.waitForSelector(selector('product_variant'));
  await choose(page,'product_variant','bathroom');await choose(page,'window_type','sliding');
  assert.equal(await page.locator(selector('reverse_handing')).count(),0);
  report.cases.push({variant:'bathroom',window_type:'sliding',status:'PASS',evidenceState:'SOURCE_NOT_SUFFICIENT',behavior:'NO_RESIDENTIAL_FACT_COPY'});
  assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.stack;throw error;}
finally{await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report));}
