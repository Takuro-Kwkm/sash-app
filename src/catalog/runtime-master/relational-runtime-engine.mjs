const MAX_RESOLUTION_ITERATIONS = 32;
const clone = (value) => structuredClone(value);
const has = (value) => value !== undefined && value !== null && value !== '';
const same = (a, b) => Object.is(a, b);

function baseValues(master, fieldName) {
  return master.values.filter((row) => row.field_name === fieldName && row.status === 'CURRENT' && row.runtime_selectable !== false).map((row) => row.canonical_value);
}

function fieldDef(master, fieldName) {
  return master.fields.find((row) => row.field_name === fieldName);
}

function normalizeInputValue(def, value) {
  if (def.data_type === 'array') return Array.isArray(value) ? [...new Set(value.filter(has))] : has(value) ? [value] : [];
  return value;
}

function allSourcesSelected(relation, selection) {
  return relation.sourceFields.every((field) => has(selection[field]) || (Array.isArray(selection[field]) && selection[field].length));
}

function sourceMatches(row, relation, selection) {
  return relation.sourceFields.every((field) => same(row.sources[field], selection[field]));
}

function relationConstraint(master, relation, selection) {
  if (!allSourcesSelected(relation, selection)) return null;
  const matching = relation.rows.filter((row) => sourceMatches(row, relation, selection));
  if (!matching.length) return null;
  const available = new Set(matching.filter((row) => row.availability === 'AVAILABLE' && row.targetValue !== null && row.targetValue !== undefined).map((row) => row.targetValue));
  const domain = new Set(relation.domainValues);
  const denied = [...domain].filter((value) => !available.has(value));
  const notApplicable = matching.every((row) => (row.targetValue === null || row.targetValue === undefined) && row.selectionMode === 'NOT_APPLICABLE');
  return { denied, notApplicable, matchingCount: matching.length, available: [...available] };
}

function applyExclusions(master, selection, allowedByField) {
  for (const rule of master.exclusionRules ?? []) {
    const matched = Object.entries(rule.conditions).every(([field, value]) => same(selection[field], value));
    if (!matched || rule.effect !== 'INCOMPATIBLE') continue;
    const allowed = allowedByField.get(rule.targetField);
    if (allowed) allowedByField.set(rule.targetField, allowed.filter((value) => !same(value, rule.targetValue)));
  }
}

function computeAllowed(master, selection) {
  const allowedByField = new Map(master.fields.map((def) => [def.field_name, baseValues(master, def.field_name)]));
  const notApplicable = new Set();
  for (const def of master.fields) {
    if (Object.entries(def.applicable_values ?? {}).some(([parent, values]) => has(selection[parent]) && !values.some((value) => same(value, selection[parent])))) {
      notApplicable.add(def.field_name);
    }
  }
  const branchTargets = new Map();
  for (const relation of master.relations ?? []) {
    if (relation.mode !== 'BRANCH') continue;
    const constraint = relationConstraint(master, relation, selection);
    if (!constraint) continue;
    const prior = branchTargets.get(relation.targetField);
    if (!prior || (relation.priority ?? 0) > (prior.relation.priority ?? 0)) branchTargets.set(relation.targetField, { relation, constraint });
  }
  for (const [targetField, { constraint }] of branchTargets.entries()) {
    allowedByField.set(targetField, [...constraint.available]);
    if (constraint.notApplicable) notApplicable.add(targetField);
  }
  for (const relation of master.relations ?? []) {
    if (relation.mode === 'BRANCH') continue;
    const constraint = relationConstraint(master, relation, selection);
    if (!constraint) continue;
    const current = allowedByField.get(relation.targetField) ?? [];
    const denied = new Set(constraint.denied);
    allowedByField.set(relation.targetField, current.filter((value) => !denied.has(value)));
    if (constraint.notApplicable) notApplicable.add(relation.targetField);
  }
  applyExclusions(master, selection, allowedByField);
  return { allowedByField, notApplicable };
}

