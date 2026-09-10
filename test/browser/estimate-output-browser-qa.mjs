import assert from 'node:assert/strict';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4173';
const OUT='artifacts/estimate-output-browser-qa';
await mkdir(OUT,{recursive:true});

function snapshot(index){
  return {
    schema_version:'1.0',manufacturer:'LIXIL',series:'TW',package_version:'integrated-v0.2',
    runtime_manifest_identity:'manifest-tw',runtime_integrity_hash:'hash-tw',
    configuration:{window_type:'SWT-LIX-TW-SHUT-HIKI-FLAT',panel_count:'2枚建',size:'16520'},
    display_summary:[
      {key:'window_type',label:'窓種類',value:'引違い窓'},
      {key:'glass',label:'ガラス仕様',value:'Low-E複層ガラス'},
      {key:'spacer',label:'スペーサー',value:'樹脂スペーサー'},
      {key:'size',label:'サイズ',value:'16520 ｜ W 1690 × H 2030'},
    ],
    validation_state:'VALID',source_mode:'CANONICAL_RUNTIME',product_id:'SER-LIXIL-TW',product_source:'RUNTIME_MASTER',
    captured_at:`2026-09-10T03:${String(index).padStart(2,'0')}:00.000Z`,
  };
}

const database={
  schema_version:'1.0',revision:31,
  projects:[{
    project_id:'prj_estimate_output',project_name:'TW 30開口 QA',status:'ACTIVE',request_company:'青空工務店',
    request_company_contact:'山田',sales_person:'巧竜',customer_name:'施主A',postal_code:'8600801',prefecture:'熊本県',
    city:'熊本市中央区',street:'安政町1-1',building:null,project_type:'NEW_BUILD',memo:null,owner_user_id:null,workspace_id:null,
    created_at:'2026-09-10T03:00:00.000Z',updated_at:'2026-09-10T03:30:00.000Z',deleted_at:null,
  }],
  estimates:[{
    estimate_id:'est_estimate_output',project_id:'prj_estimate_output',estimate_no:1,revision_no:3,status:'DRAFT',estimate_title:'TW 30開口見積',
    requested_at:null,due_date:null,memo:null,supersedes_estimate_id:null,created_at:'2026-09-10T03:00:00.000Z',updated_at:'2026-09-10T03:30:00.000Z',deleted_at:null,
  }],
  openings:Array.from({length:30},(_,offset)=>{
    const index=offset+1;
    return {opening_id:`opn_${String(index).padStart(2,'0')}`,estimate_id:'est_estimate_output',opening_no:index,sort_order:offset,status:'COMPLETE',room_name:index===1?'LDK':`洋室${index}`,location:index%2?'南面':'北面',opening_name:`TW窓 ${index}`,memo:null,product_configuration_snapshot:snapshot(index),created_at:'2026-09-10T03:00:00.000Z',updated_at:'2026-09-10T03:30:00.000Z',deleted_at:null};
  }),
};

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
const page=await context.newPage();
const report={status:'RUNNING',checks:{},consoleErrors:[],pageErrors:[],failedResponses:[]};
page.on('console',(message)=>{if(message.type()==='error')report.consoleErrors.push(message.text());});
page.on('pageerror',(error)=>report.pageErrors.push(error.message));
page.on('response',(response)=>{if(response.status()>=400)report.failedResponses.push({status:response.status(),url:response.url()});});

try{
  await page.goto(BASE,{waitUntil:'networkidle'});
  await page.evaluate((db)=>localStorage.setItem('sash.work-management.v1',JSON.stringify(db)),database);
  const estimateUrl=`${BASE}/projects/prj_estimate_output/estimates/est_estimate_output`;
  await page.goto(estimateUrl,{waitUntil:'networkidle'});
  await page.waitForSelector('#estimateOutputLaunch');
  await page.click('#estimateOutputLaunch');
  await page.waitForSelector('#estimateOutputPdf');
  assert.equal(await page.locator('.estimate-output-table-wrap tbody tr').count(),30);
  assert.match(await page.locator('.estimate-output-counts').innerText(),/30[\s\S]*0[\s\S]*0[\s\S]*30[\s\S]*0/);
  assert.match(await page.locator('.notice').innerText(),/要確認/);
  report.checks.output_screen_30_rows='PASS';

  const excelPromise=page.waitForEvent('download');await page.click('#estimateOutputExcel');const excel=await excelPromise;
  assert.match(excel.suggestedFilename(),/\.xlsx$/);const excelPath=await excel.path();assert.ok(excelPath);
  const excelBytes=await readFile(excelPath);assert.ok(excelBytes.length>1000);assert.equal(excelBytes[0],0x50);assert.equal(excelBytes[1],0x4b);
  report.checks.excel_download='PASS';

  const pdfPromise=page.waitForEvent('download');await page.click('#estimateOutputPdf');const pdf=await pdfPromise;
  assert.match(pdf.suggestedFilename(),/\.pdf$/);const pdfPath=await pdf.path();assert.ok(pdfPath);
  const pdfBytes=await readFile(pdfPath);assert.ok((await stat(pdfPath)).size>5000);assert.equal(pdfBytes.subarray(0,8).toString('utf8'),'%PDF-1.4');
  const pdfText=pdfBytes.toString('latin1');assert.equal((pdfText.match(/\/Type \/Page \/Parent/g)??[]).length,3);
  report.checks.pdf_download_and_pagination='PASS';

  await page.evaluate(()=>{window.__estimatePrintCalled=false;window.print=()=>{window.__estimatePrintCalled=true;};});
  await page.click('#estimateOutputPrint');assert.equal(await page.evaluate(()=>window.__estimatePrintCalled),true);
  await page.emulateMedia({media:'print'});assert.equal(await page.locator('#estimateOutputPrint').evaluate((element)=>getComputedStyle(element).display),'none');
  await page.emulateMedia({media:'screen'});report.checks.print_action_and_styles='PASS';

  await page.screenshot({path:`${OUT}/desktop-1440x1000.png`,fullPage:true});
  const mobile=await context.newPage();await mobile.setViewportSize({width:390,height:844});
  await mobile.goto(`${estimateUrl}?estimateOutput=1`,{waitUntil:'networkidle'});await mobile.waitForSelector('#estimateOutputPdf');
  assert.equal(await mobile.locator('.estimate-output-table-wrap tbody tr').count(),30);
  const overflow=await mobile.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);assert.ok(overflow<=1,`mobile overflow ${overflow}`);
  await mobile.screenshot({path:`${OUT}/mobile-390x844.png`,fullPage:true});await mobile.close();report.checks.mobile_390x844='PASS';

  assert.deepEqual(report.consoleErrors,[]);assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.failedResponses,[]);
  report.status='PASS';await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(error){report.status='FAIL';report.failure=error.stack??String(error);await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2));throw error;}
finally{await context.close();await browser.close();}
