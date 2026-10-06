import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {loadRegisteredRuntime} from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import {resolveRuntimeAppProduct,runtimeAppIntegrationInventory} from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';

const runtime=await loadRegisteredRuntime('LIXIL','EW');
assert.equal(runtime.sourcePackageIntegrity.match,true);
assert.equal(runtime.normalizedManifest.packageVersion,'v1.4');
assert.equal(runtime.normalizedManifest.formalPass,true);
const app=runtimeAppIntegrationInventory().find(x=>x.id==='SER-LIX-EW');
assert.equal(app.status,'READY');
assert.equal(app.sourceHash,runtime.sourcePackageIntegrity.files[0].actual);
assert.equal(runtime.master.canonicalWorkbook.windows.length,15);
const start={window_type:'WT-EW-TATE-SUBERI',window_spec:'SP-EW-TATE-T',handing:'L',frame_angle:'WITHOUT_ANGLE',size_mode:'STANDARD'};
let result=await resolveRuntimeAppProduct('SER-LIX-EW',start);
const options=key=>result.fields.find(x=>x.key===key)?.values??[];
const selection={...start};
for(const key of ['size','exterior_color','interior_color','glass_base']){
  const value=options(key)[0]?.value;
  assert.ok(value,key+' must have a valid native option');
  selection[key]=value;
  result=await resolveRuntimeAppProduct('SER-LIX-EW',selection);
}
const original=JSON.stringify(selection),reload=JSON.parse(original);
assert.deepEqual(reload,selection);
assert.deepEqual(await resolveRuntimeAppProduct('SER-LIX-EW',reload),result);
const bad=await resolveRuntimeAppProduct('SER-LIX-EW',{...selection,window_type:'EW_FIRE_NOT_A_NORMAL_WINDOW'});
assert.ok(bad.fields.every(x=>x.key!=='size'||!(x.values??[]).some(v=>v.value===selection.size)));
const proof={status:'PASS',product_id:'SER-LIX-EW',revision:'v1.4',runtime_sha256:app.sourceHash,
  checks:['actual runtime byte integrity','formal selector identity','registered UI bridge','native window count','valid complete selection','JSON storage/reload parity','fire-scope isolation'],
  sourcePackageIntegrity:runtime.sourcePackageIntegrity,selection_roundtrip:'PASS',formal_mutation:0};
await writeFile(process.argv[2],JSON.stringify(proof,null,2)+'\n');
