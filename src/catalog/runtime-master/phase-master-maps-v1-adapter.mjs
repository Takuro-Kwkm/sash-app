const FLOW_SPECS = Object.freeze({
  design: { label: 'デザイン', dataType: 'enum', idField: 'design_id', parentFields: [], selectionMode: 'USER_SELECTABLE' },
  configuration: { label: '枠・構成', dataType: 'enum', idField: 'door_configuration_id', parentFields: ['design'], selectionMode: 'USER_SELECTABLE' },
  thermal_spec: { label: '断熱仕様', dataType: 'enum', idField: 'thermal_spec_id', parentFields: ['design','configuration'], selectionMode: 'USER_SELECTABLE' },
  door_color: { label: '本体色', dataType: 'enum', idField: 'color_code', parentFields: ['design','configuration','thermal_spec'], selectionMode: 'USER_SELECTABLE' },
  frame_color: { label: '枠色', dataType: 'enum', idField: 'frame_color_id', parentFields: ['design','configuration','door_color'], selectionMode: 'USER_SELECTABLE' },
  handle: { label: 'ハンドル', dataType: 'enum', idField: 'handle_id', parentFields: ['design','configuration','door_color'], selectionMode: 'USER_SELECTABLE' },
  lock_system: { label: '錠仕様', dataType: 'enum', idField: 'lock_system_id', parentFields: ['design','configuration','handle'], selectionMode: 'USER_SELECTABLE' },
  glass: { label: 'ガラス', dataType: 'enum', idField: 'glass_id', parentFields: ['design','configuration','thermal_spec'], selectionMode: 'AUTO_RESOLVE' },
  option: { label: 'オプション', dataType: 'array', idField: 'option_id', parentFields: ['design','configuration','door_color','handle','lock_system','glass'], selectionMode: 'USER_SELECTABLE', optional: true },
});

const MASTER_VALUE_SPECS = Object.freeze({
  door_color: { master: 'P3_09_color_master', value: 'official_color_code', label: 'official_color_name' },
  frame_color: { master: 'P3_11_frame_color_master', value: 'frame_color_id', label: 'official_color_name' },
  handle: { master: 'P4_handle_family_master', value: 'handle_id', label: 'official_handle_name' },
  lock_system: { master: 'P5_lock_system_master', value: 'lock_system_id', label: 'official_name' },
  glass: { master: 'P6_glass_master', value: 'glass_id', label: 'official_glass_name' },
  option: { master: 'P7_option_master', value: 'option_id', label: 'official_option_name' },
});

const RELATION_SPECS = Object.freeze([
  { map: 'P3_color_config_map', sources: { design: 'design_id' }, target: { field: 'configuration', column: 'door_configuration_id' } },
  { map: 'P3_10_design_color_map', sources: { design: 'design_id' }, target: { field: 'door_color', column: 'color_code' } },
  { map: 'P3_color_config_map', sources: { design: 'design_id', configuration: 'door_configuration_id' }, target: { field: 'door_color', column: 'color_code' } },
  { map: 'P3_high_size_color_map', sources: { design: 'design_id' }, target: { field: 'door_color', column: 'color_code' } },
  { map: 'P4_design_handle_map', sources: { design: 'design_id' }, target: { field: 'handle', column: 'handle_id' } },
  { map: 'P4_high_size_handle_map', sources: { design: 'design_id' }, target: { field: 'handle', column: 'handle_id' } },
  { map: 'P5_design_lock_map', sources: { design: 'design_id' }, target: { field: 'lock_system', column: 'lock_system_id' } },
  { map: 'P5_configuration_lock_map', sources: { configuration: 'door_configuration_id' }, target: { field: 'lock_system', column: 'lock_system_id' } },
  { map: 'P5_handle_lock_map', sources: { handle: 'handle_id' }, target: { field: 'lock_system', column: 'lock_system_id' } },
  { map: 'P5_high_size_lock_map', sources: { design: 'design_id' }, target: { field: 'lock_system', column: 'lock_system_id' } },
  { map: 'P6_glass_thermal_map', sources: { thermal_spec: 'thermal_spec_id' }, target: { field: 'glass', column: 'glass_id' }, mode: 'FILTER' },
  { map: 'P6_design_glass_map', sources: { design: 'design_id', thermal_spec: 'thermal_spec_id' }, target: { field: 'glass', column: 'glass_id' }, mode: 'BRANCH', priority: 10 },
  { map: 'P6_sidelight_glass_map', sources: { configuration: 'door_configuration_id', thermal_spec: 'thermal_spec_id' }, target: { field: 'glass', column: 'glass_id' }, mode: 'BRANCH', priority: 20 },
  { map: 'P7_design_option_map', sources: { design: 'design_id' }, target: { field: 'option', column: 'option_id' } },
  { map: 'P7_door_color_option_map', sources: { door_color: 'door_color_code' }, target: { field: 'option', column: 'option_id' } },
  { map: 'P7_configuration_option_map', sources: { configuration: 'door_configuration_id' }, target: { field: 'option', column: 'option_id' } },
  { map: 'P7_lock_option_map', sources: { lock_system: 'lock_system_id' }, target: { field: 'option', column: 'option_id' }, sourceAlias: 'lock_system' },
  { map: 'P7_high_size_option_map', sources: { design: 'design_id' }, target: { field: 'option', column: 'option_id' } },
]);

