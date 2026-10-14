import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {adaptComposedProductRuntime} from '../src/catalog/runtime-master/composed-product-runtime-adapter.mjs';
import {applyDeclaredWindowFlow} from '../src/catalog/runtime-master/declared-window-flow.mjs';
import {getRuntimeAppIntegration} from '../src/catalog/runtime-master/runtime-app-bridge.mjs';import {loadRegisteredRuntime} from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import {createProductConfigurationSnapshot} from '../src/work-management/domain.mjs';
import {createHash} from 'node:crypto';
const root='changes/replus-runtime-v5',index=JSON.parse(readFileSync(root+'/index.json'));
const old={survey_cover_top:50,survey_cover_bottom:70,survey_cover_side:20,building_structure:'RC造',installation_room:'居室',usage_humidity:'HIGH_HUMIDITY',work_space:'室内から施工時に新設枠を外側へ振り出せない'};
test('seven photographed fields cannot return through old input, required checks, snapshots or display',async()=>{
 for(const entry of index.products){
  const doc=JSON.parse(readFileSync(root+'/'+entry.path));
  const reader=await adaptComposedProductRuntime(doc,entry,async id=>{const meta=getRuntimeAppIntegration(id);return loadRegisteredRuntime(meta.manufacturer,meta.series)});
  const result=reader.uiResolver(old);result.fields=applyDeclaredWindowFlow(result.fields,entry);
  const snapshot=createProductConfigurationSnapshot({product:{...entry,sourceType:'RUNTIME_MASTER'},result:{...result,source:'RUNTIME_MASTER'}});
  for(const key of Object.keys(old)){
   assert.ok(!result.fields.some(f=>f.key===key),entry.id+':'+key);
   assert.ok(!result.validation.missingRequiredFields.includes(key));
   assert.equal(result.selection[key],undefined);assert.ok(result.clearedFields.includes(key));
   assert.ok(!JSON.stringify(snapshot).includes('"'+key+'"'));
  }
  assert.equal(result.orderReady,false);assert.equal(result.pricing.price,null);
 }
});
test('manufacturer tables, numeric boundaries, dependencies and color rules survive the presentation exclusion',()=>{
 const proof=JSON.parse(readFileSync(root+'/review/v10-source-preservation.json'));
 const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
 const hash=x=>createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
 for(const entry of index.products){
  const name=entry.id.split(':')[1];const current=JSON.parse(readFileSync(root+'/candidates/'+name+'.json'));
  for(const [key,digest] of Object.entries(proof[name].tables))assert.equal(hash(current.tables[key]),digest);
  const doc=JSON.parse(readFileSync(root+'/'+entry.path));
  assert.equal(hash(doc.numeric_constraints),proof[name].numeric);assert.equal(hash(doc.product_module.ruleSets),proof[name].rules);
  assert.equal(hash(doc.product_module.dependencies.filter(d=>!d.id.endsWith('external-cover-site-confirmation-v10'))),proof[name].dependencies);
 }
});
