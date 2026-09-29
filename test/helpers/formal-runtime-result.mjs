import {loadRegisteredRuntime} from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import {getRuntimeAppIntegration,normalizeRuntimeSelection,toRuntimeUiResult} from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
// Product-fact regression deliberately tests the unchanged formal evaluator.
// Sales presentation (internal size class / requested glazing) has separate QA.
export async function resolveFormalRuntimeProduct(id,selection){
 const integration=getRuntimeAppIntegration(id);
 const runtime=await loadRegisteredRuntime(integration.manufacturer,integration.series);
 return toRuntimeUiResult(runtime.master,runtime.resolver(normalizeRuntimeSelection(runtime.master,selection)),integration,runtime.sourcePackageIntegrity);
}
