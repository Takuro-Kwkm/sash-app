import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { validateConnectorDriveSnapshot } from './drive-authority.mjs';
const path='artifacts/governance/human-flow-review.json';
const original=readFileSync(path,'utf8');
const run=()=>spawnSync(process.execPath,['scripts/governance/verify-human-flow-field-coverage.mjs'],{encoding:'utf8'});
const mutations=[
 ['old HEAD rejected',r=>{r.exact_head='0'.repeat(40);}],
 ['omitted series rejected',r=>{r.series.pop();}],
 ['omitted adapter field rejected',r=>{const s=r.series.find(s=>s.windows.some(w=>w.slots.length));const key=s.windows.find(w=>w.slots.length).slots[0].key;for(const w of s.windows)w.slots=w.slots.filter(f=>f.key!==key);}],
 ['builder count cannot authorize itself',r=>{r.field_coverage.series[0].source_field_count+=1;}],
 ['duplicated series rejected',r=>{r.series.push(r.series[0]);}]
];
for(const [name,mutate] of mutations)test(name,()=>{try{const r=JSON.parse(original);mutate(r);writeFileSync(path,JSON.stringify(r));assert.notEqual(run().status,0);}finally{writeFileSync(path,original);}});
test('restore verified evidence after negative tests',()=>assert.equal(run().status,0));

test('conditional initial HIDE stays user-facing; fixed identity and technical fields do not',async()=>{
 const {shouldExposeInnerWindowRuntimeField:expose}=await import('../../src/catalog/runtime-master/inner-window-runtime-ui-contract.mjs');
 assert.equal(expose({key:'glass_type',initial_visibility:'HIDE',selection_mode:'SELECT'}),true);
 for(const key of ['manufacturer','series','product_category'])assert.equal(expose({key,initial_visibility:'HIDE',selection_mode:'FIXED'}),false);
 assert.equal(expose({key:'technical_state',technical:true}),false);
 assert.equal(expose({key:'internal_state',internal:true}),false);
});

test('independent workflow trigger is rejected by authority policy',()=>{
 const file='.github/workflows/global-window-selection-flow-gate.yml';const old=readFileSync(file,'utf8');
 try{writeFileSync(file,old.replace('on:\n','on:\n  push:\n'));assert.notEqual(spawnSync('python',['scripts/governance/verify-workflow-authority.py'],{encoding:'utf8'}).status,0);}
 finally{writeFileSync(file,old);assert.equal(spawnSync('python',['scripts/governance/verify-workflow-authority.py'],{encoding:'utf8'}).status,0);}
});

test('stale Drive connector observation is rejected',()=>{
 const snapshot=JSON.parse(readFileSync('project-governance/drive-authority-snapshot.json','utf8'));
 const observed=Date.parse(snapshot.observation.metadata_revalidated_at);
 const result=validateConnectorDriveSnapshot(snapshot,{now:observed+(3*60*60*1000)});
 assert.equal(result.status,'BLOCKED');
 assert.ok(result.errors.includes('CONNECTOR_OBSERVATION_STALE'));
});

test('missing required Drive authority file is rejected',()=>{
 const snapshot=JSON.parse(readFileSync('project-governance/drive-authority-snapshot.json','utf8'));
 snapshot.entries.pop();
 const result=validateConnectorDriveSnapshot(snapshot,{now:Date.parse(snapshot.observation.metadata_revalidated_at)+(10*60*1000)});
 assert.equal(result.status,'BLOCKED');
 assert.ok(result.errors.some(e=>e.startsWith('MISSING_REQUIRED_DRIVE_FILE_')));
});
