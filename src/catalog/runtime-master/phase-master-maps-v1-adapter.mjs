import { orderDoorRuntimeFields } from './door-runtime-ui-contract.mjs';

const FLOW_SPECS = Object.freeze({
  design: { label: 'デザイン', dataType: 'enum', idField: 'design_id', parentFields: [], selectionMode: 'USER_SELECTABLE' },
  configuration: { label: '開き形式', dataType: 'enum', idField: 'door_configuration_id', parentFields: ['thermal_spec'], selectionMode: 'USER_SELECTABLE' },
  thermal_spec: { label: '断熱仕様', dataType: 'enum', idField: 'thermal_spec_id', parentFields: [], selectionMode: 'USER_SELECTABLE' },
  child_door_type: { label: '子扉', dataType: 'enum', idField: 'child_door_type', parentFields: ['configuration','design','thermal_spec'], selectionMode: 'USER_SELECTABLE', hideUntilParentsSelected: true },
  child_door: { label: '子扉デザイン', dataType: 'enum', idField: 'child_door_id', parentFields: ['configuration','design','thermal_spec','child_door_type'], selectionMode: 'USER_SELECTABLE', hideUntilParentsSelected: true },
  door_color: { label: '本体色', dataType: 'enum', idField: 'color_code', parentFields: ['design','configuration','thermal_spec'], selectionMode: 'USER_SELECTABLE' },
  frame_color: { label: '枠色', dataType: 'enum', idField: 'frame_color_id', parentFields: ['design','configuration','door_color'], selectionMode: 'USER_SELECTABLE' },
  door_closer: { label: 'ドアクローザ', dataType: 'enum', idField: 'option_id', parentFields: ['configuration'], selectionMode: 'USER_SELECTABLE', optional: true },
  handle: { label: 'ハンドル種類', dataType: 'enum', idField: 'handle_id', parentFields: ['design','configuration','door_color'], selectionMode: 'USER_SELECTABLE' },
  handle_color: { label: 'ハンドル色', dataType: 'enum', idField: 'handle_color_id', parentFields: ['handle'], selectionMode: 'USER_SELECTABLE', hideUntilParentsSelected: true },
  lock_type: { label: '錠仕様', dataType: 'enum', idField: 'lock_type', parentFields: ['handle'], selectionMode: 'USER_SELECTABLE', hideUntilParentsSelected: true },
  lock_system: { label: '電気錠システム', dataType: 'enum', idField: 'lock_system_id', parentFields: ['handle','lock_type'], selectionMode: 'AUTO_RESOLVE', hideWhenSingleton: true, hideUntilParentsSelected: true },
  lock_plan: { label: '電気錠の電源・プラン', dataType: 'enum', idField: 'lock_plan_id', parentFields: ['lock_system'], selectionMode: 'AUTO_RESOLVE', hideWhenSingleton: true, hideUntilParentsSelected: true },
  credential_type: { label: 'キー種別', dataType: 'enum', idField: 'credential_type', parentFields: ['lock_system'], selectionMode: 'USER_SELECTABLE', hideUntilParentsSelected: true },
  remote_count: { label: 'リモコンキー数', dataType: 'enum', idField: 'remote_count', parentFields: ['lock_system','credential_type'], selectionMode: 'USER_SELECTABLE', hideUntilParentsSelected: true },
  credential_package: { label: 'FamiLockキーセット', dataType: 'enum', idField: 'credential_package_id', parentFields: ['lock_system','credential_type','remote_count'], selectionMode: 'AUTO_RESOLVE', hideAlways: true },
  glass: { label: 'ガラス', dataType: 'enum', idField: 'glass_id', parentFields: ['design','configuration','thermal_spec'], selectionMode: 'AUTO_RESOLVE', hideWhenSingleton: true, hideUntilParentsSelected: true },
  option: { label: 'オプション', dataType: 'array', idField: 'option_id', parentFields: ['design','configuration','child_door','door_color','handle','lock_system','glass'], selectionMode: 'USER_SELECTABLE', optional: true },
});

