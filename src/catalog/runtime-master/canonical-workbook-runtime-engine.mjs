const has = (value) => value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length > 0);
const same = (a, b) => Object.is(a, b);
const unique = (values) => [...new Set(values.filter(has))];
const clone = (value) => structuredClone(value);

function windowRow(master, selection) {
  return master.provider.windows.find((row) => row.id === selection.window_type && row.active !== false) ?? null;
}

function panelCount(row) {
  if (String(row.configuration ?? '').includes('4枚建') || /-4(?:$|\D)/.test(String(row.nominal_w ?? ''))) return '4枚建';
  return '2枚建';
}

function sizeRows(master, selection) {
  if (!selection.window_type) return [];
  return master.provider.sizes.filter((row) => row.active !== false && row.window_id === selection.window_type &&
    (!selection.panel_count || panelCount(row) === selection.panel_count));
}

function specField(specType) {
  return ({ 'シャッター種類':'shutter_type', '面格子種類':'grille_type', '操作仕様':'operation_type', '網付格子種類':'door_grille_type' })[specType] ?? null;
}

function categoryColumn(category) {
  return category === 'トリプルガラス' ? 'トリプル適用' : category === 'Low-E複層ガラス' ? 'ペア適用' : null;
}

function optionScope(master, optionId) {
  return master.sourceRows.optionScopes.find((row) => row.optionId === optionId) ?? null;
}

function scopedOptions(master, fieldName, windowId, selection = {}) {
  if (!windowId) return [];
  return master.values.filter((row) => row.field_name === fieldName).filter((row) => {
    const scope = optionScope(master, row.canonical_value) ?? row.source?.scope;
    if (!scope || ![...scope.standardWindows, ...scope.specialOrderWindows].includes(windowId)) return false;
    if (String(scope.note ?? '').includes('トリプルガラス不可') && selection.glass_base === 'トリプルガラス') return false;
    const size = master.provider.sizes.find((candidate) => candidate.id === selection.size);
    return !master.sourceRows.optionDependencies.some((rule) => {
      if (rule['対象option_id'] !== row.canonical_value || rule['アクション'] !== '選択不可') return false;
      if (!String(rule['対象シリーズ窓種ID'] ?? '').split('|').includes(windowId)) return false;
      const trigger = rule['トリガーoption_id'];
      if (trigger && trigger !== '-' && !(selection.option ?? []).includes(trigger)) return false;
      const key = rule['条件項目'], condition = String(rule['条件値'] ?? '');
      if (key === '窓種適用') return true;
      if (key === '建て方/区分') return condition === 'テラス以外' && !String(size?.configuration ?? '').includes('テラス');
      if (key === '障子枚数') return String(selection.panel_count ?? '').startsWith(condition);
      if (key === '実寸W(mm)') return dimensionCondition(`W${condition}`, dimensionContext(master, selection)) === true;
      if (key === 'ガラス大分類') return condition === 'トリプル' && selection.glass_base === 'トリプルガラス';
      if (key === '電動仕様' && condition === '非電動') {
        return !String(selection.shutter_type ?? selection.operation_type ?? '').includes('ELE');
      }
      if (key === '選択状態') return true;
      return false;
    });
  }).map((row) => row.canonical_value);
}

function filterSpecsByFormalRules(master, selection, specs) {
  const rules = master.sourceRows.specDimensionRules.filter((row) => row['シリーズ窓種ID'] === selection.window_type);
  const denied = new Set(rules.filter((row) => row['ルール種別'] === 'WINDOW_TYPE_DENY').map((row) => row['固有仕様ID']));
  let result = specs.filter((row) => !denied.has(row.spec_id));
  if (!selection.size) return result;
  const allowOnly = rules.filter((row) => row['ルール種別'] === 'SIZE_ALLOW_ONLY' && row['size_id/条件'] === selection.size);
  if (allowOnly.length) return result.filter((row) => allowOnly.some((rule) => rule['固有仕様ID'] === row.spec_id));
  const size = master.provider.sizes.find((row) => row.id === selection.size);
  const dimensionRules = rules.filter((row) => row['ルール種別'] === 'DIMENSION_ALLOW');
  if (!dimensionRules.length || !size) return result;
  return result.filter((row) => {
    const rule = dimensionRules.find((candidate) => candidate['固有仕様ID'] === row.spec_id);
    if (!rule) return false;
    const w = Number(size.actual_w), h = Number(size.actual_h);
    return (!has(rule['最小W']) || w >= Number(rule['最小W'])) && (!has(rule['最大W']) || w <= Number(rule['最大W'])) &&
      (!has(rule['最小H']) || h >= Number(rule['最小H'])) && (!has(rule['最大H']) || h <= Number(rule['最大H'])) &&
      (!has(rule['H/W上限']) || h / w <= Number(rule['H/W上限']));
  });
}

