import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveRuntimeAppProduct,getRuntimeAppIntegration} from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import {createProductConfigurationSnapshot} from '../src/work-management/domain.mjs';
import {createEstimateOutputModel} from '../src/estimate-output/model.mjs';
const PRODUCT='SER-LIXIL-INPLUS';
const supported=['2枚建','2枚建（障子W指定）'];
const seed={product_variant:'standard',window_type:'引違い窓',sash_configuration:'2枚建',glass_family:'一般複層',glass_type:'透明',frame_spec:'standard',upper_frame_spec:'standard',lower_frame_spec:'general',fukashi_presence:'none',order_width:1000,order_height:1000};
const resolve=selection=>resolveRuntimeAppProduct(PRODUCT,selection);
const field=result=>result.fields.find(row=>row.key==='reverse_handing');

for(const sash_configuration of supported)for(const reverse_handing of ['標準','逆勝手']){
  test(`Inplus ${sash_configuration}/${reverse_handing}: Formal values, dependency, snapshot and estimate output`,async()=>{
    const result=await resolve({...seed,sash_configuration,reverse_handing});
    assert.equal(field(result).displayLabel,'勝手');
    assert.deepEqual(field(result).values.map(row=>[row.value,row.displayLabel]),[['標準','標準勝手'],['逆勝手','逆勝手']]);
    assert.deepEqual(field(result).parentFields,['window_type','sash_configuration']);
    const keys=result.fields.map(row=>row.key);
    assert.ok(keys.indexOf('sash_configuration')<keys.indexOf('reverse_handing'));
    assert.ok(keys.indexOf('reverse_handing')<keys.indexOf('body_color'));
    assert.equal(result.selection.reverse_handing,reverse_handing);
    const snapshot=createProductConfigurationSnapshot({product:getRuntimeAppIntegration(PRODUCT),result});
    const restored=await resolve(JSON.parse(JSON.stringify(snapshot)).configuration);
    assert.equal(restored.selection.reverse_handing,reverse_handing);
    const label=reverse_handing==='標準'?'標準勝手':'逆勝手';
    assert.ok(snapshot.display_summary.some(row=>row.key==='reverse_handing'&&row.label==='勝手'&&row.value===label));
    const output=createEstimateOutputModel({project:{project_id:'prj-qa',project_name:'逆勝手QA'},estimate:{estimate_id:'est-qa',project_id:'prj-qa',estimate_no:1,revision_no:0},openings:[{opening_no:1,status:'COMPLETE',room_name:'居室',product_configuration_snapshot:snapshot}]});
    assert.ok(JSON.stringify(output).includes(`勝手: ${label}`));
  });
}
for(const sash_configuration of ['3枚建（障子W指定）','4枚建','4枚建（障子W指定）']){
  test(`Inplus ${sash_configuration}: hide/clear and exclude old handing from Handoff`,async()=>{
    const previous=await resolve({...seed,reverse_handing:'逆勝手'});
    const result=await resolve({...previous.selection,sash_configuration});
    assert.equal(field(result),undefined);
    assert.equal(result.selection.reverse_handing,undefined);
    assert.ok(result.clearedFields.includes('reverse_handing'));
    const snapshot=createProductConfigurationSnapshot({product:getRuntimeAppIntegration(PRODUCT),result});
    assert.equal(snapshot.configuration.reverse_handing,undefined);
    assert.equal(snapshot.display_summary.some(row=>row.key==='reverse_handing'),false);
  });
}
for(const window_type of ['FIX窓','開き窓','テラスドア']){
  test(`Inplus ${window_type}: no sliding handing`,async()=>{
    const result=await resolve({...seed,window_type,reverse_handing:'逆勝手'});
    assert.equal(field(result),undefined);
    assert.equal(result.selection.reverse_handing,undefined);
  });
}
test('Inplus: compatible configuration changes retain valid handing; unselected sash hides it',async()=>{
  const result=await resolve({...seed,reverse_handing:'逆勝手'});
  for(const sash_configuration of [...supported].reverse()){
    const next=await resolve({...result.selection,sash_configuration});
    assert.equal(next.selection.reverse_handing,'逆勝手');
    assert.equal(next.clearedFields.includes('reverse_handing'),false);
  }
  assert.equal(field(await resolve({window_type:'引違い窓'})),undefined);
});
test('Inplus bathroom: unsupported by current Formal evidence, never copied from residential',async()=>{
  for(const window_type of ['sliding','casement']){
    const result=await resolve({product_variant:'bathroom',window_type,reverse_handing:'逆勝手'});
    assert.equal(field(result),undefined);
    assert.equal(result.selection.reverse_handing,undefined);
  }
});
test('Inplus reverse handing retains Formal glass exclusions RL-008',async()=>{
  const {loadRegisteredRuntime}=await import('../src/catalog/runtime-master/runtime-master-registry.mjs');
  const runtime=await loadRegisteredRuntime('LIXIL','インプラス');
  const state=runtime.resolver({...seed,reverse_handing:'逆勝手'});
  for(const value of ['LE-A-C-WN','LE-A-G-WN','LE-AR-C-WN','LE-AR-G-WN','PG-A-WN','SG-W3-N','SG-W5-G','SG-W5-N']){
    assert.equal(state.fields.glass_detail.allowed_values.includes(value),false);
  }
});
