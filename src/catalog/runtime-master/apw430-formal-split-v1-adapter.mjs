const active = (row) => row?.active !== false && row?.['有効'] !== false && row?.selectable !== false;
const unique = (values) => [...new Set(values.filter((value) => value !== undefined && value !== null && value !== ''))];
const split = (value) => String(value ?? '').split(/[|・、,]/).map((part) => part.trim()).filter(Boolean);
const scalar = (value) => Array.isArray(value) ? value[0] : value;

function field(key, displayLabel, values, { required = false, dataType = 'ENUM', readOnly = false } = {}) {
  return { key, displayLabel, displayOrder: 0, dataType, required, readOnly, values };
}
function choice(value, displayLabel, runtimeValueRow = null) {
  return { value, displayLabel: displayLabel ?? String(value), manualCheck: false, disabled: false, ...(runtimeValueRow ? { runtimeValueRow } : {}) };
}
function same(a, b) { return String(a) === String(b); }
function isEmpty(value) { return value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length); }

function canonicalDocuments(runtimePackage) {
  const core = runtimePackage.documents.CORE;
  const dimensions = runtimePackage.documents.DIMENSIONS;
  const options = runtimePackage.documents.OPTIONS;
  if (!core || !dimensions || !options) {
    const error = new Error('APW430 formal split Runtime requires CORE, DIMENSIONS and OPTIONS documents');
    error.code = 'APW430_FORMAL_SPLIT_INCOMPLETE';
    throw error;
  }
  return { core, dimensions, options };
}

function specCandidates(core, window) {
  const allowed = new Set((core.availability_relations ?? []).filter((row) => active(row) && row['選択可否'] === '可' && row['窓種ID'] === window.commonWindowId).map((row) => row['固有仕様ID']));
  return (core.specific_specs ?? []).filter((row) => active(row) && row['窓種ID'] === window.commonWindowId && allowed.has(row.spec_id))
    .sort((a, b) => Number(a['表示順'] ?? 9999) - Number(b['表示順'] ?? 9999));
}

function specialSpecAllows(dimensions, row, specId, panelCount) {
  if (!specId) return true;
  const denied = (dimensions.specific_spec_size_exceptions ?? []).some((rule) => active(rule) && rule['固有仕様ID'] === specId && rule.size_id === row.id && rule['選択可否'] === '不可');
  if (denied) return false;
  const rules = (dimensions.special_spec_applicability ?? []).filter((rule) => active(rule) && rule['固有仕様ID'] === specId && rule['シリーズ窓種ID'] === row.seriesWindowId);
  if (!rules.length) return true;
  return rules.some((rule) => {
    if (rule['選択可否'] !== '可') return false;
    if (rule['建数条件'] && rule['建数条件'] !== '*' && !same(rule['建数条件'], panelCount ?? row.panelCount)) return false;
    const condition = String(rule['size_id条件'] ?? '*');
    const mode = rule['size_id一致方式'];
    if (mode === 'EXACT' && row.id !== condition) return false;
    if (mode === 'PREFIX' && !row.id.startsWith(condition)) return false;
    const h = Number(row.actualH);
    if (rule['最小実寸H'] !== null && rule['最小実寸H'] !== undefined && h < Number(rule['最小実寸H'])) return false;
    if (rule['最大実寸H'] !== null && rule['最大実寸H'] !== undefined && h > Number(rule['最大実寸H'])) return false;
    return true;
  });
}

function rowsForAxes(dimensions, selection, specId, { ignoreConfiguration = false, ignorePanel = false, ignoreHanding = false } = {}) {
  return (dimensions.standard_sizes ?? []).filter((row) => active(row) && row.seriesWindowId === selection.window_type)
    .filter((row) => specialSpecAllows(dimensions, row, specId, selection.panel_count))
    .filter((row) => ignoreConfiguration || !row.windowConfiguration || same(row.windowConfiguration, selection.window_configuration))
    .filter((row) => ignorePanel || !row.panelCount || same(row.panelCount, selection.panel_count))
    .filter((row) => ignoreHanding || !row.handingRequired || (row.handingCandidates ?? []).some((value) => same(value, selection.handing)));
}

