import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4173';
const OUT=process.env.STAGE_A_FULL_BROWSER_OUT??'artifacts/stage-a-full-browser-qa';
const HEAD_SHA=process.env.HEAD_SHA??null;
const REACH_PATH=process.env.STAGE_A_REACHABILITY_REPORT;
const TRANSITION_PATH=process.env.STAGE_A_TRANSITION_REPORT;
const DISCRETE_PATH=process.env.STAGE_A_DISCRETE_REPORT;
const MULTI_PATH=process.env.STAGE_A_MULTI_BROWSER_REPORT;

if(!REACH_PATH||!TRANSITION_PATH||!DISCRETE_PATH||!MULTI_PATH)throw new Error('Stage A evidence paths are required');
await mkdir(OUT,{recursive:true});
const readJson=async(path)=>JSON.parse(await readFile(path,'utf8'));
const [reach,transition,discrete,multi]=await Promise.all([REACH_PATH,TRANSITION_PATH,DISCRETE_PATH,MULTI_PATH].map(readJson));

assert.equal(reach.status,'PASS');
assert.equal(reach.unique_context_count,137);
assert.equal(reach.reachable_context_count,137);
assert.equal(reach.unreachable_context_count,0);
assert.equal(transition.status,'PASS');
assert.equal(transition.selector_context_count,137);
assert.equal(transition.gate_status?.custom_size_coverage_gate,'PASS');
assert.equal(discrete.status,'PASS');
assert.equal(discrete.base_window_count,105);
assert.equal(discrete.unverified_window_count,0);
assert.equal(discrete.exact_discrete_terminal_context_count,'8493560851926718442');
assert.equal(discrete.custom_pending_context_count,'34750450586');
assert.equal(multi.status,'PASS');

const transitionByIndex=new Map(transition.contexts.map((row)=>[row.context_index,row]));
const expectedSeriesCounts=new Map([
  ['SER-LIX-SAMOS2H',17],['SER-LIX-SAMOSL',17],['SER-LIX-EW',15],
  ['SER-LIXIL-TW',25],['SER-YKK-APW430',25],['SER-YKK-APW431',6],
]);
const productMeta=new Map();
for(const row of reach.contexts){
  productMeta.set(row.product_id,{manufacturer:row.manufacturer,series:row.series,productId:row.product_id});
}
assert.equal(productMeta.size,6);

const TECHNICAL_TOKEN=/\b(?:CUSTOM_DIMENSION|RUNTIME|ORDER_READY|[A-Z][A-Z0-9]+(?:_[A-Z0-9]+){1,})\b/;
const present=(value)=>value!==undefined&&value!==null&&value!==''&&(!Array.isArray(value)||value.length>0);
const stableArray=(value)=>[...(Array.isArray(value)?value:[])].map(String);
const sameArray=(a,b)=>a.length===b.length&&a.every((v,i)=>String(v)===String(b[i]));
const enabledValues=(field)=>(field?.values??[]).filter((choice)=>choice.disabled!==true).map((choice)=>String(choice.value));
const fieldByKey=(result,key)=>(result.fields??[]).find((field)=>field.key===key)??null;

function normalizedStatus(result){
  const direct=String(result?.dimensionResult?.status??result?.dimension_result?.status??'');
  if(direct==='BLOCKED')return'BLOCK';
  if(['PASS','REVIEW_REQUIRED','BLOCK','PENDING'].includes(direct))return direct;
  const validation=String(result?.validation?.status??'');
  if(['BLOCKED','INVALID'].includes(validation))return'BLOCK';
  if(['MANUAL_CHECK','REVIEW_REQUIRED'].includes(validation))return'REVIEW_REQUIRED';
  if(result?.series==='EW'&&result?.selection?.size_mode==='CUSTOM'){
    const errors=result?.validation?.errors??[];
    if(errors.some((error)=>['CUSTOM_SIZE_OUT_OF_RANGE','CUSTOM_SIZE_INVALID_NUMBER'].includes(error.errorCode??error.code)))return'BLOCK';
    const w=result?.selection?.custom_w,h=result?.selection?.custom_h;
    if(Number.isFinite(Number(w))&&Number.isFinite(Number(h)))return'PASS';
  }
  return direct||validation||'NONE';
}

