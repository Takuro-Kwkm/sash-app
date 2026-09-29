import test from 'node:test';
import assert from 'node:assert/strict';
import {loadRegisteredRuntime} from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import {resolveFrameContract,matches,toSourceSelection} from '../src/catalog/runtime-master/inner-window-frame-engine.mjs';
const runtime={inplus:await loadRegisteredRuntime('LIXIL','インプラス'),uchirimo:await loadRegisteredRuntime('YKK AP','ウチリモ 内窓')};
const i=runtime.inplus.master.innerWindowFrameContract,u=runtime.uchirimo.master.innerWindowFrameContract;
const check=(id,fn)=>test('R3 canonical '+id,fn);
const common=['frame_spec','upper_frame_spec','lower_frame_spec','fukashi_presence','fukashi_sides','fukashi_depth','fukashi_reinforcement'];
for(const [key,c] of [['inplus',i],['uchirimo',u]]){
 check(key+'-common-fields',()=>assert.deepEqual(c.canonical_field_order,common));
 check(key+'-duplicate-field',()=>assert.equal(new Set(c.fields.map(f=>f.field_name)).size,c.fields.length));
 check(key+'-value-id-unique',()=>c.fields.forEach(f=>assert.equal(new Set(f.values.map(v=>v.value)).size,f.values.length)));
 check(key+'-schema',()=>c.fields.forEach(f=>{assert.ok(f.display_label);assert.ok(Array.isArray(f.values));assert.ok(f.selection_mode);f.values.forEach(v=>assert.ok(v.evidence.length));}));
 const s={window_type:key==='inplus'?'引違い窓':'sliding_window',room_specification:'residential',glass_family:'単板',frame_spec:'standard',upper_frame_spec:'standard',lower_frame_spec:key==='inplus'?'general':'standard',fukashi_presence:'present',fukashi_sides:'three_side',fukashi_depth:key==='inplus'?'50':'60',fukashi_reinforcement:key==='inplus'?'reinforced_50_small':'reinforcement_square_pipe'};
 check(key+'-presence-clear',()=>{const r=resolveFrameContract(c,{...s,fukashi_presence:'none'});for(const k of ['fukashi_depth','fukashi_sides','fukashi_reinforcement'])assert.equal(k in r.selection,false);});
 check(key+'-depth-clear',()=>{const r=resolveFrameContract(c,{...s,fukashi_depth:key==='inplus'?'20':'25'});assert.equal(r.selection.fukashi_reinforcement,undefined);assert.equal(r.selection.fukashi_depth,key==='inplus'?'20':'25');});
 check(key+'-valid-retain',()=>{const r=resolveFrameContract(c,s);assert.equal(r.selection.fukashi_depth,s.fukashi_depth);assert.equal(r.selection.fukashi_reinforcement,s.fukashi_reinforcement);});
 check(key+'-unknown-clear',()=>{const r=resolveFrameContract(c,{...s,fukashi_depth:'999',frame_spec:'invented'});assert.equal(r.selection.frame_spec,undefined);assert.equal(r.selection.fukashi_depth,undefined);});
 check(key+'-legacy-absent',()=>{const r=resolveFrameContract(c,{...s,...Object.fromEntries(c.legacy_internal_fields.map(k=>[k,'STALE']))});for(const k of c.legacy_internal_fields){assert.equal(k in r.selection,false);assert.equal(k in r.handoff.selection,false);}});
 check(key+'-stable-roundtrip',()=>{const r=resolveFrameContract(c,s),r2=resolveFrameContract(c,JSON.parse(JSON.stringify(r.selection)));assert.deepEqual(r2.selection,r.selection);});
 check(key+'-nonapplicable-clear',()=>{const r=resolveFrameContract(c,{...s,window_type:key==='inplus'?'FIX窓':'fix_window'});assert.equal(r.selection.lower_frame_spec,undefined);assert.equal(r.selection.upper_frame_spec,undefined);});
}
check('uchirimo-no-lixil-values',()=>{assert.deepEqual(u.fields.find(f=>f.field_name==='fukashi_depth').values.map(v=>v.value),['25','40','60']);for(const k of ['upper_frame_spec','fukashi_sides'])assert.equal(u.fields.find(f=>f.field_name===k).selection_mode,'NOT_APPLICABLE');});
check('uchirimo-bath-transition',()=>{const r=resolveFrameContract(u,{room_specification:'bathroom',window_type:'sliding_window',frame_spec:'frame_projection',fukashi_presence:'present',fukashi_depth:'60',fukashi_reinforcement:'reinforcement_bracket',lower_frame_spec:'partition_lower_rail'});assert.equal(r.selection.frame_spec,'standard');assert.equal(r.selection.fukashi_presence,'none');assert.equal(r.selection.fukashi_depth,undefined);assert.equal(r.selection.lower_frame_spec,'bathroom_integrated_aluminum_rail');});
check('uchirimo-source-depth-mapping',()=>assert.equal(toSourceSelection(u,{fukashi_presence:'present',fukashi_depth:'40'}).extension_frame_type,'fukashi_40'));
check('inplus-upper-source-mapping',()=>assert.equal(toSourceSelection(i,{upper_frame_spec:'adjust_upper_frame'}).upper_frame_spec,'アジャスト上枠'));
check('inplus-offset-partition-forbidden',()=>{const r=resolveFrameContract(i,{window_type:'引違い窓',glass_family:'単板',frame_spec:'frame_projection',lower_frame_spec:'partition',fukashi_presence:'none'});assert.equal(r.selection.frame_spec,'frame_projection');assert.equal(r.selection.lower_frame_spec,undefined);});
check('inplus-adjust-fukashi-forbidden',()=>{const r=resolveFrameContract(i,{window_type:'引違い窓',glass_family:'単板',upper_frame_spec:'adjust_upper_frame',fukashi_presence:'present',fukashi_depth:'20',fukashi_sides:'three_side'});assert.equal(r.selection.fukashi_depth,undefined);});
check('inplus-unproven-composite-no-auto',()=>{const r=resolveFrameContract(i,{window_type:'引違い窓',glass_family:'単板',frame_spec:'standard',lower_frame_spec:'general',fukashi_presence:'present',fukashi_depth:'50',fukashi_reinforcement:'corner',fukashi_sides:'three_side'});assert.ok(r.confirmation_requests.length);assert.equal(r.order_ready,false);});
check('inplus-required-reinforcement-handoff',()=>{const r=resolveFrameContract(i,{window_type:'引違い窓',glass_family:'単板',frame_spec:'standard',lower_frame_spec:'general',fukashi_presence:'present',fukashi_depth:'40',fukashi_sides:'three_side',fukashi_reinforcement:'none'});assert.ok(r.handoff.confirmation_requests.some(x=>x.id==='IWC-INP-DEPTH-REINFORCEMENT'));});
check('inplus-l-handle-terrace',()=>{const r=resolveFrameContract(i,{window_type:'引違い窓',size_class:'テラスタイプ',option_items:['FR-L-HANDLE']});assert.ok(r.selection.option_items.includes('FR-L-HANDLE'));const r2=resolveFrameContract(i,{...r.selection,size_class:'窓タイプ'});assert.ok(!r2.selection.option_items.includes('FR-L-HANDLE'));});
// Re-derive the new scope from current fields and source rows, no legacy count requirement.
let transitions=0;
for(const [key,c] of [['inplus',i],['uchirimo',u]]){
 const roots=key==='inplus'?c.matrix.scope_rows.map(x=>({window_type:x.window_type,glass_family:x.glass_family==='*'?'単板':x.glass_family})):[{window_type:'sliding_window',room_specification:'residential'},{window_type:'sliding_window',room_specification:'bathroom'},{window_type:'fix_window',room_specification:'residential'}];
 for(const context of roots)for(const f of c.fields)for(const v of f.values){
  check(key+'-transition-'+transitions++,()=>{const input={...context,frame_spec:'standard',fukashi_presence:'present',fukashi_depth:key==='inplus'?'50':'60',fukashi_sides:'three_side',[f.field_name]:v.value};
   const r=resolveFrameContract(c,input),r2=resolveFrameContract(c,r.selection);
   assert.deepEqual(r2.selection,r.selection);
   for(const [name,state] of Object.entries(r.fields))if(state.visibility==='HIDE')assert.equal(name in r.selection,false);
   if(r.confirmation_requests.length)assert.notEqual(r.status,'VALID');
  });
 }
}

