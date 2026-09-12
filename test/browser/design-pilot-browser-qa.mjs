import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4173';
const SHARE_TOKEN=process.env.VERCEL_SHARE_TOKEN;
const OUT='artifacts/design-pilot-browser-qa';
await mkdir(OUT,{recursive:true});
const report={status:'RUNNING',scenarios:{},consoleErrors:[],pageErrors:[],failedResponses:[]};
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
let page=await context.newPage();

function track(target){
  target.on('console',(message)=>{if(message.type()==='error')report.consoleErrors.push(message.text());});
  target.on('pageerror',(error)=>report.pageErrors.push(error.message));
  target.on('response',(response)=>{if(response.status()>=400)report.failedResponses.push({status:response.status(),url:response.url()});});
}
track(page);

async function goto(path){
  const suffix=SHARE_TOKEN?`${path}${path.includes('?')?'&':'?'}_vercel_share=${encodeURIComponent(SHARE_TOKEN)}`:path;
  await page.goto(`${BASE}${suffix}`,{waitUntil:'networkidle'});
}

async function assertNoOverflow(target,label){
  const overflow=await target.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  assert.ok(overflow<=1,`${label} overflow ${overflow}`);
}

try{
  await goto('/design-preview');
  assert.equal(await page.locator('h1').innerText(),'ホーム');
  assert.ok(await page.locator('.design-sidebar').isVisible());
  assert.match(await page.locator('body').evaluate((node)=>getComputedStyle(node).fontFamily),/Noto Sans JP/);
  assert.ok(await page.locator('.notice-item').count()>=4);
  await assertNoOverflow(page,'desktop home');
  await page.screenshot({path:`${OUT}/desktop-home-light-1440x1000.png`,fullPage:true});
  report.scenarios.DESKTOP_HOME_LIGHT='PASS';

  await page.locator('#themeSelect').selectOption('dark');
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark');
  assert.equal(await page.evaluate(()=>localStorage.getItem('sash.ui-theme')),'dark');
  await page.screenshot({path:`${OUT}/desktop-home-dark-1440x1000.png`,fullPage:true});
  report.scenarios.DARK_THEME='PASS';

  await page.getByRole('link',{name:'商品選定'}).first().click();
  await page.waitForURL(/\/design-preview\/product$/);
  await page.waitForSelector('#manufacturer');
  await page.locator('#manufacturer').selectOption('LIXIL');
  const productValue=await page.locator('#product option:not([value=""]):not([disabled])').first().getAttribute('value');
  assert.ok(productValue,'selectable LIXIL product required');
  const resolve=page.waitForResponse((response)=>response.url().includes('/resolve')&&response.status()===200);
  await page.locator('#product').selectOption(productValue);
  await resolve;
  await page.waitForFunction(()=>document.querySelector('#previewProductTitle')?.textContent!=='商品を選択してください');
  assert.notEqual(await page.locator('#previewProductTitle').innerText(),'商品を選択してください');
  assert.ok(await page.locator('.preview-window').isVisible());
  await assertNoOverflow(page,'desktop product');
  await page.screenshot({path:`${OUT}/desktop-product-dark-1440x1000.png`,fullPage:true});
  report.scenarios.PRODUCT_SELECTION_RUNTIME='PASS';

  const landscape=await context.newPage();track(landscape);await landscape.setViewportSize({width:1024,height:768});
  await landscape.goto(`${BASE}/design-preview/product`,{waitUntil:'networkidle'});
  await landscape.locator('#themeSelect').selectOption('light');
  const formBox=await landscape.locator('.product-form-stack').boundingBox();
  const previewBox=await landscape.locator('.product-preview').boundingBox();
  assert.ok(formBox&&previewBox&&previewBox.x>formBox.x,'iPad landscape should keep two-column product layout');
  await assertNoOverflow(landscape,'iPad landscape');
  await landscape.screenshot({path:`${OUT}/ipad-landscape-product-1024x768.png`,fullPage:true});
  report.scenarios.IPAD_LANDSCAPE='PASS';
  await landscape.close();

  const portrait=await context.newPage();track(portrait);await portrait.setViewportSize({width:768,height:1024});
  await portrait.goto(`${BASE}/design-preview/product`,{waitUntil:'networkidle'});
  const portraitForm=await portrait.locator('.product-form-stack').boundingBox();
  const portraitPreview=await portrait.locator('.product-preview').boundingBox();
  assert.ok(portraitForm&&portraitPreview&&portraitPreview.y>portraitForm.y,'iPad portrait should stack preview below form');
  assert.ok(await portrait.locator('#manufacturer').evaluate((node)=>getComputedStyle(node).minHeight==='44px'));
  await assertNoOverflow(portrait,'iPad portrait');
  await portrait.screenshot({path:`${OUT}/ipad-portrait-product-768x1024.png`,fullPage:true});
  report.scenarios.IPAD_PORTRAIT='PASS';
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