function compute(master, selection) {
  const allowed = new Map(master.fields.map((field) => [field.field_name, []]));
  const visible = new Set(['window_type']);
  allowed.set('window_type', master.provider.windows.filter((row) => row.active !== false).sort((a,b) => a.display_order - b.display_order).map((row) => row.id));
  const win = windowRow(master, selection);
  if (!win) return { allowed, visible };

  const specKey = specField(win.spec_type);
  if (specKey) {
    const specs = filterSpecsByFormalRules(master, selection, master.sourceRows.specs.filter((row) => row['窓種ID'] === win.common_window_id && row['固有仕様種別'] === win.spec_type)).sort((a,b) => Number(a['表示順']) - Number(b['表示順']));
    if (specs.length) { visible.add(specKey); allowed.set(specKey, specs.map((row) => row.spec_id)); }
  }

  const sizes = sizeRows(master, selection);
  const directions = unique(sizes.filter((row) => row.direction_required).flatMap((row) => String(row.direction_options ?? '').split(',')).map((value) => value.trim()));
  const directionTypes = new Set(sizes.filter((row) => row.direction_required).map((row) => row.direction_type));
  if (directions.length && directionTypes.has('吊元')) { visible.add('handing'); allowed.set('handing', directions); }
  if (directions.length && directionTypes.has('オペレーター位置')) { visible.add('operator_position'); allowed.set('operator_position', directions); }

  visible.add('size_mode'); allowed.set('size_mode', ['STANDARD']);
  const allWindowSizes = master.provider.sizes.filter((row) => row.active !== false && row.window_id === selection.window_type);
  const hasFourPanelRecords = allWindowSizes.some((row) => panelCount(row) === '4枚建');
  const panels = hasFourPanelRecords ? unique(allWindowSizes.map(panelCount)) : [];
  if (panels.length) { visible.add('panel_count'); allowed.set('panel_count', panels); }
  if (!panels.length || selection.panel_count) { visible.add('size'); allowed.set('size', sizes.map((row) => row.id)); }

  if (selection.size) {
    visible.add('exterior_color');
    allowed.set('exterior_color', unique(master.provider.color_relations.filter((row) => row.active !== false).map((row) => row.exterior_id)));
    if (selection.exterior_color) {
      visible.add('interior_color');
      allowed.set('interior_color', unique(master.provider.color_relations.filter((row) => row.active !== false && row.exterior_id === selection.exterior_color).map((row) => row.interior_id)));
    }
  }

  if (selection.size && selection.exterior_color && selection.interior_color) {
    const screenForms = master.sourceRows.screenForms.filter((row) =>
      row['シリーズ窓種ID'] === selection.window_type && row['網戸形式'] !== 'なし');
    if (screenForms.length) {
      visible.add('screen_presence');
      const mandatory = screenForms.some((row) => row['選択方式'] === '必須');
      allowed.set('screen_presence', mandatory ? ['YES'] : ['NONE','YES']);
    }
    if (selection.screen_presence === 'YES' && screenForms.length) {
      visible.add('screen_type'); allowed.set('screen_type', screenForms.map((row) => row['網戸形式ID']));
      const matchingScreens = master.provider.screens.filter((row) => row.active !== false && (row.common_window_id === win.common_window_id || row.common_window_id === '*'));
      const selectedSize = master.provider.sizes.find((row) => row.id === selection.size);
      let midrails = unique(matchingScreens.map((row) => row.midrail)).filter((value) => value !== '対象外');
      if (String(selectedSize?.configuration ?? '').startsWith('マド')) midrails = midrails.filter((value) => value === '中桟なし');
      if (midrails.length) { visible.add('screen_midrail'); allowed.set('screen_midrail', midrails); }
      const meshes = unique(matchingScreens.map((row) => row.mesh)).filter((value) => value !== '対象外');
      if (meshes.length) { visible.add('screen_net'); allowed.set('screen_net', meshes); }
    }
  }

  if (selection.size) {
    const applicability = master.sourceRows.glassApplicability.find((row) => row['シリーズ窓種ID'] === selection.window_type);
    const categories = unique(master.provider.glass.filter((row) => row.active !== false).map((row) => row.category)).filter((category) => {
      if (!applicability) return false;
      const value = category === 'トリプルガラス' ? applicability['トリプルガラス'] : applicability['複層ガラス'];
      return value === '可';
    });
    if (categories.length) { visible.add('glass_base'); allowed.set('glass_base', categories); }
    if (selection.glass_base && categories.includes(selection.glass_base)) {
      const column = categoryColumn(selection.glass_base);
      const types = master.sourceRows.glassTypes.filter((row) => row[column] === '可' || row[column] === '要照合').map((row) => row.appearance_id);
      visible.add('glass_type'); allowed.set('glass_type', types);
      if (selection.glass_type) {
        const glassRows = master.provider.glass.filter((row) => row.active !== false && row.category === selection.glass_base);
        visible.add('glass_detail'); allowed.set('glass_detail', unique(glassRows.map((row) => row.low_e)));
        const functions = master.sourceRows.glassFunctions.filter((row) => row[column] === '可' || row[column] === '要照合')
          .filter((row) => selection.glass_type !== 'GLA-TW-MILKY' || row.option_id === 'GLF-TW-SAFE-LAM').map((row) => row.option_id);
        visible.add('glass_function'); allowed.set('glass_function', functions);
        if (selection.glass_detail) {
          const detailRows = glassRows.filter((row) => row.low_e === selection.glass_detail);
          visible.add('glass_spacer'); allowed.set('glass_spacer', unique(detailRows.map((row) => row.spacer)));
          if (selection.glass_spacer) { visible.add('glass_air_layer'); allowed.set('glass_air_layer', unique(detailRows.filter((row) => row.spacer === selection.glass_spacer).map((row) => row.gas))); }
        }
      }
    }
  }

  if (selection.size && selection.exterior_color && selection.interior_color && selection.glass_base) {
    visible.add('option'); allowed.set('option', scopedOptions(master, 'option', selection.window_type, selection));
  }
  return { allowed, visible };
}

