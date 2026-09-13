import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4173';
const SHARE_TOKEN=process.env.VERCEL_SHARE_TOKEN;
const OUT='artifacts/design-pilot-guide-qa';
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
  await goto(page,'/design-preview?view=guide');
  await page.waitForSelector('#guidePilotRoot');
  assert.equal(await page.getByRole('heading',{name:'迷ったときだけ、すぐ確認できる商品選定'}).innerText(),'迷ったときだけ、すぐ確認できる商品選定');
  assert.ok(await page.locator('.design-nav a[data-section="guide"]').evaluate((node)=>node.classList.contains('active')));
  assert.equal(await page.locator('.guide-field').count(),6);
  assert.ok(await page.getByText('必要なときだけ確認',{exact:true}).isVisible());
  assert.match(await page.locator('.proposal-footer-note').innerText(),/正式Runtime \/ Evidence/);
  await assertNoOverflow(page,'desktop guide initial');
  await page.screenshot({path:`${OUT}/desktop-guide-light-1440x1000.png`,fullPage:true});
  report.scenarios.GUIDE_DESKTOP_LIGHT='PASS';
  report.scenarios.INFORMATION_HIERARCHY='PASS';

  await page.getByRole('button',{name:'Low-E性能の説明を開く',exact:true}).click();
  assert.equal(await page.locator('.context-guide-head h2').innerText(),'Low-E性能');
  assert.equal(await page.locator('.context-guide-tab').count(),4);
  assert.match(await page.locator('.context-guide-content').innerText(),/Low-E性能とは/);
  report.scenarios.CONTEXT_GUIDE_INLINE_OPEN='PASS';

  await page.getByRole('button',{name:'選択条件',exact:true}).click();
  assert.equal(await page.locator('.context-guide-content li').count(),3);
  assert.match(await page.locator('.context-guide-content').innerText(),/対象商品で正式に選択可能か/);
  await page.getByRole('button',{name:'根拠',exact:true}).click();
  assert.match(await page.locator('.context-guide-content').innerText(),/メーカー資料・商品マスターEvidence/);
  report.scenarios.SECONDARY_TO_DETAIL='PASS';

  await page.getByRole('button',{name:'確認して入力へ戻る',exact:true}).click();
  assert.ok(await page.getByText('必要なときだけ確認',{exact:true}).isVisible());
  report.scenarios.RETURN_TO_INPUT='PASS';

  const detailToggle=page.locator('[data-guide-detail]');
  await detailToggle.click();
  assert.equal(await detailToggle.getAttribute('aria-expanded'),'true');
  assert.ok(await page.locator('[data-guide-detail-panel]').isVisible());
  assert.match(await page.locator('[data-guide-detail-panel]').innerText(),/REVIEW_REQUIRED \/ MANUAL_CHECK/);
  report.scenarios.DETAIL_PROGRESSIVE_DISCLOSURE='PASS';

  await page.locator('#themeSelect').selectOption('dark');
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark');
  await page.getByRole('button',{name:'スペーサーの説明を開く',exact:true}).click();
  await page.screenshot({path:`${OUT}/desktop-guide-dark-1440x1000.png`,fullPage:true});
  report.scenarios.GUIDE_DESKTOP_DARK='PASS';

  const portrait=await context.newPage();track(portrait);await portrait.setViewportSize({width:768,height:1024});
  await goto(portrait,'/design-preview?view=guide');
  await portrait.locator('#themeSelect').selectOption('light');
  await portrait.waitForSelector('#guidePilotRoot');
  await portrait.getByRole('button',{name:'サイズ方式の説明を開く',exact:true}).click();
  const formBox=await portrait.locator('.guide-form-panel').boundingBox();
  const guideBox=await portrait.locator('.context-guide-panel').boundingBox();
  assert.ok(formBox&&guideBox&&guideBox.y>formBox.y,'iPad portrait should stack Context Guide below the input form');
  assert.equal(await portrait.getByRole('button',{name:'サイズ方式の説明を開く',exact:true}).evaluate((node)=>getComputedStyle(node).width),'24px');
  await assertNoOverflow(portrait,'iPad portrait guide');
  await portrait.screenshot({path:`${OUT}/ipad-portrait-guide-768x1024.png`,fullPage:true});
  report.scenarios.IPAD_PORTRAIT_GUIDE='PASS';
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
