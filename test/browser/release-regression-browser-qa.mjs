import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4173';
const SHARE_TOKEN=process.env.VERCEL_SHARE_TOKEN;
const OUT='artifacts/release-regression-browser-qa';
await mkdir(OUT,{recursive:true});
const report={status:'RUNNING',catalogProducts:[],runtimeDeclarations:[],consoleErrors:[],pageErrors:[],failedResponses:[]};
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();
page.on('console',(message)=>{if(message.type()==='error')report.consoleErrors.push(message.text());});
page.on('pageerror',(error)=>report.pageErrors.push(error.message));
page.on('response',(response)=>{if(response.status()>=400)report.failedResponses.push({status:response.status(),url:response.url()});});

try {
  if(SHARE_TOKEN)await page.goto(`${BASE}/?_vercel_share=${encodeURIComponent(SHARE_TOKEN)}`,{waitUntil:'networkidle'});

  // Legacy catalog remains byte-for-byte available through its API for compatibility,
  // but the editor must not prefer it over a declared canonical Runtime state.
  const api=await context.request.get(`${BASE}/api/catalog/products`);
  assert.equal(api.status(),200);
  const products=await api.json();
  assert.equal(products.length,4,'legacy catalog inventory remains available for compatibility');
  const expectedLegacy=new Set(['サーモスⅡ-H','サーモスL','APW 430','APW 431']);
  assert.deepEqual(new Set(products.map((row)=>row.displayName??row.series)),expectedLegacy);
  report.catalogProducts=products.map((row)=>({id:row.id,manufacturer:row.manufacturer,series:row.displayName??row.series,status:'API_COMPATIBLE'}));

  const runtime=await context.request.get(`${BASE}/api/runtime-master/integrations`);
  assert.equal(runtime.status(),200);
  const integrations=await runtime.json();
  assert.equal(integrations.length,7);
  const byId=new Map(integrations.map((row)=>[row.id,row]));
  for(const id of ['SER-LIX-EW','SER-LIXIL-TW','SER-YKKAP-UCHIRIMO']){
    assert.equal(byId.get(id)?.selectable,true,id);
    assert.equal(byId.get(id)?.status,'READY',id);
  }
  for(const id of ['SER-LIX-THERMOSL','SER-LIX-SAMOS2H','SER-YKK-APW430','SER-YKK-APW431']){
    assert.equal(byId.get(id)?.selectable,false,id);
  }
  assert.equal(byId.get('SER-LIX-SAMOS2H')?.status,'RUNTIME_NOT_READY');
  assert.equal(byId.get('SER-YKK-APW431')?.status,'RUNTIME_NOT_READY');
  assert.equal(byId.get('SER-LIX-THERMOSL')?.status,'RUNTIME_NOT_INTEGRATED');
  assert.equal(byId.get('SER-YKK-APW430')?.status,'RUNTIME_NOT_INTEGRATED');
  report.runtimeDeclarations=integrations.map(({id,manufacturer,series,status,selectable})=>({id,manufacturer,series,status,selectable}));

  await page.goto(`${BASE}/runtime-lab`,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent==='CATALOG CONNECTED');

  // Each legacy new-construction product must be shadowed by the Runtime declaration.
  // Missing or not-yet-integrated Runtime packages are shown safely as disabled options,
  // never as selectable legacy/skeleton fallbacks.
  for(const target of [
    {manufacturer:'LIXIL',id:'SER-LIX-SAMOS2H',text:'サーモスⅡ-H（正式Runtime未準備）'},
    {manufacturer:'LIXIL',id:'SER-LIX-THERMOSL',text:'サーモスL（Runtime未統合）'},
    {manufacturer:'YKK AP',id:'SER-YKK-APW430',text:'APW 430（Runtime未統合）'},
    {manufacturer:'YKK AP',id:'SER-YKK-APW431',text:'APW 431（正式Runtime未準備）'},
  ]){
    await page.selectOption('#manufacturer',target.manufacturer);
    const option=page.locator(`#product option[value="${target.id}"]`);
    await option.waitFor({state:'attached'});
    assert.equal(await option.isDisabled(),true,target.id);
    assert.equal((await option.textContent())?.trim(),target.text,target.id);
  }

  // No duplicate legacy choice may survive beside a Runtime declaration.
  const optionIds=await page.locator('#product option').evaluateAll((options)=>options.map((option)=>option.value).filter(Boolean));
  assert.equal(new Set(optionIds).size,optionIds.length);

  assert.deepEqual(report.consoleErrors,[]);
  assert.deepEqual(report.pageErrors,[]);
  assert.deepEqual(report.failedResponses,[]);
  report.status='PASS';
  await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
} catch(error){
  report.status='FAIL';report.failure=error.stack??String(error);
  await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2));
  throw error;
} finally {
  await context.close();
  await browser.close();
}
