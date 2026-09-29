import { createHash } from 'node:crypto';

// These are projections of the existing FORMAL facts, not newly inferred
// manufacturer allowances. Every rectangle must be an exact union of input tuples.
export const GLASS_COMPONENT_FIELDS = {
  base: ['glass_family', 'glass_structure', 'glass_structure_code', 'low_e_type',
    'glass_coating_color', 'glass_surface_type', 'safety_treatment', 'vacuum_glass_product'],
  decoration: ['grille_type', 'grille_material', 'muntin_type'],
  cavity: ['gas_fill', 'spacer_type'],
};
const dimensions = Object.keys(GLASS_COMPONENT_FIELDS);
export const stableJson = (v) => JSON.stringify(v, (_, x) => x && !Array.isArray(x) && typeof x === 'object'
  ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]])) : x);
const idFor = (prefix, facts) => `${prefix}-${createHash('sha256').update(stableJson(facts)).digest('hex').slice(0, 20)}`;
const check = (condition, code) => { if (!condition) throw new Error(`GLASS_RULE_MODEL_${code}`); };
const pick = (row, keys) => Object.fromEntries(keys.filter((k) => Object.hasOwn(row, k)).map((k) => [k, row[k]]));
const without = (row, keys) => Object.fromEntries(Object.entries(row).filter(([k]) => !keys.includes(k)));
const allFields = Object.values(GLASS_COMPONENT_FIELDS).flat();
const sorted = (values) => [...values].sort();

export function normalizeGlassSpecifications(canonical) {
  if (canonical.glass_rule_model) { compileGlassRuleModel(canonical); return structuredClone(canonical); }
  const rows = canonical.glass_specs;
  check(rows?.length && canonical.glass_compatibility_profiles?.length, 'INPUT_REQUIRED');
  const dictionaries = Object.fromEntries([...dimensions, 'assessment'].map((d) => [d, new Map()]));
  const intern = (d, facts) => {
    const id = idFor(`UCH-${d.toUpperCase()}`, facts);
    const map = dictionaries[d];
    check(!map.has(id) || stableJson(map.get(id).facts) === stableJson(facts), 'CONTENT_ID_COLLISION');
    map.set(id, { id, facts }); return id;
  };
  let rules = [];
  const identities = rows.map((row) => {
    const refs = Object.fromEntries(dimensions.map((d) => [d, intern(d, pick(row, GLASS_COMPONENT_FIELDS[d]))]));
    const assessment = intern('assessment', without(row, [...allFields, 'glass_spec_id', 'display_name']));
    rules.push({ base: [refs.base], decoration: [refs.decoration], cavity: [refs.cavity], assessment });
    return { glass_spec_id: row.glass_spec_id, display_name: row.display_name, ...refs };
  });
  // Merge only boxes equal in every other dimension AND in every assessment
  // field (size group, scope, verification, evidence, exceptions, compatibility).
  // A missing or exceptional tuple therefore cannot be silently filled in.
  for (let changed = true; changed;) {
    const before = rules.length;
    for (const d of ['cavity', 'decoration', 'base']) {
      const groups = new Map();
      for (const rule of rules) {
        const key = stableJson(without(rule, [d]));
        if (!groups.has(key)) groups.set(key, { ...rule, [d]: new Set() });
        for (const id of rule[d]) groups.get(key)[d].add(id);
      }
      rules = [...groups.values()].map((r) => ({ ...r, [d]: sorted(r[d]) }));
    }
    changed = rules.length < before;
  }
  rules = rules.map((r) => ({ id: idFor('UCH-GLASS-RULE', r), ...r })).sort((a, b) => a.id.localeCompare(b.id));
  const model = {
    schema_version: 'UCHIRIMO_GLASS_RULE_MODEL_V1',
    authority: 'LOSSLESS_REPRESENTATION_OF_EXISTING_FORMAL_NOT_NEW_MANUFACTURER_VERIFICATION',
    legacy_columns: [...new Set(rows.flatMap(Object.keys))],
    ...Object.fromEntries(Object.entries(dictionaries).map(([d, map]) => [d, [...map.values()].sort((a, b) => a.id.localeCompare(b.id))])),
    rules, identities,
  };
  const result = { ...canonical, glass_rule_model: model };
  delete result.glass_specs;
  const mapping = rows.map((r) => ({ glass_spec_id: r.glass_spec_id, glass_size_constraint_group: r.glass_size_constraint_group }));
  check(stableJson(mapping) === stableJson(canonical.glass_size_mapping), 'SIZE_MAPPING_NOT_DERIVABLE');
  delete result.glass_size_mapping;
  const allowed = canonical.allowed_values.filter((r) => r.field_name === 'glass_spec_id');
  const start = canonical.allowed_values.findIndex((r) => r.field_name === 'glass_spec_id');
  check(allowed.length === rows.length && allowed.every((r, i) => r.allowed_value === rows[i].glass_spec_id && r.display_name === rows[i].display_name), 'ALLOWED_IDENTITY_MISMATCH');
  const template = without(allowed[0], ['allowed_value', 'display_name']);
  check(allowed.every((r, i) => stableJson(without(r, ['allowed_value', 'display_name'])) === stableJson(template) && canonical.allowed_values[start + i] === r), 'ALLOWED_TEMPLATE_NOT_UNIFORM');
  model.allowed_value_projection = { index: start, template, columns: Object.keys(allowed[0]) };
  result.allowed_values = canonical.allowed_values.filter((r) => r.field_name !== 'glass_spec_id');
  compileGlassRuleModel(result);
  return result;
}