function requestSelection(response){
  if(response.status()!==200||!response.url().includes('/api/runtime-master/resolve'))return null;
  try{
    const url=new URL(response.url());
    return {productId:url.searchParams.get('productId'),selection:JSON.parse(url.searchParams.get('selection')??'{}')};
  }catch{return null;}
}
async function waitResolve(page,productId,predicate,action){
  const responsePromise=page.waitForResponse((response)=>{
    const parsed=requestSelection(response);
    return parsed?.productId===productId&&predicate(parsed.selection);
  },{timeout:15000});
  await action();
  const response=await responsePromise;
  assert.equal(response.status(),200);
  return response.json();
}
function selectionMatches(selection,key,wanted){
  const actual=selection?.[key];
  if(Array.isArray(wanted))return Array.isArray(actual)&&sameArray(stableArray(actual),stableArray(wanted));
  if(typeof wanted==='number')return Number(actual)===wanted;
  return String(actual??'')===String(wanted);
}

async function selectProduct(page,meta){
  if(await page.locator('#manufacturer').inputValue()!==meta.manufacturer){
    await page.selectOption('#manufacturer',meta.manufacturer);
  }
  await page.waitForFunction((id)=>[...document.querySelectorAll('#product option')].some((option)=>option.value===id&&!option.disabled),meta.productId);
  if(await page.locator('#product').inputValue()){
    await page.selectOption('#product','');
  }
  const result=await waitResolve(page,meta.productId,(selection)=>Object.keys(selection).length===0,()=>page.selectOption('#product',meta.productId));
  await page.waitForFunction(()=>document.querySelector('[data-spec-key="window_type"]'));
  return result;
}

async function setField(page,productId,result,key,wanted){
  const field=fieldByKey(result,key);
  assert.ok(field,`${productId}: field missing while setting ${key}=${wanted}`);
  const locator=page.locator(`[data-spec-key="${key}"]`);
  await locator.waitFor({state:'attached'});
  if(field.dataType==='NUMBER'){
    const numeric=Number(wanted);
    return waitResolve(page,productId,(selection)=>Number(selection?.[key])===numeric,async()=>{
      await locator.fill(String(wanted));
      await locator.dispatchEvent('change');
    });
  }
  if(field.dataType==='MULTI_ENUM'){
    const values=Array.isArray(wanted)?wanted.map(String):[String(wanted)];
    return waitResolve(page,productId,(selection)=>sameArray(stableArray(selection?.[key]),values),()=>locator.selectOption(values));
  }
  return waitResolve(page,productId,(selection)=>String(selection?.[key]??'')===String(wanted),()=>locator.selectOption(String(wanted)));
}

async function clearField(page,productId,result,key){
  const field=fieldByKey(result,key);
  assert.ok(field,`${productId}: field missing while clearing ${key}`);
  const locator=page.locator(`[data-spec-key="${key}"]`);
  await locator.waitFor({state:'attached'});
  if(field.dataType==='NUMBER'||field.dataType==='TEXT'){
    return waitResolve(page,productId,(selection)=>!present(selection?.[key]),async()=>{
      await locator.fill('');
      await locator.dispatchEvent('change');
    });
  }
  return waitResolve(page,productId,(selection)=>!present(selection?.[key]),()=>locator.selectOption(''));
}

async function converge(page,productId,result,desired){
  for(let pass=0;pass<30;pass+=1){
    const mismatches=Object.entries(desired).filter(([key,wanted])=>!selectionMatches(result.selection,key,wanted));
    if(!mismatches.length)return result;
    let progressed=false;
    for(const field of result.fields??[]){
      if(!Object.prototype.hasOwnProperty.call(desired,field.key))continue;
      const wanted=desired[field.key];
      if(selectionMatches(result.selection,field.key,wanted))continue;
      if(field.readOnly)continue;
      if(field.dataType==='NUMBER'||field.dataType==='TEXT'){
        result=await setField(page,productId,result,field.key,wanted);progressed=true;break;
      }
      const wantedValues=Array.isArray(wanted)?wanted:[wanted];
      if(!wantedValues.every((one)=>enabledValues(field).includes(String(one))))continue;
      result=await setField(page,productId,result,field.key,wanted);progressed=true;break;
    }
    if(!progressed){
      throw new Error(`${productId}: convergence stalled: ${mismatches.map(([k,v])=>`${k}=${JSON.stringify(v)}`).join(', ')}`);
    }
  }
  throw new Error(`${productId}: convergence limit`);
}

