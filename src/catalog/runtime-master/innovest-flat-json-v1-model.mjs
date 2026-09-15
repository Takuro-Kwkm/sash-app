const CURRENT = 'CURRENT';
const confirmed = (row) => String(row?.record_status ?? row?.status ?? '').startsWith('CONFIRMED');
const uniq = (rows) => [...new Set(rows.filter((value) => value !== null && value !== undefined && value !== ''))];
const split = (value) => String(value ?? '').split('|').map((one) => one.trim()).filter(Boolean);
const has = (value) => value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length > 0);
const eq = (a, b) => Object.is(a, b) || String(a) === String(b);
const clone = (value) => structuredClone(value);

const FIELD_DEFS = Object.freeze([
  { field_name: 'thermal_spec', data_type: 'enum', required_mode: 'REQUIRED', display_label: '断熱仕様', selection_mode: 'USER', display_order: 30 },
  { field_name: 'fire_classification', data_type: 'enum', required_mode: 'REQUIRED', display_label: '防火区分', selection_mode: 'AUTO_RESOLVE', display_order: 34 },
  { field_name: 'frame_system', data_type: 'enum', required_mode: 'REQUIRED', display_label: '枠仕様', selection_mode: 'AUTO_RESOLVE', display_order: 36 },
  { field_name: 'configuration', data_type: 'enum', required_mode: 'REQUIRED', display_label: '開き形式', selection_mode: 'USER', display_order: 40 },
  { field_name: 'design', data_type: 'enum', required_mode: 'REQUIRED', display_label: 'デザイン', selection_mode: 'USER', display_order: 50 },
  { field_name: 'child_door', data_type: 'enum', required_mode: 'CONDITIONAL', display_label: '子扉', selection_mode: 'USER', display_order: 60 },
  { field_name: 'glass', data_type: 'enum', required_mode: 'CONDITIONAL', display_label: 'ガラス', selection_mode: 'DERIVED', show_read_only: true, display_order: 70 },
  { field_name: 'door_color', data_type: 'enum', required_mode: 'REQUIRED', display_label: '本体色', selection_mode: 'USER', display_order: 80 },
  { field_name: 'handing', data_type: 'enum', required_mode: 'REQUIRED', display_label: '吊元', selection_mode: 'USER', display_order: 90 },
  { field_name: 'frame_installation_type', data_type: 'enum', required_mode: 'REQUIRED', display_label: '枠納まり', selection_mode: 'USER', display_order: 95 },
  { field_name: 'angle_attached_frame', data_type: 'boolean', required_mode: 'CONDITIONAL', display_label: 'アングル付枠', selection_mode: 'AUTO_RESOLVE', display_order: 96 },
  { field_name: 'handle', data_type: 'enum', required_mode: 'REQUIRED', display_label: 'ハンドル種類', selection_mode: 'USER', display_order: 110 },
  { field_name: 'handle_color', data_type: 'enum', required_mode: 'REQUIRED', display_label: 'ハンドル色', selection_mode: 'USER', display_order: 120 },
  { field_name: 'lock_type', data_type: 'enum', required_mode: 'REQUIRED', display_label: '錠仕様', selection_mode: 'USER', display_order: 130 },
  { field_name: 'lock_system', data_type: 'enum', required_mode: 'CONDITIONAL', display_label: '電気錠仕様', selection_mode: 'USER', display_order: 132 },
  { field_name: 'power_supply', data_type: 'enum', required_mode: 'CONDITIONAL', display_label: '電源 / プラン', selection_mode: 'AUTO_RESOLVE', display_order: 134 },
  { field_name: 'size_mode', data_type: 'enum', required_mode: 'REQUIRED', display_label: '特注サイズ', selection_mode: 'USER', display_order: 140 },
  { field_name: 'custom_width', data_type: 'number', required_mode: 'CONDITIONAL', display_label: '特注W', unit: 'mm', selection_mode: 'USER', display_order: 141 },
  { field_name: 'custom_height', data_type: 'number', required_mode: 'CONDITIONAL', display_label: '特注H', unit: 'mm', selection_mode: 'USER', display_order: 142 },
  { field_name: 'wall_thickness_mm', data_type: 'number', required_mode: 'OPTIONAL', display_label: '壁厚', unit: 'mm', selection_mode: 'USER', display_order: 205 },
  { field_name: 'option', data_type: 'array', required_mode: 'OPTIONAL', display_label: 'オプション', selection_mode: 'USER', display_order: 210 },
]);