const MASTER_VALUE_SPECS = Object.freeze({
  door_color: { master: 'P3_09_color_master', value: 'official_color_code', label: 'official_color_name' },
  frame_color: { master: 'P3_11_frame_color_master', value: 'frame_color_id', label: 'official_color_name' },
  child_door: { master: 'P4_child_door_master', value: 'child_door_id', label: 'official_child_door_name' },
  handle: { master: 'P4_handle_family_master', value: 'handle_id', label: 'official_handle_name' },
  handle_color: { master: 'P4_handle_color_master', value: 'handle_color_id', label: 'official_color_name' },
  lock_system: { master: 'P5_lock_system_master', value: 'lock_system_id', label: 'official_name' },
  lock_plan: { master: 'P5_lock_plan_master', value: 'lock_plan_id', label: 'official_name' },
  credential_package: { master: 'P5_credential_package_master', value: 'credential_package_id', label: 'official_name' },
  glass: { master: 'P6_glass_master', value: 'glass_id', label: 'official_glass_name' },
  option: { master: 'P7_option_master', value: 'option_id', label: 'official_option_name' },
});

const RELATION_SPECS = Object.freeze([
  { map: 'P3_color_config_map', sources: { configuration: 'door_configuration_id' }, target: { field: 'design', column: 'design_id' } },
  { map: 'P3_10_design_color_map', sources: { design: 'design_id' }, target: { field: 'door_color', column: 'color_code' } },
  { map: 'P3_color_config_map', sources: { design: 'design_id', configuration: 'door_configuration_id' }, target: { field: 'door_color', column: 'color_code' } },
  { map: 'P3_high_size_color_map', sources: { design: 'design_id' }, target: { field: 'door_color', column: 'color_code' } },
  { map: 'P4_design_child_door_map', sources: { design: 'design_id', configuration: 'door_configuration_id' }, target: { field: 'child_door', column: 'child_door_id' } },
  { map: 'P4_child_door_thermal_map', sources: { thermal_spec: 'thermal_spec_id' }, target: { field: 'child_door', column: 'child_door_id' } },
  { map: 'P4_child_door_color_map', sources: { door_color: 'color_code' }, target: { field: 'child_door', column: 'child_door_id' } },
  { map: 'P4_design_handle_map', sources: { design: 'design_id' }, target: { field: 'handle', column: 'handle_id' } },
  { map: 'P4_high_size_handle_map', sources: { design: 'design_id' }, target: { field: 'handle', column: 'handle_id' } },
  { map: 'P5_design_lock_map', sources: { design: 'design_id' }, target: { field: 'lock_system', column: 'lock_system_id' } },
  { map: 'P5_configuration_lock_map', sources: { configuration: 'door_configuration_id' }, target: { field: 'lock_system', column: 'lock_system_id' } },
  { map: 'P7_configuration_option_map', sources: { configuration: 'door_configuration_id' }, target: { field: 'door_closer', column: 'option_id' }, targetGroup: 'door_closer' },
  { map: 'P5_handle_lock_map', sources: { handle: 'handle_id' }, target: { field: 'lock_system', column: 'lock_system_id' } },
  { master: 'P5_lock_plan_master', sources: { lock_system: 'lock_system_id' }, target: { field: 'lock_plan', column: 'lock_plan_id' } },
  { map: 'P5_lock_credential_package_map', sources: { lock_system: 'lock_system_id' }, target: { field: 'credential_package', column: 'credential_package_id' } },
  { map: 'P4_handle_color_map', sources: { handle: 'handle_id' }, target: { field: 'handle_color', column: 'handle_color_id' } },
  { map: 'P5_high_size_lock_map', sources: { design: 'design_id' }, target: { field: 'lock_system', column: 'lock_system_id' } },
  { map: 'P6_glass_thermal_map', sources: { thermal_spec: 'thermal_spec_id' }, target: { field: 'glass', column: 'glass_id' }, mode: 'FILTER' },
  { map: 'P6_design_glass_map', sources: { design: 'design_id', thermal_spec: 'thermal_spec_id' }, target: { field: 'glass', column: 'glass_id' }, mode: 'BRANCH', priority: 10 },
  { map: 'P6_sidelight_glass_map', sources: { configuration: 'door_configuration_id', thermal_spec: 'thermal_spec_id' }, target: { field: 'glass', column: 'glass_id' }, mode: 'BRANCH', priority: 20 },
  { map: 'P7_design_option_map', sources: { design: 'design_id' }, target: { field: 'option', column: 'option_id' } },
  { map: 'P7_door_color_option_map', sources: { door_color: 'door_color_code' }, target: { field: 'option', column: 'option_id' } },
  { map: 'P7_configuration_option_map', sources: { configuration: 'door_configuration_id' }, target: { field: 'option', column: 'option_id' } },
  { map: 'P7_child_door_option_map', sources: { child_door: 'child_door_id' }, target: { field: 'option', column: 'option_id' } },
  { map: 'P7_lock_option_map', sources: { lock_system: 'lock_system_id' }, target: { field: 'option', column: 'option_id' }, sourceAlias: 'lock_system' },
  { map: 'P7_high_size_option_map', sources: { design: 'design_id' }, target: { field: 'option', column: 'option_id' } },
]);

