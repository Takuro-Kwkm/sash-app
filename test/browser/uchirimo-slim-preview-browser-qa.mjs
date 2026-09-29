import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';

const preview=resolve(process.env.UCHIRIMO_SLIM_PREVIEW_HTML??'artifacts/uchirimo-slim/review-preview/index.html');
const out=resolve(process.env.UCHIRIMO_SLIM_BROWSER_OUT??'artifacts/uchirimo-slim/browser-qa');
const candidate=JSON.parse(await readFile('data/uchirimo-slim/working-candidate.json'));
const expectedSource=candidate.source_formal.runtime_manifest_sha256;
await mkdir(out,{recursive:true});
const report={schema:'UCHIRIMO_SLIM_PREVIEW_BROWSER_QA_V1',status:'RUNNING',scope:'SELF_CONTAINED_CANDIDATE_PREVIEW_NOT_PRODUCTION_ROUTE',exact_head:process.env.GITHUB_SHA??null,candidate_source_runtime_sha256:expectedSource,desktop:{},mobile:{},console_errors:[],page_errors:[],failed_responses:[]};
const browser=await chromium.launch({headless:true});
let activePage=null;
const technical=/ORDER_READY\s*=|\b(?:BLOCK|BLOCKED|REVIEW_REQUIRED|MANUAL_CHECK|INVALID)\b/;
async function choose(page,key,value){
 const selector=`[data-spec-key="${key}"]`,field=page.locator(selector);
 await field.waitFor();const old=await page.evaluate(()=>window.__uchirimoPreviewResolveCount??0);
 if(typeof value==='number'){await field.fill(String(value));await field.dispatchEvent('change');}
 else await field.selectOption(String(value));
 await page.waitForFunction(count=>(window.__uchirimoPreviewResolveCount??0)>count,old);
 return page.evaluate(()=>window.__uchirimoPreviewLastResult);
}
async function exercise(page){
 await page.goto(pathToFileURL(preview).href,{waitUntil:'load'});
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent==='CATALOG CONNECTED');
 const banner=await page.locator('.review-build-note').innerText();
 assert.match(banner,/Slim V2 WORKING/);assert.ok(banner.includes(expectedSource));
 await page.selectOption('#manufacturer','YKK AP');
 await page.waitForFunction(()=>[...document.querySelectorAll('#product option')].some(x=>x.value==='SER-YKKAP-UCHIRIMO'));
 const old=await page.evaluate(()=>window.__uchirimoPreviewResolveCount??0);
 await page.selectOption('#product','SER-YKKAP-UCHIRIMO');
 await page.waitForFunction(count=>(window.__uchirimoPreviewResolveCount??0)>count,old);
 let result=await page.evaluate(()=>window.__uchirimoPreviewLastResult);
 assert.equal(result.productId,'SER-YKKAP-UCHIRIMO');
 assert.equal(await page.locator('[data-spec-key="size_mode"]').isDisabled(),true);
 result=await choose(page,'room_specification','residential');
 result=await choose(page,'window_type','fix_window');
 result=await choose(page,'glass_family','insulating_glass');
 const appearance=page.locator('[data-spec-key="sales_glass_appearance"]');
 assert.deepEqual(await appearance.locator('option').allTextContents(),['選択してください','透明ガラス','型板ガラス','すり板ガラス']);
 result=await choose(page,'sales_glass_appearance','clear');
 assert.equal(result.selection.glass_structure,undefined,'appearance must not choose technical thickness');
 assert.equal(await page.locator('[data-spec-key="sales_glass_appearance"]').inputValue(),'clear');
 assert.equal(await page.locator('[data-spec-key="glass_structure"]').count(),0,'sales must not choose glass thickness');
 assert.equal(await page.locator('#selectionSummary').innerText().then(x=>x.includes('透明ガラス')),true);
 assert.equal(await page.locator('[data-spec-key="low_e_type"]').count(),1);
 result=await choose(page,'glass_family','single_glazing');
 for(const key of ['low_e_type','spacer_type','gas_fill'])assert.equal(await page.locator(`[data-spec-key="${key}"]`).count(),0,`${key} must clear`);
 assert.ok((await page.locator('[data-spec-key="sales_glass_appearance"] option').allTextContents()).some(x=>x.includes('和紙調')));
 result=await choose(page,'sales_glass_appearance','washi');
 assert.equal(await page.locator('[data-spec-key="sales_glass_appearance"]').inputValue(),'washi');
 assert.equal(await page.locator('[data-spec-key="glass_structure"]').count(),0);
 assert.equal(result.orderReady,false);
 assert.match(await page.locator('#warnings').innerText(),/ガラスの厚み・構成.*メーカー見積/s);
 assert.doesNotMatch(await page.locator('#warnings').innerText(),technical);
 result=await choose(page,'size_w',500);
 result=await choose(page,'size_h',500);
 result=await choose(page,'size_w',100);
 assert.equal(result.validation.status,'BLOCKED');
 assert.equal(result.dimensionResult.status,'BLOCK');
 assert.doesNotMatch(await page.locator('#warnings').innerText(),technical);
 result=await choose(page,'size_w',500);
 assert.equal(result.dimensionResult.status,'PASS');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 assert.ok(overflow<=1,`HORIZONTAL_OVERFLOW:${overflow}`);
 const inputOverflow=await page.locator('input,select').evaluateAll(nodes=>nodes.filter(node=>{const r=node.getBoundingClientRect();return r.left < -1||r.right>innerWidth+1;}).length);
 assert.equal(inputOverflow,0);
 return {status:'PASS',appearance_first:'PASS',thickness_not_exposed:'PASS',dependency_clear:'PASS',manufacturer_handoff:'PASS',size_block_and_recovery:'PASS',technical_token_hidden:'PASS',overflow,input_overflow:inputOverflow};
}
try{
 for(const config of [{name:'desktop',width:1440,height:1000,mobile:false},{name:'mobile',width:390,height:844,mobile:true}]){
  const context=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:config.mobile,hasTouch:config.mobile});
  const page=await context.newPage();
  activePage=page;
  page.on('console',m=>{if(m.type()==='error')report.console_errors.push(m.text());});
  page.on('pageerror',e=>report.page_errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)report.failed_responses.push({status:r.status(),url:r.url()});});
  report[config.name]=await exercise(page);
  await page.screenshot({path:`${out}/${config.name}-${config.width}x${config.height}.png`,fullPage:true});
  await context.close();activePage=null;
 }
 assert.deepEqual(report.console_errors,[]);assert.deepEqual(report.page_errors,[]);assert.deepEqual(report.failed_responses,[]);
 report.status='PASS';
}catch(e){report.status='FAIL';report.failure=e.stack??String(e);await activePage?.screenshot({path:`${out}/failure.png`,fullPage:true}).catch(()=>{});throw e;}
finally{await writeFile(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify(report));
