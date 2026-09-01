import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4173';
const PRODUCT_ID='SER-YKK-CONCORD-S30';
const OUT=process.env.QA_ARTIFACT_DIR??'artifacts/concord-browser-qa';
await mkdir(OUT,{recursive:true});

const report={baseUrl:BASE,desktop:{flows:[]},mobile:{flows:[]},api:{valid:[],invalid:[]},consoleErrors:[]};
const browser=await chromium.launch({headless:true});

function trackErrors(page,name){
  page.on('console',msg=>{if(msg.type()==='error')report.consoleErrors.push({page:name,type:'console',text:msg.text()});});
  page.on('pageerror',err=>report.consoleErrors.push({page:name,type:'pageerror',text:err.message}));
}
async function waitResolve(page,action){
  const response=page.waitForResponse(r=>r.url().includes('/api/catalog/resolve')&&r.status()===200);
  await action();
  await response;
  await page.waitForTimeout(40);
}
async function openConcord(page){
  await page.goto(BASE,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent==='CATALOG CONNECTED');
  await page.selectOption('#manufacturer','YKK AP');
  await page.waitForFunction(id=>[...document.querySelectorAll('#product option')].some(o=>o.value===id),PRODUCT_ID);
  await waitResolve(page,()=>page.selectOption('#product',PRODUCT_ID));
  await page.locator('[data-spec-key="fire_spec"]').waitFor({state:'visible'});
}
async function selectSpec(page,key,value){
  const locator=page.locator(`[data-spec-key="${key}"]`);
  await locator.waitFor({state:'visible'});
  const tag=await locator.evaluate(el=>el.tagName);
  if(tag==='SELECT'){
    await page.waitForFunction(([k,v])=>[...document.querySelectorAll(`[data-spec-key="${k}"] option`)].some(o=>o.value===v),[key,value]);
    if(await locator.inputValue()===String(value))return;
    await waitResolve(page,()=>locator.selectOption(String(value)));
    return;
  }
  if(tag==='INPUT'){
    await waitResolve(page,async()=>{await locator.fill(String(value));await locator.press('Tab');});
    return;
  }
  throw new Error(`Unsupported control ${key}:${tag}`);
}
async function optionValues(page,key){
  const locator=page.locator(`[data-spec-key="${key}"]`);
  if(!await locator.count())return [];
  return locator.locator('option').evaluateAll(options=>options.map(o=>o.value).filter(Boolean));
}
async function fieldKeys(page){
  return page.locator('#dynamicForm .field[data-key]').evaluateAll(rows=>rows.map(row=>row.dataset.key));
}
function assertRelativeOrder(actual,expected){
  let last=-1;
  for(const key of expected){const index=actual.indexOf(key);assert.ok(index>last,`field order ${key}: ${actual.join(',')}`);last=index;}
}
async function apiResolve(request,selection){
  const q=new URLSearchParams({productId:PRODUCT_ID,selection:JSON.stringify(selection)});
  const response=await request.get(`${BASE}/api/catalog/resolve?${q}`);
  assert.equal(response.ok(),true);
  return response.json();
}
function errorCodes(result){return (result.validation?.errors??[]).map(e=>e.errorCode);}