export function compileGlassRuleModel(canonical) {
  const m = canonical.glass_rule_model;
  check(m?.schema_version === 'UCHIRIMO_GLASS_RULE_MODEL_V1', 'SCHEMA');
  check(!canonical.glass_specs && !canonical.glass_size_mapping && !canonical.allowed_values.some((r) => r.field_name === 'glass_spec_id'), 'DUAL_AUTHORITY');
  const maps = {};
  for (const d of [...dimensions, 'assessment']) {
    maps[d] = new Map(m[d].map((r) => [r.id, r.facts]));
    check(maps[d].size === m[d].length && m[d].every((r) => r.id && r.facts), 'DICTIONARY_ID_COLLISION');
    if (d !== 'assessment') check(m[d].every((r) => Object.keys(r.facts).length === GLASS_COMPONENT_FIELDS[d].length &&
      GLASS_COMPONENT_FIELDS[d].every((k) => Object.hasOwn(r.facts, k))), 'COMPONENT_FIELD');
  }
  const profiles = new Map(canonical.glass_compatibility_profiles.map((r) => [r.profile_id, r]));
  const evidence = new Set(canonical.evidence.map((r) => r.source_id));
  const sizeGroups = new Set(canonical.glass_size_rules.map((r) => r.gsc_id));
  for (const { facts } of m.assessment) {
    check(!Object.keys(facts).some((k) => [...allFields, 'glass_spec_id', 'display_name'].includes(k)), 'ASSESSMENT_FIELD_OVERLAP');
    check(profiles.has(facts.compatibility_profile_id), 'PROFILE_ORPHAN');
    check(sizeGroups.has(facts.glass_size_constraint_group), 'SIZE_ORPHAN');
    const ids = [facts.source_id, ...(Array.isArray(facts.source_ids) ? facts.source_ids : String(facts.source_ids ?? '').split(/[;,]/))].filter(Boolean);
    check(ids.length > 0 && ids.every((id) => evidence.has(id)), 'EVIDENCE_ORPHAN');
  }
  check(new Set(m.rules.map((r) => r.id)).size === m.rules.length, 'RULE_ID_COLLISION');
  let logical = 0;
  for (const r of m.rules) {
    check(maps.assessment.has(r.assessment), 'ASSESSMENT_ORPHAN');
    let cardinality = 1;
    for (const d of dimensions) {
      check(r[d].length > 0 && new Set(r[d]).size === r[d].length && r[d].every((id) => maps[d].has(id)), 'RULE_COMPONENT_ORPHAN');
      cardinality *= r[d].length;
    }
    logical += cardinality;
  }
  for (let i = 0; i < m.rules.length; i++) for (let j = 0; j < i; j++) {
    check(!dimensions.every((d) => m.rules[i][d].some((id) => m.rules[j][d].includes(id))), 'OVERLAPPING_RULES');
  }
  const seenIds = new Set(), seenTuples = new Set();
  const componentMasks = Object.fromEntries(dimensions.map((d) => [d, new Map(m[d].map((r) => [r.id, 0n]))]));
  const ruleMasks = new Map(m.rules.map((r) => [r.id, 0n]));
  const assessmentForIndex = [];
  for (const [index, alias] of m.identities.entries()) {
    const tuple = JSON.stringify(dimensions.map((d) => alias[d]));
    check(alias.glass_spec_id && !seenIds.has(alias.glass_spec_id), 'PRIMARY_ID_COLLISION');
    check(!seenTuples.has(tuple), 'SEMANTIC_DUPLICATE');
    seenIds.add(alias.glass_spec_id); seenTuples.add(tuple);
    const matches = m.rules.filter((r) => dimensions.every((d) => r[d].includes(alias[d])));
    check(matches.length === 1, 'IDENTITY_RULE_COVERAGE');
    const bit = 1n << BigInt(index);
    ruleMasks.set(matches[0].id, ruleMasks.get(matches[0].id) | bit);
    assessmentForIndex.push(maps.assessment.get(matches[0].assessment));
    for (const d of dimensions) componentMasks[d].set(alias[d], componentMasks[d].get(alias[d]) | bit);
  }
  check(logical === m.identities.length, 'MISSING_IDENTITY');
  for (const d of dimensions) check([...componentMasks[d].values()].every((mask) => mask !== 0n), 'UNUSED_COMPONENT');
  check(m.assessment.every((a) => m.rules.some((r) => r.assessment === a.id)), 'UNUSED_ASSESSMENT');
  const av = m.allowed_value_projection;
  check(Number.isInteger(av?.index) && av.index >= 0 && av.index <= canonical.allowed_values.length &&
    av.template?.field_name === 'glass_spec_id' && av.columns?.includes('allowed_value') && av.columns.includes('display_name'), 'ALLOWED_PROJECTION');
  const fieldMasks = new Map();
  for (const d of dimensions) for (const [id, facts] of maps[d]) for (const [field, value] of Object.entries(facts)) {
    if (!fieldMasks.has(field)) fieldMasks.set(field, new Map());
    const choices = fieldMasks.get(field);
    choices.set(value, (choices.get(value) ?? 0n) | componentMasks[d].get(id));
  }
  const projectAt = (index) => {
    const alias = m.identities[index];
    const full = { glass_spec_id: alias.glass_spec_id, display_name: alias.display_name,
      ...maps.base.get(alias.base), ...maps.decoration.get(alias.decoration), ...maps.cavity.get(alias.cavity), ...assessmentForIndex[index] };
    return Object.fromEntries(m.legacy_columns.filter((k) => Object.hasOwn(full, k)).map((k) => [k, full[k]]));
  };
  const maskFor = (nodeId, deniedScopes = new Set()) => {
    let mask = 0n;
    for (const r of m.rules) {
      const facts = maps.assessment.get(r.assessment);
      const disposition = profiles.get(facts.compatibility_profile_id).node_statuses.find((s) => s.node_id === nodeId);
      if (disposition && disposition.status !== 'NOT_APPLICABLE' && !deniedScopes.has(facts.scope_class)) mask |= ruleMasks.get(r.id);
    }
    return mask;
  };
  return {
    logical_count: logical, identity_records_checked: seenIds.size,
    authoritative_records: [...dimensions, 'assessment'].reduce((n, d) => n + m[d].length, 0) + m.rules.length,
    projectAt, maskFor,
    filter: (mask, field, value) => mask & (fieldMasks.get(field)?.get(value) ?? 0n),
    choices: (mask, field) => [...(fieldMasks.get(field) ?? [])].map(([value, bits]) => ({ value, bits: bits & mask }))
      .filter((r) => r.bits !== 0n).sort((a, b) => {
        const x = a.bits & -a.bits, y = b.bits & -b.bits; return x < y ? -1 : x > y ? 1 : 0;
      }).map((r) => r.value),
    singleton: (mask) => mask !== 0n && (mask & (mask - 1n)) === 0n ? projectAt(mask.toString(2).length - 1) : null,
  };
}

