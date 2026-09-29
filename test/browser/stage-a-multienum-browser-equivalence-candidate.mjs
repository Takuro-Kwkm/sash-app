import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4173';
const OUT=process.env.STAGE_A_BROWSER_EQ_OUT??'artifacts/stage-a-multienum-browser-equivalence-candidate';
const EXACT_HEAD_SHA=process.env.HEAD_SHA??null;
const PRODUCT={manufacturer:'LIXIL',id:'SER-LIXIL-TW'};
const FIXED=Object.freeze({
  window_type:'SWT-LIX-TW-UNIT-HIKI-FLAT',
  size_mode:'STANDARD',
  panel_count:'2枚建',
  size:'SZ-LIX-TW-FLAT-Z-119-18',
  exterior_color:'EXT-LIX-H',
  interior_color:'INT-LIX-M',
  glass_base:'トリプルガラス',
});
const FIELD='option';
const EXPECTED_CANDIDATES=33;
const EXPECTED_CONFLICT_EDGES=2;
const EXPECTED_EXACT_COMPATIBLE_SUBSETS=5368709120n;
const EXPECTED_ALL_CANDIDATE_SURVIVORS=30;
const INTERNAL_OPTION_ID=/\bOP-LIX-TW-CAT-\d+\b/;

await mkdir(OUT,{recursive:true});

const editorSource=await readFile('src/ui/web/product-configuration-editor.mjs','utf8');
const domainSource=await readFile('src/work-management/domain.mjs','utf8');
const staticChecks={
  editor_has_no_tw_option_id_literals:!editorSource.includes('OP-LIX-TW-CAT-'),
  domain_has_no_tw_option_id_literals:!domainSource.includes('OP-LIX-TW-CAT-'),
  multi_input_is_selected_options_array:/target\.multiple[\s\S]*selectedOptions[\s\S]*map\(\(option\)=>option\.value\)/.test(editorSource),
  multi_render_is_generic_selected_membership:/selected\.some\(\(one\)=>String\(one\)===String\(value\.value\)\)/.test(editorSource),
  multi_render_uses_native_select:/multi\?' multiple size="5"'/.test(editorSource),
  resolver_receives_serialized_selection:/selection:JSON\.stringify\(this\.state\.selection\)/.test(editorSource),
  resolver_result_replaces_ui_selection:/this\.state\.selection=result\.selection;this\.state\.resolved=result/.test(editorSource),
  summary_maps_array_elements:/const values=Array\.isArray\(value\)\?value:\[value\]/.test(domainSource),
  summary_is_elementwise_label_join:/values\.map\(\(one\)=>labels\.get\(`\$\{key\}:\$\{String\(one\)\}`\)\?\?String\(one\)\)\.join\('、'\)/.test(domainSource),
};
for(const [name,pass] of Object.entries(staticChecks))assert.equal(pass,true,`STATIC_BROWSER_EQUIVALENCE_CHECK failed: ${name}`);

const stableArray=(value)=>[...(Array.isArray(value)?value:[])].map(String);
const sameArray=(a,b)=>a.length===b.length&&a.every((value,index)=>String(value)===String(b[index]));
const present=(value)=>value!==undefined&&value!==null&&value!==''&&(!Array.isArray(value)||value.length>0);
const fieldByKey=(result,key)=>result.fields?.find((field)=>field.key===key)??null;
const enabledValues=(field)=>(field?.values??[]).filter((choice)=>choice.disabled!==true).map((choice)=>String(choice.value));

