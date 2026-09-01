export const clone = (value) => structuredClone(value);

export function baseAllowedValues(master, fieldName) {
  const field = master.fields.find((x) => x.field_name === fieldName);
  if (!field || field.data_type !== 'enum') return null;
  return master.values.filter((x) => x.field_name === fieldName && x.status === 'CURRENT').map((x) => x.canonical_value);
}

export function createInitialState(master) {
  const fields = {};
  for (const def of master.fields) {
    const fixed = def.selection_mode === 'FIXED' && def.default_value !== null && def.default_value !== undefined;
    const hidden = def.visibility_mode === 'HIDDEN';
    fields[def.field_name] = {
      value: fixed ? clone(def.default_value) : null,
      state: fixed ? 'RESOLVED' : hidden ? 'HIDDEN' : 'UNSET',
      resolved_by_rule: null,
      derived_by_rule: null,
      visibility: hidden ? 'HIDE' : 'SHOW',
      required: def.required_mode === 'REQUIRED',
      allowed_values: baseAllowedValues(master, def.field_name),
    };
  }
  return { fields, derived_components: new Set(), warnings: [], matched_invalid_rules: [], errors: [], status: 'INCOMPLETE' };
}

export function hydrateSelections(master, flatInput) {
  const state = createInitialState(master);
  for (const [field, value] of Object.entries(flatInput ?? {})) {
    if (!state.fields[field]) continue;
    state.fields[field].value = clone(value);
    state.fields[field].state = 'SELECTED';
    state.fields[field].visibility = 'SHOW';
  }
  return state;
}

export function cloneState(state) {
  return {
    fields: clone(state.fields),
    derived_components: new Set([...state.derived_components]),
    warnings: clone(state.warnings ?? []),
    matched_invalid_rules: clone(state.matched_invalid_rules ?? []),
    errors: clone(state.errors ?? []),
    status: state.status ?? 'INCOMPLETE',
    missing_required_fields: clone(state.missing_required_fields ?? []),
  };
}

export function resetTransient(master, state) {
  state.derived_components = new Set();
  state.warnings = [];
  state.matched_invalid_rules = [];
  state.errors = [];
  for (const def of master.fields) {
    const fs = state.fields[def.field_name];
    fs.allowed_values = baseAllowedValues(master, def.field_name);
    fs.required = def.required_mode === 'REQUIRED';
    fs.visibility = def.visibility_mode === 'HIDDEN' ? 'HIDE' : 'SHOW';
    if (fs.state === 'NOT_APPLICABLE' || fs.state === 'HIDDEN') {
      fs.state = def.visibility_mode === 'HIDDEN' ? 'HIDDEN' : 'UNSET';
      fs.value = null;
      fs.resolved_by_rule = null;
      fs.derived_by_rule = null;
    }
    if ((fs.state === 'RESOLVED' || fs.state === 'DERIVED') && def.selection_mode !== 'FIXED') {
      fs.state = 'UNSET';
      fs.value = null;
      fs.resolved_by_rule = null;
      fs.derived_by_rule = null;
    }
  }
}

export function deriveLookupRows(master, state) {
  const selected = Object.fromEntries(Object.entries(state.fields).filter(([, x]) => x.state === 'SELECTED' && x.value !== null).map(([k, x]) => [k, x.value]));
  const candidates = master.designs.filter((row) => Object.entries(selected).every(([k, v]) => !(k in row) || Object.is(row[k], v)));
  if (candidates.length !== 1) return;
  const row = candidates[0];
  for (const def of master.fields) {
    if (def.selection_mode !== 'DERIVED' || def.runtime_included === false || !(def.field_name in row)) continue;
    const target = state.fields[def.field_name];
    if (target.state === 'SELECTED') continue;
    target.value = clone(row[def.field_name]);
    target.state = 'DERIVED';
    target.derived_by_rule = 'LOOKUP:designs.json';
  }
}

export function stateSignature(state) {
  return JSON.stringify(Object.fromEntries(Object.entries(state.fields).map(([k, v]) => [k, { value: v.value, state: v.state, required: v.required, allowed_values: v.allowed_values }])));
}
