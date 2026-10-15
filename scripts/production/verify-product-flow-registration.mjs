// Read-only verification of design registration against the existing runtime index.
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {validateReviewedWindowFlow} from '../../src/catalog/runtime-master/declared-window-flow.mjs';
const registryPath=resolve(process.argv[2]??'changes/replus-runtime-v5/flow/registration/index.json');
const read=p=>JSON.parse(readFileSync(p)),sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const registry=read(registryPath),base=dirname(registryPath);
assert.equal(registry.schema,'PRODUCT_SELECTION_FLOW_REGISTRY_V1');
const ids=new Set(),products=new Set();let count=0;
for(const entry of registry.entries){
 assert.ok(!ids.has(entry.id),'DUPLICATE_REGISTRATION');ids.add(entry.id);
 const path=resolve(base,entry.path);assert.equal(sha(path),entry.sha256,'REGISTRATION_BYTES_CHANGED');
 const registration=read(path);assert.equal(registration.registration_id,entry.id);assert.equal(registration.status,'REGISTERED_PRODUCT_FLOW_DESIGN');
 assert.equal(registration.scope,'PRODUCT_SELECTION_FLOW_DESIGN_ONLY');assert.equal(registration.registration_gate.formal_product_adoption,false);assert.equal(entry.central_category_formal_registration,false);
 const indexPath=resolve(base,entry.runtime_index.path);assert.equal(sha(indexPath),entry.runtime_index.sha256,'RUNTIME_INDEX_BYTES_CHANGED');
 const index=read(indexPath),root=dirname(indexPath),source=registration.reviewed_flow_source;
 assert.equal(sha(resolve(root,source.path)),source.sha256,'REVIEWED_FLOW_SOURCE_CHANGED');
 const reviewed=read(resolve(root,source.path));
 assert.deepEqual(entry.product_ids,registration.components.map(c=>c.product_id));
 for(const component of registration.components){
  assert.ok(!products.has(component.product_id),'DUPLICATE_PRODUCT_REGISTRATION');products.add(component.product_id);
  const runtimeEntry=index.products.find(e=>e.id===component.product_id);assert.ok(runtimeEntry,'PRODUCT_NOT_IN_RUNTIME_INDEX');
  assert.equal(sha(resolve(root,component.module_path)),component.module_sha256,'RUNTIME_MODULE_BYTES_CHANGED');
  assert.equal(component.module_sha256,runtimeEntry.sha256);assert.equal(component.package_version,runtimeEntry.packageVersion);
  assert.deepEqual(component.flow_contract,runtimeEntry.uiFlowContract,'RUNTIME_FLOW_DIFFERS_FROM_REGISTRATION');
  assert.deepEqual(component.flow_contract,reviewed.contracts[component.product_id],'REVIEWED_FLOW_DIFFERS_FROM_REGISTRATION');
  validateReviewedWindowFlow(component.flow_contract);count++;
 }
}
assert.ok(ids.has(registry.active_registration_id),'ACTIVE_REGISTRATION_NOT_FOUND');
console.log(JSON.stringify({state:'PASS',registry:registryPath,active_registration:registry.active_registration_id,registered_products:count,contract_validation:'EXISTING_REVIEWED_WINDOW_FLOW_VALIDATOR',runtime_and_reviewed_flow:'EXACT_MATCH',formal_product_adoption:false,central_category_formal_registration:false}));
