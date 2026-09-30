import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4173';
const SHARE_TOKEN=process.env.VERCEL_SHARE_TOKEN;
const OUT='artifacts/theme-browser-qa';
await mkdir(OUT,{recursive:true});

const report={status:'RUNNING',scenarios:{},consoleErrors:[],pageErrors:[],failedResponses:[]};
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'light'});
const page=await context.newPage();

page.on('console',(message)=>{if(message.type()==='error')report.consoleErrors.push(message.text());});
page.on('pageerror',(error)=>report.pageErrors.push(error.message));
page.on('response',(response)=>{if(response.status()>=400)report.failedResponses.push({status:response.status(),url:response.url()});});

try{
  const entry=SHARE_TOKEN?`${BASE}/?_vercel_share=${encodeURIComponent(SHARE_TOKEN)}`:BASE;
  await page.goto(entry,{waitUntil:'networkidle'});
  await page.evaluate(()=>localStorage.removeItem('sash.theme.v1'));
  await page.goto(BASE,{waitUntil:'networkidle'});

  assert.equal(await page.locator('#themePreference').inputValue(),'system');
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'light');
  report.scenarios.SYSTEM_LIGHT_DEFAULT='PASS';

  await page.locator('#themePreference').selectOption('dark');
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark');
  assert.equal(await page.evaluate(()=>localStorage.getItem('sash.theme.v1')),'dark');
  const darkColors=await page.evaluate(()=>({
    body:getComputedStyle(document.body).backgroundColor,
    topbar:getComputedStyle(document.querySelector('.topbar')).backgroundColor,
    select:getComputedStyle(document.querySelector('#themePreference')).backgroundColor,
  }));
  assert.equal(darkColors.body,'rgb(17, 19, 21)');
  assert.equal(darkColors.topbar,'rgb(23, 26, 30)');
  assert.equal(darkColors.select,'rgb(34, 39, 44)');
  await page.screenshot({path:`${OUT}/dark-desktop-1440x1000.png`,fullPage:true});
  report.scenarios.DARK_VISUAL_TOKENS='PASS';

  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#themePreference').inputValue(),'dark');
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark');
  report.scenarios.DARK_PERSISTENCE='PASS';

  await page.locator('#themePreference').selectOption('system');
  await page.emulateMedia({colorScheme:'dark'});
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
  await page.emulateMedia({colorScheme:'light'});
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
  report.scenarios.SYSTEM_FOLLOW='PASS';

  await page.locator('#themePreference').selectOption('dark');
  await page.emulateMedia({media:'print'});
  const printState=await page.evaluate(()=>({
    body:getComputedStyle(document.body).backgroundColor,
    picker:getComputedStyle(document.querySelector('.theme-picker')).display,
  }));
  assert.equal(printState.body,'rgb(255, 255, 255)');
  assert.equal(printState.picker,'none');
  report.scenarios.PRINT_LIGHT_RESET='PASS';

  await page.emulateMedia({media:'screen',colorScheme:'light'});
  const mobile=await context.newPage();
  mobile.on('console',(message)=>{if(message.type()==='error')report.consoleErrors.push(message.text());});
  mobile.on('pageerror',(error)=>report.pageErrors.push(error.message));
  await mobile.goto(BASE,{waitUntil:'networkidle'});
  await mobile.setViewportSize({width:390,height:844});
  await mobile.evaluate(()=>window.__sashTheme.setPreference('dark'));
  assert.equal(await mobile.evaluate(()=>document.documentElement.dataset.theme),'dark');
  const overflow=await mobile.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  assert.ok(overflow<=1,`mobile overflow ${overflow}`);
  await mobile.screenshot({path:`${OUT}/dark-mobile-390x844.png`,fullPage:true});
  await mobile.close();
  report.scenarios.DARK_MOBILE='PASS';

  assert.deepEqual(report.consoleErrors,[]);
  assert.deepEqual(report.pageErrors,[]);
  assert.deepEqual(report.failedResponses,[]);
  report.status='PASS';
  await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}catch(error){
  report.status='FAIL';
  report.failure=error.stack??String(error);
  await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2));
  throw error;
}finally{
  await context.close();
  await browser.close();
}
