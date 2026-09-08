const ACTIVE = (row) => row?.active !== false;
const unique = (values) => [...new Set(values.filter((value) => value !== null && value !== undefined && value !== ''))];

const FIELD_SPECS = Object.freeze([
  ['window_type', '窓種類', 10, 'enum', 'REQUIRED', []],
  ['shutter_type', 'シャッター種類', 20, 'enum', 'REQUIRED', ['window_type']],
  ['grille_type', '面格子種類', 21, 'enum', 'REQUIRED', ['window_type']],
  ['operation_type', '操作仕様', 22, 'enum', 'REQUIRED', ['window_type']],
  ['door_grille_type', '網付格子種類', 23, 'enum', 'REQUIRED', ['window_type']],
  ['operator_position', 'オペレーター位置', 29, 'enum', 'REQUIRED', ['window_type']],
  ['handing', '開き勝手（吊元）', 30, 'enum', 'REQUIRED', ['window_type']],
  ['size_mode', 'サイズ方式', 40, 'enum', 'REQUIRED', ['window_type']],
  ['panel_count', '建具・枚数', 50, 'enum', 'REQUIRED', ['window_type','size_mode']],
  ['size', 'サイズ', 60, 'enum', 'REQUIRED', ['window_type','size_mode','panel_count']],
  ['exterior_color', '外観色', 70, 'enum', 'REQUIRED', ['window_type','size']],
  ['interior_color', '内観色', 80, 'enum', 'REQUIRED', ['window_type','size','exterior_color']],
  ['screen_presence', '網戸', 90, 'enum', 'REQUIRED', ['window_type','size','exterior_color','interior_color']],
  ['screen_type', '網戸形式', 100, 'enum', 'REQUIRED', ['window_type','size','screen_presence']],
  ['screen_midrail', '網戸中桟', 110, 'enum', 'REQUIRED', ['window_type','size','screen_presence','screen_type']],
  ['screen_net', '網戸ネット', 120, 'enum', 'REQUIRED', ['window_type','size','screen_presence','screen_type']],
  ['glass_base', 'ガラス', 130, 'enum', 'REQUIRED', ['window_type','size']],
  ['glass_type', 'ガラス種', 140, 'enum', 'REQUIRED', ['window_type','size','glass_base']],
  ['glass_detail', 'ガラス詳細', 150, 'enum', 'REQUIRED', ['window_type','size','glass_base','glass_type']],
  ['glass_function', 'ガラス追加機能', 160, 'enum', 'REQUIRED', ['window_type','size','glass_base','glass_type']],
  ['glass_spacer', 'スペーサー', 170, 'enum', 'REQUIRED', ['window_type','size','glass_base','glass_type','glass_detail']],
  ['glass_air_layer', '中空層', 180, 'enum', 'REQUIRED', ['window_type','size','glass_base','glass_type','glass_detail','glass_spacer']],
  ['option', 'その他オプション', 190, 'array', 'OPTIONAL', ['window_type','size','exterior_color','interior_color','glass_base']],
]);

function sourceRows(document, tableName) {
  const values = document.source_tables?.[tableName]?.values;
  if (!Array.isArray(values) || values.length < 3) return [];
  const header = values[2];
  if (!Array.isArray(header)) return [];
  return values.slice(3).map((row) => Object.fromEntries(header.map((key, index) => [key, row[index]])));
}

function valueRow(fieldName, value, label, source = {}, manualCheck = false, userSelectable = true) {
  return {
    value_id: `${fieldName}:${value}`,
    field_name: fieldName,
    canonical_value: value,
    display_label: label ?? String(value),
    status: 'CURRENT',
    runtime_selectable: true,
    user_selectable: userSelectable,
    manual_check: manualCheck,
    source,
  };
}

function optionScopes(document) {
  return sourceRows(document, '10C_TW_OP適用条件')
    .filter((row) => row['シリーズID'] === document.series_id && row['有効'] !== false)
    .map((row) => ({
      optionId: row.option_id,
      standardWindows: String(row['設定ありシリーズ窓種ID'] ?? '').split('|').filter(Boolean),
      specialOrderWindows: String(row['特注対応シリーズ窓種ID'] ?? '').split('|').filter(Boolean),
      uiTarget: row['UI表示先'] ?? null,
      note: row['注記マッピング'] ?? null,
      status: row['登録状態'] ?? null,
    }));
}