function bitCount(mask){let n=0;for(let x=mask;x;x>>=1n)n+=Number(x&1n);return n;}
function connectedComponents(adjacency){
  const seen=new Set(),components=[];
  for(const vertex of adjacency.keys()){
    if(seen.has(vertex))continue;
    const stack=[vertex],component=[];seen.add(vertex);
    while(stack.length){const current=stack.pop();component.push(current);for(const next of adjacency.get(current)??[]){if(seen.has(next))continue;seen.add(next);stack.push(next);}}
    components.push(component.sort());
  }
  return components;
}
function independentSetCount(component,adjacency){
  const index=new Map(component.map((value,i)=>[value,i]));
  const neighbors=component.map((value)=>{let mask=0n;for(const next of adjacency.get(value)??[]){const i=index.get(next);if(i!==undefined)mask|=1n<<BigInt(i);}return mask;});
  const memo=new Map();
  const solve=(mask)=>{
    if(mask===0n)return 1n;
    const key=mask.toString();if(memo.has(key))return memo.get(key);
    let hasEdge=false;for(let i=0;i<component.length;i++){const bit=1n<<BigInt(i);if((mask&bit)&&(neighbors[i]&mask)){hasEdge=true;break;}}
    if(!hasEdge){const result=1n<<BigInt(bitCount(mask));memo.set(key,result);return result;}
    let chosen=-1,best=-1;for(let i=0;i<component.length;i++){const bit=1n<<BigInt(i);if(!(mask&bit))continue;const degree=bitCount(neighbors[i]&mask);if(degree>best){best=degree;chosen=i;}}
    const bit=1n<<BigInt(chosen),without=mask&~bit;
    const result=solve(without)+solve(without&~neighbors[chosen]);memo.set(key,result);return result;
  };
  return solve((1n<<BigInt(component.length))-1n);
}
function exactIndependentSetCount(adjacency){return connectedComponents(adjacency).reduce((product,component)=>product*independentSetCount(component,adjacency),1n);}

const report={
  exact_head_sha:EXACT_HEAD_SHA,
  task_classification:'NON-PRODUCT-MASTER',
  product_master_mutation:0,
  status:'RUNNING',
  proof_status:'CANDIDATE_PROOF_NOT_GOVERNING',
  static_checks:staticChecks,
  viewports:{},
  console_errors:[],page_errors:[],failed_responses:[],
  qa_semantics:{
    governing_specs_accept_browser_equivalence_substitution:false,
    full_browser_qa_gate:'NOT_STARTED',
    app_integration_ready:false,
    release_input_gate:'BLOCKED',
  },
};

const browser=await chromium.launch({headless:true});

