import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4173';
const OUT='artifacts/seven-series-business-flow';
const products=[['LIXIL','SER-LIXIL-TW'],['LIXIL','SER-LIX-EW'],['LIXIL','SER-LIX-SAMOS2H'],['LIXIL','SER-LIX-SAMOSL'],['YKK AP','SER-YKK-APW430'],['YKK AP','SER-YKK-APW431'],['YKK AP','SER-YKKAP-UCHIRIMO']];
const report={status:'RUNNING',exactHead:process.env.GITHUB_SHA??null,viewports:[],errors:[]};
await mkdir(OUT,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const width of [1280,768,390]){
  const context=await browser.newContext({viewport:{width,height:900},acceptDownloads:true});
  const page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  const entry=process.env.VERCEL_SHARE_TOKEN?`${BASE}/?_vercel_share=${encodeURIComponent(process.env.VERCEL_SHARE_TOKEN)}`:BASE;
  await page.goto(entry,{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'新しい案件'}).first().click();
  await page.locator('[name="project_name"]').fill(`7シリーズ統合QA ${width}`);
  const address=`熊本県熊本市中央区QA-${width}-1-2-3 テスト101号`;
  assert.equal(await page.locator('[name="postal_code"],[name="prefecture"],[name="city"],[name="street"],[name="building"]').count(),0);
  await page.locator('[name="address"]').fill(address);
  await page.locator('#projectForm button[type="submit"]').click();
  await page.waitForURL(/\/projects\/prj_/);
  const savedProjectAddress=await page.evaluate(()=>window.__sashWorkApp.readDatabase().projects.find(row=>!row.deleted_at)?.address);
  assert.equal(savedProjectAddress,address);
  await page.getByRole('button',{name:'見積を開く'}).click();
  const estimateUrl=page.url();
  const checks=[];
  for(const [manufacturer,id]of products){
   await page.getByRole('button',{name:'開口部を追加',exact:true}).click();
   await page.waitForURL(/\/openings\/opn_/);
   await page.locator('[data-opening-field="opening_name"]').fill(id);
   await page.selectOption('#manufacturer',manufacturer);
   const initial=page.waitForResponse(r=>r.url().includes('/api/runtime-master/resolve')&&r.status()===200);
   await page.selectOption('#product',id);await initial;
   await page.waitForFunction(()=>document.querySelectorAll('#dynamicForm [data-spec-key]').length>0);
   const visited=new Set();
   for(let step=0;step<50;step++){
    const field=await page.locator('#dynamicForm [data-spec-key]').evaluateAll((nodes)=>nodes.map(n=>({key:n.dataset.specKey,tag:n.tagName,type:n.type,value:n.value,disabled:n.disabled,options:n.tagName==='SELECT'?[...n.options].filter(o=>o.value&&!o.disabled).map(o=>o.value):[]})));
    const target=field.find(f=>!f.disabled&&!f.value&&!visited.has(f.key)&&(f.options.length||f.type==='number'));
    if(!target)break;visited.add(target.key);
    const control=page.locator(`[data-spec-key="${target.key}"]`);
    const revision=await page.locator('#dynamicForm').getAttribute('data-resolve-revision');
    const response=page.waitForResponse(r=>r.url().includes('/api/runtime-master/resolve')&&r.status()===200);
    if(target.type==='number'){await control.fill('500');await control.dispatchEvent('change');}
    else await control.selectOption(target.options.includes('NONE')?'NONE':target.options[0]);
    await response;
    await page.waitForFunction(old=>document.querySelector('#dynamicForm')?.dataset.resolveRevision!==old,revision);
   }
   assert.ok(await page.locator('#selectionSummary').innerText());
   await page.getByRole('button',{name:'この開口部を保存'}).click();await page.waitForURL(estimateUrl);
   const saved=await page.evaluate(product=>window.__sashWorkApp.readDatabase().openings.find(o=>!o.deleted_at&&o.product_configuration_snapshot?.product_id===product)?.product_configuration_snapshot,id);
   assert.ok(saved,`${id}:snapshot missing`);assert.equal(saved.manufacturer,manufacturer);
   assert.ok(Object.keys(saved.configuration).length>0,`${id}:empty selection`);
   await page.locator('.opening-card').last().getByRole('button',{name:'編集'}).click();
   await page.waitForSelector('#selectionSummary');
   await page.reload({waitUntil:'networkidle'});
   const reopened=await page.evaluate(product=>window.__sashWorkApp.readDatabase().openings.find(o=>!o.deleted_at&&o.product_configuration_snapshot?.product_id===product)?.product_configuration_snapshot,id);
   assert.deepEqual(reopened.configuration,saved.configuration,`${id}:save/reopen changed selection`);
   assert.equal(reopened.runtime_manifest_identity,saved.runtime_manifest_identity,`${id}:identity changed`);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=1,`${id}:overflow ${overflow}`);
   checks.push({id,selectedFields:Object.keys(saved.configuration).length,validationState:saved.validation_state,saveReopen:'PASS'});
   await page.goto(estimateUrl,{waitUntil:'networkidle'});
  }
  assert.equal(await page.locator('.opening-card').count(),7);
  await page.click('#estimateOutputLaunch');await page.waitForSelector('#estimateOutputExcel');
  assert.equal(await page.locator('.estimate-output-table-wrap tbody tr').count(),7);
  const output=await page.locator('.estimate-output-table-wrap').innerText();
  for(const label of ['TW','EW','サーモス','430','431','ウチリモ'])assert.ok(output.includes(label),`output missing ${label}`);
  const pending=page.waitForEvent('download');await page.click('#estimateOutputExcel');const download=await pending;
  assert.match(download.suggestedFilename(),/\.xlsx$/);assert.equal(await download.failure(),null);
  await page.screenshot({path:`${OUT}/output-${width}.png`,fullPage:true});
  report.viewports.push({width,products:checks,outputRows:7,excel:'PASS'});
  await context.close();
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.stack;throw error;}
finally{await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify(report));
