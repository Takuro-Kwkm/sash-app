import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4173';
const OUT='artifacts/inplus-bathroom-v1';
const PRODUCT='SER-LIXIL-INPLUS';
const SLIDING={product_variant:'bathroom',window_type:'sliding',fit:'tile',glass_family:'ordinary_double',glass_design:'transparent',gas:'dry_air',position_mode:'default',width:1000,height:1000,quantity:2,effective_depth:100,water_slope_deg:0,surround_material:'aluminum',outer_sash_material:'aluminum',outer_angle:'present',mounting_surface_step:'absent',bath_bay_window:'absent',support_checked:'confirmed'};
const CASEMENT={...SLIDING,window_type:'casement',fit:'unit_bath',hinge:'L',handle_position_mode:'custom',handle_p:500,width:600,effective_depth:120};
const report={status:'RUNNING',baseUrl:BASE,exactHead:process.env.GITHUB_SHA??null,scenarios:[],viewports:[],themes:[],errors:[]};

await mkdir(OUT,{recursive:true});
const browser=await chromium.launch();

async function mount(page,seed){
  await page.evaluate(async({productId,selection})=>{
    const {ProductConfigurationEditor}=await import('/product-configuration-editor.mjs');
    const {createProductConfigurationSnapshot}=await import('/work-management/domain.mjs');
    const products=await(await fetch('/api/runtime-master/integrations')).json();
    const product=products.find(row=>row.id===productId);
    const result=await(await fetch('/api/runtime-master/resolve?'+new URLSearchParams({productId,selection:JSON.stringify(selection)}))).json();
    window.bathroomEditor?.destroy();
    document.querySelector('#appMain').innerHTML='<div id="bathroomQaRoot"></div>';
    window.bathroomEditor=new ProductConfigurationEditor(document.querySelector('#bathroomQaRoot'),{initialSnapshot:createProductConfigurationSnapshot({product,result})});
    await window.bathroomEditor.mount();
  },{productId:PRODUCT,selection:seed});
  await page.waitForSelector('#dynamicForm[data-resolve-revision]');
}

async function state(page){
  return page.evaluate(()=>({selection:window.bathroomEditor.state.selection,result:window.bathroomEditor.state.resolved,snapshot:window.bathroomEditor.getSnapshot()}));
}

async function choose(page,key,value){
  const revision=await page.locator('#dynamicForm').getAttribute('data-resolve-revision');
  await page.locator(`[data-spec-key="${key}"]`).selectOption(value);
  await page.waitForFunction(old=>document.querySelector('#dynamicForm').dataset.resolveRevision!==old,revision);
}

async function persistAndReload(page,seed,tag){
  await mount(page,seed);
  const before=await state(page);
  const ids=await page.evaluate(async({snapshot,tag})=>{
    localStorage.removeItem('sash.work-management.v1');
    const {BrowserStorageDocumentStore}=await import('/work-management/storage.mjs');
    const {createRepositoryBundle}=await import('/work-management/repositories.mjs');
    const {WorkManagementService}=await import('/work-management/service.mjs');
    const store=new BrowserStorageDocumentStore(localStorage),repositories=createRepositoryBundle(store),service=new WorkManagementService(repositories);
    const {project,estimate}=await service.createProject({project_name:`浴室仕様 ${tag}`,request_company:'Browser QA'});
    const opening=await service.createOpening(project.project_id,estimate.estimate_id,{floor:'1階',room_name:'浴室',location:tag});
    const saved=await service.updateOpening(project.project_id,estimate.estimate_id,opening.opening_id,{product_configuration_snapshot:snapshot},{expectedUpdatedAt:opening.updated_at});
    return {projectId:project.project_id,estimateId:estimate.estimate_id,openingId:opening.opening_id,status:saved.status};
  },{snapshot:before.snapshot,tag});
  assert.equal(ids.status,'COMPLETE');
  await page.goto(`${BASE}/projects/${ids.projectId}/estimates/${ids.estimateId}/openings/${ids.openingId}`,{waitUntil:'networkidle'});
  await page.waitForSelector('#dynamicForm[data-resolve-revision]');
  await page.reload({waitUntil:'networkidle'});
  await page.waitForSelector('#dynamicForm[data-resolve-revision]');
  const restored=await page.evaluate(()=>({selection:window.__sashWorkApp.readDatabase().openings[0].product_configuration_snapshot.configuration,snapshot:window.__sashWorkApp.readDatabase().openings[0].product_configuration_snapshot}));
  assert.deepEqual(restored.selection,before.selection);
  assert.equal(restored.snapshot.runtime_manifest_identity,'1GJknHnjU0-hvNvTS2X8fajuTkE0SvX0m');
  assert.equal(restored.snapshot.sales_request_handoff.controlled_unresolved.length,4);
  assert.ok(restored.snapshot.sales_request_handoff.controlled_unresolved.every(row=>row.status!=='VERIFIED'&&row.auto_resolved===false));
  return {ids,before,restored};
}

function luminance(rgb){
  const values=rgb.match(/[\d.]+/g)?.slice(0,3).map(Number)??[0,0,0];
  const channels=values.map(value=>{const v=value/255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4;});
  return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];
}

