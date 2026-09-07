import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
};

function fail(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, details);
  throw error;
}

function gitBlobSha(bytes) {
  return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex');
}

export async function loadSemanticTableBundleV2(entry) {
  const root = entry.projectionRoot ?? join(HERE, '../runtime-master-projections/lixil-inplus-v0.4');
  const manifestPath = join(root, 'projection-manifest.json');
  let manifest;
  try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); }
  catch (cause) { fail('SEMANTIC_BUNDLE_PROJECTION_MANIFEST_INVALID', 'Projection manifest could not be read', { cause, manifestPath }); }

  const expectedIdentity = [
    ['manufacturer', entry.manufacturer],
    ['series', entry.series],
    ['package_version', entry.masterVersion],
  ];
  for (const [key, expected] of expectedIdentity) {
    if (String(manifest[key]) !== String(expected)) fail('SEMANTIC_BUNDLE_IDENTITY_MISMATCH', `${key} mismatch`, { key, expected, actual: manifest[key] });
  }
  if (entry.runtimeManifestDriveFileId && manifest.source_runtime_manifest?.drive_file_id !== entry.runtimeManifestDriveFileId) {
    fail('SEMANTIC_BUNDLE_SOURCE_MANIFEST_ID_MISMATCH', 'Canonical runtime_manifest Drive File ID mismatch');
  }
  if (entry.runtimeManifestSha256 && manifest.source_runtime_manifest?.sha256 !== entry.runtimeManifestSha256) {
    fail('SEMANTIC_BUNDLE_SOURCE_MANIFEST_SHA_MISMATCH', 'Canonical runtime_manifest SHA-256 mismatch');
  }
  if (entry.sourceRuntimeFileId && manifest.source_runtime_json?.drive_file_id !== entry.sourceRuntimeFileId) {
    fail('SEMANTIC_BUNDLE_SOURCE_RUNTIME_ID_MISMATCH', 'Canonical Runtime JSON Drive File ID mismatch');
  }
  if (entry.sourceRuntimeSha256 && manifest.source_runtime_json?.sha256 !== entry.sourceRuntimeSha256) {
    fail('SEMANTIC_BUNDLE_SOURCE_RUNTIME_SHA_MISMATCH', 'Canonical Runtime JSON SHA-256 mismatch');
  }

  const documents = {};
  const files = [];
  for (const row of manifest.files ?? []) {
    if (!row?.role || !row?.path || !row?.git_blob_sha) fail('SEMANTIC_BUNDLE_PROJECTION_MANIFEST_INVALID', 'Projection manifest file entry is incomplete', { row });
    const path = join(root, row.path);
    let bytes;
    try { bytes = await readFile(path); }
    catch (cause) { fail('SEMANTIC_BUNDLE_PROJECTION_FILE_MISSING', `Projection file missing: ${row.path}`, { cause, path, row }); }
    const actualGitBlobSha = gitBlobSha(bytes);
    if (actualGitBlobSha !== row.git_blob_sha) {
      fail('SEMANTIC_BUNDLE_PROJECTION_HASH_MISMATCH', `Projection Git blob SHA mismatch: ${row.path}`, { expected: row.git_blob_sha, actual: actualGitBlobSha, row });
    }
    let document;
    try { document = JSON.parse(bytes.toString('utf8')); }
    catch (cause) { fail('SEMANTIC_BUNDLE_PROJECTION_JSON_INVALID', `Projection JSON invalid: ${row.path}`, { cause, row }); }
    const source = document.source ?? {};
    for (const [key, expected] of [['manufacturer', entry.manufacturer], ['series', entry.series], ['package_version', entry.masterVersion]]) {
      if (String(source[key]) !== String(expected)) fail('SEMANTIC_BUNDLE_PROJECTION_IDENTITY_MISMATCH', `${row.path} source ${key} mismatch`, { row, key, expected, actual: source[key] });
    }
    if (entry.sourceRuntimeSha256 && source.runtime_sha256 !== entry.sourceRuntimeSha256) {
      fail('SEMANTIC_BUNDLE_PROJECTION_SOURCE_RUNTIME_SHA_MISMATCH', `${row.path} source Runtime SHA mismatch`, { row, expected: entry.sourceRuntimeSha256, actual: source.runtime_sha256 });
    }
    if (entry.runtimeManifestSha256 && source.manifest_sha256 !== entry.runtimeManifestSha256) {
      fail('SEMANTIC_BUNDLE_PROJECTION_SOURCE_MANIFEST_SHA_MISMATCH', `${row.path} source manifest SHA mismatch`, { row, expected: entry.runtimeManifestSha256, actual: source.manifest_sha256 });
    }
    documents[row.role] = document;
    files.push({ role: row.role, path: row.path, expected: row.git_blob_sha, actual: actualGitBlobSha, match: true, bytes: bytes.length, codec: 'identity-json-projection' });
  }

  for (const required of ['CORE_PROJECTION', 'SIZE_PROJECTION', 'INSTALLATION_PROJECTION', 'GLASS_TAXONOMY_PROJECTION']) {
    if (!documents[required]) fail('SEMANTIC_BUNDLE_PROJECTION_ROLE_MISSING', `Required projection role missing: ${required}`, { required });
  }

  return deepFreeze({
    projectionManifest: manifest,
    documents,
    integrity: {
      expected: entry.runtimeManifestSha256,
      actual: manifest.source_runtime_manifest.sha256,
      match: manifest.source_runtime_manifest.sha256 === entry.runtimeManifestSha256,
      manifestDriveFileId: entry.runtimeManifestDriveFileId,
      sourceRuntimeFileId: manifest.source_runtime_json.drive_file_id,
      sourceRuntimeSha256: manifest.source_runtime_json.sha256,
      sourceSchemaFileId: manifest.source_schema?.drive_file_id ?? null,
      sourceSchemaSha256: manifest.source_schema?.sha256 ?? null,
      files,
    },
  });
}