const ACTIVE = new Set(['ACTIVE','CURRENT',undefined,null]);
const normalizeToken = (value) => String(value ?? '').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const unique = (values) => [...new Set(values.filter((value) => value !== undefined && value !== null && value !== ''))];
const humanize = (value) => String(value).replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const CONFIGURATION_LABELS = Object.freeze({
  single: '片開き',
  parent_child: '親子',
  parent_child_corner: '親子入隅',
  single_sidelight: '片袖',
  double_sidelight: '両袖',
  double_door: '両開き',
});

function rowsOf(container, key) {
  const rows = container?.[key];
  if (!Array.isArray(rows)) throw Object.assign(new Error(`Runtime schema adapter missing array: ${key}`), { code: 'RUNTIME_ADAPTER_SCHEMA_MISMATCH', key });
  return rows;
}

function valueRow(fieldName, value, label, source = {}) {
  const optionSelectionType = fieldName === 'option' ? source.selection_type : null;
  const optionUsage = fieldName === 'option' ? source.usage_scope : null;
  return {
    value_id: `${fieldName}:${value}`,
    field_name: fieldName,
    canonical_value: value,
    display_label: label ?? String(value),
    status: ACTIVE.has(source.status) ? 'CURRENT' : source.status,
    manual_check: source.manual_check === true || source.manualCheck === true,
    user_selectable: fieldName !== 'option' || !['FIXED_BY_RULE','REQUIRED_BY_SELECTION'].includes(optionSelectionType),
    runtime_selectable: fieldName !== 'option' || !['post_purchase','after_sales'].includes(optionUsage),
    source,
  };
}

function activeRows(rows) {
  return rows.filter((row) => ACTIVE.has(row?.status));
}