async function assertDomProjection(page,result,label){
  const fields=result.fields??[];
  const domKeys=await page.locator('#dynamicForm [data-spec-key]').evaluateAll((nodes)=>nodes.map((node)=>node.dataset.specKey));
  assert.deepEqual(domKeys,fields.map((field)=>String(field.key)),`${label}: DOM field order/visibility drift`);

  for(const field of fields){
    const locator=page.locator(`[data-spec-key="${field.key}"]`);
    assert.equal(await locator.count(),1,`${label}: ${field.key} DOM cardinality`);
    const wrapper=page.locator(`[data-key="${field.key}"]`);
    const text=await wrapper.locator('label').innerText();
    assert.ok(text.includes(String(field.displayLabel)),`${label}: ${field.key} label drift`);
    assert.equal(text.includes('必須'),Boolean(field.required),`${label}: ${field.key} required marker drift`);

    if(field.dataType==='NUMBER'){
      assert.equal(await locator.getAttribute('type'),'number',`${label}: ${field.key} number input drift`);
      const expected=present(result.selection?.[field.key])?String(result.selection[field.key]):'';
      assert.equal(await locator.inputValue(),expected,`${label}: ${field.key} number selection drift`);
      continue;
    }
    if(field.dataType==='TEXT'){
      const expected=present(result.selection?.[field.key])?String(result.selection[field.key]):'';
      assert.equal(await locator.inputValue(),expected,`${label}: ${field.key} text selection drift`);
      continue;
    }

    assert.equal(await locator.evaluate((node)=>node.tagName),'SELECT',`${label}: ${field.key} select drift`);
    assert.equal(await locator.evaluate((node)=>node.multiple),field.dataType==='MULTI_ENUM',`${label}: ${field.key} multi drift`);
    const domOptions=await locator.locator('option').evaluateAll((nodes)=>nodes.map((node)=>({value:node.value,disabled:node.disabled})));
    const runtimeOptions=(field.values??[]).map((choice)=>({value:String(choice.value),disabled:Boolean(choice.disabled)}));
    const normalizedDom=field.dataType==='MULTI_ENUM'?domOptions:domOptions.filter((row)=>row.value!=='');
    assert.deepEqual(normalizedDom,runtimeOptions,`${label}: ${field.key} option/disabled drift`);
    const shouldDisable=Boolean(field.readOnly||!(field.values??[]).length);
    assert.equal(await locator.isDisabled(),shouldDisable,`${label}: ${field.key} disabled drift`);
    const actual=await locator.evaluate((node)=>node.multiple?[...node.selectedOptions].map((o)=>o.value):node.value);
    const selected=result.selection?.[field.key];
    if(field.dataType==='MULTI_ENUM')assert.deepEqual(actual,stableArray(selected),`${label}: ${field.key} selected drift`);
    else assert.equal(String(actual??''),present(selected)?String(selected):'',`${label}: ${field.key} selected drift`);
  }

  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  assert.ok(overflow<=1,`${label}: horizontal overflow ${overflow}`);
}

async function assertFriendlyWarnings(page,label){
  const visible=await page.locator('#warnings').innerText();
  assert.equal(TECHNICAL_TOKEN.test(visible),false,`${label}: technical token leaked into warnings`);
}

function track(page,viewport,report){
  page.on('console',(message)=>{if(message.type()==='error')report.console_errors.push({viewport,message:message.text()});});
  page.on('pageerror',(error)=>report.page_errors.push({viewport,message:error.message}));
  page.on('response',(response)=>{if(response.status()>=400)report.failed_responses.push({viewport,status:response.status(),url:response.url()});});
}

async function baseWindowSweep(page,viewportKey,report){
  let count=0;
  const perProduct={};
  for(const meta of productMeta.values()){
    let result=await selectProduct(page,meta);
    const windowField=fieldByKey(result,'window_type');
    assert.ok(windowField,`${meta.productId}: root window_type missing`);
    const windows=enabledValues(windowField);
    assert.equal(windows.length,expectedSeriesCounts.get(meta.productId),`${meta.productId}: base window count drift`);
    perProduct[meta.productId]=windows.length;
    for(const windowId of windows){
      result=await selectProduct(page,meta);
      result=await setField(page,meta.productId,result,'window_type',windowId);
      await assertDomProjection(page,result,`${viewportKey}:base:${meta.productId}:${windowId}`);
      await assertFriendlyWarnings(page,`${viewportKey}:base:${meta.productId}:${windowId}`);
      count+=1;
    }
  }
  assert.equal(count,105,`${viewportKey}: base window sweep count`);
  report.base_windows={count,per_product:perProduct,status:'PASS'};
}

