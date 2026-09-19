import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4173';
const SHARE_TOKEN=process.env.VERCEL_SHARE_TOKEN;
const OUT='artifacts/global-window-selection-flow-browser-qa';
const STAGES=['PRODUCT','OPENING','CONFIGURATION','SIZE','FINISH','SCREEN','GLAZING','INSTALLATION_SURVEY','OPTION'];
const STAGE_INDEX=new Map(STAGES.map((stage,index)=>[stage,index]));
const WINDOW_UI_CATEGORIES=new Set(['NEW_CONSTRUCTION_EXTERIOR_WINDOW','INNER_WINDOW']);
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

const report={status:'RUNNING',exactHead:process.env.HEAD_SHA??process.env.GITHUB_SHA??null,viewportResults:{},consoleErrors:[],pageErrors:[],failedResponses:[],integrationCount:0,windowCoverageChecks:0,transitionChecks:0,domSignatureChecks:0};
const browser=await chromium.launch({headless:true});

async function installAndSelect(page,integration){
  const entry=SHARE_TOKEN?`${BASE}/runtime-lab?_vercel_share=${encodeURIComponent(SHARE_TOKEN)}`:`${BASE}/runtime-lab`;
  await page.goto(entry,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent==='CATALOG CONNECTED');
  await page.selectOption('#manufacturer',integration.manufacturer);
  await page.waitForFunction((id)=>[...document.querySelectorAll('#product option')].some((option)=>option.value===id),integration.id);
  const resolved=page.waitForResponse((response)=>response.url().includes('/api/runtime-master/resolve')&&response.status()===200);
  await page.selectOption('#product',integration.id);
  const response=await resolved;
  return response.json();
}

async function assertDomSignature(page,result,label){
  assertSemanticOrder(result,label);
  const domKeys=await page.locator('#dynamicForm .field[data-key]').evaluateAll((nodes)=>nodes.map((node)=>node.dataset.key));
  const resultKeys=(result.fields??[]).map((field)=>field.key);
  assert.deepEqual(domKeys,resultKeys,`${label}:DOM key sequence differs from resolver Global Flow sequence`);
  const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-window.innerWidth));
  assert.ok(overflow<=1,`${label}:horizontal overflow ${overflow}`);
  report.domSignatureChecks+=1;
}

async function runViewport(name,contextOptions,integrations){
  const context=await browser.newContext(contextOptions);
  const page=await context.newPage();
  page.on('console',(message)=>{if(message.type()==='error')report.consoleErrors.push({viewport:name,text:message.text()});});
  page.on('pageerror',(error)=>report.pageErrors.push({viewport:name,text:error.message}));
  page.on('response',(response)=>{if(response.status()>=400&&!response.url().includes('favicon'))report.failedResponses.push({viewport:name,status:response.status(),url:response.url()});});
  const rows=[];
  try{
    for(const integration of integrations){
      let result=await installAndSelect(page,integration);
      await assertDomSignature(page,result,`${name}:${integration.id}:initial`);
      const windowField=(result.fields??[]).find((field)=>field.key==='window_type');
      const windowChoices=(windowField?.values??[]).filter((choice)=>choice.disabled!==true);
      assert.ok(windowChoices.length>0,`${name}:${integration.id}:window_type choices missing`);
      let windowChecks=0;
      for(const choice of windowChoices){
        const locator=page.locator('#dynamicForm [data-spec-key="window_type"]');
        assert.equal(await locator.count(),1,`${name}:${integration.id}:window_type DOM selector missing`);
        const responsePromise=page.waitForResponse((response)=>response.url().includes('/api/runtime-master/resolve')&&response.status()===200);
        await locator.selectOption(String(choice.value));
        result=await (await responsePromise).json();
        assert.equal(String(result.selection?.window_type),String(choice.value),`${name}:${integration.id}:${choice.value}:window selection did not stick`);
        await assertDomSignature(page,result,`${name}:${integration.id}:window:${choice.value}`);
        windowChecks+=1;
        report.windowCoverageChecks+=1;
      }
      const visited=new Set();
      let transitions=0;
      for(let step=0;step<12;step+=1){
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
        await assertDomSignature(page,result,`${name}:${integration.id}:set:${field.key}`);
        transitions+=1;report.transitionChecks+=1;

        if(choices.length>1&&await page.locator(`#dynamicForm [data-spec-key="${field.key}"]`).count()){
          const second=field.dataType==='MULTI_ENUM'?[String(choices[1].value)]:String(choices[1].value);
          const changePromise=page.waitForResponse((response)=>response.url().includes('/api/runtime-master/resolve')&&response.status()===200);
          await page.locator(`#dynamicForm [data-spec-key="${field.key}"]`).selectOption(second);
          result=await (await changePromise).json();
          await assertDomSignature(page,result,`${name}:${integration.id}:change:${field.key}`);
          transitions+=1;report.transitionChecks+=1;
        }
      }
      rows.push({id:integration.id,windowCount:windowChecks,transitions,finalSignature:(result.fields??[]).map((field)=>`${field.semanticStage}:${field.semanticSlot}`)});
    }
  }finally{
    await context.close();
  }
  report.viewportResults[name]=rows;
}

try{
  const requestContext=await browser.newContext();
  const integrationsResponse=await requestContext.request.get(`${BASE}/api/runtime-master/integrations`);
  assert.equal(integrationsResponse.status(),200);
  const integrations=(await integrationsResponse.json()).filter((row)=>row.selectable&&row.status==='READY'&&WINDOW_UI_CATEGORIES.has(row.uiCategory));
  await requestContext.close();
  assert.equal(integrations.length,8,'Global Window Flow must cover exactly eight READY window Runtime integrations');
  report.integrationCount=integrations.length;

  for(const [name,options] of Object.entries(VIEWPORTS))await runViewport(name,options,integrations);

  assert.deepEqual(report.consoleErrors,[]);
  assert.deepEqual(report.pageErrors,[]);
  assert.deepEqual(report.failedResponses,[]);
  for(const name of Object.keys(VIEWPORTS)){
    const count=(report.viewportResults[name]??[]).reduce((sum,row)=>sum+(row.windowCount??0),0);
    assert.equal(count,113,`${name}: expected all 113 current window types, got ${count}`);
  }
  assert.equal(report.windowCoverageChecks,226,`expected 113 windows × 2 viewports, got ${report.windowCoverageChecks}`);
  assert.ok(report.transitionChecks>=16,`expected at least one transition per window integration per viewport, got ${report.transitionChecks}`);
  assert.ok(report.domSignatureChecks>=258,`expected initial + 113 window checks per viewport + transitions, got ${report.domSignatureChecks}`);
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