function buildValues(flow, masters, maps) {
  const values = [];
  if (flow.includes('design')) {
    const rows = rowsOf(maps, 'P3_design_color_summary');
    for (const row of rows) values.push(valueRow('design', row.design_id, row.official_design_code ?? row.design_id, row));
  }
  if (flow.includes('configuration')) {
    const rows = activeRows(rowsOf(maps, 'P3_color_config_map')).filter((row) => row.availability === 'AVAILABLE');
    for (const value of unique(rows.map((row) => row.door_configuration_id)).sort()) values.push(valueRow('configuration', value, CONFIGURATION_LABELS[value] ?? humanize(value), {}));
  }
  if (flow.includes('thermal_spec')) {
    const rows = activeRows(rowsOf(maps, 'P6_glass_thermal_map')).filter((row) => row.availability === 'AVAILABLE');
    for (const value of unique(rows.map((row) => row.thermal_spec_id)).sort()) values.push(valueRow('thermal_spec', value, String(value).toUpperCase(), {}));
  }
  if (flow.includes('door_closer')) {
    for (const row of activeRows(rowsOf(masters, 'P7_option_master')).filter((one) => one.option_subcategory === 'door_closer')) {
      values.push(valueRow('door_closer', row.option_id, row.official_option_name, { ...row, selection_type: 'USER_SELECTABLE' }));
    }
  }
  if (flow.includes('child_door_type')) {
    const types = new Map();
    for (const row of activeRows(rowsOf(masters, 'P4_child_door_master'))) {
      const value = row.has_post === true ? (row.has_glazing === true ? 'glazed_with_post' : 'solid_with_post') : (row.has_glazing === true ? 'glazed' : 'solid');
      const label = row.has_post === true ? (row.has_glazing === true ? '採光部あり（ポスト付）' : '採光部なし（ポスト付）') : (row.has_glazing === true ? '採光部あり' : '採光部なし');
      types.set(value, label);
    }
    for (const [value, label] of types) values.push(valueRow('child_door_type', value, label));
  }
  if (flow.includes('credential_type') || flow.includes('remote_count')) {
    const packages = activeRows(rowsOf(masters, 'P5_credential_package_master'));
    const types = new Map();
    const counts = new Set();
    for (const row of packages) {
      const type = Number(row.card_count) > 0 ? 'card' : Number(row.tag_count) > 0 ? 'tag' : null;
      if (!type) continue;
      const smartphone = row.includes_smartphone_capability === true ? '（スマートフォン対応）' : '';
      types.set(type, `${type === 'card' ? 'カードキー' : 'タグキー'}${smartphone}`);
      counts.add(Number(row.remote_count));
    }
    for (const [value, label] of types) values.push(valueRow('credential_type', value, label));
    for (const value of [...counts].sort((a, b) => a - b)) values.push(valueRow('remote_count', value, `${value}個`));
  }
  if (flow.includes('lock_type')) {
    const types = new Map();
    for (const row of activeRows(rowsOf(masters, 'P5_lock_system_master'))) types.set(row.is_electric === true ? 'electric' : 'manual', row.is_electric === true ? '電気錠' : '手動錠');
    for (const [value, label] of types) values.push(valueRow('lock_type', value, label));
  }
  for (const fieldName of flow) {
    const spec = MASTER_VALUE_SPECS[fieldName];
    if (!spec) continue;
    for (const row of activeRows(rowsOf(masters, spec.master))) {
      if (fieldName === 'option' && (['post_purchase','after_sales'].includes(row.usage_scope) || row.option_subcategory === 'door_closer')) continue;
      const value = row[spec.value];
      if (value !== undefined && value !== null && value !== '') {
        values.push(valueRow(fieldName, value, row[spec.label] ?? value, row));
      }
    }
  }
  const dedup = new Map();
  for (const row of values) dedup.set(`${row.field_name}\u0000${String(row.canonical_value)}`, row);
  return [...dedup.values()];
}

function lockAliases(values) {
  const aliases = new Map();
  for (const value of values.filter((row) => row.field_name === 'lock_system')) {
    const source = value.source ?? {};
    const candidates = [
      value.canonical_value,
      String(value.canonical_value).split('_').at(-1),
      source.lock_category,
      source.official_system_code,
      source.official_name,
    ];
    for (const candidate of candidates) {
      const token = normalizeToken(candidate);
      if (!token) continue;
      aliases.set(token, value.canonical_value);
      for (const part of token.split('_')) if (part.length >= 4) aliases.set(part, value.canonical_value);
    }
  }
  return aliases;
}

function normalizeRelationRows(spec, rows, aliases) {
  return activeRows(rows).map((row) => {
    const sources = {};
    for (const [fieldName, column] of Object.entries(spec.sources)) {
      let value = row[column];
      if (spec.sourceAlias === fieldName) value = aliases.get(normalizeToken(value)) ?? value;
      sources[fieldName] = value;
    }
    return {
      sources,
      targetValue: row[spec.target.column],
      availability: row.availability ?? 'AVAILABLE',
      selectionMode: row.selection_mode ?? row.selection_type ?? null,
      source: row,
    };
  }).filter((row) => (row.targetValue !== undefined && row.targetValue !== null) || row.selectionMode === 'NOT_APPLICABLE');
}

