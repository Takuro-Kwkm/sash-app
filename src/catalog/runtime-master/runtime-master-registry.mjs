import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCanonicalWorkbookRuntimePackage } from './canonical-runtime-manifest-loader.mjs';
import { adaptCanonicalWorkbookReferenceV1 } from './canonical-workbook-reference-v1-adapter.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const EW_ROOT = join(HERE, '../runtime-master-packages/lixil-ew-v1.1');
const EW_RUNTIME_SEGMENTS = ['seg-00','seg-01','seg-02','seg-03','seg-04','seg-05','seg-06','seg-07','seg-08a','seg-08b','seg-08c','seg-08d'];

export const runtimeMasterInventory = Object.freeze([
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
        paths: Object.freeze(EW_RUNTIME_SEGMENTS.map((name) => join(EW_ROOT, `LIXIL_EW_runtime_v1.1.json.br.b64.segments/${name}`))),
      }),
    }),
  }),
]);

export function getRuntimeMasterEntry(manufacturer, series) {
  return runtimeMasterInventory.find((x) => x.manufacturer === manufacturer && x.series === series) ?? null;
}

let ewRuntimePromise = null;

async function loadEwRuntime(entry) {
  const runtimePackage = await loadCanonicalWorkbookRuntimePackage(entry);
  const adapted = adaptCanonicalWorkbookReferenceV1(runtimePackage);
  return Object.freeze({
    entry,
    master: adapted.master,
    api: null,
    resolver: adapted.resolver,
    sourcePackageIntegrity: runtimePackage.integrity,
    normalizedManifest: runtimePackage.manifest,
  });
}

export async function loadRegisteredRuntime(manufacturer, series) {
  const entry = getRuntimeMasterEntry(manufacturer, series);
  if (!entry) return null;
  if (entry.packageType !== 'RUNTIME_MANIFEST_V2' || entry.adapterType !== 'CANONICAL_WORKBOOK_REFERENCE_V1') {
    const error = new Error(`Unsupported release Runtime package: ${entry.packageType}/${entry.adapterType}`);
    error.code = 'RUNTIME_ADAPTER_NOT_REGISTERED';
    throw error;
  }
  if (!ewRuntimePromise) ewRuntimePromise = loadEwRuntime(entry).catch((error) => { ewRuntimePromise = null; throw error; });
  return ewRuntimePromise;
}
