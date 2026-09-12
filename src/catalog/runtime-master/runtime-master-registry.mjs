import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCanonicalWorkbookRuntimePackage } from './canonical-runtime-manifest-loader.mjs';
import { adaptCanonicalWorkbookReferenceV1 } from './canonical-workbook-reference-v1-adapter.mjs';
import { loadManifestRuntimePackage } from './runtime-manifest-loader.mjs';
import { adaptTwCanonicalWorkbookReferenceV1 } from './tw-canonical-workbook-reference-v1-adapter.mjs';
import { evaluateCanonicalWorkbookRuntime } from './canonical-workbook-runtime-engine.mjs';
import { adaptUchirimoTabularV1 } from './uchirimo-tabular-v1-adapter.mjs';
import { loadFormalProductRuntimePackage } from './formal-product-runtime-loader.mjs';
import { adaptProductModuleRuntimeV1 } from './product-module-runtime-adapter.mjs';
import { adaptApw430FormalSplitV1 } from './apw430-formal-split-v1-adapter.mjs';
import { adaptApw431FormalSplitV1 } from './apw431-formal-split-v1-adapter.mjs';
import { guardFormalCustomDimensionUiResolver } from './formal-custom-dimension-safety.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const EW_ROOT = join(HERE, '../runtime-master-packages/lixil-ew-v1.1');
const EW_RUNTIME_SEGMENTS = ['seg-00','seg-01','seg-02','seg-03','seg-04','seg-05','seg-06','seg-07','seg-08a','seg-08b','seg-08c','seg-08d'];
const TW_ROOT = join(HERE, '../runtime-master-packages/lixil-tw-integrated-v0.2');
const UCHIRIMO_ROOT = join(HERE, '../runtime-master-packages/ykkap-uchirimo-v1.0-p7r1-r2');
const SAMOS2H_ROOT = join(HERE, '../runtime-master-packages/lixil-samos2h-v0.9-r1');
const THERMOSL_ROOT = join(HERE, '../runtime-master-packages/lixil-thermosl-v0.7-r1');
const APW430_ROOT = join(HERE, '../runtime-master-packages/ykkap-apw430-20260830-r1');
const APW431_ROOT = join(HERE, '../runtime-master-packages/ykkap-apw431-v1.0-r1');