function normalize(master, input) {
  const known = new Map(master.fields.map((row) => [row.field_name, row]));
  const base = new Map(master.fields.map((row) => [row.field_name, new Set(master.values.filter((value) => value.field_name === row.field_name && value.user_selectable !== false).map((value) => value.canonical_value))]));
  const selection = {};
  const errors = [];
  for (const [key, raw] of Object.entries(input ?? {})) {
    const def = known.get(key);
    if (!def) continue;
    const values = def.data_type === 'array' ? (Array.isArray(raw) ? raw : [raw]) : [raw];
    const valid = values.filter((value) => base.get(key).has(value));
    if (valid.length !== values.length) errors.push({ code:'SELECTION_NOT_ALLOWED', field:key, value:values.find((value) => !base.get(key).has(value)) });
    if (def.data_type === 'array') { if (valid.length) selection[key] = unique(valid); }
    else if (valid.length) selection[key] = valid[0];
  }
  return { selection, errors };
}

function reconcile(master, input) {
  const normalized = normalize(master, input);
  const selection = normalized.selection;
  const cleared = [];
  for (let pass=0; pass<20; pass++) {
    const before = JSON.stringify(selection);
    const { allowed, visible } = compute(master, selection);
    for (const def of master.fields) {
      const key = def.field_name;
      if (!visible.has(key)) {
        if (key in selection) { cleared.push({ field:key, reason:'NOT_APPLICABLE', removed:clone(selection[key]) }); delete selection[key]; }
        continue;
      }
      const options = allowed.get(key) ?? [];
      if (def.data_type === 'array' && Array.isArray(selection[key])) {
        const kept = selection[key].filter((value) => options.some((candidate) => same(candidate, value)));
        if (kept.length !== selection[key].length) cleared.push({ field:key, reason:'DEPENDENCY', removed:selection[key].filter((value) => !kept.includes(value)) });
        if (kept.length) selection[key] = kept; else delete selection[key];
      } else if (has(selection[key]) && !options.some((candidate) => same(candidate, selection[key]))) {
        cleared.push({ field:key, reason:'DEPENDENCY', removed:selection[key] }); delete selection[key];
      }
    }
    const after = compute(master, selection);
    for (const def of master.fields) if (def.selection_mode === 'AUTO_RESOLVE' && after.visible.has(def.field_name)) {
      const options = after.allowed.get(def.field_name) ?? [];
      if (!has(selection[def.field_name]) && options.length === 1) selection[def.field_name] = options[0];
    }
    if (before === JSON.stringify(selection)) return { selection, errors:normalized.errors, cleared, ...compute(master, selection) };
  }
  throw Object.assign(new Error('Canonical workbook Runtime resolution loop'), { code:'RUNTIME_RESOLUTION_LOOP' });
}

