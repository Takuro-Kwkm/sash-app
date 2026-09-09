import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function fail(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, details);
  throw error;
}

function normalizeRuntimeFile(row) {
  return {
    role: row?.role,
    fileName: row?.file_name ?? row?.name,
    fileId: row?.file_id ?? row?.id,
    sha256: row?.sha256,
  };
}

export function normalizeCanonicalRuntimeManifest(raw) {
  if (!raw || typeof raw !== 'object') fail('RUNTIME_MANIFEST_INVALID', 'runtime_manifest.json must be a JSON object');
  const runtimeFiles = Array.isArray(raw.runtime_files) ? raw.runtime_files.map(normalizeRuntimeFile) : [];
  const normalized = {
    schemaVersion: raw.schema_version,
    manufacturer: raw.manufacturer,
    series: raw.series,
    packageVersion: raw.package_version,
    runtimeStatus: raw.runtime_status,
    runtimeFiles,
    formalPass: raw.formal_pass === true || raw.formalization_status === 'FORMAL_PASS',
    storageStatus: raw.storage_status,
    storageGate: raw.storage_gate,
    registryGate: raw.registry_gate,
    packageGate: raw.package_gate,
    formalizationStatus: raw.formalization_status,
    documentationFileId: raw.documentation_file_id ?? null,
  };
  for (const key of ['schemaVersion','manufacturer','series','packageVersion','runtimeStatus']) {
    if (!normalized[key]) fail('RUNTIME_MANIFEST_INVALID', `runtime_manifest.json missing ${key}`);
  }
  if (!runtimeFiles.length || runtimeFiles.some((row) => !row.role || !row.fileName || !row.fileId || !row.sha256)) {
    fail('RUNTIME_MANIFEST_INVALID', 'runtime_manifest.json runtime_files must explicitly list role, file identity and sha256');
  }
  return Object.freeze(normalized);
}

function transportSpec(entry, fileId) {
  const raw = entry.materializedFiles?.[fileId];
  if (Array.isArray(raw)) return { codec: 'gzip', paths: raw };
  if (raw && typeof raw === 'object' && Array.isArray(raw.paths)) return { codec: raw.codec ?? 'gzip', paths: raw.paths };
  return null;
}

function decodeTransport(encoded, codec, fileName) {
  if (codec === 'identity') return Buffer.from(encoded, 'utf8');
  const packed = Buffer.from(encoded.replace(/\s+/g, ''), 'base64');
  try {
    if (codec === 'gzip') return gunzipSync(packed);
    if (codec === 'brotli' || codec === 'br') return brotliDecompressSync(packed);
  } catch (cause) {
    fail('RUNTIME_MANIFEST_TRANSPORT_INVALID', `Materialized Runtime transport is invalid: ${fileName}`, { cause, fileName, codec });
  }
  fail('RUNTIME_MANIFEST_TRANSPORT_CODEC_UNSUPPORTED', `Unsupported materialized Runtime transport codec: ${codec}`, { fileName, codec });
}

async function readMaterializedFile(entry, row) {
  const transport = transportSpec(entry, row.fileId);
  if (!transport?.paths?.length) {
    fail('RUNTIME_MANIFEST_FILE_MISSING', `Manifest-listed Runtime file has no explicit app materialization mapping: ${row.fileName}`, { fileName: row.fileName, fileId: row.fileId });
  }
  let encoded;
  try {
    encoded = (await Promise.all(transport.paths.map((path) => readFile(path, 'utf8')))).join('');
  } catch (cause) {
    fail('RUNTIME_MANIFEST_FILE_MISSING', `Manifest-listed Runtime file is not materialized: ${row.fileName}`, { cause, fileName: row.fileName, fileId: row.fileId });
  }
  const bytes = decodeTransport(encoded, transport.codec, row.fileName);
  const actualSha256 = sha256(bytes);
  if (actualSha256 !== row.sha256) {
    fail('RUNTIME_MANIFEST_FILE_SHA_MISMATCH', `Manifest-listed Runtime file SHA-256 mismatch: ${row.fileName}`, {
      fileName: row.fileName, expectedSha256: row.sha256, actualSha256,
    });
  }
  let json;
  try {
    json = JSON.parse(bytes.toString('utf8'));
  } catch (cause) {
    fail('RUNTIME_MANIFEST_FILE_JSON_INVALID', `Manifest-listed Runtime file is not valid JSON: ${row.fileName}`, { cause, fileName: row.fileName });
  }
  return { ...row, json, bytes: bytes.length, actualSha256, codec: transport.codec };
}