export const runtimeMasterInventory = Object.freeze([
  Object.freeze({
    manufacturer: 'LIXIL', series: 'サーモスⅡ-H', manifestSeries: 'サーモスⅡH', productId: 'SER-LIX-SAMOS2H', masterVersion: 'v0.9-R1', schemaVersion: '2.0',
    packageType: 'FORMAL_PRODUCT_RUNTIME', adapterType: 'PRODUCT_MODULE_RUNTIME_V1', productModuleRole: 'RUNTIME_JSON_PACKAGE', packageRoot: SAMOS2H_ROOT,
    runtimeManifestPath: join(SAMOS2H_ROOT, 'runtime_manifest.json'), runtimeManifestDriveFileId: '1TkMSmr5dC8TDO6tmAL1gs0bHZrgvHuug', runtimeManifestSha256: '4e912379d05395d2f96403040c2eaa1b68c4124f4af2116a5b2fae53c004efd9',
    materializedFiles: Object.freeze({
      '1HF5t9xodqUmAbtiQW5AjHT14WfC9Kki0': Object.freeze({ codec:'brotli', paths:Object.freeze([join(SAMOS2H_ROOT,'LIXIL_サーモスⅡH_runtime_v0.9-R1.json.br.b64.parts/part-00')]) }),
      '1Mfrc15i9Pa0-tRihbpT74zPzalFb2JW_': Object.freeze({ codec:'brotli', paths:Object.freeze([join(SAMOS2H_ROOT,'samos2h_runtime_package_v0.9-R1.schema.json.br.b64.parts/part-00')]) }),
    }),
  }),
  Object.freeze({
    manufacturer:'LIXIL', series:'サーモスL', productId:'SER-LIX-SAMOSL', masterVersion:'v0.7-R1', schemaVersion:'2.0', packageType:'FORMAL_PRODUCT_RUNTIME', adapterType:'PRODUCT_MODULE_RUNTIME_V1', productModuleRole:'runtime_master', packageRoot:THERMOSL_ROOT,
    runtimeManifestPath:join(THERMOSL_ROOT,'runtime_manifest.json'), runtimeManifestDriveFileId:'1UKh-RS97d6l1xELaxoy-X-0HJgPXuSL2', runtimeManifestSha256:'29d1ef4725d7b277b468034cba07bfaba1202d8bf62e5180d4e38ec2fd4a64cd',
    materializedFiles:Object.freeze({
      '1b1gVeIVqMM9v0vTT4ZR7SbSdGdDqVS1r':Object.freeze({codec:'brotli',paths:Object.freeze([join(THERMOSL_ROOT,'LIXIL_サーモスL_runtime_v0.7-R1.json.br.b64.parts/part-00')])}),
      '1CAMYza5l9KHXwvohe5B6p4ltHJ3qAR2z':Object.freeze({codec:'brotli',paths:Object.freeze([join(THERMOSL_ROOT,'thermosl_runtime_package_v0.7-R1.schema.json.br.b64.parts/part-00')])}),
    }),
  }),
  Object.freeze({
    manufacturer:'LIXIL', series:'EW', masterVersion:'v1.1', schemaVersion:'2.0', packageType:'RUNTIME_MANIFEST_V2', adapterType:'CANONICAL_WORKBOOK_REFERENCE_V1', packageRoot:EW_ROOT,
    runtimeManifestPath:join(EW_ROOT,'runtime_manifest.json'), runtimeManifestDriveFileId:'139c0atou5LFz7EIHIdD7ZTYWddfSHf5_', runtimeManifestSha256:'8646bfd5f4a3d2184f2dbcb5b28f6e7dca995c9e11d53ec273a158588b5cdbed',
    materializedFiles:Object.freeze({'1soPPTqP9LNKWFS1wxWhN8Lux6p9ZdyYf':Object.freeze({codec:'brotli',paths:Object.freeze(EW_RUNTIME_SEGMENTS.map((name)=>join(EW_ROOT,`LIXIL_EW_runtime_v1.1.json.br.b64.segments/${name}`)))})}),
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
    manufacturer:'LIXIL', series:'TW', masterVersion:'integrated-v0.2', schemaVersion:'2.0', packageType:'RUNTIME_MANIFEST_V1', adapterType:'TW_CANONICAL_WORKBOOK_REFERENCE_V1', packageRoot:TW_ROOT,
    runtimeManifestPath:join(TW_ROOT,'runtime_manifest.json'), runtimeManifestDriveFileId:'1f9ogJ2pS0HmrUuXG1Qy431lG0mgxN9pw', runtimeManifestSha256:'52af3e462f940df67c267de5f715250290136afdd67a70611e684fcc3d5d064e',
    materializedFiles:Object.freeze({'1yt4ADBqoK4-5Xqt6bJ593Q4thi81IRzI':Object.freeze({codec:'brotli',paths:Object.freeze([join(TW_ROOT,'LIXIL_TW_runtime_integrated-v0.2.json.br.b64.parts/part-00')])})}),
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
    adapted = adaptCanonicalWorkbookReferenceV1(runtimePackage);
  } else if (entry.packageType === 'RUNTIME_MANIFEST_V2' && entry.adapterType === 'UCHIRIMO_TABULAR_V1') {
    runtimePackage = await loadCanonicalWorkbookRuntimePackage(entry);
    adapted = adaptUchirimoTabularV1(runtimePackage);
  } else if (entry.packageType === 'RUNTIME_MANIFEST_V1' && entry.adapterType === 'TW_CANONICAL_WORKBOOK_REFERENCE_V1') {
    runtimePackage = await loadManifestRuntimePackage(entry);
    const master = adaptTwCanonicalWorkbookReferenceV1(runtimePackage);
    adapted = { master, resolver: (selection) => evaluateCanonicalWorkbookRuntime(master, selection) };
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