function descendants(master, field) {
  const children = new Map(master.fields.map((def) => [def.field_name, []]));
  for (const def of master.fields) for (const parent of def.parent_fields ?? []) if (children.has(parent)) children.get(parent).push(def.field_name);
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

function selectionSignature(selection) {
  return JSON.stringify(Object.fromEntries(Object.entries(selection).sort(([a],[b]) => a.localeCompare(b)).map(([key, value]) => [key, Array.isArray(value) ? [...value].sort() : value])));
}

function reconcileSelection(master, inputSelection) {
  const selection = {};
  for (const def of master.fields) {
    if (!(def.field_name in (inputSelection ?? {}))) continue;
    selection[def.field_name] = normalizeInputValue(def, clone(inputSelection[def.field_name]));
  }
  const autoResolved = new Set();
  const cleared = [];
  const dependencyErrors = [];

  for (let iteration = 0; iteration < MAX_RESOLUTION_ITERATIONS; iteration++) {
    const before = selectionSignature(selection);
    const { allowedByField, notApplicable } = computeAllowed(master, selection);

    for (const def of master.fields) {
      const field = def.field_name;
      const value = selection[field];
      const allowed = allowedByField.get(field) ?? [];
      if (notApplicable.has(field)) {
        if (field in selection) { delete selection[field]; cleared.push({ field, reason: 'NOT_APPLICABLE' }); }
        continue;
      }
      if (def.data_type === 'array') {
        if (!Array.isArray(value)) continue;
        const filtered = value.filter((one) => allowed.some((candidate) => same(candidate, one)));
        if (filtered.length !== value.length) { selection[field] = filtered; cleared.push({ field, reason: 'DEPENDENCY', removed: value.filter((one) => !filtered.includes(one)) }); }
        if (!selection[field].length) delete selection[field];
      } else if (has(value) && !allowed.some((candidate) => same(candidate, value)) && (def.parent_fields?.length ?? 0) > 0) {
        delete selection[field];
        cleared.push({ field, reason: 'DEPENDENCY', removed: value });
        for (const child of descendants(master, field)) if (child in selection) { delete selection[child]; cleared.push({ field: child, reason: 'UPSTREAM_CLEAR' }); }
      }
    }

    dependencyErrors.length = 0;
    const optionDef = fieldDef(master, 'option');
    if (optionDef && Array.isArray(selection.option)) {
      const optionAllowed = new Set(allowedByField.get('option') ?? []);
      for (const dep of master.optionDependencies ?? []) {
        if (!['REQUIRES', 'FIXES'].includes(dep.relationship) || !selection.option.includes(dep.sourceOption) || !dep.targetIsOption) continue;
        if (!optionAllowed.has(dep.targetEntity)) {
          dependencyErrors.push({ code: 'REQUIRED_OPTION_NOT_AVAILABLE', field: 'option', ruleId: dep.ruleId, sourceOption: dep.sourceOption, targetOption: dep.targetEntity });
          continue;
        }
        if (!selection.option.includes(dep.targetEntity)) {
          selection.option.push(dep.targetEntity);
          selection.option = [...new Set(selection.option)];
          autoResolved.add(`option:${dep.targetEntity}`);
        }
      }
    }

    const recomputed = computeAllowed(master, selection);
    for (const def of master.fields) {
      if (def.selection_mode !== 'AUTO_RESOLVE' || recomputed.notApplicable.has(def.field_name) || has(selection[def.field_name])) continue;
      const allowed = recomputed.allowedByField.get(def.field_name) ?? [];
      if (allowed.length === 1) {
        selection[def.field_name] = allowed[0];
        autoResolved.add(def.field_name);
      }
    }

    if (before === selectionSignature(selection)) return { selection, autoResolved, cleared, dependencyErrors, ...computeAllowed(master, selection) };
  }
  const error = new Error(`Relational Runtime resolution exceeded ${MAX_RESOLUTION_ITERATIONS} iterations`);
  error.code = 'RUNTIME_RESOLUTION_LOOP';
  throw error;
}

function buildFieldState(master, resolved, inputSelection) {
  const fields = {};
  const input = inputSelection ?? {};
  for (const def of master.fields) {
    const name = def.field_name;
    const na = resolved.notApplicable.has(name);
    const value = name in resolved.selection ? clone(resolved.selection[name]) : null;
    const isResolved = resolved.autoResolved.has(name) || (name === 'option' && Array.isArray(value) && value.some((one) => resolved.autoResolved.has(`option:${one}`)));
    const allowed = [...(resolved.allowedByField.get(name) ?? [])];
    const hideSingleton = def.hide_when_singleton === true && allowed.length === 1 && (def.parent_fields ?? []).every((parent) => has(resolved.selection[parent]));
    const waitingForParent = def.hide_until_parents_selected === true && (def.parent_fields ?? []).some((parent) => !has(resolved.selection[parent]));
    const outsideApplicability = Object.entries(def.applicable_values ?? {}).some(([parent, values]) => has(resolved.selection[parent]) && !values.some((value) => same(value, resolved.selection[parent])));
    const hidden = na || def.hide_always === true || waitingForParent || outsideApplicability || hideSingleton;
    fields[name] = {
      value,
      state: na ? 'NOT_APPLICABLE' : isResolved ? 'RESOLVED' : name in resolved.selection ? 'SELECTED' : 'UNSET',
      resolved_by_rule: isResolved ? 'RUNTIME_RELATION_AUTO_RESOLVE' : null,
      derived_by_rule: null,
      visibility: hidden ? 'HIDE' : 'SHOW',
      required: !hidden && def.required_mode === 'REQUIRED',
      allowed_values: na ? [] : allowed,
    };
  }
  return fields;
}

function explicitInputErrors(master, inputSelection, resolved) {
  const errors = [];
  for (const def of master.fields) {
    if (!(def.field_name in (inputSelection ?? {}))) continue;
    const raw = normalizeInputValue(def, inputSelection[def.field_name]);
    const base = baseValues(master, def.field_name);
    if (def.data_type === 'array') {
      for (const value of raw) if (!base.some((candidate) => same(candidate, value))) errors.push({ code: 'SELECTION_NOT_ALLOWED', field: def.field_name, value });
    } else if (has(raw) && !base.some((candidate) => same(candidate, raw))) {
      errors.push({ code: 'SELECTION_NOT_ALLOWED', field: def.field_name, value: raw });
    }
  }
  for (const row of resolved.cleared) if (row.reason === 'DEPENDENCY') errors.push({ code: 'SELECTION_INCOMPATIBLE', field: row.field, value: row.removed });
  return [...errors, ...resolved.dependencyErrors];
}

export function evaluateRelationalRuntime(master, inputSelection = {}) {
  const resolved = reconcileSelection(master, inputSelection);
  const fields = buildFieldState(master, resolved, inputSelection);
  const errors = explicitInputErrors(master, inputSelection, resolved);
  const missing = Object.entries(fields).filter(([, state]) => state.required && state.visibility !== 'HIDE' && !has(state.value)).map(([name]) => name);
  const warnings = [];
  if (master.capabilities?.specialOrderEscalation) warnings.push({ code: 'SPECIAL_ORDER_ESCALATION', message: master.capabilities.specialOrderEscalation });
  for (const row of master.values) {
    const selected = fields[row.field_name]?.value;
    const isSelected = Array.isArray(selected) ? selected.includes(row.canonical_value) : same(selected, row.canonical_value);
    if (isSelected && row.source?.blocking_note) warnings.push({ code: 'SALES_LEVEL_DETAIL', message: row.source.blocking_note });
  }
  const derivedEntities = (master.optionDependencies ?? []).filter(dep =>
    ['REQUIRES', 'ENABLES', 'FIXES'].includes(dep.relationship) && resolved.selection.option?.includes(dep.sourceOption)
  ).map(dep => ({ ...dep, displayLabel: master.entities?.find(row => row.id === dep.targetEntity)?.label ?? dep.targetEntity }));
  const manualCheck = master.values.some(row => row.manual_check &&
    (Array.isArray(fields[row.field_name]?.value) ? fields[row.field_name].value.includes(row.canonical_value) : same(fields[row.field_name]?.value, row.canonical_value)));
  const status = errors.length ? 'INVALID' : missing.length ? 'INCOMPLETE' : manualCheck ? 'MANUAL_CHECK' : 'VALID';
  return {
    fields,
    derived_components: new Set(),
    derived_entities: derivedEntities,
    derived_options: [...resolved.autoResolved].filter((item) => item.startsWith('option:')).map((item) => item.slice(7)),
    warnings,
    matched_invalid_rules: errors.filter((row) => row.ruleId).map((row) => row.ruleId),
    errors,
    status,
    missing_required_fields: missing,
    cleared_fields: resolved.cleared,
  };
}

export function applyRelationalSelection(master, currentState, field, value) {
  const def = fieldDef(master, field);
  if (!def) throw Object.assign(new Error(`Unknown field ${field}`), { code: 'UNKNOWN_FIELD' });
  const current = Object.fromEntries(Object.entries(currentState.fields ?? {}).filter(([, state]) => has(state.value)).map(([name, state]) => [name, clone(state.value)]));
  for (const child of descendants(master, field)) delete current[child];
  if (has(value) || (Array.isArray(value) && value.length)) current[field] = clone(value); else delete current[field];
  return evaluateRelationalRuntime(master, current);
}
