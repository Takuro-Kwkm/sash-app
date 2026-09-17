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

const HERE = dirname(fileURLToPath(import.meta.url));
const EW_ROOT = join(HERE, '../runtime-master-packages/lixil-ew-v1.2');
const EW_RUNTIME_PARTS = Object.freeze([
  'part-00',
  ...Array.from({ length: 12 }, (_, index) => `canonical-01-${String(index).padStart(2,'0')}`),
  'part-02',
  ...Array.from({ length: 37 }, (_, index) => `canonical-02-${String(index).padStart(2,'0')}`),
  'part-03',
]);
const TW_ROOT = join(HERE, '../runtime-master-packages/lixil-tw-integrated-v0.4');
const TW_V03_ROOT = join(HERE, '../runtime-master-packages/lixil-tw-integrated-v0.3');
const TW_V02_ROOT = join(HERE, '../runtime-master-packages/lixil-tw-integrated-v0.2');
const TW_TRANSFORM_PARTS = Object.freeze(Array.from({ length: 19 }, (_, index) => `part-${String(index).padStart(2,'0')}`));
const UCHIRIMO_ROOT = join(HERE, '../runtime-master-packages/ykkap-uchirimo-v1.0-p7r1-r2');
const INPLUS_ROOT = join(HERE, '../runtime-master-packages/lixil-inplus-v0.4-r2');
const SAMOS2H_ROOT = join(HERE, '../runtime-master-packages/lixil-samos2h-v0.9-r3');
const THERMOSL_ROOT = join(HERE, '../runtime-master-packages/lixil-thermosl-v0.7-r2');
const RECHENT_ROOT = join(HERE, '../runtime-master-packages/lixil-rechent-door3-nonfire-v0.8-r7');
const APW430_ROOT = join(HERE, '../runtime-master-packages/ykkap-apw430-20260830-r1');
const APW431_ROOT = join(HERE, '../runtime-master-packages/ykkap-apw431-v1.0-r1');