const LABELS = Object.freeze({
  thermal_spec: { D70: 'D70', D50: 'D50', D50_BASIC: 'D50 Basic' },
  fire_classification: { NON_FIRE: '非防火', FIRE: '防火' },
  frame_system: { RESIN_COMPOSITE: '樹脂複合枠', EXTRUDED_THERMAL: '形材断熱枠' },
  configuration: { SINGLE: '片開き', PARENT_CHILD_RECESSED: '親子（入隅）', PARENT_CHILD: '親子', DOUBLE: '両開き' },
  handing: { RIGHT: '右吊元', LEFT: '左吊元' },
  frame_installation_type: { FLAT: 'フラット枠', COLD_REGION: '寒冷地納まり' },
  lock_type: { MANUAL: '手動錠', ELECTRIC: '電気錠' },
  lock_system: { FACE_RECOGNITION: '顔認証キー', POCKET_KEY: 'ポケットキー', PITTAT_KEY: 'ピタットキー' },
  power_supply: { AC100V: 'AC100V式', BATTERY: '電池式', NOT_APPLICABLE: '該当なし' },
  handle_color: { SILVER: 'シルバー', BLACK: 'ブラック', ANTIQUE_BRONZE: 'アンティークブロンズ' },
  size_mode: { STANDARD: '規格サイズ', SIZE_ORDER: '特注サイズ' },
});

function value(field_name, canonical_value, display_label, extra = {}) {
  return { field_name, canonical_value, display_label, status: CURRENT, runtime_selectable: true, user_selectable: true, ...extra };
}

function colorLabel(row) {
  const parts = [row.exterior_panel_color_name];
  if (row.accent_panel_color_code && row.accent_panel_color_code !== 'NOT_APPLICABLE') parts.push(`アクセント:${row.accent_panel_color_name}`);
  if (row.interior_panel_color_code && row.interior_panel_color_code !== 'NOT_APPLICABLE') parts.push(`内観:${row.interior_panel_color_name}`);
  if (row.frame_color_name) parts.push(`枠:${row.frame_color_name}`);
  return parts.join(' / ');
}

function normalizedValues(data) {
  const m = data.masterData;
  const out = [];
  for (const id of uniq(data.selectors.product_nodes.map((row) => row.thermal_grade))) out.push(value('thermal_spec', id, LABELS.thermal_spec[id] ?? id));
  for (const id of uniq(data.selectors.product_nodes.map((row) => row.fire_classification))) out.push(value('fire_classification', id, LABELS.fire_classification[id] ?? id));
  for (const id of uniq(data.selectors.product_nodes.map((row) => row.frame_system))) out.push(value('frame_system', id, LABELS.frame_system[id] ?? id));
  for (const id of uniq(data.selectors.product_nodes.map((row) => row.opening_configuration))) out.push(value('configuration', id, LABELS.configuration[id] ?? id));
  for (const row of m.Design_Master) out.push(value('design', row.design_id, row.design_id, { manual_check: row.record_status !== 'CONFIRMED' }));
  for (const row of m.Secondary_Leaf_Master) out.push(value('child_door', row.secondary_leaf_design, row.secondary_leaf_design));
  for (const spec of uniq(m.Daylight_Glass_Master.filter((row) => row.glass_exists === 'YES').map((row) => row.glass_specification))) out.push(value('glass', spec, spec));
  for (const row of m.Design_Color_Whitelist) out.push(value('door_color', row.color_variant_id, colorLabel(row)));
  for (const id of ['RIGHT','LEFT']) out.push(value('handing', id, LABELS.handing[id]));
  for (const id of uniq(m.Frame_Installation_Master.filter((row) => row.allowed).map((row) => row.frame_installation_type))) out.push(value('frame_installation_type', id, LABELS.frame_installation_type[id] ?? id));
  for (const row of m.Handle_Master) out.push(value('handle', row.handle_id, row.handle_design));
  for (const id of uniq(m.Handle_Master.map((row) => row.handle_color))) out.push(value('handle_color', id, LABELS.handle_color[id] ?? id));
  for (const id of ['MANUAL','ELECTRIC']) out.push(value('lock_type', id, LABELS.lock_type[id]));
  for (const row of m.Key_Package_Master.filter((row) => row.control_type === 'ELECTRIC')) out.push(value('lock_system', row.key_package, LABELS.lock_system[row.key_package] ?? row.key_package));
  for (const id of ['AC100V','BATTERY']) out.push(value('power_supply', id, LABELS.power_supply[id]));
  for (const id of ['STANDARD','SIZE_ORDER']) out.push(value('size_mode', id, LABELS.size_mode[id]));
  for (const row of data.options.options.filter((row) => row.runtime_selectable === true)) out.push(value('option', row.option_id, row.name, { manual_check: Boolean(row.review_rules?.length), order_code: row.order_code ?? null }));
  return out;
}

