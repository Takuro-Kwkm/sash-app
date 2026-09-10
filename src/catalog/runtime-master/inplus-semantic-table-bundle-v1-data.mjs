const NA = new Set([null, undefined, '', '—', '-', '非適用', 'NOT_APPLICABLE', 'N/A']);

const has = (value) => value !== null && value !== undefined && value !== '';
const same = (a, b) => Object.is(a, b) || String(a) === String(b);
const unique = (values) => [...new Map(values.filter((value) => !NA.has(value)).map((value) => [JSON.stringify(value), value])).values()];
const table = (runtime, name) => runtime?.tables?.[name]?.records ?? [];

function fail(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, details);
  throw error;
}

function runtimeDocument(runtimePackage) {
  return runtimePackage?.documents?.RUNTIME_JSON_PACKAGE
    ?? Object.values(runtimePackage?.documents ?? {}).find((value) => value?.runtime_contract === 'MANIFEST_DECLARED_SEMANTIC_TABLE_BUNDLE')
    ?? null;
}

function orderIndex(runtime, fieldId, fallback) {
  const order = runtime?.semantic_contract?.field_order ?? [];
  const index = order.indexOf(fieldId);
  return index >= 0 ? (index + 1) * 10 : fallback;
}

function valueRow(fieldName, canonicalValue, displayLabel = canonicalValue, extra = {}) {
  return {
    field_name: fieldName,
    canonical_value: canonicalValue,
    status: 'CURRENT',
    display_label: String(displayLabel ?? canonicalValue),
    user_selectable: true,
    runtime_selectable: true,
    ...extra,
  };
}

function normalizedRules(runtime) {
  return runtime?.semantic_contract?.normalized_dependency_rules ?? [];
}

function ruleValues(runtime, fieldName) {
  const values = [];
  for (const rule of normalizedRules(runtime)) {
    for (const action of [...(rule.actions ?? []), ...(rule.else_actions ?? [])]) {
      if (action.field !== fieldName) continue;
      if (Array.isArray(action.values)) values.push(...action.values);
      if (has(action.value) && action.value !== 'NOT_APPLICABLE') values.push(action.value);
    }
  }
  return unique(values);
}

function parentFieldsFor(runtime, fieldName) {
  const parents = new Set();
  const visit = (condition) => {
    if (!condition || typeof condition !== 'object') return;
    if (condition.field && condition.field !== fieldName) parents.add(condition.field);
    for (const part of condition.all ?? []) visit(part);
    for (const part of condition.any ?? []) visit(part);
  };
  for (const rule of normalizedRules(runtime)) {
    const touches = [...(rule.actions ?? []), ...(rule.else_actions ?? [])].some((action) =>
      action.field === fieldName || action.field_group === fieldName
    );
    if (touches) visit(rule.condition);
  }
  if (fieldName === 'sash_configuration') parents.add('window_type');
  if (fieldName === 'size_class') { parents.add('window_type'); parents.add('sash_configuration'); }
  if (fieldName === 'upper_frame_spec') { parents.add('window_type'); parents.add('sash_configuration'); parents.add('size_class'); }
  if (['glass_type','lowe_color','cavity_fill','supply_form','glass_detail','decorative_pattern'].includes(fieldName)) {
    parents.add('window_type');
    if (fieldName !== 'glass_type') parents.add('glass_family');
  }
  return [...parents];
}

function fieldDefinitions(runtime) {
  return table(runtime, 'field_structure').map((row, index) => {
    const field = row.field_id;
    const fixedIdentity = ['manufacturer','series','product_category'].includes(field);
    const hidden = fixedIdentity || field === 'evidence' || row.UI === '非表示';
    const dataType = ['order_width','order_height','crescent_position'].includes(field)
      ? 'number'
      : field === 'option_items' ? 'array' : 'enum';
    return {
      field_name: field,
      domain: row['分類'] ?? 'RUNTIME',
      data_type: dataType,
      selection_mode: fixedIdentity ? 'FIXED' : row.UI === '表示' ? 'USER_SELECTABLE' : 'CONDITIONAL_SELECTABLE',
      required_mode: row.UI === '表示' && !hidden ? 'REQUIRED' : 'OPTIONAL',
      visibility_mode: hidden ? 'HIDDEN' : row.UI === '表示' ? 'VISIBLE' : 'CONDITIONAL',
      default_value: field === 'manufacturer' ? runtime.manufacturer
        : field === 'series' ? runtime.series
        : field === 'product_category' ? runtime.scope?.product_category ?? null
        : null,
      display_label: row['表示名'] ?? field,
      display_order: orderIndex(runtime, field, (index + 1) * 10),
      unit: ['order_width','order_height','crescent_position'].includes(field) ? 'mm' : null,
      runtime_included: field !== 'evidence',
      show_read_only: false,
      parent_fields: parentFieldsFor(runtime, field),
    };
  });
}