const ACTIVE = new Set(['ACTIVE','CURRENT',undefined,null]);
const normalizeToken = (value) => String(value ?? '').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const unique = (values) => [...new Set(values.filter((value) => value !== undefined && value !== null && value !== ''))];
const humanize = (value) => String(value).replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

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
    status: 'CURRENT',
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
    for (const value of unique(rows.map((row) => row.door_configuration_id)).sort()) values.push(valueRow('configuration', value, humanize(value), {}));
  }
  if (flow.includes('thermal_spec')) {
    const rows = activeRows(rowsOf(maps, 'P6_glass_thermal_map')).filter((row) => row.availability === 'AVAILABLE');
    for (const value of unique(rows.map((row) => row.thermal_spec_id)).sort()) values.push(valueRow('thermal_spec', value, String(value).toUpperCase(), {}));
  }
  for (const fieldName of flow) {
    const spec = MASTER_VALUE_SPECS[fieldName];
    if (!spec) continue;
    for (const row of activeRows(rowsOf(masters, spec.master))) {
      if (fieldName === 'option' && ['post_purchase','after_sales'].includes(row.usage_scope)) continue;
      const value = row[spec.value];
      if (value !== undefined && value !== null && value !== '') values.push(valueRow(fieldName, value, row[spec.label] ?? value, row));
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
  const flow = core.selection_contract.flow;
  if (!Array.isArray(flow) || !flow.length) throw Object.assign(new Error('selection_contract.flow must be non-empty'), { code: 'RUNTIME_ADAPTER_SCHEMA_MISMATCH' });
  for (const field of flow) if (!FLOW_SPECS[field]) throw Object.assign(new Error(`Unsupported selection_contract.flow field: ${field}`), { code: 'RUNTIME_ADAPTER_UNSUPPORTED_FLOW', field });

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
      parent_fields: spec.parentFields.filter((parent) => flow.includes(parent)),
    };
  });
  const values = buildValues(flow, core.masters, mapDoc.maps);
  const aliases = lockAliases(values);
  const relations = [];
  for (const spec of RELATION_SPECS) {
    if (!flow.includes(spec.target.field) || Object.keys(spec.sources).some((field) => !flow.includes(field))) continue;
    const rows = mapDoc.maps[spec.map];
    if (!Array.isArray(rows)) continue;
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

  const idFieldToFlow = new Map(Object.entries(FLOW_SPECS).map(([flowName, spec]) => [spec.idField, flowName]));
  const exclusionRules = parseSimpleExclusions(mapDoc.maps, idFieldToFlow);
  const optionValues = new Set(values.filter((row) => row.field_name === 'option').map((row) => row.canonical_value));
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
    capabilities: Object.freeze({
      dependency: 'RELATIONAL_MAPS',
      size: 'NOT_PROVIDED_BY_RUNTIME',
      option: flow.includes('option') ? 'RELATIONAL_MAPS' : 'NOT_PROVIDED_BY_RUNTIME',
      bom: 'NOT_PROVIDED_BY_RUNTIME',
      lifecycle,
      specialOrderEscalation: core.selection_contract.special_order_escalation ?? null,
    }),
  });
}
