import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {formalComposedRuntimeEntries,readFormalComposedModule} from '../../src/catalog/runtime-master/formal-composed-runtime-registry.mjs';
import {resolveRuntimeAppProduct,runtimeAppIntegrationInventory} from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function validateRuntimeUiAdoption(indexPath,candidateIndexPath){
 const index=JSON.parse(readFileSync(indexPath)),root=dirname(resolve(indexPath)),a=index.runtimeOnlyAdoption;
 assert.equal(a.schema,'HUMAN_ADOPTED_RUNTIME_ONLY_V1');
 const check=ref=>{const bytes=readFileSync(resolve(root,ref.path));assert.equal(digest(bytes),ref.sha256);return JSON.parse(bytes);};
 assert.equal(digest(readFileSync(candidateIndexPath)),a.candidateIndex.sha256);
 const candidate=check(a.candidateIndex),review=check(a.review),approval=check(a.authorization),human=check(a.humanSource);
 assert.equal(approval.decision,'APPROVED');assert.equal(approval.decision_ref,human.reference);
 assert.equal(review.authorization_scope.expected.index_sha256,a.candidateIndex.sha256);
 assert.equal(review.authorization_scope.expected.module_sha256,a.candidateModuleSha256);
 for(const entry of index.products){
  const prior=candidate.products.find(row=>row.manufacturer===entry.manufacturer&&row.series===entry.series);assert.ok(prior);
  const candidatePath=resolve(dirname(resolve(candidateIndexPath)),prior.path);
  const bytes=readFileSync(candidatePath);assert.equal(digest(bytes),a.candidateModuleSha256);
  const transformed=JSON.parse(bytes.toString().replaceAll(prior.id,entry.id));
  Object.assign(transformed,{schema:'FORMAL_COMPOSED_PRODUCT_MODULE_V1',formal_adoption:true,source_adoption:false});
  const registered=formalComposedRuntimeEntries.find(row=>row.id===entry.id);assert.ok(registered);
  assert.equal(registered.runtimeManifestSha256,digest(readFileSync(indexPath)));
  assert.deepEqual(readFormalComposedModule(registered).document,transformed);
  assert.deepEqual(entry.uiFlowContract,prior.uiFlowContract);
  assert.equal(runtimeAppIntegrationInventory().filter(row=>row.id===entry.id&&row.selectable).length,1);
  const result=await resolveRuntimeAppProduct(entry.id,{});
  assert.equal(result.runtimeCapabilities.formalAdoption,true);assert.equal(result.runtimeMaster.candidateOnly,false);
  assert.equal(result.orderReady,false);assert.deepEqual(result.pricing,{price:null,bom:null,set_code:null});
  assert.ok(result.fields.every(field=>field.semanticSlot&&field.semanticStage));
 }
 return {status:'PASS',gate:'HUMAN_ADOPTED_RUNTIME_UI_IDENTITY',products:index.products.length,candidateIndexSha256:a.candidateIndex.sha256,masterMutations:0,release:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await validateRuntimeUiAdoption(process.argv[2],process.argv[3])));