function buildValues(document) {
  const provider = document.provider;
  const values = [];
  for (const row of provider.windows.filter(ACTIVE).sort((a,b) => a.display_order - b.display_order)) {
    values.push(valueRow('window_type', row.id, row.label, row));
  }

  const fieldBySpecType = new Map([
    ['シャッター種類','shutter_type'],
    ['面格子種類','grille_type'],
    ['操作仕様','operation_type'],
    ['網付格子種類','door_grille_type'],
  ]);
  for (const row of sourceRows(document, '04_窓種固有仕様').filter((row) => row['シリーズID'] === document.series_id && row['有効'] !== false)) {
    const field = fieldBySpecType.get(row['固有仕様種別']);
    if (field) values.push(valueRow(field, row.spec_id, row['メーカー正式名称'] ?? row['表示名'], row, String(row['登録状態'] ?? '').includes('要')));
  }

  values.push(valueRow('handing', 'L', '左（L）'), valueRow('handing', 'R', '右（R）'));
  values.push(valueRow('operator_position', 'L', '左（L）'), valueRow('operator_position', 'R', '右（R）'));
  values.push(valueRow('size_mode', 'STANDARD', '規格'));
  for (const panel of ['2枚建','4枚建']) values.push(valueRow('panel_count', panel, panel));
  for (const row of provider.sizes.filter(ACTIVE)) {
    const context = [row.construction, row.configuration].filter(Boolean).join('・');
    const label = `${row.nominal_w} × ${row.nominal_h}${context ? `（${context}）` : ''}`;
    values.push(valueRow('size', row.id, label, row));
  }
  for (const row of provider.color_relations.filter(ACTIVE)) {
    values.push(valueRow('exterior_color', row.exterior_id, row.exterior_label, row));
    values.push(valueRow('interior_color', row.interior_id, row.interior_label, row));
  }
  values.push(valueRow('screen_presence', 'NONE', 'なし'), valueRow('screen_presence', 'YES', 'あり'));

  for (const row of sourceRows(document, '09A_網戸形式設定').filter((row) =>
    row['シリーズID'] === document.series_id && row['有効'] !== false && row['網戸形式'] !== 'なし')) {
    values.push(valueRow('screen_type', row['網戸形式ID'], row['メーカー正式名称'] ?? row['網戸形式'], row));
  }

  const scopes = optionScopes(document);
  const scopeByOption = new Map(scopes.map((row) => [row.optionId, row]));
  const derivedOptionIds = new Set(sourceRows(document, '10B_OP依存関係')
    .filter((row) => row['シリーズID'] === document.series_id && row['有効'] !== false && String(row['アクション']).startsWith('自動追加'))
    .map((row) => row['対象option_id']));
  for (const row of provider.options.filter(ACTIVE)) {
    const scope = scopeByOption.get(row.id);
    const screen = String(scope?.uiTarget ?? row.ui_target ?? '').startsWith('09_網戸');
    const manual = Boolean(scope?.specialOrderWindows.length && !scope.standardWindows.length);
    if (!screen) values.push(valueRow('option', row.id, row.label, { ...row, scope }, manual, !derivedOptionIds.has(row.id)));
  }
  for (const value of unique(provider.screens.filter(ACTIVE).map((row) => row.midrail)).filter((value) => value !== '対象外')) {
    values.push(valueRow('screen_midrail', value, value));
  }
  for (const value of unique(provider.screens.filter(ACTIVE).map((row) => row.mesh)).filter((value) => value !== '対象外')) {
    values.push(valueRow('screen_net', value, value));
  }
  for (const value of unique(provider.glass.filter(ACTIVE).map((row) => row.category))) values.push(valueRow('glass_base', value, value));
  for (const row of sourceRows(document, '08E_ガラス種').filter((row) => row['シリーズID'] === document.series_id && row['有効'] !== false)) {
    values.push(valueRow('glass_type', row.appearance_id, row['表示名'], row, String(row['登録状態'] ?? '').includes('要照合')));
  }
  for (const value of unique(provider.glass.filter(ACTIVE).map((row) => row.low_e))) values.push(valueRow('glass_detail', value, value));
  for (const row of sourceRows(document, '08D_ガラス追加機能').filter((row) => row['シリーズID'] === document.series_id && row['有効'] !== false)) {
    values.push(valueRow('glass_function', row.option_id, row['表示名'], row, String(row['登録状態'] ?? '').includes('要照合')));
  }
  for (const value of unique(provider.glass.filter(ACTIVE).map((row) => row.spacer))) values.push(valueRow('glass_spacer', value, value));
  for (const value of unique(provider.glass.filter(ACTIVE).map((row) => row.gas))) values.push(valueRow('glass_air_layer', value, value));

  const deduped = new Map();
  for (const row of values) deduped.set(`${row.field_name}\u0000${String(row.canonical_value)}`, row);
  return [...deduped.values()];
}

