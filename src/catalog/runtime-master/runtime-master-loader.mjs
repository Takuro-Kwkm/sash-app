import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';

const REQUIRED_JSON = [
  'manifest.json','product.json','fields.json','values.json','designs.json','color_sets.json',
  'handles.json','frames.json','size_sets.json','electric_systems.json','options.json','component_sets.json',
  'dependency_rules.json','visibility_rules.json','invalid_rules.json','auto_resolve_rules.json',
  'capabilities.json','technical_fields.json','deferred.json','corrections.json','migration_aliases.json','evidence_refs.json',
  'fixtures/positive_cases.json','fixtures/negative_cases.json','fixtures/boundary_cases.json','fixtures/design_reachability.json',
  'schema/field.schema.json','schema/rule.schema.json','schema/configuration.schema.json','schema/manifest.schema.json',
  'integrity_audit.json','runtime_validation_report.json'
];

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
};

function parseZip(buffer) {
  const entries = new Map();
  let offset = 0;
  while (offset + 4 <= buffer.length) {
    const signature = buffer.readUInt32LE(offset);
    if (signature === 0x02014b50 || signature === 0x06054b50) break;
    if (signature !== 0x04034b50) throw new Error(`Unsupported ZIP structure at offset ${offset}`);
    const flags = buffer.readUInt16LE(offset + 6);
    const method = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const uncompressedSize = buffer.readUInt32LE(offset + 22);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    if (flags & 0x0008) throw new Error('ZIP data descriptors are not supported by this runtime loader');
    const nameStart = offset + 30;
    const name = buffer.subarray(nameStart, nameStart + nameLength).toString('utf8');
    const dataStart = nameStart + nameLength + extraLength;
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
    let content;
    if (method === 0) content = Buffer.from(compressed);
    else if (method === 8) content = inflateRawSync(compressed);
    else throw new Error(`Unsupported ZIP compression method ${method} for ${name}`);
    if (content.length !== uncompressedSize) throw new Error(`ZIP size mismatch for ${name}`);
    entries.set(name, content);
    offset = dataStart + compressedSize;
  }
  return entries;
}

function stripCommonPrefix(entries) {
  const names = [...entries.keys()].filter((x) => !x.endsWith('/'));
  const firstSlash = names[0]?.indexOf('/') ?? -1;
  const prefix = firstSlash >= 0 ? names[0].slice(0, firstSlash + 1) : '';
  if (!prefix || !names.every((name) => name.startsWith(prefix))) return entries;
  return new Map([...entries].map(([name, value]) => [name.startsWith(prefix) ? name.slice(prefix.length) : name, value]));
}

export async function readSourcePackage(base64Path) {
  const paths = Array.isArray(base64Path) ? base64Path : [base64Path];
  const encoded = (await Promise.all(paths.map((path) => readFile(path, 'utf8')))).join('');
  const bytes = Buffer.from(encoded.replace(/\s+/g, ''), 'base64');
  return { bytes, entries: stripCommonPrefix(parseZip(bytes)) };
}

function readJsonEntry(entries, rel) {
  const data = entries.get(rel);
  if (!data) throw new Error(`Missing runtime master package entry: ${rel}`);
  return JSON.parse(data.toString('utf8'));
}

function typeMatches(value, type) {
  if (type === 'null') return value === null;
  if (type === 'array') return Array.isArray(value);
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  return typeof value === type;
}

export function validateJsonSchema(value, schema, path = '$') {
  const errors = [];
  if (!schema || typeof schema !== 'object') return errors;
  if ('const' in schema && value !== schema.const) errors.push(`${path}: expected const ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.some((x) => Object.is(x, value))) errors.push(`${path}: not in enum`);
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => typeMatches(value, t))) return [...errors, `${path}: expected ${types.join('|')}`];
  }
  if (typeof value === 'string' && schema.pattern && !(new RegExp(schema.pattern)).test(value)) errors.push(`${path}: pattern mismatch`);
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path}: below minimum`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${path}: above maximum`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path}: too few items`);
    if (schema.items) value.forEach((v, i) => errors.push(...validateJsonSchema(v, schema.items, `${path}[${i}]`)));
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const req of schema.required ?? []) if (!(req in value)) errors.push(`${path}.${req}: required`);
    for (const [key, childSchema] of Object.entries(schema.properties ?? {})) if (key in value) errors.push(...validateJsonSchema(value[key], childSchema, `${path}.${key}`));
    if (schema.additionalProperties === false && schema.properties) for (const key of Object.keys(value)) if (!(key in schema.properties)) errors.push(`${path}.${key}: additional property`);
  }
  return errors;
}

function collectConditions(condition, out = []) {
  if (!condition || typeof condition !== 'object') return out;
  if (Array.isArray(condition.all)) condition.all.forEach((x) => collectConditions(x, out));
  else if (Array.isArray(condition.any)) condition.any.forEach((x) => collectConditions(x, out));
  else if (condition.field) out.push(condition);
  return out;
}