function dimensionContext(master, selection) {
  const size = master.provider.sizes.find((row) => row.id === selection.size);
  return { W:Number(size?.actual_w), H:Number(size?.actual_h), nominalW:size?.nominal_w, nominalH:size?.nominal_h };
}

function dimensionCondition(condition, dimensions) {
  const text = String(condition ?? '').normalize('NFKC').replaceAll('≦','<=').replaceAll('≧','>=').replaceAll('≤','<=').replaceAll('≥','>=').replace(/\s+/g,'');
  let saw = false;
  const comparisons = [];
  for (const match of text.matchAll(/(W|H)(<=|>=|<|>)(\d+(?:\.\d+)?)/gi)) comparisons.push([match[1], match[2], match[3]]);
  for (const match of text.matchAll(/(\d+(?:\.\d+)?)(<=|>=|<|>)(W|H)/gi)) {
    const inverted = ({ '<':'>', '>':'<', '<=':'>=', '>=':'<=' })[match[2]];
    comparisons.push([match[3], inverted, match[1]]);
  }
  for (const [axis, operator, rawRight] of comparisons) {
    saw = true;
    const left=dimensions[axis.toUpperCase()], right=Number(rawRight);
    if (!Number.isFinite(left)) return null;
    if (!({ '<':left<right, '>':left>right, '<=':left<=right, '>=':left>=right })[operator]) return false;
  }
  return saw ? true : null;
}

function deriveOptions(master, selection) {
  const selected = selection.option ?? [];
  const size = master.provider.sizes.find((row) => row.id === selection.size);
  return unique(master.sourceRows.optionDependencies.filter((rule) => {
    if (!String(rule['アクション']).startsWith('自動追加')) return false;
    if (!String(rule['対象シリーズ窓種ID'] ?? '').split('|').includes(selection.window_type)) return false;
    if (!(rule['トリガーoption_id'] && selected.includes(rule['トリガーoption_id']))) return false;
    if (rule['条件項目'] !== 'サイズ条件') return false;
    const condition = String(rule['条件値'] ?? ''), context = String(size?.configuration ?? ''), h = Number(size?.actual_h);
    if (condition.includes('H<571')) return (context.includes('マド') && h < 571) || context.includes('大壁和室');
    if (condition.includes('H>=571')) return (context.includes('マド') && h >= 571) || context.includes('テラス');
    return false;
  }).map((rule) => rule['対象option_id']));
}

