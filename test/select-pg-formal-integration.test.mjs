import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {formalComposedRuntimeEntries,readFormalComposedModule} from '../src/catalog/runtime-master/formal-composed-runtime-registry.mjs';
import {runtimeAppIntegrationInventory,resolveRuntimeAppProduct} from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
const base='src/catalog/runtime-master-packages/select-pg-ui-r7/',read=p=>JSON.parse(readFileSync(p)),hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const master=read(base+'sources/PRODUCT_MASTER.json'),entry=formalComposedRuntimeEntries.find(e=>e.id==='SER-LIX-SELECT-PG');
test('PG is one registered formal composition with exact retained master and real saved IDs',()=>{
 assert.equal(runtimeAppIntegrationInventory().filter(e=>e.id==='SER-LIX-SELECT-PG'&&e.selectable).length,1);
 assert.equal(hash(base+'sources/PRODUCT_MASTER.json'),'aee97818ea4c97a38ad9e04445d82eea57f91a1001b81cfa6b6aa38606ab2145');
 assert.equal(entry.runtimeManifestDriveFileId,'1lokWFlCvkfidTD_hhWcRIDmtq8W8q0hF');
 assert.equal(entry.productMasterFormalReference.manifestFileId,'1ARedUnJGmv40HGaDkYw23NHX2LWmWnsy');
});
test('Module differs from reviewed candidate only by ID and formal lifecycle',()=>{
 const final=readFormalComposedModule(entry).document;
 assert.equal(final.product_module.product.id,entry.id);assert.equal(final.source_adoption,false);assert.equal(final.formal_adoption,true);
 const approved=read(base+'adoption/authorization.json');assert.equal(approved.candidate_module_sha256,'6c69d22125fb4247357abdbd4994818c334549d77a8ce489a4342d321522917f');
 assert.equal(approved.authorization_kind,'EXPLICIT_USER_SCOPE');assert.equal(approved.ai_decision,false);
 assert.deepEqual(entry.uiFlowContract,read(base+'adoption/reviewed-index.json').products[0].uiFlowContract);
});
test('All nine reviewed window seeds resolve through the production common bridge',async()=>{
 for(const type of ['SLIDING','SHUTTER','AMADO','GRILLE','TATE','YOKO','OUTWARD','FIX','DEC_HIKI']){
  const s=master.handoff_tests.find(t=>t.case_id.startsWith('STANDARD-')&&t.before.window_type===type).before;
  const r=await resolveRuntimeAppProduct(entry.id,{...s,quantity:1});
  assert.equal(r.sales_request_handoff.request_valid,true,type);assert.equal(r.runtimeMaster.candidateOnly,false);
  assert.equal(r.orderReady,false);assert.equal(r.sales_request_handoff.manufacturing_approval,false);
  assert.deepEqual(r.pricing,{price:null,bom:null,set_code:null});
 }
});
test('Glass category, LowE detail, function, spacer and cavity preserve independent roles',async()=>{
 const s={...master.handoff_tests.find(t=>t.case_id.startsWith('STANDARD-')&&t.before.window_type==='SLIDING').before,quantity:1};
 const r=await resolveRuntimeAppProduct(entry.id,{...s,glass_base:'LOWE_DOUBLE',glass_detail:'INSULATING',glass_function:'SAFE_LAMINATED',glass_spacer:'RESIN',glass_air_layer:'ARGON'});
 const keys=r.fields.map(f=>f.key),expected=['glass_base','glass_type','glass_detail','glass_function','glass_spacer','glass_air_layer'];
 assert.deepEqual(keys.filter(k=>expected.includes(k)),expected);assert.equal(r.sales_request_handoff.request_valid,true);
 const general=await resolveRuntimeAppProduct(entry.id,{...r.selection,glass_base:'GENERAL_DOUBLE'},{changedFields:['glass_base']});
 assert.equal(general.selection.glass_detail,undefined);assert.equal(general.selection.glass_function,'SAFE_LAMINATED');assert.equal(general.selection.glass_air_layer,'ARGON');
});
test('Pre-existing APW330 package and all prior formal indexes remain registered',()=>{
 const r=read('src/catalog/runtime-master/formal-composed-runtime-registry.json');assert.equal(r.indexes.length,4);
 assert.deepEqual(r.indexes.slice(0,3).map(x=>x.sha256),['c29e7e8a45779dafb6ea60e79c7cbf7848e298dc32521ccbe89db292b189585e','a47c69d82dec187f92c38e6a731b59dbbf9517e90b683d7566ef3fcfce587edd','457ab1c700c51aec112e1e8e0f28801667e8be7acfa456a76f6d6c9f4854cd8f']);
 const apw=read('contracts/production/released-runtime-packages.v1.json').packages.find(x=>x.product_id==='SER-YKK-APW330');assert.equal(apw.index.sha256,'55ad1ad1c959950d56b4cee2cbb5afbc39540156c5809be9c1009e32b0732e6a');
});
