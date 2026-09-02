import assert from'node:assert/strict';
import{mkdir,writeFile}from'node:fs/promises';
import{chromium}from'playwright';

const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4173';
const OUT=process.env.SALES_UI_R2_ARTIFACT_DIR??'artifacts/sales-ui-r2/browser';
await mkdir(OUT,{recursive:true});
const report={baseUrl:BASE,glass:[],shutter:[],custom:[],responsive:[],consoleErrors:[],status:'PENDING'};
const browser=await chromium.launch({headless:true});

function track(page,name){page.on('console',(message)=>{if(message.type()==='error')report.consoleErrors.push({page:name,text:message.text()});});page.on('pageerror',(error)=>report.consoleErrors.push({page:name,text:error.message}));}
async function resolveAction(page,action){const response=page.waitForResponse((candidate)=>candidate.url().includes('/api/catalog/resolve')&&candidate.status()===200);await action();await response;await page.waitForTimeout(30);}
async function openProduct(page,manufacturer,productId){
  await page.goto(BASE,{waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelector('#status')?.textContent==='CATALOG CONNECTED');
  await page.selectOption('#manufacturer',manufacturer);await resolveAction(page,()=>page.selectOption('#product',productId));
}
async function select(page,key,value){
  const control=page.locator(`[data-spec-key="${key}"]`);await control.waitFor({state:'visible'});
  if(await control.inputValue()===String(value))return;
  await page.waitForFunction(([field,target])=>[...document.querySelectorAll(`[data-spec-key="${field}"] option`)].some((option)=>option.value===target),[key,String(value)]);
  await resolveAction(page,()=>control.selectOption(String(value)));
}
async function options(page,key){return page.locator(`[data-spec-key="${key}"] option`).evaluateAll((rows)=>rows.map((row)=>row.value).filter(Boolean));}
async function fieldOrder(page){return page.locator('#dynamicForm [data-key]').evaluateAll((rows)=>rows.map((row)=>row.dataset.key));}
async function candidateCount(page){return Number((await page.locator('[data-size-candidate-count]').innerText()).match(/\d+/)?.[0]);}

async function verifyS2HGlass(page){
  await openProduct(page,'LIXIL','SER-LIX-SAMOS2H');
  await select(page,'glass_base','LOWE');
  assert.equal(await page.locator('[data-spec-key="glass_detail"]').count(),1);
  await select(page,'glass_detail','GL-S2H-LOWE-CLEAR');
  let order=await fieldOrder(page);
  assert.ok(order.indexOf('glass_detail')>=0&&order.indexOf('glass_spacer')>=0);assert.ok(order.indexOf('glass_detail')<order.indexOf('glass_spacer'));
  await select(page,'glass_spacer','ALUMINUM');
  order=await fieldOrder(page);
  assert.ok(order.indexOf('glass_spacer')>=0&&order.indexOf('glass_gas')>=0);assert.ok(order.indexOf('glass_detail')<order.indexOf('glass_spacer'));assert.ok(order.indexOf('glass_spacer')<order.indexOf('glass_gas'));
  await select(page,'glass_gas','DRY_AIR');
  await select(page,'glass_spacer','RESIN');
  assert.deepEqual(await options(page,'glass_gas'),['ARGON']);assert.equal(await page.locator('[data-spec-key="glass_gas"]').inputValue(),'ARGON');
  report.glass.push({series:'サーモスⅡ-H',order:['glass_base','glass_detail','glass_spacer','glass_gas'],resinAirLayer:['ARGON'],staleDryAirCleared:true,status:'PASS'});
}
async function verifyThermosLGlass(page){
  await openProduct(page,'LIXIL','SER-LIX-SAMOSL');
  await select(page,'window_type','WT-SL-HIKICHIGAI');
  await select(page,'glass_base','LOWE');await select(page,'glass_detail','GL-SL-001');await select(page,'glass_spacer','RESIN');
  const order=await fieldOrder(page);
  assert.ok(order.indexOf('glass_detail')>=0&&order.indexOf('glass_spacer')>=0&&order.indexOf('glass_air_layer')>=0&&order.indexOf('glass_type')>=0);
  assert.ok(order.indexOf('glass_detail')<order.indexOf('glass_spacer'));assert.ok(order.indexOf('glass_spacer')<order.indexOf('glass_air_layer'));assert.ok(order.indexOf('glass_air_layer')<order.indexOf('glass_type'));
  assert.deepEqual(await options(page,'glass_air_layer'),['ARGON']);assert.equal(await page.locator('[data-spec-key="glass_air_layer"]').inputValue(),'ARGON');
  report.glass.push({series:'サーモスL',order:['glass_base','glass_detail','glass_spacer','glass_air_layer','glass_type'],resinAirLayer:['ARGON'],status:'PASS'});
}
async function verifyThermosLShutter(page,prefix){
  await openProduct(page,'LIXIL','SER-LIX-SAMOSL');
  await select(page,'window_type','WT-SL-SHUTTER-HIKI');await select(page,'shutter_type','SP-SL-SHUT-M-STD');await select(page,'size_mode','STANDARD');await select(page,'construction','在来');
  assert.equal(await candidateCount(page),6);assert.deepEqual(await page.locator('[data-size-width] option').evaluateAll((rows)=>rows.map((row)=>row.value).filter(Boolean)),['178','183']);
  await resolveAction(page,()=>page.locator('[data-size-width]').selectOption('178'));
  assert.deepEqual(await page.locator('[data-size-height] option').evaluateAll((rows)=>rows.map((row)=>row.value).filter(Boolean)),['18','20','22']);
  report.shutter.push({viewport:prefix,shutter:'手動 標準タイプ',construction:'在来',canonical:6,runtime:6,widths:['178','183'],heightsBy178:['18','20','22'],missing:0,extra:0,status:'PASS'});
  await select(page,'shutter_type','SP-SL-SHUT-E-STD');
  assert.equal(await candidateCount(page),52);report.shutter.push({viewport:prefix,shutter:'電動 標準タイプ',construction:'在来',canonical:52,runtime:52,missing:0,extra:0,status:'PASS'});
  await select(page,'construction','204');assert.equal(await candidateCount(page),4);report.shutter.push({viewport:prefix,shutter:'電動 標準タイプ',construction:'204',canonical:4,runtime:4,missing:0,extra:0,status:'PASS'});
}
async function verifyCustomAvailability(page){
  await openProduct(page,'LIXIL','SER-LIX-SAMOS2H');await select(page,'window_type','WT-S2H-HIKICHIGAI');
  assert.deepEqual(await options(page,'size_mode'),['STANDARD']);report.custom.push({series:'サーモスⅡ-H',window:'単体引違い窓',rules:0,modes:['STANDARD'],status:'PASS'});

  await openProduct(page,'LIXIL','SER-LIX-SAMOSL');await select(page,'window_type','WT-SL-SHUTTER-HIKI');await select(page,'shutter_type','SP-SL-SHUT-M-WIND');
  assert.deepEqual(await options(page,'size_mode'),['CUSTOM']);await select(page,'size_mode','CUSTOM');await select(page,'construction','在来・204');
  assert.equal(await page.locator('[data-spec-key="custom_width"]').count(),1);assert.equal(await page.locator('[data-size-width]').count(),0);
  report.custom.push({series:'サーモスL',window:'シャッター付引違い窓',specification:'手動 耐風タイプ',rules:1,modes:['CUSTOM'],status:'PASS'});

  await openProduct(page,'YKK AP','SER-YKK-APW431');await select(page,'window_type','W431-006');await select(page,'region','本州');await select(page,'construction','在来');
  assert.deepEqual(await options(page,'size_mode'),['STANDARD','CUSTOM']);await select(page,'size_mode','CUSTOM');
  assert.deepEqual(await options(page,'custom_variant'),['中桟無','断熱腰パネル付']);
  report.custom.push({series:'APW 431',window:'勝手口ドア',rules:2,modes:['STANDARD','CUSTOM'],customVariants:['中桟無','断熱腰パネル付'],status:'PASS'});
}

try{
  const desktopContext=await browser.newContext({viewport:{width:1440,height:1000}}),desktop=await desktopContext.newPage();track(desktop,'desktop');
  await verifyS2HGlass(desktop);await verifyThermosLGlass(desktop);await verifyThermosLShutter(desktop,'desktop');await verifyCustomAvailability(desktop);
  await desktop.screenshot({path:`${OUT}/desktop-sales-ui-r2.png`,fullPage:true});await desktopContext.close();

  const mobileContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),mobile=await mobileContext.newPage();track(mobile,'mobile');
  await verifyThermosLShutter(mobile,'390x844');await verifyThermosLGlass(mobile);
  const overflow=await mobile.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-window.innerWidth));assert.equal(overflow,0);report.responsive.push({viewport:'390x844',horizontalOverflowPx:overflow,status:'PASS'});
  await mobile.screenshot({path:`${OUT}/mobile-sales-ui-r2.png`,fullPage:true});await mobileContext.close();
  assert.deepEqual(report.consoleErrors,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.stack??String(error);process.exitCode=1;}
finally{await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
