import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createFactorizedRunner,dependencyGraph,verifySourceContract,seedFor,json} from '../scripts/governance/uchirimo-slim-factorized-selector.mjs';
import {loadSlimQaRuntime} from '../scripts/governance/uchirimo-slim-runtime-support.mjs';
const row={shard:3186,node_id:'UCH-RES-FIX',room_specification:'residential',window_type:'fix_window',sash_configuration:'__UNSET__',size_class:'__UNSET__',glass_family:'vacuum_glass',partition_seed_json:'{"frame_color":"white","vacuum_glass_product":"spacia_cool"}',partition_key:'reference-3186'};
const loaded=loadSlimQaRuntime();
function expand(runner,report,seed){
 let rows=[seed];
 for(const key of report.component_keys){const local=[];
  for(const t of runner.cache.get(key).terminals){let ts=[t.selection];
   for(const axis of t.axes)ts=ts.flatMap(s=>axis.branches.map(d=>{const n={...s};if(d.kind==='UNSET')delete n[axis.field_key];else n[axis.field_key]=d.value;return n;}));local.push(...ts);
  }rows=rows.flatMap(s=>local.map(t=>({...s,...t})));
 }return rows;
}
function explicit(resolve,seed){
 const stack=[{r:resolve(seed),d:new Set(Object.keys(seed))}],seen=new Set(),terminal=new Map();
 while(stack.length){const{r,d}=stack.pop(),key=json([r.selection,[...d].sort()]);if(seen.has(key))continue;seen.add(key);
  const f=r.fields.find(f=>!f.readOnly&&f.dataType!=='NUMBER'&&f.values.some(v=>!v.disabled)&&!d.has(f.key));
  if(!f){terminal.set(json(r.selection),resolve(r.selection));continue;}
  for(const v of [...(f.required?[]:[undefined]),...f.values.filter(v=>!v.disabled).map(v=>v.value)]){
   const s={...r.selection};if(v===undefined)delete s[f.key];else s[f.key]=v;const child=resolve(s);
   if(child.fields.some(fld=>fld.key===f.key)&&(v===undefined?child.selection[f.key]!=null:child.selection[f.key]!==v))continue;
   if([...d].some(k=>child.fields.some(fld=>fld.key===k)&&child.selection[k]!==r.selection[k]))continue;
   stack.push({r:child,d:new Set([...d,f.key].filter(k=>child.fields.some(f=>f.key===k)||Object.hasOwn(seed,k)))});
  }
 }return{terminal,states:seen.size};
}
test('fresh factorized representation equals every explicit terminal and full response',()=>{
 const {runtime,resolve}=loaded,seed=seedFor(row),runner=createFactorizedRunner(runtime,resolve),report=runner.run(row),rows=expand(runner,report,seed);
 const reference=explicit(resolve,seed),actual=new Map(rows.map(s=>{const r=resolve(s);return[json(r.selection),r];}));
 assert.equal(rows.length,1638);assert.equal(actual.size,rows.length);assert.equal(reference.states,2454);assert.equal(reference.terminal.size,rows.length);
 assert.deepEqual(actual,reference.terminal);assert.equal(report.logical_configurations,'1638');
 assert.ok(runner.metrics().evaluated_controller_states<100);
});
test('new rule predicates merge components rather than silently dropping interactions',()=>{
 const runtime={master:{...loaded.runtime.master,canonical:{...loaded.runtime.master.canonical,dependency_rules:[...loaded.runtime.master.canonical.dependency_rules,{rule_id:'TEST-CROSS',conditions:[{field:'operating_handle_type',op:'eq',value:'detachable_knob'}],effect:{action:'require',target_field:'frame_installation_mode'}}]}}};
 const g=dependencyGraph(runtime);assert.ok(!g.sinks.has('operating_handle_type'));
 assert.ok(g.edges.find(e=>e.id==='TEST-CROSS').fields.includes('frame_installation_mode'));
});
test('unknown rule op and changed reviewed source fail closed',()=>{
 const runtime={master:{...loaded.runtime.master,canonical:{...loaded.runtime.master.canonical,dependency_rules:[{rule_id:'UNKNOWN',conditions:[],effect:{action:'new_action',target_field:'frame_color'}}]}}};
 assert.throws(()=>dependencyGraph(runtime),/UNKNOWN_ACTION/);
 const contract=JSON.parse(readFileSync('data/uchirimo-slim/selector-dependency-contract.json'));
 // UI v1.9 changes the bridge and presentation contract; the historical fingerprint
 // cannot be carried forward as an exact-source PASS. Exercise guard behavior here.
 for(const path of Object.keys(contract.source_sha256))contract.source_sha256[path]=createHash('sha256').update(readFileSync(path)).digest('hex');
 verifySourceContract(contract);
 const path=Object.keys(contract.source_sha256)[0];contract.source_sha256[path]='0'.repeat(64);assert.throws(()=>verifySourceContract(contract),/DEPENDENCY_CONTRACT_SOURCE_CHANGED/);
});
test('undeclared sink side effect is rejected, not counted as equivalent',()=>{
 const {runtime,resolve}=loaded;
 const bad=s=>{const r=resolve(s);if(s.floor_supports_load){r.notices=[...r.notices,'unexpected side effect'];}return r;};
 const runner=createFactorizedRunner(runtime,bad);
 assert.throws(()=>runner.run(row),/SINK_HAS_NONLOCAL_EFFECT|UNDECLARED_CROSS_COMPONENT_EFFECT/);
});
test('extracted support preserves source document precedence and all resolved contracts',async()=>{
 const {getRuntimeMasterEntry}=await import('../scripts/governance/uchirimo-frozen-migration-entry.mjs');
 const {loadCanonicalWorkbookRuntimePackage}=await import('../src/catalog/runtime-master/canonical-runtime-manifest-loader.mjs');
 const {adaptUchirimoTabularV1}=await import('../src/catalog/runtime-master/uchirimo-tabular-v1-adapter.mjs');
 const pkg=await loadCanonicalWorkbookRuntimePackage(getRuntimeMasterEntry('YKK AP','ウチリモ 内窓'));
 const role=Object.keys(pkg.documents).find(k=>pkg.documents[k]?.glass_node_matrix);
 const prior=adaptUchirimoTabularV1({...pkg,documents:{...pkg.documents,[role]:loaded.candidate.canonical}});
 assert.deepEqual(loaded.support.document_role_order,Object.keys(pkg.documents));
 for(const key of ['sizeInstallation','judgment','vacuum','fields','capabilities'])assert.deepEqual(loaded.runtime.master[key],prior.master[key],key);
});
