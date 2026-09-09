import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4173';
const OUT='artifacts/work-management-browser-qa';
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

async function choose(key,value){
  const response=page.waitForResponse((row)=>row.url().includes('/resolve')&&row.status()===200);
  await page.locator(`[data-spec-key="${key}"]`).selectOption(String(value));
  await response;
}

async function createOpening(index,product){
  await page.getByRole('button',{name:'開口部を追加',exact:true}).click();
  await page.waitForURL(/\/openings\/opn_/);
  await page.locator('[data-opening-field="room_name"]').fill(index===0?'LDK':`洋室${index}`);
  await page.locator('[data-opening-field="location"]').fill(index%2===0?'南面':'北面');
  await page.locator('[data-opening-field="opening_name"]').fill(index===0?'掃き出し窓':`開口${index+1}`);
  await page.selectOption('#manufacturer',product.manufacturer);
  const initial=page.waitForResponse((row)=>row.url().includes('/resolve')&&row.status()===200);
  await page.selectOption('#product',product.id);await initial;
  if(index===0){
    await choose('window_type','SWT-LIX-TW-SHUT-HIKI-FLAT');
    await choose('shutter_type','SP-TW-SHUT-MAN-STD');
    await choose('panel_count','2枚建');
    const firstSize=await page.locator('[data-spec-key="size"] option:not([value=""])').first().getAttribute('value');
    assert.ok(firstSize);await choose('size',firstSize);
  }
  await page.getByRole('button',{name:'この開口部を保存'}).click();
  await page.waitForURL(/\/estimates\/est_/);
}