export function projectGlassSpecifications(canonical) {
  if (!canonical.glass_rule_model) return canonical.glass_specs;
  const compiled = compileGlassRuleModel(canonical);
  return canonical.glass_rule_model.identities.map((_, index) => compiled.projectAt(index));
}

export function projectGlassAllowedValues(canonical) {
  if (!canonical.glass_rule_model) return canonical.allowed_values;
  const { index, template, columns } = canonical.glass_rule_model.allowed_value_projection;
  const projected = canonical.glass_rule_model.identities.map((r) => {
    const value = { ...template, allowed_value: r.glass_spec_id, display_name: r.display_name };
    return Object.fromEntries(columns.map((k) => [k, value[k]]));
  });
  return [...canonical.allowed_values.slice(0, index), ...projected, ...canonical.allowed_values.slice(index)];
}

// Explicit migration/debug projection only. Recurring QA compiles the rules
// and checks cardinalities without materializing 566 specifications or 8,490 pairs.
export function projectGlassCanonical(canonical) {
  if (!canonical.glass_rule_model) return canonical;
  const rows = projectGlassSpecifications(canonical);
  const out = { ...canonical, glass_specs: rows, allowed_values: projectGlassAllowedValues(canonical),
    glass_size_mapping: rows.map((r) => ({ glass_spec_id: r.glass_spec_id, glass_size_constraint_group: r.glass_size_constraint_group })) };
  delete out.glass_rule_model;
  return out;
}
