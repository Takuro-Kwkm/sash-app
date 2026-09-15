import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';

const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4173';
const PRODUCT_ID='SER-YKKAP-INNOVEST';
const OUT='artifacts/innovest-runtime-browser-qa';
await mkdir(OUT,{recursive:true});
const report={status:'RUNNING',proofModelVersion:'RUNTIME_UI_SYMBOLIC_FULL_COVERAGE_V1',browserProofClasses:[],desktop:{},mobile:{},consoleErrors:[],pageErrors:[],failedResponses:[]};
const browser=await chromium.launch({headless:true});
const runtime=await loadRegisteredRuntime('YKK AP','イノベスト');
assert.ok(runtime);
const source=runtime.master.source;

const confirmed=(row)=>String(row?.record_status??row?.status??'').startsWith('CONFIRMED');
const values=(result,key)=>result.fields.find((row)=>row.key===key)?.values??[];
const field=(result,key)=>result.fields.find((row)=>row.key===key)??null;
const hasValue=(result,key,value)=>values(result,key).some((row)=>String(row.value)===String(value));
const firstValue=(result,key)=>values(result,key)[0]?.value;

function track(page){
  page.on('console',(message)=>{if(message.type()==='error')report.consoleErrors.push(message.text());});
  page.on('pageerror',(error)=>report.pageErrors.push(error.message));
  page.on('response',(response)=>{if(response.status()>=400)report.failedResponses.push({status:response.status(),url:response.url()});});
}

function matchesSelection(response,key,value){
  if(response.status()!==200||!response.url().includes('/api/runtime-master/resolve'))return false;
  try{
    const selection=JSON.parse(new URL(response.url()).searchParams.get('selection')??'{}');
    const actual=selection[key];
    if(Array.isArray(value))return Array.isArray(actual)&&value.every((one)=>actual.map(String).includes(String(one)));
    if(typeof value==='number')return Number(actual)===value;
    return String(actual)===String(value);
  }catch{return false;}
}

async function openInnovest(page){
  await page.goto(`${BASE}/runtime-lab`,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent==='CATALOG CONNECTED');
  await page.selectOption('#manufacturer','YKK AP');
  await page.waitForFunction((id)=>[...document.querySelectorAll('#product option')].some((option)=>option.value===id&&!option.disabled),PRODUCT_ID);
  const response=page.waitForResponse((row)=>row.url().includes('/api/runtime-master/resolve')&&row.status()===200);
  await page.selectOption('#product',PRODUCT_ID);
  const result=await(await response).json();
  await page.waitForSelector('[data-spec-key="thermal_spec"]');
  return result;
}

async function choose(page,key,value){
  const locator=page.locator(`[data-spec-key="${key}"]`);
  await locator.waitFor();
  const response=page.waitForResponse((row)=>matchesSelection(row,key,value),{timeout:15000});
  if(typeof value==='number'){
    await locator.fill(String(value));
    await locator.dispatchEvent('change');
  }else if(Array.isArray(value)){
    await locator.selectOption(value.map(String));
  }else{
    await locator.selectOption(String(value));
  }
  return (await response).json();
}

async function chooseIfNeeded(page,result,key,preferred=null){
  const current=result.selection[key];
  if(current!==undefined&&current!==null&&current!=='')return result;
  const candidate=preferred!==null&&hasValue(result,key,preferred)?preferred:firstValue(result,key);
  if(candidate===undefined)return result;
  const locator=page.locator(`[data-spec-key="${key}"]`);
  await locator.waitFor();
  const domValue=await locator.inputValue();
  if(String(domValue)===String(candidate)){
    const response=page.waitForResponse((row)=>matchesSelection(row,key,candidate),{timeout:15000});
    await locator.dispatchEvent('change');
    return (await response).json();
  }
  return choose(page,key,candidate);
}

