export const present = (value) => value !== null && value !== undefined && value !== '';
const unique = (values) => [...new Set(values.filter((value) => present(value) && value !== '—'))];

export function fail(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, details);
  throw error;
}
function uiField(master, runtimeField) { return master.aliasRuntimeToUi.get(runtimeField) ?? runtimeField; }
function runtimeValue(master, state, runtimeField) { return state.fields[uiField(master, runtimeField)]?.value; }
function conditionMatches(master, state, condition) {
  if (!condition || typeof condition !== 'object') return false;
  if (Array.isArray(condition.all)) return condition.all.every((part) => conditionMatches(master, state, part));
  if (Array.isArray(condition.any)) return condition.any.some((part) => conditionMatches(master, state, part));
  if (!condition.field) return false;
  const value = runtimeValue(master, state, condition.field);
  if ('present' in condition) return condition.present ? present(value) : !present(value);
  if ('eq' in condition) return Object.is(value, condition.eq);
  if ('ne' in condition) return !Object.is(value, condition.ne);
  if (Array.isArray(condition.in)) return condition.in.some((candidate) => Object.is(candidate, value));
  if ('gte' in condition) return Number.isFinite(Number(value)) && Number(value) >= Number(condition.gte);
  if ('lte' in condition) return Number.isFinite(Number(value)) && Number(value) <= Number(condition.lte);
  if ('gt' in condition) return Number.isFinite(Number(value)) && Number(value) > Number(condition.gt);
  if ('lt' in condition) return Number.isFinite(Number(value)) && Number(value) < Number(condition.lt);
  fail('SEMANTIC_BUNDLE_CONDITION_UNSUPPORTED', 'Unsupported Runtime condition.', { condition });
}
export function fieldState(value = null) {
  return { value, state: present(value) ? 'SELECTED' : 'UNSET', visibility: 'SHOW', required: false, allowed_values: [], resolved_by_rule: null, derived_by_rule: null };
}
function setAllowed(state, field, values) {
  const target = state.fields[field]; if (!target) return;
  target.allowed_values = unique(values);
  if (target.allowed_values.length) {
    target.visibility = 'SHOW';
    if (target.state === 'NOT_APPLICABLE') target.state = present(target.value) ? 'SELECTED' : 'UNSET';
  }
}
function activate(target) { target.visibility = 'SHOW'; if (target.state === 'NOT_APPLICABLE') target.state = present(target.value) ? 'SELECTED' : 'UNSET'; }
function applyAction(master, state, action, rule) {
  if (action.field_group || action.type === 'APPLY_TABLE') return;
  const field = uiField(master, action.field);
  const target = state.fields[field];
  if (!target) fail('SEMANTIC_BUNDLE_RULE_FIELD_UNKNOWN', `Runtime rule ${rule.rule_id} references unknown field: ${field}`, { action, rule });
  switch (action.type) {
    case 'HIDE_FIELD': target.visibility = 'HIDE'; target.state = 'NOT_APPLICABLE'; return;
    case 'SHOW_FIELD': activate(target); return;
    case 'REQUIRE_FIELD': activate(target); target.required = true; return;
    case 'ALLOW_VALUES': activate(target); target.allowed_values = target.allowed_values.length ? target.allowed_values.filter((value) => (action.values ?? []).some((candidate) => Object.is(candidate, value))) : unique(action.values ?? []); return;
    case 'DENY_VALUES': target.allowed_values = target.allowed_values.filter((value) => !(action.values ?? []).some((candidate) => Object.is(candidate, value))); return;
    case 'FORCE_VALUE':
      if (action.value === 'NOT_APPLICABLE') { target.value = null; target.state = 'NOT_APPLICABLE'; target.visibility = 'HIDE'; return; }
      activate(target); target.value = action.value; target.allowed_values = [action.value]; target.state = 'RESOLVED'; target.resolved_by_rule = rule.rule_id; return;
    case 'DERIVE_VALUE': activate(target); target.value = action.value; target.allowed_values = [action.value]; target.state = 'RESOLVED'; target.derived_by_rule = rule.rule_id; return;
    case 'MANUAL_CHECK': state.manual_checks.push({ id: rule.rule_id, reason: action.reason ?? 'Runtime requires manual confirmation.', source: rule.source ?? null }); return;
    case 'BLOCK': state.errors.push({ code: rule.rule_id, field, message: action.reason ?? 'Runtime rule blocked this configuration.' }); return;
    default: fail('SEMANTIC_BUNDLE_ACTION_UNSUPPORTED', `Unsupported Runtime action: ${action.type}`, { action, rule });
  }
}
export function applyRules(master, state) {
  for (const rule of master.document.semantic_contract.normalized_dependency_rules ?? []) {
    const actions = conditionMatches(master, state, rule.condition) ? (rule.actions ?? []) : (rule.else_actions ?? []);
    for (const action of actions) applyAction(master, state, action, rule);
  }
}
function windowApplicable(row, windowType) {
  if (!windowType) return true;
  const token = row[windowType];
  if (token === undefined || token === null || token === '') return true;
  if (token === '可') return true;
  if (token === '不可') return false;
  fail('SEMANTIC_BUNDLE_APPLICABILITY_TOKEN_UNSUPPORTED', `Unsupported applicability token: ${token}`, { token, windowType });
}
export function exactGlass(master, state) {
  const id = state.fields.glass_detail?.value;
  if (!id) return;
  const row = master.glassById.get(id);
  if (!row) { state.errors.push({ code: 'GLASS_CONFIG_ID_UNKNOWN', field: 'glass_detail', message: `Unknown glass_config_id: ${id}` }); return; }
  for (const [field, column] of [['glass_family','大分類'],['glass_type','詳細'],['lowe_color','Low-E色'],['cavity_fill','中空層'],['supply_form','供給形態']]) {
    const value = row[column], target = state.fields[field];
    if (!target || !present(value) || value === '—') continue;
    target.value = value; target.state = 'RESOLVED'; target.resolved_by_rule = 'GLASS_CONFIG_ID_JOIN';
  }
}
export function populateCandidates(master, state) {
  const selectedWindow = state.fields.window_type?.value;
  const windows = master.windowTypes.filter((row) => row['状態'] === 'VERIFIED');
  setAllowed(state, 'window_type', windows.map((row) => row['窓種']));
  if (selectedWindow) {
    setAllowed(state, 'sash_configuration', windows.filter((row) => row['窓種'] === selectedWindow).map((row) => row['障子構成']));
  } else if (state.fields.sash_configuration) { state.fields.sash_configuration.allowed_values = []; state.fields.sash_configuration.visibility = 'HIDE'; }

  const sash = state.fields.sash_configuration?.value;
  const selectorRows = selectedWindow ? master.fabricationSelector.filter((row) =>
    (row.window_type === selectedWindow || !present(row.window_type)) &&
    (!present(row.sash_configuration) || !present(sash) || row.sash_configuration === sash)
  ) : [];
  if (selectorRows.length && (present(sash) || !state.fields.sash_configuration?.allowed_values.length)) setAllowed(state, 'size_class', selectorRows.map((row) => row.size_class));
  else if (state.fields.size_class) { state.fields.size_class.allowed_values = []; state.fields.size_class.visibility = 'HIDE'; }
  const sizeClass = state.fields.size_class?.value;
  const upperRows = selectorRows.filter((row) => !present(sizeClass) || !present(row.size_class) || row.size_class === sizeClass);
  if (upperRows.length && (present(sizeClass) || !state.fields.size_class?.allowed_values.length)) setAllowed(state, 'upper_frame_spec', upperRows.map((row) => row.upper_frame_spec));
  else if (state.fields.upper_frame_spec) { state.fields.upper_frame_spec.allowed_values = []; state.fields.upper_frame_spec.visibility = 'HIDE'; }

  setAllowed(state, 'body_color', master.bodyColors.filter((row) => row['状態'] === 'VERIFIED').map((row) => row.color_id));

  let configs = master.glassConfigurations.filter((row) => row['状態'] === 'VERIFIED' && windowApplicable(row, selectedWindow));
  setAllowed(state, 'glass_family', configs.map((row) => row['大分類']));
  const family = state.fields.glass_family?.value;
  if (family) configs = configs.filter((row) => row['大分類'] === family);
  if (family) setAllowed(state, 'glass_type', configs.map((row) => row['詳細']));
  else if (state.fields.glass_type) { state.fields.glass_type.allowed_values = []; state.fields.glass_type.visibility = 'HIDE'; }
  const glassType = state.fields.glass_type?.value;
  if (glassType) configs = configs.filter((row) => row['詳細'] === glassType);
  if (family && glassType) {
    setAllowed(state, 'lowe_color', configs.map((row) => row['Low-E色']));
    setAllowed(state, 'cavity_fill', configs.map((row) => row['中空層']));
    setAllowed(state, 'supply_form', configs.map((row) => row['供給形態']));
  } else {
    for (const field of ['lowe_color','cavity_fill','supply_form']) if (state.fields[field]) { state.fields[field].allowed_values = []; state.fields[field].visibility = 'HIDE'; }
  }
  const lowe = state.fields.lowe_color?.value; if (lowe) configs = configs.filter((row) => row['Low-E色'] === lowe);
  const cavity = state.fields.cavity_fill?.value; if (cavity) configs = configs.filter((row) => row['中空層'] === cavity);
  const supply = state.fields.supply_form?.value; if (supply) configs = configs.filter((row) => row['供給形態'] === supply);
  if (family && glassType) setAllowed(state, 'glass_detail', configs.map((row) => row.glass_config_id));
  else if (state.fields.glass_detail) { state.fields.glass_detail.allowed_values = []; state.fields.glass_detail.visibility = 'HIDE'; }

  for (const field of ['lowe_color','cavity_fill','supply_form']) {
    const target = state.fields[field];
    if (!target) continue;
    if (target.allowed_values.length === 1 && !present(target.value)) {
      target.value = target.allowed_values[0]; target.state = 'RESOLVED'; target.resolved_by_rule = 'EXPLICIT_GLASS_CONFIG_SINGLETON'; target.visibility = 'HIDE';
    }
  }
  if (selectedWindow) {
    setAllowed(state, 'frame_install_spec', master.frameInstallation.filter((row) => row['状態'] === 'VERIFIED').map((row) => row.frame_id));
    setAllowed(state, 'option_items', master.options.filter((row) => row['状態'] === 'VERIFIED').map((row) => row.option_id));
  } else {
    for (const field of ['frame_install_spec','option_items']) if (state.fields[field]) { state.fields[field].allowed_values = []; state.fields[field].visibility = 'HIDE'; }
  }
}
export function manual(master, state, id, fallback, source = null) {
  if (state.manual_checks.some((row) => row.id === id)) return;
  const known = master.manualChecks.get(id);
  state.manual_checks.push({ id, reason: known?.reason ?? fallback ?? 'Runtime requires manual confirmation.', source: known?.source ?? source });
}
function resolveItemJoin(master, field, value, windowType, state, seen = new Set()) {
  const key = `${field}:${value}`; if (seen.has(key)) return { status: 'MANUAL_CHECK', reason: 'Installability DELEGATE cycle.' }; seen.add(key);
  const rows = master.installabilityIdJoin.filter((row) => row.selection_field === field && row.canonical_id_or_value === value && (!row.context_window_type || row.context_window_type === windowType));
  if (rows.length !== 1) return { status: 'MANUAL_CHECK', reason: 'ID joinを一意に解決できません。' };
  const row = rows[0];
  if (row.evaluation_policy === 'MANUAL_CHECK') return { status: 'MANUAL_CHECK', reason: row.basis };
  if (row.evaluation_policy === 'NOT_APPLICABLE') return { status: 'NOT_APPLICABLE' };
  if (row.evaluation_policy === 'DELEGATE') {
    const delegatedField = String(row.matrix_key ?? '').startsWith('DELEGATE:') ? String(row.matrix_key).slice(9) : null;
    const delegatedValue = delegatedField ? state.fields[delegatedField]?.value : null;
    if (!delegatedField || !delegatedValue) return { status: 'PENDING' };
    return resolveItemJoin(master, delegatedField, delegatedValue, windowType, state, seen);
  }
  if (row.evaluation_policy !== 'AUTO') return { status: 'MANUAL_CHECK', reason: `Unsupported evaluation_policy ${row.evaluation_policy}` };
  return { status: 'AUTO', matrixKey: row.matrix_key };
}
function installabilityContext(master, state) {
  const windowType = state.fields.window_type?.value, family = state.fields.glass_family?.value;
  if (!windowType || !family) return null;
  const scopes = master.installabilityScopeJoin.filter((row) => row.window_type === windowType && (row.glass_family === family || row.glass_family === '*'));
  if (scopes.length !== 1 || scopes[0].evaluation_policy !== 'AUTO') return null;
  const matrix = master.installabilityMatrix.find((row) => row['対象'] === scopes[0].matrix_scope_key);
  return matrix ? { windowType, matrix } : null;
}
function cellStatus(cell) {
  if (cell === null || cell === undefined || cell === '' || cell === '-') return 'MANUAL_CHECK';
  const token = String(cell).trim();
  if (token.startsWith('×')) return 'DENY';
  if (token.startsWith('△') || /注\d+/.test(token)) return 'MANUAL_CHECK';
  if (token.startsWith('○')) return 'ALLOW';
  return 'MANUAL_CHECK';
}
export function filterInstallability(master, state) {
  const context = installabilityContext(master, state); if (!context) return;
  for (const field of ['frame_install_spec','option_items']) {
    const target = state.fields[field]; if (!target?.allowed_values.length) continue;
    target.allowed_values = target.allowed_values.filter((value) => {
      const join = resolveItemJoin(master, field, value, context.windowType, state);
      if (join.status === 'NOT_APPLICABLE') return false;
      if (join.status !== 'AUTO') return true;
      return cellStatus(context.matrix[join.matrixKey]) !== 'DENY';
    });
  }
}
export function evaluateInstallability(master, state) {
  const context = installabilityContext(master, state); if (!context) return;
  const selected = [];
  if (present(state.fields.frame_install_spec?.value)) selected.push(['frame_install_spec', state.fields.frame_install_spec.value]);
  const options = state.fields.option_items?.value;
  for (const value of Array.isArray(options) ? options : (present(options) ? [options] : [])) selected.push(['option_items', value]);
  for (const [field, value] of selected) {
    const join = resolveItemJoin(master, field, value, context.windowType, state);
    if (join.status === 'MANUAL_CHECK') { manual(master, state, value, join.reason, 'installability_id_join'); continue; }
    if (join.status !== 'AUTO') continue;
    const status = cellStatus(context.matrix[join.matrixKey]);
    if (status === 'DENY') state.errors.push({ code: 'INSTALLABILITY_DENIED', field, message: `${value}: Runtime installability matrixで成立不可です。` });
    else if (status === 'MANUAL_CHECK') manual(master, state, value, `Installability matrix ${context.matrix[join.matrixKey]}: 条件確認が必要です。`, 'option_installability_matrix');
  }
}