try{
  await page.goto(BASE,{waitUntil:'networkidle'});await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'networkidle'});
  await page.getByRole('button',{name:'新しい案件'}).first().click();
  await page.locator('[name="project_name"]').fill('熊本中央区モデルハウス');
  await page.locator('[name="request_company"]').fill('青空工務店');
  await page.locator('[name="sales_person"]').fill('巧竜');
  await page.locator('[name="postal_code"]').fill('8600801');
  await page.locator('[name="prefecture"]').fill('熊本県');
  await page.locator('[name="city"]').fill('熊本市中央区');
  await page.locator('[name="street"]').fill('安政町1-1');
  await page.locator('#projectForm button[type="submit"]').click();
  await page.waitForURL(/\/projects\/prj_/);
  assert.match(await page.locator('main').innerText(),/青空工務店/);
  report.scenarios.A='PASS';

  const projectUrl=page.url();
  await page.getByRole('button',{name:'見積を開く'}).click();
  const estimateUrl=page.url();
  const catalogResponse=await context.request.get(`${BASE}/api/catalog/products`);const catalog=await catalogResponse.json();
  const tw={id:'SER-LIXIL-TW',manufacturer:'LIXIL'};
  const ykk=catalog.find((row)=>row.manufacturer==='YKK AP');assert.ok(ykk);
  for(let index=0;index<10;index++)await createOpening(index,index%2===0?tw:ykk);
  assert.equal(await page.locator('.opening-card').count(),10);
  const database=await page.evaluate(()=>window.__sashWorkApp.readDatabase());
  const estimateId=new URL(estimateUrl).pathname.split('/').at(-1);
  const active=database.openings.filter((row)=>row.estimate_id===estimateId&&!row.deleted_at);
  assert.equal(active.length,10);assert.deepEqual(new Set(active.map((row)=>row.product_configuration_snapshot.manufacturer)),new Set(['LIXIL','YKK AP']));
  report.scenarios.B='PASS';

  await page.locator('.opening-card').first().getByRole('button',{name:'複製'}).click();
  assert.equal(await page.locator('.opening-card').count(),11);
  await page.locator('.opening-card').last().getByRole('button',{name:'編集'}).click();
  await page.locator('[data-opening-field="opening_name"]').fill('掃き出し窓 サイズ変更');
  await page.waitForFunction(()=>document.querySelectorAll('[data-spec-key="size"] option:not([value=""])').length>1);
  const sizeOptions=page.locator('[data-spec-key="size"] option:not([value=""])');
  assert.ok(await sizeOptions.count()>1);const secondSize=await sizeOptions.nth(1).getAttribute('value');await choose('size',secondSize);
  await page.getByRole('button',{name:'この開口部を保存'}).click();await page.waitForURL(estimateUrl);
  assert.match(await page.locator('.opening-card').last().innerText(),/サイズ変更/);
  report.scenarios.C='PASS';

  await page.locator('.opening-card').last().getByRole('button',{name:'↑'}).click();
  const beforeReload=await page.locator('.opening-card').allTextContents();
  await page.reload({waitUntil:'networkidle'});assert.deepEqual(await page.locator('.opening-card').allTextContents(),beforeReload);
  report.scenarios.D='PASS';

  await page.close();page=await context.newPage();track(page);await page.goto(estimateUrl,{waitUntil:'networkidle'});
  assert.equal(await page.locator('.opening-card').count(),11);report.scenarios.E='PASS';

  page.once('dialog',(dialog)=>dialog.accept());
  await page.locator('.opening-card').nth(1).getByRole('button',{name:'削除'}).click();
  assert.equal(await page.locator('.opening-card').count(),10);report.scenarios.F='PASS';

  await page.locator('.opening-card').first().getByRole('button',{name:'編集'}).click();
  await page.evaluate(()=>window.__sashWorkApp.setPersistenceFailure(true));
  await page.locator('[data-opening-field="memo"]').fill('保存失敗後も保持される入力');
  await page.waitForFunction(()=>document.querySelector('.save-status')?.textContent==='保存失敗',{timeout:5000});
  assert.equal(await page.locator('[data-opening-field="memo"]').inputValue(),'保存失敗後も保持される入力');
  await page.evaluate(()=>window.__sashWorkApp.setPersistenceFailure(false));await page.getByRole('button',{name:'再試行'}).click();
  await page.waitForFunction(()=>document.querySelector('.save-status')?.textContent==='保存済み');report.scenarios.G='PASS';

  const openingPath=new URL(page.url()).pathname;
  await page.evaluate(()=>{const key=window.__sashWorkApp.storageKey;const db=JSON.parse(localStorage.getItem(key));const opening=db.openings.find((row)=>row.product_configuration_snapshot?.source_mode==='CANONICAL_RUNTIME');opening.product_configuration_snapshot.runtime_manifest_identity='old-manifest';localStorage.setItem(key,JSON.stringify(db));});
  await page.reload({waitUntil:'networkidle'});await page.waitForSelector('[data-runtime-action="revalidate"]');
  const frozen=await page.evaluate(()=>window.__sashWorkApp.readDatabase().openings.find((row)=>row.product_configuration_snapshot?.runtime_manifest_identity==='old-manifest')?.product_configuration_snapshot.runtime_manifest_identity);
  assert.equal(frozen,'old-manifest');
  const revalidate=page.waitForResponse((row)=>row.url().includes('/api/runtime-master/resolve')&&row.status()===200);await page.click('[data-runtime-action="revalidate"]');await revalidate;
  await page.waitForFunction(()=>document.querySelector('.save-status')?.textContent==='保存済み',{timeout:5000});report.scenarios.H='PASS';

  await page.goto(BASE,{waitUntil:'networkidle'});await page.getByRole('button',{name:'新しい案件'}).click();await page.locator('[name="project_name"]').fill('別案件');await page.locator('#projectForm button[type="submit"]').click();await page.waitForURL(/\/projects\/prj_/);
  await page.getByRole('button',{name:'見積を開く'}).click();assert.equal(await page.locator('.opening-card').count(),0);report.scenarios.I='PASS';

  await page.goto(`${estimateUrl}/summary`,{waitUntil:'networkidle'});assert.equal(await page.locator('.estimate-summary tbody tr').count(),10);
  await page.screenshot({path:`${OUT}/desktop-1440x1000.png`,fullPage:true});
  const mobile=await context.newPage();track(mobile);await mobile.setViewportSize({width:390,height:844});await mobile.goto(projectUrl,{waitUntil:'networkidle'});
  assert.ok(await mobile.locator('h1').isVisible());const overflow=await mobile.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);assert.ok(overflow<=1,`mobile overflow ${overflow}`);await mobile.screenshot({path:`${OUT}/mobile-390x844.png`,fullPage:true});await mobile.close();
  assert.deepEqual(report.consoleErrors,[]);assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.failedResponses,[]);
  assert.equal(openingPath.includes('/openings/'),true);report.status='PASS';
  await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(error){report.status='FAIL';report.failure=error.stack??String(error);await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2));throw error;}
finally{await context.close();await browser.close();}