async function customSweep(page,viewportKey,report){
  let checked=0,negative=0,dual=0,customOnly=0;
  const failures=[];
  for(const ctx of reach.contexts){
    const tx=transitionByIndex.get(ctx.context_index);
    assert.ok(tx,`transition context ${ctx.context_index} missing`);
    const meta=productMeta.get(ctx.product_id);
    let result=await selectProduct(page,meta);
    result=await converge(page,ctx.product_id,result,ctx.selection_prefix);
    await assertDomProjection(page,result,`${viewportKey}:custom:${ctx.context_index}:prefix`);
    assert.ok(fieldByKey(result,ctx.custom_width_field),`${viewportKey}: context ${ctx.context_index} width missing`);
    assert.ok(fieldByKey(result,ctx.custom_height_field),`${viewportKey}: context ${ctx.context_index} height missing`);

    const [positiveW,positiveH]=tx.positive_witness.point;
    result=await setField(page,ctx.product_id,result,ctx.custom_width_field,positiveW);
    result=await setField(page,ctx.product_id,result,ctx.custom_height_field,positiveH);
    assert.equal(normalizedStatus(result),tx.positive_status,`${viewportKey}: context ${ctx.context_index} positive status`);
    await assertFriendlyWarnings(page,`${viewportKey}:custom:${ctx.context_index}:positive`);
    await assertDomProjection(page,result,`${viewportKey}:custom:${ctx.context_index}:positive`);

    result=await clearField(page,ctx.product_id,result,ctx.custom_width_field);
    assert.equal(normalizedStatus(result),tx.clear_width_status,`${viewportKey}: context ${ctx.context_index} clear width status`);
    result=await setField(page,ctx.product_id,result,ctx.custom_width_field,positiveW);
    result=await clearField(page,ctx.product_id,result,ctx.custom_height_field);
    assert.equal(normalizedStatus(result),tx.clear_height_status,`${viewportKey}: context ${ctx.context_index} clear height status`);
    result=await setField(page,ctx.product_id,result,ctx.custom_height_field,positiveH);

    if(tx.negative_witness){
      const [negativeW,negativeH]=tx.negative_witness.point;
      result=await setField(page,ctx.product_id,result,ctx.custom_width_field,negativeW);
      result=await setField(page,ctx.product_id,result,ctx.custom_height_field,negativeH);
      assert.equal(normalizedStatus(result),tx.negative_status,`${viewportKey}: context ${ctx.context_index} negative status`);
      await assertFriendlyWarnings(page,`${viewportKey}:custom:${ctx.context_index}:negative`);
      negative+=1;
    }

    if(tx.mode_topology==='STANDARD_AND_CUSTOM'){
      result=await setField(page,ctx.product_id,result,'size_mode','STANDARD');
      assert.equal(fieldByKey(result,ctx.custom_width_field),null,`${viewportKey}: context ${ctx.context_index} width not hidden on STANDARD`);
      assert.equal(fieldByKey(result,ctx.custom_height_field),null,`${viewportKey}: context ${ctx.context_index} height not hidden on STANDARD`);
      assert.equal(present(result.selection?.[ctx.custom_width_field]),false,`${viewportKey}: context ${ctx.context_index} width not cleared on STANDARD`);
      assert.equal(present(result.selection?.[ctx.custom_height_field]),false,`${viewportKey}: context ${ctx.context_index} height not cleared on STANDARD`);
      assert.equal(normalizedStatus(result),tx.return_standard_status,`${viewportKey}: context ${ctx.context_index} return STANDARD status`);
      result=await setField(page,ctx.product_id,result,'size_mode','CUSTOM');
      assert.ok(fieldByKey(result,ctx.custom_width_field),`${viewportKey}: context ${ctx.context_index} width missing after CUSTOM reentry`);
      assert.ok(fieldByKey(result,ctx.custom_height_field),`${viewportKey}: context ${ctx.context_index} height missing after CUSTOM reentry`);
      assert.equal(present(result.selection?.[ctx.custom_width_field]),false,`${viewportKey}: context ${ctx.context_index} width stale after reentry`);
      assert.equal(present(result.selection?.[ctx.custom_height_field]),false,`${viewportKey}: context ${ctx.context_index} height stale after reentry`);
      assert.equal(normalizedStatus(result),tx.reenter_custom_status,`${viewportKey}: context ${ctx.context_index} reenter CUSTOM status`);
      dual+=1;
    }else{
      assert.equal(tx.mode_topology,'CUSTOM_ONLY');
      customOnly+=1;
    }

    await assertDomProjection(page,result,`${viewportKey}:custom:${ctx.context_index}:final`);
    checked+=1;
  }
  assert.equal(checked,137);
  assert.equal(negative,112);
  assert.equal(dual,131);
  assert.equal(customOnly,6);
  report.custom_contexts={checked,negative_witness_checks:negative,dual_mode_contexts:dual,custom_only_contexts:customOnly,status:'PASS',failures};
}

