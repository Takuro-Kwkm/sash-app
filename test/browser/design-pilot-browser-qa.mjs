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

async function goto(target,path){
  const suffix=SHARE_TOKEN?`${path}${path.includes('?')?'&':'?'}_vercel_share=${encodeURIComponent(SHARE_TOKEN)}`:path;
  await target.goto(`${BASE}${suffix}`,{waitUntil:'networkidle'});
}

async function assertNoOverflow(target,label){
  const overflow=await target.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  assert.ok(overflow<=1,`${label} overflow ${overflow}`);
}

try{
  await goto(page,'/design-preview');
  assert.equal(await page.locator('#homeHeroTitle').innerText(),'暮らしをつくる、マドとトビラで。');
  assert.equal(await page.locator('.home-hero-kicker').innerText(),'サッシ業務を、もっと分かりやすく。');
  assert.ok(await page.locator('.design-sidebar').isVisible());
  assert.ok(await page.locator('.hero-architecture-svg').isVisible());
  assert.match(await page.locator('body').evaluate((node)=>getComputedStyle(node).fontFamily),/Noto Sans JP/);
  assert.equal(await page.locator('.announcement-item').count(),3);
  const primaryCtaText=(await page.getByRole('link',{name:/案件を新規作成/}).first().innerText()).replace(/\s+/g,'');
  assert.equal(primaryCtaText,'＋案件を新規作成');
  assert.equal(await page.getByRole('link',{name:'前回の続き'}).count(),0);
  const heroTitleSize=Number.parseFloat(await page.locator('#homeHeroTitle').evaluate((node)=>getComputedStyle(node).fontSize));
  assert.ok(heroTitleSize<=32,'hero title should remain a medium-sized heading');
  await assertNoOverflow(page,'desktop home');
  await page.screenshot({path:`${OUT}/desktop-home-light-1440x1000.png`,fullPage:true});
  report.scenarios.DESKTOP_HOME_LIGHT='PASS';
  report.scenarios.HERO_READABILITY_AND_CTA='PASS';
  report.scenarios.ANNOUNCEMENTS='PASS';

  await page.locator('#themeSelect').selectOption('dark');
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark');
  assert.equal(await page.evaluate(()=>localStorage.getItem('sash.ui-theme')),'dark');
  await page.screenshot({path:`${OUT}/desktop-home-dark-1440x1000.png`,fullPage:true});
  report.scenarios.DESKTOP_HOME_DARK='PASS';

  const homeLandscape=await context.newPage();track(homeLandscape);await homeLandscape.setViewportSize({width:1024,height:768});
  await goto(homeLandscape,'/design-preview');
  await homeLandscape.locator('#themeSelect').selectOption('light');
  assert.ok(await homeLandscape.locator('.hero-architecture-svg').isVisible());
  assert.equal(await homeLandscape.locator('.announcement-item').count(),3);
  await assertNoOverflow(homeLandscape,'iPad landscape home');
  await homeLandscape.screenshot({path:`${OUT}/ipad-landscape-home-1024x768.png`,fullPage:true});
  report.scenarios.IPAD_LANDSCAPE_HOME='PASS';
  await homeLandscape.close();

  const homePortrait=await context.newPage();track(homePortrait);await homePortrait.setViewportSize({width:768,height:1024});
  await goto(homePortrait,'/design-preview');
  await homePortrait.locator('#themeSelect').selectOption('light');
  const portraitHero=await homePortrait.locator('.home-hero').boundingBox();
  const portraitImage=await homePortrait.locator('.hero-architecture').boundingBox();
  assert.ok(portraitHero&&portraitImage&&portraitImage.y>portraitHero.y+portraitHero.height*0.35,'iPad portrait hero image should sit below the copy region');
  await assertNoOverflow(homePortrait,'iPad portrait home');
  await homePortrait.screenshot({path:`${OUT}/ipad-portrait-home-768x1024.png`,fullPage:true});
  report.scenarios.IPAD_PORTRAIT_HOME='PASS';
  await homePortrait.close();

  await page.locator('#themeSelect').selectOption('light');
  await page.getByRole('link',{name:'すべて見る'}).click();
  await page.waitForURL(/\/design-preview\/notifications$/);
  assert.equal(await page.locator('.notification-row').count(),6);
  assert.ok(await page.locator('#notificationDetail').isVisible());
  assert.match(await page.locator('#notificationDetail').innerText(),/Sample Data/);
  await page.getByRole('button',{name:'商品マスター',exact:true}).click();
  assert.equal(await page.locator('.notification-row').count(),1);
  assert.match(await page.locator('#notificationDetail').innerText(),/商品仕様・商品マスター更新/);
  await page.getByRole('button',{name:'すべて',exact:true}).click();
  assert.equal(await page.locator('.notification-row').count(),6);
  await page.locator('.notification-row').nth(2).click();
  assert.match(await page.locator('#notificationDetail h2').innerText(),/廃番・販売終了情報/);
  await assertNoOverflow(page,'desktop notifications');
  await page.screenshot({path:`${OUT}/desktop-notifications-light-1440x1000.png`,fullPage:true});
  report.scenarios.NOTIFICATIONS_DESKTOP='PASS';
  report.scenarios.NOTIFICATION_FILTER_AND_DETAIL='PASS';

  const notificationPortrait=await context.newPage();track(notificationPortrait);await notificationPortrait.setViewportSize({width:768,height:1024});
  await goto(notificationPortrait,'/design-preview/notifications');
  await notificationPortrait.locator('#themeSelect').selectOption('light');
  const notificationListBox=await notificationPortrait.locator('.notification-panel').boundingBox();
  const notificationDetailBox=await notificationPortrait.locator('.notification-detail').boundingBox();
  assert.ok(notificationListBox&&notificationDetailBox&&notificationDetailBox.y>notificationListBox.y,'iPad portrait should stack notification detail below list');
  await assertNoOverflow(notificationPortrait,'iPad portrait notifications');
  await notificationPortrait.screenshot({path:`${OUT}/ipad-portrait-notifications-768x1024.png`,fullPage:true});
  report.scenarios.IPAD_PORTRAIT_NOTIFICATIONS='PASS';
  await notificationPortrait.close();

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
  await page.screenshot({path:`${OUT}/desktop-product-light-1440x1000.png`,fullPage:true});
  report.scenarios.PRODUCT_SELECTION_RUNTIME='PASS';

  const landscape=await context.newPage();track(landscape);await landscape.setViewportSize({width:1024,height:768});
  await goto(landscape,'/design-preview/product');
  await landscape.locator('#themeSelect').selectOption('light');
  const formBox=await landscape.locator('.product-form-stack').boundingBox();
  const previewBox=await landscape.locator('.product-preview').boundingBox();
  assert.ok(formBox&&previewBox&&previewBox.x>formBox.x,'iPad landscape should keep two-column product layout');
  await assertNoOverflow(landscape,'iPad landscape product');
  await landscape.screenshot({path:`${OUT}/ipad-landscape-product-1024x768.png`,fullPage:true});
  report.scenarios.IPAD_LANDSCAPE_PRODUCT='PASS';
  await landscape.close();

  const portrait=await context.newPage();track(portrait);await portrait.setViewportSize({width:768,height:1024});
  await goto(portrait,'/design-preview/product');
  const portraitForm=await portrait.locator('.product-form-stack').boundingBox();
  const portraitPreview=await portrait.locator('.product-preview').boundingBox();
  assert.ok(portraitForm&&portraitPreview&&portraitPreview.y>portraitForm.y,'iPad portrait should stack preview below form');
  assert.ok(await portrait.locator('#manufacturer').evaluate((node)=>getComputedStyle(node).minHeight==='44px'));
  await assertNoOverflow(portrait,'iPad portrait product');
  await portrait.screenshot({path:`${OUT}/ipad-portrait-product-768x1024.png`,fullPage:true});
  report.scenarios.IPAD_PORTRAIT_PRODUCT='PASS';
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
