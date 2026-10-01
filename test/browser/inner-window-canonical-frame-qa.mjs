import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createEstimateOutputModel} from '../../src/estimate-output/model.mjs';
const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4173',OUT='artifacts/inner-window-canonical-frame';
const common=['frame_spec','upper_frame_spec','lower_frame_spec','fukashi_presence','fukashi_sides','fukashi_depth','fukashi_reinforcement'];
const legacy=['frame_install_spec','fukashi_spec','frame_installation_mode','bottom_rail_type','extension_frame_type','extension_frame_reinforcement','bathroom_installation_type'];
const specs=[{id:'SER-LIXIL-INPLUS',seed:{window_type:'引違い窓',sash_configuration:'2枚建',size_mode:'CUSTOM',order_width:1000,order_height:1000,glass_family:'単板',body_color:'COL-W',frame_spec:'standard',upper_frame_spec:'standard',lower_frame_spec:'general',fukashi_presence:'present',fukashi_sides:'three_side',fukashi_depth:'50',fukashi_reinforcement:'reinforced_50_small'},changes:[['fukashi_presence','none',['fukashi_depth','fukashi_reinforcement','fukashi_sides']],['fukashi_depth','20',['fukashi_reinforcement']],['upper_frame_spec','adjust_upper_frame',['fukashi_depth']],['frame_spec','frame_projection',[]],['window_type','FIX窓',['upper_frame_spec','lower_frame_spec']]]},{id:'SER-YKKAP-UCHIRIMO',seed:{room_specification:'residential',window_type:'sliding_window',sash_configuration:'two_panel',size_w:1000,size_h:1000,glass_family:'insulating_glass',frame_color:'white',frame_spec:'standard',lower_frame_spec:'standard',fukashi_presence:'present',fukashi_sides:'three_side',fukashi_depth:'60',fukashi_reinforcement:'reinforcement_square_pipe'},changes:[['fukashi_presence','none',['fukashi_depth','fukashi_reinforcement','fukashi_sides']],['fukashi_depth','25',['fukashi_reinforcement']],['frame_spec','frame_projection',['fukashi_depth','fukashi_reinforcement']],['room_specification','bathroom',['fukashi_depth','fukashi_reinforcement','fukashi_sides']],['window_type','fix_window',['lower_frame_spec']]]}];
await mkdir(OUT,{recursive:true});
const report={status:'RUNNING',exactHead:process.env.GITHUB_SHA??null,cases:[],apiDomMismatch:0,staleValues:0,errors:[]};
const browser=await chromium.launch();