function colorRelations(core, windowId) {
  const denied = new Set((core.color_applicability_rules ?? []).filter((row) => active(row) && row['シリーズ窓種ID'] === windowId && row['選択可否'] === '不可').map((row) => row.color_id));
  return (core.colors ?? []).filter((row) => active(row) && row['組合せ可否'] === '可' && !denied.has(row.color_relation_id));
}

function screenForms(options, windowId, sizeId) {
  let forms = (options.screen_forms ?? []).filter((row) => active(row) && row['シリーズ窓種ID'] === windowId && row['網戸形式'] !== 'なし');
  if (sizeId) {
    const rule = (options.screen_size_rules ?? []).find((row) => active(row) && row.size_id === sizeId && row['シリーズ窓種ID'] === windowId);
    if (rule?.['許可網戸形式']) {
      const allowed = new Set(String(rule['許可網戸形式']).split('|').map((value) => value.trim()).filter(Boolean));
      forms = forms.filter((row) => allowed.has(row['網戸形式']));
    }
  }
  return forms;
}

function screenNets(options, window) {
  const common = window?.commonWindowId;
  return unique((options.screen_master ?? []).filter((row) => active(row) && row['窓種ID'] === common && row['網戸有無'] === 'あり').map((row) => row['ネット種類']));
}

function glassChoices(options, windowId, sizeId) {
  const app = (options.glass_applicability ?? []).find((row) => active(row) && row['シリーズ窓種ID'] === windowId);
  const sizeRule = (options.size_glass_rules ?? []).find((row) => row.size_id === sizeId && row['シリーズ窓種ID'] === windowId);
  return (options.glass_master ?? []).filter(active).filter((row) => {
    const triple = String(row['ガラス大分類']).includes('トリプル');
    if (triple && app && !['可', '○', true].includes(app['トリプルガラス'])) return false;
    if (!triple && app && !['可', '○', true].includes(app['複層ガラス'])) return false;
    if (sizeRule) {
      const flag = triple ? sizeRule['トリプル可否'] : sizeRule['複層可否'];
      if (['不可', '×', false].includes(flag)) return false;
    }
    return true;
  });
}

function optionChoices(options, selection) {
  const rows = (options.other_options ?? []).filter(active);
  return rows.filter((option) => !(options.option_dependencies ?? []).some((rule) => {
    if (!active(rule) || rule['対象option_id'] !== option.option_id || rule['アクション'] !== '選択不可') return false;
    const targets = split(rule['対象シリーズ窓種ID']);
    if (targets.length && !targets.includes('*') && !targets.includes(selection.window_type)) return false;
    if (rule['条件項目'] === '外観色') {
      const relationIds = split(rule['条件値']);
      return relationIds.includes(selection.color_relation_id);
    }
    return true;
  }));
}