function requestSelection(response){
  if(response.status()!==200||!response.url().includes('/api/runtime-master/resolve'))return null;
  try{const url=new URL(response.url());return{productId:url.searchParams.get('productId'),selection:JSON.parse(url.searchParams.get('selection')??'{}')};}catch{return null;}
}
function track(page,viewport){
  page.on('console',(message)=>{if(message.type()==='error')report.console_errors.push({viewport,message:message.text()});});
  page.on('pageerror',(error)=>report.page_errors.push({viewport,message:error.message}));
  page.on('response',(response)=>{if(response.status()>=400)report.failed_responses.push({viewport,status:response.status(),url:response.url()});});
}
async function waitForResult(page,predicate,action){
  const responsePromise=page.waitForResponse((response)=>{const parsed=requestSelection(response);return parsed?.productId===PRODUCT.id&&predicate(parsed.selection);},{timeout:10000});
  await action();
  const response=await responsePromise;
  assert.equal(response.status(),200);
  return response.json();
}
async function waitDomSelection(page,key,expected){
  await page.waitForFunction(({key,expected})=>{
    const el=document.querySelector(`[data-spec-key="${key}"]`);if(!el)return expected.length===0;
    const actual=el.multiple?[...el.selectedOptions].map((option)=>option.value):[el.value].filter(Boolean);
    return actual.length===expected.length&&actual.every((value,index)=>String(value)===String(expected[index]));
  },{key,expected},{timeout:5000});
}
async function assertVisibleProjection(page,result){
  const selected=stableArray(result.selection?.[FIELD]);
  await waitDomSelection(page,FIELD,selected);
  const summary=await page.locator('#selectionSummary').innerText();
  const warnings=await page.locator('#warnings').innerText();
  const productCodes=await page.locator('#productCodeResults').innerText().catch(()=> '');
  assert.equal(INTERNAL_OPTION_ID.test(`${summary}\n${warnings}\n${productCodes}`),false,'Internal option id leaked into visible projection');
  if(selected.length){
    const optionField=fieldByKey(result,FIELD);
    const labels=new Map((optionField?.values??[]).map((choice)=>[String(choice.value),String(choice.displayLabel)]));
    const expectedLabel=selected.map((value)=>labels.get(String(value))??String(value)).join('、');
    assert.ok(summary.includes(expectedLabel),`summary missing selected option labels: ${expectedLabel}`);
  }
}
async function openProduct(page){
  await page.goto(`${BASE}/runtime-lab`,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent==='CATALOG CONNECTED');
  await page.selectOption('#manufacturer',PRODUCT.manufacturer);
  await page.waitForFunction((id)=>[...document.querySelectorAll('#product option')].some((option)=>option.value===id&&!option.disabled),PRODUCT.id);
  const result=await waitForResult(page,(selection)=>Object.keys(selection).length===0,()=>page.selectOption('#product',PRODUCT.id));
  await page.waitForFunction(()=>document.querySelector('[data-spec-key="window_type"]'));
  return result;
}
async function chooseScalar(page,result,key,value){
  const locator=page.locator(`[data-spec-key="${key}"]`);await locator.waitFor({state:'attached'});
  const next=await waitForResult(page,(selection)=>String(selection?.[key])===String(value),()=>locator.selectOption(String(value)));
  assert.equal(String(next.selection?.[key]),String(value),`${key} did not survive resolution`);
  return next;
}
async function applyFixed(page,result){
  for(let pass=0;pass<30;pass+=1){
    const pending=Object.entries(FIXED).filter(([key,value])=>String(result.selection?.[key]??'')!==String(value));
    if(!pending.length)return result;
    let progressed=false;
    for(const field of result.fields??[]){
      if(!Object.prototype.hasOwnProperty.call(FIXED,field.key))continue;
      const wanted=FIXED[field.key];if(String(result.selection?.[field.key]??'')===String(wanted))continue;
      if(!(field.values??[]).some((choice)=>String(choice.value)===String(wanted)&&choice.disabled!==true))continue;
      result=await chooseScalar(page,result,field.key,wanted);progressed=true;break;
    }
    if(!progressed)throw new Error(`Fixed TW frontier stalled: ${pending.map(([key])=>key).join(',')}`);
  }
  throw new Error('Fixed TW frontier did not converge');
}
async function setMulti(page,result,values){
  const locator=page.locator(`[data-spec-key="${FIELD}"]`);await locator.waitFor({state:'attached'});
  const wanted=values.map(String);
  const next=await waitForResult(page,(selection)=>{
    const requestValues=stableArray(selection?.[FIELD]);
    return wanted.length?sameArray(requestValues,wanted):requestValues.length===0;
  },()=>locator.selectOption(wanted));
  await assertVisibleProjection(page,next);
  for(const [key,value] of Object.entries(FIXED))assert.equal(String(next.selection?.[key]),String(value),`fixed selector drifted after MULTI_ENUM change: ${key}`);
  return next;
}
async function clearMulti(page,result){
  if(!present(result.selection?.[FIELD]))return result;
  return setMulti(page,result,[]);
}

