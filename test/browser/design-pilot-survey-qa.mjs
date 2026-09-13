import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4173';
const SHARE_TOKEN=process.env.VERCEL_SHARE_TOKEN;
const OUT='artifacts/design-pilot-survey-qa';
await mkdir(OUT,{recursive:true});
const report={status:'RUNNING',scenarios:{},consoleErrors:[],pageErrors:[],failedResponses:[]};
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();

function track(target){
  target.on('console',(message)=>{if(message.type()==='error')report.consoleErrors.push(message.text());});
  target.on('pageerror',(error)=>report.pageErrors.push(error.message));
  target.on('response',(response)=>{if(response.status()>=400)report.failedResponses.push({status:response.status(),url:response.url()});});
}
track(page);

async function goto(target,path){
  const suffix=SHARE_TOKEN?`${path}${path.includes('?')?'&':'?'}_vercel_share=${encodeURIComponent(SHARE_TOKEN)}`:path;
  await target.goto(`${BASE}${suffix}`,{waitUntil:'networkidle'});
}

async function assertNoOverflow(target,label){
  const overflow=await target.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  assert.ok(overflow<=1,`${label} overflow ${overflow}`);
}

function rgbIsNearWhite(value){
  const match=String(value).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if(!match)return false;
  return Number(match[1])>245&&Number(match[2])>245&&Number(match[3])>245;
}

try{
  await goto(page,'/design-preview?view=survey');
  await page.waitForSelector('#surveyPilotRoot');
  assert.equal(await page.getByRole('heading',{name:'現場で測る、その場で残す'}).innerText(),'現場で測る、その場で残す');
  assert.ok(await page.locator('.design-nav a[data-section="survey"]').evaluate((node)=>node.classList.contains('active')));
  assert.equal(await page.locator('.survey-opening-button').count(),3);
  assert.match(await page.locator('.survey-footer-note').innerText(),/Sample only/);
  assert.equal(await page.locator('.survey-diagram').getAttribute('data-active'),'w');
  assert.match(await page.locator('.dimension-text-w').innerText(),/W 1690 mm/);
  await assertNoOverflow(page,'desktop survey initial');
  await page.screenshot({path:`${OUT}/desktop-survey-light-1440x1000.png`,fullPage:true});
  report.scenarios.SURVEY_DESKTOP_LIGHT='PASS';

  await page.locator('#surveyHeight').focus();
  assert.equal(await page.locator('.survey-diagram').getAttribute('data-active'),'h');
  assert.equal(await page.locator('.survey-active-chip').innerText(),'H を入力中');
  report.scenarios.MEASUREMENT_FOCUS_LINK='PASS';

  await page.locator('#surveyWidth').fill('1720');
  assert.match(await page.locator('.dimension-text-w').innerText(),/W 1720 mm/);
  report.scenarios.MEASUREMENT_VALUE_LINK='PASS';

  await page.locator('.survey-opening-button').nth(1).click();
  assert.match(await page.locator('.survey-form-head h2').innerText(),/洋室/);
  assert.equal(await page.locator('.survey-form-status').innerText(),'採寸完了');
  assert.equal(await page.locator('#surveyWidth').inputValue(),'1650');
  report.scenarios.OPENING_SWITCH='PASS';

  await page.locator('.survey-opening-button').nth(2).click();
  assert.equal(await page.locator('.survey-form-status').innerText(),'未着手');
  const progressBefore=await page.locator('.survey-progress b').innerText();
  await page.getByRole('button',{name:'この開口の採寸を完了',exact:true}).click();
  assert.equal(await page.locator('.survey-form-status').innerText(),'採寸完了');
  const progressAfter=await page.locator('.survey-progress b').innerText();
  assert.notEqual(progressAfter,progressBefore);
  report.scenarios.OPENING_COMPLETE_STATE='PASS';

  await page.locator('#themeSelect').selectOption('dark');
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark');
  const darkSurfaces=await page.evaluate(()=>{
    const selectors=['.survey-form','.survey-input','.survey-diagram-panel','.survey-project-bar'];
    return selectors.map((selector)=>({selector,bg:getComputedStyle(document.querySelector(selector)).backgroundColor}));
  });
  for(const surface of darkSurfaces)assert.ok(!rgbIsNearWhite(surface.bg),`dark surface stayed near-white: ${surface.selector} ${surface.bg}`);
  await page.screenshot({path:`${OUT}/desktop-survey-dark-1440x1000.png`,fullPage:true});
  report.scenarios.SURVEY_DESKTOP_DARK='PASS';
  report.scenarios.DARK_TOKEN_INTEGRITY='PASS';

  const portrait=await context.newPage();track(portrait);await portrait.setViewportSize({width:768,height:1024});
  await goto(portrait,'/design-preview?view=survey');
  await portrait.locator('#themeSelect').selectOption('light');
  await portrait.waitForSelector('#surveyPilotRoot');
  const formBox=await portrait.locator('.survey-form').boundingBox();
  const diagramBox=await portrait.locator('.survey-diagram-panel').boundingBox();
  assert.ok(formBox&&diagramBox&&diagramBox.y>formBox.y,'iPad portrait should stack measurement diagram below the form');
  const openingStrip=await portrait.locator('.survey-opening-list').evaluate((node)=>({scrollWidth:node.scrollWidth,clientWidth:node.clientWidth}));
  assert.ok(openingStrip.scrollWidth>=openingStrip.clientWidth,'opening strip should remain touch-scrollable');
  const inputHeight=await portrait.locator('#surveyWidth').evaluate((node)=>parseFloat(getComputedStyle(node).height));
  const actionHeight=await portrait.getByRole('button',{name:'この開口の採寸を完了',exact:true}).evaluate((node)=>parseFloat(getComputedStyle(node).height));
  assert.ok(inputHeight>=44,`W input touch target too small: ${inputHeight}`);
  assert.ok(actionHeight>=44,`complete action touch target too small: ${actionHeight}`);
  await portrait.locator('#surveyHeight').focus();
  assert.equal(await portrait.locator('.survey-diagram').getAttribute('data-active'),'h');
  await assertNoOverflow(portrait,'iPad portrait survey');
  await portrait.screenshot({path:`${OUT}/ipad-portrait-survey-768x1024.png`,fullPage:true});
  report.scenarios.IPAD_PORTRAIT_SURVEY='PASS';
  report.scenarios.TOUCH_TARGETS='PASS';
  await portrait.close();

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
}finally{
  await context.close();await browser.close();
}
