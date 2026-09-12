import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4173';
const SHARE_TOKEN=process.env.VERCEL_SHARE_TOKEN;
const OUT='artifacts/stage-a-full-window-browser-qa';
const MATRIX_PATH=process.env.STAGE_A_MATRIX_PATH??'artifacts/stage-a-full-coverage/coverage-matrix.json';
const SUMMARY_PATH=process.env.STAGE_A_SUMMARY_PATH??'artifacts/stage-a-full-coverage/summary.json';
const PRODUCTS=[
  {manufacturer:'LIXIL',id:'SER-LIX-SAMOS2H',windows:17},
  {manufacturer:'LIXIL',id:'SER-LIX-SAMOSL',windows:17},
  {manufacturer:'LIXIL',id:'SER-LIX-EW',windows:15},
  {manufacturer:'LIXIL',id:'SER-LIXIL-TW',windows:25},
  {manufacturer:'YKK AP',id:'SER-YKK-APW430',windows:25},
  {manufacturer:'YKK AP',id:'SER-YKK-APW431',windows:6},
];
const TECHNICAL=['construction','legacyConstruction','legacyConfiguration','internal_construction'];
const matrix=JSON.parse(await readFile(MATRIX_PATH,'utf8'));
const matrixSummary=JSON.parse(await readFile(SUMMARY_PATH,'utf8'));
await mkdir(OUT,{recursive:true});

const keyOf=(productId,windowValue)=>`${productId}::${windowValue}`;
const customCapabilityWindows=new Set(matrix
  .filter((row)=>row.case_type==='CUSTOM_CAPABILITY'&&row.status==='VERIFIED'&&row.supported===true)
  .map((row)=>keyOf(row.product_id,row.window_type)));
const customPositiveWindows=new Set(matrix
  .filter((row)=>row.case_type==='CUSTOM_IN_RANGE_OR_REVIEW'&&row.status==='VERIFIED')
  .map((row)=>keyOf(row.product_id,row.window_type)));
const blockedCustomWindows=new Set([...customCapabilityWindows].filter((key)=>!customPositiveWindows.has(key)));
const blockedCustomRoutes=matrix.filter((row)=>row.case_type==='CUSTOM_ROUTE'&&row.status==='UNVERIFIED');

assert.equal(customCapabilityWindows.size,matrixSummary.custom_window_count,'matrix custom capability count drifted');
assert.equal(blockedCustomWindows.size,1,'expected exactly one custom-capable window blocked by Product Master defect');
for(const key of blockedCustomWindows){
  const [productId,windowValue]=key.split('::');
  assert.ok(blockedCustomRoutes.some((row)=>row.product_id===productId&&row.window_type===windowValue),`${key}: blocked custom window has no explicit matrix blocker`);
}

const report={
  status:'RUNNING',baseWindowCount:0,desktop:null,mobile:null,
  fullBrowserQaGate:'RUNNING',appIntegrationReady:false,
  consoleErrors:[],pageErrors:[],failedResponses:[],matrixSummary,
  customCoverage:{
    capabilityWindows:customCapabilityWindows.size,
    browserVerifiablePositiveWindows:customPositiveWindows.size,
    productMasterBlockedWindows:blockedCustomWindows.size,
    blockedWindows:[...blockedCustomWindows],
  },
};
const browser=await chromium.launch({headless:true});

const present=(value)=>value!==undefined&&value!==null&&value!==''&&(!Array.isArray(value)||value.length>0);
const same=(actual,expected)=>Array.isArray(expected)
  ? Array.isArray(actual)&&actual.length===expected.length&&actual.map(String).every((v,i)=>v===String(expected[i]))
  : String(actual)===String(expected);
const stable=(value)=>JSON.stringify(Object.fromEntries(Object.entries(value??{}).sort(([a],[b])=>a.localeCompare(b))));

