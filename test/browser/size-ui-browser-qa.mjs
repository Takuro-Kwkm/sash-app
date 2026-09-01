import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4173';
const OUT=process.env.QA_ARTIFACT_DIR??'artifacts/size-ui-browser-qa';
const PRODUCTS=[
  {id:'SER-LIX-SAMOS2H',manufacturer:'LIXIL',label:'サーモスⅡ-H',windowCount:17,windows:['WT-S2H-HIKICHIGAI','WT-S2H-TATE-SUBERI','WT-S2H-FIX-OUT','WT-S2H-TERRACE-DOOR']},
  {id:'SER-LIX-SAMOSL',manufacturer:'LIXIL',label:'サーモスL',windowCount:17,windows:['WT-SL-HIKICHIGAI','WT-SL-TATE-SUBERI','WT-SL-FIX-OUT','WT-SL-TERRACE-DOOR']},
  {id:'SER-YKK-APW430',manufacturer:'YKK AP',label:'APW 430',windowCount:25,windows:['SWT-YKK-APW430-TATE-GREMON-SINGLE','SWT-YKK-APW430-SUBERI-GREMON-SINGLE','SWT-YKK-APW430-FIX-MADO']},
  {id:'SER-YKK-APW431',manufacturer:'YKK AP',label:'APW 431',windowCount:6,windows:['W431-001','W431-003','W431-005']}
];
await mkdir(OUT,{recursive:true});

const report={baseUrl:BASE,desktop:[],mobile:[],custom:[],consoleErrors:[]};
const browser=await chromium.launch({headless:true});

