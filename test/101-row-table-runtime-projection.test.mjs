import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {projectRowTableMaster,evaluateRowTableProjection,applyRowTableSelection} from '../src/catalog/runtime-master/row-table-runtime-projection.mjs';
const inputs=JSON.parse(fs.readFileSync(new URL('./fixtures/native-row-table-projection-input.json',import.meta.url)));
const checked=ref=>{const b=fs.readFileSync(ref.path);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),ref.sha256);return JSON.parse(b);};
const source=checked(inputs.master), policy=checked(inputs.policy), projection=projectRowTableMaster(source,policy);
const example=JSON.parse(source.golden_test_master[1].input_configuration_json);

for(const original of source.golden_test_master) test(`original ${original.golden_test_id}: status and source reasons`,()=>{
  const result=evaluateRowTableProjection(projection,JSON.parse(original.input_configuration_json));
  assert.equal(result.constraint_status,original.expected_result);
  assert.deepEqual([...result.reason_codes].sort(),JSON.parse(original.expected_reason_codes_json).sort());
  assert.equal(result.automatic_orderability,false);
  // Golden constraints are not proof that the sales request is complete.
  assert.equal(result.request_complete,false);
});

test('projection does not mutate any original source field/status',()=>{
  const before=JSON.stringify(source);projectRowTableMaster(source,policy);assert.equal(JSON.stringify(source),before);
  assert.equal(projection.master.fields.length,source.field_master.length);
  assert.equal(projection.reset.length,8);assert.equal(projection.dimensional.length,62);
});
test('all geometry retains exact window scope',()=>{
  for(const r of projection.dimensional) assert.equal(r.selector.window_type,r.source.window_type_id);
});
for(const r of projection.dimensional.filter(r=>r.type==='SOURCE_GRAPH_GATE')) test(`source confirmation gate retained: ${r.id}`,()=>{
  const input={...r.selector,width:r.bounds.minW,height:r.bounds.minH};
  const out=evaluateRowTableProjection(projection,input);
  assert.notEqual(out.constraint_status,'VALID');assert.equal(out.automatic_orderability,false);
});
test('numeric strings and fractional millimetres cannot silently pass',()=>{
  for(const width of ['1000',1000.5,Infinity]) assert.equal(evaluateRowTableProjection(projection,{...example,width}).constraint_status,'INVALID');
});
test('unknown field is retained as an error',()=>assert.ok(evaluateRowTableProjection(projection,{...example,unregistered_option:'x'}).input_issues.some(r=>r.code==='UNKNOWN_INPUT_FIELD')));
test('unsourced multi-select is rejected',()=>assert.equal(evaluateRowTableProjection(projection,{...example,paid_option:['unknown']}).constraint_status,'INVALID'));
test('wrong identity cannot borrow another series rule set',()=>assert.equal(evaluateRowTableProjection(projection,{...example,manufacturer:'other'}).constraint_status,'INVALID'));
for(const field of projection.master.fields.filter(f=>f.selection_mode==='FIXED')) test(`fixed identity cannot be erased: ${field.field_name}`,()=>{
  for(const supplied of [null,undefined,'','other',[]]){
    const out=evaluateRowTableProjection(projection,{...example,color_combination:'SA-COLOR-BLACK',[field.field_name]:supplied});
    assert.equal(out.constraint_status,'INVALID');assert.equal(out.request_complete,false);
    assert.equal(out.values[field.field_name],field.default_value);
    assert.equal(out.state.fields[field.field_name].value,field.default_value);
    assert.ok(out.input_issues.some(i=>i.field===field.field_name&&i.code==='FIXED_IDENTITY_CONFLICT'));
  }
});
test('omitted identities retain source defaults in a complete input',()=>{
  const out=evaluateRowTableProjection(projection,{...example,color_combination:'SA-COLOR-BLACK'});
  assert.equal(out.request_complete,true);
  for(const field of projection.master.fields.filter(f=>f.selection_mode==='FIXED')) assert.equal(out.values[field.field_name],field.default_value);
});
test('unknown condition and action fail during projection',()=>{
  for(const [key,patch] of [['condition_json',{field:'width',operator:'EXECUTE',value:1}],['result_json',{target_field:'width',action:'execute',values:[]}]]){
    const copy=structuredClone(source);copy.dependency_rule_master[0][key]=JSON.stringify(patch);assert.throws(()=>projectRowTableMaster(copy,policy),/unsupported/);
  }
});
test('unknown boundary formula is not evaluated as code',()=>{
  const copy=structuredClone(source);copy.custom_size_region_master[0].boundary_formula='process.exit(0)';assert.throws(()=>projectRowTableMaster(copy,policy),/unparsed formula/);
});
test('source size lookup keeps construction/window/dimensions together',()=>{
  const row=source.size_master[0];const input={window_type:row.window_type_id,construction_module:row.construction_module,opening_class:row.opening_class,size_code:row.size_code};
  const out=evaluateRowTableProjection(projection,input);
  assert.equal(out.values.width,row.width);assert.equal(out.values.height,row.height);assert.ok(out.standard_source_row_ids.includes(row.size_master_id));
  assert.equal(evaluateRowTableProjection(projection,{...input,width:row.width+1,height:row.height}).constraint_status,'INVALID');
});
test('cross-window source size cannot leak',()=>{
  const row=source.size_master[0];const input={...example,size_code:row.size_code,window_type:'WT-SA-SOTODAOSHI',opening_angle:'60_degree'};
  const out=evaluateRowTableProjection(projection,input);assert.equal(out.constraint_status,'INVALID');assert.ok(out.input_issues.some(i=>i.code==='STANDARD_SIZE_SCOPE_MISMATCH'));
});
test('source reset event uses common engine and does not run continually',()=>{
  const out=evaluateRowTableProjection(projection,{...example,color_combination:'SA-COLOR-BLACK',screen_type:'sliding_screen'});
  assert.equal(out.state.fields.width.value,example.width);
  const next=applyRowTableSelection(projection,out.state,'window_type','WT-SA-FIX-IN');
  assert.equal(next.fields.width.value,null);assert.equal(next.fields.screen_type.value,null);
  assert.equal(next.fields.color_combination.value,'SA-COLOR-BLACK');
});
test('restoring the same source values is deterministic',()=>{
  const out=evaluateRowTableProjection(projection,example);const again=evaluateRowTableProjection(projection,JSON.parse(JSON.stringify(example)));
  assert.equal(JSON.stringify(out),JSON.stringify(again));
});
test('source required fields remain separate from constraint validity',()=>{
  const out=evaluateRowTableProjection(projection,example);assert.equal(out.constraint_status,'VALID');assert.ok(out.state.missing_required_fields.includes('color_combination'));assert.equal(out.request_complete,false);
});
test('specific source error retains additional range diagnosis',()=>{
  const input=JSON.parse(source.golden_test_master[5].input_configuration_json);const out=evaluateRowTableProjection(projection,input);
  assert.equal(out.constraint_status,'INVALID');assert.equal(out.dimension.status,'BLOCK');
  assert.ok(out.all_reason_codes.includes('SA_SIZE_OUT_OF_RANGE'));
  assert.ok(out.reason_codes.includes('SA_ELECTRIC_SHUTTER_WIDTH_TOO_SMALL'));
});
