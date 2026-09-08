const present = (value) => value !== null && value !== undefined && value !== '' && value !== '—';
const unique = (values) => [...new Set(values.filter(present))];

function fail(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, details);
  throw error;
}
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}
function rows(document, name) {
  const value = document?.tables?.[name]?.records;
  if (!Array.isArray(value)) fail('SEMANTIC_BUNDLE_TABLE_MISSING', `Runtime table missing: ${name}`, { name });
  return value;
}
function addValue(out, seen, field, value, label = value, extra = {}) {
  if (!present(value)) return;
  const key = `${field}::${JSON.stringify(value)}`;
  if (seen.has(key)) return;
  seen.add(key);
  out.push({ field_name: field, canonical_value: value, display_label: String(label), status: 'CURRENT', runtime_selectable: true, user_selectable: true, ...extra });
}
function valuesFor(document, aliasRuntimeToUi) {
  const out = [], seen = new Set();
  for (const row of rows(document, 'window_types')) {
    if (row['状態'] !== 'VERIFIED') continue;
    addValue(out, seen, 'window_type', row['窓種']);
    addValue(out, seen, 'sash_configuration', row['障子構成']);
  }
  for (const row of rows(document, 'fabrication_selector_join')) {
    addValue(out, seen, 'size_class', row.size_class, row.size_class, { manual_check: row.evaluation_policy === 'MANUAL_CHECK' });
    addValue(out, seen, 'upper_frame_spec', row.upper_frame_spec);
    addValue(out, seen, 'joint_layout', row.joint_layout);
  }
  for (const row of rows(document, 'body_colors')) if (row['状態'] === 'VERIFIED') addValue(out, seen, 'body_color', row.color_id, row['本体色']);
  for (const row of rows(document, 'frame_installation')) if (row['状態'] === 'VERIFIED') addValue(out, seen, 'frame_install_spec', row.frame_id, row['仕様名']);
  for (const row of rows(document, 'options')) if (row['状態'] === 'VERIFIED') addValue(out, seen, 'option_items', row.option_id, row['オプション名']);
  for (const row of rows(document, 'glass_configurations')) {
    if (row['状態'] !== 'VERIFIED') continue;
    addValue(out, seen, 'glass_family', row['大分類']);
    addValue(out, seen, 'glass_type', row['詳細']);
    addValue(out, seen, 'lowe_color', row['Low-E色']);
    addValue(out, seen, 'cavity_fill', row['中空層']);
    addValue(out, seen, 'supply_form', row['供給形態']);
    addValue(out, seen, 'glass_detail', row.glass_config_id, `${row['商品名称']} / ${row['詳細']} / ${row['公式構成表記']}`);
  }
  for (const rule of document.semantic_contract?.normalized_dependency_rules ?? []) {
    for (const action of [...(rule.actions ?? []), ...(rule.else_actions ?? [])]) {
      if (!action.field) continue;
      const field = aliasRuntimeToUi.get(action.field) ?? action.field;
      for (const value of action.values ?? []) addValue(out, seen, field, value);
      if (present(action.value) && action.value !== 'NOT_APPLICABLE') addValue(out, seen, field, action.value);
    }
  }
  return out;
}
function fieldDefinitions(document, aliasRows) {
  const contract = document.semantic_contract;
  const meta = new Map(rows(document, 'field_structure').map((row) => [row.field_id, row]));
  const order = [...(contract.field_order ?? [])];
  for (const alias of aliasRows) if (alias.ui_field_id && !order.includes(alias.ui_field_id)) order.push(alias.ui_field_id);
  const fixed = contract.fixed_identity ?? {};
  return order.map((field, index) => {
    const row = meta.get(field);
    const ui = String(row?.UI ?? '条件表示');
    return {
      field_name: field,
      display_label: row?.['表示名'] ?? (field === 'spacer' ? 'スペーサー' : field),
      display_order: Number(row?.['順序'] ?? index + 1),
      data_type: ['order_width','order_height'].includes(field) ? 'number' : field === 'option_items' ? 'array' : 'enum',
      selection_mode: Object.prototype.hasOwnProperty.call(fixed, field) ? 'FIXED' : 'SELECTABLE',
      runtime_included: field !== 'evidence',
      parent_fields: [],
      initial_visibility: Object.prototype.hasOwnProperty.call(fixed, field) || ui.includes('非表示') || ui.includes('条件') || !row ? 'HIDE' : 'SHOW',
    };
  });
}

