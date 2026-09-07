import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRuntimeMasterFromZipBase64, verifySourceZipSha256 } from './runtime-master-loader.mjs';
import { loadManifestRuntimePackage } from './runtime-manifest-loader.mjs';
import { loadCanonicalWorkbookRuntimePackage } from './canonical-runtime-manifest-loader.mjs';
import { adaptPhaseMasterMapsV1 } from './phase-master-maps-v1-adapter.mjs';
import { adaptCanonicalWorkbookReferenceV1 } from './canonical-workbook-reference-v1-adapter.mjs';
import { evaluateRelationalRuntime } from './relational-runtime-engine.mjs';
import { runtimeApi } from './generic-rule-engine.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const XE_PARTS = ['part-00','part-01','part-02a1','part-02a2a','part-02b','part-03','part-04','part-05'];
const XE_B64 = XE_PARTS.map((name) => join(HERE, `../runtime-master-packages/lixil-xe/XE_V1_0_RC.source.zip.b64.parts/${name}`));
const XE_SHA256 = 'e2e5974e730508f4588afde5811df73032443c0cfc9b2f039ec44f61838653aa';
const GIESTA2_ROOT = join(HERE, '../runtime-master-packages/lixil-giesta2-v0.8-r1');
const EW_ROOT = join(HERE, '../runtime-master-packages/lixil-ew-v1.1');

export const runtimeMasterInventory = Object.freeze([
  Object.freeze({
    manufacturer: 'LIXIL', series: 'XE', masterVersion: 'XE_V1_0_RC', schemaVersion: '1.0',
    packageType: 'XE_ZIP_BASE64', sourceZipBase64Path: XE_B64, sourceZipSha256: XE_SHA256,
  }),
  Object.freeze({
    manufacturer: 'LIXIL', series: 'ジエスタ2', masterVersion: 'v0.8-R1', schemaVersion: '1.0',
    packageType: 'RUNTIME_MANIFEST_V1', adapterType: 'PHASE_MASTER_MAPS_V1',
    packageRoot: GIESTA2_ROOT,
    runtimeManifestPath: join(GIESTA2_ROOT, 'runtime_manifest.json'),
    runtimeManifestDriveFileId: '1AEMf7ay34L5iIxFBT9fLh655yta2nWbC',
    runtimeManifestSha256: '9df554d2f4e2edc86c09db59646c56daabf5897751772a4ba1c0ccdff711d19c',
    materializedFiles: Object.freeze({
      '1VB0dxkU8m5nkqrcNXIlWhx6YuvW0RINZ': Object.freeze({
        codec: 'gzip',
        paths: Object.freeze([join(GIESTA2_ROOT, 'LIXIL_ジエスタ2_runtime_core_v0.8-R1.json.gz.b64')]),
      }),
      '1PMBNseQ6PemIbl5iReUxl-AI_2ntGRGr': Object.freeze({
        codec: 'brotli',
        paths: Object.freeze(['part-00','part-01','part-02'].map((name) => join(GIESTA2_ROOT, `LIXIL_ジエスタ2_runtime_maps_v0.8-R1.json.br.b64.parts/${name}`))),
      }),
      '1Za4wtwWySz2sCTMn3qykDKiK1l5TbObe': Object.freeze({
        codec: 'gzip',
        paths: Object.freeze([join(GIESTA2_ROOT, 'giesta2_runtime_package_v0.8-R1.schema.json.gz.b64')]),
      }),
    }),
  }),
  Object.freeze({
    manufacturer: 'LIXIL', series: 'EW', masterVersion: 'v1.1', schemaVersion: '2.0',
    packageType: 'RUNTIME_MANIFEST_V2', adapterType: 'CANONICAL_WORKBOOK_REFERENCE_V1',
    packageRoot: EW_ROOT,
    runtimeManifestPath: join(EW_ROOT, 'runtime_manifest.json'),
    runtimeManifestDriveFileId: '139c0atou5LFz7EIHIdD7ZTYWddfSHf5_',
    runtimeManifestSha256: '8646bfd5f4a3d2184f2dbcb5b28f6e7dca995c9e11d53ec273a158588b5cdbed',
    materializedFiles: Object.freeze({
      '1soPPTqP9LNKWFS1wxWhN8Lux6p9ZdyYf': Object.freeze({
        codec: 'brotli',
        paths: Object.freeze(['part-00','part-01'].map((name) => join(EW_ROOT, `LIXIL_EW_runtime_v1.1.json.br.b64.parts/${name}`))),
      }),
    }),
  }),
]);

export function getRuntimeMasterEntry(manufacturer, series) {
  return runtimeMasterInventory.find((x) => x.manufacturer === manufacturer && x.series === series) ?? null;
}

function adaptManifestPackage(entry, runtimePackage) {
  if (entry.adapterType === 'PHASE_MASTER_MAPS_V1') {
    const master = adaptPhaseMasterMapsV1(runtimePackage);
    return { master, resolver: (selection) => evaluateRelationalRuntime(master, selection) };
  }
  if (entry.adapterType === 'CANONICAL_WORKBOOK_REFERENCE_V1') {
    return adaptCanonicalWorkbookReferenceV1(runtimePackage);
  }
  const error = new Error(`Unsupported Runtime adapter type: ${entry.adapterType}`);
  error.code = 'RUNTIME_ADAPTER_NOT_REGISTERED';
  throw error;
}

export async function loadRegisteredRuntime(manufacturer, series) {
  const entry = getRuntimeMasterEntry(manufacturer, series);
  if (!entry) return null;
  if (entry.packageType === 'RUNTIME_MANIFEST_V1' || entry.packageType === 'RUNTIME_MANIFEST_V2') {
    const runtimePackage = entry.packageType === 'RUNTIME_MANIFEST_V2'
      ? await loadCanonicalWorkbookRuntimePackage(entry)
      : await loadManifestRuntimePackage(entry);
    const adapted = adaptManifestPackage(entry, runtimePackage);
    return Object.freeze({
      entry,
      master: adapted.master,
      api: null,
      resolver: adapted.resolver,
      sourcePackageIntegrity: runtimePackage.integrity,
      normalizedManifest: runtimePackage.manifest,
    });
  }
  const integrity = await verifySourceZipSha256({ base64Path: entry.sourceZipBase64Path, expectedSha256: entry.sourceZipSha256 });
  if (!integrity.match) {
    const err = new Error(`Source package SHA mismatch for ${manufacturer}/${series}`);
    err.code = 'RUNTIME_SOURCE_PACKAGE_SHA_MISMATCH';
    throw err;
  }
  const master = await loadRuntimeMasterFromZipBase64(entry.sourceZipBase64Path);
  return Object.freeze({ entry, master, api: runtimeApi(master), resolver: null, sourcePackageIntegrity: integrity, normalizedManifest: null });
}
