import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCanonicalWorkbookRuntimePackage } from './canonical-runtime-manifest-loader.mjs';
import { adaptCanonicalWorkbookReferenceV1 } from './canonical-workbook-reference-v1-adapter.mjs';
import { withCanonicalWorkbookReferenceV1Behavior } from './canonical-workbook-reference-v1-behavior-normalizer.mjs';
import { loadManifestRuntimePackage } from './runtime-manifest-loader.mjs';
import { adaptTwCanonicalWorkbookReferenceV2 } from './tw-canonical-workbook-reference-v2-adapter.mjs';
import { evaluateTwCanonicalWorkbookRuntimeV2 } from './tw-canonical-workbook-runtime-engine-v2.mjs';
import { adaptUchirimoTabularV1 } from './uchirimo-tabular-v1-adapter.mjs';
import { adaptSemanticTableBundleV2 } from './semantic-table-bundle-v2-adapter.mjs';
import { evaluateSemanticTableBundleV2 } from './semantic-table-bundle-v2-engine.mjs';
import { loadFormalProductRuntimePackage } from './formal-product-runtime-loader.mjs';
import { loadFormalProductRuntimeV2Package } from './formal-product-runtime-v2-loader.mjs';
import { adaptProductModuleRuntimeV1 } from './product-module-runtime-adapter.mjs';
import { adaptApw430FormalSplitV1 } from './apw430-formal-split-v1-adapter.mjs';
import { adaptApw431FormalSplitV1 } from './apw431-formal-split-v1-adapter.mjs';
import { adaptRechentDoor3NonFireV1 } from './rechent-door3-nonfire-v1-adapter.mjs';
import { guardFormalCustomDimensionUiResolver } from './formal-custom-dimension-safety.mjs';
import { adaptFrameRuntime } from './frame-runtime-adapter.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const EW_ROOT = join(HERE, '../runtime-master-packages/lixil-ew-v1.3');
const EW_RUNTIME_PARTS = Object.freeze(Array.from({ length: 8 }, (_, index) => `part-${String(index).padStart(2,'0')}`));
const TW_ROOT = join(HERE, '../runtime-master-packages/lixil-tw-integrated-v0.4');
const TW_V03_ROOT = join(HERE, '../runtime-master-packages/lixil-tw-integrated-v0.3');
const TW_V02_ROOT = join(HERE, '../runtime-master-packages/lixil-tw-integrated-v0.2');
const TW_TRANSFORM_PARTS = Object.freeze(Array.from({ length: 19 }, (_, index) => `part-${String(index).padStart(2,'0')}`));
const UCHIRIMO_ROOT = join(HERE, '../runtime-master-packages/ykkap-uchirimo-v1.0-p7r1-r2');
const UCHIRIMO_SLIM_ROOT = join(HERE, '../runtime-master-packages/ykkap-uchirimo-slim-v3-frame');
const INPLUS_ROOT = join(HERE, '../runtime-master-packages/lixil-inplus-v0.4-r3-frame');
const SAMOS2H_ROOT = join(HERE, '../runtime-master-packages/lixil-samos2h-v0.9-r4');
const THERMOSL_ROOT = join(HERE, '../runtime-master-packages/lixil-thermosl-v0.7-r2');
const RECHENT_ROOT = join(HERE, '../runtime-master-packages/lixil-rechent-door3-nonfire-v0.8-r7');
const APW430_ROOT = join(HERE, '../runtime-master-packages/ykkap-apw430-20260918-r3');
const APW431_ROOT = join(HERE, '../runtime-master-packages/ykkap-apw431-v1.2');

