import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import { validateJsonSchema } from './runtime-master-loader.mjs';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

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

export function normalizeRuntimeManifest(raw) {
  if (!raw || typeof raw !== 'object') fail('RUNTIME_MANIFEST_INVALID', 'runtime_manifest.json must be a JSON object');
  const runtimeFiles = Array.isArray(raw.runtime_files) ? raw.runtime_files.map((row) => ({
    role: row.role,
    fileName: row.file_name ?? row.name,
    fileId: row.file_id ?? row.id,
    sha256: row.sha256,
  })) : [];
  const schemaFile = raw.schema_file ? {
    role: 'RUNTIME_SCHEMA',
    fileName: raw.schema_file.file_name,
    fileId: raw.schema_file.file_id,
    sha256: raw.schema_file.sha256,
  } : null;
  const normalized = {
    schemaVersion: raw.schema_version,
    manufacturer: raw.manufacturer,
    series: raw.series,
    packageVersion: raw.package_version,
    runtimeStatus: raw.runtime_status,
    runtimeFiles,
    schemaFile,
    formalPass: raw.formal_pass === true || raw.master_status === 'FORMAL_PASS',
    storageStatus: raw.storage_status,
    packageGate: raw.package_gate,
    storageGate: raw.storage_gate ?? null,
    registryGate: raw.registry_gate ?? null,
    canonicalFolderId: raw.canonical_folder_id ?? null,
  };
  for (const key of ['schemaVersion','manufacturer','series','packageVersion','runtimeStatus']) {
    if (!normalized[key]) fail('RUNTIME_MANIFEST_INVALID', `runtime_manifest.json missing ${key}`);
  }
  if (!runtimeFiles.length || runtimeFiles.some((row) => !row.role || !row.fileName || !row.fileId || !row.sha256)) {
    fail('RUNTIME_MANIFEST_INVALID', 'runtime_manifest.json runtime_files must explicitly list role, file_name, file_id and sha256');
  }
  if (raw.schema_file && (!schemaFile?.fileName || !schemaFile.fileId || !schemaFile.sha256)) fail('RUNTIME_MANIFEST_INVALID', 'runtime_manifest.json schema_file is incomplete');
  return deepFreeze(normalized);
}

function normalizeTransportSpec(entry, fileId) {
  const raw = entry.materializedFiles?.[fileId];
  if (Array.isArray(raw)) return { codec: 'gzip', paths: raw };
  if (raw && typeof raw === 'object' && Array.isArray(raw.paths)) {
    return { codec: raw.codec ?? 'gzip', paths: raw.paths };
  }
  return null;
}

function decodeTransport(encoded, codec, fileName) {
  const packed = Buffer.from(encoded.replace(/\s+/g, ''), 'base64');
  try {
    if (codec === 'gzip') return gunzipSync(packed);
    if (codec === 'brotli' || codec === 'br') return brotliDecompressSync(packed);
    if (codec === 'identity') return packed;
  } catch (cause) {
    fail('RUNTIME_MANIFEST_TRANSPORT_INVALID', `Materialized Runtime transport is invalid: ${fileName}`, { cause, fileName, codec });
  }
  fail('RUNTIME_MANIFEST_TRANSPORT_CODEC_UNSUPPORTED', `Unsupported materialized Runtime transport codec: ${codec}`, { fileName, codec });
}

async function readMaterializedCanonicalFile(entry, manifestRow) {
  const { fileName, fileId, sha256: expectedSha256 } = manifestRow;
  const transport = normalizeTransportSpec(entry, fileId);
  if (!transport?.paths?.length) fail('RUNTIME_MANIFEST_FILE_MISSING', `Manifest-listed Runtime file has no explicit app materialization mapping: ${fileName}`, { fileName, fileId });
  let encoded;
  try { encoded = (await Promise.all(transport.paths.map((transportPath) => readFile(transportPath, 'utf8')))).join(''); }
  catch (cause) { fail('RUNTIME_MANIFEST_FILE_MISSING', `Manifest-listed Runtime file is not materialized: ${fileName}`, { cause, fileName, fileId }); }
  const bytes = decodeTransport(encoded, transport.codec, fileName);
  const actualSha256 = sha256(bytes);
  if (actualSha256 !== expectedSha256) {
    fail('RUNTIME_MANIFEST_FILE_SHA_MISMATCH', `Manifest-listed Runtime file SHA-256 mismatch: ${fileName}`, {
      fileName, expectedSha256, actualSha256,
    });
  }
  let json;
  try { json = JSON.parse(bytes.toString('utf8')); }
  catch (cause) { fail('RUNTIME_MANIFEST_FILE_JSON_INVALID', `Manifest-listed Runtime file is not valid JSON: ${fileName}`, { cause, fileName }); }
  return { fileName, bytes: bytes.length, expectedSha256, actualSha256, codec: transport.codec, json };
}