async function assertCheckboxFinalOption(page, product, width, state) {
 const proof=await page.evaluate(({wKey,hKey})=>{
  const form=document.querySelector('#dynamicForm');
  const optionKeys=new Set(window.frameEditor.state.resolved.fields.filter(f=>f.semanticStage==='OPTION').map(f=>f.key));
  const visible=node=>node&&node.getClientRects().length>0;
  const nodes=[...form.querySelectorAll('[data-spec-key]:not(.multi-enum-native-control), [data-multi-key]')].filter(visible);
  const keys=nodes.map(n=>n.dataset.specKey??n.dataset.multiKey);
  const checkbox=form.querySelector('[data-multi-key="option_items"]');
  const w=form.querySelector(`[data-key="${wKey}"]`),h=form.querySelector(`[data-key="${hKey}"]`);
  const dropdowns=nodes.filter(n=>n.tagName==='SELECT'&&optionKeys.has(n.dataset.specKey));
  const before=(a,b)=>Boolean(a&&b&&(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING));
  const between=dropdowns.filter(n=>before(checkbox,n)&&before(n,w)).map(n=>n.dataset.specKey);
  const afterCheckbox=dropdowns.filter(n=>before(checkbox,n)).map(n=>n.dataset.specKey);
  const rect=node=>{const r=node.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left};};
  const last=dropdowns.at(-1);
  const positions=nodes.filter(n=>n.tagName==='INPUT'&&/position.*(?:mm|_p_mm)$/.test(n.dataset.specKey));
  return {domOrder:keys,dropdownOptionKeys:dropdowns.map(n=>n.dataset.specKey),betweenCheckboxAndDimension:between,
   optionDropdownsAfterCheckbox:afterCheckbox,
   lastDropdownOptionIndex:keys.indexOf(last?.dataset.specKey),checkboxIndex:keys.indexOf('option_items'),widthIndex:keys.indexOf(wKey),heightIndex:keys.indexOf(hKey),
   checkboxVisible:visible(checkbox),domOrderCorrect:dropdowns.length>0&&before(last,checkbox)&&before(checkbox,w)&&before(w,h),
   visualOrderCorrect:dropdowns.length>0&&rect(last).bottom<=rect(checkbox).top&&rect(checkbox).bottom<=rect(w).top&&rect(w).bottom<=rect(h).top,
   positionFieldsAfterHeight:positions.every(n=>before(h,n)&&rect(h).bottom<=rect(n).top),
   rects:{lastDropdown:rect(last),checkbox:rect(checkbox),width:rect(w),height:rect(h)},positionKeys:positions.map(n=>n.dataset.specKey)};
 },product==='SER-LIXIL-INPLUS'?{wKey:'order_width',hKey:'order_height'}:{wKey:'size_w',hKey:'size_h'});
 assert.equal(proof.checkboxVisible,true);
 assert.ok(proof.lastDropdownOptionIndex<proof.checkboxIndex);
 assert.ok(proof.checkboxIndex<proof.widthIndex&&proof.widthIndex<proof.heightIndex);
 assert.deepEqual(proof.betweenCheckboxAndDimension,[]);
 assert.deepEqual(proof.optionDropdownsAfterCheckbox,[]);
 assert.equal(proof.domOrderCorrect,true);
 assert.equal(proof.visualOrderCorrect,true);
 assert.equal(proof.positionFieldsAfterHeight,true);
 report.cases.push({width,product,transition:'checkbox-final-option',state,proof,status:'PASS'});
 if(width===1440&&state==='custom-positions'){
  await page.locator('[data-semantic-group="OPTION"]').scrollIntoViewIfNeeded();
  await page.screenshot({path:`${OUT}/${product}-checkbox-final-desktop.png`,fullPage:true});
 }
 return proof;
}