function rowMatches(row, constraints) {
  return Object.entries(constraints).every(([key, expected]) => !has(expected) || eq(row[key], expected));
}

function filterAllowedRows(rows, constraints) {
  return rows.filter((row) => confirmed(row) && row.allowed !== false && rowMatches(row, constraints));
}

function canonicalContext(selection, data) {
  const color = data.masterData.Design_Color_Whitelist.find((row) => row.color_variant_id === selection.door_color);
  const handle = data.masterData.Handle_Master.find((row) => row.handle_id === selection.handle && (!selection.handle_color || row.handle_color === selection.handle_color));
  const keyPackage = selection.lock_type === 'MANUAL' ? 'MANUAL' : selection.lock_system;
  const context = {
    thermal_grade: selection.thermal_spec,
    fire_classification: selection.fire_classification,
    frame_system: selection.frame_system,
    opening_configuration: selection.configuration,
    handing: selection.handing,
    design_id: selection.design,
    exterior_panel_color: color?.exterior_panel_color_code,
    interior_panel_color: color?.interior_panel_color_code,
    frame_color: color?.frame_color_code,
    accent_panel_color: color?.accent_panel_color_code,
    secondary_leaf_design: selection.child_door,
    size_mode: selection.size_mode,
    frame_width_mm: selection.size_mode === 'SIZE_ORDER' ? selection.custom_width : undefined,
    frame_height_mm: selection.size_mode === 'SIZE_ORDER' ? selection.custom_height : undefined,
    key_package: keyPackage,
    power_supply: selection.power_supply,
    handle_type: handle?.handle_id ?? selection.handle,
    handle_color: selection.handle_color,
    frame_installation_type: selection.frame_installation_type,
    angle_attached_frame: selection.angle_attached_frame,
    wall_thickness_mm: selection.wall_thickness_mm,
  };
  const thicknessRows = filterAllowedRows(data.masterData.Door_Thickness_Master, { design_id: context.design_id, opening_configuration: context.opening_configuration })
    .sort((a,b) => Number(b.priority ?? 0) - Number(a.priority ?? 0));
  if (thicknessRows[0]) context.door_thickness_mm = thicknessRows[0].door_thickness_mm;
  return context;
}

function predicateMatches(predicate, context) {
  const actual = context[predicate.field];
  if (!has(actual)) return false;
  switch (predicate.op) {
    case 'EQ': return eq(actual, predicate.value);
    case 'IN': return Array.isArray(predicate.value) && predicate.value.some((one) => eq(actual, one));
    case 'NOT_IN': return Array.isArray(predicate.value) && !predicate.value.some((one) => eq(actual, one));
    case 'LTE': return Number(actual) <= Number(predicate.value);
    case 'GTE': return Number(actual) >= Number(predicate.value);
    case 'BETWEEN_INCLUSIVE': return Number(actual) >= Number(predicate.min) && Number(actual) <= Number(predicate.max);
    default: return false;
  }
}

function optionResult(row, context, selection) {
  const predicates = row.predicates ?? [];
  const missingPredicateFields = predicates.filter((predicate) => !has(context[predicate.field])).map((predicate) => predicate.field);
  if (missingPredicateFields.length) return { eligible: false, waiting: true, missingPredicateFields };
  const eligible = predicates.every((predicate) => predicateMatches(predicate, context));
  if (!eligible) return { eligible: false, waiting: false, missingPredicateFields: [] };
  const selectedOptions = new Set(selection.option ?? []);
  const missingRequiredOptions = (row.requires_options ?? []).filter((required) => !selectedOptions.has(required));
  const review = (row.review_rules ?? []).find((rule) => (rule.when ?? []).every((predicate) => predicateMatches(predicate, context)));
  return { eligible: missingRequiredOptions.length === 0, waiting: false, missingPredicateFields: [], missingRequiredOptions, review };
}