export const runtimeMasterInventory = Object.freeze([
  Object.freeze({
    manufacturer:'LIXIL', series:'サーモスⅡ-H', manifestSeries:'サーモスⅡH', productId:'SER-LIX-SAMOS2H', masterVersion:'v0.9-R4', schemaVersion:'2.0',
    packageType:'FORMAL_PRODUCT_RUNTIME', adapterType:'PRODUCT_MODULE_RUNTIME_V1', productModuleRole:'RUNTIME_JSON_PACKAGE', packageRoot:SAMOS2H_ROOT,
    runtimeManifestPath:join(SAMOS2H_ROOT,'runtime_manifest.json'), runtimeManifestDriveFileId:'1_yIaBpnfppnj36IcuRoX9FBJhtrNngin', runtimeManifestSha256:'993481b2f0ab1d519a091e1b9f99a329eef7c67ec89cd1c82ddfab0d3c624955',
    materializedFiles:Object.freeze({
      '1Cqy4X23hWNFuhmKMzI7iTtUqOaH_N5S_':Object.freeze({codec:'raw-parts',paths:Object.freeze(Array.from({length:6},(_,index)=>join(SAMOS2H_ROOT,`LIXIL_サーモスⅡH_runtime_v0.9-R4.json.parts/part-${String(index).padStart(2,'0')}`)))}),
      '1mGXoPvmeEN-clO2mrvQ6R1bVtmVP0uIW':Object.freeze({codec:'raw-file',paths:Object.freeze([join(SAMOS2H_ROOT,'samos2h_runtime_package_v0.9-R4.schema.json')])}),
    }),
  }),
  Object.freeze({
    manufacturer:'LIXIL', series:'サーモスL', productId:'SER-LIX-SAMOSL', masterVersion:'v0.7-R2', schemaVersion:'2.0', packageType:'FORMAL_PRODUCT_RUNTIME', adapterType:'PRODUCT_MODULE_RUNTIME_V1', productModuleRole:'RUNTIME_JSON_PACKAGE', packageRoot:THERMOSL_ROOT,
    runtimeManifestPath:join(THERMOSL_ROOT,'runtime_manifest.json'), runtimeManifestDriveFileId:'1c-VIgwTqPDTkas0apYqx30AN3PVa71p1', runtimeManifestSha256:'4cf2a4b1572f68288fa108ccd33d30cc80d5170f2f5303864ca56ca67c34cec3',
    materializedFiles:Object.freeze({
      '12G_Edo55NWgu38gJjTGcqDZ7HsdpAH2I':Object.freeze({codec:'brotli',paths:Object.freeze([join(THERMOSL_ROOT,'LIXIL_サーモスL_runtime_v0.7-R2.json.br.b64.parts/part-00')])}),
    }),
  }),
  Object.freeze({
    manufacturer:'LIXIL', series:'EW', masterVersion:'v1.3', schemaVersion:'2.0', packageType:'RUNTIME_MANIFEST_V2', adapterType:'CANONICAL_WORKBOOK_REFERENCE_V1', packageRoot:EW_ROOT,
    runtimeManifestPath:join(EW_ROOT,'runtime_manifest.json'), runtimeManifestDriveFileId:'140pCgz2uhukjOjd1wymuISuAMjhaBpCS', runtimeManifestSha256:'eb8bce59f249faea5cfc8e3d4b75e44f74ee960eacbdc21e25864b7d8dd08662',
    materializedFiles:Object.freeze({
      '11ZmCPKceAmp3OEyJIXy79VoO8PEk_oYw':Object.freeze({codec:'base64',paths:Object.freeze(EW_RUNTIME_PARTS.map((name)=>join(EW_ROOT,`LIXIL_EW_runtime_v1.3.json.b64.parts/${name}`)))}),
    }),
  }),
  Object.freeze({
    manufacturer:'LIXIL', series:'リシェント玄関ドア3 非防火', productId:'SER-LIXIL-RECHENT-D3-NF', masterVersion:'v0.8-R7', schemaVersion:'PRODUCT_MASTER_RUNTIME_v2.0', packageType:'FORMAL_PRODUCT_RUNTIME', adapterType:'RECHENT_DOOR3_NONFIRE_V1', packageRoot:RECHENT_ROOT,
    runtimeManifestPath:join(RECHENT_ROOT,'runtime_manifest.json'), runtimeManifestDriveFileId:'11P1jHLQs4KO9ZiHxF7ofvqDcwtuoNxbU', runtimeManifestSha256:'6c189dff2197ab095168c308fb6733bd1a0f5a2f336a3352a39ce536ee08230d',
    materializedFiles:Object.freeze({
      '108R0Z930JszTM4mfARfSGw4bw6F6310V':Object.freeze({codec:'brotli',paths:Object.freeze([join(RECHENT_ROOT,'canonical_fields.json.br.b64')])}),
      '1Cfkm1zJmHJnR20m991b_etJL5qBbntvY':Object.freeze({codec:'brotli',paths:Object.freeze([join(RECHENT_ROOT,'product_rules.json.br.b64')])}),
      '10S2KNvbPO1d-LrbA03r4l-PRoOQgRUJY':Object.freeze({codec:'brotli',paths:Object.freeze([join(RECHENT_ROOT,'hardware_rules.json.br.b64')])}),
      '1pDEugu7eI7Jp8wJekUbdsCS8q67m-jmI':Object.freeze({codec:'brotli',paths:Object.freeze([join(RECHENT_ROOT,'installation_rules.json.br.b64')])}),
      '1wTEwz9htm8lbeBTLln0vZI0g26G1-DZr':Object.freeze({codec:'brotli',paths:Object.freeze([join(RECHENT_ROOT,'option_order_rules.json.br.b64')])}),
      '1nshH_nznz5RRl4s7Ttbubd3WCcKlzu3e':Object.freeze({codec:'brotli',paths:Object.freeze([join(RECHENT_ROOT,'dependency_rules.json.br.b64')])}),
      '121e7h1Vn3m0hj4qLOwS5I1BbthyO-60N':Object.freeze({codec:'brotli',paths:Object.freeze([join(RECHENT_ROOT,'evidence_manual_checks.json.br.b64')])}),
      '1NcP_BF6t1i4b2mcKefw6DC6Ue2sUfKFd':Object.freeze({codec:'brotli',paths:Object.freeze([join(RECHENT_ROOT,'runtime_qa.json.br.b64')])}),
    }),
  }),
  Object.freeze({
    manufacturer:'YKK AP', series:'APW430', productId:'SER-YKK-APW430', masterVersion:'20260918-R3', schemaVersion:'product-master-runtime-manifest/1.0', packageType:'FORMAL_PRODUCT_RUNTIME', adapterType:'APW430_FORMAL_SPLIT_V1', packageRoot:APW430_ROOT,
    runtimeManifestPath:join(APW430_ROOT,'runtime_manifest.json'), runtimeManifestDriveFileId:'1hyX2Fgu1m28xmkM5I53GZ-xC3PX0b9Hk', runtimeManifestSha256:'e2755a735fc3a7c94afacc58175a390bf00784cf1f13521a1263076d7bfae1c7',
    materializedFiles:Object.freeze({
      '1S5Vo-rF1wpQDsNOQr0jMTAaRlvnx3MCF':Object.freeze({codec:'raw-file',paths:Object.freeze([join(APW430_ROOT,'apw430_core_20260918-R3.json')])}),
      '1llpTNz_CweEF7vZxP0XRRwzTG4kBF8AX':Object.freeze({codec:'raw-file',paths:Object.freeze([join(APW430_ROOT,'apw430_dimensions_20260918-R3.json')])}),
      '1gb1rWWxNC0Wd6mvZ1ZfqPYrsYyUPGGM_':Object.freeze({codec:'raw-parts',paths:Object.freeze(Array.from({length:3},(_,index)=>join(APW430_ROOT,`apw430_options_20260918-R3.json.parts/part-${String(index).padStart(2,'0')}`)))}),
    }),
  }),
  Object.freeze({
    manufacturer:'YKK AP', series:'APW431', productId:'SER-YKK-APW431', masterVersion:'v1.2', schemaVersion:'product-master-runtime-manifest/2.0', packageType:'FORMAL_PRODUCT_RUNTIME', adapterType:'APW431_FORMAL_SPLIT_V1', packageRoot:APW431_ROOT,
    runtimeManifestPath:join(APW431_ROOT,'runtime_manifest.json'), runtimeManifestDriveFileId:'16-hPgdJYmkl30MvonP_natv3bPV1C-3x', runtimeManifestSha256:'b8927a51a5e31b0c7a89a98b65833cf4f7e0e641c52316cecce4f493399eb1f9',
    materializedFiles:Object.freeze({
      '1Tdc-M1JWXOvFhDYiYpwlaVm2QJ_-BujQ':Object.freeze({codec:'raw-file',paths:Object.freeze([join(APW431_ROOT,'apw431_core_v1.2.json')])}),
      '1nJjAqm23gaMdIYUaTrFQzq6pKZsFTiUJ':Object.freeze({codec:'raw-parts',paths:Object.freeze(Array.from({length:2},(_,index)=>join(APW431_ROOT,`apw431_dimensions_v1.2.json.parts/part-${String(index).padStart(2,'0')}`)))}),
      '18Q8MkacIL5W-kXFlo2bcdK_G3ypj1Ady':Object.freeze({codec:'raw-file',paths:Object.freeze([join(APW431_ROOT,'apw431_options_v1.2.json')])}),
    }),
  }),
  Object.freeze({
    manufacturer:'YKK AP', series:'ウチリモ 内窓', masterVersion:'v1.0-P7R1-R4', schemaVersion:'2.0', packageType:'RUNTIME_MANIFEST_V2', adapterType:'UCHIRIMO_TABULAR_V1', requireRuntimeContract:false, enforceComponentSchemaVersion:false, runtimeRevision:'SLIM-V4-INNER-WINDOW-CANONICAL-FRAME-20260930', packageRoot:UCHIRIMO_SLIM_ROOT,
    runtimeManifestPath:join(UCHIRIMO_SLIM_ROOT,'runtime_manifest.json'), runtimeManifestDriveFileId:'10wOlwX4c0E0lCRuCKl-EdrW0vwwHTEGV', runtimeManifestSha256:'6fc2e5fa375930198ef7d9639fca7998d3fbb6e5ee2a412b6652514ed27ce24b',
    materializedFiles:Object.freeze({
      '1K_JE1OP07uoIQQKojZWp2cNqv2ZNY9WH':Object.freeze({codec:'identity',paths:Object.freeze([join(UCHIRIMO_SLIM_ROOT,'canonical.json')])}),
      '1XDEsvqz5l7VGkoHXnyZ5WpFwEQy4qDIe':Object.freeze({codec:'identity',paths:Object.freeze([join(UCHIRIMO_SLIM_ROOT,'size-installation.json')])}),
      '1wm6kPViHaIOb_-pfkKuJurV9H2TjNTrS':Object.freeze({codec:'identity',paths:Object.freeze([join(UCHIRIMO_SLIM_ROOT,'vacuum-glass.json')])}),
      '1wn8gKt6vwzCRbw1CrATq7aKtzx1UIvlK':Object.freeze({codec:'identity',paths:Object.freeze([join(UCHIRIMO_SLIM_ROOT,'judgment-engine.json')])}),
    }),
  }),
  Object.freeze({
    manufacturer:'LIXIL', series:'インプラス', masterVersion:'v0.4-R3', schemaVersion:'2.0', packageType:'RUNTIME_MANIFEST_V1', adapterType:'SEMANTIC_TABLE_BUNDLE_V2', packageRoot:INPLUS_ROOT,
    runtimeManifestPath:join(INPLUS_ROOT,'runtime_manifest.json'), runtimeManifestDriveFileId:'1N1sQQM616oeuQm7kehqaz3EMQDrNzfhy', runtimeManifestSha256:'d408bd64237ba5d44f9ebbf3ab3c869e9b64864ff0da28609568718b881607d1',
    materializedFiles:Object.freeze({
      '19OtDgWSQFehEmxFYFIqxZGZCFXyzJaZ4':Object.freeze({codec:'gzip',paths:Object.freeze([join(INPLUS_ROOT,'canonical.json.gz.b64')])}),
      '1d61bdbtl9LafVMgwzu2rduwMieB8kKtf':Object.freeze({codec:'gzip',paths:Object.freeze([join(INPLUS_ROOT,'runtime.schema.json.gz.b64')])}),
    }),
  }),
  Object.freeze({
    manufacturer:'LIXIL', series:'TW', masterVersion:'integrated-v0.4', schemaVersion:'2.0', packageType:'RUNTIME_MANIFEST_V1', adapterType:'TW_CANONICAL_WORKBOOK_REFERENCE_V2', packageRoot:TW_ROOT,
    runtimeManifestPath:join(TW_ROOT,'runtime_manifest.json'), runtimeManifestDriveFileId:'13doEdTkUlQNu4Dm-SNwkeUg8RkrjS5G0', runtimeManifestSha256:'4ca87f7fc327f798da9ac0e39d4aa7ba4e8bda1e5635cc91959fe241059aa7d7',
    materializedFiles:Object.freeze({
      '1hWy1coHWTsuXYXGLRxZ0a2vJEmSIvg5p':Object.freeze({
        codec:'json-transform-chain-v1',
        base:Object.freeze({codec:'brotli',paths:Object.freeze([join(TW_V02_ROOT,'LIXIL_TW_runtime_integrated-v0.2.json.br.b64.parts/part-00')])}),
        stages:Object.freeze([
          Object.freeze({transformPaths:Object.freeze(TW_TRANSFORM_PARTS.map((name)=>join(TW_V03_ROOT,`runtime_transform.json.parts/${name}`)))}),
          Object.freeze({transformPath:join(TW_ROOT,'runtime_transform.json')}),
        ]),
      }),
    }),
  }),
]);

