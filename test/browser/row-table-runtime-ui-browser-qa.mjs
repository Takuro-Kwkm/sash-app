// Existing native Browser QA, isolated localhost context; no account/profile access.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const options=JSON.parse(fs.readFileSync(process.argv[2]));
const {chromium}=await import(options.playwright_module);
const {observeChoiceImages}=await import(options.image_observer);
const inputRoot=path.resolve(options.input_root),out=path.resolve(options.output);
if(fs.existsSync(out))throw new Error('BROWSER_OUTPUT_EXISTS');fs.mkdirSync(out,{recursive:true});
const read=n=>JSON.parse(fs.readFileSync(path.join(inputRoot,n))),expected=read('expected-inventory.json'),plan=read('case-plan.json'),preview=read('preview.json'),uiFiles=read('ui-files.json'),mapping=read('mapping.json'),images=read('image-inventory.json');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),scope={repository:expected.repository,product_id:expected.product_id,master_sha256:expected.master_sha256,flow_sha256:expected.flow_sha256};
const report={...scope,status:'RUNNING',execution_surface:'BROWSER',mapping_sha256:hash(fs.readFileSync(path.join(inputRoot,'mapping.json'))),preview_sha256:hash(fs.readFileSync(path.join(inputRoot,'preview.json'))),ui_files_sha256:hash(JSON.stringify(uiFiles.map(r=>r.sha256).sort())),environment:{playwright:options.playwright_module,node:process.version,base_url:preview.url},viewports:[1360,390],fields:[],states:[],image_observations:[],transitions:{status:'RUNNING',cases:0},checks:Object.fromEntries(['MASTER_PROJECTION','FLOW_ORDER','CONTROL_AND_VALUES','BRANCH_VISIBILITY','KEEP_VALID','CLEAR_INVALID','RESTORE','HANDOFF'].map(k=>[k,{status:'RUNNING',executed_cases:0}])),console_errors:[],page_errors:[],http_errors:[]};
const count=(name,n=1)=>{report.checks[name].executed_cases+=n;};
const browser=await chromium.launch({headless:true});
try{
 for(const width of report.viewports){
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage();
  page.on('pageerror',e=>report.page_errors.push(e.message));page.on('console',e=>{if(e.type()==='error')report.console_errors.push(e.text());});page.on('response',r=>{if(r.status()>=400)report.http_errors.push({url:r.url(),status:r.status()});});
  await page.goto(preview.url,{waitUntil:'networkidle'});await page.waitForSelector('[data-spec-key="window_type"]');
  async function restore(input){
   return page.evaluate(async({input,id})=>{
    const {ProductConfigurationEditor}=await import('/product-configuration-editor.mjs');
    window.__rowTableTestEditor?.destroy();
    const integrations=await (await fetch('/api/runtime-master/integrations')).json(),product=integrations.find(p=>p.id===id);
    const snapshot={product_id:id,configuration:input,package_version:product.packageVersion,runtime_manifest_identity:product.canonicalRuntimeReference.runtimeManifestDriveFileId};
    const editor=new ProductConfigurationEditor(document.querySelector('#runtimeLab'),{initialSnapshot:snapshot});window.__rowTableTestEditor=editor;await editor.mount();
    return {result:editor.state.resolved,snapshot:editor.getSnapshot()};
   },{input,id:scope.product_id});
  }
  for(const state of plan.cases){
   const loaded=await restore(state.input),result=loaded.result;assert.ok(result.candidateOnly);assert.equal(result.formalAdoption,false);assert.equal(result.automaticOrderability,false);count('MASTER_PROJECTION');
   const fields=await page.locator('#dynamicForm [data-spec-key]').evaluateAll(elements=>elements.map(e=>({field_id:e.dataset.specKey,stage:e.dataset.semanticStage,role:e.dataset.readOnly==='true'?'DERIVED':'SELECTOR',label:e.dataset.label,visible:e.getClientRects().length>0,required:e.hasAttribute('required'),control:e.tagName==='OUTPUT'?'output':e.type==='number'?'number':e.multiple?'checkbox-group':'select',candidate_values:e.tagName==='SELECT'?[...e.options].filter(o=>o.value).map(o=>o.value):[]})));
   for(const f of fields){if(f.control==='output'){const value=result.selection[f.field_id];f.candidate_values=value===undefined?[]:[value];const native=result.fields.find(r=>r.key===f.field_id);const label=native.dataType==='NUMBER'?String(value??'寸法の入力後に表示'):native.values.find(v=>v.value===value)?.displayLabel??'本体色の選択後に表示';assert.equal(await page.locator(`output[data-spec-key="${f.field_id}"]`).innerText(),label);}}
   const stages=['PRODUCT','OPENING','CONFIGURATION','SIZE','FINISH','SCREEN','GLAZING','INSTALLATION_SURVEY','OPTION'];let last=-1;for(const field of fields){const i=stages.indexOf(field.stage);assert.ok(i>=last&&i>=0);last=i;}count('FLOW_ORDER',fields.length);
   assert.equal(new Set(fields.map(f=>f.field_id)).size,fields.length);count('CONTROL_AND_VALUES',fields.length);
   const body=await page.locator('#dynamicForm').innerText();assert.doesNotMatch(body,/NOT_APPLICABLE|INTERNAL_UNKNOWN_ENUM|dedicated_double_glazing|with_middle_bar|fixed_screen_inner_tilt/);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);assert.ok(overflow<=1,'horizontal overflow '+overflow);
   for(const target of expected.fields.filter(f=>['SELECTOR','DERIVED'].includes(f.role)&&f.state_id===state.id)){
    const observed=fields.find(f=>f.field_id===target.field_id);assert.ok(observed,`${state.id}: missing ${target.field_id}`);
    for(const key of ['stage','role','label','visible','required','control','candidate_values'])assert.deepEqual(observed[key],target[key],`${state.id}: ${target.field_id}:${key}`);
    if(width===1360)report.fields.push(observed);
   }
   if(state.id==='FIX'||state.id==='OUTER'){assert.ok(!fields.some(f=>f.field_id==='screen_type'));count('BRANCH_VISIBILITY');}
   const targets=[];
   for(const field of expected.fields){const imageCase=field.image_cases?.find(c=>c.state_id===state.id);if(!imageCase)continue;for(const value of imageCase.candidate_values)targets.push({field_id:field.field_id,value,selector:`img[data-field="${field.field_id}"][data-value="${value}"]`});}
   if(targets.length){const observations=await page.evaluate(observeChoiceImages,{targets,state_id:state.id});assert.ok(observations.every(r=>r.loaded&&r.visible&&r.image_sha256));report.image_observations.push(...observations);}
   assert.deepEqual(loaded.snapshot.configuration,result.selection);assert.ok(loaded.snapshot.confirmation_requests.length>=13);assert.ok(loaded.snapshot.confirmation_requests.every(r=>r.message));count('HANDOFF');count('RESTORE');report.transitions.cases++;
   if(['PRIMARY','SHUTTER','FIX'].includes(state.id))await page.screenshot({path:path.join(out,`${state.id.toLowerCase()}-${width}.png`),fullPage:true});
   report.states.push({id:state.id,viewport:width,status:'PASS',field_ids:fields.map(f=>f.field_id),validation_status:result.validation.status});
  }
  const before=await restore(plan.cases.find(c=>c.id==='PRIMARY').input);
  await page.selectOption('[data-spec-key="window_type"]','WT-SA-FIX-IN');
  await page.waitForFunction(()=>window.__rowTableTestEditor.state.resolved?.selection.window_type==='WT-SA-FIX-IN');
  const after=await page.evaluate(()=>({result:window.__rowTableTestEditor.state.resolved,snapshot:window.__rowTableTestEditor.getSnapshot()}));
  assert.equal(after.result.selection.screen_type,undefined);assert.equal(await page.locator('[data-spec-key="screen_type"]').count(),0);count('CLEAR_INVALID');
  assert.equal(after.result.selection.color_combination,before.result.selection.color_combination);count('KEEP_VALID');
  assert.equal(after.snapshot.confirmation_requests.length,13);count('HANDOFF');report.transitions.cases++;
  // Exercise the actual image-button selection event, then the scalar control.
  await page.locator('[data-image-choice-field="color_combination"][data-image-choice-value="SA-COLOR-WHITE"]').click();
  await page.waitForFunction(()=>window.__rowTableTestEditor.state.resolved?.selection.color_combination==='SA-COLOR-WHITE');
  assert.equal(await page.locator('[data-spec-key="color_combination"]').inputValue(),'SA-COLOR-WHITE');count('CONTROL_AND_VALUES');report.transitions.cases++;
  await context.close();
 }
 report.fields.sort((a,b)=>expected.fields.findIndex(f=>f.field_id===a.field_id)-expected.fields.findIndex(f=>f.field_id===b.field_id));
 assert.equal(report.fields.length,expected.fields.filter(f=>['SELECTOR','DERIVED'].includes(f.role)).length);
 assert.deepEqual(report.console_errors,[]);assert.deepEqual(report.page_errors,[]);assert.deepEqual(report.http_errors,[]);
 for(const row of Object.values(report.checks)){assert.ok(row.executed_cases>0);row.status='PASS';}report.transitions.status='PASS';report.status='PASS';
 console.log(JSON.stringify({status:report.status,states:report.states.length,fields:report.fields.length,image_observations:report.image_observations.length,transitions:report.transitions.cases}));
}catch(e){report.status='FAIL';report.failure={message:e.message,stack:e.stack};console.error(e.stack);process.exitCode=1;}finally{await browser.close();fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2)+'\n');}
