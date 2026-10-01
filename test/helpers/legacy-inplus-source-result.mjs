import {getRuntimeMasterEntry} from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import {loadManifestRuntimePackage} from '../../src/catalog/runtime-master/runtime-manifest-loader.mjs';
import {adaptSemanticTableBundleV2} from '../../src/catalog/runtime-master/semantic-table-bundle-v2-adapter.mjs';
import {evaluateSemanticTableBundleV2} from '../../src/catalog/runtime-master/semantic-table-bundle-v2-engine.mjs';
import {getRuntimeAppIntegration,toRuntimeUiResult} from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
const pkg=await loadManifestRuntimePackage(getRuntimeMasterEntry('LIXIL','インプラス'));
const master=adaptSemanticTableBundleV2(pkg);
export async function resolveFormalRuntimeProduct(id,input){return toRuntimeUiResult(master,evaluateSemanticTableBundleV2(master,input),getRuntimeAppIntegration(id),pkg.integrity);}
