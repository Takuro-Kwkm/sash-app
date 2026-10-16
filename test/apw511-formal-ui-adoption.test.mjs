import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRuntimeUiAdoption} from '../scripts/production/validate-runtime-ui-adoption.mjs';
import {resolveRuntimeAppProduct} from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import {readFileSync} from 'node:fs';

test('APW511 normal UI carries the exact user-adopted R3 rules, flow, and approval identity',async()=>{
 const report=await validateRuntimeUiAdoption('src/catalog/runtime-master-packages/apw511-ui-r3/runtime_index.json','changes/apw511-runtime-ui-r3/index.json');
 assert.equal(report.status,'PASS');assert.equal(report.masterMutations,0);
});
test('APW511 standard cell selectors and no-shutter intent survive normal app resolution',async()=>{
 const qa=JSON.parse(readFileSync('src/catalog/runtime-master-packages/apw511-ui-r3/adoption/browser-qa.json'));
 for(const row of qa.rows){
  const result=await resolveRuntimeAppProduct('SER-YKK-APW511',row.seed);
  assert.equal(result.orderReady,false);assert.deepEqual(result.pricing,{price:null,bom:null,set_code:null});
  assert.notEqual(result.validation.status,'VALID');
  const standard=result.fields.find(f=>f.key==='standard_size');
  if(row.seed.size_mode==='規格')assert.ok(standard);
 }
});
