import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import {resolveRuntimeAppProduct} from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
import {RECHENT_ID,completeRechent,RECHENT_BUSINESS_CASES} from '../helpers/rechent-estimate-cases.mjs';
const report={status:'RUNNING',checks:[],errors:[]};
const browser=await chromium.launch();
try{
 for(const width of [1280,768,390]){
  const page=await browser.newPage({viewport:{width,height:900}});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(pathToFileURL(resolve('artifacts/rechent-review/index.html')).href);
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent==='CATALOG CONNECTED');
  await page.selectOption('#manufacturer','LIXIL');await page.selectOption('#product',RECHENT_ID);
  await page.waitForFunction(id=>window.__eightPreviewEditor?.state?.productId===id&&document.querySelectorAll('#dynamicForm [data-spec-key]').length>0,RECHENT_ID);
  for(const {name,...seed} of RECHENT_BUSINESS_CASES){
   const completed=await completeRechent(seed);
   const expected=await resolveRuntimeAppProduct(RECHENT_ID,completed.selection);
   const actual=await page.evaluate(async({id,selection})=>await(await fetch('/api/runtime-master/resolve?'+new URLSearchParams({productId:id,selection:JSON.stringify(selection)}))).json(),{id:RECHENT_ID,selection:completed.selection});
   assert.deepEqual(actual,JSON.parse(JSON.stringify(expected)),`${name}: bundled Runtime differs`);
   report.checks.push({width,name,runtimeParity:'PASS'});
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=1);
  await page.screenshot({path:`artifacts/rechent-review/preview-${width}.png`,fullPage:true});await page.close();
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.failure=e.stack;throw e;}
finally{await writeFile('artifacts/rechent-review/qa.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify({status:report.status,cases:report.checks.length}));