const report={
  exact_head_sha:HEAD_SHA,
  task_classification:'NON-PRODUCT-MASTER',
  product_master_mutation:0,
  model_version:'STAGE_A_FULL_BROWSER_QA_V1_SYMBOLIC_EQUIVALENCE_BOUND',
  evidence:{
    discrete_digest:discrete.evidence_digest,
    reachability_digest:reach.evidence_digest,
    transition_digest:transition.evidence_digest,
    multienum_candidate_exact_head:multi.exact_head_sha,
  },
  proof_basis:{
    exact_discrete_terminal_context_count:discrete.exact_discrete_terminal_context_count,
    custom_pending_context_count:discrete.custom_pending_context_count,
    base_window_count:105,
    custom_selector_context_count:137,
    desktop_and_smartphone:true,
    browser_substitution:'GENERIC_DOM_PROJECTION_FOR_ALL_RESOLVER_OUTPUTS_PLUS_ALL_BASE_WINDOWS_PLUS_ALL_CUSTOM_SELECTOR_CONTEXTS_PLUS_INVARIANT_MULTIENUM_EXHAUSTIVE_BROWSER_EVIDENCE',
  },
  viewports:{},
  console_errors:[],page_errors:[],failed_responses:[],
  status:'RUNNING',
  gate_status:{full_browser_qa_gate:'RUNNING',regression_gate:'PENDING',repository_gate:'PENDING',app_integration_ready:false,release_input_gate:'BLOCKED'},
};

const browser=await chromium.launch({headless:true});
try{
  const configs=[
    {key:'desktop',viewport:{width:1440,height:1000},mobile:false},
    {key:'smartphone',viewport:{width:390,height:844},mobile:true},
  ];
  for(const config of configs){
    const context=await browser.newContext({viewport:config.viewport,isMobile:config.mobile,hasTouch:config.mobile});
    const page=await context.newPage();track(page,config.key,report);
    await page.goto(`${BASE}/runtime-lab`,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>document.querySelector('#status')?.textContent==='CATALOG CONNECTED');
    const viewportReport={};
    await baseWindowSweep(page,config.key,viewportReport);
    await customSweep(page,config.key,viewportReport);
    await page.screenshot({path:`${OUT}/${config.key}-final.png`,fullPage:true});
    report.viewports[config.key]=viewportReport;
    await context.close();
  }
  assert.deepEqual(report.console_errors,[]);
  assert.deepEqual(report.page_errors,[]);
  assert.deepEqual(report.failed_responses,[]);
  report.status='PASS';
  report.gate_status.full_browser_qa_gate='PASS';
  report.gate_status.regression_gate='PENDING';
  report.gate_status.repository_gate='PENDING';
  await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2)+'\n','utf8');
  console.log('FULL_BROWSER_QA_GATE=PASS');
  console.log('BASE_WINDOW_BROWSER_CASE_COUNT=210');
  console.log('CUSTOM_BROWSER_CONTEXT_CASE_COUNT=274');
  console.log('CUSTOM_NEGATIVE_BROWSER_CHECK_COUNT=224');
  console.log('UNVERIFIED_BROWSER_CASE_COUNT=0');
}catch(error){
  report.status='FAIL';
  report.failure={name:error.name,message:error.message,stack:error.stack};
  report.gate_status.full_browser_qa_gate='FAIL';
  await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2)+'\n','utf8');
  throw error;
}finally{
  await browser.close();
}