function buildValues(runtime) {
  const out = [];
  const pushUnique = (row) => {
    if (!has(row.canonical_value)) return;
    const key = `${row.field_name}\u0000${JSON.stringify(row.canonical_value)}`;
    if (!out.some((item) => `${item.field_name}\u0000${JSON.stringify(item.canonical_value)}` === key)) out.push(row);
  };

  for (const value of unique(table(runtime, 'window_types').map((row) => row['窓種']))) pushUnique(valueRow('window_type', value, value));
  for (const value of unique(table(runtime, 'window_types').map((row) => row['障子構成']))) pushUnique(valueRow('sash_configuration', value, value));
  for (const value of unique(table(runtime, 'fabrication_selector_join').map((row) => row.size_class).flatMap((value) =>
    value === '窓/テラス' ? [] : [value]
  ))) pushUnique(valueRow('size_class', value, value));
  for (const field of ['reverse_handing','hinge_side','sash_midrail']) {
    for (const value of ruleValues(runtime, field)) pushUnique(valueRow(field, value, value));
  }
  for (const value of unique(table(runtime, 'fabrication_selector_join').map((row) => row.upper_frame_spec))) pushUnique(valueRow('upper_frame_spec', value, value));
  for (const row of table(runtime, 'frame_installation')) {
    const id = row.frame_id;
    const label = row['仕様名'];
    const category = String(row['分類'] ?? '');
    if (!has(id) || row['状態'] !== 'VERIFIED') continue;
    if (/ふかし枠/.test(category) || id === 'FR-CORNER') pushUnique(valueRow('fukashi_spec', id, label));
    else if (id !== 'FR-JOINT' && id !== 'FR-AUX') pushUnique(valueRow('frame_install_spec', id, label));
  }
  for (const row of table(runtime, 'installability_id_join').filter((row) => row.selection_field === 'joint_layout')) {
    pushUnique(valueRow('joint_layout', row.canonical_id_or_value, row.canonical_id_or_value, { manual_check: row.evaluation_policy === 'MANUAL_CHECK' }));
  }
  for (const row of table(runtime, 'body_colors')) {
    if (row['状態'] === 'VERIFIED' && row['UI表示'] === '表示') pushUnique(valueRow('body_color', row.color_id, row['本体色']));
  }
  for (const value of unique(table(runtime, 'glass_configurations').filter((row) => row['状態'] === 'VERIFIED').map((row) => row['大分類']))) pushUnique(valueRow('glass_family', value, value));
  for (const value of unique(table(runtime, 'glass_configurations').filter((row) => row['状態'] === 'VERIFIED').map((row) => row['商品名称']))) pushUnique(valueRow('glass_type', value, value));
  for (const value of unique(table(runtime, 'glass_configurations').filter((row) => row['状態'] === 'VERIFIED').map((row) => row['Low-E色']))) pushUnique(valueRow('lowe_color', value, value));
  for (const value of unique(table(runtime, 'glass_configurations').filter((row) => row['状態'] === 'VERIFIED').map((row) => row['中空層']))) pushUnique(valueRow('cavity_fill', value, value));
  for (const value of ruleValues(runtime, 'supply_form')) pushUnique(valueRow('supply_form', value, value));
  for (const row of table(runtime, 'glass_configurations')) {
    if (row['状態'] !== 'VERIFIED') continue;
    const label = [row['詳細'], row['公式構成表記']].filter((value) => !NA.has(value)).join(' / ');
    pushUnique(valueRow('glass_detail', row.glass_config_id, label || row.glass_config_id));
  }
  for (const value of ruleValues(runtime, 'decorative_pattern')) pushUnique(valueRow('decorative_pattern', value, value));
  for (const row of table(runtime, 'options')) {
    if (row['状態'] === 'VERIFIED' && row['通常UI'] === '条件表示') {
      const join = table(runtime, 'installability_id_join').find((link) => link.selection_field === 'option_items' && link.canonical_id_or_value === row.option_id);
      pushUnique(valueRow('option_items', row.option_id, row['オプション名'], { manual_check: join?.evaluation_policy === 'MANUAL_CHECK' }));
    }
  }
  return out;
}

function conditionMatches(condition, selection) {
  if (!condition || typeof condition !== 'object') return false;
  if (condition.all) return condition.all.every((part) => conditionMatches(part, selection));
  if (condition.any) return condition.any.some((part) => conditionMatches(part, selection));
  const value = selection[condition.field];
  if ('eq' in condition) return same(value, condition.eq);
  if ('ne' in condition) return has(value) && !same(value, condition.ne);
  if ('in' in condition) return (condition.in ?? []).some((candidate) => same(value, candidate));
  if ('gte' in condition) return Number.isFinite(Number(value)) && Number(value) >= Number(condition.gte);
  if ('lte' in condition) return Number.isFinite(Number(value)) && Number(value) <= Number(condition.lte);
  if (condition.present === true) return has(value);
  if (condition.present === false) return !has(value);
  return false;
}