export function adaptSemanticTableBundleV2(runtimePackage) {
  const document = runtimePackage?.documents?.RUNTIME_JSON_PACKAGE;
  if (!document) fail('SEMANTIC_BUNDLE_RUNTIME_ROLE_MISSING', 'RUNTIME_JSON_PACKAGE is required.');
  if (document.runtime_contract !== 'MANIFEST_DECLARED_SEMANTIC_TABLE_BUNDLE') fail('SEMANTIC_BUNDLE_CONTRACT_UNSUPPORTED', `Unsupported runtime_contract: ${document.runtime_contract}`);
  const contract = document.semantic_contract;
  if (!contract || contract.evaluator_model !== 'DECLARATIVE_FAIL_CLOSED') fail('SEMANTIC_BUNDLE_CONTRACT_INVALID', 'DECLARATIVE_FAIL_CLOSED semantic_contract is required.');
  if (contract.machine_join_contract?.app_side_text_join_allowed !== false) fail('SEMANTIC_BUNDLE_TEXT_JOIN_POLICY_INVALID', 'App-side text join must be prohibited by Runtime contract.');
  for (const name of [
    contract.machine_join_contract.field_alias_table,
    contract.dimension_validation.selector_join_table,
    contract.dimension_validation.base_table,
    contract.dimension_validation.glass_config_family_table,
    contract.dimension_validation.glass_limit_family_table,
    contract.dimension_validation.glass_override_table,
    contract.installation_validation.scope_join_table,
    contract.installation_validation.id_join_table,
    ...contract.installation_validation.tables,
  ]) rows(document, name);
  const aliasRows = rows(document, contract.field_aliases.table);
  const aliasRuntimeToUi = new Map(aliasRows.map((row) => [row.runtime_rule_field_id, row.ui_field_id]));
  const table = (name) => rows(document, name);
  const master = {
    runtimeContract: document.runtime_contract,
    document,
    aliasRuntimeToUi,
    fields: fieldDefinitions(document, aliasRows),
    windowTypes: table('window_types'),
    bodyColors: table('body_colors'),
    glassConfigurations: table('glass_configurations'),
    glassById: new Map(table('glass_configurations').map((row) => [row.glass_config_id, row])),
    frameInstallation: table('frame_installation'),
    options: table('options'),
    fabricationSelector: table(contract.dimension_validation.selector_join_table),
    baseRangeById: new Map(table(contract.dimension_validation.base_table).map((row) => [row.range_id, row])),
    glassConfigFamilyById: new Map(table(contract.dimension_validation.glass_config_family_table).map((row) => [row.glass_config_id, row])),
    glassLimitFamily: table(contract.dimension_validation.glass_limit_family_table),
    glassLimitById: new Map(table(contract.dimension_validation.glass_override_table).map((row) => [`${row.base_range_id}::${row.limit_id}`, row])),
    installabilityScopeJoin: table(contract.installation_validation.scope_join_table),
    installabilityIdJoin: table(contract.installation_validation.id_join_table),
    installabilityMatrix: table('option_installability_matrix'),
    manualChecks: new Map((contract.manual_check_registry ?? []).map((row) => [row.id, row])),
    capabilities: {
      runtimeContract: document.runtime_contract,
      semanticContractVersion: contract.contract_version,
      machineJoinContractVersion: contract.machine_join_contract?.version ?? null,
      textJoinAllowed: contract.machine_join_contract?.app_side_text_join_allowed,
      dimensionValidation: contract.dimension_validation,
      installationValidation: contract.installation_validation,
      knownManualCheckIds: (contract.manual_check_registry ?? []).map((row) => row.id),
      uiSemanticSupport: {
        spacer: { field: aliasRows.some((row) => row.ui_field_id === 'spacer') ? 'spacer' : null, source: contract.field_aliases.table },
        customSize: {
          dimensionFields: ['order_width','order_height'].filter((field) => (contract.field_order ?? []).includes(field)),
          modeField: (contract.field_order ?? []).includes('size_mode') ? 'size_mode' : null,
          standardRecordSource: null,
        },
      },
    },
  };
  master.values = valuesFor(document, aliasRuntimeToUi);
  return deepFreeze(master);
}