try{
for(const width of [1440,768,390]){
 const page=await browser.newPage({viewport:{width,height:1000}});page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.goto(BASE,{waitUntil:'networkidle'});
 for(const spec of specs){
  for(const [key,value,absent] of spec.changes){
   await page.evaluate(async ({id,seed})=>{
    const {ProductConfigurationEditor}=await import('/product-configuration-editor.mjs');const{createProductConfigurationSnapshot}=await import('/work-management/domain.mjs');
    const inventory=await(await fetch('/api/runtime-master/integrations')).json(),product=inventory.find(x=>x.id===id);
    const result=await(await fetch('/api/runtime-master/resolve?'+new URLSearchParams({productId:id,selection:JSON.stringify(seed)}))).json();
    const snapshot=createProductConfigurationSnapshot({product,result});window.frameEditor?.destroy();document.body.innerHTML='<main id="qaRoot"></main>';
    window.frameEditor=new ProductConfigurationEditor(document.querySelector('#qaRoot'),{initialSnapshot:snapshot});await window.frameEditor.mount();
   },{id:spec.id,seed:spec.seed});
   async function capture(){return page.evaluate(()=>({result:window.frameEditor.state.resolved,selection:window.frameEditor.state.selection,snapshot:window.frameEditor.getSnapshot()}));}
   const before=await capture();
   const order=before.result.fields.filter(f=>common.includes(f.key)).map(f=>f.key);assert.deepEqual(order,common.filter(k=>order.includes(k)));
   for(const k of legacy)assert.ok(!before.result.fields.some(f=>f.key===k));
   if(spec.id==='SER-YKKAP-UCHIRIMO'){
    assert.ok(!before.result.fields.some(f=>f.key==='upper_frame_spec'));
    const sides=before.result.fields.find(f=>f.key==='fukashi_sides');assert.ok(sides);assert.deepEqual(sides.values.filter(v=>!v.disabled).map(v=>v.value),['three_side','four_side']);
    const middle=before.result.fields.find(f=>f.key==='middle_rail_option');assert.ok(middle);assert.deepEqual(new Set(middle.values.filter(v=>!v.disabled).map(v=>v.value)),new Set(['none','enabled']));
    assert.equal(before.result.fields.some(f=>f.key==='middle_rail_position'),false);
    const middleLabels=(await page.locator('#dynamicForm [data-spec-key="middle_rail_option"] option').allTextContents()).filter(x=>x!=='選択してください');assert.deepEqual(new Set(middleLabels),new Set(['なし','あり']));
    const finalDimensions=before.result.fields.filter(f=>f.presentationSlot==='INNER_WINDOW_FINAL_DIMENSION').map(f=>f.key);
    assert.deepEqual(finalDimensions,['size_w','size_h']);assert.deepEqual(before.result.fields.slice(-2).map(f=>f.key),finalDimensions);
    const optionHeading=page.locator('#dynamicForm [data-semantic-group="OPTION"]');assert.equal(await optionHeading.count(),1);assert.equal((await optionHeading.textContent()).trim(),'オプション');
    assert.equal(await page.evaluate(()=>{const h=document.querySelector('#dynamicForm [data-semantic-group="OPTION"]'),o=document.querySelector('#dynamicForm [data-key="middle_rail_option"]');return Boolean(h&&o&&(h.compareDocumentPosition(o)&Node.DOCUMENT_POSITION_FOLLOWING));}),true);
   }
   const revision=await page.locator('#dynamicForm').getAttribute('data-resolve-revision');
   await page.locator(`[data-spec-key="${key}"]`).selectOption(value);
   await page.waitForFunction(r=>document.querySelector('#dynamicForm').dataset.resolveRevision!==r,revision);
   const after=await capture();assert.equal(after.selection[key],value);
   const dom=await page.locator('#dynamicForm [data-spec-key]').evaluateAll(nodes=>nodes.map(n=>n.dataset.specKey));assert.deepEqual(dom,after.result.fields.map(f=>f.key));
   assert.deepEqual(after.selection,after.result.selection);assert.deepEqual(after.snapshot.configuration,after.selection);
   for(const k of absent){assert.equal(after.selection[k],undefined,k);assert.ok(!after.snapshot.display_summary.some(f=>f.key===k));}
   for(const k of legacy)assert.equal(after.selection[k],undefined);
   const output=createEstimateOutputModel({project:{project_id:'frame-qa'},estimate:{estimate_id:'frame-qa',project_id:'frame-qa'},openings:[{opening_id:'frame-qa',status:'COMPLETE',product_configuration_snapshot:after.snapshot}]});
   assert.deepEqual(output.rows[0].configuration,after.selection);assert.deepEqual(output.rows[0].display_summary,after.snapshot.display_summary);
   assert.deepEqual(after.snapshot.confirmation_requests??[],after.result.confirmationRequests??[]);
   await page.evaluate(async snapshot=>{localStorage.setItem('canonical-frame-qa-snapshot',JSON.stringify(snapshot));const saved=JSON.parse(localStorage.getItem('canonical-frame-qa-snapshot'));const{ProductConfigurationEditor}=await import('/product-configuration-editor.mjs');window.frameEditor.destroy();window.frameEditor=new ProductConfigurationEditor(document.querySelector('#qaRoot'),{initialSnapshot:saved});await window.frameEditor.mount();},after.snapshot);
   assert.deepEqual((await capture()).selection,after.selection);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=1);
   if(key==='fukashi_depth')await page.screenshot({path:`${OUT}/${spec.id}-${width}.png`,fullPage:true});
   report.cases.push({width,product:spec.id,transition:key,to:value,cleared:absent,status:'PASS'});
  }
 }

 // Requested Inplus sales-flow controls: hidden estimator-owned glass details,
 // estimate-confirm special orders, and additive multi-option checkboxes.
 await page.evaluate(async ()=>{
  const id='SER-LIXIL-INPLUS';
  const {ProductConfigurationEditor}=await import('/product-configuration-editor.mjs');
  const{createProductConfigurationSnapshot}=await import('/work-management/domain.mjs');
  const inventory=await(await fetch('/api/runtime-master/integrations')).json(),product=inventory.find(x=>x.id===id);
  const seed={window_type:'引違い窓',sash_configuration:'2枚建',glass_family:'Low-E複層',glass_type:'透明',fukashi_presence:'present',fukashi_sides:'three_side',fukashi_depth:'40'};
  const result=await(await fetch('/api/runtime-master/resolve?'+new URLSearchParams({productId:id,selection:JSON.stringify(seed)}))).json();
  const snapshot=createProductConfigurationSnapshot({product,result});
  window.frameEditor?.destroy();document.body.innerHTML='<main id="qaRoot"></main>';
  window.frameEditor=new ProductConfigurationEditor(document.querySelector('#qaRoot'),{initialSnapshot:snapshot});await window.frameEditor.mount();
 });
 assert.equal(await page.locator('#dynamicForm [data-key="supply_form"]').count(),0);
 assert.equal(await page.locator('#dynamicForm [data-key="glass_detail"]').count(),0);
 assert.equal(await page.locator('#dynamicForm [data-key="crescent_presence"]').count(),1);
 assert.equal(await page.locator('#dynamicForm [data-spec-key="crescent_presence"] option[value="crescentless_special_order"]').textContent(),'なし（特注・要確認）');
 assert.equal((await page.evaluate(()=>window.frameEditor.state.resolved.fields.find(f=>f.key==='crescent_presence').values.find(v=>v.value==='crescentless_special_order').manualCheck)),true);
 assert.equal(await page.locator('#dynamicForm [data-key="fukashi_curtain_rail"]').count(),1);
 assert.equal(await page.locator('#dynamicForm [data-key="crescent_position_mode"]').count(),1);
 assert.equal(await page.locator('#dynamicForm [data-key="cavity_fill"]').count(),0);
 const gasLabels=(await page.locator('#dynamicForm [data-spec-key="sales_gas_fill"] option').allTextContents()).filter(text=>text!=='選択してください');
 assert.deepEqual(gasLabels,['乾燥空気','アルゴンガス']);
 const railImmediatelyAfterPresence=await page.evaluate(()=>{const keys=[...document.querySelectorAll('#dynamicForm .field[data-key]')].map(node=>node.dataset.key);return keys.indexOf('fukashi_curtain_rail')===keys.indexOf('fukashi_presence')+1;});
 assert.equal(railImmediatelyAfterPresence,true);
 const reinforcement=page.locator('#dynamicForm [data-spec-key="fukashi_reinforcement"]');
 assert.ok((await reinforcement.locator('option').allTextContents()).some(text=>text.includes('ふかし枠下部補強部材')));
 const options=page.locator('#dynamicForm [data-multi-key="option_items"]');
 assert.equal(await options.count(),1);
 await assertCheckboxFinalOption(page,'SER-LIXIL-INPLUS',width,'initial');
 for(const value of ['OP-STEP','OP-EMBED-RESIN','OP-TRUE-WALL-SCREW','OP-REPLACEMENT-CRESCENT'])assert.equal(await options.locator(`input[value="${value}"]`).count(),1,value);
 let rev=await page.locator('#dynamicForm').getAttribute('data-resolve-revision');
 await options.locator('input[value="OP-EMBED-RESIN"]').check();
 await page.waitForFunction(r=>document.querySelector('#dynamicForm').dataset.resolveRevision!==r,rev);
 rev=await page.locator('#dynamicForm').getAttribute('data-resolve-revision');
 await page.locator('#dynamicForm [data-multi-key="option_items"] input[value="OP-TRUE-WALL-SCREW"]').check();
 await page.waitForFunction(r=>document.querySelector('#dynamicForm').dataset.resolveRevision!==r,rev);
 let salesState=await page.evaluate(()=>window.frameEditor.state);
 assert.ok(salesState.selection.option_items.includes('OP-EMBED-RESIN'));
 assert.ok(salesState.selection.option_items.includes('OP-TRUE-WALL-SCREW'));
 rev=await page.locator('#dynamicForm').getAttribute('data-resolve-revision');
 await page.locator('#dynamicForm [data-spec-key="crescent_presence"]').selectOption('installed');
 await page.waitForFunction(r=>document.querySelector('#dynamicForm').dataset.resolveRevision!==r,rev);
 assert.equal(await page.locator('#dynamicForm [data-spec-key="crescent_type"] option', {hasText:'キー付きクレセント'}).count(),1);
 rev=await page.locator('#dynamicForm').getAttribute('data-resolve-revision');
 await page.locator('#dynamicForm [data-spec-key="crescent_position_mode"]').selectOption('custom');
 await page.waitForFunction(r=>document.querySelector('#dynamicForm').dataset.resolveRevision!==r,rev);
 const pField=page.locator('#dynamicForm [data-spec-key="crescent_position_p_mm"]');
 assert.equal(await pField.count(),1);
 assert.equal(await pField.getAttribute('step'),'0.5');
 const pAfterH=await page.evaluate(()=>{const p=document.querySelector('[data-key="crescent_position_p_mm"]'),h=document.querySelector('[data-key="order_height"]');return Boolean(p&&h&&(h.compareDocumentPosition(p)&Node.DOCUMENT_POSITION_FOLLOWING));});
 assert.equal(pAfterH,true);
 await assertCheckboxFinalOption(page,'SER-LIXIL-INPLUS',width,'custom-positions');
 rev=await page.locator('#dynamicForm').getAttribute('data-resolve-revision');
 await pField.fill('550');
 await pField.dispatchEvent('change');
 await page.waitForFunction(()=>window.frameEditor.state.selection.crescent_position_p_mm===550&&document.querySelector('#dynamicForm').dataset.resolveRevision===String(window.frameEditor.state.resolveRevision));
 salesState=await page.evaluate(()=>window.frameEditor.state);
 assert.equal(salesState.selection.crescent_position_p_mm,550);
 assert.ok(salesState.resolved.confirmationRequests.some(row=>row.code==='INPLUS_SALES_REQUEST_CONFIRM'));
 const overflowRequested=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflowRequested<=1);
 report.cases.push({width,product:'SER-LIXIL-INPLUS',transition:'requested-sales-controls',status:'PASS'});

 // Uchirimo custom crescent position: position mode stays Formal, numeric request is app-side
 // and must render only after the final custom W/H controls.
 await page.evaluate(async ()=>{
  const id='SER-YKKAP-UCHIRIMO';
  const {ProductConfigurationEditor}=await import('/product-configuration-editor.mjs');
  const{createProductConfigurationSnapshot}=await import('/work-management/domain.mjs');
  const inventory=await(await fetch('/api/runtime-master/integrations')).json(),product=inventory.find(x=>x.id===id);
  const seed={room_specification:'residential',window_type:'sliding_window',sash_configuration:'two_panel',size_w:1000,size_h:1000,glass_family:'insulating_glass',fukashi_presence:'none',crescent_presence:'installed',crescent_position:'custom',pull_handle_type:'safety_stop_pull',pull_handle_position:'custom',middle_rail_option:'enabled',middle_rail_position:'custom'};
  const result=await(await fetch('/api/runtime-master/resolve?'+new URLSearchParams({productId:id,selection:JSON.stringify(seed)}))).json();
  const snapshot=createProductConfigurationSnapshot({product,result});
  window.frameEditor?.destroy();document.body.innerHTML='<main id="qaRoot"></main>';
  window.frameEditor=new ProductConfigurationEditor(document.querySelector('#qaRoot'),{initialSnapshot:snapshot});await window.frameEditor.mount();
 });
 const glassDesign=page.locator('#dynamicForm [data-spec-key="sales_glass_design"]');
 assert.equal(await glassDesign.count(),1);
 assert.deepEqual((await glassDesign.locator('option').allTextContents()).filter(text=>text!=='選択してください'),['標準複層ガラス','格子入り複層ガラス','和室用複層ガラス']);
 const uchOptions=page.locator('#dynamicForm [data-multi-key="option_items"]');
 assert.equal(await uchOptions.count(),1);
 await assertCheckboxFinalOption(page,'SER-YKKAP-UCHIRIMO',width,'initial');
 for(const value of ['jamb_step_spacer','sweep_attachment','sash_stopper','washitsu_filler','decorative_jamb','outer_window_replacement_crescent','outer_window_universal_handle','adjustment_material'])assert.equal(await uchOptions.locator(`input[value="${value}"]`).count(),1,value);
 assert.equal(await uchOptions.locator('input[value="arm_stopper_option"]').count(),0);
 assert.equal(await uchOptions.locator('input[value="outside_handle_option"]').count(),0);
 await page.locator('#dynamicForm [data-spec-key="sales_glass_appearance"]').selectOption('frosted');
 await page.waitForFunction(()=>window.frameEditor.state.selection.sales_glass_appearance==='frosted'&&document.querySelector('#dynamicForm').dataset.resolveRevision===String(window.frameEditor.state.resolveRevision));
 let designRev=await page.locator('#dynamicForm').getAttribute('data-resolve-revision');
 await glassDesign.selectOption('grid');
 await page.waitForFunction(r=>document.querySelector('#dynamicForm').dataset.resolveRevision!==r,designRev);
 let designLabels=(await page.locator('#dynamicForm [data-spec-key="sales_glass_pattern"] option').allTextContents()).filter(text=>text!=='選択してください');
 assert.deepEqual(designLabels,['プレーンタイプ','エレガントタイプ','洋風タイプ WA01（アルミ格子）','洋風タイプ WA01（樹脂格子）','洋風タイプ WA02','プレーリータイプ PA01','プレーリータイプ PA02','洋風タイプ WP01']);
 designRev=await page.locator('#dynamicForm').getAttribute('data-resolve-revision');
 await page.locator('#dynamicForm [data-spec-key="sales_glass_design"]').selectOption('japanese');
 await page.waitForFunction(r=>document.querySelector('#dynamicForm').dataset.resolveRevision!==r,designRev);
 designLabels=(await page.locator('#dynamicForm [data-spec-key="sales_glass_pattern"] option').allTextContents()).filter(text=>text!=='選択してください');
 assert.deepEqual(designLabels,['荒間格子','横繁吹寄格子','たて繁吹寄格子']);
 const glassFlow=await page.evaluate(()=>{
  const keys=window.frameEditor.state.resolved.fields.map(field=>field.key);
  const expected=['glass_family','sales_glass_design','sales_glass_appearance','sales_glass_pattern','low_e_type','sales_spacer_type','sales_gas_fill'];
  const nodes=expected.map(key=>document.querySelector(`#dynamicForm .field[data-key="${key}"]`));
  return {keys:keys.filter(key=>expected.includes(key)),appearance:window.frameEditor.state.selection.sales_glass_appearance,
   visualOrder:nodes.every((node,index)=>index===0||Boolean(node&&nodes[index-1]&&nodes[index-1].getBoundingClientRect().top<node.getBoundingClientRect().top))};
 });
 assert.deepEqual(glassFlow,{keys:['glass_family','sales_glass_design','sales_glass_appearance','sales_glass_pattern','low_e_type','sales_spacer_type','sales_gas_fill'],appearance:'frosted',visualOrder:true});

 const uchCrescent=page.locator('#dynamicForm [data-spec-key="crescent_position_custom_mm"]');
 const uchPull=page.locator('#dynamicForm [data-spec-key="pull_handle_position_custom_mm"]');
 const uchMiddle=page.locator('#dynamicForm [data-spec-key="middle_rail_position_custom_mm"]');
 assert.equal(await uchCrescent.count(),1);
 assert.equal(await uchPull.count(),1);
 assert.equal(await uchMiddle.count(),1);
 const customPositionOrder=await page.evaluate(()=>{
  const keys=[...document.querySelectorAll('#dynamicForm .field[data-key]')].map(node=>node.dataset.key);
  return {
   crescentAfterH:keys.indexOf('crescent_position_custom_mm')>keys.indexOf('size_h'),
   pullAfterCrescent:keys.indexOf('pull_handle_position_custom_mm')>keys.indexOf('crescent_position_custom_mm'),
   middleAfterPull:keys.indexOf('middle_rail_position_custom_mm')>keys.indexOf('pull_handle_position_custom_mm'),
  };
 });
 assert.deepEqual(customPositionOrder,{crescentAfterH:true,pullAfterCrescent:true,middleAfterPull:true});
 let uchRev=await page.locator('#dynamicForm').getAttribute('data-resolve-revision');
 await uchCrescent.fill('500');await uchCrescent.dispatchEvent('change');
 await page.waitForFunction(()=>window.frameEditor.state.selection.crescent_position_custom_mm===500&&document.querySelector('#dynamicForm').dataset.resolveRevision===String(window.frameEditor.state.resolveRevision));
 uchRev=await page.locator('#dynamicForm').getAttribute('data-resolve-revision');
 await page.locator('#dynamicForm [data-spec-key="pull_handle_position_custom_mm"]').fill('520');
 await page.locator('#dynamicForm [data-spec-key="pull_handle_position_custom_mm"]').dispatchEvent('change');
 await page.waitForFunction(()=>window.frameEditor.state.selection.pull_handle_position_custom_mm===520&&document.querySelector('#dynamicForm').dataset.resolveRevision===String(window.frameEditor.state.resolveRevision));
 uchRev=await page.locator('#dynamicForm').getAttribute('data-resolve-revision');
 await page.locator('#dynamicForm [data-spec-key="middle_rail_position_custom_mm"]').fill('540');
 await page.locator('#dynamicForm [data-spec-key="middle_rail_position_custom_mm"]').dispatchEvent('change');
 await page.waitForFunction(()=>window.frameEditor.state.selection.middle_rail_position_custom_mm===540&&document.querySelector('#dynamicForm').dataset.resolveRevision===String(window.frameEditor.state.resolveRevision));
 const uchState=await page.evaluate(()=>window.frameEditor.state);
 assert.equal(uchState.selection.crescent_position_custom_mm,500);
 assert.equal(uchState.selection.pull_handle_position_custom_mm,520);
 assert.equal(uchState.selection.middle_rail_position_custom_mm,540);
 await assertCheckboxFinalOption(page,'SER-YKKAP-UCHIRIMO',width,'custom-positions');
 report.cases.push({width,product:'SER-YKKAP-UCHIRIMO',transition:'custom-position-measurements',status:'PASS'});

 async function changeUchirimo(key,value){
  await page.locator(`[data-spec-key="${key}"]`).selectOption(value);
  await page.waitForFunction(({key,value})=>window.frameEditor.state.selection[key]===value&&document.querySelector('#dynamicForm').dataset.resolveRevision===String(window.frameEditor.state.resolveRevision),{key,value});
 }
 await changeUchirimo('sales_glass_pattern','aramagoushi');
 await changeUchirimo('sales_glass_design','grid');
 assert.equal((await page.evaluate(()=>window.frameEditor.state.selection)).sales_glass_pattern,undefined);
 await changeUchirimo('sales_glass_design','standard');
 assert.equal(await page.locator('#dynamicForm [data-spec-key="sales_glass_pattern"]').count(),0);
 assert.deepEqual(await page.evaluate(()=>({appearance:window.frameEditor.state.selection.sales_glass_appearance,pattern:window.frameEditor.state.selection.sales_glass_pattern})),{appearance:'frosted',pattern:undefined});
 await changeUchirimo('sales_glass_design','grid');
 await changeUchirimo('sales_glass_pattern','wa01_resin');
 for(const value of ['jamb_step_spacer','outer_window_replacement_crescent','outer_window_universal_handle']){
  const revision=await page.locator('#dynamicForm').getAttribute('data-resolve-revision');
  await page.locator(`[data-multi-key="option_items"] input[value="${value}"]`).check();
  await page.waitForFunction(old=>document.querySelector('#dynamicForm').dataset.resolveRevision!==old,revision);
 }
 const r6State=await page.evaluate(()=>window.frameEditor.state);
 assert.equal(r6State.resolved.runtimeMaster.packageVersion,'v1.0-P7R1-R5');
 assert.equal(r6State.resolved.runtimeMaster.productMasterFormalReference.packageVersion,'v1.0-P7R1-R6');
 assert.equal(r6State.resolved.runtimeMaster.productMasterFormalReference.runtimeScope,'NOT_INCLUDED_IN_PRODUCT_MASTER_FORMAL');
 assert.equal(r6State.resolved.orderReady,false);
 assert.ok(r6State.resolved.confirmationRequests.some(row=>row.status==='ESTIMATE_CONFIRM_REQUIRED'));
 assert.deepEqual(new Set(r6State.selection.option_items),new Set(['jamb_step_spacer','outer_window_replacement_crescent','outer_window_universal_handle']));
 await page.evaluate(async()=>{
  localStorage.setItem('r6-review-snapshot',JSON.stringify(window.frameEditor.getSnapshot()));
  const saved=JSON.parse(localStorage.getItem('r6-review-snapshot'));
  const {ProductConfigurationEditor}=await import('/product-configuration-editor.mjs');
  window.frameEditor.destroy();window.frameEditor=new ProductConfigurationEditor(document.querySelector('#qaRoot'),{initialSnapshot:saved});await window.frameEditor.mount();
 });
 assert.deepEqual((await page.evaluate(()=>window.frameEditor.state.selection)),r6State.selection);
 await changeUchirimo('glass_family','single_glazing');
 const single=await page.evaluate(()=>window.frameEditor.state);
 for(const key of ['sales_glass_design','sales_glass_pattern']){
  assert.equal(single.selection[key],undefined);
  assert.equal(single.snapshot.display_summary.some(row=>row.key===key),false);
 }
 await changeUchirimo('sash_configuration','three_panel');
 assert.equal(await page.locator('[data-multi-key="option_items"] input[value="meeting_stile_exterior_pull"]').count(),1);
 await changeUchirimo('room_specification','bathroom');
 const bath=await page.evaluate(()=>window.frameEditor.state);
 assert.equal(bath.selection.option_items.includes('jamb_step_spacer'),false);
 assert.ok(bath.selection.option_items.includes('outer_window_universal_handle'));
 assert.equal(await page.locator('[data-multi-key="option_items"] input[value="cover_material"]').count(),1);
 assert.equal(await page.locator('[data-multi-key="option_items"] input[value="meeting_stile_exterior_pull"]').count(),0);
 report.cases.push({width,product:'SER-YKKAP-UCHIRIMO',transition:'R6-design-option-clear-retain-save-identity',status:'PASS'});

 await page.close();
}
assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.stack;throw error;}
finally{await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify({status:report.status,cases:report.cases.length}));
