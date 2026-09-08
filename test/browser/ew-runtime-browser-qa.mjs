import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4173';
const PRODUCT_ID='SER-LIX-EW';
const OUT='artifacts/ew-runtime-browser-qa';
await mkdir(OUT,{recursive:true});

const report={status:'RUNNING',desktop:{},mobile:{},consoleErrors:[],pageErrors:[],failedResponses:[]};
const browser=await chromium.launch({headless:true});

function track(page){
  page.on('console',(message)=>{if(message.type()==='error')report.consoleErrors.push(message.text());});
  page.on('pageerror',(error)=>report.pageErrors.push(error.message));
  page.on('response',(response)=>{if(response.status()>=400)report.failedResponses.push({status:response.status(),url:response.url()});});
}

async function openEW(page){
  await page.goto(BASE,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent==='CATALOG CONNECTED');
  await page.selectOption('#manufacturer','LIXIL');
  await page.waitForFunction((id)=>[...document.querySelectorAll('#product option')].some((option)=>option.value===id&&!option.disabled),PRODUCT_ID);
  const response=page.waitForResponse((r)=>r.url().includes('/api/runtime-master/resolve')&&r.status()===200);
  await page.selectOption('#product',PRODUCT_ID);
  await response;
  await page.waitForFunction(()=>document.querySelector('[data-spec-key="window_type"]'));
}

async function choose(page,key,value){
  const locator=page.locator(`[data-spec-key="${key}"]`);
  await locator.waitFor();
  const response=page.waitForResponse((r)=>r.url().includes('/api/runtime-master/resolve')&&r.status()===200);
  await locator.selectOption(Array.isArray(value)?value.map(String):String(value));
  const result=await(await response).json();
  await page.waitForTimeout(20);
  return result;
}

async function chooseFirst(page,key){
  const value=await page.locator(`[data-spec-key="${key}"] option:not([value=""])`).first().getAttribute('value');
  assert.ok(value,`${key} must expose a formal option`);
  return {value,result:await choose(page,key,value)};
}

async function chooseNumber(page,key,value){
  const locator=page.locator(`[data-spec-key="${key}"]`);
  await locator.waitFor();
  const response=page.waitForResponse((r)=>r.url().includes('/api/runtime-master/resolve')&&r.status()===200);
  await locator.fill(String(value));
  await locator.dispatchEvent('change');
  return (await response).json();
}

const dynamicKeys=(page)=>page.locator('#dynamicForm [data-spec-key]').evaluateAll((els)=>els.map((el)=>el.dataset.specKey));