const seeds={inplus:{window_type:'引違い窓',sash_configuration:'2枚建',size_class:'窓タイプ',glass_family:'単板',order_width:1000,order_height:1000,upper_frame_spec:'standard',frame_spec:'standard',lower_frame_spec:'general',fukashi_presence:'none'},uchirimo:{room_specification:'residential',window_type:'sliding_window',sash_configuration:'two_panel',size_class:'window',size_w:1000,size_h:1000,glass_family:'insulating_glass',frame_spec:'standard',lower_frame_spec:'standard',fukashi_presence:'none'}};
const uch=runtime.uchirimo.master.canonical;
for(const [key,rt] of Object.entries(runtime)){
 const c=rt.master.innerWindowFrameContract,seed=seeds[key];
 test('registered R3 '+key+'-public-registry-unique',()=>assert.equal(rt.master.fields.length,new Set(rt.master.fields.map(f=>f.field_name)).size));
 test('registered R3 '+key+'-source-fields-internal',()=>{for(const k of c.legacy_internal_fields)assert.ok(!rt.master.fields.some(f=>f.field_name===k));});
 test('registered R3 '+key+'-common-retained',()=>{const state=rt.resolver(seed);assert.equal(state.fields.frame_spec.value,'standard');assert.equal(state.fields.fukashi_presence.value,'none');});
 test('registered R3 '+key+'-stable-roundtrip',()=>{const a=rt.resolver(seed),selection=Object.fromEntries(Object.entries(a.fields).filter(([,f])=>f.value!==null&&f.value!==undefined).map(([k,f])=>[k,f.value]));const b=rt.resolver(selection);for(const f of c.fields)assert.deepEqual(b.fields[f.field_name].value,a.fields[f.field_name].value);});
 test('registered R3 '+key+'-upstream-clear',()=>{const s=rt.resolver({...seed,fukashi_presence:'none',fukashi_depth:key==='inplus'?'50':'60',fukashi_reinforcement:key==='inplus'?'reinforced_50_small':'reinforcement_square_pipe'});assert.equal(s.fields.fukashi_depth.value,null);assert.equal(s.fields.fukashi_reinforcement.value,null);});
 for(const f of c.fields)for(const v of f.values)test('registered R3 '+key+'-'+f.field_name+'-'+v.value,()=>{
  const s=rt.resolver({...seed,fukashi_presence:'present',fukashi_depth:key==='inplus'?'50':'60',fukashi_sides:'three_side',[f.field_name]:v.value});
  for(const k of c.legacy_internal_fields)assert.equal(s.fields[k],undefined);
  for(const def of c.fields){const k=def.field_name,field=s.fields[k];if(field.visibility==='HIDE')assert.ok(field.value===null||field.value===undefined, k+' hidden stale '+field.value);}
  assert.equal(s.order_ready,false);
 });
}
for(const node of uch.product_nodes){
 const seed={room_specification:node.room,window_type:node.window_type,sash_configuration:node.sash_configuration,size_class:node.size_class,size_w:1000,size_h:1000,frame_spec:'standard',fukashi_presence:'none',lower_frame_spec:'standard'};
 test('uchirimo-node-'+node.node_id,()=>{const s=runtime.uchirimo.resolver(seed);assert.equal(s.fields.window_type.value,node.window_type);assert.equal(s.fields.sash_configuration.value,node.sash_configuration);if(node.room==='bathroom'){assert.equal(s.fields.fukashi_presence.value,'none');if(node.window_type==='sliding_window')assert.equal(s.fields.lower_frame_spec.value,'bathroom_integrated_aluminum_rail');}else assert.equal(s.fields.frame_spec.value,'standard');});
}
test('inplus-migrated-option-survives-source-evaluator',()=>{const r=runtime.inplus.resolver({...seeds.inplus,size_class:'テラスタイプ',order_height:1900,option_items:['FR-L-HANDLE']});assert.ok(r.fields.option_items.value?.includes('FR-L-HANDLE'));});
test('inplus-invalid-upper-source-alias-clear',()=>{const r=runtime.inplus.resolver({...seeds.inplus,upper_frame_spec:'アジャスト上枠',fukashi_presence:'present',fukashi_depth:'50'});assert.equal(r.fields.upper_frame_spec.value,'adjust_upper_frame');assert.equal(r.fields.fukashi_depth.value,null);});

