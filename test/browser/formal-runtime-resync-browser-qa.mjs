import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4173';
const SHARE_TOKEN=process.env.VERCEL_SHARE_TOKEN;
const OUT='artifacts/formal-runtime-resync-browser-qa';
const PRODUCTS=[
  {manufacturer:'LIXIL',id:'SER-LIX-SAMOS2H',version:'v0.9-R1',windows:17},
  {manufacturer:'LIXIL',id:'SER-LIX-SAMOSL',version:'v0.7-R1',windows:17},
  {manufacturer:'YKK AP',id:'SER-YKK-APW430',version:'20260830-R1',windows:25},
];
await mkdir(OUT,{recursive:true});
const report={status:'RUNNING',desktop:{},mobile:{},consoleErrors:[],pageErrors:[],failedResponses:[]};
const browser=await chromium.launch({headless:true});

function track(page){
  page.on('console',(message)=>{if(message.type()==='error')report.consoleErrors.push(message.text());});
  page.on('pageerror',(error)=>report.pageErrors.push(error.message));
  page.on('response',(response)=>{if(response.status()>=400)report.failedResponses.push({status:response.status(),url:response.url()});});
}
function entryUrl(){return SHARE_TOKEN?`${BASE}/runtime-lab?_vercel_share=${encodeURIComponent(SHARE_TOKEN)}`:`${BASE}/runtime-lab`;}
async function openLab(page){
  await page.goto(entryUrl(),{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent==='CATALOG CONNECTED');
}
async function selectAndResolve(page,key,value){
  const response=page.waitForResponse((r)=>r.url().includes('/api/runtime-master/resolve')&&r.status()===200);
  await page.locator(`[data-spec-key="${key}"]`).selectOption(value);
  return (await response).json();
}
async function openProduct(page,product){
  await page.selectOption('#manufacturer',product.manufacturer);
  await page.waitForFunction((id)=>[...document.querySelectorAll('#product option')].some((option)=>option.value===id&&!option.disabled),product.id);
  const response=page.waitForResponse((r)=>r.url().includes('/api/runtime-master/resolve')&&r.status()===200);
  await page.selectOption('#product',product.id);
  return (await response).json();
}
function assertNoTechnicalLeak(result){
  const keys=result.fields.map((field)=>field.key);
  for(const key of ['construction','legacyConstruction','legacyConfiguration','internal_construction'])assert.ok(!keys.includes(key),`technical field leaked: ${key}`);
}
function assertSizeField(size){
  assert.ok(size?.values?.length>0,'size choices missing');
  for(const value of size.values)assert.match(value.displayLabel,/^\S+ ｜ W \d+ × H \d+$/u);
}
async function exerciseProduct(page,product){
  let result=await openProduct(page,product);
  assert.equal(result.runtimeMaster.packageVersion,product.version);
  assert.equal(result.runtimeMaster.sourcePackageIntegrity.match,true);
  const windows=result.fields.find((field)=>field.key==='window_type');
  assert.equal(windows?.values?.length,product.windows);
  assertNoTechnicalLeak(result);
  result=await selectAndResolve(page,'window_type',windows.values[0].value);
  assertNoTechnicalLeak(result);
  for(let i=0;i<24;i+=1){
    const size=result.fields.find((field)=>field.key==='size');
    if(size?.values?.length){
      assertSizeField(size);
      result=await selectAndResolve(page,'size',size.values[0].value);
      assertNoTechnicalLeak(result);
      break;
    }
    const next=result.fields.find((field)=>field.required&&result.selection[field.key]===undefined&&field.dataType!=='NUMBER'&&field.values?.length);
    if(!next)throw new Error(`${product.id}: unable to reach standard size field`);
    const preferred=next.key==='size_mode'?next.values.find((row)=>row.value==='STANDARD'):null;
    result=await selectAndResolve(page,next.key,(preferred??next.values[0]).value);
    assertNoTechnicalLeak(result);
  }
  assert.ok(result.selection.size,`${product.id}: standard size was not selected`);
  assert.equal(await page.locator('[data-spec-key="construction"]').count(),0);
  return {packageVersion:product.version,windowCount:product.windows,standardSize:'PASS',technicalFieldHidden:'PASS',integrity:'PASS'};
}

try{
  const preflight=await browser.newContext();
  const url=SHARE_TOKEN?`${BASE}/api/runtime-master/integrations?_vercel_share=${encodeURIComponent(SHARE_TOKEN)}`:`${BASE}/api/runtime-master/integrations`;
  const response=await preflight.request.get(url);assert.equal(response.status(),200);
  const inventory=await response.json();
  for(const product of PRODUCTS){
    const row=inventory.find((item)=>item.id===product.id);assert.ok(row);assert.equal(row.status,'READY');assert.equal(row.selectable,true);assert.equal(row.packageVersion,product.version);
  }
  const apw431=inventory.find((item)=>item.id==='SER-YKK-APW431');assert.ok(apw431);assert.equal(apw431.selectable,false);
  await preflight.close();

  for(const config of [
    {key:'desktop',viewport:{width:1440,height:1000},mobile:false},
    {key:'mobile',viewport:{width:390,height:844},mobile:true},
  ]){
    const context=await browser.newContext({viewport:config.viewport,isMobile:config.mobile,hasTouch:config.mobile});
    const page=await context.newPage();track(page);await openLab(page);
    const products={};
    for(const product of PRODUCTS){products[product.id]=await exerciseProduct(page,product);}
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);assert.ok(overflow<=1,`${config.key} overflow: ${overflow}`);
    report[config.key]={products,overflow,status:'PASS'};
    await page.screenshot({path:`${OUT}/${config.key}-${config.viewport.width}x${config.viewport.height}.png`,fullPage:true});
    await context.close();
  }
  assert.deepEqual(report.consoleErrors,[]);assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.failedResponses,[]);
  report.status='PASS';await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(error){report.status='FAIL';report.failure=error.stack??String(error);await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2));throw error;}
finally{await browser.close();}