async function exercise(page){
  let result=await choose(page,'window_type','WT-EW-TATE-SUBERI');
  assert.equal(await page.locator('[data-spec-key="window_spec"]').count(),1);
  assert.equal(await page.locator('[data-spec-key="window_spec"]').evaluate((el)=>el.previousElementSibling?.textContent?.includes('構成タイプ')??false),true);
  await choose(page,'window_spec','SP-EW-TATE-T');
  assert.equal(await page.locator('[data-spec-key="handing"]').count(),1);
  assert.deepEqual(await page.locator('[data-spec-key="handing"] option:not([value=""])').allTextContents(),['左吊元（L）','右吊元（R）']);
  await choose(page,'handing','L');
  await choose(page,'size_mode','STANDARD');

  const formalSizeOptions=page.locator('[data-spec-key="size"] option:not([value=""])');
  assert.equal(await formalSizeOptions.count(),42);
  const sizeLabels=await formalSizeOptions.allTextContents();
  assert.equal(sizeLabels.some((label)=>label.startsWith('04618')),false,'cartesian-only 04618 must not exist');
  const sizeValue=await formalSizeOptions.first().getAttribute('value');
  assert.ok(sizeValue);
  await choose(page,'size',sizeValue);

  const exterior=await chooseFirst(page,'exterior_color');
  const interior=await chooseFirst(page,'interior_color');
  assert.ok(exterior.value&&interior.value);

  await choose(page,'screen_presence','あり');
  assert.equal(await page.locator('[data-spec-key="screen_form"]').count(),1);
  await choose(page,'screen_form','横引きロール網戸');
  const netValues=await page.locator('[data-spec-key="screen_net"] option:not([value=""])').evaluateAll((rows)=>rows.map((row)=>row.value));
  assert.deepEqual(netValues,['標準ネット','きれいネット']);
  await choose(page,'screen_net','きれいネット');

  const glass=await chooseFirst(page,'glass_base');
  result=glass.result;
  assert.equal(result.validation.status,'MANUAL_CHECK');
  assert.ok(result.notices.some((message)=>message.includes('メーカー確認')));
  assert.equal(await page.locator('[data-spec-key="glass_spacer"]').count(),1);
  assert.equal(await page.locator('[data-spec-key="glass_spacer"]').isDisabled(),true);
  assert.equal(await page.locator('[data-spec-key="glass_air_layer"]').isDisabled(),true);

  let order=await dynamicKeys(page);
  assert.ok(order.indexOf('window_type')<order.indexOf('window_spec'));
  assert.ok(order.indexOf('window_spec')<order.indexOf('handing'));
  assert.ok(order.indexOf('handing')<order.indexOf('size_mode'));
  assert.ok(order.indexOf('size_mode')<order.indexOf('size'));
  assert.ok(order.indexOf('size')<order.indexOf('exterior_color'));
  assert.ok(order.indexOf('exterior_color')<order.indexOf('interior_color'));
  assert.ok(order.indexOf('interior_color')<order.indexOf('screen_presence'));
  assert.ok(order.indexOf('screen_presence')<order.indexOf('screen_form'));
  assert.ok(order.indexOf('screen_form')<order.indexOf('screen_net'));
  assert.ok(order.indexOf('screen_net')<order.indexOf('glass_base'));
  assert.ok(order.indexOf('glass_base')<order.indexOf('glass_detail'));
  assert.ok(order.indexOf('glass_detail')<order.indexOf('glass_spacer'));
  assert.ok(order.indexOf('glass_spacer')<order.indexOf('glass_air_layer'));
  assert.equal(order.at(-1),'option');
  assert.equal(order.includes('construction'),false);

  const optionValues=await page.locator('[data-spec-key="option"] option').evaluateAll((rows)=>rows.map((row)=>row.value));
  assert.ok(optionValues.includes('OP-EW-L-ANGLE'));
  assert.equal(optionValues.includes('OP-EW-VENTSTOP'),false);
  assert.equal(optionValues.includes('OP-EW-REMOTE-1'),false);
  assert.equal(optionValues.includes('OP-EW-HOMEDEVICE'),false);
  assert.equal(optionValues.includes('OP-EW-ANGLE-SCREW'),false);
  result=await choose(page,'option',['OP-EW-L-ANGLE']);
  assert.ok(result.selection.option.includes('OP-EW-L-ANGLE'));
  assert.ok(await page.locator('[data-spec-key="option"] option[value="OP-EW-ANGLE-SCREW"]').count());

  // Formal 09C fixes the sliding-screen midrail; it must not leak into user input.
  await choose(page,'window_type','WT-EW-HIKICHIGAI');
  await choose(page,'window_spec','SP-EW-HIKI-HH');
  await choose(page,'screen_presence','あり');
  await choose(page,'screen_form','引違い網戸');
  assert.equal(await page.locator('[data-spec-key="screen_midrail"]').count(),0);
  assert.deepEqual(await page.locator('[data-spec-key="screen_net"] option:not([value=""])').allTextContents(),['標準ネット','きれいネット（要確認）','虫イヤネット（要確認）','ペットネット（要確認）']);

  // A Runtime window with no materialized screen candidates must not fabricate the series-level screen flag into UI fields.
  await choose(page,'window_type','WT-EW-SOTODAOSHI');
  await choose(page,'window_spec','SP-EW-Y-1');
  assert.equal(await page.locator('[data-spec-key^="screen_"]').count(),0);
  await choose(page,'size_mode','CUSTOM');
  assert.equal(await page.locator('[data-spec-key="size"]').count(),0);
  assert.equal(await page.locator('[data-spec-key="custom_w"]').count(),1);
  assert.equal(await page.locator('[data-spec-key="custom_h"]').count(),1);
  await chooseNumber(page,'custom_w',500);
  result=await chooseNumber(page,'custom_h',400);
  assert.equal(result.validation.errors.some((error)=>error.errorCode==='CUSTOM_SIZE_OUT_OF_RANGE'),false);
  await chooseFirst(page,'exterior_color');
  await chooseFirst(page,'interior_color');
  result=(await chooseFirst(page,'glass_base')).result;
  assert.equal(result.validation.status,'VALID');
  result=await chooseNumber(page,'custom_w',499);
  assert.equal(result.validation.status,'INVALID');
  assert.ok(result.validation.errors.some((error)=>error.errorCode==='CUSTOM_SIZE_OUT_OF_RANGE'));

  // Auto-fixed internal spec stays visible but non-editable.
  await choose(page,'window_type','WT-EW-DAIKAIKO-YOKO');
  const internal=page.locator('[data-spec-key="window_spec"]');
  await internal.waitFor();
  assert.equal(await internal.isDisabled(),true);
  assert.equal(await internal.inputValue(),'SP-EW-DAI-DS');

  // Restore a representative standard EW configuration for the screenshots.
  await choose(page,'window_type','WT-EW-TATE-SUBERI');
  await choose(page,'window_spec','SP-EW-TATE-T');
  await choose(page,'handing','L');
  await choose(page,'size_mode','STANDARD');
  const finalSize=await page.locator('[data-spec-key="size"] option:not([value=""])').first().getAttribute('value');
  await choose(page,'size',finalSize);
  await chooseFirst(page,'exterior_color');
  await chooseFirst(page,'interior_color');
  await choose(page,'screen_presence','あり');
  await choose(page,'screen_form','横引きロール網戸');
  await choose(page,'screen_net','標準ネット');
  result=(await chooseFirst(page,'glass_base')).result;
  assert.equal(result.validation.status,'VALID');
  const summary=await page.locator('#selectionSummary').innerText();
  assert.ok(summary.includes('縦すべり出し窓'));

  order=await dynamicKeys(page);
  return{
    uiOrderVerification:'PASS',screenBlockVerification:'PASS',glassBlockVerification:'PASS',sizeVerification:'PASS',internalFieldVerification:'PASS',
    handingVerification:'PASS',customSizeVerification:'PASS',manualConfirmationVerification:'PASS',optionDependencyVerification:'PASS',
    fieldCount:order.length,
  };
}