function fieldState(value, allowed, { visible = true, required = false, resolved = false, readOnly = false, unit = null, min = null, max = null } = {}) {
  return {
    value: has(value) ? clone(value) : null,
    state: resolved ? 'RESOLVED' : has(value) ? 'SELECTED' : 'UNSET',
    visibility: visible ? 'SHOW' : 'HIDE',
    required,
    allowed_values: allowed ?? [],
    readOnly,
    unit,
    min,
    max,
  };
}

function retainIfAllowed(selection, field, allowed, cleared, { autoSingleton = false } = {}) {
  if (has(selection[field]) && !allowed.some((candidate) => eq(candidate, selection[field]))) {
    cleared.push({ field, reason: 'DEPENDENCY', removed: clone(selection[field]) });
    delete selection[field];
  }
  if (!has(selection[field]) && autoSingleton && allowed.length === 1) selection[field] = allowed[0];
}

function handleAllowed(row, selection, designHardware) {
  const thermalOk = split(row.applicable_thermal_grade).includes(selection.thermal_spec);
  const key = selection.lock_type === 'MANUAL' ? 'MANUAL' : selection.lock_system;
  const keyOk = !key || split(row.applicable_key_package).includes(key);
  let designOk = row.applicable_design === 'ALL' || row.applicable_design === selection.design;
  if (row.applicable_design === 'ALL_MANUAL_ALLOWED_D50') designOk = Boolean(designHardware?.manual_key_allowed);
  return thermalOk && keyOk && designOk;
}

function sizeConstraint(data, selection) {
  return data.masterData.Design_Size_Constraints.find((row) => confirmed(row)
    && row.thermal_grade === selection.thermal_spec
    && row.fire_classification === selection.fire_classification
    && row.frame_system === selection.frame_system
    && row.design_id === selection.design
    && row.opening_configuration === selection.configuration
    && split(row.handing_scope).includes(selection.handing));
}

function applyStandardSize(selection, constraint) {
  if (!constraint || selection.size_mode !== 'STANDARD') return;
  selection.custom_width = constraint.standard_frame_width_mm;
  selection.custom_height = constraint.standard_frame_height_mm;
}

function sizeVerdict(selection, constraint) {
  if (!constraint || !selection.size_mode) return null;
  if (selection.size_mode === 'STANDARD') {
    return { status: 'PASS', message: `規格 W ${constraint.standard_frame_width_mm} × H ${constraint.standard_frame_height_mm}`, widthMm: constraint.standard_frame_width_mm, heightMm: constraint.standard_frame_height_mm };
  }
  if (!has(selection.custom_width) || !has(selection.custom_height)) return { status: 'PENDING', message: '特注W/Hを入力してください。' };
  const w = Number(selection.custom_width), h = Number(selection.custom_height);
  const widthOk = constraint.actual_width_size_order_allowed ? w >= constraint.actual_frame_width_min_mm && w <= constraint.actual_frame_width_max_mm : w === constraint.standard_frame_width_mm;
  const heightOk = constraint.actual_height_size_order_allowed ? h >= constraint.actual_frame_height_min_mm && h <= constraint.actual_frame_height_max_mm : h === constraint.standard_frame_height_mm;
  if (!widthOk || !heightOk) return { status: 'BLOCK', message: `製作範囲外です。W ${constraint.actual_frame_width_min_mm}〜${constraint.actual_frame_width_max_mm} / H ${constraint.actual_frame_height_min_mm}〜${constraint.actual_frame_height_max_mm}`, widthMm: w, heightMm: h };
  return { status: 'PASS', message: '特注サイズ製作範囲内です。', widthMm: w, heightMm: h };
}

export { FIELD_DEFS, normalizedValues, clone, confirmed, uniq, split, has, filterAllowedRows, retainIfAllowed, canonicalContext, optionResult, fieldState, handleAllowed, sizeConstraint, applyStandardSize, sizeVerdict };
