import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {adaptComposedProductRuntime} from '../src/catalog/runtime-master/composed-product-runtime-adapter.mjs';

const root=resolve('src/catalog/runtime-master-packages/giesta2-ui-r14');
const read=name=>JSON.parse(readFileSync(resolve(root,name)));
const hash=name=>createHash('sha256').update(readFileSync(resolve(root,name))).digest('hex');
const index=read('runtime_index.json'),module=read('module.json');
const entry={...index.products[0],packageType:'FORMAL_COMPOSED_PRODUCT_RUNTIME'};

test('Giesta2 Runtime/UI projection retains formal R5 and exact reviewed R14 candidate',()=>{
  assert.equal(index.authoring.masterSha256,'f1922b6396ae30cc2c9bd60ece5866fe935fc116eec91f830c83ee45e3dd55a6');
  assert.equal(hash('sources/PRODUCT_MASTER.json'),index.authoring.masterSha256);
  assert.equal(read('sources/PRODUCT_MASTER.json').confirmations.length,6);
  assert.equal(index.runtimeOnlyAdoption.candidateIndex.sha256,'3f60a44ef7d67691260093abaac199490b485b77c11dad773a55bc06f11d2502');
  assert.equal(index.runtimeOnlyAdoption.candidateModuleSha256,'6ad6f375621a762b6dd118e773d3d9fbfbe15ab1abcc339835daaa35e5164a53');
  assert.equal(hash('module.json'),entry.sha256);
  assert.equal(module.product_module.product.id,entry.id);
  assert.equal(index.runtimeOnlyAdoption.productMasterMutations,0);
  assert.equal(index.runtimeOnlyAdoption.release,false);
});

test('Giesta2 child preferences and custom dimensions stay sales handoff only',async()=>{
  const adapter=await adaptComposedProductRuntime(module,entry,()=>{throw Error('UNEXPECTED_REFERENCE')});
  const seed={thermal_spec_id:'k2',door_configuration_id:'parent_child',
    frame_form_id:'FLAT',frame_angle:'WITH_ANGLE',design_id:'GST2_G12',
    child_glazing_requested:'YES',child_post_requested:'NO',size_mode:'CUSTOM',
    frame_w:1241,frame_h:2415};
  const result=adapter.uiResolver(seed);
  assert.equal(result.fields.some(field=>field.key==='secondary_leaf_id'),false);
  assert.equal(result.selection.child_glazing_requested,'YES');
  assert.equal(result.selection.child_post_requested,'NO');
  assert.equal(result.dimensionResult.status,'REVIEW_REQUIRED');
  assert.equal(result.orderReady,false);
  assert.deepEqual(result.pricing,{price:null,bom:null,set_code:null});
});