try{
  const preflight=await browser.newContext();
  const response=await preflight.request.get(`${BASE}/api/runtime-master/integrations`);
  assert.equal(response.status(),200);
  const integrations=await response.json();
  const ew=integrations.find((row)=>row.id===PRODUCT_ID);
  assert.ok(ew);
  assert.equal(ew.status,'READY');
  assert.equal(ew.selectable,true);
  assert.equal(ew.packageVersion,'v1.1');
  assert.equal(ew.schemaVersion,'2.0');
  assert.equal(ew.sourceHash,'082442f82f51c4a81050d8e16d5fe3b9cb142004deb371a3e2bbb21384ca37dd');
  await preflight.close();

  const desktopContext=await browser.newContext({viewport:{width:1440,height:1000}});
  const desktop=await desktopContext.newPage();track(desktop);await openEW(desktop);
  const desktopChecks=await exercise(desktop);
  const desktopOverflow=await desktop.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  assert.ok(desktopOverflow<=1,`desktop overflow: ${desktopOverflow}`);
  report.desktop={...desktopChecks,overflow:desktopOverflow,status:'PASS'};
  await desktop.screenshot({path:`${OUT}/desktop-1440x1000.png`,fullPage:true});
  await desktopContext.close();

  const mobileContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const mobile=await mobileContext.newPage();track(mobile);await openEW(mobile);
  const mobileChecks=await exercise(mobile);
  const mobileOverflow=await mobile.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  assert.ok(mobileOverflow<=1,`mobile overflow: ${mobileOverflow}`);
  report.mobile={...mobileChecks,overflow:mobileOverflow,status:'PASS'};
  await mobile.screenshot({path:`${OUT}/mobile-390x844.png`,fullPage:true});
  await mobileContext.close();

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
}finally{await browser.close();}