function canonicalRuleSelection(selection) {
  return { ...selection, body_color_id: selection.body_color, glass_config_id: selection.glass_detail, frame_id: selection.frame_install_spec, option_id: selection.option_items };
}

function windowCandidates(runtime, selection) {
  let candidates = table(runtime, 'window_types').filter((row) => row['状態'] === 'VERIFIED');
  const out = {};
  out.window_type = unique(candidates.map((row) => row['窓種']));
  if (has(selection.window_type)) candidates = candidates.filter((row) => same(row['窓種'], selection.window_type));
  out.sash_configuration = unique(candidates.map((row) => row['障子構成']));
  if (has(selection.sash_configuration)) candidates = candidates.filter((row) => same(row['障子構成'], selection.sash_configuration));
  if (selection.window_type === '引違い窓') {
    out.size_class = unique(table(runtime, 'fabrication_selector_join').filter((row) => same(row.window_type, selection.window_type)
      && (!has(selection.sash_configuration) || same(row.sash_configuration, selection.sash_configuration)) && row.size_class !== '窓/テラス').map((row) => row.size_class));
  } else out.size_class = [];
  return out;
}

function glassCandidates(runtime, selection) {
  const window = selection.window_type;
  let candidates = table(runtime, 'glass_configurations').filter((row) => row['状態'] === 'VERIFIED');
  if (has(window)) candidates = candidates.filter((row) => row[window] === '可');
  const deniedIds = new Set();
  const canonical = canonicalRuleSelection(selection);
  for (const rule of normalizedRules(runtime).filter((row) => row.state === 'VERIFIED')) {
    const matched = conditionMatches(rule.condition, canonical);
    if (matched) for (const action of rule.actions ?? []) if (action.type === 'DENY_VALUES' && action.field === 'glass_config_id') for (const id of action.values ?? []) deniedIds.add(id);
    if (rule.symmetric_filter === true) {
      const colorDeny = (rule.actions ?? []).find((action) => action.type === 'DENY_VALUES' && action.field === 'body_color_id');
      const glassIds = rule.condition?.field === 'glass_config_id' ? rule.condition?.in ?? [] : [];
      if (colorDeny && (colorDeny.values ?? []).some((value) => same(value, selection.body_color))) for (const id of glassIds) deniedIds.add(id);
    }
  }
  candidates = candidates.filter((row) => !deniedIds.has(row.glass_config_id));
  if (has(selection.glass_family)) candidates = candidates.filter((row) => same(row['大分類'], selection.glass_family));
  if (has(selection.glass_type)) candidates = candidates.filter((row) => same(row['商品名称'], selection.glass_type));
  if (has(selection.lowe_color)) candidates = candidates.filter((row) => same(row['Low-E色'], selection.lowe_color));
  if (has(selection.cavity_fill)) candidates = candidates.filter((row) => same(row['中空層'], selection.cavity_fill));
  if (has(selection.glass_detail)) candidates = candidates.filter((row) => same(row.glass_config_id, selection.glass_detail));
  return candidates;
}

function displayRowsForGlass(runtime, candidates, field) {
  if (field === 'glass_family') return unique(candidates.map((row) => row['大分類']));
  if (field === 'glass_type') return unique(candidates.map((row) => row['商品名称']));
  if (field === 'lowe_color') return unique(candidates.map((row) => row['Low-E色']));
  if (field === 'cavity_fill') return unique(candidates.map((row) => row['中空層']));
  if (field === 'glass_detail') return unique(candidates.map((row) => row.glass_config_id));
  return [];
}

function exactSupplyFormForConfig(runtime, configId) {
  if (!has(configId)) return null;
  const joins = table(runtime, 'glass_config_family_join').filter((row) => row.glass_config_id === configId);
  if (!joins.length) return null;
  const familyIds = new Set(joins.map((row) => row.limit_family_id));
  const supply = unique(table(runtime, 'glass_limit_family_join').filter((row) => familyIds.has(row.limit_family_id)).map((row) => row.supply_form));
  const normalized = [];
  for (const value of supply) {
    const text = String(value);
    if (text.includes('完成')) normalized.push('ガラス入り完成品');
    if (text.includes('ND')) normalized.push('ノックダウン品');
  }
  return unique(normalized);
}

export { NA, has, same, unique, table, fail, runtimeDocument, normalizedRules, ruleValues, fieldDefinitions, buildValues, conditionMatches, canonicalRuleSelection, windowCandidates, glassCandidates, displayRowsForGlass, exactSupplyFormForConfig };
