import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4173';
const SHARE_TOKEN=process.env.VERCEL_SHARE_TOKEN;
const PRODUCT_ID='SER-LIXIL-RECHENT-D3-NF';
const OUT='artifacts/rechent-entry-door-cover-global-flow-browser-qa';
const STAGES=['PRODUCT','OPENING','CONFIGURATION','SIZE','FINISH','SCREEN','GLAZING','INSTALLATION_SURVEY','OPTION'];
const STAGE_INDEX=new Map(STAGES.map((stage,index)=>[stage,index]));
const VIEWPORTS={
  desktop:{viewport:{width:1440,height:1000}},
  smartphone:{viewport:{width:390,height:844},isMobile:true,hasTouch:true},
};
await mkdir(OUT,{recursive:true});

function assertSemanticOrder(result,label){
  let previous=-1;
  for(const field of result.fields??[]){
    assert.ok(field.semanticSlot,`${label}:${field.key}:semanticSlot missing`);
    assert.ok(field.semanticStage,`${label}:${field.key}:semanticStage missing`);
    assert.equal(String(field.semanticSlot).startsWith('other:'),false,`${label}:${field.key}:other fallback`);
    const current=STAGE_INDEX.get(field.semanticStage);
    assert.notEqual(current,undefined,`${label}:${field.key}:unknown stage ${field.semanticStage}`);
    assert.ok(current>=previous,`${label}:${field.key}:stage inversion`);
    previous=current;
  }
}

const report={status:'RUNNING',productId:PRODUCT_ID,viewportResults:{},consoleErrors:[],pageErrors:[],failedResponses:[],transitionChecks:0,domSignatureChecks:0};
const browser=await chromium.launch({headless:true});

async function assertDomSignature(page,result,label){
  assertSemanticOrder(result,label);
  const domKeys=await page.locator('#dynamicForm .field[data-key]').evaluateAll((nodes)=>nodes.map((node)=>node.dataset.key));
  const resultKeys=(result.fields??[]).map((field)=>field.key);
  assert.deepEqual(domKeys,resultKeys,`${label}:DOM key sequence differs from resolver Global Flow sequence`);
  const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-window.innerWidth));
  assert.ok(overflow<=1,`${label}:horizontal overflow ${overflow}`);
  report.domSignatureChecks+=1;
}

async function installAndSelect(page){
  const entry=SHARE_TOKEN?`${BASE}/runtime-lab?_vercel_share=${encodeURIComponent(SHARE_TOKEN)}`:`${BASE}/runtime-lab`;
  await page.goto(entry,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent==='CATALOG CONNECTED');
  await page.selectOption('#manufacturer','LIXIL');
  await page.waitForFunction((id)=>[...document.querySelectorAll('#product option')].some((option)=>option.value===id),PRODUCT_ID);
  const resolved=page.waitForResponse((response)=>response.url().includes('/api/runtime-master/resolve')&&response.status()===200);
  await page.selectOption('#product',PRODUCT_ID);
  return (await resolved).json();
}

async function runViewport(name,options){
  const context=await browser.newContext(options);
  const page=await context.newPage();
  page.on('console',(message)=>{if(message.type()==='error')report.consoleErrors.push({viewport:name,text:message.text()});});
  page.on('pageerror',(error)=>report.pageErrors.push({viewport:name,text:error.message}));
  page.on('response',(response)=>{if(response.status()>=400&&!response.url().includes('favicon'))report.failedResponses.push({viewport:name,status:response.status(),url:response.url()});});
  try{
    let result=await installAndSelect(page);
    assert.equal(result.productId,PRODUCT_ID);
    await assertDomSignature(page,result,`${name}:initial`);
    const visited=new Set();
    let transitions=0;
    for(let step=0;step<16;step+=1){
      const field=(result.fields??[]).find((candidate)=>{
        if(candidate.readOnly||visited.has(candidate.key)||candidate.dataType==='NUMBER'||candidate.dataType==='TEXT')return false;
        return (candidate.values??[]).some((choice)=>choice.disabled!==true);
      });
      if(!field)break;
      visited.add(field.key);
      const choices=(field.values??[]).filter((choice)=>choice.disabled!==true);
      if(!choices.length)continue;
      const locator=page.locator(`#dynamicForm [data-spec-key="${field.key}"]`);
      if(await locator.count()===0)continue;
      const first=field.dataType==='MULTI_ENUM'?[String(choices[0].value)]:String(choices[0].value);
      const responsePromise=page.waitForResponse((response)=>response.url().includes('/api/runtime-master/resolve')&&response.status()===200);
      await locator.selectOption(first);
      result=await (await responsePromise).json();
      await assertDomSignature(page,result,`${name}:set:${field.key}`);
      transitions+=1;report.transitionChecks+=1;
      if(choices.length>1&&await page.locator(`#dynamicForm [data-spec-key="${field.key}"]`).count()){
        const second=field.dataType==='MULTI_ENUM'?[String(choices[1].value)]:String(choices[1].value);
        const changePromise=page.waitForResponse((response)=>response.url().includes('/api/runtime-master/resolve')&&response.status()===200);
        await page.locator(`#dynamicForm [data-spec-key="${field.key}"]`).selectOption(second);
        result=await (await changePromise).json();
        await assertDomSignature(page,result,`${name}:change:${field.key}`);
        transitions+=1;report.transitionChecks+=1;
      }
    }
    assert.ok(transitions>0,`${name}: expected at least one Rechent transition`);
    report.viewportResults[name]={transitions,finalSignature:(result.fields??[]).map((field)=>`${field.semanticStage}:${field.semanticSlot}`)};
  }finally{
    await context.close();
  }
}

try{
  const requestContext=await browser.newContext();
  const integrationsResponse=await requestContext.request.get(`${BASE}/api/runtime-master/integrations`);
  assert.equal(integrationsResponse.status(),200);
  const integrations=await integrationsResponse.json();
  const rechent=integrations.find((row)=>row.id===PRODUCT_ID);
  assert.ok(rechent,'Rechent integration missing');
  assert.equal(rechent.selectable,true);
  assert.equal(rechent.status,'READY');
  assert.equal(rechent.uiCategory,'ENTRY_DOOR_COVER');
  await requestContext.close();

  for(const [name,options] of Object.entries(VIEWPORTS))await runViewport(name,options);
  assert.deepEqual(report.consoleErrors,[]);
  assert.deepEqual(report.pageErrors,[]);
  assert.deepEqual(report.failedResponses,[]);
  assert.ok(report.transitionChecks>=2,`expected Rechent transition on both viewports, got ${report.transitionChecks}`);
  assert.ok(report.domSignatureChecks>=4,`expected Rechent initial+transition DOM signatures, got ${report.domSignatureChecks}`);
  report.status='PASS';
  await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}catch(error){
  report.status='FAIL';report.failure=error.stack??String(error);
  await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2));
  throw error;
}finally{
  await browser.close();
}