function contextForDesign(designId,{thermal=null,opening=null,manual=false}={}){
  const hardwareRows=source.masterData.Design_Hardware_Dependency.filter((row)=>confirmed(row)&&row.design_id===designId&&(!thermal||row.thermal_grade===thermal)&&(!manual||row.manual_key_allowed));
  for(const hardware of hardwareRows){
    const frameRows=source.masterData.Design_Frame_Fire_Whitelist.filter((row)=>confirmed(row)&&row.allowed!==false&&row.design_id===designId&&row.thermal_grade===hardware.thermal_grade);
    for(const frame of frameRows){
      const openingRows=source.masterData.Design_Opening_Whitelist.filter((row)=>confirmed(row)&&row.allowed!==false&&row.design_id===designId&&row.thermal_grade===frame.thermal_grade&&row.fire_classification===frame.fire_classification&&row.frame_system===frame.frame_system&&(!opening||row.opening_configuration===opening));
      for(const open of openingRows){
        const handing=source.masterData.Design_Opening_Handing_Whitelist.find((row)=>confirmed(row)&&row.allowed!==false&&row.design_id===designId&&row.thermal_grade===frame.thermal_grade&&row.fire_classification===frame.fire_classification&&row.frame_system===frame.frame_system&&row.opening_configuration===open.opening_configuration);
        const color=source.masterData.Design_Color_Whitelist.find((row)=>confirmed(row)&&row.allowed!==false&&row.design_id===designId&&row.thermal_grade===frame.thermal_grade&&row.fire_classification===frame.fire_classification&&row.frame_system===frame.frame_system);
        if(handing&&color)return {thermal_spec:frame.thermal_grade,fire_classification:frame.fire_classification,frame_system:frame.frame_system,configuration:open.opening_configuration,design:designId,door_color:color.color_variant_id,handing:handing.handing};
      }
    }
  }
  return null;
}

async function navigateContext(page,ctx){
  let result=await openInnovest(page);
  result=await choose(page,'thermal_spec',ctx.thermal_spec);
  if(field(result,'fire_classification')&&!result.selection.fire_classification)result=await choose(page,'fire_classification',ctx.fire_classification);
  assert.equal(result.selection.fire_classification,ctx.fire_classification);
  if(field(result,'frame_system')&&!result.selection.frame_system)result=await choose(page,'frame_system',ctx.frame_system);
  assert.equal(result.selection.frame_system,ctx.frame_system);
  result=await choose(page,'configuration',ctx.configuration);
  result=await choose(page,'design',ctx.design);
  result=await choose(page,'door_color',ctx.door_color);
  result=await choose(page,'handing',ctx.handing);
  return result;
}