function resolveOptionCodes(master, selection, derivedOptions = []) {
  const selectedOptions = unique([...(selection.option ?? []), ...derivedOptions, selection.screen_type]);
  const limitations = new Map(master.optionCodeSourceLimitations.map((row) => [row.option_id,row]));
  const dimensions = dimensionContext(master, selection);
  const results = [];
  for (const optionId of selectedOptions) {
    const limitation = limitations.get(optionId);
    if (limitation) {
      results.push({ optionId, label:limitation.label, status:'SOURCE_LIMITATION', productCode:null, message:'公式発注コード未連動・要確認' });
      continue;
    }
    const rules = master.optionCodeLinkages.filter((row) => row.parent_option_id === optionId && row.status !== 'SUPERSEDED' && String(row.series_window_scope ?? '').split('|').includes(selection.window_type));
    const applicable = rules.filter((row) => dimensionCondition(row.condition, dimensions) !== false);
    if (!applicable.length) continue;
    if (applicable.some((row) => row.code_mode === 'SPECIAL_ORDER_NO_STANDARD_SKU')) {
      const row = applicable.find((one) => one.code_mode === 'SPECIAL_ORDER_NO_STANDARD_SKU');
      results.push({ optionId, label:row.display_name, status:'SPECIAL_ORDER_NO_STANDARD_SKU', productCode:null, message:'特注・標準SKUなし', ruleIds:[row.rule_id] });
      continue;
    }
    const exact = applicable.filter((row) => {
      if (!String(row.code_mode).startsWith('FIXED')) return false;
      const dimensionMatch = dimensionCondition(row.condition, dimensions);
      return dimensionMatch === true || (dimensionMatch === null && applicable.length === 1);
    });
    if (exact.length === 1) {
      const template = exact[0].product_code_or_template;
      const materialized = selection.handing && /^[LR]$/.test(selection.handing) ? String(template ?? '').replaceAll('L/R', selection.handing) : template;
      const unresolvedTemplate = !materialized || /L\/R|呼称コード|[□△▲■]/.test(String(materialized));
      results.push(unresolvedTemplate
        ? { optionId, label:exact[0].display_name, status:'CONDITION_CONFIRMATION_REQUIRED', productCode:null, codeTemplates:[template], message:'Runtime条件の追加確定が必要', ruleIds:[exact[0].rule_id] }
        : { optionId, label:exact[0].display_name, status:'RESOLVED', productCode:materialized, message:'正式Runtime条件で確定', ruleIds:[exact[0].rule_id] });
    } else {
      results.push({ optionId, label:applicable[0].display_name, status:'CONDITION_CONFIRMATION_REQUIRED', productCode:null, codeTemplates:unique(applicable.map((row) => row.product_code_or_template)), message:'Runtime条件の追加確定が必要', ruleIds:applicable.map((row) => row.rule_id) });
    }
  }
  return results;
}

export function evaluateCanonicalWorkbookRuntime(master, input = {}) {
  const resolved = reconcile(master, input);
  const derivedOptions = deriveOptions(master, resolved.selection);
  const fields = {};
  for (const def of master.fields) {
    const visible = resolved.visible.has(def.field_name);
    const value = def.field_name in resolved.selection ? clone(resolved.selection[def.field_name]) : null;
    fields[def.field_name] = {
      value,
      state: visible ? (has(value) ? (def.selection_mode === 'AUTO_RESOLVE' ? 'RESOLVED' : 'SELECTED') : 'UNSET') : 'NOT_APPLICABLE',
      visibility: visible ? 'SHOW' : 'HIDE',
      required: visible && def.required_mode === 'REQUIRED',
      allowed_values: visible ? [...(resolved.allowed.get(def.field_name) ?? [])] : [],
      resolved_by_rule: def.selection_mode === 'AUTO_RESOLVE' && has(value) ? 'FORMAL_RUNTIME_SINGLETON' : null,
    };
  }
  const missing = Object.entries(fields).filter(([,state]) => state.required && !has(state.value)).map(([name]) => name);
  const selectedRows = master.values.filter((row) => {
    const selected = resolved.selection[row.field_name];
    return Array.isArray(selected) ? selected.includes(row.canonical_value) : same(selected,row.canonical_value);
  });
  const manual = selectedRows.some((row) => row.manual_check);
  const dependencyErrors = resolved.cleared.filter((row) => row.reason === 'DEPENDENCY').map((row) => ({ code:'SELECTION_INCOMPATIBLE', field:row.field, value:row.removed }));
  const errors = [...resolved.errors, ...dependencyErrors];
  return {
    fields,
    derived_components:new Set(), derived_entities:[], derived_options:derivedOptions,
    warnings: manual ? [{ code:'FORMAL_RUNTIME_MANUAL_CHECK', message:'選択内容に公式資料での最終照合が必要な仕様が含まれます。' }] : [],
    matched_invalid_rules:[], errors,
    status: errors.length ? 'INVALID' : missing.length ? 'INCOMPLETE' : manual ? 'MANUAL_CHECK' : 'VALID',
    missing_required_fields:missing,
    cleared_fields:resolved.cleared,
    option_code_results:resolveOptionCodes(master,resolved.selection,derivedOptions),
    option_code_linkage_count:master.optionCodeLinkages.length,
  };
}
