import {toFormalSelectorQaResult} from './formal-selector-qa-projection.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadRegisteredRuntime,getRuntimeMasterEntry} from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import {loadCanonicalWorkbookRuntimePackage} from '../../src/catalog/runtime-master/canonical-runtime-manifest-loader.mjs';
import {getRuntimeAppIntegration,normalizeRuntimeSelection} from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';

// The integration gate exercises the same registration and loader as HTTP.
// The frozen candidate is an equivalence witness, never the live data source.
export async function loadAdoptedSlimQaRuntime(){
 const bytes=readFileSync('data/uchirimo-slim/working-candidate.json');
 const candidate=JSON.parse(bytes);
 const entry=getRuntimeMasterEntry('YKK AP','ウチリモ 内窓');
 assert.equal(entry.runtimeRevision,'SLIM-V2-20260929');
 const pkg=await loadCanonicalWorkbookRuntimePackage(entry);
 assert.deepEqual(pkg.documents.canonical_runtime,candidate.canonical,'ADOPTED_SLIM_DATA_DRIFT');
 assert.ok(!pkg.documents.canonical_runtime.glass_node_matrix,'LEGACY_MATRIX_REGISTERED');
 const runtime=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');
 assert.ok(runtime.master.glassRuleIndex,'SLIM_RULE_ENGINE_NOT_ACTIVE');
 assert.equal(runtime.sourcePackageIntegrity.actual,entry.runtimeManifestSha256);
 const integration=getRuntimeAppIntegration('SER-YKKAP-UCHIRIMO');
 return {candidate,bytes,runtime,support:{source_integrity:pkg.integrity},resolve:s=>toFormalSelectorQaResult(runtime.master,runtime.resolver(normalizeRuntimeSelection(runtime.master,s)),integration,pkg.integrity)};
}