export function adaptApw430FormalSplitV1(runtimePackage) {
  const { core, dimensions, options } = canonicalDocuments(runtimePackage);
  const windows = (core.series_windows ?? []).filter((row) => active(row) && row.productId === 'SER-YKK-APW430')
    .sort((a, b) => Number(a.displayOrder ?? 9999) - Number(b.displayOrder ?? 9999));
  const windowById = new Map(windows.map((row) => [row.id, row]));

  function resolveUi(inputSelection = {}) {
    const original = { ...(inputSelection ?? {}) };
    delete original.construction;
    delete original.legacyConstruction;
    delete original.legacyConfiguration;
    const selection = {};
    const fields = [];
    const notices = [];
    const manualWarnings = [];

    fields.push(field('window_type', '窓種類', windows.map((row) => choice(row.id, row.displayName, row)), { required: true }));
    const requestedWindow = scalar(original.window_type);
    const window = windowById.get(requestedWindow);
    if (!window) return finalize();
    selection.window_type = requestedWindow;

    const specs = specCandidates(core, window);
    if (specs.length) {
      fields.push(field('window_spec', window.specificSpecType || '窓種固有仕様', specs.map((row) => choice(row.spec_id, row['表示名'], row)), { required: true }));
      if (specs.some((row) => row.spec_id === original.window_spec)) selection.window_spec = original.window_spec;
      if (!selection.window_spec) return finalize();
    }

    let axisRows = rowsForAxes(dimensions, selection, selection.window_spec, { ignoreConfiguration: true, ignorePanel: true, ignoreHanding: true });
    const configurations = unique(axisRows.map((row) => row.windowConfiguration));
    if (configurations.length) {
      fields.push(field('window_configuration', '連窓構成', configurations.map((value) => choice(value, value)), { required: true }));
      if (configurations.includes(original.window_configuration)) selection.window_configuration = original.window_configuration;
      if (!selection.window_configuration) return finalize();
    }

    axisRows = rowsForAxes(dimensions, selection, selection.window_spec, { ignorePanel: true, ignoreHanding: true });
    const handings = unique(axisRows.filter((row) => row.handingRequired).flatMap((row) => row.handingCandidates ?? []).filter((value) => ['L', 'R'].includes(String(value))));
    if (handings.length) {
      fields.push(field('handing', '開き勝手（吊元）', handings.map((value) => choice(value, value)), { required: true }));
      if (handings.includes(original.handing)) selection.handing = original.handing;
      if (!selection.handing) return finalize();
    }

    const customRule = (dimensions.custom_dimension_rules ?? []).find((row) => active(row) && (row.productNode === window.id || row.selector?.seriesWindowId === window.id || row.selector?.window_type === window.id));
    const sizeModes = ['STANDARD', ...(customRule ? ['CUSTOM'] : [])];
    fields.push(field('size_mode', 'サイズ方式', sizeModes.map((value) => choice(value, value === 'STANDARD' ? '規格サイズ' : '特注寸法')), { required: true }));
    selection.size_mode = sizeModes.includes(original.size_mode) ? original.size_mode : 'STANDARD';

    axisRows = rowsForAxes(dimensions, selection, selection.window_spec, { ignorePanel: true, ignoreHanding: false });
    const panels = unique(axisRows.map((row) => row.panelCount));
    if (panels.length) {
      fields.push(field('panel_count', '建具・枚数', panels.map((value) => choice(value, value)), { required: true }));
      if (panels.includes(original.panel_count)) selection.panel_count = original.panel_count;
      if (!selection.panel_count) return finalize();
    }

    if (selection.size_mode === 'CUSTOM') {
      fields.push(field('custom_width', '特注W（mm）', [], { required: true, dataType: 'NUMBER' }));
      fields.push(field('custom_height', '特注H（mm）', [], { required: true, dataType: 'NUMBER' }));
      if (Number.isFinite(Number(original.custom_width))) selection.custom_width = Number(original.custom_width);
      if (Number.isFinite(Number(original.custom_height))) selection.custom_height = Number(original.custom_height);
      manualWarnings.push('APW430特注寸法は正式Runtime safety policyにより自動確定しません。公式資料による最終確認が必要です。');
    } else {
      const sizeRows = rowsForAxes(dimensions, selection, selection.window_spec);
      fields.push(field('size', 'サイズ', sizeRows.map((row) => choice(row.id, `${row.nominalW}${row.nominalH}`, row)), { required: true }));
      if (sizeRows.some((row) => row.id === original.size)) selection.size = original.size;
      if (!selection.size) return finalize();
    }

    const colors = colorRelations(core, selection.window_type);
    const exteriors = unique(colors.map((row) => row['外観色ID']));
    fields.push(field('exterior_color', '外観色', exteriors.map((id) => choice(id, colors.find((row) => row['外観色ID'] === id)?.['外観色表示名'])), { required: true }));
    if (exteriors.includes(original.exterior_color)) selection.exterior_color = original.exterior_color;
    if (!selection.exterior_color) return finalize();

    const interiors = colors.filter((row) => row['外観色ID'] === selection.exterior_color);
    const interiorIds = unique(interiors.map((row) => row['内観色ID']));
    fields.push(field('interior_color', '内観色', interiorIds.map((id) => choice(id, interiors.find((row) => row['内観色ID'] === id)?.['内観色表示名'])), { required: true }));
    if (interiorIds.includes(original.interior_color)) selection.interior_color = original.interior_color;
    if (!selection.interior_color) return finalize();
    const colorRelation = interiors.find((row) => row['内観色ID'] === selection.interior_color);
    if (colorRelation) selection.color_relation_id = colorRelation.color_relation_id;

    const forms = screenForms(options, selection.window_type, selection.size);
    if (forms.length) {
      fields.push(field('screen_presence', '網戸', [choice('なし', 'なし'), choice('あり', 'あり')]));
      if (['なし', 'あり'].includes(original.screen_presence)) selection.screen_presence = original.screen_presence;
      if (selection.screen_presence === 'あり') {
        fields.push(field('screen_form', '網戸形式', forms.map((row) => choice(row['網戸形式ID'], row['網戸形式'], row)), { required: true }));
        if (forms.some((row) => row['網戸形式ID'] === original.screen_form)) selection.screen_form = original.screen_form;
        const nets = screenNets(options, window);
        if (selection.screen_form && nets.length) {
          fields.push(field('screen_net', '網戸ネット', nets.map((value) => choice(value, value)), { required: true }));
          if (nets.includes(original.screen_net)) selection.screen_net = original.screen_net;
        }
      }
    }

    if (selection.size_mode === 'STANDARD' && selection.size) {
      const glass = glassChoices(options, selection.window_type, selection.size);
      if (glass.length) {
        fields.push(field('glass_base', 'ガラス', glass.map((row) => choice(row.glass_id, `${row['ガラス大分類']}｜${row['Low-E区分']}｜${row['見え方']}`, row)), { required: true }));
        if (glass.some((row) => row.glass_id === original.glass_base)) selection.glass_base = original.glass_base;
        if (selection.glass_base) {
          const selectedGlass = glass.find((row) => row.glass_id === selection.glass_base);
          const functions = (options.glass_additional_options ?? []).filter(active).filter((row) => String(selectedGlass['ガラス大分類']).includes('トリプル') ? row['トリプル適用'] !== '不可' : row['ペア適用'] !== '不可');
          if (functions.length) fields.push(field('glass_function', 'ガラス追加機能', functions.map((row) => choice(row.option_id, row['表示名'], row))));
          if (functions.some((row) => row.option_id === original.glass_function)) selection.glass_function = original.glass_function;
          const appearances = (options.glass_appearances ?? []).filter(active).filter((row) => String(selectedGlass['ガラス大分類']).includes('トリプル') ? row['トリプル適用'] !== '不可' : row['ペア適用'] !== '不可');
          if (appearances.length) fields.push(field('glass_type', 'ガラス種', appearances.map((row) => choice(row.appearance_id, row['表示名'], row))));
          if (appearances.some((row) => row.appearance_id === original.glass_type)) selection.glass_type = original.glass_type;
        }
      }
    }

    const optionRows = optionChoices(options, selection);
    if (optionRows.length) {
      fields.push(field('option', 'その他オプション', optionRows.map((row) => choice(row.option_id, row['表示名'], row)), { dataType: 'MULTI_ENUM' }));
      const requested = Array.isArray(original.option) ? original.option : isEmpty(original.option) ? [] : [original.option];
      selection.option = requested.filter((id) => optionRows.some((row) => row.option_id === id));
      if (!selection.option.length) delete selection.option;
      if (selection.option?.includes('OP-YKK-APW430-ADDED-INSULATION-SILL') && selection.exterior_color !== 'EXT-YKK-YW') {
        const lower = optionRows.find((row) => row.option_id === 'OP-YKK-APW430-LOWER-FRAME-COVER');
        if (lower && !selection.option.includes(lower.option_id)) {
          selection.option.push(lower.option_id);
          notices.push('付加断熱用水切＋外観色ホワイト以外のため、下枠カバーを必須自動追加しました。');
        }
      }
    }

    return finalize();

    function finalize() {
      delete selection.color_relation_id;
      const visibleKeys = new Set(fields.map((row) => row.key));
      for (const key of Object.keys(selection)) if (!visibleKeys.has(key)) delete selection[key];
      const missingRequiredFields = fields.filter((row) => row.required && isEmpty(selection[row.key])).map((row) => row.key);
      const clearedFields = Object.keys(original).filter((key) => key !== 'construction' && !Object.prototype.hasOwnProperty.call(selection, key));
      return {
        selection,
        internalSelection: { ...selection },
        fields,
        notices,
        manualWarnings,
        dimensionResult: selection.size ? (dimensions.standard_sizes ?? []).find((row) => row.id === selection.size) ?? null : null,
        clearedFields,
        validation: { status: missingRequiredFields.length ? 'INCOMPLETE' : manualWarnings.length ? 'MANUAL_CHECK' : 'VALID', errors: [], missingRequiredFields },
        orderReady: false,
      };
    }
  }

  return Object.freeze({ master: null, resolver: null, uiResolver: resolveUi });
}
