import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {RECHENT_ID,completeRechent,RECHENT_BUSINESS_CASES} from '../helpers/rechent-estimate-cases.mjs';
import {ENTRY_DOOR_COVER_PRESENTATION_ORDER} from '../../src/catalog/runtime-master/entry-door-cover-runtime-ui-contract.mjs';
import {isSiteSurveyField} from '../../src/work-management/field-workflow-scope.mjs';
const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4173',OUT='artifacts/rechent-estimate-integration';
const SHARE_TOKEN=process.env.VERCEL_SHARE_TOKEN;
await mkdir(OUT,{recursive:true});
const report={status:'RUNNING',exactHead:process.env.GITHUB_SHA??null,baseUrl:BASE,cases:[],errors:[],failedResponses:[]};
const browser=await chromium.launch();
const dimensions={desktop:{width:1440,height:1000},tablet:{width:768,height:1024},mobile:{width:390,height:844}};
async function selectAndResolve(page,key,value){
 const revision=await page.locator('#dynamicForm').getAttribute('data-resolve-revision');
 const response=page.waitForResponse(r=>{
  if(!r.url().includes('/api/runtime-master/resolve')||r.status()!==200)return false;
  const sent=JSON.parse(new URL(r.url()).searchParams.get('selection'));
  return String(sent[key])===String(value);
 });
 await page.locator(`[data-spec-key="${key}"]`).selectOption(value);
 const result=await(await response).json();
 await page.waitForFunction(old=>document.querySelector('#dynamicForm').dataset.resolveRevision!==old,revision);
 assert.equal(String(result.selection[key]),String(value),`${key}: received another selection response`);
 await page.waitForFunction(({key,value})=>document.querySelector(`[data-spec-key="${key}"]`)?.value===String(value),{key,value});
 assert.equal(Object.keys(result.selection).some(isSiteSurveyField),false);
 for(const field of result.fields.filter(f=>!f.readOnly&&f.values?.length)){
  const value=result.selection[field.key];if(value===undefined)continue;
  for(const item of Array.isArray(value)?value:[value])assert.ok(field.values.some(choice=>choice.value===item),`${key} leaves invalid ${field.key}`);
 }
 return result;
}
try{
 for(const [device,viewport] of Object.entries(dimensions)){
  const context=await browser.newContext({viewport,isMobile:device==='mobile',hasTouch:device==='mobile'});
  if(SHARE_TOKEN)await context.request.get(`${BASE}/?_vercel_share=${encodeURIComponent(SHARE_TOKEN)}`);
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon'))report.failedResponses.push({status:r.status(),url:r.url()});});
  await page.goto(BASE,{waitUntil:'networkidle'});
  for(const {name,...seed} of RECHENT_BUSINESS_CASES){
   const completed=await completeRechent(seed);
   const row={id:RECHENT_ID,selection:completed.selection,survey:{existing_frame_material:'old-material',existing_frame_type:'old-type',fastening_method:'old-method',existing_opening_w1:999,fit_result:'OLD_FAILURE'}};
   const ids=await page.evaluate(async row=>{
    localStorage.removeItem('sash.work-management.v1');
    const {createProductConfigurationSnapshot}=await import('/work-management/domain.mjs');
    const {BrowserStorageDocumentStore}=await import('/work-management/storage.mjs');
    const {createRepositoryBundle}=await import('/work-management/repositories.mjs');
    const {WorkManagementService}=await import('/work-management/service.mjs');
    const products=await(await fetch('/api/runtime-master/integrations')).json();
    const result=await(await fetch('/api/runtime-master/resolve?'+new URLSearchParams({productId:row.id,selection:JSON.stringify(row.selection)}))).json();
    const snapshot=createProductConfigurationSnapshot({product:products.find(p=>p.id===row.id),result});
    snapshot.configuration={...snapshot.configuration,...row.survey,runtime_mode:'SURVEY_LINKED'};delete snapshot.workflow_data;
    snapshot.display_summary.push(...Object.entries(row.survey).map(([key,value])=>({key,label:key,value:String(value)})));
    const service=new WorkManagementService(createRepositoryBundle(new BrowserStorageDocumentStore(localStorage)));
    const {project,estimate}=await service.createProject({project_name:'リシェント見積QA'});
    const opening=await service.createOpening(project.project_id,estimate.estimate_id,{room_name:'玄関',product_configuration_snapshot:snapshot});
    return {project:project.project_id,estimate:estimate.estimate_id,opening:opening.opening_id};
   },row);
   const url=`${BASE}/projects/${ids.project}/estimates/${ids.estimate}/openings/${ids.opening}`;
   await page.goto(url,{waitUntil:'networkidle'});await page.waitForSelector('#dynamicForm[data-resolve-revision]');
   const keys=await page.locator('#dynamicForm .field[data-key]').evaluateAll(nodes=>nodes.map(n=>n.dataset.key));
   assert.equal(keys.some(isSiteSurveyField),false);
   assert.deepEqual(keys,[...keys].sort((a,b)=>ENTRY_DOOR_COVER_PRESENTATION_ORDER.indexOf(a)-ENTRY_DOOR_COVER_PRESENTATION_ORDER.indexOf(b)));
   const thermalOptions=await page.locator('[data-spec-key="thermal_spec"] option').evaluateAll(nodes=>nodes.map(n=>({value:n.value,label:n.textContent.trim()})).filter(row=>row.value));
   assert.deepEqual(thermalOptions.map(row=>row.value),['HIGH_INSULATION','INSULATION_K2','INSULATION_K4','ALUMINUM']);
   assert.deepEqual(thermalOptions.map(row=>row.label),['高断熱仕様','断熱仕様 k2','断熱仕様 k4','アルミ仕様']);
   assert.equal(await page.locator('#warnings .notice.error').count(),0,name);
   assert.equal(await page.locator('#productEditor :invalid').count(),0,name);
   if(name.includes('manual-check'))assert.match(await page.locator('#warnings').innerText(),/第二扉/);
   const changed=await page.locator('#dynamicForm').getAttribute('data-resolve-revision');
   await page.locator('[data-spec-key="handing"]').selectOption('L');
   await page.waitForFunction(old=>document.querySelector('#dynamicForm').dataset.resolveRevision!==old,changed);
   await page.locator('#saveOpening').click();await page.waitForURL(`**/projects/${ids.project}/estimates/${ids.estimate}`);
   await page.goto(url,{waitUntil:'networkidle'});await page.waitForSelector('#dynamicForm[data-resolve-revision]');await page.reload({waitUntil:'networkidle'});await page.waitForSelector('#dynamicForm[data-resolve-revision]');
   const saved=await page.evaluate(()=>window.__sashWorkApp.readDatabase().openings[0]);
   assert.equal(saved.status,'COMPLETE',name);const snapshot=saved.product_configuration_snapshot;
   assert.equal(snapshot.configuration.handing,'L');assert.equal(Object.keys(snapshot.configuration).some(isSiteSurveyField),false);
   assert.deepEqual(Object.values(snapshot.workflow_data.site_survey.contexts)[0].values,row.survey);
   const output=await page.evaluate(async()=>{const {createEstimateOutputModel}=await import('/estimate-output/model.mjs');const db=window.__sashWorkApp.readDatabase();return createEstimateOutputModel({project:db.projects[0],estimate:db.estimates[0],openings:db.openings});});
   assert.notEqual(output.state,'INCOMPLETE',name);assert.notEqual(output.state,'INVALID',name);assert.equal(Object.keys(output.rows[0].configuration).some(isSiteSurveyField),false);assert.equal(output.rows[0].display_summary.some(r=>isSiteSurveyField(r.key)),false);
   if(name.includes('manual-check'))assert.ok(output.rows[0].issues.some(r=>r.code==='HIGH_SIZE_DOUBLE_CHILD_RANGE_UNVERIFIED'));
   const revision=await page.locator('#dynamicForm').getAttribute('data-resolve-revision');
   await page.locator('[data-spec-key="size_w"]').fill('1');await page.locator('[data-spec-key="size_w"]').dispatchEvent('change');
   await page.waitForFunction(old=>document.querySelector('#dynamicForm').dataset.resolveRevision!==old,revision);assert.equal(await page.locator('#warnings .notice.error').count(),1);
   await page.evaluate(()=>window.__sashTheme.setPreference('dark'));assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)<=1);
   if(name==='high-single-manual')await page.screenshot({path:`${OUT}/${device}-dark.png`,fullPage:true});
   if(seed.lock_type==='FAMILOCK'){
    const visibleKeys=await page.locator('#dynamicForm .field[data-key]').evaluateAll(nodes=>nodes.map(n=>n.dataset.key));
    assert.equal(visibleKeys.indexOf('key_set'),visibleKeys.indexOf('lock_type')+1);
    const power=page.locator('[data-spec-key="electric_lock_power"]');
    const powerOptions=await power.locator('option').evaluateAll(nodes=>nodes.map(n=>({value:n.value,label:n.textContent.trim()})).filter(row=>row.value));
    assert.equal(powerOptions.find(row=>row.value==='BATTERY')?.label,'電池式');
    assert.equal(powerOptions.find(row=>row.value==='AC100V')?.label,'AC100V');
    const alternatives=powerOptions.map(row=>row.value);
    const next=alternatives.find(value=>value!==seed.electric_lock_power);
    if(next)await selectAndResolve(page,'electric_lock_power',next);
    const manual=await selectAndResolve(page,'lock_type','MANUAL');
    for(const key of ['electric_lock_power','electric_lock_reader','electric_lock_plan','key_set','additional_key']){
     assert.equal(Object.hasOwn(manual.selection,key),false,key);assert.equal(await page.locator(`[data-spec-key="${key}"]`).count(),0,key);
    }
   }
   if(seed.opening_type!=='SINGLE'){
    const single=await selectAndResolve(page,'opening_type','SINGLE');
    for(const key of ['child_door','sidelight_spec'])assert.equal(Object.hasOwn(single.selection,key),false,key);
   }
   const nextThermal=seed.thermal_spec==='HIGH_INSULATION'?'ALUMINUM':'HIGH_INSULATION';
   const thermal=await selectAndResolve(page,'thermal_spec',nextThermal);
   assert.equal(Object.hasOwn(thermal.selection,'design'),false);
   if(nextThermal==='HIGH_INSULATION')assert.equal(Object.hasOwn(thermal.selection,'threshold_flat_material'),false);
   report.cases.push({name,device,selection:'PASS',presentation:'PASS',legacyMigration:'PASS',saveReload:'PASS',handoff:'PASS',invalidDimension:'PASS',dark:'PASS',upstreamReset:'PASS'});
  }
  await context.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedResponses,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.failure=e.stack;throw e;}
finally{await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({status:report.status,cases:report.cases.length,failure:report.failure}));}