function trackErrors(page,name){
  page.on('console',(message)=>{if(message.type()==='error')report.consoleErrors.push({page:name,type:'console',text:message.text()});});
  page.on('pageerror',(error)=>report.consoleErrors.push({page:name,type:'pageerror',text:error.message}));
}
async function waitResolve(page,action){
  const response=page.waitForResponse((candidate)=>candidate.url().includes('/api/catalog/resolve')&&candidate.status()===200);
  await action();
  await response;
  await page.waitForTimeout(30);
}
async function openProduct(page,product){
  await page.goto(BASE,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent==='CATALOG CONNECTED');
  await page.selectOption('#manufacturer',product.manufacturer);
  await page.waitForFunction((id)=>[...document.querySelectorAll('#product option')].some((option)=>option.value===id),product.id);
  await waitResolve(page,()=>page.selectOption('#product',product.id));
}
async function selectSpec(page,key,value){
  const control=page.locator(`[data-spec-key="${key}"]`);
  await control.waitFor({state:'visible'});
  if(await control.inputValue()===String(value))return;
  const tag=await control.evaluate((element)=>element.tagName);
  if(tag==='SELECT'){
    await page.waitForFunction(([field,target])=>[...document.querySelectorAll(`[data-spec-key="${field}"] option`)].some((option)=>option.value===target),[key,String(value)]);
    await waitResolve(page,()=>control.selectOption(String(value)));
    return;
  }
  await waitResolve(page,async()=>{await control.fill(String(value));await control.press('Tab');});
}
async function fillUpstreamUntilSize(page){
  for(let pass=0;pass<50;pass+=1){
    const width=page.locator('[data-size-width]');
    if(await width.isVisible().catch(()=>false) && await width.locator('option').count()>1)return;
    const choices=await page.locator('#dynamicForm select[data-spec-key]').evaluateAll((controls)=>controls.map((control)=>({
      key:control.dataset.specKey,value:control.value,disabled:control.disabled,visible:Boolean(control.offsetParent),
      options:[...control.options].map((option)=>({value:option.value,text:option.textContent})).filter((option)=>option.value)
    })).filter((control)=>control.visible&&!control.disabled&&!control.value&&control.options.length));
    assert.ok(choices.length,`No selectable upstream field before formal Size UI: ${await page.locator('#dynamicForm').innerText()}`);
    const choice=choices[0];
    const standard=choice.options.find((option)=>option.value==='STANDARD' || option.value==='standard');
    await selectSpec(page,choice.key,(standard??choice.options[0]).value);
  }
  throw new Error('Formal Size UI did not become reachable within 50 selections');
}
async function chooseFirstFormalSize(page){
  const width=page.locator('[data-size-width]'),height=page.locator('[data-size-height]');
  const widths=await width.locator('option').evaluateAll((options)=>options.map((option)=>option.value).filter(Boolean));
  assert.ok(widths.length>0,'No formal W candidate');
  assert.equal(await height.isDisabled(),true,'H must wait for W');
  await waitResolve(page,()=>width.selectOption(widths[0]));
  assert.equal(await page.locator('[data-size-height]').isDisabled(),false,'H must be enabled after W');
  const heights=await page.locator('[data-size-height] option').evaluateAll((options)=>options.map((option)=>option.value).filter(Boolean));
  assert.ok(heights.length>0,'No formal H candidate for selected W');
  await waitResolve(page,()=>page.locator('[data-size-height]').selectOption(heights[0]));
  const recordChoice=page.locator('[data-size-record]');
  if(await recordChoice.count()){
    const records=await recordChoice.locator('option').evaluateAll((options)=>options.map((option)=>option.value).filter(Boolean));
    assert.ok(records.length>0,'No exact formal record for W/H');
    await waitResolve(page,()=>recordChoice.selectOption(records[0]));
  }
  const detail=page.locator('[data-size-selected-id]');
  await detail.waitFor({state:'visible'});
  assert.match(await detail.innerText(),/正式サイズ確定/);
  assert.match(await detail.innerText(),/呼称/);
  assert.match(await detail.innerText(),/実寸/);
  return{widths,heights,id:await detail.getAttribute('data-size-selected-id'),code:await detail.locator('span strong').first().innerText()};
}
async function verifyFormalSizeList(page,formalCount){
  assert.equal(await page.locator('[data-size-list-record]').count(),formalCount,'Formal size list omitted current candidates');
  assert.match(await page.locator('[data-size-list-toggle]').innerText(),new RegExp(`全${formalCount}件`));
  await page.locator('[data-size-list-toggle]').click();
  assert.equal(await page.locator('[data-size-list-scroll]').isVisible(),true);
  assert.ok(await page.locator('.size-list-group').count()>0,'No W groups in formal size list');
}
async function verifyCodeSearch(page,selected){
  await page.locator('[data-size-search]').fill(selected.code);
  const results=page.locator('[data-size-search-result]');
  await results.waitFor({state:'visible'});
  const visibleValues=await results.locator('option').evaluateAll((options)=>options.filter((option)=>option.value&&!option.hidden).map((option)=>option.value));
  assert.ok(visibleValues.includes(selected.id),`Search did not retain selected formal record ${selected.id}`);
  assert.match(await page.locator('[data-size-search-count]').innerText(),/件/);
}
async function verifyWidthClear(page,selected){
  if(selected.widths.length<2)return false;
  await waitResolve(page,()=>page.locator('[data-size-width]').selectOption(selected.widths[1]));
  assert.equal(await page.locator('[data-size-height]').inputValue(),'');
  assert.equal(await page.locator('[data-size-selected-id]').count(),0);
  return true;
}
async function verifyUpstreamClear(page){
  const window=page.locator('[data-spec-key="window_type"]');
  const current=await window.inputValue();
  const alternative=await window.locator('option').evaluateAll((options,currentValue)=>options.map((option)=>option.value).find((value)=>value&&value!==currentValue)??'',current);
  if(!alternative)return false;
  await waitResolve(page,()=>window.selectOption(alternative));
  assert.equal(await page.locator('[data-size-selected-id]').count(),0,'Upstream window change retained an invalid formal size');
  return true;
}
async function standardFlow(page,product,artifactPrefix){
  await openProduct(page,product);
  const windowOptions=await page.locator('[data-spec-key="window_type"] option').evaluateAll((options)=>options.map((option)=>option.value).filter(Boolean));
  assert.equal(windowOptions.length,product.windowCount,`${product.label}: ACTIVE window count`);
  assert.match(await page.locator('[data-window-count]').innerText(),new RegExp(`${product.windowCount}種類`));
  await fillUpstreamUntilSize(page);
  assert.equal(await page.locator('select[data-spec-key="size"]').count(),0,'Legacy giant size select is still exposed');
  assert.equal(await page.locator('[data-size-width]').isVisible(),true);
  assert.equal(await page.locator('[data-size-height]').isVisible(),true);
  assert.equal(await page.locator('[data-size-search]').isVisible(),true);
  const countText=await page.locator('.size-count').innerText();
  const formalCount=Number(countText.match(/\d+/)?.[0]);
  assert.ok(formalCount>0,`Formal candidate count is missing: ${countText}`);
  await verifyFormalSizeList(page,formalCount);
  let selected=await chooseFirstFormalSize(page);
  assert.match(await page.locator('[data-size-context]').innerText(),/窓種/);
  assert.match(await page.locator('[data-size-height-count]').innerText(),/正式H/);
  await page.screenshot({path:`${OUT}/${artifactPrefix}-${product.id}-selected.png`,fullPage:true});
  await verifyCodeSearch(page,selected);
  const widthCleared=await verifyWidthClear(page,selected);
  if(widthCleared){
    await openProduct(page,product);
    await fillUpstreamUntilSize(page);
    selected=await chooseFirstFormalSize(page);
  }
  const upstreamCleared=await verifyUpstreamClear(page);
  await page.screenshot({path:`${OUT}/${artifactPrefix}-${product.id}.png`,fullPage:true});
  return{product:product.label,status:'PASS',activeWindowCount:windowOptions.length,formalCandidateCount:formalCount,widthCount:selected.widths.length,heightCount:selected.heights.length,recordId:selected.id,code:selected.code,widthClear:widthCleared,upstreamClear:upstreamCleared};
}
async function representativeWindowFlows(page,product){
  const rows=[];
  for(const windowType of product.windows){
    await openProduct(page,product);
    await selectSpec(page,'window_type',windowType);
    await fillUpstreamUntilSize(page);
    const countText=await page.locator('[data-size-candidate-count]').innerText();
    const formalCount=Number(countText.match(/\d+/)?.[0]);
    assert.ok(formalCount>0,`${product.label}:${windowType} has no formal size`);
    await verifyFormalSizeList(page,formalCount);
    const selected=await chooseFirstFormalSize(page);
    rows.push({windowType,status:'PASS',formalCandidateCount:formalCount,recordId:selected.id,code:selected.code});
  }
  return rows;
}
async function thermosCustomFlow(page){
  const product=PRODUCTS.find((row)=>row.id==='SER-LIX-SAMOSL');
  await openProduct(page,product);
  for(const [key,value] of [['window_type','WT-SL-YOKO-SUBERI'],['handle_type','SP-SL-YOKO-OP'],['size_mode','CUSTOM'],['construction','在来・204']])await selectSpec(page,key,value);
  assert.equal(await page.locator('[data-size-width]').count(),0);
  assert.equal(await page.locator('[data-size-height]').count(),0);
  assert.equal(await page.locator('[data-spec-key="size"]').count(),0);
  assert.equal(await page.locator('[data-spec-key="custom_width"]').getAttribute('type'),'number');
  assert.equal(await page.locator('[data-spec-key="custom_height"]').getAttribute('type'),'number');
  await selectSpec(page,'custom_width',300);
  await selectSpec(page,'custom_height',300);
  await page.waitForFunction(()=>document.querySelector('.notice.dimension')?.textContent.includes('○ 製作可能'));
  report.custom.push({product:product.label,case:'PASS',status:'PASS'});
  await selectSpec(page,'custom_width',299);
  await page.waitForFunction(()=>document.querySelector('.notice.dimension')?.textContent.includes('× 製作範囲外'));
  report.custom.push({product:product.label,case:'BLOCK',status:'PASS'});

  await selectSpec(page,'window_type','WT-SL-HIKICHIGAI');
  await selectSpec(page,'size_mode','CUSTOM');
  await selectSpec(page,'construction','在来・204・単純段差');
  await selectSpec(page,'custom_width',1000);
  await selectSpec(page,'custom_height',1000);
  await page.waitForFunction(()=>document.querySelector('.notice.dimension')?.textContent.includes('△ 発注前に原本・メーカー確認が必要'));
  assert.doesNotMatch(await page.locator('.notice.dimension').innerText(),/選択不可/);
  report.custom.push({product:product.label,case:'REVIEW_REQUIRED',status:'PASS'});
  await page.screenshot({path:`${OUT}/desktop-custom-review.png`,fullPage:true});
}
async function apw431CustomFlow(page){
  const product=PRODUCTS.find((row)=>row.id==='SER-YKK-APW431');
  await openProduct(page,product);
  for(const [key,value] of [['window_type','W431-001'],['region','北海道'],['configuration','2枚建'],['variant','標準'],['construction','在来'],['size_mode','CUSTOM']])await selectSpec(page,key,value);
  assert.equal(await page.locator('[data-size-width]').count(),0);
  assert.equal(await page.locator('[data-size-height]').count(),0);
  await selectSpec(page,'custom_width',1000);
  await selectSpec(page,'custom_height',1571);
  await page.waitForFunction(()=>document.querySelector('.notice.dimension')?.textContent.includes('○ 製作可能'));
  report.custom.push({product:product.label,case:'PASS',status:'PASS'});
  await selectSpec(page,'custom_width',999);
  await page.waitForFunction(()=>document.querySelector('.notice.dimension')?.textContent.includes('× 製作範囲外'));
  report.custom.push({product:product.label,case:'BLOCK',status:'PASS'});

  await selectSpec(page,'window_type','W431-003');
  for(const [key,value] of [['region','北海道'],['configuration','片引き'],['variant','均等タイプ'],['construction','在来'],['size_mode','CUSTOM'],['custom_width',1600],['custom_height',1571]])await selectSpec(page,key,value);
  await page.waitForFunction(()=>document.querySelector('.notice.dimension')?.textContent.includes('△ 発注前に原本・メーカー確認が必要'));
  report.custom.push({product:product.label,case:'REVIEW_REQUIRED',status:'PASS'});
  await page.screenshot({path:`${OUT}/desktop-apw431-custom-review.png`,fullPage:true});
}

