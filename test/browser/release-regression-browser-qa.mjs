import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4173';
const SHARE_TOKEN=process.env.VERCEL_SHARE_TOKEN;
const OUT='artifacts/release-regression-browser-qa';
await mkdir(OUT,{recursive:true});
const report={status:'RUNNING',products:[],runtimeIntegrations:[],consoleErrors:[],pageErrors:[],failedResponses:[]};
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();
page.on('console',(message)=>{if(message.type()==='error')report.consoleErrors.push(message.text());});
page.on('pageerror',(error)=>report.pageErrors.push(error.message));
page.on('response',(response)=>{if(response.status()>=400)report.failedResponses.push({status:response.status(),url:response.url()});});

try {
  if(SHARE_TOKEN)await page.goto(`${BASE}/?_vercel_share=${encodeURIComponent(SHARE_TOKEN)}`,{waitUntil:'networkidle'});
  const [catalogApi,runtimeApi]=await Promise.all([
    context.request.get(`${BASE}/api/catalog/products`),
    context.request.get(`${BASE}/api/runtime-master/integrations`),
  ]);
  assert.equal(catalogApi.status(),200);
  assert.equal(runtimeApi.status(),200);
  const products=await catalogApi.json();
  const integrations=await runtimeApi.json();
  const integrationById=new Map(integrations.map((row)=>[row.id,row]));

  assert.equal(products.length,4,'backend compatibility catalog inventory must remain at four pre-existing series');
  const expected=new Set(['サーモスⅡ-H','サーモスL','APW 430','APW 431']);
  assert.deepEqual(new Set(products.map((row)=>row.displayName??row.series)),expected);

  for(const product of products){
    await page.goto(`${BASE}/runtime-lab`,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>document.querySelector('#status')?.textContent==='CATALOG CONNECTED');
    await page.selectOption('#manufacturer',product.manufacturer);
    const declared=integrationById.get(product.id);
    await page.waitForFunction((id)=>[...document.querySelectorAll('#product option')].some((option)=>option.value===id),product.id);
    const optionState=await page.locator(`#product option[value="${product.id}"]`).evaluate((option)=>({disabled:option.disabled,text:option.textContent}));

    if(declared){
      assert.equal(optionState.disabled,!declared.selectable,`${product.id} UI selectability must follow App Runtime Integration Registry`);
      assert.ok(declared.selectable || optionState.text.includes('利用不可'));
      report.products.push({id:product.id,manufacturer:product.manufacturer,series:product.displayName??product.series,status:declared.selectable?'RUNTIME_READY':'FAIL_CLOSED',reason:declared.blockReason??null});
      continue;
    }

    assert.equal(optionState.disabled,false);
    const response=page.waitForResponse((r)=>r.url().includes('/api/catalog/resolve')&&r.status()===200);
    await page.selectOption('#product',product.id);
    await response;
    await page.waitForFunction(()=>document.querySelectorAll('#dynamicForm [data-spec-key]').length>0);
    const firstEditable=page.locator('#dynamicForm select[data-spec-key]:not([disabled])').first();
    if(await firstEditable.count()){
      const option=firstEditable.locator('option:not([value=""])').first();
      if(await option.count()){
        const value=await option.getAttribute('value');
        if(value){
          const next=page.waitForResponse((r)=>r.url().includes('/api/catalog/resolve')&&r.status()===200);
          await firstEditable.selectOption(value);
          await next;
        }
      }
    }
    const summary=await page.locator('#selectionSummary').innerText();
    assert.ok(summary.length>0);
    report.products.push({id:product.id,manufacturer:product.manufacturer,series:product.displayName??product.series,status:'LEGACY_COMPATIBILITY_PASS'});
  }

  assert.equal(integrations.length,7);
  const ready=new Set(integrations.filter((row)=>row.selectable&&row.status==='READY').map((row)=>row.id));
  const blocked=new Set(integrations.filter((row)=>!row.selectable).map((row)=>row.id));
  assert.deepEqual(ready,new Set(['SER-LIX-EW','SER-LIX-SAMOS2H','SER-LIX-SAMOSL','SER-LIXIL-TW','SER-YKK-APW430','SER-YKK-APW431','SER-YKKAP-UCHIRIMO']));
  assert.deepEqual(blocked,new Set());
  report.runtimeIntegrations=integrations.map(({id,status,selectable,blockReason})=>({id,status,selectable,blockReason}));

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
