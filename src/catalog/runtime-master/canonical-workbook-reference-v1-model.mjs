const ACTIVE = (row) => row?.active !== false && row?.有効 !== false;
const has = (value) => value !== undefined && value !== null && value !== '';
const uniq = (rows, key = (value) => JSON.stringify(value)) => {
  const seen = new Set();
  return rows.filter((row) => {
    const token = key(row);
    if (seen.has(token)) return false;
    seen.add(token);
    return true;
  });
};
const clone = (value) => structuredClone(value);
const same = (a, b) => Object.is(a, b);
const normalizeTable = (sourceTables, name, headerKey) => {
  const values = sourceTables?.[name]?.values ?? [];
  const headerIndex = values.findIndex((row) => row?.[0] === headerKey);
  if (headerIndex < 0) return [];
  const headers = values[headerIndex];
  return values.slice(headerIndex + 1).filter((row) => row?.some((cell) => cell !== null && cell !== undefined && cell !== '')).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index]]))
  );
};
const valueRow = (field, value, label, source = {}, { manualCheck = false } = {}) => ({
  value_id: `${field}:${value}`,
  field_name: field,
  canonical_value: value,
  display_label: label ?? String(value),
  status: 'CURRENT',
  manual_check: manualCheck,
  user_selectable: true,
  runtime_selectable: true,
  source,
});
const fieldDef = (field_name, display_label, display_order, data_type = 'enum', parent_fields = [], required_mode = 'OPTIONAL', selection_mode = 'USER_SELECTABLE', extra = {}) => ({
  field_name, display_label, display_order, data_type, parent_fields, required_mode, selection_mode, runtime_included: true, ...extra,
});
const meaningfulHanding = (raw) => {
  if (!has(raw)) return [];
  const token = String(raw).trim();
  if (['-', '―', '—', '対象外', 'なし'].includes(token)) return [];
  if (token === 'L/R' || token === 'R/L') return ['L', 'R'];
  return token.split(/[\/,、]/).map((x) => x.trim()).filter((x) => x && !['対象外','なし'].includes(x));
};
const selectedOne = (selection, field) => selection?.[field];
const selectedMany = (selection, field) => Array.isArray(selection?.[field]) ? selection[field] : has(selection?.[field]) ? [selection[field]] : [];
const sizeKey = (row) => `SIZE:${row.window_id}:${row.spec_id}:${row.size_code}:${row.actual_w}x${row.actual_h}`;
const sourceSpecId = (row) => row['固有仕様ID'] ?? row.spec_id;
const sourceWindowId = (row) => row['窓種ID'] ?? row.window_id;
const sourceGlassId = (row) => row['ガラス仕様ID'] ?? row.glass_spec_id;

