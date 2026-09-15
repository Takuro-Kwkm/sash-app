import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4173';
const SHARE_TOKEN=process.env.VERCEL_SHARE_TOKEN;
const OUT='artifacts/design-pilot-estimate-qa';
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

try{
  await goto(page,'/design-preview?view=estimate');
  await page.waitForSelector('.estimate-workbench');
  assert.equal(await page.getByRole('heading',{name:'見積確認・顧客提案'}).innerText(),'見積確認・顧客提案');
  assert.ok(await page.locator('.design-nav a[data-section="estimate"]').evaluate((node)=>node.classList.contains('active')));
  assert.equal(await page.locator('.estimate-summary-card').count(),4);
  assert.equal(await page.locator('.estimate-item-row').count(),3);
  assert.equal(await page.locator('.estimate-visual').count(),1);
  assert.match(await page.locator('.fallback-caption').innerText(),/FORMAL IMAGE NOT CONNECTED/);
  assert.match(await page.locator('.estimate-product-title strong').innerText(),/Sample Window A/);
  await assertNoOverflow(page,'desktop estimate');
  await page.screenshot({path:`${OUT}/desktop-estimate-light-1440x1000.png`,fullPage:true});
  report.scenarios.ESTIMATE_DESKTOP_LIGHT='PASS';
  report.scenarios.IMAGE_FALLBACK='PASS';

  await page.locator('.estimate-item-row').nth(1).click();
  assert.equal(await page.locator('.estimate-product-title strong').innerText(),'Sample Window B');
  assert.ok(await page.locator('.fallback-drawing').isVisible());
  report.scenarios.ESTIMATE_SELECTION_DETAIL='PASS';

  await page.getByRole('button',{name:'顧客提案プレビュー',exact:true}).click();
  assert.equal(await page.locator('.proposal-card').count(),3);
  assert.match(await page.locator('.proposal-cover').innerText(),/窓・玄関ドア ご提案イメージ/);
  assert.match(await page.locator('.proposal-footer-note').innerText(),/Sample \/ Placeholder/);
  await assertNoOverflow(page,'desktop proposal');
  await page.screenshot({path:`${OUT}/desktop-proposal-light-1440x1000.png`,fullPage:true});
  report.scenarios.PROPOSAL_VISUAL_DESKTOP='PASS';

  await page.locator('#themeSelect').selectOption('dark');
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark');
  await page.screenshot({path:`${OUT}/desktop-proposal-dark-1440x1000.png`,fullPage:true});
  report.scenarios.PROPOSAL_VISUAL_DARK='PASS';

  const portrait=await context.newPage();track(portrait);await portrait.setViewportSize({width:768,height:1024});
  await goto(portrait,'/design-preview?view=estimate');
  await portrait.locator('#themeSelect').selectOption('light');
  await portrait.waitForSelector('.estimate-workbench');
  const listBox=await portrait.locator('.estimate-list-panel').boundingBox();
  const detailBox=await portrait.locator('.estimate-detail').boundingBox();
  assert.ok(listBox&&detailBox&&detailBox.y>listBox.y,'iPad portrait should stack estimate detail below list');
  assert.equal(await portrait.getByRole('button',{name:'顧客提案プレビュー',exact:true}).evaluate((node)=>getComputedStyle(node).minHeight),'44px');
  await assertNoOverflow(portrait,'iPad portrait estimate');
  await portrait.screenshot({path:`${OUT}/ipad-portrait-estimate-768x1024.png`,fullPage:true});
  report.scenarios.IPAD_PORTRAIT_ESTIMATE='PASS';
  await portrait.getByRole('button',{name:'顧客提案プレビュー',exact:true}).click();
  assert.equal(await portrait.locator('.proposal-card').count(),3);
  await assertNoOverflow(portrait,'iPad portrait proposal');
  await portrait.screenshot({path:`${OUT}/ipad-portrait-proposal-768x1024.png`,fullPage:true});
  report.scenarios.IPAD_PORTRAIT_PROPOSAL='PASS';
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
