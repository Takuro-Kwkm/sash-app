import { createInitialState, hydrateSelections, cloneState, resetTransient, deriveLookupRows, stateSignature, clone } from './runtime-state.mjs';
import { evaluateRules, applyInvalidRules } from './runtime-effects.mjs';

const MAX_RESOLUTION_ITERATIONS = 32;

function selectedAllowViolations(state) {
  const out = [];
  for (const [name, field] of Object.entries(state.fields)) {
    if (field.value === null || !Array.isArray(field.allowed_values)) continue;
    if (!field.allowed_values.some((x) => Object.is(x, field.value))) out.push(name);
  }
  return out;
}

function applySingletons(master, state) {
  let changed = false;
  const eligible = new Set(['AUTO_RESOLVE','CONDITIONAL_SELECTABLE']);
  for (const def of master.fields) {
    if (!eligible.has(def.selection_mode)) continue;
    const fs = state.fields[def.field_name];
    if (fs.state === 'SELECTED' || fs.state === 'NOT_APPLICABLE' || fs.visibility === 'HIDE') continue;
    if (Array.isArray(fs.allowed_values) && fs.allowed_values.length === 1) {
      const next = fs.allowed_values[0];
      if (!Object.is(fs.value, next) || fs.state !== 'RESOLVED') {
        fs.value = clone(next);
        fs.state = 'RESOLVED';
        fs.resolved_by_rule = 'SINGLETON_ALLOWED_VALUES';
        changed = true;
      }
    }
  }
  return changed;
}

function finalize(master, state) {
  evaluateRules(master, master.visibility_rules, state);
  for (const [name, fs] of Object.entries(state.fields)) {
    if (fs.visibility === 'HIDE' && fs.value === null) fs.state = 'NOT_APPLICABLE';
    if (fs.required && fs.visibility === 'HIDE' && (fs.state === 'UNSET' || fs.state === 'HIDDEN')) {
      const err = new Error(`Required hidden field: ${name}`);
      err.code = 'RUNTIME_VISIBILITY_REQUIRED_CONFLICT';
      throw err;
    }
  }
  applyInvalidRules(master, state);
  const allowViolations = selectedAllowViolations(state);
  const missing = Object.entries(state.fields).filter(([, fs]) => fs.required && fs.visibility !== 'HIDE' && (fs.value === null || fs.state === 'UNSET')).map(([name]) => name);
  state.errors = allowViolations.map((field) => ({ code: 'SELECTION_NOT_ALLOWED', field }));
  if (state.matched_invalid_rules.length || allowViolations.length) state.status = 'INVALID';
  else if (missing.length) state.status = 'INCOMPLETE';
  else state.status = 'VALID';
  state.missing_required_fields = missing;
  return state;
}

export function resolveState(master, inputState) {
  const state = cloneState(inputState);
  resetTransient(master, state);
  applyInvalidRules(master, state);
  for (let iteration = 0; iteration < MAX_RESOLUTION_ITERATIONS; iteration++) {
    const before = stateSignature(state);
    deriveLookupRows(master, state);
    evaluateRules(master, master.dependency_rules, state);
    evaluateRules(master, master.auto_resolve_rules, state);
    applySingletons(master, state);
    if (before === stateSignature(state)) return finalize(master, state);
  }
  const err = new Error(`Runtime resolution exceeded ${MAX_RESOLUTION_ITERATIONS} iterations`);
  err.code = 'RUNTIME_RESOLUTION_LOOP';
  throw err;
}

export function evaluateConfiguration(master, flatInput) {
  return resolveState(master, hydrateSelections(master, flatInput));
}

function descendants(master, field) {
  const children = new Map(master.fields.map((x) => [x.field_name, new Set()]));
  for (const def of master.fields) for (const parent of def.parent_fields ?? []) if (children.has(parent)) children.get(parent).add(def.field_name);
  const seen = new Set();
  const queue = [...(children.get(field) ?? [])];
  while (queue.length) {
    const next = queue.shift();
    if (seen.has(next)) continue;
    seen.add(next);
    queue.push(...(children.get(next) ?? []));
  }
  return seen;
}

export function applySelection(master, currentState, field, value) {
  if (!currentState.fields[field]) { const err = new Error(`Unknown field ${field}`); err.code = 'UNKNOWN_FIELD'; throw err; }
  const currentResolved = resolveState(master, currentState);
  const allowed = currentResolved.fields[field].allowed_values;
  if (Array.isArray(allowed) && allowed.length && !allowed.some((x) => Object.is(x, value))) { const err = new Error(`Selection not allowed: ${field}=${value}`); err.code = 'SELECTION_NOT_ALLOWED'; throw err; }
  const next = cloneState(currentResolved);
  for (const child of descendants(master, field)) {
    const fs = next.fields[child];
    if (!fs || master.fields.find((x) => x.field_name === child)?.selection_mode === 'FIXED') continue;
    fs.value = null; fs.state = 'UNSET'; fs.resolved_by_rule = null; fs.derived_by_rule = null;
  }
  next.fields[field].value = clone(value);
  next.fields[field].state = 'SELECTED';
  next.fields[field].resolved_by_rule = null;
  next.fields[field].derived_by_rule = null;
  return resolveState(master, next);
}

export function migrateLegacyConfiguration(master, legacy) {
  const aliases = master.migration_aliases.field_aliases ?? {};
  const valueAliases = master.migration_aliases.value_aliases ?? {};
  const known = new Set(master.fields.map((x) => x.field_name));
  const configuration = {};
  const unknown_legacy_fields = [];
  for (const [oldField, rawValue] of Object.entries(legacy ?? {})) {
    const field = aliases[oldField] ?? oldField;
    if (!known.has(field)) { unknown_legacy_fields.push(oldField); continue; }
    configuration[field] = typeof rawValue === 'string' && rawValue in valueAliases ? valueAliases[rawValue] : rawValue;
  }
  return { configuration, unknown_legacy_fields };
}

export function serializeConfiguration(master, state) {
  const out = {};
  for (const name of Object.keys(master.schemas.configuration.properties ?? {})) {
    const fs = state.fields[name];
    if (name === 'derived_components') out[name] = { value: [...state.derived_components].sort(), state: 'DERIVED' };
    else if (name === 'validation_status') out[name] = { value: state.status, state: 'DERIVED' };
    else if (fs) out[name] = { value: clone(fs.value), state: fs.state === 'HIDDEN' ? 'NOT_APPLICABLE' : fs.state, ...(fs.resolved_by_rule ? { resolved_by_rule: fs.resolved_by_rule } : {}) };
    else out[name] = { value: null, state: 'NOT_APPLICABLE' };
  }
  return out;
}

export function runtimeApi(master) {
  return {
    loadMaster: () => master,
    createInitialState: () => resolveState(master, createInitialState(master)),
    applySelection: (state, field, value) => applySelection(master, state, field, value),
    resolveState: (state) => resolveState(master, state),
    getAllowedValues: (state, field) => [...(state.fields[field]?.allowed_values ?? [])],
    getVisibleFields: (state) => Object.entries(state.fields).filter(([, x]) => x.visibility !== 'HIDE').map(([k]) => k),
    getRequiredFields: (state) => Object.entries(state.fields).filter(([, x]) => x.required).map(([k]) => k),
    getDerivedComponents: (state) => [...state.derived_components].sort(),
    validate: (state) => ({ status: state.status, errors: clone(state.errors), warnings: clone(state.warnings), missing_required_fields: clone(state.missing_required_fields ?? []), matched_invalid_rules: clone(state.matched_invalid_rules) }),
    serializeConfiguration: (state) => serializeConfiguration(master, state),
  };
}