function createModel(document) {
  if (document?.runtime_contract !== 'canonical_workbook_reference_v1') {
    const error = new Error(`Unsupported canonical workbook Runtime contract: ${document?.runtime_contract}`);
    error.code = 'RUNTIME_ADAPTER_SCHEMA_MISMATCH';
    throw error;
  }
  const provider = document.provider ?? {};
  const sourceTables = document.source_tables ?? {};

  const specs = normalizeTable(sourceTables, '04_窓種固有仕様', 'spec_id').filter(ACTIVE);
  const customRanges = normalizeTable(sourceTables, '06C_特注寸法範囲', 'range_id').filter(ACTIVE);
  const variants = normalizeTable(sourceTables, '02B_商品バリエーション', 'variant_id').filter(ACTIVE);
  const variantRelations = normalizeTable(sourceTables, '02C_バリエーション適用', 'relation_id').filter(ACTIVE);
  const variantExclusions = normalizeTable(sourceTables, '02D_バリエーション除外条件', 'rule_id').filter(ACTIVE);
  const designColors = normalizeTable(sourceTables, '07B_EWforDesign色', 'color_relation_id').filter(ACTIVE);
  const glassDetails = normalizeTable(sourceTables, '08B_ガラス詳細', 'glass_detail_id').filter(ACTIVE);
  const glassFeatures = normalizeTable(sourceTables, '08C_ガラス追加機能', 'feature_id').filter(ACTIVE);
  const screenNetSpecs = normalizeTable(sourceTables, '09B_網戸ネット仕様', 'net_spec_id').filter(ACTIVE);
  const screenRules = normalizeTable(sourceTables, '09C_網戸適用ルール', 'rule_id').filter(ACTIVE);
  const screenOrderRules = normalizeTable(sourceTables, '09F_機能性ネット発注条件', 'rule_id').filter(ACTIVE);
  const validationRules = normalizeTable(sourceTables, '15_Validation', 'validation_code').filter(ACTIVE);

  const windows = (provider.windows ?? []).filter(ACTIVE);
  const sizes = (provider.sizes ?? []).filter(ACTIVE);
  const colors = (provider.color_relations ?? []).filter(ACTIVE);
  const screens = (provider.screens ?? []).filter(ACTIVE);
  const glasses = (provider.glass ?? []).filter(ACTIVE);
  const options = (provider.options ?? []).filter(ACTIVE);
  const optionApplicability = (provider.option_applicability ?? []).filter(ACTIVE);

  const sizeGroups = new Map();
  for (const row of sizes) {
    const key = sizeKey(row);
    const prior = sizeGroups.get(key) ?? {
      id: key,
      window_id: row.window_id,
      spec_id: row.spec_id,
      nominal_w: row.nominal_w,
      nominal_h: row.nominal_h,
      size_code: row.size_code,
      actual_w: row.actual_w,
      actual_h: row.actual_h,
      handing: row.handing,
      glass_ids: [],
      source_ids: [],
    };
    prior.glass_ids.push(row.glass_spec_id);
    prior.source_ids.push(row.id);
    sizeGroups.set(key, prior);
  }
  const normalizedSizes = [...sizeGroups.values()].map((row) => ({
    ...row,
    glass_ids: [...new Set(row.glass_ids.filter(has))],
    source_ids: [...new Set(row.source_ids.filter(has))],
  }));

  const standardVariant = variants.find((row) => row['既定'] === true || row['既定'] === 'TRUE')?.variant_id ?? variants[0]?.variant_id ?? null;
  const designVariantIds = new Set(variantRelations.map((row) => row.variant_id).filter(has));

  const fields = [
    fieldDef('window_type','窓種類',30,'enum',[],'REQUIRED'),
    fieldDef('window_spec','窓種固有仕様',40,'enum',['window_type'],'REQUIRED'),
    fieldDef('variant','商品バリエーション',45,'enum',['window_type','window_spec'],'OPTIONAL'),
    fieldDef('handing','開き勝手（吊元）',50,'enum',['window_type','window_spec'],'OPTIONAL'),
    fieldDef('size_mode','サイズ方式',60,'enum',['window_type','window_spec'],'REQUIRED'),
    fieldDef('size','サイズ',80,'enum',['window_type','window_spec','size_mode'],'OPTIONAL'),
    fieldDef('custom_w','特注W',81,'number',['window_type','window_spec','size_mode'],'OPTIONAL','USER_SELECTABLE',{unit:'mm'}),
    fieldDef('custom_h','特注H',82,'number',['window_type','window_spec','size_mode'],'OPTIONAL','USER_SELECTABLE',{unit:'mm'}),
    fieldDef('exterior_color','外観色',90,'enum',['window_type','window_spec'],'REQUIRED'),
    fieldDef('interior_color','内観色',100,'enum',['exterior_color'],'REQUIRED'),
    fieldDef('screen_presence','網戸',110,'enum',['window_type'],'OPTIONAL'),
    fieldDef('screen_form','網戸形式',112,'enum',['window_type','screen_presence'],'OPTIONAL'),
    fieldDef('screen_midrail','網戸中桟',114,'enum',['window_type','screen_presence','screen_form'],'OPTIONAL'),
    fieldDef('screen_net','網戸ネット',116,'enum',['window_type','screen_presence','screen_form'],'OPTIONAL'),
    fieldDef('glass_base','ガラス',120,'enum',['window_type','window_spec','size_mode'],'REQUIRED'),
    fieldDef('glass_detail','ガラス詳細',140,'enum',['glass_base'],'OPTIONAL'),
    fieldDef('glass_function','ガラス追加機能',150,'array',['glass_base'],'OPTIONAL'),
    fieldDef('glass_spacer','スペーサー',160,'enum',['glass_base','glass_detail'],'OPTIONAL','AUTO_RESOLVE'),
    fieldDef('glass_air_layer','中空層',170,'enum',['glass_base','glass_detail'],'OPTIONAL','AUTO_RESOLVE'),
    fieldDef('option','その他オプション',210,'array',['window_type','window_spec'],'OPTIONAL'),
  ];

  const values = [];
  for (const row of windows) values.push(valueRow('window_type',row.id,row.label,row));
  for (const row of specs) values.push(valueRow('window_spec',row.spec_id,row['表示名'] ?? row['メーカー正式名称'] ?? row.spec_id,row));
  for (const row of variants) values.push(valueRow('variant',row.variant_id,row['UI表示名'] ?? row['表示名'] ?? row.variant_id,row));
  for (const value of ['L','R']) values.push(valueRow('handing',value,value === 'L' ? '左吊元（L）' : '右吊元（R）'));
  values.push(valueRow('size_mode','STANDARD','規格'));
  values.push(valueRow('size_mode','CUSTOM','特注'));
  for (const row of normalizedSizes) values.push(valueRow('size',row.id,`${row.size_code} ｜ ${row.actual_w}×${row.actual_h}mm`,{
    ...row,
    metadata: { callW: row.nominal_w, callH: row.nominal_h, callCode: row.size_code, actualW: row.actual_w, actualH: row.actual_h, sizeCode: row.size_code },
  }));
  const allColorRows = [
    ...colors.map((row) => ({
      variant_id: standardVariant,
      exterior_id: row.exterior_id,
      exterior_label: row.exterior_label,
      interior_id: row.interior_id,
      interior_label: row.interior_label,
      available: row.available ?? true,
      source: row,
    })),
    ...designColors.map((row) => ({
      variant_id: row.variant_id,
      exterior_id: row['外観色ID'],
      exterior_label: row['外観色表示名'],
      interior_id: row['内観色ID'],
      interior_label: row['内観色表示名'],
      available: row['組合せ可否'],
      source: row,
    })),
  ];
  for (const row of uniq(allColorRows.filter((row) => row.available === true || row.available === '○' || row.available === '可'), (row) => row.exterior_id)) {
    values.push(valueRow('exterior_color',row.exterior_id,row.exterior_label,row.source));
  }
  for (const row of uniq(allColorRows.filter((row) => row.available === true || row.available === '○' || row.available === '可'), (row) => row.interior_id)) {
    values.push(valueRow('interior_color',row.interior_id,row.interior_label,row.source));
  }
  values.push(valueRow('screen_presence','なし','なし'));
  values.push(valueRow('screen_presence','あり','あり'));
  for (const row of uniq(screens.filter((row) => row.presence === 'あり'), (row) => row.screen_type ?? row.label)) {
    const value = row.screen_type ?? row.label;
    if (has(value)) values.push(valueRow('screen_form',value,value,row));
  }
  for (const row of uniq(screens.filter((row) => has(row.midrail) && !['対象外','なし（固定）'].includes(row.midrail)), (row) => row.midrail)) {
    values.push(valueRow('screen_midrail',row.midrail,row.midrail,row));
  }
  for (const row of uniq(screens.filter((row) => has(row.mesh) && row.mesh !== '対象外'), (row) => row.mesh)) {
    const manualCheck = row.unconfirmed_state === 'NEEDS_MFR_CONFIRMATION' || String(row.status ?? '').includes('メーカー確認') ||
      screenOrderRules.some((rule) => rule['ネット種類'] === row.mesh && rule['未確認時アプリ状態'] === 'NEEDS_MFR_CONFIRMATION');
    values.push(valueRow('screen_net',row.mesh,row.mesh,row,{manualCheck}));
  }
  for (const row of glasses) values.push(valueRow('glass_base',row.id,row.category ?? row['ガラス大分類'] ?? row.label ?? row.id,row));
  for (const row of glassDetails) values.push(valueRow('glass_detail',row.glass_detail_id,row['表示名'] ?? row.glass_detail_id,row));
  for (const row of glassFeatures) values.push(valueRow('glass_function',row.feature_id,row['表示名'] ?? row.feature_id,row));
  for (const row of uniq([...glasses.map((row) => row.spacer ?? row['スペーサー']), ...glassDetails.map((row) => row['スペーサー'])].filter(has), (row) => row)) {
    values.push(valueRow('glass_spacer',row,row));
  }
  for (const row of uniq([...glasses.map((row) => row.gas ?? row['基本ガス']), ...glassDetails.map((row) => row['ガス'])].filter(has), (row) => row)) {
    values.push(valueRow('glass_air_layer',row,row));
  }
  for (const row of options) values.push(valueRow('option',row.id,row.label ?? row['表示名'] ?? row.id,row));

  return {
    document, provider, sourceTables,
    windows, specs, customRanges, variants, variantRelations, variantExclusions, designVariantIds, standardVariant,
    colors: allColorRows, screens, screenNetSpecs, glasses, glassDetails, glassFeatures, screenRules, screenOrderRules, validationRules,
    options, optionApplicability, normalizedSizes, fields, values,
  };
}

function baseValueRows(model, field) {
  return model.values.filter((row) => row.field_name === field && row.status === 'CURRENT' && row.runtime_selectable !== false);
}
function labelsToValues(rows) { return rows.map((row) => row.canonical_value); }
function findSize(model, id) { return model.normalizedSizes.find((row) => row.id === id); }

export { ACTIVE, has, uniq, clone, same, meaningfulHanding, selectedOne, selectedMany, sourceSpecId, sourceWindowId, sourceGlassId, createModel, baseValueRows, labelsToValues, findSize };