function parseSimpleExclusions(maps, idFieldToFlow) {
  const out = [];
  for (const [mapName, rows] of Object.entries(maps)) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (String(row?.effect ?? '').toUpperCase() !== 'INCOMPATIBLE' || typeof row.condition !== 'string' || typeof row.target !== 'string') continue;
      const condition = row.condition.match(/^\s*([A-Za-z0-9_]+)\s*=\s*([^=]+?)\s*$/);
      const target = row.target.match(/^\s*([A-Za-z0-9_]+)\s*=\s*([^=]+?)\s*$/);
      if (!condition || !target) continue;
      const conditionField = idFieldToFlow.get(condition[1]);
      const targetField = idFieldToFlow.get(target[1]);
      if (!conditionField || !targetField) continue;
      out.push({
        ruleId: row.rule_id ?? `${mapName}:${out.length + 1}`,
        conditions: { [conditionField]: condition[2] },
        targetField,
        targetValue: target[2],
        effect: 'INCOMPATIBLE',
      });
    }
  }
  return out;
}

export function adaptPhaseMasterMapsV1(runtimePackage) {
  const core = runtimePackage.documents.RUNTIME_CORE;
  const mapDoc = runtimePackage.documents.RUNTIME_MAPS;
  if (!core?.selection_contract || !core?.masters || !mapDoc?.maps) {
    throw Object.assign(new Error('PHASE_MASTER_MAPS_V1 requires RUNTIME_CORE.selection_contract/masters and RUNTIME_MAPS.maps'), { code: 'RUNTIME_ADAPTER_SCHEMA_MISMATCH' });
  }
  const declaredFlow = core.selection_contract.flow;
  if (!Array.isArray(declaredFlow) || !declaredFlow.length) throw Object.assign(new Error('selection_contract.flow must be non-empty'), { code: 'RUNTIME_ADAPTER_SCHEMA_MISMATCH' });
  for (const field of declaredFlow) if (!FLOW_SPECS[field]) throw Object.assign(new Error(`Unsupported selection_contract.flow field: ${field}`), { code: 'RUNTIME_ADAPTER_UNSUPPORTED_FLOW', field });
  const projected = [...declaredFlow];
  if (declaredFlow.includes('configuration') && Array.isArray(core.masters.P4_child_door_master) && Array.isArray(mapDoc.maps.P4_design_child_door_map)) projected.push('child_door_type', 'child_door');
  if (declaredFlow.includes('option') && Array.isArray(core.masters.P7_door_closer_master) && Array.isArray(mapDoc.maps.P7_configuration_option_map)) projected.push('door_closer');
  if (declaredFlow.includes('lock_system') && Array.isArray(core.masters.P5_lock_system_master)) projected.push('lock_type');
  if (declaredFlow.includes('lock_system') && Array.isArray(core.masters.P5_lock_plan_master)) projected.push('lock_plan');
  if (declaredFlow.includes('lock_system') && Array.isArray(core.masters.P5_credential_package_master) && Array.isArray(mapDoc.maps.P5_lock_credential_package_map)) projected.push('credential_type', 'remote_count', 'credential_package');
  if (declaredFlow.includes('handle') && Array.isArray(core.masters.P4_handle_color_master) && Array.isArray(mapDoc.maps.P4_handle_color_map)) projected.push('handle_color');
  const flow = orderDoorRuntimeFields(projected);

  const childConfigurations = unique((core.masters.P4_child_door_master ?? []).map((row) => row.door_configuration_id));
  const credentialLockSystems = unique((core.masters.P5_credential_package_master ?? []).filter((row) => Number(row.card_count) > 0 || Number(row.tag_count) > 0).map((row) => row.lock_system_id));
  const doorCloserOptionIds = new Set((core.masters.P7_option_master ?? []).filter((row) => row.option_subcategory === 'door_closer').map((row) => row.option_id));

  const fields = flow.map((fieldName, index) => {
    const spec = FLOW_SPECS[fieldName];
    return {
      field_id: `runtime:${fieldName}`,
      field_name: fieldName,
      display_label: spec.label,
      display_order: index + 1,
      data_type: spec.dataType,
      selection_mode: spec.selectionMode,
      required_mode: spec.optional ? 'OPTIONAL' : 'REQUIRED',
      visibility_mode: 'SHOW',
      runtime_included: true,
      hide_when_singleton: spec.hideWhenSingleton === true,
      hide_until_parents_selected: spec.hideUntilParentsSelected === true,
      hide_always: spec.hideAlways === true,
      applicable_values: ['child_door_type','child_door'].includes(fieldName) ? { configuration: childConfigurations } : ['credential_type','remote_count'].includes(fieldName) ? { lock_system: credentialLockSystems } : null,
      parent_fields: spec.parentFields.filter((parent) => flow.includes(parent)),
    };
  });
  const values = buildValues(flow, core.masters, mapDoc.maps);
  const aliases = lockAliases(values);
  const relations = [];
  for (const spec of RELATION_SPECS) {
    if (!flow.includes(spec.target.field) || Object.keys(spec.sources).some((field) => !flow.includes(field))) continue;
    let rows = spec.master ? core.masters[spec.master] : mapDoc.maps[spec.map];
    if (!Array.isArray(rows)) continue;
    if (spec.targetGroup === 'door_closer') rows = rows.filter((row) => doorCloserOptionIds.has(row[spec.target.column]));
    const normalizedRows = normalizeRelationRows(spec, rows, aliases);
    if (!normalizedRows.length) continue;
    relations.push({
      ruleId: `MAP:${spec.map}:${Object.keys(spec.sources).join('+')}->${spec.target.field}`,
      mapName: spec.map,
      sourceFields: Object.keys(spec.sources),
      targetField: spec.target.field,
      domainValues: unique(normalizedRows.map((row) => row.targetValue)),
      mode: spec.mode ?? 'FILTER',
      priority: spec.priority ?? 0,
      rows: normalizedRows,
    });
  }

  if (flow.includes('lock_type') && flow.includes('lock_system')) {
    const lockRows = activeRows(core.masters.P5_lock_system_master).map((row) => ({ ...row, lock_type: row.is_electric === true ? 'electric' : 'manual' }));
    relations.push({
      ruleId: 'MASTER:P5_lock_system_master:lock_type->lock_system', mapName: 'P5_lock_system_master',
      sourceFields: ['lock_type'], targetField: 'lock_system', domainValues: unique(lockRows.map((row) => row.lock_system_id)), mode: 'FILTER', priority: 0,
      rows: lockRows.map((row) => ({ sources: { lock_type: row.lock_type }, targetValue: row.lock_system_id, availability: 'AVAILABLE', selectionMode: null, source: row })),
    });
  }

  if (flow.includes('child_door_type') && flow.includes('child_door')) {
    const childMaster = activeRows(core.masters.P4_child_door_master).map((row) => ({
      ...row,
      child_door_type: row.has_post === true ? (row.has_glazing === true ? 'glazed_with_post' : 'solid_with_post') : (row.has_glazing === true ? 'glazed' : 'solid'),
    }));
    const childById = new Map(childMaster.map((row) => [row.child_door_id, row]));
    const designRows = activeRows(mapDoc.maps.P4_design_child_door_map).map((row) => ({ ...row, child_door_type: childById.get(row.child_door_id)?.child_door_type })).filter((row) => row.child_door_type);
    relations.push({
      ruleId: 'MAP:P4_design_child_door_map:design+configuration->child_door_type', mapName: 'P4_design_child_door_map',
      sourceFields: ['design','configuration'], targetField: 'child_door_type', domainValues: unique(childMaster.map((row) => row.child_door_type)), mode: 'FILTER', priority: 0,
      rows: designRows.map((row) => ({ sources: { design: row.design_id, configuration: row.door_configuration_id }, targetValue: row.child_door_type, availability: row.availability, selectionMode: null, source: row })),
    });
    relations.push({
      ruleId: 'MASTER:P4_child_door_master:child_door_type->child_door', mapName: 'P4_child_door_master',
      sourceFields: ['child_door_type'], targetField: 'child_door', domainValues: unique(childMaster.map((row) => row.child_door_id)), mode: 'FILTER', priority: 0,
      rows: childMaster.map((row) => ({ sources: { child_door_type: row.child_door_type }, targetValue: row.child_door_id, availability: 'AVAILABLE', selectionMode: null, source: row })),
    });
  }

  if (flow.includes('credential_type') && flow.includes('remote_count') && flow.includes('credential_package')) {
    const packageRows = activeRows(core.masters.P5_credential_package_master).map((row) => ({
      ...row,
      credential_type: Number(row.card_count) > 0 ? 'card' : Number(row.tag_count) > 0 ? 'tag' : null,
    })).filter((row) => row.credential_type);
    relations.push({
      ruleId: 'MASTER:P5_credential_package_master:lock_system->credential_type', mapName: 'P5_credential_package_master',
      sourceFields: ['lock_system'], targetField: 'credential_type', domainValues: unique(packageRows.map((row) => row.credential_type)), mode: 'FILTER', priority: 0,
      rows: packageRows.map((row) => ({ sources: { lock_system: row.lock_system_id }, targetValue: row.credential_type, availability: 'AVAILABLE', selectionMode: null, source: row })),
    });
    relations.push({
      ruleId: 'MASTER:P5_credential_package_master:lock_system+credential_type->remote_count', mapName: 'P5_credential_package_master',
      sourceFields: ['lock_system','credential_type'], targetField: 'remote_count', domainValues: unique(packageRows.map((row) => Number(row.remote_count))), mode: 'FILTER', priority: 0,
      rows: packageRows.map((row) => ({ sources: { lock_system: row.lock_system_id, credential_type: row.credential_type }, targetValue: Number(row.remote_count), availability: 'AVAILABLE', selectionMode: null, source: row })),
    });
    relations.push({
      ruleId: 'MASTER:P5_credential_package_master:key+remote->credential_package', mapName: 'P5_credential_package_master',
      sourceFields: ['lock_system','credential_type','remote_count'], targetField: 'credential_package', domainValues: unique(packageRows.map((row) => row.credential_package_id)), mode: 'FILTER', priority: 0,
      rows: packageRows.map((row) => ({ sources: { lock_system: row.lock_system_id, credential_type: row.credential_type, remote_count: Number(row.remote_count) }, targetValue: row.credential_package_id, availability: 'AVAILABLE', selectionMode: null, source: row })),
    });
  }

  const idFieldToFlow = new Map(Object.entries(FLOW_SPECS).map(([flowName, spec]) => [spec.idField, flowName]));
  const exclusionRules = parseSimpleExclusions(mapDoc.maps, idFieldToFlow);
  const optionValues = new Set(values.filter((row) => row.field_name === 'option').map((row) => row.canonical_value));
  const entities = Object.values(core.masters).flat().filter(row => row && typeof row === 'object').flatMap(row => Object.entries(row).filter(([key]) => key.endsWith('_id') && !['source_id', 'series_id'].includes(key)).map(([, id]) => ({ id, label: row.official_name ?? row.official_option_name ?? id })));
  const optionDependencies = activeRows(mapDoc.maps.P7_option_dependency_map ?? []).map((row, index) => ({
    ruleId: `OPTION:${index + 1}`,
    sourceOption: row.source_option_id,
    targetEntity: row.target_entity_id,
    relationship: row.relationship_type,
    targetIsOption: optionValues.has(row.target_entity_id),
    note: row.condition_note ?? null,
  }));

  const masterStatuses = Object.values(core.masters).flatMap((rows) => Array.isArray(rows) ? rows.map((row) => row?.status).filter(Boolean) : []);
  const lifecycle = masterStatuses.some((status) => status !== 'ACTIVE') ? 'RUNTIME_MANAGED' : 'ACTIVE_ONLY';
  return Object.freeze({
    manifest: runtimePackage.manifest,
    metadata: core.metadata,
    selectionContract: core.selection_contract,
    fields,
    values,
    relations,
    exclusionRules,
    optionDependencies,
    entities,
    capabilities: Object.freeze({
      target: 'SALES_PRODUCT_SELECTION',
      dependency: 'RELATIONAL_MAPS',
      size: 'NOT_PROVIDED_BY_RUNTIME',
      option: flow.includes('option') ? 'RELATIONAL_MAPS' : 'NOT_PROVIDED_BY_RUNTIME',
      bom: 'NOT_PROVIDED_BY_RUNTIME',
      lifecycle,
      specialOrderEscalation: core.selection_contract.special_order_escalation ?? null,
    }),
  });
}
