import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveRuntimeAppProduct} from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import {createProductConfigurationSnapshot} from '../src/work-management/domain.mjs';
const id='SER-YKKAP-UCHIRIMO',seed={room_specification:'residential',window_type:'fix_window',size_w:500,size_h:500};
test('sales extensions are API fields with canonical slots; invalid requests clear, valid requests persist',async()=>{
 const r=await resolveRuntimeAppProduct(id,{...seed,glass_family:'insulating_glass',sales_glass_appearance:'clear',sales_spacer_type:'resin',sales_gas_fill:'argon'});
 for(const [key,slot] of [['sales_glass_appearance','glass_type'],['sales_spacer_type','spacer_type'],['sales_gas_fill','gas_fill']])assert.equal(r.fields.find(f=>f.key===key)?.semanticSlot,slot);
 assert.equal(r.sales_request_handoff.glass_structure,'MANUFACTURER_ESTIMATE_CONFIRMATION');assert.equal(r.orderReady,false);assert.notEqual(r.validation.status,'VALID');
 const changed=await resolveRuntimeAppProduct(id,{...r.selection,glass_family:'single_glazing'});
 assert.equal(changed.selection.sales_spacer_type,undefined);assert.equal(changed.selection.sales_gas_fill,undefined);assert.equal(changed.selection.sales_glass_appearance,'clear');
 assert.equal(changed.sales_request_handoff.spacer_type_request,undefined);
 const snap=createProductConfigurationSnapshot({product:{id},result:changed});assert.equal(snap.configuration.sales_spacer_type,undefined);assert.equal(snap.display_summary.some(f=>f.key==='sales_spacer_type'),false);
 const invalid=await resolveRuntimeAppProduct(id,{...seed,glass_family:'insulating_glass',sales_glass_appearance:'washi'});assert.equal(invalid.selection.sales_glass_appearance,undefined);
});
test('inner dimensions retain SIZE semantics and render as the final sales-input step; internal selectors never render',async()=>{
 for(const [product,selection] of [[id,seed],['SER-LIXIL-INPLUS',{window_type:'引違い窓',sash_configuration:'2枚建',upper_frame_spec:'標準',order_width:1000,order_height:1000}]]){
  const r=await resolveRuntimeAppProduct(product,selection);assert.equal(r.fields.some(f=>['size_mode','size_class'].includes(f.key)),false);assert.ok(r.selection.size_mode);
  const dimension=r.fields.filter(f=>f.presentationSlot==='INNER_WINDOW_FINAL_DIMENSION');assert.equal(dimension.length,2);assert.ok(dimension.every(f=>f.semanticStage==='SIZE'));
  assert.deepEqual(r.fields.slice(-dimension.length).map(f=>f.key),dimension.map(f=>f.key));
 }
});
test('renderer, summary and estimate contain no product-specific flow overrides or field mutations',()=>{
 for(const path of ['src/ui/web/product-configuration-editor.mjs','src/estimate-output/model.mjs','src/work-management/domain.mjs','src/work-management/service.mjs']){
  const s=readFileSync(path,'utf8');assert.doesNotMatch(s,/UCHIRIMO_PRODUCT_ID|product[Ii]d\s*===\s*['"]SER-/);assert.doesNotMatch(s,/result\.fields\.(?:splice|push|sort|filter)\(/);
 }
});
test('inner revalidation preserves applicable survivors, removes invalid parents and stabilizes before save',async()=>{
 const before={room_specification:'residential',window_type:'sliding_window',sash_configuration:'offset_two_panel',reverse_handing:'reverse',size_w:501,size_h:501,frame_color:'greige',glass_family:'insulating_glass',crescent_presence:'crescentless_special_order',crescent_type:'button_lock',crescent_position:'custom',pull_handle_type:'boat_pull',pull_handle_position:'custom',middle_rail_option:'enabled',middle_rail_position:'custom',ventilator_option:'inner_and_outer',bottom_rail_type:'partition_lower_rail',frame_installation_mode:'frame_projection',extension_frame_type:'fukashi_25',sales_glass_appearance:'pattern'};
 const r=await resolveRuntimeAppProduct(id,{...before,room_specification:'bathroom'});
 assert.equal(r.selection.sash_configuration,undefined);assert.equal(r.selection.reverse_handing,'reverse');
 assert.ok(r.clearedFields.includes('sash_configuration'));
 const restored=await resolveRuntimeAppProduct(id,r.selection);assert.deepEqual(restored.selection,r.selection);
});
test('internal classification ambiguity is preserved as an estimate confirmation, never a completed price',async()=>{
 const {createEstimateOutputModel}=await import('../src/estimate-output/model.mjs');
 const r=await resolveRuntimeAppProduct(id,{room_specification:'residential',window_type:'sliding_window',sash_configuration:'two_panel',size_w:1000,size_h:1000});
 assert.ok(r.confirmationRequests?.some(row=>row.code==='INNER_WINDOW_SIZE_CLASS_CONFIRM'));assert.equal(r.orderReady,false);
 const snapshot=createProductConfigurationSnapshot({product:{id},result:r});
 const model=createEstimateOutputModel({project:{project_id:'p'},estimate:{estimate_id:'e',project_id:'p'},openings:[{opening_id:'o',status:'COMPLETE',product_configuration_snapshot:{...snapshot,price:100,validation_state:'VALID'}}]});
 assert.equal(model.rows[0].state,'NEEDS_CONFIRMATION');assert.ok(model.rows[0].issues.some(row=>row.code==='INNER_WINDOW_SIZE_CLASS_CONFIRM'));
});
