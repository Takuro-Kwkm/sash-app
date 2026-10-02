import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveRuntimeAppProduct,runtimeAppIntegrationInventory} from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import {createProductConfigurationSnapshot} from '../src/work-management/domain.mjs';
import {createEstimateOutputModel} from '../src/estimate-output/model.mjs';
import {RECHENT_ID,completeRechent} from './helpers/rechent-estimate-cases.mjs';

// IG3700 (2026/04) RD-4/RD-12, door-body specification column.
const labels={OUTDOOR_READER:'屋外リーダー用',KEYPAD_OUTDOOR_READER:'テンキー付屋外リーダー用'};
const field=(result,key)=>result.fields.find(row=>row.key===key);

test('official reader labels preserve hardware candidates, internal values and saved/handoff presentation',async()=>{
 const product=runtimeAppIntegrationInventory().find(row=>row.id===RECHENT_ID);
 for(const thermal_spec of ['INSULATION_K2','INSULATION_K4']){
  for(const electric_lock_power of ['BATTERY','AC100V']){
   for(const electric_lock_reader of Object.keys(labels)){
    const result=await completeRechent({thermal_spec,opening_type:'SINGLE',design:'G12',size_w:800,handle_type:'A',lock_type:'FAMILOCK',electric_lock_power,electric_lock_reader});
    assert.equal(result.selection.electric_lock_reader,electric_lock_reader);
    assert.deepEqual(field(result,'electric_lock_reader').values.map(row=>[row.value,row.displayLabel]),Object.entries(labels));
    const saved=JSON.parse(JSON.stringify(createProductConfigurationSnapshot({product,result})));
    assert.equal(saved.configuration.electric_lock_reader,electric_lock_reader);
    assert.equal(saved.display_summary.find(row=>row.key==='electric_lock_reader').value,labels[electric_lock_reader]);
    const reloaded=await resolveRuntimeAppProduct(RECHENT_ID,saved.configuration);
    assert.deepEqual(reloaded.selection,result.selection);
    assert.deepEqual(field(reloaded,'electric_lock_reader'),field(result,'electric_lock_reader'));
    const output=createEstimateOutputModel({project:{project_id:'reader-qa',project_name:'Reader QA'},estimate:{estimate_id:'reader-estimate',project_id:'reader-qa'},openings:[{opening_id:'reader-opening',project_id:'reader-qa',estimate_id:'reader-estimate',opening_no:1,product_configuration_snapshot:saved}]});
    assert.equal(output.rows[0].configuration.electric_lock_reader,electric_lock_reader);
    assert.equal(output.rows[0].display_summary.find(row=>row.key==='electric_lock_reader').value,labels[electric_lock_reader]);
    const manual=await resolveRuntimeAppProduct(RECHENT_ID,{...result.selection,lock_type:'MANUAL'});
    for(const key of ['electric_lock_reader','electric_lock_power','electric_lock_plan','key_set','additional_key']){
     assert.equal(Object.hasOwn(manual.selection,key),false,key);
     assert.equal(Boolean(field(manual,key)),false,key);
    }
   }
  }
 }
 const sHandle=await completeRechent({thermal_spec:'INSULATION_K2',opening_type:'SINGLE',design:'G12',handle_type:'S',lock_type:'FAMILOCK'});
 assert.deepEqual(field(sHandle,'electric_lock_reader').values.map(row=>row.value),['OUTDOOR_READER']);
 const forbidden=await resolveRuntimeAppProduct(RECHENT_ID,{...sHandle.selection,electric_lock_reader:'KEYPAD_OUTDOOR_READER'});
 assert.equal(Object.hasOwn(forbidden.selection,'electric_lock_reader'),false);
});
