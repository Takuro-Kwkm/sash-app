import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRuntimeMasterFromZipBase64, verifySourceZipSha256 } from './runtime-master-loader.mjs';
import { runtimeApi } from './generic-rule-engine.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const XE_PARTS = ['part-00','part-01','part-02a1','part-02a2a','part-02b','part-03','part-04','part-05'];
const XE_B64 = XE_PARTS.map((name) => join(HERE, `../runtime-master-packages/lixil-xe/XE_V1_0_RC.source.zip.b64.parts/${name}`));
const XE_SHA256 = 'e2e5974e730508f4588afde5811df73032443c0cfc9b2f039ec44f61838653aa';

export const runtimeMasterInventory = Object.freeze([
  Object.freeze({ manufacturer: 'LIXIL', series: 'XE', masterVersion: 'XE_V1_0_RC', schemaVersion: '1.0', sourceZipBase64Path: XE_B64, sourceZipSha256: XE_SHA256 })
]);

export function getRuntimeMasterEntry(manufacturer, series) {
  return runtimeMasterInventory.find((x) => x.manufacturer === manufacturer && x.series === series) ?? null;
}

export async function loadRegisteredRuntime(manufacturer, series) {
  const entry = getRuntimeMasterEntry(manufacturer, series);
  if (!entry) return null;
  const integrity = await verifySourceZipSha256({ base64Path: entry.sourceZipBase64Path, expectedSha256: entry.sourceZipSha256 });
  if (!integrity.match) {
    const err = new Error(`Source package SHA mismatch for ${manufacturer}/${series}`);
    err.code = 'RUNTIME_SOURCE_PACKAGE_SHA_MISMATCH';
    throw err;
  }
  const master = await loadRuntimeMasterFromZipBase64(entry.sourceZipBase64Path);
  return Object.freeze({ entry, master, api: runtimeApi(master), sourcePackageIntegrity: integrity });
}
