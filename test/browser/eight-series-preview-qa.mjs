import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import {runtimeAppIntegrationInventory,resolveRuntimeAppProduct} from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
const ids=new Set(['SER-LIXIL-TW','SER-LIX-EW','SER-LIX-SAMOS2H','SER-LIX-SAMOSL','SER-YKK-APW430','SER-YKK-APW431','SER-YKKAP-UCHIRIMO','SER-LIXIL-INPLUS']);
const products=runtimeAppIntegrationInventory().filter(p=>ids.has(p.id));
const report={status:'RUNNING',checks:[],errors:[]};
const b=await chromium.launch();
try{
 for(const width of [1280,768,390]){
  const p=await b.newPage({viewport:{width,height:900}});p.on('pageerror',e=>report.errors.push(e.message));
  await p.goto(pathToFileURL(resolve('artifacts/eight-series-review/index.html')).href);
  await p.waitForFunction(()=>document.querySelector('#status')?.textContent==='CATALOG CONNECTED');
  for(const product of products){
   await p.selectOption('#manufacturer',product.manufacturer);await p.selectOption('#product',product.id);
   await p.waitForFunction(id=>window.__eightPreviewEditor?.state?.productId===id&&document.querySelectorAll('#dynamicForm [data-spec-key]').length>0,product.id);
   const expected=await resolveRuntimeAppProduct(product.id,{});
   const actual=await p.evaluate(async id=>await(await fetch('/api/runtime-master/resolve?productId='+encodeURIComponent(id)+'&selection=%7B%7D')).json(),product.id);
   assert.deepEqual(actual,JSON.parse(JSON.stringify(expected)),`${product.id}:preview/runtime mismatch`);
   const overflow=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=1,`${product.id}:overflow ${overflow}`);
   report.checks.push({width,id:product.id,runtimeParity:'PASS'});
  }
  await p.screenshot({path:`artifacts/eight-series-review/preview-${width}.png`,fullPage:true});await p.close();
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.failure=e.stack;throw e;}
finally{await writeFile('artifacts/eight-series-review/qa.json',JSON.stringify(report,null,2)+'\n');await b.close();}
console.log(JSON.stringify(report));