function verifyDocumentIdentity(document, manifest, role, { requireRuntimeContract = true, enforceSchemaVersion = true } = {}) {
  const identity = document?.metadata ?? document?.meta ?? document;
  const pairs = [
    ['schema_version', manifest.schemaVersion, identity?.schema_version],
    ['manufacturer', manifest.manufacturer, identity?.manufacturer],
    ['series', manifest.series, identity?.series],
    ['package_version', manifest.packageVersion, identity?.package_version ?? identity?.version ?? identity?.source_package_version],
  ];
  for (const [name, expected, actual] of pairs) {
    if (name === 'schema_version' && !enforceSchemaVersion) continue;
    if (actual !== undefined && actual !== null && String(expected) !== String(actual)) {
      fail('RUNTIME_MANIFEST_IDENTITY_MISMATCH', `${role}.${name} mismatch: expected ${expected}, got ${actual}`, { role, name, expected, actual });
    }
  }
  if (requireRuntimeContract && !document?.runtime_contract) {
    fail('RUNTIME_MANIFEST_DOCUMENT_CONTRACT_MISSING', `${role}.runtime_contract is required for schema-less canonical Runtime packages`, { role });
  }
}

export async function loadCanonicalWorkbookRuntimePackage(entry) {
  const manifestBytes = await readFile(entry.runtimeManifestPath);
  const manifestActualSha256 = sha256(manifestBytes);
  if (entry.runtimeManifestSha256 && entry.runtimeManifestSha256 !== manifestActualSha256) {
    fail('RUNTIME_MANIFEST_SHA_MISMATCH', 'runtime_manifest.json SHA-256 mismatch', {
      expectedSha256: entry.runtimeManifestSha256, actualSha256: manifestActualSha256,
    });
  }
  let rawManifest;
  try {
    rawManifest = JSON.parse(manifestBytes.toString('utf8'));
  } catch (cause) {
    fail('RUNTIME_MANIFEST_INVALID', 'runtime_manifest.json is not valid JSON', { cause });
  }
  const manifest = normalizeCanonicalRuntimeManifest(rawManifest);

  for (const [name, expected, actual] of [
    ['manufacturer', entry.manufacturer, manifest.manufacturer],
    ['series', entry.series, manifest.series],
    ['packageVersion', entry.masterVersion, manifest.packageVersion],
    ['schemaVersion', entry.schemaVersion, manifest.schemaVersion],
  ]) {
    if (String(expected) !== String(actual)) {
      fail('RUNTIME_MANIFEST_IDENTITY_MISMATCH', `${name} mismatch: expected ${expected}, got ${actual}`, { name, expected, actual });
    }
  }

  const storageReady = manifest.storageStatus === 'PASS_CANONICAL' ||
    (manifest.storageStatus === 'DRIVE_CANONICAL' && manifest.storageGate === 'PASS');
  if (!manifest.formalPass || manifest.runtimeStatus !== 'READY' || !storageReady ||
      manifest.packageGate !== 'PASS' || manifest.registryGate !== 'PASS') {
    fail('RUNTIME_MANIFEST_NOT_FORMAL_READY', 'Canonical Runtime manifest is not formally READY', { manifest });
  }

  const loadedByRole = new Map();
  const files = [];
  for (const row of manifest.runtimeFiles) {
    const loaded = await readMaterializedFile(entry, row);
    verifyDocumentIdentity(loaded.json, manifest, row.role, {
      requireRuntimeContract: entry.requireRuntimeContract !== false,
      enforceSchemaVersion: entry.enforceComponentSchemaVersion !== false,
    });
    loadedByRole.set(row.role, loaded.json);
    files.push({
      role: row.role, fileName: row.fileName, fileId: row.fileId,
      expected: row.sha256, actual: loaded.actualSha256, match: true,
      bytes: loaded.bytes, codec: loaded.codec,
    });
  }

  return Object.freeze({
    manifest,
    rawManifest,
    documents: Object.freeze(Object.fromEntries(loadedByRole)),
    integrity: Object.freeze({
      expected: entry.runtimeManifestSha256 ?? manifestActualSha256,
      actual: manifestActualSha256,
      match: !entry.runtimeManifestSha256 || entry.runtimeManifestSha256 === manifestActualSha256,
      manifestDriveFileId: entry.runtimeManifestDriveFileId ?? null,
      files: Object.freeze(files),
    }),
  });
}