function track(page){
  page.on('console',(message)=>{if(message.type()==='error')report.consoleErrors.push(message.text());});
  page.on('pageerror',(error)=>report.pageErrors.push(error.message));
  page.on('response',(response)=>{if(response.status()>=400)report.failedResponses.push({status:response.status(),url:response.url()});});
}
function entryUrl(){return SHARE_TOKEN?`${BASE}/runtime-lab?_vercel_share=${encodeURIComponent(SHARE_TOKEN)}`:`${BASE}/runtime-lab`;}
function parseResolveRequest(response){
  if(response.status()!==200||!response.url().includes('/api/runtime-master/resolve'))return null;
  try{
    const url=new URL(response.url());
    return {productId:url.searchParams.get('productId'),selection:JSON.parse(url.searchParams.get('selection')??'{}')};
  }catch{return null;}
}
function responseMatches(response,productId,expected={}){
  const parsed=parseResolveRequest(response);
  if(!parsed||parsed.productId!==productId)return false;
  return Object.entries(expected).every(([key,value])=>same(parsed.selection?.[key],value));
}
function fieldChoice(field,target){
  if(field.dataType==='MULTI_ENUM'){
    const targets=Array.isArray(target)?target:[target];
    return targets.every((value)=>(field.values??[]).some((choice)=>String(choice.value)===String(value)&&choice.disabled!==true));
  }
  return (field.values??[]).some((choice)=>String(choice.value)===String(target)&&choice.disabled!==true);
}
function dimensionStatus(result){
  const direct=result.dimensionResult?.status;
  if(direct)return direct==='BLOCKED'?'BLOCK':direct;
  if((result.validation?.errors??[]).some((error)=>String(error.errorCode??error.code??'').includes('CUSTOM_SIZE_OUT_OF_RANGE')))return'BLOCK';
  if(result.validation?.status==='INVALID')return'BLOCK';
  if(result.validation?.status==='MANUAL_CHECK')return'REVIEW_REQUIRED';
  return result.validation?.status??'UNKNOWN';
}
async function waitApplied(page,key,value){
  await page.waitForFunction(({key,value})=>{
    const el=document.querySelector(`[data-spec-key="${key}"]`);
    if(!el)return true;
    if(el.multiple){
      const actual=[...el.selectedOptions].map((option)=>option.value);
      return Array.isArray(value)&&actual.length===value.length&&actual.every((v,i)=>v===String(value[i]));
    }
    return String(el.value)===String(value);
  },{key,value},{timeout:5000});
}
async function choose(page,productId,current,key,value){
  const locator=page.locator(`[data-spec-key="${key}"]`);
  await locator.waitFor({state:'attached'});
  const expected={};
  const windowValue=key==='window_type'?value:current?.selection?.window_type;
  if(present(windowValue))expected.window_type=windowValue;
  expected[key]=value;
  const responsePromise=page.waitForResponse((response)=>responseMatches(response,productId,expected),{timeout:10000});
  const tag=await locator.evaluate((el)=>el.tagName);
  const type=await locator.getAttribute('type');
  if(tag==='SELECT'){
    await locator.selectOption(Array.isArray(value)?value.map(String):String(value));
  }else if(type==='number'||tag==='INPUT'){
    await locator.fill(String(value));
    await locator.dispatchEvent('change');
  }else{
    throw new Error(`${productId}/${key}: unsupported control ${tag}/${type}`);
  }
  const result=await(await responsePromise).json();
  await page.waitForTimeout(250);
  if(present(result.selection?.[key]))await waitApplied(page,key,result.selection[key]);
  return result;
}
async function openLab(page){
  await page.goto(entryUrl(),{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent==='CATALOG CONNECTED');
}
async function openProduct(page,product){
  await page.selectOption('#manufacturer',product.manufacturer);
  await page.waitForFunction((id)=>[...document.querySelectorAll('#product option')].some((option)=>option.value===id&&!option.disabled),product.id);
  const response=page.waitForResponse((r)=>responseMatches(r,product.id,{}),{timeout:10000});
  await page.selectOption('#product',product.id);
  const result=await(await response).json();
  await page.waitForFunction(()=>document.querySelector('[data-spec-key="window_type"]'));
  return result;
}
async function applyTarget(page,productId,result,target,terminalKeys){
  for(let pass=0;pass<60;pass+=1){
    const done=terminalKeys.every((key)=>!present(target[key])||same(result.selection?.[key],target[key]));
    if(done)return result;
    let progressed=false;
    for(const field of result.fields){
      if(!Object.prototype.hasOwnProperty.call(target,field.key))continue;
      const wanted=target[field.key];
      if(same(result.selection?.[field.key],wanted))continue;
      if(field.readOnly)continue;
      if((field.values??[]).length&&!fieldChoice(field,wanted))continue;
      result=await choose(page,productId,result,field.key,wanted);
      if(!same(result.selection?.[field.key],wanted))throw new Error(`${productId}/${field.key}: target value was advertised but did not survive resolution`);
      progressed=true;
      break;
    }
    if(!progressed){
      const missing=terminalKeys.filter((key)=>present(target[key])&&!same(result.selection?.[key],target[key]));
      throw new Error(`${productId}: target route stalled for ${missing.join(',')} target=${stable(target)} actual=${stable(result.selection)}`);
    }
  }
  throw new Error(`${productId}: target route did not converge`);
}
function rowsFor(productId,windowValue,type){return matrix.filter((row)=>row.product_id===productId&&row.window_type===windowValue&&row.case_type===type&&row.status==='VERIFIED');}
function matchingOutRow(productId,windowValue,inRow){
  return rowsFor(productId,windowValue,'CUSTOM_OUT_OF_RANGE').find((row)=>stable(row.selector_frontier)===stable(inRow.selector_frontier))??null;
}
function blockedRouteFor(productId,windowValue){
  return blockedCustomRoutes.find((row)=>row.product_id===productId&&row.window_type===windowValue)??null;
}
async function assertTechnicalHidden(page){
  for(const key of TECHNICAL)assert.equal(await page.locator(`[data-spec-key="${key}"]`).count(),0,`technical field leaked: ${key}`);
}
async function exerciseViewport(config){
  const context=await browser.newContext({viewport:config.viewport,isMobile:config.mobile,hasTouch:config.mobile});
  const page=await context.newPage();track(page);await openLab(page);
  const stats={
    status:'RUNNING',baseWindows:0,standardWindows:0,
    customCapabilityWindows:0,customVerifiedWindows:0,customMasterBlockedWindows:0,
    customBlockedChecks:0,summaryChecks:0,overflowFailures:0,products:{},
  };
  for(const product of PRODUCTS){
    let result=await openProduct(page,product);
    const window=result.fields.find((field)=>field.key==='window_type');
    assert.equal(window?.values?.length,product.windows,`${config.key}/${product.id}: window count mismatch`);
    stats.products[product.id]={windows:window.values.length,standard:0,customCapability:0,customVerified:0,customMasterBlocked:0};
    for(const windowChoice of window.values){
      const windowValue=windowChoice.value;
      const windowKey=keyOf(product.id,windowValue);
      result=await choose(page,product.id,result,'window_type',windowValue);
      stats.baseWindows+=1;
      await assertTechnicalHidden(page);

      const standardRow=rowsFor(product.id,windowValue,'STANDARD_SIZE')[0]??null;
      if(standardRow){
        const target={...standardRow.selector_frontier,size:standardRow.size};
        result=await applyTarget(page,product.id,result,target,['size']);
        assert.equal(String(result.selection.size),String(standardRow.size));
        stats.standardWindows+=1;stats.products[product.id].standard+=1;
      }

      const customRow=rowsFor(product.id,windowValue,'CUSTOM_IN_RANGE_OR_REVIEW')[0]??null;
      if(customCapabilityWindows.has(windowKey)){
        stats.customCapabilityWindows+=1;stats.products[product.id].customCapability+=1;
        if(customRow){
          result=await choose(page,product.id,result,'window_type',windowValue);
          result=await applyTarget(page,product.id,result,customRow.browser_selection,[customRow.custom_width_key,customRow.custom_height_key]);
          const status=dimensionStatus(result);
          assert.ok(['PASS','VALID','INCOMPLETE','ACCEPTED','REVIEW_REQUIRED'].includes(status),`${config.key}/${product.id}/${windowValue}: unexpected custom positive ${status}`);
          stats.customVerifiedWindows+=1;stats.products[product.id].customVerified+=1;

          const out=matchingOutRow(product.id,windowValue,customRow);
          if(out){
            result=await choose(page,product.id,result,customRow.custom_width_key,out.width);
            result=await choose(page,product.id,result,customRow.custom_height_key,out.height);
            assert.equal(dimensionStatus(result),'BLOCK',`${config.key}/${product.id}/${windowValue}: out-of-range custom must block`);
            stats.customBlockedChecks+=1;
          }

          const mode=result.fields.find((field)=>field.key==='size_mode');
          if(standardRow&&mode?.values?.some((choice)=>String(choice.value)==='STANDARD')){
            result=await choose(page,product.id,result,'size_mode','STANDARD');
            assert.equal(await page.locator('[data-spec-key="custom_width"],[data-spec-key="custom_w"]').count(),0);
            assert.equal(await page.locator('[data-spec-key="custom_height"],[data-spec-key="custom_h"]').count(),0);
          }
        }else{
          const blocker=blockedRouteFor(product.id,windowValue);
          assert.ok(blocker,`${config.key}/${product.id}/${windowValue}: custom capability lacks positive case and explicit Product Master blocker`);
          result=await choose(page,product.id,result,'window_type',windowValue);
          const target={...blocker.selector_frontier};
          const terminalKeys=Object.keys(target).filter((key)=>key!=='window_type');
          result=await applyTarget(page,product.id,result,target,terminalKeys);
          assert.equal(String(result.selection?.size_mode),'CUSTOM',`${config.key}/${product.id}/${windowValue}: blocked custom route must still expose CUSTOM mode`);
          assert.equal(await page.locator('[data-spec-key="custom_width"],[data-spec-key="custom_w"]').count(),1,`${config.key}/${product.id}/${windowValue}: blocked custom W input missing`);
          assert.equal(await page.locator('[data-spec-key="custom_height"],[data-spec-key="custom_h"]').count(),1,`${config.key}/${product.id}/${windowValue}: blocked custom H input missing`);
          stats.customMasterBlockedWindows+=1;stats.products[product.id].customMasterBlocked+=1;
        }
      }

      const summary=await page.locator('#selectionSummary').innerText();
      assert.ok(summary.trim().length>0,`${config.key}/${product.id}/${windowValue}: summary empty`);
      stats.summaryChecks+=1;
      await assertTechnicalHidden(page);
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
      if(overflow>1)stats.overflowFailures+=1;
      assert.ok(overflow<=1,`${config.key}/${product.id}/${windowValue}: horizontal overflow ${overflow}`);
    }
  }
  assert.equal(stats.baseWindows,105,`${config.key}: BASE_WINDOW_COUNT`);
  assert.equal(stats.standardWindows,matrixSummary.standard_window_count,`${config.key}: STANDARD coverage mismatch`);
  assert.equal(stats.customCapabilityWindows,matrixSummary.custom_window_count,`${config.key}: CUSTOM capability coverage mismatch`);
  assert.equal(stats.customVerifiedWindows,customPositiveWindows.size,`${config.key}: browser-verifiable CUSTOM coverage mismatch`);
  assert.equal(stats.customMasterBlockedWindows,blockedCustomWindows.size,`${config.key}: Product Master blocked CUSTOM coverage mismatch`);
  assert.equal(stats.customVerifiedWindows+stats.customMasterBlockedWindows,stats.customCapabilityWindows,`${config.key}: CUSTOM coverage partition mismatch`);
  assert.equal(stats.summaryChecks,105,`${config.key}: summary coverage mismatch`);
  assert.equal(stats.overflowFailures,0,`${config.key}: overflow failures`);
  stats.status='PASS';
  await page.screenshot({path:`${OUT}/${config.key}-${config.viewport.width}x${config.viewport.height}.png`,fullPage:true});
  await context.close();
  return stats;
}

try{
  const preflight=await browser.newContext();
  const integrationUrl=SHARE_TOKEN?`${BASE}/api/runtime-master/integrations?_vercel_share=${encodeURIComponent(SHARE_TOKEN)}`:`${BASE}/api/runtime-master/integrations`;
  const response=await preflight.request.get(integrationUrl);assert.equal(response.status(),200);
  const inventory=await response.json();
  for(const product of PRODUCTS){const row=inventory.find((item)=>item.id===product.id);assert.ok(row);assert.equal(row.status,'READY');assert.equal(row.selectable,true);}
  await preflight.close();

  report.desktop=await exerciseViewport({key:'desktop',viewport:{width:1440,height:1000},mobile:false});
  report.mobile=await exerciseViewport({key:'mobile',viewport:{width:390,height:844},mobile:true});
  report.baseWindowCount=105;
  assert.deepEqual(report.consoleErrors,[]);
  assert.deepEqual(report.pageErrors,[]);
  assert.deepEqual(report.failedResponses,[]);
  report.fullBrowserQaGate=matrixSummary.unverified_qa_case_count===0?'PASS':'BLOCKED_PRODUCT_MASTER';
  report.appIntegrationReady=report.fullBrowserQaGate==='PASS'&&matrixSummary.gates?.custom_size_coverage_gate==='PASS';
  report.status='PASS';
  await writeFile(`${OUT}/report.json`,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify(report,null,2));
}catch(error){
  report.status='FAIL';report.failure=error.stack??String(error);
  await writeFile(`${OUT}/report.json`,`${JSON.stringify(report,null,2)}\n`,'utf8');
  throw error;
}finally{await browser.close();}