export function adaptTwCanonicalWorkbookReferenceV1(runtimePackage) {
  const document = runtimePackage.documents.runtime_master ?? runtimePackage.documents.RUNTIME_MASTER;
  if (!document?.provider || !Array.isArray(document.provider.windows) || !Array.isArray(document.provider.sizes)) {
    throw Object.assign(new Error('CANONICAL_WORKBOOK_REFERENCE_V1 requires provider windows and sizes'), { code: 'RUNTIME_ADAPTER_SCHEMA_MISMATCH' });
  }
  if (document.runtime_contract !== 'canonical_workbook_reference_v1_with_tw_option_code_linkage') {
    throw Object.assign(new Error(`Unsupported canonical workbook contract: ${document.runtime_contract}`), { code: 'RUNTIME_ADAPTER_CONTRACT_MISMATCH' });
  }
  const fields = FIELD_SPECS.map(([field_name, display_label, display_order, data_type, required_mode, parent_fields]) => ({
    field_id: `runtime:${field_name}`,
    field_name, display_label, display_order, data_type, required_mode, parent_fields,
    selection_mode: field_name === 'size_mode' ? 'AUTO_RESOLVE' : 'USER_SELECTABLE',
    visibility_mode: 'CONDITIONAL', runtime_included: true,
  }));
  return Object.freeze({
    manifest: runtimePackage.manifest,
    fields,
    values: buildValues(document),
    provider: document.provider,
    sourceRows: Object.freeze({
      specs: sourceRows(document, '04_窓種固有仕様').filter((row) => row['シリーズID'] === document.series_id && row['有効'] !== false),
      glassApplicability: sourceRows(document, '08A_ガラス適用条件').filter((row) => row['シリーズID'] === document.series_id && row['有効'] !== false),
      glassTypes: sourceRows(document, '08E_ガラス種').filter((row) => row['シリーズID'] === document.series_id && row['有効'] !== false),
      glassFunctions: sourceRows(document, '08D_ガラス追加機能').filter((row) => row['シリーズID'] === document.series_id && row['有効'] !== false),
      screenForms: sourceRows(document, '09A_網戸形式設定').filter((row) => row['シリーズID'] === document.series_id && row['有効'] !== false),
      specDimensionRules: sourceRows(document, '05B_固有仕様寸法ルール').filter((row) => row['シリーズID'] === document.series_id && String(row['有効']).toUpperCase() !== 'FALSE'),
      optionDependencies: sourceRows(document, '10B_OP依存関係').filter((row) => row['シリーズID'] === document.series_id && row['有効'] !== false),
      optionScopes: optionScopes(document),
    }),
    optionCodeLinkages: document.provider.option_code_linkages,
    optionCodeSourceLimitations: document.provider.option_code_source_limitations,
    qa: document.qa,
    capabilities: Object.freeze({
      target: 'SALES_PRODUCT_SELECTION',
      dependency: 'CANONICAL_PROVIDER_TABLES',
      size: 'STANDARD_SIZE_RECORDS_ONLY',
      standardSizeCount: document.provider.sizes.filter(ACTIVE).length,
      customSize: 'NOT_PROVIDED_BY_RUNTIME',
      screen: 'CANONICAL_PROVIDER_TABLES',
      glass: 'CANONICAL_PROVIDER_TABLES_WITH_MANUAL_CHECKS',
      option: 'CANONICAL_PROVIDER_TABLES',
      optionCodeLinkage: 'CONDITIONAL_RULES',
      optionCodeLinkageCount: document.provider.option_code_linkages.length,
      specialOrderEscalation: '標準SKUなし・公式発注コード未連動は推測せず要確認として扱います。',
    }),
  });
}
