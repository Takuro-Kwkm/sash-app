import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { brotliDecompressSync } from 'node:zlib';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
};

async function loadMaterializedJson(entry, descriptor, bundle = null) {
  const transportPath = entry.materializedFiles?.[descriptor.name];
  if (!transportPath && !bundle) {
    const error = new Error(`Missing materialized Runtime transport for ${descriptor.name}`);
    error.code = 'RUNTIME_MATERIALIZATION_MISSING';
    throw error;
  }
  const encoded = bundle ? bundle[descriptor.name] : (await readFile(transportPath, 'utf8')).trim();
  if (!encoded) {
    const error = new Error(`Missing materialized Runtime bytes for ${descriptor.name}`);
    error.code = 'RUNTIME_MATERIALIZATION_MISSING';
    throw error;
  }
  const compressed = Buffer.from(encoded, 'base64');
  const bytes = brotliDecompressSync(compressed);
  const actualSha256 = sha256(bytes);
  if (bytes.length !== descriptor.size_bytes || actualSha256 !== descriptor.sha256) {
    const error = new Error(`Runtime integrity mismatch for ${descriptor.name}`);
    error.code = 'RUNTIME_INTEGRITY_MISMATCH';
    error.file = descriptor.name;
    error.expected = { sha256: descriptor.sha256, sizeBytes: descriptor.size_bytes };
    error.actual = { sha256: actualSha256, sizeBytes: bytes.length };
    throw error;
  }
  return { value: JSON.parse(bytes.toString('utf8')), actualSha256, sizeBytes: bytes.length };
}

export async function loadFormalFlatJsonRuntimePackage(entry) {
  const manifestBytes = await readFile(entry.runtimeManifestPath);
  const manifestSha256 = sha256(manifestBytes);
  if (entry.runtimeManifestSha256 && manifestSha256 !== entry.runtimeManifestSha256) {
    const error = new Error('Runtime manifest integrity mismatch');
    error.code = 'RUNTIME_MANIFEST_INTEGRITY_MISMATCH';
    error.expected = entry.runtimeManifestSha256;
    error.actual = manifestSha256;
    throw error;
  }
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  if (manifest.manufacturer !== entry.manufacturer || manifest.series !== entry.series || manifest.package_version !== entry.masterVersion) {
    const error = new Error('Runtime manifest identity mismatch');
    error.code = 'RUNTIME_MANIFEST_IDENTITY_MISMATCH';
    throw error;
  }
  if (manifest.runtime_status !== 'FORMAL_RUNTIME_PASS' || manifest.formal_pass !== true) {
    const error = new Error('Runtime manifest is not formally adopted');
    error.code = 'RUNTIME_NOT_FORMAL';
    throw error;
  }

  const files = {};
  const integrityFiles = [];
  let bundle = null;
  if (entry.materializedBundleSegments?.length) {
    bundle = JSON.parse((await Promise.all(entry.materializedBundleSegments.map((path) => readFile(path, 'utf8')))).join(''));
  } else if (entry.materializedBundlePath) {
    bundle = JSON.parse(await readFile(entry.materializedBundlePath, 'utf8'));
  }
  for (const descriptor of manifest.files ?? []) {
    const loaded = await loadMaterializedJson(entry, descriptor, bundle);
    files[descriptor.name] = loaded.value;
    integrityFiles.push(Object.freeze({
      name: descriptor.name,
      expected: descriptor.sha256,
      actual: loaded.actualSha256,
      sizeBytes: loaded.sizeBytes,
      match: true,
    }));
  }
  return deepFreeze({
    manifest,
    files,
    integrity: {
      expected: entry.runtimeManifestSha256 ?? null,
      actual: manifestSha256,
      match: entry.runtimeManifestSha256 ? entry.runtimeManifestSha256 === manifestSha256 : true,
      manifestDriveFileId: entry.runtimeManifestDriveFileId ?? null,
      files: integrityFiles,
    },
  });
}
