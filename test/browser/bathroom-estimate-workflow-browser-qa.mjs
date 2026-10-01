import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {isSiteSurveyField} from '../../src/work-management/field-workflow-scope.mjs';

const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4173',OUT='artifacts/bathroom-estimate-workflow';
const cases=[
  {id:'SER-LIXIL-INPLUS',variant:'product_variant',standard:'standard',dim:'width',selection:{product_variant:'bathroom',window_type:'sliding',fit:'tile',glass_family:'ordinary_double',glass_design:'transparent',gas:'dry_air',position_mode:'default',width:1000,height:1000,quantity:2},survey:{effective_depth:50,bath_bay_window:'present',raw_width_1:999,site_notes:'現場写真参照',special_request:'設定表証明希望'}},
  {id:'SER-YKKAP-UCHIRIMO',variant:'room_specification',standard:'residential',dim:'size_w',selection:{room_specification:'bathroom',window_type:'sliding_window',sash_configuration:'two_panel',reverse_handing:'standard',frame_color:'white',glass_family:'single_glazing',sales_glass_appearance:'clear',frame_spec:'standard',lower_frame_spec:'bathroom_integrated_aluminum_rail',fukashi_presence:'none',crescent_position:'standard',crescent_presence:'installed',crescent_type:'standard',pull_handle_type:'safety_stop_pull',pull_handle_position:'standard',size_w:1000,size_h:1000},survey:{installation_environment:'tile',opening_w_top:999,lower_mounting_surface_horizontal_or_adjustable:'no',mounting_surface_flat:'no',existing_lower_jamb_angle_present:'unknown',hardware_tip_mounting_depth_A_mm:2}},
];
const report={status:'RUNNING',exactHead:process.env.GITHUB_SHA??process.env.HEAD_SHA??null,baseUrl:BASE,products:[],errors:[]};
await mkdir(OUT,{recursive:true});
const browser=await chromium.launch();
async function choose(page,key,value){const revision=await page.locator('#dynamicForm').getAttribute('data-resolve-revision');await page.locator(`[data-spec-key="${key}"]`).selectOption(value);await page.waitForFunction(old=>document.querySelector('#dynamicForm').dataset.resolveRevision!==old,revision);}
try{
  for(const row of cases){
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    page.on('pageerror',error=>report.errors.push(error.message));page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
    await page.goto(BASE,{waitUntil:'networkidle'});
    const ids=await page.evaluate(async row=>{
      localStorage.removeItem('sash.work-management.v1');
      const {createProductConfigurationSnapshot}=await import('/work-management/domain.mjs');
      const {BrowserStorageDocumentStore}=await import('/work-management/storage.mjs');
      const {createRepositoryBundle}=await import('/work-management/repositories.mjs');
      const {WorkManagementService}=await import('/work-management/service.mjs');
      const products=await(await fetch('/api/runtime-master/integrations')).json(),product=products.find(p=>p.id===row.id);
      const result=await(await fetch('/api/runtime-master/resolve?'+new URLSearchParams({productId:row.id,selection:JSON.stringify(row.selection)}))).json();
      const snapshot=createProductConfigurationSnapshot({product,result});
      // Deliberately create a pre-correction legacy saved case. Actual editor
      // reload must migrate it without requiring any survey answers.
      snapshot.configuration={...snapshot.configuration,...row.survey};delete snapshot.workflow_data;
      snapshot.display_summary.push(...Object.entries(row.survey).map(([key,value])=>({key,label:key,value:String(value)})));
      const service=new WorkManagementService(createRepositoryBundle(new BrowserStorageDocumentStore(localStorage)));
      const {project,estimate}=await service.createProject({project_name:'浴室見積Workflow '+row.id});
      const opening=await service.createOpening(project.project_id,estimate.estimate_id,{room_name:'浴室',product_configuration_snapshot:snapshot});
      return {project:project.project_id,estimate:estimate.estimate_id,opening:opening.opening_id};
    },row);
    const openingUrl=`${BASE}/projects/${ids.project}/estimates/${ids.estimate}/openings/${ids.opening}`;
    await page.goto(openingUrl,{waitUntil:'networkidle'});await page.waitForSelector('#dynamicForm[data-resolve-revision]');
    let keys=await page.locator('#dynamicForm [data-spec-key]').evaluateAll(nodes=>nodes.map(node=>node.dataset.specKey));
    assert.equal(keys.some(isSiteSurveyField),false);
    assert.ok(keys.includes('glass_family')&&keys.includes(row.dim));
    assert.equal(await page.locator('#warnings .notice.error').count(),0);
    assert.equal(await page.locator('#productEditor :invalid').count(),0);
    // Corrected snapshot must save with zero edits, not only after a change event.
    await page.locator('#saveOpening').click();await page.waitForURL(`**/projects/${ids.project}/estimates/${ids.estimate}`);
    await page.goto(openingUrl,{waitUntil:'networkidle'});await page.waitForSelector('#dynamicForm[data-resolve-revision]');
    await page.reload({waitUntil:'networkidle'});await page.waitForSelector('#dynamicForm[data-resolve-revision]');
    const saved=await page.evaluate(()=>window.__sashWorkApp.readDatabase().openings[0]);
    assert.equal(saved.status,'COMPLETE');
    const snapshot=saved.product_configuration_snapshot;
    assert.equal(Object.keys(snapshot.configuration).some(isSiteSurveyField),false);
    const values=Object.values(snapshot.workflow_data.site_survey.contexts)[0].values;
    assert.deepEqual(values,row.survey);
    assert.equal(snapshot.display_summary.some(row=>isSiteSurveyField(row.key)),false);
    await choose(page,row.variant,row.standard);
    assert.equal(await page.locator(`[data-spec-key="${row.variant}"]`).inputValue(),row.standard);
    await choose(page,row.variant,'bathroom');
    keys=await page.locator('#dynamicForm [data-spec-key]').evaluateAll(nodes=>nodes.map(node=>node.dataset.specKey));
    assert.equal(keys.some(isSiteSurveyField),false);
    await page.goto(`${BASE}/projects/${ids.project}/estimates/${ids.estimate}/summary`,{waitUntil:'networkidle'});
    assert.equal(await page.locator('body').innerText().then(text=>/現場写真参照|設定表証明希望|hardware_tip_mounting|raw_width_1/.test(text)),false);
    // Output model uses the exact persisted case, no fake confirmation of site facts.
    const output=await page.evaluate(async()=>{
      const {createEstimateOutputModel}=await import('/estimate-output/model.mjs');
      const db=window.__sashWorkApp.readDatabase();return createEstimateOutputModel({project:db.projects[0],estimate:db.estimates[0],openings:db.openings});
    });
    assert.notEqual(output.state,'INCOMPLETE');assert.notEqual(output.state,'INVALID');
    assert.equal(output.rows[0].display_summary.some(row=>isSiteSurveyField(row.key)),false);
    assert.equal(Object.keys(output.rows[0].configuration).some(isSiteSurveyField),false);
    assert.ok(output.rows[0].major_specifications.includes('ガラス'));
    await page.goto(openingUrl,{waitUntil:'networkidle'});await page.waitForSelector('#dynamicForm[data-resolve-revision]');
    await page.screenshot({path:`${OUT}/${row.id}-desktop.png`,fullPage:true});
    report.products.push({productId:row.id,hiddenSurvey:true,nonRequired:true,saveWithoutSurvey:'PASS',legacyValuesPreserved:'PASS',reload:'PASS',switching:'PASS',handoff:'PASS',normalRegression:'PASS',status:'PASS'});
    await page.close();
  }
  assert.equal(report.errors.length,0);report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.stack;throw error;}
finally{await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report));}
