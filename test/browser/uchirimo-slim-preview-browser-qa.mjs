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
async function chooseIfAvailable(page,result,key,preferred){
 const field=result.fields.find(x=>x.key===key);
 if(!field||result.selection[key]!==undefined)return result;
 const value=field.values.some(x=>String(x.value)===String(preferred))?preferred:field.values[0]?.value;
 return value===undefined?result:choose(page,key,value);
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
 assert.equal(await page.locator('[data-spec-key="low_e_type"]').count(),1);
 result=await choose(page,'glass_structure','P3P3');
 assert.equal(await page.locator('[data-spec-key="spacer_type"]').count(),1);
 assert.equal(await page.locator('[data-spec-key="gas_fill"]').count(),1);
 result=await choose(page,'spacer_type','aluminum');
 assert.equal(result.selection.gas_fill,undefined);
 result=await choose(page,'glass_family','single_glazing');
 for(const key of ['low_e_type','spacer_type','gas_fill'])assert.equal(await page.locator(`[data-spec-key="${key}"]`).count(),0,`${key} must clear`);
 for(const [key,value] of [['glass_structure','W3'],['glass_surface_type','washi'],['safety_treatment','standard'],['grille_type','none'],['muntin_type','none']])result=await chooseIfAvailable(page,result,key,value);
 for(let i=0;i<60;i++){
  const field=result.fields.find(x=>x.required&&result.selection[x.key]===undefined);
  if(!field)break;
  const value=field.dataType==='NUMBER'?500:field.values[0]?.value;
  assert.notEqual(value,undefined,`REQUIRED_INPUT_MISSING:${field.key}`);
  result=await choose(page,field.key,value);
 }
 assert.equal(result.validation.status,'MANUAL_CHECK');
 assert.equal(result.orderReady,false);
 assert.ok(result.manualWarnings.some(x=>x.includes('メーカー見積')));
 assert.match(await page.locator('#warnings').innerText(),/メーカー見積/);
 assert.doesNotMatch(await page.locator('#warnings').innerText(),technical);
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
 return {status:'PASS',dependency_clear:'PASS',manual_handoff:'PASS',size_block_and_recovery:'PASS',technical_token_hidden:'PASS',overflow,input_overflow:inputOverflow};
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