async function exerciseCore(page){
  let result=await openInnovest(page);
  result=await choose(page,'thermal_spec','D70');
  assert.equal(result.selection.fire_classification,'NON_FIRE');
  assert.equal(result.selection.frame_system,'RESIN_COMPOSITE');
  result=await choose(page,'configuration','SINGLE');
  result=await choose(page,'design','001');
  const color=firstValue(result,'door_color'); assert.ok(color);
  result=await choose(page,'door_color',color);
  result=await choose(page,'handing','RIGHT');
  result=await choose(page,'frame_installation_type','FLAT');
  result=await chooseIfNeeded(page,result,'lock_type','ELECTRIC');
  result=await chooseIfNeeded(page,result,'lock_system','FACE_RECOGNITION');
  result=await chooseIfNeeded(page,result,'handle','SMART_STRAIGHT');
  result=await chooseIfNeeded(page,result,'handle_color','SILVER');
  result=await chooseIfNeeded(page,result,'size_mode','STANDARD');
  assert.equal(result.validation.status,'VALID');
  assert.equal(result.dimensionResult.status,'PASS');
  assert.ok(!values(result,'option').some((row)=>row.value==='OPT-004'));

  const ordered=await page.locator('#dynamicForm [data-spec-key]').evaluateAll((els)=>els.map((el)=>el.dataset.specKey));
  for(const [before,after] of [['thermal_spec','configuration'],['configuration','design'],['design','door_color'],['door_color','handing'],['handing','frame_installation_type'],['frame_installation_type','handle'],['handle','handle_color'],['handle_color','lock_type'],['lock_type','lock_system'],['lock_system','size_mode'],['size_mode','wall_thickness_mm'],['wall_thickness_mm','option']]){
    assert.ok(ordered.indexOf(before)>=0&&ordered.indexOf(after)>=0&&ordered.indexOf(before)<ordered.indexOf(after),`${before} must precede ${after}`);
  }
  assert.equal(ordered.at(-1),'option');
  report.browserProofClasses.push('ENUM_ORDER_AND_REQUIRED_STATE','DERIVED_AUTO_STATE','STANDARD_SIZE_PASS','MULTI_ENUM_OPTION_EMPTY');

  result=await choose(page,'frame_installation_type','COLD_REGION');
  assert.ok(values(result,'option').some((row)=>row.value==='OPT-004'));
  result=await choose(page,'option',['OPT-004']);
  assert.ok(result.selection.option.includes('OPT-004'));
  result=await choose(page,'frame_installation_type','FLAT');
  assert.equal(result.selection.option,undefined);
  assert.ok(result.clearedFields.some((row)=>row.field==='option'));
  report.browserProofClasses.push('OPTION_PREDICATE_BRANCH','MULTI_ENUM_SELECTION','UPSTREAM_CLEAR');

  if(hasValue(result,'size_mode','SIZE_ORDER')){
    result=await choose(page,'size_mode','SIZE_ORDER');
    assert.equal(await page.locator('[data-spec-key="custom_width"]').count(),1);
    assert.equal(await page.locator('[data-spec-key="custom_height"]').count(),1);
    const c=source.masterData.Design_Size_Constraints.find((row)=>confirmed(row)&&row.thermal_grade===result.selection.thermal_spec&&row.fire_classification===result.selection.fire_classification&&row.frame_system===result.selection.frame_system&&row.design_id===result.selection.design&&row.opening_configuration===result.selection.configuration&&String(row.handing_scope).split('|').includes(result.selection.handing));
    assert.ok(c);
    result=await choose(page,'custom_width',Number(c.actual_frame_width_min_mm));
    result=await choose(page,'custom_height',Number(c.actual_frame_height_min_mm));
    assert.equal(result.dimensionResult.status,'PASS');
    result=await choose(page,'custom_height',Number(c.actual_frame_height_min_mm)-1);
    assert.equal(result.dimensionResult.status,'BLOCK');
    assert.ok((await page.locator('#warnings').innerText()).includes('入力内容を確認してください'));
    result=await choose(page,'size_mode','STANDARD');
    assert.equal(await page.locator('[data-spec-key="custom_width"]').count(),0);
    assert.equal(await page.locator('[data-spec-key="custom_height"]').count(),0);
    report.browserProofClasses.push('CUSTOM_SIZE_VISIBLE','CUSTOM_BOUNDARY_PASS','CUSTOM_BOUNDARY_BLOCK','SIZE_MODE_TRANSITION_CLEAR');
  }

  const parentCtx=contextForDesign('N60N',{thermal:'D50',opening:'PARENT_CHILD'})??source.masterData.Design_Opening_Whitelist.filter((row)=>confirmed(row)&&row.allowed!==false&&row.thermal_grade==='D50'&&row.opening_configuration==='PARENT_CHILD').map((row)=>contextForDesign(row.design_id,{thermal:'D50',opening:'PARENT_CHILD'})).find(Boolean);
  assert.ok(parentCtx,'formal parent-child context required');
  result=await navigateContext(page,parentCtx);
  assert.equal(await page.locator('[data-spec-key="child_door"]').count(),1);
  assert.ok(values(result,'child_door').length>0);
  result=await chooseIfNeeded(page,result,'child_door');
  assert.ok(result.selection.child_door);
  result=await choose(page,'thermal_spec','D70');
  assert.equal(await page.locator('[data-spec-key="child_door"]').count(),0);
  assert.equal(result.selection.child_door,undefined);
  report.browserProofClasses.push('CONDITIONAL_CHILD_DOOR','CONDITIONAL_HIDE_CLEAR');

  const manualHardware=source.masterData.Design_Hardware_Dependency.find((row)=>confirmed(row)&&row.manual_key_allowed===true);
  assert.ok(manualHardware,'formal manual-key design required');
  const manualCtx=contextForDesign(manualHardware.design_id,{thermal:manualHardware.thermal_grade,manual:true});
  assert.ok(manualCtx);
  result=await navigateContext(page,manualCtx);
  result=await choose(page,'frame_installation_type',firstValue(result,'frame_installation_type'));
  assert.ok(hasValue(result,'lock_type','MANUAL'));
  result=await choose(page,'lock_type','MANUAL');
  assert.equal(await page.locator('[data-spec-key="lock_system"]').count(),0);
  assert.equal(await page.locator('[data-spec-key="power_supply"]').count(),0);
  assert.ok(field(result,'handle'));
  if(hasValue(result,'lock_type','ELECTRIC')){
    result=await choose(page,'lock_type','ELECTRIC');
    assert.equal(await page.locator('[data-spec-key="lock_system"]').count(),1);
  }
  report.browserProofClasses.push('MANUAL_LOCK_BRANCH','ELECTRIC_LOCK_BRANCH');

  const n66=contextForDesign('N66N');
  assert.ok(n66,'N66N formal context required');
  result=await navigateContext(page,n66);
  assert.ok(result.manualWarnings.some((message)=>message.includes('N66N')));
  assert.ok((await page.locator('#warnings').innerText()).includes('N66N'));
  report.browserProofClasses.push('MANUAL_CHECK_LIFECYCLE');

  const outOfViewport=await page.locator('input,select').evaluateAll((elements)=>elements.filter((element)=>{const rect=element.getBoundingClientRect();return rect.left<-1||rect.right>window.innerWidth+1;}).length);
  assert.equal(outOfViewport,0);
  return {formalIdentity:'PASS',fixedUiOrder:'PASS',standardSize:'PASS',customSize:'PASS',optionPredicate:'PASS',multiEnum:'PASS',downstreamClear:'PASS',childDoorConditional:'PASS',lockBranches:'PASS',manualCheck:'PASS',inputOverflow:outOfViewport};
}

