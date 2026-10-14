import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const BASE=process.env.QA_BASE_URL??'http://127.0.0.1:4193',OUT='artifacts/replus-runtime-v5/output';
const index=JSON.parse(await readFile('changes/replus-runtime-v5/index.json'));await mkdir(OUT,{recursive:true});
const seeds=await Promise.all(index.products.map(async row=>({row,seed:JSON.parse(await readFile('artifacts/replus-runtime-v5/'+row.id.replace(':','-')+'.json')).selection})));
for(const item of seeds){
 const extra={
  'CANDIDATE:RPL_ROOM':{glass_category:'Low-E複層ガラス',glass:'GL-LOWE-CLEAR',glass_function:'DISASTER',glass_appearance:'FROST',glass_gas:'ARGON',glass_spacer:'RESIN'},
  'CANDIDATE:RPL_TW':{glass_category:'TW-GL-TRIPLE',glass:'TW-GL-CC',glass_function:'THIN',glass_appearance:'OBSCURE',glass_gas:'TW-GAS-KRYPTON'},
 }[item.row.id];if(extra)item.seed={...item.seed,...extra};
 const colors={'CANDIDATE:RPL_ROOM':{color_mode:'FREE',sash_exterior_color:'G',sash_interior_color:'M'},'CANDIDATE:RPL_TW':{sash_exterior_color:'G',sash_interior_color:'M'},'CANDIDATE:RPL_EW':{sash_exterior_color:'G'},'CANDIDATE:RPL_BATH':{bathroom_remodel_mode:'WINDOW_ONLY',sash_exterior_color:'G',sash_interior_color:'M'}}[item.row.id];if(colors)item.seed={...item.seed,...colors};
}
const browser=await chromium.launch();
try{
 const page=await browser.newPage();await page.goto(BASE);
 const result=await page.evaluate(async seeds=>{
  const {createProductConfigurationSnapshot}=await import('/work-management/domain.mjs');
  const {createEstimateOutputModel}=await import('/estimate-output/model.mjs');
  const {createEstimatePdfBytes}=await import('/estimate-output/pdf-renderer.mjs');
  const {createEstimateXlsxBytes}=await import('/estimate-output/xlsx-renderer.mjs');
  const openings=[];
  for(const {row,seed} of seeds){
   const runtime=await(await fetch('/api/runtime-master/resolve?'+new URLSearchParams({productId:row.id,selection:JSON.stringify(seed)}))).json();
   const snapshot=createProductConfigurationSnapshot({product:{...row,sourceType:'RUNTIME_MASTER'},result:runtime});
   openings.push({opening_id:row.id,opening_no:openings.length+1,room_name:row.displayName,product_configuration_snapshot:snapshot});
  }
  const model=createEstimateOutputModel({project:{project_id:'candidate-qa',project_name:'リプラス候補7構成',request_company:'QA会社',sales_person:'QA担当'},estimate:{estimate_id:'candidate-qa-estimate',project_id:'candidate-qa',estimate_title:'候補の仕様確認',estimate_no:1,revision_no:0},openings,generatedAt:'2026-10-14T09:00:00+09:00'});
  return {model,pdf:Array.from(createEstimatePdfBytes(model)),xlsx:Array.from(createEstimateXlsxBytes(model))};
 },seeds);
 assert.equal(result.model.rows.length,7);for(const row of result.model.rows.slice(0,4)){assert.ok(JSON.stringify(row).includes('オータムブラウン'),'linked exterior color missing from output');}assert.ok(result.model.rows.every(r=>r.price===null));assert.equal(result.model.counts.complete,0);
 assert.ok(process.env.SASH_CANDIDATE_MANIFEST_FILE_ID,'Saved candidate identity required');
 assert.ok(result.model.rows.every(r=>r.audit.runtime_manifest_identity===process.env.SASH_CANDIDATE_MANIFEST_FILE_ID));
 await writeFile(OUT+'/replus-candidate-estimate.pdf',new Uint8Array(result.pdf));
 await writeFile(OUT+'/replus-candidate-estimate.xlsx',new Uint8Array(result.xlsx));
 await writeFile(OUT+'/output-model.json',JSON.stringify(result.model,null,2));
 console.log('COMMON_OUTPUT_PASS',result.model.rows.length,result.model.state);
}finally{await browser.close();}
