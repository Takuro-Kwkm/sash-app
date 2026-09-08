import { evaluateCondition } from './runtime-condition.mjs';

function setResolved(state, field, value, rule, mode = 'RESOLVED') {
  const current = state.fields[field];
  if (!current) throw new Error(`Unknown field in effect: ${field}`);
  if (current.state === 'SELECTED' && !Object.is(current.value, value)) return;
  if ((current.state === 'RESOLVED' || current.state === 'DERIVED') && current.value !== null && !Object.is(current.value, value)) {
    const err = new Error(`AUTO_RESOLVE_CONFLICT on ${field}: ${current.value} vs ${value}`);
    err.code = 'AUTO_RESOLVE_CONFLICT';
    throw err;
  }
  current.value = value;
  current.state = mode;
  current.resolved_by_rule = mode === 'RESOLVED' ? rule.rule_id : null;
  current.derived_by_rule = mode === 'DERIVED' ? rule.rule_id : null;
}

export function applyEffect(master, rule, effect, state) {
  const target = effect.field ? state.fields[effect.field] : null;
  switch (effect.action) {
    case 'ALLOW_VALUES': {
      const incoming = new Set(effect.values ?? []);
      const current = target.allowed_values === null ? incoming : new Set(target.allowed_values.filter((x) => incoming.has(x)));
      target.allowed_values = [...current];
      break;
    }
    case 'DENY_VALUES': {
      const denied = new Set(effect.values ?? []);
      target.allowed_values = (target.allowed_values ?? []).filter((x) => !denied.has(x));
      break;
    }
    case 'SET_VALUE': setResolved(state, effect.field, effect.value, rule, rule.rule_type === 'DERIVE' || rule.priority === 50 ? 'DERIVED' : 'RESOLVED'); break;
    case 'COPY_FIELD_VALUE': {
      const source = state.fields[effect.source_field];
      if (source?.value !== null && source?.value !== undefined) setResolved(state, effect.field, source.value, rule, 'DERIVED');
      break;
    }
    case 'SET_STATE':
      target.state = effect.state;
      if (effect.state === 'NOT_APPLICABLE' || effect.state === 'HIDDEN') target.value = null;
      if (effect.state === 'NOT_APPLICABLE') target.visibility = 'HIDE';
      break;
    case 'REQUIRE_FIELD': target.required = true; break;
    case 'HIDE_FIELD': target.visibility = 'HIDE'; if (target.value === null && target.state === 'UNSET') target.state = 'NOT_APPLICABLE'; break;
    case 'SHOW_FIELD': target.visibility = 'SHOW'; if (target.state === 'NOT_APPLICABLE' && target.value === null) target.state = 'UNSET'; break;
    case 'ADD_COMPONENT_SET': {
      const set = master.component_sets.component_sets.find((x) => x.component_set_id === effect.component_set_id);
      if (!set) { const err = new Error(`Missing component set ${effect.component_set_id}`); err.code = 'RUNTIME_COMPONENT_RESOLUTION_ERROR'; throw err; }
      for (const component of set.components) state.derived_components.add(component);
      break;
    }
    case 'ADD_COMPONENT': state.derived_components.add(effect.component); break;
    case 'REMOVE_COMPONENT': state.derived_components.delete(effect.component); break;
    case 'ADD_WARNING': state.warnings.push({ rule_id: rule.rule_id, message: effect.message ?? '' }); break;
    default: { const err = new Error(`Unsupported effect action: ${effect.action}`); err.code = 'RUNTIME_RULE_EVALUATION_ERROR'; throw err; }
  }
}

export function evaluateRules(master, rules, state) {
  for (const rule of [...rules].sort((a, b) => b.priority - a.priority || a.rule_id.localeCompare(b.rule_id))) {
    if (!evaluateCondition(rule.conditions, state)) continue;
    for (const effect of rule.effects) applyEffect(master, rule, effect, state);
  }
}

export function applyInvalidRules(master, state) {
  for (const rule of master.invalid_rules) if (evaluateCondition(rule.conditions, state)) state.matched_invalid_rules.push(rule.rule_id);
}
