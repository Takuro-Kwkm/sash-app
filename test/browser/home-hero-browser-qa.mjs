import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4173';
const OUT='artifacts/home-hero-browser-qa';
await mkdir(OUT,{recursive:true});
const report={status:'RUNNING',scenarios:{},consoleErrors:[],pageErrors:[],failedResponses:[]};
const browser=await chromium.launch({headless:true});

function track(page){
  page.on('console',(message)=>{if(message.type()==='error')report.consoleErrors.push(message.text());});
  page.on('pageerror',(error)=>report.pageErrors.push(error.message));
  page.on('response',(response)=>{if(response.status()>=400)report.failedResponses.push({status:response.status(),url:response.url()});});
}

async function openAt(width,height){
  const context=await browser.newContext({viewport:{width,height}});
  const page=await context.newPage();track(page);
  await page.goto(BASE,{waitUntil:'networkidle'});
  await page.locator('[data-app-home-hero]').waitFor();
  return {context,page};
}

async function assertIPadHero(page,label){
  assert.equal(await page.locator('[data-app-home-hero]').count(),1,`${label} must render one HOME Hero`);
  assert.equal(await page.locator('#appHomeHeroTitle').innerText(),'暮らしをつくる、マドとトビラで。');
  const metrics=await page.locator('.app-home-hero-photo').evaluate((node)=>{
    const image=node.getBoundingClientRect();
    const hero=node.closest('.app-home-hero').getBoundingClientRect();
    const style=getComputedStyle(node);
    return {width:image.width,height:image.height,heroWidth:hero.width,imageRight:image.right,heroRight:hero.right,objectFit:style.objectFit,naturalWidth:node.naturalWidth,naturalHeight:node.naturalHeight};
  });
  assert.equal(metrics.naturalWidth,640,`${label} must use approved 640px source`);
  assert.equal(metrics.naturalHeight,340,`${label} must use approved 340px source`);
  assert.equal(metrics.objectFit,'contain',`${label} must use a non-stretching fit`);
  const expected=640/340;
  const rendered=metrics.width/metrics.height;
  assert.ok(Math.abs(rendered-expected)<0.01,`${label} ratio mismatch ${rendered} vs ${expected}`);
  assert.ok(metrics.width>metrics.heroWidth,`${label} should uniformly scale the photo for right-edge crop`);
  assert.ok(metrics.imageRight>metrics.heroRight,`${label} should clip only the photo overflow at the Hero boundary`);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  assert.ok(overflow<=1,`${label} document overflow ${overflow}`);
}

try{
  const desktop=await openAt(1440,1000);
  await desktop.page.evaluate(()=>localStorage.clear());
  await desktop.page.reload({waitUntil:'networkidle'});
  await desktop.page.locator('[data-app-home-hero]').waitFor();
  assert.equal(await desktop.page.locator('#appHomeHeroTitle').innerText(),'暮らしをつくる、マドとトビラで。');
  assert.equal(await desktop.page.locator('.app-home-hero-photo').evaluate((node)=>getComputedStyle(node).objectFit),'cover');
  assert.ok(await desktop.page.getByRole('heading',{name:'案件一覧'}).isVisible(),'existing project list must remain below Hero');
  await desktop.page.screenshot({path:`${OUT}/desktop-home-1440x1000.png`,fullPage:false});
  report.scenarios.DESKTOP_HOME_HERO='PASS';
  await desktop.page.getByRole('link',{name:/案件を新規作成/}).click();
  await desktop.page.waitForURL(/\/projects\/new$/);
  assert.ok(await desktop.page.locator('#projectForm').isVisible());
  report.scenarios.HOME_HERO_NEW_PROJECT_CTA='PASS';
  await desktop.context.close();

  const landscape=await openAt(1024,768);
  await assertIPadHero(landscape.page,'iPad Landscape');
  await landscape.page.screenshot({path:`${OUT}/ipad-landscape-home-1024x768.png`,fullPage:false});
  report.scenarios.IPAD_LANDSCAPE_HOME_HERO='PASS';
  report.scenarios.IPAD_LANDSCAPE_HERO_INTRINSIC_RATIO='PASS';
  await landscape.context.close();

  const portrait=await openAt(768,1024);
  await assertIPadHero(portrait.page,'iPad Portrait');
  const vertical=await portrait.page.evaluate(()=>{
    const header=document.querySelector('.topbar').getBoundingClientRect();
    const hero=document.querySelector('.app-home-hero').getBoundingClientRect();
    return {headerBottom:header.bottom,heroTop:hero.top};
  });
  assert.ok(vertical.heroTop>=vertical.headerBottom,`iPad Portrait Hero overlaps sticky header: ${JSON.stringify(vertical)}`);
  await portrait.page.screenshot({path:`${OUT}/ipad-portrait-home-768x1024.png`,fullPage:false});
  report.scenarios.IPAD_PORTRAIT_HOME_HERO='PASS';
  report.scenarios.IPAD_PORTRAIT_HERO_INTRINSIC_RATIO='PASS';
  report.scenarios.IPAD_PORTRAIT_HEADER_CLEARANCE='PASS';
  await portrait.context.close();

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
  await browser.close();
}