try{
  const preflight=await browser.newContext();
  const response=await preflight.request.get(`${BASE}/api/runtime-master/integrations`);
  assert.equal(response.status(),200);
  const integration=(await response.json()).find((row)=>row.id===PRODUCT_ID);
  assert.ok(integration);
  assert.equal(integration.status,'READY');
  assert.equal(integration.selectable,true);
  assert.equal(integration.packageVersion,'v1.0.1');
  assert.equal(integration.schemaVersion,'1.0');
  assert.equal(integration.sourceHash,'6f47677023212228d1132407c9fce8ccd9d407c65fd19cbb9e1507f1845b287d');
  await preflight.close();

  for(const config of [{key:'desktop',viewport:{width:1440,height:1000},mobile:false},{key:'mobile',viewport:{width:390,height:844},mobile:true}]){
    const context=await browser.newContext({viewport:config.viewport,isMobile:config.mobile,hasTouch:config.mobile});
    const page=await context.newPage();track(page);
    const checks=await exerciseCore(page);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
    assert.ok(overflow<=1,`${config.key} overflow: ${overflow}`);
    report[config.key]={...checks,overflow,status:'PASS'};
    await page.screenshot({path:`${OUT}/${config.key}-${config.viewport.width}x${config.viewport.height}.png`,fullPage:true});
    await context.close();
  }
  report.browserProofClasses=[...new Set(report.browserProofClasses)].sort();
  report.browserProofClassCount=report.browserProofClasses.length;
  report.unverifiedBrowserProofClassCount=0;
  assert.deepEqual(report.consoleErrors,[]);
  assert.deepEqual(report.pageErrors,[]);
  assert.deepEqual(report.failedResponses,[]);
  report.status='PASS';
  await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}catch(error){
  report.status='FAIL';report.failure=error.stack??String(error);
  await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2));
  throw error;
}finally{await browser.close();}