export function auditMasterPackage(master) {
  const fieldMap = new Map(master.fields.map((x) => [x.field_name, x]));
  const valueMap = new Map();
  for (const row of master.values) {
    if (!valueMap.has(row.field_name)) valueMap.set(row.field_name, new Set());
    valueMap.get(row.field_name).add(row.canonical_value);
  }
  const componentSets = new Map(master.component_sets.component_sets.map((x) => [x.component_set_id, x]));
  const components = new Set(master.component_sets.components);
  const evidence = new Set(master.evidence_refs.map((x) => x.evidence_id));
  const allRules = [...master.dependency_rules, ...master.visibility_rules, ...master.invalid_rules, ...master.auto_resolve_rules];
  const counts = {
    duplicateFieldId: master.fields.length - new Set(master.fields.map((x) => x.field_id)).size,
    duplicateValueId: master.values.length - new Set(master.values.map((x) => x.value_id)).size,
    duplicateDesignId: master.designs.length - new Set(master.designs.map((x) => x.design_id)).size,
    duplicateRuleId: allRules.length - new Set(allRules.map((x) => x.rule_id)).size,
    missingFieldReference: 0,
    missingValueReference: 0,
    missingComponentReference: 0,
    missingEvidenceReference: 0,
  };
  for (const rule of allRules) {
    for (const cond of collectConditions(rule.conditions)) {
      if (!fieldMap.has(cond.field)) counts.missingFieldReference++;
      const field = fieldMap.get(cond.field);
      if (field?.data_type === 'enum') {
        const vals = 'values' in cond ? cond.values : ('value' in cond ? [cond.value] : []);
        for (const val of vals) if (val !== null && !valueMap.get(cond.field)?.has(val)) counts.missingValueReference++;
      }
    }
    for (const eff of rule.effects) {
      if (eff.field && !fieldMap.has(eff.field)) counts.missingFieldReference++;
      const field = fieldMap.get(eff.field);
      if (field?.data_type === 'enum') {
        const vals = ['ALLOW_VALUES','DENY_VALUES'].includes(eff.action) ? (eff.values ?? []) : eff.action === 'SET_VALUE' ? [eff.value] : [];
        for (const val of vals) if (val !== null && !valueMap.get(eff.field)?.has(val)) counts.missingValueReference++;
      }
      if (eff.action === 'ADD_COMPONENT_SET' && !componentSets.has(eff.component_set_id)) counts.missingComponentReference++;
      if (['ADD_COMPONENT','REMOVE_COMPONENT'].includes(eff.action) && !components.has(eff.component)) counts.missingComponentReference++;
    }
    for (const id of rule.evidence_ids ?? []) if (!evidence.has(id)) counts.missingEvidenceReference++;
  }
  return counts;
}

export async function verifySourceZipSha256({ base64Path, expectedSha256 }) {
  const { bytes } = await readSourcePackage(base64Path);
  const actual = createHash('sha256').update(bytes).digest('hex');
  return { expected: expectedSha256, actual, match: actual === expectedSha256, bytes: bytes.length };
}

export async function loadRuntimeMasterFromZipBase64(base64Path) {
  const { entries } = await readSourcePackage(base64Path);
  const data = {};
  for (const rel of REQUIRED_JSON) {
    const key = rel.replaceAll('/', '_').replace(/\.json$/, '').replaceAll('.', '_');
    data[key] = readJsonEntry(entries, rel);
  }
  const master = {
    sourcePackagePath: base64Path,
    manifest: data.manifest,
    product: data.product,
    fields: data.fields,
    values: data.values,
    designs: data.designs,
    color_sets: data.color_sets,
    handles: data.handles,
    frames: data.frames,
    size_sets: data.size_sets,
    electric_systems: data.electric_systems,
    options: data.options,
    component_sets: data.component_sets,
    dependency_rules: data.dependency_rules,
    visibility_rules: data.visibility_rules,
    invalid_rules: data.invalid_rules,
    auto_resolve_rules: data.auto_resolve_rules,
    capabilities: data.capabilities,
    technical_fields: data.technical_fields,
    deferred: data.deferred,
    corrections: data.corrections,
    migration_aliases: data.migration_aliases,
    evidence_refs: data.evidence_refs,
    fixtures: { positive: data.fixtures_positive_cases, negative: data.fixtures_negative_cases, boundary: data.fixtures_boundary_cases, reachability: data.fixtures_design_reachability },
    schemas: { field: data.schema_field_schema, rule: data.schema_rule_schema, configuration: data.schema_configuration_schema, manifest: data.schema_manifest_schema },
    integrity_audit: data.integrity_audit,
    runtime_validation_report: data.runtime_validation_report,
  };
  const schemaErrors = [
    ...validateJsonSchema(master.manifest, master.schemas.manifest, '$.manifest'),
    ...master.fields.flatMap((row, i) => validateJsonSchema(row, master.schemas.field, `$.fields[${i}]`)),
    ...[...master.dependency_rules, ...master.visibility_rules, ...master.invalid_rules, ...master.auto_resolve_rules].flatMap((row, i) => validateJsonSchema(row, master.schemas.rule, `$.rules[${i}]`)),
  ];
  const integrity = auditMasterPackage(master);
  if (schemaErrors.length || Object.values(integrity).some((n) => n !== 0)) {
    const err = new Error(`Runtime master validation failed: schema=${schemaErrors.length}, integrity=${JSON.stringify(integrity)}`);
    err.code = 'RUNTIME_MASTER_VALIDATION_FAILED';
    err.schemaErrors = schemaErrors;
    err.integrity = integrity;
    throw err;
  }
  return deepFreeze(master);
}