test('R3 parent choices remain selectable while conflicting downstream values clear',()=>{
 const s={window_type:'引違い窓',glass_family:'単板',frame_spec:'standard',upper_frame_spec:'standard',lower_frame_spec:'general',fukashi_presence:'present',fukashi_sides:'three_side',fukashi_depth:'50'};
 const initial=resolveFrameContract(i,s);assert.ok(initial.fields.upper_frame_spec.allowed_values.includes('adjust_upper_frame'));
 const next=resolveFrameContract(i,{...s,upper_frame_spec:'adjust_upper_frame'});assert.equal(next.selection.upper_frame_spec,'adjust_upper_frame');assert.equal(next.selection.fukashi_depth,undefined);
});

test('R3 source-delegated projection excludes the explicit incompatible fukashi 60',()=>{
 const r=runtime.uchirimo.resolver({...seeds.uchirimo,frame_spec:'frame_projection',fukashi_presence:'present',fukashi_depth:'60',fukashi_reinforcement:'reinforcement_square_pipe'});
 assert.equal(r.fields.frame_spec.value,'frame_projection');assert.equal(r.fields.fukashi_depth.value,null);assert.equal(r.fields.fukashi_reinforcement.value,null);
});

test('R3 20 mm fukashi retains its source-provided optional detail candidates',()=>{
 const r=runtime.inplus.resolver({...seeds.inplus,fukashi_presence:'present',fukashi_depth:'20',fukashi_sides:'three_side'});
 assert.equal(r.fields.fukashi_reinforcement.visibility,'SHOW');assert.deepEqual(r.fields.fukashi_reinforcement.allowed_values,['none','corner']);assert.equal(r.fields.fukashi_reinforcement.value,null);
});

test('Empty canonical candidate domains are hidden instead of requiring impossible selection',()=>{
 const contract={...i,fields:i.fields.map(f=>f.field_name==='fukashi_reinforcement'?{...f,values:[]}:f)};
 const r=resolveFrameContract(contract,{...seeds.inplus,fukashi_presence:'present',fukashi_depth:'50',fukashi_sides:'three_side'});
 assert.equal(r.fields.fukashi_reinforcement.visibility,'HIDE');assert.equal(r.fields.fukashi_reinforcement.required,false);
});
