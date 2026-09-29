import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4173';
const OUT='artifacts/uchirimo-runtime-browser-qa';
const PRODUCT='SER-YKKAP-UCHIRIMO';
const report={status:'RUNNING',exactHead:process.env.HEAD_SHA??process.env.GITHUB_SHA??null,desktop:{},mobile:{},consoleErrors:[],pageErrors:[],failedResponses:[]};
await mkdir(OUT,{recursive:true});
const browser=await chromium.launch({headless:true});

async function select(page,key,value){
  const old=await page.evaluate(()=>Number(document.querySelector('#qaRoot #dynamicForm')?.dataset.resolveRevision??0));
  const field=page.locator(`#qaRoot [data-spec-key="${key}"]`);
  if(typeof value==='number'){await field.fill(String(value));await field.dispatchEvent('change');}
  else await field.selectOption(value);
  await page.waitForFunction(({revision,key,value})=>{
    const current=Number(document.querySelector('#qaRoot #dynamicForm')?.dataset.resolveRevision??0);
    const snapshot=window.qaEditor?.getSnapshot?.();
    return current>revision&&String(snapshot?.configuration?.[key])===String(value);
  },{revision:old,key,value});
  return page.evaluate(()=>window.qaEditor.state.resolved);
}

async function exercise(page){
  page.on('console',(message)=>{if(message.type()==='error')report.consoleErrors.push(message.text());});
  page.on('pageerror',(error)=>report.pageErrors.push(error.message));
  page.on('response',(response)=>{if(response.status()>=400)report.failedResponses.push({status:response.status(),url:response.url()});});
  await page.goto(`${BASE}/runtime-lab`,{waitUntil:'networkidle'});
  await page.evaluate(async()=>{
    const {ProductConfigurationEditor}=await import('/product-configuration-editor.mjs');
    const root=document.createElement('div');root.id='qaRoot';document.body.append(root);
    window.qaEditor=new ProductConfigurationEditor(root);await window.qaEditor.mount();
  });
  const integrations=await page.evaluate(async()=>await(await fetch('/api/runtime-master/integrations')).json());
  const requested=['SER-LIXIL-TW','SER-LIX-EW','SER-YKK-APW430','SER-YKK-APW431','SER-LIX-SAMOSL','SER-LIX-SAMOS2H',PRODUCT];
  for(const id of requested)assert.ok(integrations.some((row)=>row.id===id&&row.status==='READY'&&row.selectable),`${id} unavailable`);
  await page.locator('#qaRoot #manufacturer').selectOption('YKK AP');
  const initial=page.waitForResponse((row)=>row.url().includes('/api/runtime-master/resolve')&&row.status()===200);
  await page.locator('#qaRoot #product').selectOption(PRODUCT);
  await initial;
  await page.locator('#qaRoot [data-spec-key="room_specification"]').waitFor();
  await select(page,'room_specification','residential');
  await select(page,'window_type','fix_window');
  await select(page,'glass_family','insulating_glass');
  assert.equal(await page.locator('#qaRoot [data-spec-key="glass_structure"]').count(),0);
  assert.deepEqual(await page.locator('#qaRoot [data-spec-key="sales_glass_appearance"] option').allTextContents(),['選択してください','透明ガラス','型板ガラス','すり板ガラス']);
  assert.deepEqual(await page.locator('#qaRoot [data-spec-key="sales_spacer_type"] option').allTextContents(),['選択してください','アルミスペーサー','樹脂スペーサー']);
  assert.deepEqual(await page.locator('#qaRoot [data-spec-key="sales_gas_fill"] option').allTextContents(),['選択してください','空気層','アルゴンガス入り']);
  await select(page,'sales_glass_appearance','clear');
  await select(page,'sales_spacer_type','resin');
  await select(page,'sales_gas_fill','argon');
  let snapshot=await page.evaluate(()=>window.qaEditor.getSnapshot());
  assert.equal(snapshot.configuration.sales_glass_appearance,undefined);
  assert.equal(snapshot.configuration.sales_spacer_type,undefined);
  assert.equal(snapshot.configuration.sales_gas_fill,undefined);
  assert.equal(snapshot.configuration.glass_structure,undefined);
  assert.equal(snapshot.sales_request_handoff.glass_appearance,'clear');
  assert.equal(snapshot.sales_request_handoff.spacer_type_request,'resin');
  assert.equal(snapshot.sales_request_handoff.gas_fill_request,'argon');
  const summary=await page.locator('#qaRoot #selectionSummary').innerText();
  for(const label of ['透明ガラス','樹脂スペーサー','アルゴンガス入り'])assert.ok(summary.includes(label),`${label} missing from summary`);
  await select(page,'glass_family','single_glazing');
  for(const key of ['sales_spacer_type','sales_gas_fill','spacer_type','gas_fill'])
    assert.equal(await page.locator(`#qaRoot [data-spec-key="${key}"]`).count(),0,`${key} must be absent for single glazing`);
  snapshot=await page.evaluate(()=>window.qaEditor.getSnapshot());
  assert.equal(snapshot.configuration.sales_spacer_type,undefined);
  assert.equal(snapshot.configuration.sales_gas_fill,undefined);
  await select(page,'sales_glass_appearance','washi');
  await select(page,'size_w',500);
  const dimension=await select(page,'size_h',500);
  assert.equal(dimension.dimensionResult?.status,'PASS');
  assert.doesNotMatch(await page.locator('#qaRoot #warnings').innerText(),/ORDER_READY\s*=|\b(?:BLOCKED|REVIEW_REQUIRED|MANUAL_CHECK)\b/);
  snapshot=await page.evaluate(()=>window.qaEditor.getSnapshot());
  assert.equal(snapshot.configuration.sales_glass_appearance,undefined);
  assert.equal(snapshot.sales_request_handoff.glass_appearance,'washi');
  await page.evaluate(async(saved)=>{
    const {ProductConfigurationEditor}=await import('/product-configuration-editor.mjs');
    const root=document.createElement('div');root.id='qaRestoreRoot';document.body.append(root);
    window.qaRestoreEditor=new ProductConfigurationEditor(root,{initialSnapshot:saved});
    await window.qaRestoreEditor.mount();
  },snapshot);
  assert.equal(await page.locator('#qaRestoreRoot [data-spec-key="sales_glass_appearance"]').inputValue(),'washi');
  assert.equal((await page.evaluate(()=>window.qaRestoreEditor.getSnapshot())).sales_request_handoff.glass_appearance,'washi');
  const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-window.innerWidth));
  assert.ok(overflow<=1,`horizontal overflow ${overflow}`);
  return {status:'PASS',readyProducts:requested.length,salesSpacerAndCavity:'PASS',thicknessHidden:'PASS',dependencyClear:'PASS',snapshot:'PASS',dimension:'PASS',overflow};
}

try{
  for(const config of [{name:'desktop',width:1440,height:1000,mobile:false},{name:'mobile',width:390,height:844,mobile:true}]){
    const context=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:config.mobile,hasTouch:config.mobile});
    const page=await context.newPage();
    report[config.name]=await exercise(page);
    await page.screenshot({path:`${OUT}/${config.name}-${config.width}x${config.height}.png`,fullPage:true});
    await context.close();
  }
  assert.deepEqual(report.consoleErrors,[]);assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.failedResponses,[]);
  report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.stack??String(error);throw error;}
finally{await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify(report));