async function exerciseViewport(config){
  const context=await browser.newContext({viewport:config.viewport,isMobile:config.mobile,hasTouch:config.mobile});
  const page=await context.newPage();track(page,config.key);
  let result=await openProduct(page);result=await applyFixed(page,result);result=await clearMulti(page,result);
  const initialField=fieldByKey(result,FIELD);assert.equal(initialField?.dataType,'MULTI_ENUM');
  const candidates=enabledValues(initialField);assert.equal(candidates.length,EXPECTED_CANDIDATES);
  const stats={
    status:'RUNNING',candidate_count:candidates.length,singleton_checks:0,pair_checks:0,conflict_edges:[],
    exact_compatible_subset_count:null,all_candidate_survivor_count:null,greedy_stable_set_size:null,
    horizontal_overflow_failures:0,
  };

  for(const candidate of candidates){
    result=await clearMulti(page,result);result=await setMulti(page,result,[candidate]);
    assert.deepEqual(stableArray(result.selection?.[FIELD]),[candidate]);stats.singleton_checks+=1;
  }

  const adjacency=new Map(candidates.map((value)=>[value,new Set()]));
  for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){
    result=await clearMulti(page,result);
    const a=candidates[i],b=candidates[j];
    result=await setMulti(page,result,[a,b]);
    const survived=new Set(stableArray(result.selection?.[FIELD]));
    const compatible=survived.has(a)&&survived.has(b);
    if(!compatible){adjacency.get(a).add(b);adjacency.get(b).add(a);stats.conflict_edges.push([a,b]);}
    stats.pair_checks+=1;
  }
  assert.equal(stats.pair_checks,(candidates.length*(candidates.length-1))/2);
  assert.equal(stats.conflict_edges.length,EXPECTED_CONFLICT_EDGES);
  const exactCount=exactIndependentSetCount(adjacency);assert.equal(exactCount,EXPECTED_EXACT_COMPATIBLE_SUBSETS);
  stats.exact_compatible_subset_count=exactCount.toString();

  result=await clearMulti(page,result);result=await setMulti(page,result,candidates);
  const allSurvivors=stableArray(result.selection?.[FIELD]);stats.all_candidate_survivor_count=allSurvivors.length;
  assert.equal(allSurvivors.length,EXPECTED_ALL_CANDIDATE_SURVIVORS);
  for(let i=0;i<allSurvivors.length;i++)for(let j=i+1;j<allSurvivors.length;j++)assert.equal(adjacency.get(allSurvivors[i])?.has(allSurvivors[j]),false,'all-candidate survivor set contains conflict edge');

  const greedy=[];for(const value of candidates)if(greedy.every((selected)=>!adjacency.get(value).has(selected)))greedy.push(value);
  result=await clearMulti(page,result);result=await setMulti(page,result,greedy);
  assert.deepEqual(stableArray(result.selection?.[FIELD]),greedy);stats.greedy_stable_set_size=greedy.length;

  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);if(overflow>1)stats.horizontal_overflow_failures+=1;
  assert.ok(overflow<=1,`${config.key}: horizontal overflow ${overflow}`);
  stats.status='PASS';
  await page.screenshot({path:`${OUT}/${config.key}.png`,fullPage:true});
  await context.close();
  return stats;
}

try{
  report.viewports.desktop=await exerciseViewport({key:'desktop',viewport:{width:1440,height:1000},mobile:false});
  report.viewports.mobile=await exerciseViewport({key:'mobile',viewport:{width:390,height:844},mobile:true});
  assert.deepEqual(report.console_errors,[]);
  assert.deepEqual(report.page_errors,[]);
  assert.deepEqual(report.failed_responses,[]);
  const d=report.viewports.desktop,m=report.viewports.mobile;
  assert.equal(d.singleton_checks,EXPECTED_CANDIDATES);assert.equal(m.singleton_checks,EXPECTED_CANDIDATES);
  assert.equal(d.pair_checks,528);assert.equal(m.pair_checks,528);
  assert.deepEqual(d.conflict_edges,m.conflict_edges);
  assert.equal(d.exact_compatible_subset_count,m.exact_compatible_subset_count);
  report.status='PASS';
  report.note='Non-governing candidate only. It exhaustively exercises every singleton and every unordered pair for one fixed TW MULTI_ENUM frontier on Desktop and Smartphone, plus all-candidate and maximal compatible selections, while source checks establish a generic data-driven MULTI_ENUM render/event/summary path. This does not materialize every compatible subset and cannot mark FULL_BROWSER_QA PASS unless governing QA semantics explicitly adopt and define browser-equivalence substitution.';
  await writeFile(`${OUT}/report.json`,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(`BROWSER_EQUIVALENCE_CANDIDATE_STATUS=${report.proof_status}`);
  console.log(`DESKTOP_SINGLETON_CHECKS=${d.singleton_checks}`);
  console.log(`DESKTOP_PAIR_CHECKS=${d.pair_checks}`);
  console.log(`MOBILE_SINGLETON_CHECKS=${m.singleton_checks}`);
  console.log(`MOBILE_PAIR_CHECKS=${m.pair_checks}`);
  console.log(`CONFLICT_EDGES=${d.conflict_edges.length}`);
  console.log(`EXACT_COMPATIBLE_SUBSET_COUNT=${d.exact_compatible_subset_count}`);
  console.log('FULL_BROWSER_QA_GATE=NOT_STARTED');
  console.log('APP_INTEGRATION_READY=false');
  console.log('RELEASE_INPUT_GATE=BLOCKED');
}catch(error){
  report.status='FAIL';report.failure=error.stack??String(error);
  await writeFile(`${OUT}/report.json`,`${JSON.stringify(report,null,2)}\n`,'utf8');
  throw error;
}finally{await browser.close();}
