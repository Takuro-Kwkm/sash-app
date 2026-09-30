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
   if(spec.id==='SER-YKKAP-UCHIRIMO'){assert.ok(!before.result.fields.some(f=>f.key==='upper_frame_spec'));const sides=before.result.fields.find(f=>f.key==='fukashi_sides');assert.ok(sides);assert.deepEqual(sides.values.filter(v=>!v.disabled).map(v=>v.value),['three_side','four_side']);}
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
 await page.close();
}
assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.stack;throw error;}
finally{await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify({status:report.status,cases:report.cases.length}));