function documentIdentity(document) {
  if (!document || typeof document !== 'object') return {};
  const source = document.metadata && typeof document.metadata === 'object' ? document.metadata : document;
  return {
    manufacturer: source.manufacturer,
    series: source.series,
    package_version: source.package_version ?? source.packageVersion,
  };
}

export async function loadManifestRuntimePackage(entry) {
  const manifestBytes = await readFile(entry.runtimeManifestPath);
  const manifestActualSha256 = sha256(manifestBytes);
  if (entry.runtimeManifestSha256 && manifestActualSha256 !== entry.runtimeManifestSha256) {
    fail('RUNTIME_MANIFEST_SHA_MISMATCH', 'runtime_manifest.json SHA-256 mismatch', {
      expectedSha256: entry.runtimeManifestSha256,
      actualSha256: manifestActualSha256,
    });
  }
  let rawManifest;
  try { rawManifest = JSON.parse(manifestBytes.toString('utf8')); }
  catch (cause) { fail('RUNTIME_MANIFEST_INVALID', 'runtime_manifest.json is not valid JSON', { cause }); }
  const manifest = normalizeRuntimeManifest(rawManifest);

  const identityPairs = [
    ['manufacturer', entry.manufacturer, manifest.manufacturer],
    ['series', entry.series, manifest.series],
    ['packageVersion', entry.masterVersion, manifest.packageVersion],
    ['schemaVersion', entry.schemaVersion, manifest.schemaVersion],
  ];
  for (const [name, expected, actual] of identityPairs) {
    if (String(expected) !== String(actual)) fail('RUNTIME_MANIFEST_IDENTITY_MISMATCH', `${name} mismatch: expected ${expected}, got ${actual}`, { name, expected, actual });
  }
  const storageReady = manifest.storageStatus === 'PASS'
    || manifest.storageStatus === 'CANONICAL'
    || (manifest.storageStatus === 'DRIVE_CANONICAL' && manifest.storageGate === 'PASS');
  if (!manifest.formalPass || manifest.runtimeStatus !== 'READY' || !storageReady || manifest.packageGate !== 'PASS' || (manifest.registryGate && manifest.registryGate !== 'PASS')) {
    fail('RUNTIME_MANIFEST_NOT_FORMAL_READY', 'Canonical Runtime manifest is not formally READY', { manifest });
  }

  const schemaLoaded = manifest.schemaFile ? await readMaterializedCanonicalFile(entry, manifest.schemaFile) : null;
  const loadedByRole = new Map();
  const fileIntegrity = [];
  for (const row of manifest.runtimeFiles) {
    const loaded = await readMaterializedCanonicalFile(entry, row);
    loadedByRole.set(row.role, loaded.json);
    fileIntegrity.push({ role: row.role, fileName: row.fileName, fileId: row.fileId, expected: row.sha256, actual: loaded.actualSha256, match: true, bytes: loaded.bytes, codec: loaded.codec });
  }
  const schema = schemaLoaded?.json ?? null;
  const schemaErrors = [];
  for (const [role, document] of loadedByRole.entries()) {
    if (schema) schemaErrors.push(...validateJsonSchema(document, schema, `$.${role}`));
    const identity = documentIdentity(document);
    for (const [name, expected] of [['manufacturer', manifest.manufacturer], ['series', manifest.series], ['package_version', manifest.packageVersion]]) {
      if (String(identity[name]) !== String(expected)) schemaErrors.push(`$.${role}.${name}: expected ${expected}, got ${identity[name]}`);
    }
  }
  if (schemaErrors.length) fail('RUNTIME_MANIFEST_SCHEMA_FAILED', `Runtime schema/identity validation failed (${schemaErrors.length})`, { schemaErrors });

  return deepFreeze({
    manifest,
    rawManifest,
    documents: Object.fromEntries(loadedByRole),
    schema,
    integrity: {
      expected: entry.runtimeManifestSha256 ?? manifestActualSha256,
      actual: manifestActualSha256,
      match: !entry.runtimeManifestSha256 || entry.runtimeManifestSha256 === manifestActualSha256,
      manifestDriveFileId: entry.runtimeManifestDriveFileId ?? null,
      files: [...fileIntegrity, ...(schemaLoaded ? [{
        role: 'RUNTIME_SCHEMA', fileName: manifest.schemaFile.fileName, fileId: manifest.schemaFile.fileId,
        expected: manifest.schemaFile.sha256, actual: schemaLoaded.actualSha256, match: true, bytes: schemaLoaded.bytes, codec: schemaLoaded.codec,
      }] : [])],
    },
  });
}
