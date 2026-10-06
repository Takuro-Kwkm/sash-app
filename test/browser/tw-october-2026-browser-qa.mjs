import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
const preview=process.env.TW_PREVIEW_HTML,OUT=process.env.TW_QA_OUTPUT??'artifacts/tw-202610-browser';
await mkdir(OUT,{recursive:true});
let server,base=process.env.QA_BASE_URL??'http://127.0.0.1:4173';
if(preview){const html=await readFile(preview);server=createServer((req,res)=>{res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(html);});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;}
const route=p=>preview?base+'/?route='+encodeURIComponent(p):base+p;
const trap='SWT-LIX-TW-FIX-TRAPEZOID-IN',vent='OP-LIX-TW-SEPARATE-FILTER-VENT',filter='OP-LIX-TW-SEPARATE-VENT-FILTER';
const report={status:'RUNNING',mode:preview?'ACTUAL_MODULES_SELF_CONTAINED_PREVIEW':'REGISTERED_RUNTIME_LIVE_UI',widths:[],errors:[],downloads:{}};
const browser=await chromium.launch({headless:true});
try{
for(const width of [1280,768,390]){
 const context=await browser.newContext({viewport:{width,height:900},acceptDownloads:true}),page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.addInitScript(()=>{
  let delegate=window.fetch.bind(window);const wrapped=async(...args)=>{const r=await delegate(...args);if(String(typeof args[0]==='string'?args[0]:args[0]?.url).includes('/api/runtime-master/resolve'))window.__qaResult=await r.clone().json();return r;};
  Object.defineProperty(window,'fetch',{configurable:true,get:()=>wrapped,set:fn=>{delegate=fn;}});
  window.__pdfDrawnTexts=[];const fill=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...args){window.__pdfDrawnTexts.push(String(text));return fill.call(this,text,...args);};
 });
 const last=()=>page.evaluate(()=>window.__qaResult);
 async function change(key,value){
  const element=page.locator(`[data-spec-key="${key}"]`);await element.waitFor();
  await page.evaluate(()=>{window.__qaResult=null;});
  if(await element.evaluate(e=>e.tagName==='SELECT'))await element.selectOption(value);
  else await element.evaluate((e,v)=>{e.value=String(v);e.dispatchEvent(new Event('change',{bubbles:true}));},value);
  await page.waitForFunction(()=>window.__qaResult?.fields);return last();
 }
 async function mount(){
  await page.locator('#manufacturer').selectOption('LIXIL');await page.waitForFunction(()=>[...document.querySelectorAll('#product option')].some(o=>o.value==='SER-LIXIL-TW'));
  await page.locator('#product').selectOption('SER-LIXIL-TW');await page.waitForSelector('[data-spec-key="window_type"]');
 }
 async function complete(){
  for(let n=0;n<40;n++){const r=await last();const f=r.fields.find(f=>f.required&&r.selection[f.key]===undefined&&f.values.length);if(!f)return r;await change(f.key,f.values[0].value);}throw Error('Required fields did not converge');
 }
 async function trapezoid(){
  let r=await change('window_type',trap);assert.equal(r.selection.size_mode,'CUSTOM');assert.ok(!r.fields.some(f=>f.key==='size'));
  await change('custom_width',1290);r=await change('custom_height',1480);assert.ok(r.validation.missingRequiredFields.includes('custom_height_secondary'));assert.ok(!r.fields.some(f=>f.key==='exterior_color'));
  r=await change('custom_height_secondary',149);assert.equal(r.dimensionResult.status,'BLOCK');assert.ok(!r.fields.some(f=>f.key==='exterior_color'));
  await change('custom_height_secondary',1250);r=await complete();assert.equal(r.validation.missingRequiredFields.length,0);assert.equal(r.orderReady,false);assert.equal(r.dimensionResult.status,'REVIEW_REQUIRED');
  const seq=r.fields.map(f=>f.key);assert.ok(seq.indexOf('custom_height')<seq.indexOf('custom_height_secondary')&&seq.indexOf('custom_height_secondary')<seq.indexOf('exterior_color'));
  assert.match(await page.locator('#warnings').innerText(),/専用ガラス/);
  return r;
 }
 await page.goto(route('/runtime-lab'),{waitUntil:'networkidle'});await mount();let r=await trapezoid();
 assert.equal(r.fields.find(f=>f.key==='custom_height_secondary').dataType,'NUMBER');
 assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=1);
 const warnings=await page.locator('#warnings').innerText();assert.doesNotMatch(warnings,/\b(?:REVIEW_REQUIRED|CUSTOM_DIMENSION_|ORDER_READY|INVALID)\b/);
 await page.screenshot({path:`${OUT}/tw-trapezoid-${width}.png`,fullPage:true});
 r=await change('window_type','SWT-LIX-TW-FIX-IN-MADO');assert.equal(r.selection.custom_height_secondary,undefined);assert.ok(!r.fields.some(f=>f.key==='custom_height_secondary'));
 // Use actual project/opening UI to persist the new selection, then reload it.
 const now='2026-10-06T00:00:00Z';const db={schema_version:'1.0',revision:0,projects:[{project_id:'twqa',project_name:'TW 2026-10 QA',status:'ACTIVE',request_company:'QA工務店',request_company_contact:'担当',sales_person:'QA',customer_name:'QA',address:'QA現場',project_type:'NEW_BUILD',created_at:now,updated_at:now,deleted_at:null}],estimates:[{estimate_id:'twqa',project_id:'twqa',estimate_no:1,revision_no:1,status:'DRAFT',estimate_title:'TW 見積',created_at:now,updated_at:now,deleted_at:null}],openings:[{opening_id:'twqa',estimate_id:'twqa',opening_no:1,sort_order:0,status:'DRAFT',floor:'1階',room_name:'LDK',location:'南面',product_configuration_snapshot:null,created_at:now,updated_at:now,deleted_at:null}]};
 await page.evaluate(x=>localStorage.setItem('sash.work-management.v1',JSON.stringify(x)),db);
 const opening='/projects/twqa/estimates/twqa/openings/twqa',estimate='/projects/twqa/estimates/twqa';
 await page.goto(route(opening),{waitUntil:'networkidle'});await mount();await trapezoid();await page.click('#saveOpening');await page.waitForSelector('#estimateOutputLaunch');
 const saved=await page.evaluate(()=>window.__sashWorkApp.readDatabase().openings[0].product_configuration_snapshot);assert.equal(saved.configuration.custom_height_secondary,1250);assert.equal(saved.package_version,'integrated-v0.5');assert.ok(saved.confirmation_requests.some(x=>x.code==='TW_TRAPEZOID_GLASS_AND_BEAD'));
 await page.goto(route(opening),{waitUntil:'networkidle'});await page.waitForSelector('[data-spec-key="custom_height_secondary"]');assert.equal(await page.locator('[data-spec-key="custom_height_secondary"]').inputValue(),'1250');
 await page.goto(route(estimate),{waitUntil:'networkidle'});await page.click('#estimateOutputLaunch');await page.waitForSelector('#estimateOutputPdf');assert.match(await page.locator('.estimate-output-table-wrap tbody tr').first().innerText(),/H2 1250/);
 if(width===1280){
  let p=page.waitForEvent('download');await page.click('#estimateOutputExcel');const x=await p;await x.saveAs(`${OUT}/tw-trapezoid-estimate.xlsx`);const bytes=await readFile(`${OUT}/tw-trapezoid-estimate.xlsx`);assert.match(bytes.toString('utf8'),/H2 1250/);report.downloads.xlsx='PASS';
  p=page.waitForEvent('download');await page.click('#estimateOutputPdf');const pdf=await p;await pdf.saveAs(`${OUT}/tw-trapezoid-estimate.pdf`);assert.equal((await readFile(`${OUT}/tw-trapezoid-estimate.pdf`)).subarray(0,8).toString(),'%PDF-1.4');assert.ok(await page.evaluate(()=>window.__pdfDrawnTexts.some(t=>t.includes('H2 1250'))));report.downloads.pdf='PASS_WITH_ACTUAL_CANVAS_TEXT';
 }
 await page.evaluate(()=>{window.__printCalled=false;window.print=()=>{window.__printCalled=true;};});await page.click('#estimateOutputPrint');assert.equal(await page.evaluate(()=>window.__printCalled),true);await page.emulateMedia({media:'print'});assert.equal(await page.locator('.estimate-output-actions').evaluate(e=>getComputedStyle(e).display),'none');await page.emulateMedia({media:'screen'});
 await page.screenshot({path:`${OUT}/tw-estimate-${width}.png`,fullPage:true});
 // Actual UI dependency: changing double glazing to triple removes vent and its dependent filter.
 await page.goto(route('/runtime-lab'),{waitUntil:'networkidle'});await mount();await change('window_type','SWT-LIX-TW-TATE-GREMON-T');await change('size_mode','CUSTOM');await change('custom_width',640);await change('custom_height',1170);await complete();r=await last();
 if(r.selection.glass_base!=='Low-E複層ガラス'){await change('glass_base','Low-E複層ガラス');await complete();}
 r=await change('option',[vent]);assert.ok(r.fields.find(f=>f.key==='option').values.some(v=>v.value===filter));await change('option',[vent,filter]);await change('glass_base','トリプルガラス');r=await complete();assert.ok(!(r.selection.option??[]).includes(vent));assert.ok(!(r.selection.option??[]).includes(filter));
 report.widths.push({width,geometry_missing_H2:'PASS',geometry_outside:'PASS',selection_reset:'PASS',save:'PASS',reload:'PASS',redisplay:'PASS',estimate:'PASS',print:'PASS',selection_dependency:'PASS',overflow:'PASS',package_version:saved.package_version});
 await context.close();
}
assert.deepEqual(report.errors,[]);report.status='PASS';console.log(JSON.stringify(report));
}catch(e){report.status='FAIL';report.failure=e.stack??String(e);throw e;}
finally{await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2)+'\n');await browser.close();if(server)await new Promise(r=>server.close(r));}