export const runtimeMasterInventory = Object.freeze([
  Object.freeze({
    manufacturer:'LIXIL', series:'サーモスⅡ-H', manifestSeries:'サーモスⅡH', productId:'SER-LIX-SAMOS2H', masterVersion:'v0.9-R3', schemaVersion:'2.0',
    packageType:'FORMAL_PRODUCT_RUNTIME', adapterType:'PRODUCT_MODULE_RUNTIME_V1', productModuleRole:'RUNTIME_JSON_PACKAGE', packageRoot:SAMOS2H_ROOT,
    runtimeManifestPath:join(SAMOS2H_ROOT,'runtime_manifest.json'), runtimeManifestDriveFileId:'1xnVkGtwoN488zgjoi-FOF9drnaUP-jal', runtimeManifestSha256:'cfc55020035df809b83c0f4a25dc0e0b717854344fdb815be8e9a848c2d889c8',
    materializedFiles:Object.freeze({
      '1c-w0-fYEBZubfN6KCy5BfG1Sp41xsKdu':Object.freeze({codec:'brotli',paths:Object.freeze([join(SAMOS2H_ROOT,'LIXIL_サーモスⅡH_runtime_v0.9-R3.json.br.b64.parts/part-00')])}),
      '1LMmXrVfap_xXZXTPoXcos1gWvZqZKtj1':Object.freeze({codec:'brotli',paths:Object.freeze([join(SAMOS2H_ROOT,'samos2h_runtime_package_v0.9-R3.schema.json.br.b64.parts/part-00')])}),
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
    manufacturer:'LIXIL', series:'EW', masterVersion:'v1.2', schemaVersion:'2.0', packageType:'RUNTIME_MANIFEST_V2', adapterType:'CANONICAL_WORKBOOK_REFERENCE_V1', packageRoot:EW_ROOT,
    runtimeManifestPath:join(EW_ROOT,'runtime_manifest.json'), runtimeManifestDriveFileId:'1D-n_dwXfl8M6BjHQqIO6QV7u9FjjRUuU', runtimeManifestSha256:'d24c5175b1635dd3215294076a18a5adc0e7149f0c9790082a28df9ea115c68c',
    materializedFiles:Object.freeze({
      '1tHWCWnS-f_R6-IvT0KgA7l1smPQm6dd8':Object.freeze({codec:'brotli',paths:Object.freeze(EW_RUNTIME_PARTS.map((name)=>join(EW_ROOT,`LIXIL_EW_runtime_v1.2.json.br.b64.parts/${name}`)))}),
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
    manufacturer:'YKK AP', series:'APW430', productId:'SER-YKK-APW430', masterVersion:'20260830-R1', schemaVersion:'product-master-runtime-manifest/1.0', packageType:'FORMAL_PRODUCT_RUNTIME', adapterType:'APW430_FORMAL_SPLIT_V1', packageRoot:APW430_ROOT,
    runtimeManifestPath:join(APW430_ROOT,'runtime_manifest.json'), runtimeManifestDriveFileId:'1kzVrhxbArbmUu9MgLThODKTEuCdxyqfK', runtimeManifestSha256:'08f3ad4bef73e32b00e9a69af7e0278539bc8899d64713c8f903924cd43de78b',
    materializedFiles:Object.freeze({
      '1WZcYi7N1sc8yX1NH2aP6tdBVc9vpmXGr':Object.freeze({codec:'brotli',paths:Object.freeze([join(APW430_ROOT,'apw430_core_20260830-R1.json.br.b64.parts/part-00')])}),
      '10CqTBQMvvo67S7GDprRQNtNvrah2SjeH':Object.freeze({codec:'brotli',paths:Object.freeze([join(APW430_ROOT,'apw430_dimensions_20260830-R1.json.br.b64.parts/part-00')])}),
      '1iNdn4g59M52mmU2N9VoM7NJIQUPP6qQ_':Object.freeze({codec:'brotli',paths:Object.freeze([join(APW430_ROOT,'apw430_options_20260830-R1.json.br.b64.parts/part-00')])}),
    }),
  }),
  Object.freeze({
    manufacturer:'YKK AP', series:'APW431', productId:'SER-YKK-APW431', masterVersion:'v1.0', schemaVersion:'product-master-runtime-manifest/1.0', packageType:'FORMAL_PRODUCT_RUNTIME', adapterType:'APW431_FORMAL_SPLIT_V1', packageRoot:APW431_ROOT,
    runtimeManifestPath:join(APW431_ROOT,'runtime_manifest.json'), runtimeManifestDriveFileId:'1Rfrbcdu5j9ZsWGX9PDyC82iEKWUHhCyv', runtimeManifestSha256:'f83998aa540ff39907627089adbe84eae32ba9850b36fa8ad7f40a30e2502511',
    materializedFiles:Object.freeze({
      '1dr36iQgt_jtKnU6o_EoTpSteBHQNoOLT':Object.freeze({codec:'brotli',paths:Object.freeze([join(APW431_ROOT,'apw431_core_v1.0-R1.json.br.b64.parts/part-00')])}),
      '1bccODZ46DhHzv5maVZN07QymZxhb817V':Object.freeze({codec:'brotli',paths:Object.freeze(['part-00','part-01','part-02','part-03','part-04'].map((name)=>join(APW431_ROOT,`apw431_dimensions_v1.0-R1.json.br.b64.parts/${name}`)))}),
      '1xLBrfHUrgPgc_aCIXS0w6oiSbZ2FiCBi':Object.freeze({codec:'brotli',paths:Object.freeze(['part-00','part-01'].map((name)=>join(APW431_ROOT,`apw431_options_v1.0-R1.json.br.b64.parts/${name}`)))}),
    }),
  }),
  Object.freeze({
    manufacturer:'YKK AP', series:'ウチリモ 内窓', masterVersion:'v1.0-P7R1-R2', schemaVersion:'2.0', packageType:'RUNTIME_MANIFEST_V2', adapterType:'UCHIRIMO_TABULAR_V1', requireRuntimeContract:false, enforceComponentSchemaVersion:false, packageRoot:UCHIRIMO_ROOT,
    runtimeManifestPath:join(UCHIRIMO_ROOT,'runtime_manifest.json'), runtimeManifestDriveFileId:'1119yamXn21wLZd3C8LvamNWsTAx_1dt2', runtimeManifestSha256:'be4f1f77727424dc06ddf9de947201f33d4aee5219b182e37d0f178e1fb7147d',
    materializedFiles:Object.freeze({
      '1iX6-TuR7B7tUKqtGnd76IzVJzq9OH2zK':Object.freeze({codec:'brotli',paths:Object.freeze([join(UCHIRIMO_ROOT,'canonical.json.br.b64.parts/part-00')])}),
      '1c6hmvMgSLhESgmMJTRW7DN_opa1HhYlZ':Object.freeze({codec:'brotli',paths:Object.freeze([join(UCHIRIMO_ROOT,'size-installation.json.br.b64.parts/part-00')])}),
      '1TJn2-e6Sa6LcIv6FxNt0ahGSWlcgclJZ':Object.freeze({codec:'brotli',paths:Object.freeze([join(UCHIRIMO_ROOT,'vacuum-glass.json.br.b64.parts/part-00')])}),
      '1fNUukTQaDJT2iWbNk6F8gcLLt22Sg32z':Object.freeze({codec:'brotli',paths:Object.freeze([join(UCHIRIMO_ROOT,'judgment-engine.json.br.b64.parts/part-00')])}),
    }),
  }),
  Object.freeze({
    manufacturer:'LIXIL', series:'インプラス', masterVersion:'v0.4-R2', schemaVersion:'2.0', packageType:'RUNTIME_MANIFEST_V1', adapterType:'SEMANTIC_TABLE_BUNDLE_V2', packageRoot:INPLUS_ROOT,
    runtimeManifestPath:join(INPLUS_ROOT,'runtime_manifest.json'), runtimeManifestDriveFileId:'1TokjIpcipm8TPxwrSO0FjyPxxvhCq5iZ', runtimeManifestSha256:'cbbdb6ba315c985f7d27f75a237e861be8ce635962ce1cd5a746d7f152c8e1f8',
    materializedFiles:Object.freeze({
      '16dqUaVFp0YW3PqJ-A9tR0fAV0KT7WZML':Object.freeze({ codec:'gzip', paths:Object.freeze(['part-00a','part-00b','part-00c','part-01','part-02a','part-02b','part-02c','part-03'].map((name)=>join(INPLUS_ROOT,`LIXIL_インプラス_runtime_v0.4-R2.json.gz.b64.parts/${name}`))) }),
      '1Qov5w3pNrU9om40OLJikJv7B8klK1RNz':Object.freeze({codec:'gzip',paths:Object.freeze([join(INPLUS_ROOT,'LIXIL_インプラス_runtime_v0.4-R2.schema.json.gz.b64')])}),
    }),
  }),
  Object.freeze({
    manufacturer:'LIXIL', series:'TW', masterVersion:'integrated-v0.4', schemaVersion:'2.0', packageType:'RUNTIME_MANIFEST_V1', adapterType:'TW_CANONICAL_WORKBOOK_REFERENCE_V2', packageRoot:TW_ROOT,
    runtimeManifestPath:join(TW_ROOT,'runtime_manifest.json'), runtimeManifestDriveFileId:'13doEdTkUlQNu4Dm-SNwkeUg8RkrjS5G0', runtimeManifestSha256:'95380f5cab261edf03bf868e0f2120b9d57e941d6618b4543afe7a6ffd00c68e',
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
  return Object.freeze({ entry, master: adapted.master ?? null, api: null, resolver: adapted.resolver ?? null, uiResolver: adapted.uiResolver ?? null, sourcePackageIntegrity: runtimePackage.integrity, normalizedManifest: runtimePackage.manifest });
}

export async function loadRegisteredRuntime(manufacturer, series) {
  const entry = getRuntimeMasterEntry(manufacturer, series);
  if (!entry) return null;
  const key = `${manufacturer}/${series}`;
  if (!runtimePromises.has(key)) runtimePromises.set(key, loadRuntime(entry).catch((error) => { runtimePromises.delete(key); throw error; }));
  return runtimePromises.get(key);
}