try{
  const desktopContext=await browser.newContext({viewport:{width:1440,height:1000}});
  const desktop=await desktopContext.newPage();
  trackErrors(desktop,'desktop');
  for(const product of PRODUCTS){
    const result=await standardFlow(desktop,product,'desktop');
    result.representativeWindows=await representativeWindowFlows(desktop,product);
    report.desktop.push(result);
  }
  await thermosCustomFlow(desktop);
  await apw431CustomFlow(desktop);
  await desktopContext.close();

  const mobileContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const mobile=await mobileContext.newPage();
  trackErrors(mobile,'mobile');
  const mobileResult=await standardFlow(mobile,PRODUCTS.find((row)=>row.id==='SER-YKK-APW431'),'mobile');
  const overflow=await mobile.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  assert.ok(overflow<=1,`Mobile horizontal overflow: ${overflow}px`);
  const controlOverflow=await mobile.locator('#manufacturer,#product,#dynamicForm select,#dynamicForm input').evaluateAll((nodes)=>nodes.map((node)=>node.getBoundingClientRect().right-window.innerWidth));
  assert.ok(controlOverflow.every((value)=>value<=1),`Mobile control overflow: ${controlOverflow}`);
  report.mobile.push({...mobileResult,viewport:'390x844',horizontalOverflowPx:overflow});
  await mobileContext.close();

  assert.deepEqual(report.consoleErrors,[],'Browser console/page errors');
  report.status='PASS';
  await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}catch(error){
  report.status='FAIL';report.failure=error.stack??String(error);
  await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2));
  console.error(error);
  process.exitCode=1;
}finally{
  await browser.close();
}