try{
  const desktopContext=await browser.newContext({viewport:{width:1440,height:1000}});
  const desktop=await desktopContext.newPage();
  trackErrors(desktop,'desktop');

  // Flow 1: non-fire / insulated / sleeve / manual.
  await openConcord(desktop);
  for(const [key,value] of [
    ['fire_spec','non_fire'],['panel_type','insulated'],['design_code','N05N'],['frame_type','sleeve'],['handing','right'],
    ['size_type','standard'],['size_module','kanto'],['door_color','PR'],['frame_color','BE'],['lock_system','manual'],
    ['handle_color','black'],['cylinder_type','ps_miwa'],['closer_inclusion','included'],
    ['sleeve_glass_procurement','ykk_unit'],['sleeve_glass_spec','low_e_laminated_double']
  ])await selectSpec(desktop,key,value);
  assert.equal(await desktop.locator('[data-spec-key="smart_key_type"]').count(),0);
  assert.equal(await desktop.locator('[data-spec-key="power_supply"]').count(),0);
  const keys1=await fieldKeys(desktop);
  assertRelativeOrder(keys1,['fire_spec','panel_type','design_code','frame_type','handing','size_type','size_module','door_color','frame_color','lock_system','handle_color','cylinder_type','closer_inclusion','sleeve_glass_procurement','sleeve_glass_spec','punching_panel','screen_type','free_stopper','interior_trim_type','wreath_hook']);
  assert.match(await desktop.locator('#selectionSummary').innerText(),/N05N/);
  assert.match(await desktop.locator('#selectionSummary').innerText(),/手動錠/);
  await desktop.screenshot({path:`${OUT}/desktop-flow1-manual-sleeve.png`,fullPage:true});
  report.desktop.flows.push({id:'FLOW-1',status:'PASS'});

  // A stale sleeve selection must be rejected and visibly explained when changing to fire.
  await selectSpec(desktop,'fire_spec','fire_door');
  await desktop.waitForFunction(()=>document.querySelector('#warnings')?.textContent.includes('CONCORD_FIRE_SLEEVE_NOT_AVAILABLE'));
  assert.match(await desktop.locator('#warnings').innerText(),/防火ドアには袖付タイプの設定がありません/);
  await desktop.screenshot({path:`${OUT}/desktop-invalid-transition.png`,fullPage:true});

  // Flow 2: non-fire / outside / face recognition / AC100V.
  await openConcord(desktop);
  for(const [key,value] of [
    ['fire_spec','non_fire'],['panel_type','insulated'],['design_code','N05N'],['frame_type','outside_retract'],['handing','right'],
    ['size_type','standard'],['size_module','kanto'],['door_color','PR'],['frame_color','BE'],['lock_system','smart_control_key'],
    ['smart_key_type','face_recognition'],['power_supply','ac100v'],['handle_color','black']
  ])await selectSpec(desktop,key,value);
  assert.deepEqual(await optionValues(desktop,'power_supply'),['ac100v']);
  assert.equal(await desktop.locator('[data-spec-key="cylinder_type"]').count(),0);
  assert.equal(await desktop.locator('[data-spec-key="closer_inclusion"]').count(),0);
  await desktop.screenshot({path:`${OUT}/desktop-flow2-face-ac.png`,fullPage:true});
  report.desktop.flows.push({id:'FLOW-2',status:'PASS'});

  // Flow 3: aluminum A01N / smart key.
  await openConcord(desktop);
  await selectSpec(desktop,'fire_spec','non_fire');
  await selectSpec(desktop,'panel_type','aluminum');
  assert.deepEqual(await optionValues(desktop,'design_code'),['A01N','A02N','A03N']);
  for(const [key,value] of [
    ['design_code','A01N'],['frame_type','outside_retract'],['handing','right'],['size_type','standard'],['size_module','kanto'],
    ['door_color','H2'],['frame_color','H2'],['lock_system','smart_control_key'],['smart_key_type','pocket_key'],['power_supply','battery'],['handle_color','silver']
  ])await selectSpec(desktop,key,value);
  await desktop.screenshot({path:`${OUT}/desktop-flow3-aluminum.png`,fullPage:true});
  report.desktop.flows.push({id:'FLOW-3',status:'PASS'});

  // Flow 4: fire / outside / pitatto / battery. Fire must not expose sleeve or face recognition.
  await openConcord(desktop);
  await selectSpec(desktop,'fire_spec','fire_door');
  assert.equal(await desktop.locator('[data-spec-key="panel_type"]').count(),0);
  await selectSpec(desktop,'design_code','N05N');
  assert.deepEqual(await optionValues(desktop,'frame_type'),['outside_retract']);
  await selectSpec(desktop,'frame_type','outside_retract');
  for(const [key,value] of [
    ['handing','left'],['size_type','standard'],['size_module','kanto'],['door_color','PR'],['frame_color','BE'],
    ['lock_system','smart_control_key']
  ])await selectSpec(desktop,key,value);
  assert.deepEqual(await optionValues(desktop,'smart_key_type'),['pocket_key','pitatto_key']);
  await selectSpec(desktop,'smart_key_type','pitatto_key');
  await selectSpec(desktop,'power_supply','battery');
  await selectSpec(desktop,'handle_color','silver');
  assert.equal(await desktop.locator('[data-spec-key="sleeve_glass_procurement"]').count(),0);
  assert.equal(await desktop.locator('[data-spec-key="punching_panel"]').count(),0);
  await desktop.screenshot({path:`${OUT}/desktop-flow4-fire-pitatto-battery.png`,fullPage:true});
  report.desktop.flows.push({id:'FLOW-4',status:'PASS'});

  const health=await desktop.request.get(`${BASE}/api/health`).then(r=>r.json());
  assert.equal(health.ok,true);
  const ids=health.inventory.map(x=>x.productId);
  for(const id of ['SER-LIX-SAMOS2H','SER-LIX-SAMOSL','SER-YKK-APW430','SER-YKK-APW431',PRODUCT_ID])assert.ok(ids.includes(id),id);
  assert.equal(ids.length,5);
  const products=await desktop.request.get(`${BASE}/api/catalog/products`).then(r=>r.json());
  assert.ok(products.some(p=>p.id===PRODUCT_ID&&p.manufacturer==='YKK AP'&&p.displayName==='コンコード S30'));

  const validCases=[
    {id:'VALID-1',selection:{fire_spec:'non_fire',panel_type:'insulated',design_code:'N05N',frame_type:'sleeve',handing:'right',size_type:'standard',size_module:'kanto',door_color:'PR',frame_color:'BE',lock_system:'manual',handle_color:'black',cylinder_type:'ps_miwa',closer_inclusion:'included',sleeve_glass_procurement:'ykk_unit',sleeve_glass_spec:'low_e_laminated_double'},symbol:'BE3EH-152N05NPR-R'},
    {id:'VALID-2',selection:{fire_spec:'non_fire',panel_type:'insulated',design_code:'N05N',frame_type:'outside_retract',handing:'right',size_type:'standard',size_module:'kanto',door_color:'PR',frame_color:'BE',lock_system:'smart_control_key',smart_key_type:'face_recognition',power_supply:'ac100v',handle_color:'black'}},
    {id:'VALID-3',selection:{fire_spec:'fire_door',design_code:'N05N',frame_type:'outside_retract',handing:'left',size_type:'standard',size_module:'kanto',door_color:'PR',frame_color:'BE',lock_system:'smart_control_key',smart_key_type:'pitatto_key',power_supply:'battery',handle_color:'silver'},symbol:'BE3SL-911N05NPR-LK4'},
    {id:'VALID-4',selection:{fire_spec:'non_fire',panel_type:'aluminum',design_code:'A01N',frame_type:'outside_retract',handing:'right',size_type:'standard',size_module:'kanto',door_color:'H2',frame_color:'H2',lock_system:'manual',handle_color:'silver',cylinder_type:'ps_miwa',closer_inclusion:'included'}}
  ];
  for(const testCase of validCases){
    const result=await apiResolve(desktop.request,testCase.selection);
    assert.equal(result.validation.status,'VALID',testCase.id);
    if(testCase.symbol)assert.equal(result.orderConfiguration.symbols['CONCORD-DOOR-SET'],testCase.symbol,testCase.id);
    if(testCase.id==='VALID-2')assert.ok(result.orderConfiguration.components.some(x=>x.componentType==='face_recognition_unit'));
    if(testCase.id==='VALID-3')assert.equal(result.resolvedFields.key_code,'K4');
    if(testCase.id==='VALID-4')assert.equal(result.resolvedFields.door_glass_procurement,'separate_order_required');
    report.api.valid.push({id:testCase.id,status:'PASS'});
  }

  const invalidCases=[
    ['INVALID-1',{fire_spec:'fire_door',frame_type:'sleeve'},'CONCORD_FIRE_SLEEVE_NOT_AVAILABLE'],
    ['INVALID-2',{fire_spec:'fire_door',smart_key_type:'face_recognition'},'CONCORD_FIRE_FACE_KEY_NOT_AVAILABLE'],
    ['INVALID-3',{smart_key_type:'face_recognition',power_supply:'battery'},'CONCORD_FACE_KEY_BATTERY_NOT_AVAILABLE'],
    ['INVALID-4',{frame_type:'outside_retract',punching_panel:'included'},'CONCORD_OUTSIDE_PUNCHING_NOT_AVAILABLE'],
    ['INVALID-5',{frame_type:'outside_retract',sleeve_glass_procurement:'ykk_unit'},'CONCORD_OUTSIDE_SLEEVE_GLASS_NOT_APPLICABLE']
  ];
  for(const [id,selection,code] of invalidCases){
    const result=await apiResolve(desktop.request,selection);
    assert.equal(result.validation.status,'INVALID',id);
    assert.ok(errorCodes(result).includes(code),`${id}:${code}`);
    assert.equal(result.orderConfiguration.components.length,0,id);
    report.api.invalid.push({id,status:'PASS',errorCode:code});
  }

  const special=await apiResolve(desktop.request,{fire_spec:'non_fire',panel_type:'insulated',design_code:'N12N',frame_type:'sleeve',handing:'right',size_type:'special_order',frame_width_mm:1700,frame_height_mm:2200,door_leaf_width_mm:900,door_leaf_height_mm:2100,door_color:'PR',frame_color:'BE',lock_system:'manual',handle_color:'silver',cylinder_type:'wg_minebea_showa',closer_inclusion:'omitted'});
  assert.equal(special.validation.status,'VALID');
  assert.equal(special.resolvedFields.sleeve_glass_procurement,'site_procured');
  assert.equal(special.resolvedFields.order_strategy,'individual_components');
  assert.ok(special.orderConfiguration.components.some(x=>x.componentType==='frame_unit'&&x.productSymbol===null));
  assert.ok(special.orderConfiguration.components.some(x=>x.componentType==='door_leaf_unit'&&x.productSymbol===null));
  report.api.specialOrder={status:'PASS'};

  await desktopContext.close();

  // Smartphone viewport: operate a real complete flow and assert no horizontal overflow.
  const mobileContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const mobile=await mobileContext.newPage();
  trackErrors(mobile,'mobile');
  await openConcord(mobile);
  for(const [key,value] of [
    ['fire_spec','fire_door'],['design_code','N05N'],['frame_type','outside_retract'],['handing','left'],['size_type','standard'],
    ['size_module','kanto'],['door_color','PR'],['frame_color','BE'],['lock_system','smart_control_key'],['smart_key_type','pitatto_key'],
    ['power_supply','battery'],['handle_color','silver']
  ])await selectSpec(mobile,key,value);
  const overflow=await mobile.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  assert.ok(overflow<=1,`mobile horizontal overflow ${overflow}px`);
  const controlWidths=await mobile.locator('#manufacturer,#product,#dynamicForm select,#dynamicForm input').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().right-window.innerWidth));
  assert.ok(controlWidths.every(v=>v<=1),`mobile controls overflow ${controlWidths}`);
  assert.match(await mobile.locator('#selectionSummary').innerText(),/ピタットキー/);
  assert.match(await mobile.locator('#selectionSummary').innerText(),/電池式/);
  await mobile.screenshot({path:`${OUT}/mobile-flow4-fire-pitatto-battery.png`,fullPage:true});
  report.mobile.flows.push({id:'FLOW-4',status:'PASS',viewport:'390x844',horizontalOverflowPx:overflow});
  await mobileContext.close();

  assert.deepEqual(report.consoleErrors,[],'Browser console/page errors');
  report.status='PASS';
  await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
} catch(error){
  report.status='FAIL';report.failure=error.stack??String(error);
  await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2));
  console.error(error);
  process.exitCode=1;
} finally {
  await browser.close();
}
