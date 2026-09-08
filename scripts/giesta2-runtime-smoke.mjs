import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4173';
async function get(path) { const r=await fetch(base+path);assert.equal(r.status,200);return r.json(); }
const health=await get('/api/health');assert.equal(health.ok,true);
const integrations=await get('/api/runtime-master/integrations');
const integration=integrations.find(r=>r.id==='SER-LIXIL-GIESTA2');
for(const [key,value] of Object.entries({manufacturer:'LIXIL',series:'ジエスタ2',status:'READY',selectable:true,packageVersion:'v0.8-R1',schemaVersion:'1.0'}))assert.equal(integration[key],value);
const result=await get('/api/runtime-master/resolve?'+new URLSearchParams({productId:integration.id,selection:JSON.stringify({design:'GST2_G11',configuration:'single',thermal_spec:'k2'})}));
assert.equal(result.source,'RUNTIME_MASTER');
assert.equal(result.selection.glass,'GST2_GLASS_STD_K2');
assert.ok(result.runtimeMaster.sourcePackageIntegrity.match);
assert.ok(result.runtimeMaster.sourcePackageIntegrity.files.every(r=>r.match && r.expected===r.actual));
assert.equal(result.runtimeMaster.sourcePackageIntegrity.files.find(r=>r.role==='RUNTIME_MAPS').bytes,7002381);
const report={status:'PASS',buildId:health.buildId,integration,selection:result.selection,integrity:result.runtimeMaster.sourcePackageIntegrity};
await mkdir('artifacts/giesta2-runtime-smoke',{recursive:true});
await writeFile('artifacts/giesta2-runtime-smoke/report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
