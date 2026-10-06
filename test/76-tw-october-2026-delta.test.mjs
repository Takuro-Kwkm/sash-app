import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {getRuntimeAppIntegration} from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { adaptTwCanonicalWorkbookReferenceV2 } from '../src/catalog/runtime-master/tw-canonical-workbook-reference-v2-adapter.mjs';
import { evaluateTwCanonicalWorkbookRuntimeV2 } from '../src/catalog/runtime-master/tw-canonical-workbook-runtime-engine-v2.mjs';
import { toRuntimeUiResult } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { createProductConfigurationSnapshot } from '../src/work-management/domain.mjs';
import { createEstimateOutputModel } from '../src/estimate-output/model.mjs';
import { loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
const id='SER-LIXIL-TW',trap='SWT-LIX-TW-FIX-TRAPEZOID-IN',vent='OP-LIX-TW-SEPARATE-FILTER-VENT',filter='OP-LIX-TW-SEPARATE-VENT-FILTER';
let master,document;
if (process.env.TW_CANDIDATE_JSON) {
 document=JSON.parse(fs.readFileSync(process.env.TW_CANDIDATE_JSON));
 master=adaptTwCanonicalWorkbookReferenceV2({documents:{runtime_master:document},manifest:{packageVersion:document.package_version}});
} else if(getRuntimeAppIntegration('SER-LIXIL-TW').packageVersion!=='integrated-v0.5') {
 document=JSON.parse(brotliDecompressSync(Buffer.from(fs.readFileSync(new URL('../changes/lixil-tw-202610/candidate-runtime.json.br.b64',import.meta.url),'utf8'),'base64')));
 master=adaptTwCanonicalWorkbookReferenceV2({documents:{runtime_master:document},manifest:{packageVersion:document.package_version}});
} else {
 master=(await loadRegisteredRuntime('LIXIL','TW')).master;
}
const integration={id,manufacturer:'LIXIL',series:'TW',uiCategory:'NEW_CONSTRUCTION_EXTERIOR_WINDOW',packageVersion:'integrated-v0.5',masterVersion:'integrated-v0.5',schemaVersion:'2.0'};
const resolve=selection=>toRuntimeUiResult(master,evaluateTwCanonicalWorkbookRuntimeV2(master,selection),integration);
function complete(input) {
 let selection={...input},result;
 for(let pass=0;pass<40;pass++) {
  result=resolve(selection);selection={...result.selection};
  const field=result.fields.find(f=>f.required && selection[f.key]===undefined && f.values.length);
  if(!field)return result;
  selection[field.key]=field.values[0].value;
 }
 throw Error('Selection did not converge');
}
test('October catalog adds a custom-only trapezoid with two heights; absent H2 cannot advance',()=>{
 assert.equal(master.provider.windows.length,26);
 const result=resolve({window_type:trap,size_mode:'STANDARD',custom_width:1290,custom_height:1480});
 assert.equal(result.selection.size_mode,'CUSTOM');
 assert.ok(result.validation.missingRequiredFields.includes('custom_height_secondary'));
 assert.ok(!result.fields.some(f=>f.key==='size'||f.key==='exterior_color'));
 assert.deepEqual(result.fields.filter(f=>['custom_width','custom_height','custom_height_secondary'].includes(f.key)).map(f=>f.dataType),['NUMBER','NUMBER','NUMBER']);
});
test('Trapezoid step, both heights and slope bounds fail closed; valid geometry remains manufacturer review',()=>{
 const base={window_type:trap,custom_width:1290,custom_height:1480,custom_height_secondary:1250};
 const good=complete(base);assert.equal(good.dimensionResult.status,'REVIEW_REQUIRED');assert.equal(good.orderReady,false);
 for(const patch of [{custom_width:269},{custom_height_secondary:149},{custom_width:1900,custom_height:1900},{custom_height_secondary:1480},{custom_width:300,custom_height:1000,custom_height_secondary:150}]) {
  const bad=resolve({...base,...patch});assert.equal(bad.dimensionResult.status,'BLOCK',JSON.stringify(patch));assert.equal(bad.validation.status,'INVALID');
  assert.ok(!bad.fields.some(f=>f.key==='exterior_color'));
 }
 const switched=resolve({...good.selection,window_type:'SWT-LIX-TW-FIX-IN-MADO',size_mode:'STANDARD'});
 assert.equal(switched.selection.custom_height_secondary,undefined);
 assert.ok(!switched.fields.some(f=>f.key==='custom_height_secondary'));
});
test('Separate vent requires the correct window, double glazing, dimension range and parent for replacement filter',()=>{
 let good=complete({window_type:'SWT-LIX-TW-TATE-GREMON-T',size_mode:'CUSTOM',custom_width:640,custom_height:1170,glass_base:'Low-E複層ガラス'});
 assert.ok(good.fields.find(f=>f.key==='option').values.some(v=>v.value===vent));
 assert.ok(!good.fields.find(f=>f.key==='option').values.some(v=>v.value===filter));
 good=resolve({...good.selection,option:[vent]});assert.ok(good.fields.find(f=>f.key==='option').values.some(v=>v.value===filter));
 const triple=complete({...good.selection,glass_base:'トリプルガラス',option:[vent,filter]});
 assert.ok(!triple.fields.find(f=>f.key==='option')?.values.some(v=>v.value===vent));assert.ok(!(triple.selection.option??[]).includes(vent));assert.ok(!(triple.selection.option??[]).includes(filter));
 const short=complete({window_type:'SWT-LIX-TW-TATE-GREMON-T',size_mode:'CUSTOM',custom_width:640,custom_height:570,glass_base:'Low-E複層ガラス'});
 assert.ok(!short.fields.find(f=>f.key==='option')?.values.some(v=>v.value===vent));
 const fixed=complete({window_type:trap,custom_width:1290,custom_height:1480,custom_height_secondary:1250});assert.ok(!fixed.fields.find(f=>f.key==='option')?.values.some(v=>v.value===vent));
});
test('Save/reload/output retains both trapezoid heights, source confirmation and the new package identity',()=>{
 const result=complete({window_type:trap,custom_width:1290,custom_height:1480,custom_height_secondary:1250});
 assert.equal(result.validation.missingRequiredFields.length,0);
 const snapshot=createProductConfigurationSnapshot({product:integration,result});
 const reload=JSON.parse(JSON.stringify(snapshot));assert.equal(reload.configuration.custom_height_secondary,1250);
 assert.ok(reload.confirmation_requests.some(r=>r.code==='TW_TRAPEZOID_GLASS_AND_BEAD'));
 const output=createEstimateOutputModel({project:{project_id:'p',project_name:'TW QA'},estimate:{estimate_id:'e',project_id:'p'},openings:[{opening_id:'o',estimate_id:'e',opening_no:1,status:'COMPLETE',product_configuration_snapshot:reload}]});
 assert.match(JSON.stringify(output),/H2 1250/);assert.match(JSON.stringify(output),/専用ガラス/);
 assert.equal(reload.package_version,'integrated-v0.5');
 const rerender=resolve(reload.configuration);assert.equal(rerender.selection.custom_height_secondary,1250);
});
test('Existing six FS grille values and source-limited options remain unchanged',()=>{
 const rows=master.sourceRows.specs.filter(r=>r['窓種ID']==='WT-SAIHU-KATTEGUCHI'&&r['固有仕様種別']==='網付格子種類');
 assert.equal(rows.length,6);
 assert.deepEqual(master.optionCodeSourceLimitations.map(r=>r.option_id).sort(),['OP-LIX-TW-CAT-28322','OP-LIX-TW-CAT-28323']);
});

test('Changed exhaust fan condition excludes TF/TFT and vertical sash H above 1400',()=>{
 for(const node of ['SWT-LIX-TW-TATE-GREMON-TF','SWT-LIX-TW-TATE-GREMON-TFT']){const r=complete({window_type:node,size_mode:'CUSTOM',custom_width:1640,custom_height:1170});assert.ok(!r.fields.find(f=>f.key==='option')?.values.some(v=>v.value==='OP-LIX-TW-CAT-28304'));}
 const r=complete({window_type:'SWT-LIX-TW-TATE-GREMON-T',size_mode:'CUSTOM',custom_width:640,custom_height:1570});assert.ok(!r.fields.find(f=>f.key==='option')?.values.some(v=>v.value==='OP-LIX-TW-CAT-28304'));
});
