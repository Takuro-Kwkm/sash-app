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
const sourceDocument=JSON.parse(fs.readFileSync(path.join(path.dirname(preview.candidate_index.path),'candidate.json')));
const report={...scope,status:'RUNNING',execution_surface:'BROWSER',mapping_sha256:hash(fs.readFileSync(path.join(inputRoot,'mapping.json'))),preview_sha256:hash(fs.readFileSync(path.join(inputRoot,'preview.json'))),ui_files_sha256:hash(JSON.stringify(uiFiles.map(r=>r.sha256).sort())),environment:{playwright:options.playwright_module,node:process.version,base_url:preview.url},viewports:[1360,390],fields:[],states:[],image_observations:[],transitions:{status:'RUNNING',cases:0},checks:Object.fromEntries(['MASTER_PROJECTION','FLOW_ORDER','CONTROL_AND_VALUES','BRANCH_VISIBILITY','KEEP_VALID','CLEAR_INVALID','RESTORE','HANDOFF'].map(k=>[k,{status:'RUNNING',executed_cases:0}])),console_errors:[],page_errors:[],http_errors:[]};
const count=(name,n=1)=>{report.checks[name].executed_cases+=n;};
const browser=await chromium.launch({headless:true});
try{
 for(const width of report.viewports){
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage();
  page.on('pageerror',e=>report.page_errors.push(e.message));page.on('console',e=>{if(e.type()==='error')report.console_errors.push(e.text());});page.on('response',r=>{if(r.status()>=400)report.http_errors.push({url:r.url(),status:r.status()});});
  await page.goto(preview.url,{waitUntil:'networkidle'});await page.waitForSelector('[data-spec-key="window_type"]');
  async function restore(input,userRequirements){
   return page.evaluate(async({input,id,userRequirements})=>{
    const {ProductConfigurationEditor}=await import('/product-configuration-editor.mjs');
    window.__rowTableTestEditor?.destroy();
    const integrations=await (await fetch('/api/runtime-master/integrations')).json(),product=integrations.find(p=>p.id===id);
    const snapshot={...(userRequirements?{user_requirements:userRequirements}:{}),product_id:id,configuration:input,package_version:product.packageVersion,runtime_manifest_identity:product.canonicalRuntimeReference.runtimeManifestDriveFileId};
    const replacement=document.createElement('div');replacement.id='runtimeLab';document.querySelector('#runtimeLab').replaceWith(replacement);
    const editor=new ProductConfigurationEditor(replacement,{initialSnapshot:snapshot});window.__rowTableTestEditor=editor;await editor.mount();
    return {result:editor.state.resolved,snapshot:editor.getSnapshot()};
   },{input,id:scope.product_id,userRequirements});
  }
  for(const state of plan.cases){
   const loaded=await restore(state.input),result=loaded.result;assert.ok(result.candidateOnly);assert.equal(result.formalAdoption,false);assert.equal(result.automaticOrderability,false);count('MASTER_PROJECTION');
   const fields=await page.locator('#dynamicForm [data-spec-key],[data-user-requirements-section] [data-workflow-control]').evaluateAll(elements=>elements.map(e=>({field_id:e.dataset.specKey??'__workflow.'+e.dataset.workflowControl,stage:e.dataset.semanticStage,role:e.dataset.readOnly==='true'?'DERIVED':'SELECTOR',label:e.dataset.label,visible:e.getClientRects().length>0,required:e.hasAttribute('required'),control:e.dataset.workflowControl==='special_specification_requested'?'checkbox-group':e.tagName==='TEXTAREA'?'textarea':e.tagName==='OUTPUT'?'output':e.type==='number'?'number':e.multiple?'checkbox-group':'select',candidate_values:e.dataset.workflowControl==='special_specification_requested'?[true]:e.tagName==='SELECT'?[...e.options].filter(o=>o.value).map(o=>o.value):[]})));
   for(const f of fields){if(f.control==='output'){const value=result.selection[f.field_id];f.candidate_values=value===undefined?[]:[value];const native=result.fields.find(r=>r.key===f.field_id);const label=native.dataType==='NUMBER'?String(value??'寸法の入力後に表示'):native.values.find(v=>v.value===value)?.displayLabel??'本体色の選択後に表示';assert.equal(await page.locator(`output[data-spec-key="${f.field_id}"]`).innerText(),label);}}
   const stages=['PRODUCT','OPENING','CONFIGURATION','SIZE','FINISH','SCREEN','GLAZING','INSTALLATION_SURVEY','OPTION'];let last=-1;for(const field of fields){const i=stages.indexOf(field.stage);assert.ok(i>=last&&i>=0);last=i;}count('FLOW_ORDER',fields.length);
   assert.equal(new Set(fields.map(f=>f.field_id)).size,fields.length);count('CONTROL_AND_VALUES',fields.length);
   const warningText=await page.locator('#warnings').innerText();assert.doesNotMatch(warningText,/元マスター|適用条件が未定義/);
   const sizeLabels=await page.locator('select[data-spec-key="standard_size"] option').allTextContents();
   if(sizeLabels.length){assert.match(sizeLabels.at(-1),/特注サイズ/);const codes=sizeLabels.slice(1,-1).map(v=>v.split(' ｜ ')[0]);for(let i=1;i<codes.length;i++){const a=codes[i-1],b=codes[i];assert.ok(Number(a.slice(0,3))<Number(b.slice(0,3))||Number(a.slice(0,3))===Number(b.slice(0,3))&&Number(a.slice(3,5))<=Number(b.slice(3,5)),'size order '+a+' -> '+b);}}
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
   assert.equal(await page.locator('#dynamicForm img').count(),0,'images must be absent by default');
   for(const field_id of [...new Set(targets.map(t=>t.field_id))]){
    const beforePreview=JSON.stringify(await page.evaluate(()=>window.__rowTableTestEditor.getSnapshot()));
    const trigger=page.locator(`[data-image-preview-field="${field_id}"]`);await trigger.click();const dialog=page.locator('dialog[data-choice-image-preview][open]');await dialog.waitFor({state:'visible'});
    await dialog.locator('img').evaluateAll(es=>Promise.all(es.map(img=>img.decode())));
    assert.equal(await dialog.evaluate(e=>e.matches(':modal')),true);
    const observations=await page.evaluate(observeChoiceImages,{targets:targets.filter(t=>t.field_id===field_id),state_id:state.id});assert.ok(observations.every(r=>r.loaded&&r.visible&&r.image_sha256));report.image_observations.push(...observations);
    await page.locator('[data-image-preview-close]').click();await page.locator('dialog[data-choice-image-preview]').waitFor({state:'detached'});assert.equal(await page.locator('dialog[data-choice-image-preview]').count(),0);assert.equal(await page.locator('#dynamicForm img').count(),0);
    assert.equal(await trigger.evaluate(e=>document.activeElement===e),true);assert.equal(JSON.stringify(await page.evaluate(()=>window.__rowTableTestEditor.getSnapshot())),beforePreview);count('KEEP_VALID');
   }
   assert.deepEqual(loaded.snapshot.configuration,result.selection);assert.ok(loaded.snapshot.confirmation_requests.length>=13);assert.ok(loaded.snapshot.confirmation_requests.every(r=>r.message));count('HANDOFF');count('RESTORE');report.transitions.cases++;
   if(['PRIMARY','SHUTTER','FIX'].includes(state.id))await page.screenshot({path:path.join(out,`${state.id.toLowerCase()}-${width}.png`),fullPage:true});
   report.states.push({id:state.id,viewport:width,status:'PASS',field_ids:fields.map(f=>f.field_id),validation_status:result.validation.status});
  }
  const before=await restore(plan.cases.find(c=>c.id==='PRIMARY').input);
  const revision=await page.locator('#dynamicForm').getAttribute('data-resolve-revision');
  await page.selectOption('[data-spec-key="window_type"]','WT-SA-FIX-IN');
  await page.waitForFunction(previous=>Number(document.querySelector('#dynamicForm').dataset.resolveRevision)>Number(previous)&&document.querySelector('#dynamicForm').dataset.resolveRevision===String(window.__rowTableTestEditor.state.resolveRevision)&&window.__rowTableTestEditor.state.resolved?.selection.window_type==='WT-SA-FIX-IN',revision);
  const after=await page.evaluate(()=>({result:window.__rowTableTestEditor.state.resolved,snapshot:window.__rowTableTestEditor.getSnapshot()}));
  assert.equal(after.result.selection.screen_type,undefined);assert.equal(await page.locator('[data-spec-key="screen_type"]').count(),0);count('CLEAR_INVALID');
  assert.equal(after.result.selection.color_combination,before.result.selection.color_combination);count('KEEP_VALID');
  assert.ok(after.snapshot.confirmation_requests.length>=13);count('HANDOFF');report.transitions.cases++;
  // Native selection stays the input control; image previews never change values.
  const colorRevision=await page.locator('#dynamicForm').getAttribute('data-resolve-revision');
  await page.selectOption('[data-spec-key="color_combination"]','SA-COLOR-WHITE');
  await page.waitForFunction(previous=>Number(document.querySelector('#dynamicForm').dataset.resolveRevision)>Number(previous)&&document.querySelector('#dynamicForm').dataset.resolveRevision===String(window.__rowTableTestEditor.state.resolveRevision)&&window.__rowTableTestEditor.state.resolved?.selection.color_combination==='SA-COLOR-WHITE',colorRevision);
  assert.equal(await page.locator('[data-spec-key="color_combination"]').inputValue(),'SA-COLOR-WHITE');count('CONTROL_AND_VALUES');report.transitions.cases++;
  const colored=await page.evaluate(()=>window.__rowTableTestEditor.state.resolved);
  assert.equal(colored.selection.exterior_color,'white');assert.equal(colored.selection.interior_color,'white');assert.notEqual(colored.validation.status,'INVALID');count('MASTER_PROJECTION');
  const sourceSize=sourceDocument.master.size_master.find(row=>row.window_type_id==='WT-SA-FIX-IN'&&row.construction_module==='zairai'&&row.opening_class==='window'&&(row.width!==1200||row.height!==1000));
  const sizeRevision=await page.locator('#dynamicForm').getAttribute('data-resolve-revision');
  const viewCode=[sourceSize.size_code.replace(/-[24]$/,''),sourceSize.width,sourceSize.height,sourceSize.opening_class].join(':');
  await page.selectOption('[data-spec-key="standard_size"]',viewCode);
  await page.waitForFunction(previous=>Number(document.querySelector('#dynamicForm').dataset.resolveRevision)>Number(previous)&&document.querySelector('#dynamicForm').dataset.resolveRevision===String(window.__rowTableTestEditor.state.resolveRevision),sizeRevision);
  const sized=await page.evaluate(()=>window.__rowTableTestEditor.state.resolved);
  assert.equal(sized.selection.width,sourceSize.width);assert.equal(sized.selection.height,sourceSize.height);assert.notEqual(sized.validation.status,'INVALID');assert.ok(!sized.fields.some(f=>f.key==='width'||f.key==='height'||f.key==='opening_class'));
  assert.equal(await page.locator('[data-spec-key="width"]:visible').count(),0);count('MASTER_PROJECTION');count('CONTROL_AND_VALUES');report.transitions.cases++;
  await page.locator('[data-special-specification-request]').check();
  await page.locator('textarea[data-workflow-control="user_requirements"]').fill('西日の対策について相談したい');
  await page.locator('textarea[data-workflow-control="user_requirements"]').dispatchEvent('change');
  const requested=await page.evaluate(()=>window.__rowTableTestEditor.getSnapshot());
  assert.equal(requested.user_requirements.special_specification_requested,true);assert.equal(requested.user_requirements.text,'西日の対策について相談したい');
  assert.equal(requested.configuration.user_requirements,undefined);assert.equal(requested.confirmation_requests.filter(r=>r.kind==='USER_REQUIREMENT').length,2);
  const restored=await restore(requested.configuration,requested.user_requirements);
  assert.ok(await page.locator('[data-special-specification-request]').isChecked());assert.equal(await page.locator('textarea[data-workflow-control="user_requirements"]').inputValue(),requested.user_requirements.text);
  assert.deepEqual(restored.snapshot.user_requirements,requested.user_requirements);count('RESTORE');count('HANDOFF');count('CONTROL_AND_VALUES');report.transitions.cases++;
  const windowRevision=await page.locator('#dynamicForm').getAttribute('data-resolve-revision');
  await page.selectOption('[data-spec-key="window_type"]','WT-SA-TATE-SUBERI');
  await page.waitForFunction(previous=>Number(document.querySelector('#dynamicForm').dataset.resolveRevision)>Number(previous)&&document.querySelector('#dynamicForm').dataset.resolveRevision===String(window.__rowTableTestEditor.state.resolveRevision),windowRevision);
  const assigned=await page.evaluate(()=>({result:window.__rowTableTestEditor.state.resolved,snapshot:window.__rowTableTestEditor.getSnapshot()}));
  assert.equal(assigned.result.selection.configuration_type,'T');assert.equal(assigned.result.selection.handle_type,'cam_latch');assert.ok(!assigned.result.clearedFields.includes('handle_type'));assert.deepEqual(assigned.snapshot.user_requirements,requested.user_requirements);
  count('BRANCH_VISIBILITY');count('KEEP_VALID');count('HANDOFF');report.transitions.cases++;
  async function change(key,value){const revision=await page.locator('#dynamicForm').getAttribute('data-resolve-revision');const control=page.locator(`[data-spec-key="${key}"]`);if(await control.evaluate(e=>e.tagName==='SELECT'))await control.selectOption(value);else{await control.fill(String(value));await control.dispatchEvent('change');}await page.waitForFunction(previous=>Number(document.querySelector('#dynamicForm').dataset.resolveRevision)>Number(previous)&&document.querySelector('#dynamicForm').dataset.resolveRevision===String(window.__rowTableTestEditor.state.resolveRevision),revision);return page.evaluate(()=>window.__rowTableTestEditor.state.resolved);}
  await restore(plan.cases.find(c=>c.id==='PRIMARY').input);
  let edited=await change('standard_size','25118:2550:1830:terrace');
  assert.deepEqual(edited.fields.find(f=>f.key==='panel_count').values.map(v=>v.value),['2','4']);
  edited=await change('panel_count','4');assert.equal(edited.selection.size_code,'25118-4');assert.equal(edited.selection.width,2550);assert.equal(edited.selection.height,1830);
  for(const key of ['width','height','opening_class','size_code'])assert.equal(await page.locator(`[data-spec-key="${key}"]`).count(),0);
  assert.deepEqual(edited.fields.slice(0,4).map(f=>f.key),['window_type','construction_module','panel_count','standard_size']);count('CONTROL_AND_VALUES');count('MASTER_PROJECTION');report.transitions.cases++;
  const standardSaved=await page.evaluate(()=>window.__rowTableTestEditor.getSnapshot());await restore(standardSaved.configuration);assert.equal(await page.locator('[data-spec-key="panel_count"]').inputValue(),'4');count('RESTORE');
  edited=await change('standard_size','CUSTOM');assert.equal(edited.selection.width,undefined);assert.equal(edited.selection.size_code,undefined);assert.equal(await page.locator('[data-spec-key="width"]').count(),1);
  edited=await change('panel_count','2');await change('width','1200');edited=await change('height','1000');assert.equal(edited.selection.opening_class,'window');assert.equal(edited.dimensionResult.status,'PASS');count('BRANCH_VISIBILITY');count('CLEAR_INVALID');report.transitions.cases++;
  const functionRevision=await page.locator('#dynamicForm').getAttribute('data-resolve-revision');await page.locator('[data-multi-key="glazing_functions"] input[value="BLIND"]').check();await page.waitForFunction(previous=>Number(document.querySelector('#dynamicForm').dataset.resolveRevision)>Number(previous)&&document.querySelector('#dynamicForm').dataset.resolveRevision===String(window.__rowTableTestEditor.state.resolveRevision),functionRevision);
  edited=await change('window_type','WT-SA-YOKO-SUBERI');assert.deepEqual(edited.fields.find(f=>f.key==='screen_type').values.map(v=>v.value),['horizontal_roll_screen','casement_screen']);assert.ok(!edited.selection.glazing_functions.includes('BLIND'));assert.equal(edited.selection.color_combination,'SA-COLOR-BLACK');count('CLEAR_INVALID');count('KEEP_VALID');report.transitions.cases++;
  edited=await change('glazing_base','GENERAL');assert.equal(edited.selection.glazing_performance,undefined);assert.equal(edited.selection.glazing_gas,undefined);assert.equal(await page.locator('[data-spec-key="glazing_performance"]').count(),0);assert.deepEqual(edited.fields.find(f=>f.key==='glazing_gas').values.map(v=>v.value),['AIR']);count('CLEAR_INVALID');count('BRANCH_VISIBILITY');report.transitions.cases++;
  await change('glazing_gas','AIR');await change('glazing_appearance','FROSTED');
  const glazingSaved=await page.evaluate(()=>window.__rowTableTestEditor.getSnapshot());assert.equal(glazingSaved.configuration.glazing_appearance,'FROSTED');assert.match(await page.locator('#warnings').innerText(),/組合せ可否/);assert.ok(glazingSaved.confirmation_requests.some(r=>r.code==='SOURCE_GLAZING_COMBINATION_CONFIRMATION'));await restore(glazingSaved.configuration);assert.equal(await page.locator('[data-spec-key="glazing_appearance"]').inputValue(),'FROSTED');count('RESTORE');count('HANDOFF');report.transitions.cases++;
  await restore(plan.cases.find(c=>c.id==='PRIMARY').input);
  edited=await change('standard_size','');for(const key of ['standard_size','size_code','width','height'])assert.equal(edited.selection[key],undefined);assert.equal(await page.locator('[data-spec-key="width"]').count(),0);count('CLEAR_INVALID');report.transitions.cases++;
  await change('standard_size','CUSTOM');await change('panel_count','2');await change('width','1200');await change('height','1000');edited=await change('standard_size','');assert.equal(edited.selection.width,undefined);assert.equal(await page.locator('[data-spec-key="width"]').count(),0);count('CLEAR_INVALID');count('BRANCH_VISIBILITY');report.transitions.cases++;
  await change('window_type','WT-SA-YOKO-SUBERI');await change('screen_type','horizontal_roll_screen');edited=await change('screen_mesh_type','mushiya_net');assert.equal(edited.selection.screen_mesh_type,'mushiya_net');assert.match(await page.locator('#warnings').innerText(),/特注対応/);assert.ok(edited.confirmationRequests.some(r=>r.code==='SPECIAL_ORDER_SCREEN_NET'));const netSaved=await page.evaluate(()=>window.__rowTableTestEditor.getSnapshot());await restore(netSaved.configuration);assert.equal(await page.locator('[data-spec-key="screen_mesh_type"]').inputValue(),'mushiya_net');count('RESTORE');count('HANDOFF');count('CONTROL_AND_VALUES');report.transitions.cases++;
  await page.emulateMedia({colorScheme:'dark'});await page.reload({waitUntil:'networkidle'});await page.waitForSelector('[data-spec-key="window_type"]');await restore(plan.cases.find(c=>c.id==='PRIMARY').input);
  assert.equal(await page.locator('#dynamicForm img').count(),0);
  const readability=[];
  for(const key of ['window_type','glazing_appearance','glazing_performance','glazing_functions']){
   await page.locator(`[data-image-preview-field="${key}"]`).click();await page.locator('dialog[open]').waitFor({state:'visible'});
   const cards=await page.locator('dialog[open] .runtime-choice-image').evaluateAll(cards=>cards.map(card=>{const text=card.querySelector('figcaption strong');return {field:card.querySelector('img')?.dataset.field,label:text?.textContent,color:getComputedStyle(text??card).color,background:getComputedStyle(card).backgroundColor};}));readability.push(...cards);
   if(key==='glazing_appearance')await page.screenshot({path:path.join(out,`image-modal-dark-${width}.png`),fullPage:false});
   await page.keyboard.press('Escape');await page.locator('dialog[data-choice-image-preview]').waitFor({state:'detached'});assert.equal(await page.locator('dialog[data-choice-image-preview]').count(),0);count('KEEP_VALID');
  }
  const luminance=color=>{const channels=color.match(/[\d.]+/g).slice(0,3).map(v=>Number(v)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];};
  for(const row of readability){const a=luminance(row.color),b=luminance(row.background);row.contrast=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);assert.ok(row.contrast>=4.5,`unreadable dark choice ${row.label}: ${row.contrast}`);}
  (report.readability??=[]).push({viewport:width,scheme:'dark',status:'PASS',observations:readability});report.states.push({id:'DARK_READABILITY',viewport:width,status:'PASS'});count('CONTROL_AND_VALUES',readability.length);report.transitions.cases++;
  await page.screenshot({path:path.join(out,`dark-${width}.png`),fullPage:true});
  await page.emulateMedia({colorScheme:'light'});await page.reload({waitUntil:'networkidle'});await page.waitForSelector('[data-spec-key="window_type"]');await restore(plan.cases.find(c=>c.id==='PRIMARY').input);
  await page.locator('[data-spec-key="standard_size"]').click();await page.screenshot({path:path.join(out,`size-order-${width}.png`),fullPage:false});await page.keyboard.press('Escape');
  await context.close();
 }
 report.fields.sort((a,b)=>expected.fields.findIndex(f=>f.field_id===a.field_id)-expected.fields.findIndex(f=>f.field_id===b.field_id));
 assert.equal(report.fields.length,expected.fields.filter(f=>['SELECTOR','DERIVED'].includes(f.role)).length);
 assert.deepEqual(report.console_errors,[]);assert.deepEqual(report.page_errors,[]);assert.deepEqual(report.http_errors,[]);
 for(const row of Object.values(report.checks)){assert.ok(row.executed_cases>0);row.status='PASS';}report.transitions.status='PASS';report.status='PASS';
 console.log(JSON.stringify({status:report.status,states:report.states.length,fields:report.fields.length,image_observations:report.image_observations.length,transitions:report.transitions.cases}));
}catch(e){report.status='FAIL';report.failure={message:e.message,stack:e.stack};console.error(e.stack);process.exitCode=1;}finally{await browser.close();const payload=JSON.stringify(report,null,2)+'\n';fs.writeFileSync(path.join(out,'browser-report.json'),payload);console.log(JSON.stringify({status:report.status,browser_report_sha256:hash(payload)}));}
