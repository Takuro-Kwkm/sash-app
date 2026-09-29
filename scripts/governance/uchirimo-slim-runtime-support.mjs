import assert from 'node:assert/strict';
import { readFileSync,writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { getRuntimeMasterEntry } from './uchirimo-frozen-migration-entry.mjs';
import { adaptUchirimoTabularV1 } from '../../src/catalog/runtime-master/uchirimo-tabular-v1-adapter.mjs';
import { getRuntimeAppIntegration,normalizeRuntimeSelection,toRuntimeUiResult } from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { hash } from './uchirimo-slim-factorized-selector.mjs';
const PATH='data/uchirimo-slim/runtime-support.json';
// Recurring QA never opens the frozen materialized canonical document.
export function loadSlimQaRuntime(){
 const bytes=readFileSync('data/uchirimo-slim/working-candidate.json'),candidate=JSON.parse(bytes),support=JSON.parse(readFileSync(PATH));
 assert.equal(candidate.lifecycle,'WORKING_CANDIDATE_NOT_FORMAL');assert.equal(support.schema,'UCHIRIMO_SLIM_RUNTIME_SUPPORT_V1');
 const entry=getRuntimeMasterEntry('YKK AP','ウチリモ 内窓');
 assert.equal(entry.runtimeManifestSha256,candidate.source_formal.runtime_manifest_sha256);
 assert.equal(support.source_integrity.actual,entry.runtimeManifestSha256);assert.ok(support.source_integrity.match);
 for(const[role,doc]of Object.entries(support.documents)){assert.equal(hash(doc),support.document_content_sha256[role]);assert.ok(!doc.glass_node_matrix);}
 const runtime=adaptUchirimoTabularV1({rawManifest:support.raw_manifest,documents:Object.fromEntries(support.document_role_order.map(role=>[role,role==='canonical_runtime'?candidate.canonical:support.documents[role]]))});
 const integration=getRuntimeAppIntegration('SER-YKKAP-UCHIRIMO');
 return {candidate,bytes,support,runtime,resolve:s=>toRuntimeUiResult(runtime.master,runtime.resolver(normalizeRuntimeSelection(runtime.master,s)),integration,support.source_integrity)};
}
// Explicit migration operation only, deterministic extraction of unchanged roles.
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const {loadCanonicalWorkbookRuntimePackage}=await import('../../src/catalog/runtime-master/canonical-runtime-manifest-loader.mjs');
 const pkg=await loadCanonicalWorkbookRuntimePackage(getRuntimeMasterEntry('YKK AP','ウチリモ 内窓'));
 const documents=Object.fromEntries(Object.entries(pkg.documents).filter(([,doc])=>!doc.glass_node_matrix));
 const support={schema:'UCHIRIMO_SLIM_RUNTIME_SUPPORT_V1',source_integrity:pkg.integrity,raw_manifest:pkg.rawManifest,documents,document_role_order:Object.keys(pkg.documents),document_content_sha256:Object.fromEntries(Object.entries(documents).map(([role,doc])=>[role,hash(doc)]))};
 writeFileSync(PATH,JSON.stringify(support,null,2)+'\n');
}
