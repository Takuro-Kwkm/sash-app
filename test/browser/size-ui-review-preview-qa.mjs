import assert from"node:assert/strict";
import{writeFile,mkdir}from"node:fs/promises";
import{pathToFileURL}from"node:url";
import{chromium}from"playwright";

const PREVIEW=process.env.SIZE_REVIEW_PREVIEW??"artifacts/size-ui-review-r2/index.html";
const OUT=process.env.SIZE_REVIEW_QA_ARTIFACT_DIR??"artifacts/size-ui-review-r2-qa";
const PRODUCTS=[
  {manufacturer:"LIXIL",id:"SER-LIX-SAMOS2H",label:"サーモスⅡ-H",windows:17},
  {manufacturer:"LIXIL",id:"SER-LIX-SAMOSL",label:"サーモスL",windows:17},
  {manufacturer:"YKK AP",id:"SER-YKK-APW430",label:"APW 430",windows:25},
  {manufacturer:"YKK AP",id:"SER-YKK-APW431",label:"APW 431",windows:6}
];
await mkdir(OUT,{recursive:true});
const report={preview:PREVIEW,desktop:[],mobile:null,consoleErrors:[],status:"PENDING"};
const browser=await chromium.launch({headless:true});

async function settle(page){await page.waitForTimeout(60);}
async function select(page,locator,value){await locator.selectOption(String(value));await settle(page);}
async function openProduct(page,product){
  await select(page,page.locator("#manufacturer"),product.manufacturer);
  const products=await page.locator("#product option").evaluateAll((options)=>options.map((option)=>option.value).filter(Boolean));
  assert.ok(products.includes(product.id),`${product.label}: series missing`);
  await select(page,page.locator("#product"),product.id);
  await page.locator('[data-spec-key="window_type"]').waitFor({state:"visible"});
}
async function fillUntilSize(page){
  for(let pass=0;pass<50;pass+=1){
    const width=page.locator("[data-size-width]");
    if(await width.isVisible().catch(()=>false)&&await width.locator("option").count()>1)return;
    const choices=await page.locator("#dynamicForm select[data-spec-key]").evaluateAll((controls)=>controls.map((control)=>({key:control.dataset.specKey,value:control.value,disabled:control.disabled,visible:Boolean(control.offsetParent),options:[...control.options].map((option)=>option.value).filter(Boolean)})).filter((control)=>control.visible&&!control.disabled&&!control.value&&control.options.length));
    assert.ok(choices.length,await page.locator("#dynamicForm").innerText());
    const choice=choices[0],value=choice.options.find((candidate)=>String(candidate).toUpperCase()==="STANDARD")??choice.options[0];
    await select(page,page.locator(`[data-spec-key="${choice.key}"]`),value);
  }
  throw new Error("Formal Size UI did not become reachable");
}
async function verifyProduct(page,product){
  await openProduct(page,product);
  const windows=await page.locator('[data-spec-key="window_type"] option').evaluateAll((options)=>options.map((option)=>option.value).filter(Boolean));
  assert.equal(windows.length,product.windows,product.label);
  assert.match(await page.locator("[data-window-count]").innerText(),new RegExp(`${product.windows}種類`));
  await select(page,page.locator('[data-spec-key="window_type"]'),windows[0]);
  await fillUntilSize(page);
  const count=Number((await page.locator("[data-size-candidate-count]").innerText()).match(/\d+/)?.[0]);
  assert.ok(count>0,product.label);
  assert.equal(await page.locator("[data-size-list-record]").count(),count,`${product.label}: full list`);
  const width=page.locator("[data-size-width]"),height=page.locator("[data-size-height]");
  const firstW=await width.locator("option").evaluateAll((options)=>options.map((option)=>option.value).find(Boolean));
  await select(page,width,firstW);
  const firstH=await height.locator("option").evaluateAll((options)=>options.map((option)=>option.value).find(Boolean));
  await select(page,height,firstH);
  const record=page.locator("[data-size-selected-id]");
  if(!await record.count()){
    const exact=page.locator("[data-size-record]");
    const first=await exact.locator("option").evaluateAll((options)=>options.map((option)=>option.value).find(Boolean));
    await select(page,exact,first);
  }
  assert.match(await page.locator("[data-size-selected-id]").innerText(),/正式サイズ確定/);
  return{product:product.label,status:"PASS",activeWindowCount:windows.length,formalCandidateCount:count};
}

try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on("console",(message)=>{if(message.type()==="error")report.consoleErrors.push(message.text());});
  page.on("pageerror",(error)=>report.consoleErrors.push(error.message));
  await page.goto(pathToFileURL(PREVIEW).href,{waitUntil:"load"});
  await page.waitForFunction(()=>document.querySelector("#status")?.textContent==="CATALOG CONNECTED");
  const manufacturers=await page.locator("#manufacturer option").evaluateAll((options)=>options.map((option)=>option.value).filter(Boolean));
  assert.deepEqual(manufacturers,["LIXIL","YKK AP"]);
  for(const product of PRODUCTS)report.desktop.push(await verifyProduct(page,product));
  await page.screenshot({path:`${OUT}/desktop-r2.png`,fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await verifyProduct(page,PRODUCTS[3]);
  const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-window.innerWidth));
  assert.equal(overflow,0);
  report.mobile={product:PRODUCTS[3].label,viewport:"390x844",horizontalOverflowPx:overflow,status:"PASS"};
  assert.deepEqual(report.consoleErrors,[]);
  report.status="PASS";
  await page.screenshot({path:`${OUT}/mobile-r2.png`,fullPage:true});
}catch(error){report.status="FAIL";report.failure=error.stack??String(error);process.exitCode=1;}
finally{await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
