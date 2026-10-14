import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4195',OUT='artifacts/replus-flow-v7/browser';
await mkdir(OUT,{recursive:true});const browser=await chromium.launch(),report={state:'RUNNING',cases:[],errors:[]};
try{
 for(const width of [1280,768,390]){
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(BASE+'/runtime-lab?product=CANDIDATE%3ARPL_RESIDENTIAL',{waitUntil:'networkidle'});
  assert.equal(await page.locator('#product').inputValue(),'CANDIDATE:RPL_RESIDENTIAL');assert.equal(await page.locator('#productSpecification').inputValue(),'');assert.equal(await page.locator('#dynamicForm .field').count(),0);
  async function select(key,value){
   const control=page.locator(key==='specification'?'#productSpecification':'[data-spec-key="'+key+'"]');
   const old=await page.locator('#dynamicForm').getAttribute('data-resolve-revision');await control.selectOption(value);
   await page.waitForFunction(old=>document.querySelector('#dynamicForm').dataset.resolveRevision!==old,old);
  }
  await select('specification','CANDIDATE:RPL_ROOM');
  for(const [key,value] of [['window_type','RPL_ROOM_SLD'],['frame_type','RPL_STD'],['spec_panel_configuration','SS-SLD-2'],['spec_height_category','SS-SLD-MAD'],['size_mode','CUSTOM']]){
   const options=await page.locator('[data-spec-key="'+key+'"] option').evaluateAll(ns=>ns.map(n=>n.value));await select(key,options.includes(value)?value:options.find(v=>v));
  }
  const labels=await page.locator('#dynamicForm .field>label').allTextContents();assert.ok(labels.some(v=>v.startsWith('設置場所')));assert.ok(labels.some(v=>v.startsWith('新設枠の振出し条件')));assert.ok(!labels.some(v=>v.startsWith('施工条件')));
  await select('glass_category','Low-E複層ガラス');await select('glass','GL-LOWE-CLEAR');
  const part=page.locator('[data-multi-key="options"] [value="OP-COVER-CASING"]');await part.check();await page.waitForSelector('[data-spec-key="wooden_casing_color"]');await select('wooden_casing_color','D');
  const keys=await page.locator('#dynamicForm .field').evaluateAll(ns=>ns.map(n=>n.dataset.key));assert.ok(keys.indexOf('options')<keys.indexOf('wooden_casing_color'));assert.ok(keys.indexOf('custom_width')<keys.indexOf('sash_exterior_color'));assert.ok(keys.indexOf('glass_category')<keys.indexOf('glass'));
  await page.screenshot({path:OUT+'/room-flow-'+width+'.png',fullPage:true});
  await select('glass_category','複層ガラス');assert.equal(await page.locator('[data-spec-key="glass"]').inputValue(),'');
  await part.uncheck();await page.waitForFunction(()=>!document.querySelector('[data-spec-key="wooden_casing_color"]'));
  await select('specification','CANDIDATE:RPL_TW');await select('window_type','RPL_TW_SLD');
  assert.equal(await page.locator('[data-spec-key="glass_category"]').inputValue(),'TW-GL-TRIPLE');assert.equal(await page.locator('[data-spec-key="glass_category"]').isDisabled(),true);
  assert.ok(await page.locator('[data-spec-key="glass_gas"]').count());assert.ok(await page.locator('[data-spec-key="glass_spacer"]').count());
  await select('glass','TW-GL-CC');await select('glass_gas','TW-GAS-ARGON');
  await page.screenshot({path:OUT+'/tw-glass-flow-'+width+'.png',fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  report.cases.push({width,product_then_specification:'PASS',meaning_and_order:'PASS',wooden_casing_clear:'PASS',glazing_clear:'PASS',fixed_glazing:'PASS',overflow:'PASS'});await context.close();
 }
 assert.deepEqual(report.errors,[]);report.state='PASS';
} catch(e){report.state='FAIL';report.failure=e.stack;throw e;}finally{await writeFile(OUT+'/report.json',JSON.stringify(report,null,2));await browser.close();}
