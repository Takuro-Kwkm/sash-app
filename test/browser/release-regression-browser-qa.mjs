import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4173';
const SHARE_TOKEN=process.env.VERCEL_SHARE_TOKEN;
const OUT='artifacts/release-regression-browser-qa';
await mkdir(OUT,{recursive:true});
const report={status:'RUNNING',products:[],consoleErrors:[],pageErrors:[],failedResponses:[]};
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();
page.on('console',(message)=>{if(message.type()==='error')report.consoleErrors.push(message.text());});
page.on('pageerror',(error)=>report.pageErrors.push(error.message));
page.on('response',(response)=>{if(response.status()>=400)report.failedResponses.push({status:response.status(),url:response.url()});});

try {
  if(SHARE_TOKEN)await page.goto(`${BASE}/?_vercel_share=${encodeURIComponent(SHARE_TOKEN)}`,{waitUntil:'networkidle'});
  const api=await context.request.get(`${BASE}/api/catalog/products`);
  assert.equal(api.status(),200);
  const products=await api.json();
  assert.equal(products.length,4,'production catalog inventory must remain at four pre-existing series');
  const expected=new Set(['サーモスⅡ-H','サーモスL','APW 430','APW 431']);
  assert.deepEqual(new Set(products.map((row)=>row.displayName??row.series)),expected);

  for(const product of products){
    await page.goto(`${BASE}/runtime-lab`,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>document.querySelector('#status')?.textContent==='CATALOG CONNECTED');
    await page.selectOption('#manufacturer',product.manufacturer);
    await page.waitForFunction((id)=>[...document.querySelectorAll('#product option')].some((option)=>option.value===id&&!option.disabled),product.id);
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
    report.products.push({id:product.id,manufacturer:product.manufacturer,series:product.displayName??product.series,status:'PASS'});
  }

  const runtime=await context.request.get(`${BASE}/api/runtime-master/integrations`);
  assert.equal(runtime.status(),200);
  const integrations=await runtime.json();
  assert.equal(integrations.length,2);
  assert.deepEqual(new Set(integrations.map((row)=>row.id)),new Set(['SER-LIX-EW','SER-LIXIL-TW']));
  assert.ok(integrations.every((row)=>row.selectable&&row.status==='READY'));
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
