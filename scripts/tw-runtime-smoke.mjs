import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4173';
async function get(path) { const response = await fetch(base + path); assert.equal(response.status, 200); return response.json(); }

const health = await get('/api/health');
assert.equal(health.ok, true);
const integrations = await get('/api/runtime-master/integrations');
const integration = integrations.find((row) => row.id === 'SER-LIXIL-TW');
for (const [key, value] of Object.entries({ manufacturer:'LIXIL', series:'TW', status:'READY', selectable:true, packageVersion:'integrated-v0.2', schemaVersion:'2.0' })) assert.equal(integration[key], value);
const result = await get('/api/runtime-master/resolve?' + new URLSearchParams({ productId:integration.id, selection:JSON.stringify({}) }));
assert.equal(result.source, 'RUNTIME_MASTER');
assert.equal(result.fields[0].key, 'window_type');
assert.equal(result.fields[0].values.length, 25);
assert.equal(result.optionCodeLinkageCount, 196);
assert.equal(result.runtimeMaster.sourcePackageIntegrity.match, true);
assert.equal(result.runtimeMaster.sourcePackageIntegrity.files[0].bytes, 3946522);
const report = { status:'PASS', buildId:health.buildId, integration, fieldCount:result.fields.length, windowTypeCount:result.fields[0].values.length, optionCodeLinkageCount:result.optionCodeLinkageCount, integrity:result.runtimeMaster.sourcePackageIntegrity };
await mkdir('artifacts/tw-runtime-smoke', { recursive:true });
await writeFile('artifacts/tw-runtime-smoke/report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