try{
  for(const width of [1440,768,390]){
    const page=await browser.newPage({viewport:{width,height:1000},colorScheme:'dark'});
    page.on('pageerror',error=>report.errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
    await page.goto(`${BASE}/runtime-lab`,{waitUntil:'networkidle'});
    await mount(page,SLIDING);
    let current=await state(page);
    assert.equal(current.selection.product_variant,'bathroom');
    assert.equal(current.result.runtimeMaster.packageVersion,'v1.0');
    assert.equal(current.result.validation.errors.length,0);
    assert.equal(current.result.validation.missingRequiredFields.length,0);
    assert.equal(await page.locator('[data-spec-key="product_variant"]').inputValue(),'bathroom');
    assert.equal(await page.locator('[data-spec-key="product_variant"] option').allTextContents().then(rows=>rows.includes('浴室仕様')),true);
    const labels=await page.locator('#dynamicForm .field label').allTextContents();
    assert.ok(labels.every(label=>!/product_variant|window_type|effective_depth|support_checked/.test(label)));
    const order=current.result.fields.map(field=>field.key);
    assert.ok(order.indexOf('width')<order.indexOf('height'));
    assert.ok(order.indexOf('height')<order.indexOf('crescent_p')||!order.includes('crescent_p'));
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    assert.ok(overflow<=1,`viewport ${width} overflow=${overflow}`);
    report.viewports.push({width,overflow,status:'PASS'});

    if(width===1440){
      const a=await persistAndReload(page,SLIDING,'Scenario A 引違い窓2枚建');
      assert.equal(a.restored.snapshot.sales_request_handoff.quantity,2);
      report.scenarios.push({id:'A',flow:'引違い窓2枚建→タイル納まり→保存→再表示→見積Handoff',status:'PASS'});

      const b=await persistAndReload(page,CASEMENT,'Scenario B 開き窓');
      assert.equal(b.restored.selection.hinge,'L');
      assert.equal(b.restored.selection.handle_p,500);
      report.scenarios.push({id:'B',flow:'開き窓→ユニットバス納まり→吊元/位置→保存→再表示→見積Handoff',status:'PASS'});

      await mount(page,{...SLIDING,fit:'unit_bath',unit_pattern:'B',position_mode:'custom',crescent_p:500,unit_lower_step:10,water_prevention:'requested'});
      await choose(page,'window_type','casement');
      current=await state(page);
      for(const key of ['unit_pattern','position_mode','crescent_p','unit_lower_step','water_prevention'])assert.equal(current.selection[key],undefined,key);
      assert.equal(current.selection.width,1000);assert.equal(current.selection.height,1000);
      report.scenarios.push({id:'C',flow:'上流変更→Applicability再評価→Invalid clear→Output除外',status:'PASS'});

      await mount(page,SLIDING);
      await choose(page,'product_variant','standard');
      current=await state(page);
      assert.equal(current.selection.product_variant,'standard');
      for(const key of ['fit','unit_pattern','effective_depth','special_request'])assert.equal(current.selection[key],undefined,key);
      report.scenarios.push({id:'D',flow:'浴室仕様→標準仕様→浴室専用State除外',status:'PASS'});

      await choose(page,'product_variant','bathroom');
      current=await state(page);
      assert.equal(current.selection.product_variant,'bathroom');
      for(const key of ['frame_spec','fukashi_presence','order_width','order_height'])assert.equal(current.selection[key],undefined,key);
      report.scenarios.push({id:'E',flow:'標準仕様→浴室仕様→標準専用State除外',status:'PASS'});

      await mount(page,{...SLIDING,position_mode:'custom',crescent_p:500,special_request:'設定表証明希望'});
      current=await state(page);
      const gaps=current.snapshot.sales_request_handoff.controlled_unresolved;
      assert.equal(gaps.length,4);
      assert.ok(gaps.every(row=>row.status!=='VERIFIED'&&row.auto_resolved===false&&row.confirmation_question&&row.confirmation_to));
      assert.ok(current.result.confirmationRequests.some(row=>row.code==='IB-G004'));
      const deferred=Object.values(current.snapshot.workflow_data.site_survey.contexts)[0].controlled_unresolved;
      assert.equal(deferred.length,3);
      assert.ok(deferred.every(row=>row.status!=='VERIFIED'&&row.auto_resolved===false));
      report.scenarios.push({id:'F',flow:'商品Controlled Unresolved→質問Handoff／現場調査3件→保持・未確定',count:7,status:'PASS'});
    }

    for(const mode of ['system','light','dark']){
      await page.locator('#themeMode').selectOption(mode);
      const theme=await page.evaluate(()=>({mode:document.documentElement.dataset.themeMode,resolved:document.documentElement.dataset.theme,body:getComputedStyle(document.body).backgroundColor,card:getComputedStyle(document.querySelector('.card')).backgroundColor,text:getComputedStyle(document.querySelector('.card')).color}));
      assert.equal(theme.mode,mode);
      assert.equal(theme.resolved,mode==='light'?'light':'dark');
      if(theme.resolved==='dark'){
        assert.notEqual(theme.body,'rgb(255, 255, 255)');
        const contrast=(Math.max(luminance(theme.card),luminance(theme.text))+.05)/(Math.min(luminance(theme.card),luminance(theme.text))+.05);
        assert.ok(contrast>=4.5,`${mode} contrast=${contrast}`);
      }
      report.themes.push({width,mode,...theme,status:'PASS'});
    }
    await page.locator('#themeMode').selectOption('dark');
    await page.screenshot({path:`${OUT}/bathroom-${width}-dark.png`,fullPage:true});
    await page.close();
  }
  assert.deepEqual(report.errors,[]);
  report.status='PASS';
}catch(error){
  report.status='FAIL';report.errors.push(error.stack??error.message);throw error;
}finally{
  await browser.close();
  await writeFile(`${OUT}/browser-qa-report.json`,`${JSON.stringify(report,null,2)}\n`,'utf8');
}

console.log(`INPLUS_BATHROOM_BROWSER_QA=${report.status} scenarios=${report.scenarios.length} viewports=${report.viewports.length} themes=${report.themes.length}`);
