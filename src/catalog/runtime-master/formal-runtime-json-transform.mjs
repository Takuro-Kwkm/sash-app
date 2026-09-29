import { createHash } from 'node:crypto';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function transformFail(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, details);
  throw error;
}

function replaceStrings(value, replacements) {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      if (typeof value[i] === 'string') {
        for (const row of replacements) value[i] = value[i].split(row.from).join(row.to);
      } else replaceStrings(value[i], replacements);
    }
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const key of Object.keys(value)) {
    if (typeof value[key] === 'string') {
      for (const row of replacements) value[key] = value[key].split(row.from).join(row.to);
    } else replaceStrings(value[key], replacements);
  }
}

function pointerTokens(pointer) {
  if (typeof pointer !== 'string' || !pointer.startsWith('/')) transformFail('FORMAL_RUNTIME_TRANSFORM_INVALID', `Invalid JSON pointer: ${pointer}`);
  return pointer.split('/').slice(1).map((token) => token.replaceAll('~1', '/').replaceAll('~0', '~'));
}

function resolveParent(root, pointer) {
  const tokens = pointerTokens(pointer);
  const key = tokens.pop();
  let parent = root;
  for (const token of tokens) {
    const next = Array.isArray(parent) ? Number(token) : token;
    if (parent?.[next] === undefined) transformFail('FORMAL_RUNTIME_TRANSFORM_POINTER_MISSING', `Transform pointer does not resolve: ${pointer}`);
    parent = parent[next];
  }
  return { parent, key };
}

function compareByKeys(keys) {
  return (left, right) => {
    for (const key of keys) {
      const a = left?.[key];
      const b = right?.[key];
      const result = typeof a === 'number' && typeof b === 'number'
        ? a - b
        : String(a ?? '').localeCompare(String(b ?? ''));
      if (result) return result;
    }
    return 0;
  };
}

export function applyFormalRuntimeJsonTransform(baseBytes, transformBytes) {
  let transform;
  let document;
  try {
    transform = JSON.parse(Buffer.from(transformBytes).toString('utf8'));
    document = JSON.parse(Buffer.from(baseBytes).toString('utf8'));
  } catch (cause) {
    transformFail('FORMAL_RUNTIME_TRANSFORM_INVALID', 'Formal Runtime JSON transform input is invalid JSON', { cause });
  }
  if (transform.format !== 'formal-runtime-json-transform/1.0') {
    transformFail('FORMAL_RUNTIME_TRANSFORM_INVALID', `Unsupported Runtime transform format: ${transform.format}`);
  }
  const baseActualSha256 = sha256(baseBytes);
  if (transform.source?.sha256 && transform.source.sha256 !== baseActualSha256) {
    transformFail('FORMAL_RUNTIME_TRANSFORM_SOURCE_SHA_MISMATCH', 'Runtime transform source SHA mismatch', { expectedSha256: transform.source.sha256, actualSha256: baseActualSha256 });
  }
  if (transform.source?.size_bytes !== undefined && Number(transform.source.size_bytes) !== baseBytes.length) {
    transformFail('FORMAL_RUNTIME_TRANSFORM_SOURCE_SIZE_MISMATCH', 'Runtime transform source byte size mismatch', { expectedBytes: Number(transform.source.size_bytes), actualBytes: baseBytes.length });
  }

  replaceStrings(document, transform.recursive_string_replacements ?? []);
  for (const operation of transform.operations ?? []) {
    const { parent, key } = resolveParent(document, operation.pointer);
    const index = Array.isArray(parent) ? Number(key) : key;
    if (operation.op === 'set') parent[index] = operation.value;
    else if (operation.op === 'delete') delete parent[index];
    else if (operation.op === 'append') {
      const target = parent[index];
      if (!Array.isArray(target) || !Array.isArray(operation.values)) transformFail('FORMAL_RUNTIME_TRANSFORM_INVALID', `append requires arrays: ${operation.pointer}`);
      target.push(...operation.values);
    } else if (operation.op === 'sort') {
      const target = parent[index];
      if (!Array.isArray(target) || !Array.isArray(operation.keys)) transformFail('FORMAL_RUNTIME_TRANSFORM_INVALID', `sort requires array target and keys: ${operation.pointer}`);
      target.sort(compareByKeys(operation.keys));
    } else transformFail('FORMAL_RUNTIME_TRANSFORM_INVALID', `Unsupported transform operation: ${operation.op}`);
  }

  const indent = Number(transform.serialization?.indent ?? 2);
  const trailingNewline = transform.serialization?.trailing_newline !== false;
  const bytes = Buffer.from(`${JSON.stringify(document, null, indent)}${trailingNewline ? '\n' : ''}`, 'utf8');
  const actualSha256 = sha256(bytes);
  if (transform.target?.sha256 && transform.target.sha256 !== actualSha256) {
    transformFail('FORMAL_RUNTIME_TRANSFORM_TARGET_SHA_MISMATCH', 'Runtime transform target SHA mismatch', { expectedSha256: transform.target.sha256, actualSha256 });
  }
  if (transform.target?.size_bytes !== undefined && Number(transform.target.size_bytes) !== bytes.length) {
    transformFail('FORMAL_RUNTIME_TRANSFORM_TARGET_SIZE_MISMATCH', 'Runtime transform target byte size mismatch', { expectedBytes: Number(transform.target.size_bytes), actualBytes: bytes.length });
  }
  return bytes;
}
