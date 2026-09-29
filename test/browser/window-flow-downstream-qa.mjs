import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createEstimateOutputModel} from '../../src/estimate-output/model.mjs';
const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4173',OUT='artifacts/window-flow-downstream';
await mkdir(OUT,{recursive:true});
const report={status:'RUNNING',exactHead:process.env.GITHUB_SHA??null,cases:[],errors:[]};
const browser=await chromium.launch();
try{
 for(const width of [1440,768,390]){
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage();
  page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(process.env.VERCEL_SHARE_TOKEN?`${BASE}/?_vercel_share=${encodeURIComponent(process.env.VERCEL_SHARE_TOKEN)}`:BASE,{waitUntil:'networkidle'});
  const integrations=await page.evaluate(async()=>await(await fetch('/api/runtime-master/integrations')).json());
  for(const product of integrations.filter(p=>p.status==='READY'&&['INNER_WINDOW','NEW_CONSTRUCTION_EXTERIOR_WINDOW'].includes(p.uiCategory))){
   await page.evaluate(async()=>{const {ProductConfigurationEditor}=await import('/product-configuration-editor.mjs');window.Editor=ProductConfigurationEditor;window.qaEditor?.destroy();document.body.innerHTML='<main id="qaRoot"></main>';window.qaEditor=new ProductConfigurationEditor(document.querySelector('#qaRoot'));await window.qaEditor.mount();});
   await page.selectOption('#manufacturer',product.manufacturer);await page.selectOption('#product',product.id);
   await page.waitForFunction(id=>window.qaEditor.state.resolved?.productId===id,product.id);
   const seeds=await page.evaluate(async id=>{
    const initial=window.qaEditor.state.resolved;
    const windows=initial.fields.find(f=>f.key==='window_type').values.filter(v=>!v.disabled);
    const probes=await Promise.all(windows.map(async c=>({window:c.value,result:await(await fetch('/api/runtime-master/resolve?'+new URLSearchParams({productId:id,selection:JSON.stringify({window_type:c.value})}))).json()})));
    const picked=new Set([windows[0].value]);
    for(const slot of ['handing','hinge_side','window_configuration','configuration_variant','installation_environment','frame_angle']){
     const candidate=probes.find(p=>p.result.fields.some(f=>f.semanticSlot===slot&&!f.disabled&&f.values.filter(v=>!v.disabled).length>1));
     if(candidate)picked.add(candidate.window);
    }
    return [...picked];
   },product.id);
   for(const windowSeed of seeds){
   const reset=page.waitForResponse(r=>r.url().includes('/api/runtime-master/resolve')&&r.status()===200);
   await page.selectOption('#product',product.id);await reset;
   await page.waitForFunction(()=>window.qaEditor.state.resolved&&Object.keys(window.qaEditor.state.selection).length<8);
   async function state(){return page.evaluate(()=>({result:window.qaEditor.state.resolved,selection:window.qaEditor.state.selection,snapshot:window.qaEditor.getSnapshot()}));}
   async function change(key,value){const old=await page.locator('#dynamicForm').getAttribute('data-resolve-revision');const control=page.locator(`[data-spec-key="${key}"]`);if(await control.getAttribute('type')==='number'){await control.fill(String(value));await control.dispatchEvent('change');}else await control.selectOption(value);await page.waitForFunction(old=>document.querySelector('#dynamicForm').dataset.resolveRevision!==old,old);return state();}
   await change("window_type",String(windowSeed));
   const visited=new Set();
   for(let step=0;step<65;step++){
    const s=await state(), f=s.result.fields.find(f=>!f.disabled&&!visited.has(f.key)&&s.selection[f.key]===undefined&&(f.dataType==='NUMBER'||f.values.some(v=>!v.disabled)));
    if(!f)break;visited.add(f.key);const choice=f.values.find(v=>!v.disabled);
    await change(f.key,f.dataType==='NUMBER'?500:f.dataType==='MULTI_ENUM'?[String(choice.value)]:String(choice.value));
   }
   const seed=await state(),stages=new Set(),checks=[];
   // Work from downstream to upstream so all configured transition classes are exercised.
   const fields=[...seed.result.fields].reverse().filter(f=>!f.disabled&&(f.dataType==='NUMBER'||f.values.some(v=>!v.disabled&&String(v.value)!==String(seed.selection[f.key]))));
   for(const original of fields){
    const before=await state(),f=before.result.fields.find(f=>f.key===original.key);if(!f||f.disabled)continue;
    const alt=f.values.find(v=>!v.disabled&&String(v.value)!==String(before.selection[f.key]));
    if(f.dataType!=='NUMBER'&&!alt)continue;
    const next=f.dataType==='NUMBER'?Number(before.selection[f.key]??500)+1:f.dataType==='MULTI_ENUM'?[String(alt.value)]:String(alt.value);
    const after=await change(f.key,next);stages.add(f.semanticStage);
    const dom=await page.locator('#dynamicForm [data-spec-key]').evaluateAll(nodes=>nodes.map(n=>n.dataset.specKey));assert.deepEqual(dom,after.result.fields.map(f=>f.key));
    assert.deepEqual(after.selection,after.result.selection);assert.deepEqual(after.snapshot.configuration,after.selection);
    let retained=0,cleared=0;
    for(const [key,value] of Object.entries(before.selection)){
     if(key===f.key)continue;
     const current=after.result.fields.find(row=>row.key===key);
     if(current&&!current.readOnly&&current.values.length){
      const valid=(Array.isArray(value)?value:[value]).every(v=>current.values.some(c=>!c.disabled&&JSON.stringify(c.value)===JSON.stringify(v)));
      if(valid){
       const isRetained=Array.isArray(value)?value.every(v=>after.selection[key]?.some(next=>JSON.stringify(next)===JSON.stringify(v))):JSON.stringify(after.selection[key])===JSON.stringify(value);
       if(!isRetained){
        // A listed choice is not applicable while a required parent is unset.
        // Ask the same public evaluator under the NEW upstream conditions.
        const proof=await page.evaluate(async ({id,selection})=>await(await fetch('/api/runtime-master/resolve?'+new URLSearchParams({productId:id,selection:JSON.stringify(selection)}))).json(),{id:product.id,selection:{...after.selection,[key]:value}});
        assert.notDeepEqual(proof.selection[key],value,`${product.id}:${f.key} unnecessarily cleared applicable ${key}`);
       }else retained++;
      }
     }
     if(after.selection[key]===undefined){assert.equal(after.snapshot.display_summary.some(row=>row.key===key),false);cleared++;}
    }
    for(const current of after.result.fields){
     const value=after.selection[current.key];if(value===undefined||!current.values.length||current.readOnly)continue;
     for(const v of Array.isArray(value)?value:[value])assert.ok(current.values.some(c=>JSON.stringify(c.value)===JSON.stringify(v)),`${product.id}:${f.key} stale ${current.key}`);
    }
    const snapshot=after.snapshot;
    const output=createEstimateOutputModel({project:{project_id:'p'},estimate:{estimate_id:'e',project_id:'p'},openings:[{opening_id:'o',status:'COMPLETE',product_configuration_snapshot:snapshot}]});
    assert.deepEqual(output.rows[0].configuration,after.selection);
    assert.deepEqual(output.rows[0].display_summary,snapshot.display_summary);
    await page.evaluate(async saved=>{window.qaEditor.destroy();window.qaEditor=new window.Editor(document.querySelector('#qaRoot'),{initialSnapshot:saved});await window.qaEditor.mount();},snapshot);
    const restored=await state();assert.deepEqual(restored.selection,after.selection,`${product.id}:${f.key} restore drift`);
    checks.push({key:f.key,stage:f.semanticStage,validRetained:retained,cleared,restore:'PASS'});
   }
   assert.ok(checks.length,product.id);report.cases.push({width,id:product.id,windowSeed,stages:[...stages],checks});
  }
   }
  await context.close();
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.failure=e.stack;throw e;}
finally{await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify({status:report.status,cases:report.cases.length,transitions:report.cases.reduce((n,c)=>n+c.checks.length,0)}));
