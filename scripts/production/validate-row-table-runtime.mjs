import assert from 'node:assert/strict';
import {rowTableRuntimeEntries,readRowTableRuntimePackage} from '../../src/catalog/runtime-master/row-table-runtime-package.mjs';
import {resolveRuntimeAppProduct} from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
const rows=rowTableRuntimeEntries.filter(e=>!process.argv[2]||e.id===process.argv[2]);assert.ok(rows.length);
for(const entry of rows){const p=readRowTableRuntimePackage(entry),r=await resolveRuntimeAppProduct(entry.id,{});assert.equal(p.document.source_master.sha256,p.index.master.sha256);assert.equal(r.candidateOnly,false);assert.equal(r.orderReady,false);assert.equal(r.automaticOrderability,false);assert.equal(r.runtimeMaster.canonicalRuntimeReference.runtimeIndexSha256,entry.runtimeManifestSha256);assert.ok(r.fields.length);}
console.log(JSON.stringify({status:'PASS',format:'ROW_TABLE_RUNTIME_V1',normal_runtime:true,products:rows.length,publication_authority:false}));