export function getRuntimeMasterEntry(manufacturer, series) {
  return runtimeMasterInventory.find((x) => x.manufacturer === manufacturer && x.series === series) ?? null;
}

const runtimePromises = new Map();

async function loadRuntime(entry) {
  let runtimePackage;
  let adapted;
  if (entry.packageType === 'RUNTIME_MANIFEST_V2' && entry.adapterType === 'CANONICAL_WORKBOOK_REFERENCE_V1') {
    runtimePackage = await loadCanonicalWorkbookRuntimePackage(entry);
    adapted = withCanonicalWorkbookReferenceV1Behavior(adaptCanonicalWorkbookReferenceV1(runtimePackage));
  } else if (entry.packageType === 'RUNTIME_MANIFEST_V2' && entry.adapterType === 'UCHIRIMO_TABULAR_V1') {
    runtimePackage = await loadCanonicalWorkbookRuntimePackage(entry);
    adapted = adaptUchirimoTabularV1(runtimePackage);
  } else if (entry.packageType === 'RUNTIME_MANIFEST_V1' && entry.adapterType === 'TW_CANONICAL_WORKBOOK_REFERENCE_V2') {
    runtimePackage = await loadManifestRuntimePackage(entry);
    const master = adaptTwCanonicalWorkbookReferenceV2(runtimePackage);
    adapted = { master, resolver: (selection) => evaluateTwCanonicalWorkbookRuntimeV2(master, selection) };
  } else if (entry.packageType === 'RUNTIME_MANIFEST_V1' && entry.adapterType === 'SEMANTIC_TABLE_BUNDLE_V2') {
    runtimePackage = await loadManifestRuntimePackage(entry);
    const master = adaptSemanticTableBundleV2(runtimePackage);
    adapted = { master, resolver: (selection) => evaluateSemanticTableBundleV2(master, selection) };
  } else if (entry.packageType === 'FORMAL_PRODUCT_RUNTIME' && entry.adapterType === 'RECHENT_DOOR3_NONFIRE_V1') {
    runtimePackage = await loadFormalProductRuntimeV2Package(entry);
    adapted = adaptRechentDoor3NonFireV1(runtimePackage, entry);
  } else if (entry.packageType === 'FORMAL_PRODUCT_RUNTIME' && entry.adapterType === 'PRODUCT_MODULE_RUNTIME_V1') {
    runtimePackage = await loadFormalProductRuntimePackage(entry);
    adapted = adaptProductModuleRuntimeV1(runtimePackage, entry);
  } else if (entry.packageType === 'FORMAL_PRODUCT_RUNTIME' && entry.adapterType === 'APW430_FORMAL_SPLIT_V1') {
    runtimePackage = await loadFormalProductRuntimePackage(entry);
    adapted = guardFormalCustomDimensionUiResolver(adaptApw430FormalSplitV1(runtimePackage, entry), runtimePackage);
  } else if (entry.packageType === 'FORMAL_PRODUCT_RUNTIME' && entry.adapterType === 'APW431_FORMAL_SPLIT_V1') {
    runtimePackage = await loadFormalProductRuntimePackage(entry);
    adapted = guardFormalCustomDimensionUiResolver(adaptApw431FormalSplitV1(runtimePackage, entry), runtimePackage);
  } else {
    const error = new Error(`Unsupported release Runtime package: ${entry.packageType}/${entry.adapterType}`);
    error.code = 'RUNTIME_ADAPTER_NOT_REGISTERED';
    throw error;
  }
  const frameContract = Object.values(runtimePackage.documents ?? {}).find(document => document?.inner_window_frame_contract)?.inner_window_frame_contract;
  if (frameContract) adapted = adaptFrameRuntime(adapted, frameContract);
  return Object.freeze({ entry, master: adapted.master ?? null, api: null, resolver: adapted.resolver ?? null, uiResolver: adapted.uiResolver ?? null, sourcePackageIntegrity: runtimePackage.integrity, normalizedManifest: runtimePackage.manifest });
}

export async function loadRegisteredRuntime(manufacturer, series) {
  const entry = getRuntimeMasterEntry(manufacturer, series);
  if (!entry) return null;
  const key = `${manufacturer}/${series}`;
  if (!runtimePromises.has(key)) runtimePromises.set(key, loadRuntime(entry).catch((error) => { runtimePromises.delete(key); throw error; }));
  return runtimePromises.get(key);
}
