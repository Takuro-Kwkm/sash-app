import {
  present, fail, fieldState, populateCandidates, exactGlass, applyRules,
  filterInstallability, evaluateInstallability, manual,
} from './semantic-table-bundle-v2-engine-core.mjs';

function baseHMax(expression, width, fallback) {
  if (!expression) return Number(fallback);
  const match = /^MIN\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\*\s*W\s*\)$/.exec(String(expression));
  if (!match) fail('SEMANTIC_BUNDLE_DIMENSION_EXPRESSION_UNSUPPORTED', `Unsupported dimension expression: ${expression}`);
  return Math.min(Number(match[1]), Number(match[2]) * width);
}
function geometryPoints(chain) {
  if (!chain) return [];
  const points = []; const regex = /[A-Z]?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)/g; let match;
  while ((match = regex.exec(String(chain)))) points.push([Number(match[1]), Number(match[2])]);
  return points;
}
function withinGeometry(x, y, points) {
  if (points.length < 2) return true;
  const [[x1,y1],[x2,y2]] = points;
  if (x < Math.min(x1,x2)) return true;
  if (x > Math.max(x1,x2)) return false;
  const t = (x - x1) / (x2 - x1 || Number.EPSILON);
  return y <= y1 + t * (y2 - y1);
}
function hiddenPatternToken(family) {
  const domain = family?.decorative_pattern_domain;
  if (domain === 'なし') return 'なし';
  if (domain === '非適用') return '非適用';
  return null;
}
function resolveGlassLimitJoin(master, baseRangeId, family, pattern) {
  const exact = master.glassLimitFamily.filter((row) =>
    row.base_range_id === baseRangeId
      && row.limit_family_id === family.limit_family_id
      && row.decorative_pattern === pattern
  );
  if (exact.length === 1) return { status:'MATCH', join:exact[0], policy:'EXACT' };
  if (exact.length > 1) return { status:'AMBIGUOUS', joins:exact, policy:'EXACT' };

  const any = master.glassLimitFamily.filter((row) =>
    row.base_range_id === baseRangeId
      && row.limit_family_id === family.limit_family_id
      && row.decorative_pattern === 'ANY'
  );
  if (any.length === 1) return { status:'MATCH', join:any[0], policy:'ANY' };
  if (any.length > 1) return { status:'AMBIGUOUS', joins:any, policy:'ANY' };

  const special = master.glassLimitFamily.filter((row) =>
    row.base_range_id === baseRangeId
      && row.decorative_pattern === 'SPECIAL'
      && String(row.special_allowed_families ?? '').split('|').includes(family.limit_family_id)
  );
  if (special.length === 1) return { status:'MATCH', join:special[0], policy:'SPECIAL' };
  if (special.length > 1) return { status:'AMBIGUOUS', joins:special, policy:'SPECIAL' };
  return { status:'MISSING', joins:[], policy:null };
}
function evaluateDimension(master, state) {
  const cap = master.capabilities?.uiSemanticSupport?.customSize;
  const modeField = cap?.modeField ?? master.document.semantic_contract.dimension_validation?.size_mode_field;
  const customMode = master.document.semantic_contract.dimension_validation?.custom_mode_value ?? cap?.allowedModes?.[0];
  const mode = modeField ? state.fields[modeField]?.value : null;
  if (modeField && !present(mode)) return { status: 'PENDING', message: '特注サイズを選択してください。', matchedRuleIds: [] };
  if (modeField && !Object.is(mode, customMode)) return { status: 'BLOCKED', message: '正式Runtimeで対応していないサイズ方式です。', matchedRuleIds: [] };
  const rawW = state.fields.order_width?.value, rawH = state.fields.order_height?.value;
  if (!present(rawW) || !present(rawH)) return { status: 'PENDING', message: '発注寸法W/Hを入力してください。', matchedRuleIds: [] };
  const w = Number(rawW), h = Number(rawH);
  if (!Number.isFinite(w) || !Number.isFinite(h)) return { status: 'PENDING', message: '発注寸法W/Hを入力してください。', matchedRuleIds: [] };
  const contract = master.document.semantic_contract.dimension_validation;
  const step = Number(contract.step_mm ?? cap?.stepMm ?? 1);
  if (!(step > 0) || Math.abs(w / step - Math.round(w / step)) > 1e-9 || Math.abs(h / step - Math.round(h / step)) > 1e-9) {
    return { status: 'BLOCKED', message: `発注寸法は${step}mm単位で入力してください。`, matchedRuleIds: [] };
  }
  const keys = contract.selection_join_keys ?? [];
  const matches = master.fabricationSelector.filter((row) => keys.every((key) => {
    const expected = row[key], actual = state.fields[key]?.value ?? null;
    return present(expected) ? Object.is(expected, actual) : !present(actual);
  }));
  if (matches.length !== 1) { manual(master, state, 'FABRICATION_SELECTOR_JOIN', '製作範囲selectorを一意に解決できません。', contract.selector_join_table); return { status: 'REVIEW_REQUIRED', message: '製作範囲selectorの確認が必要です。', matchedRuleIds: matches.map((row) => row.base_range_id).filter(Boolean) }; }
  const selector = matches[0];
  if (selector.evaluation_policy !== 'AUTO' || selector.mapping_state === 'MISSING' || !selector.base_range_id) {
    const id = !selector.base_range_id ? contract.three_panel_rule?.source_rule_id ?? 'FABRICATION_SELECTOR_JOIN' : `fabrication_selector:${selector.base_range_id}`;
    manual(master, state, id, selector.mapping_basis, contract.selector_join_table);
    return { status: 'REVIEW_REQUIRED', message: selector.mapping_basis ?? '製作範囲の確認が必要です。', matchedRuleIds: [selector.base_range_id].filter(Boolean) };
  }
  const base = master.baseRangeById.get(selector.base_range_id);
  if (!base || base['状態'] !== 'VERIFIED') { manual(master, state, selector.base_range_id, '基本製作範囲が確定していません。'); return { status: 'REVIEW_REQUIRED', message: '基本製作範囲の確認が必要です。', matchedRuleIds: [selector.base_range_id] }; }
  const hMax = baseHMax(base['max_H式'], w, base.H_max);
  if (w < Number(base.W_min) || w > Number(base.W_max) || h < Number(base.H_min) || h > hMax) return { status: 'BLOCKED', message: '発注寸法が正式Runtimeの基本製作範囲外です。', matchedRuleIds: [selector.base_range_id] };
  const configId = state.fields.glass_detail?.value;
  if (!configId) return { status: 'PASS', message: '基本製作範囲内です。ガラス選択後にガラス別制限を再評価します。', matchedRuleIds: [selector.base_range_id] };
  const family = master.glassConfigFamilyById.get(configId);
  if (!family) { manual(master, state, configId, 'glass_config ID joinが見つかりません。'); return { status: 'REVIEW_REQUIRED', message: 'glass_config ID joinの確認が必要です。', matchedRuleIds: [selector.base_range_id] }; }
  const patternField = state.fields.decorative_pattern;
  if (patternField?.visibility === 'SHOW' && patternField.required && !present(patternField.value)) return { status: 'PENDING', message: '格子・組子デザインを選択してください。', matchedRuleIds: [selector.base_range_id] };
  const pattern = patternField?.visibility === 'SHOW' && present(patternField.value)
    ? patternField.value
    : hiddenPatternToken(family);
  if (!pattern) { manual(master, state, 'GLASS_LIMIT_FAMILY_JOIN', 'decorative pattern domainを明示解決できません。'); return { status:'REVIEW_REQUIRED', message:'ガラス別製作範囲joinの確認が必要です。', matchedRuleIds:[selector.base_range_id] }; }
  const joinResult = resolveGlassLimitJoin(master, selector.base_range_id, family, pattern);
  if (joinResult.status !== 'MATCH') { manual(master, state, 'GLASS_LIMIT_FAMILY_JOIN', 'glass fabrication range joinを一意に解決できません。'); return { status: 'REVIEW_REQUIRED', message: 'ガラス別製作範囲joinの確認が必要です。', matchedRuleIds: [selector.base_range_id] }; }
  const join = joinResult.join, limit = master.glassLimitById.get(`${join.base_range_id}::${join.limit_id}`);
  if (!limit || limit['状態'] !== 'VERIFIED') { manual(master, state, join.limit_id, 'ガラス別製作範囲が確定していません。'); return { status: 'REVIEW_REQUIRED', message: 'ガラス別製作範囲の確認が必要です。', matchedRuleIds: [selector.base_range_id, join.limit_id] }; }
  const minH = present(limit['H_min上書']) ? Math.max(Number(base.H_min), Number(limit['H_min上書'])) : Number(base.H_min);
  const maxW = present(limit['W_max上書']) ? Math.min(Number(base.W_max), Number(limit['W_max上書'])) : Number(base.W_max);
  if (h < minH || w > maxW || !withinGeometry(w, h, geometryPoints(limit['境界点チェーン']))) return { status: 'BLOCKED', message: '発注寸法がガラス別製作範囲外です。', matchedRuleIds: [selector.base_range_id, join.limit_id] };
  return { status: 'PASS', message: `正式Runtimeの基本範囲とガラス別製作範囲を満たします。(${joinResult.policy})`, matchedRuleIds: [selector.base_range_id, join.limit_id] };
}
function evaluateOnce(master, input) {
  const state = { fields: {}, warnings: [], errors: [], manual_checks: [], matched_invalid_rules: [], missing_required_fields: [], derived_entities: [], derived_components: [], derived_options: [], derived_values: {}, cleared_fields: [], status: 'INCOMPLETE', dimension_result: null };
  for (const def of master.fields) {
    const fixed = master.document.semantic_contract.fixed_identity?.[def.field_name];
    const value = fixed !== undefined ? fixed : (input[def.field_name] ?? null);
    const target = fieldState(value); target.visibility = def.initial_visibility;
    if (fixed !== undefined) { target.state = 'RESOLVED'; target.visibility = 'HIDE'; target.resolved_by_rule = 'FIXED_IDENTITY'; }
    state.fields[def.field_name] = target;
  }
  populateCandidates(master, state); exactGlass(master, state); applyRules(master, state); populateCandidates(master, state); exactGlass(master, state); applyRules(master, state); populateCandidates(master, state); filterInstallability(master, state);
  for (const def of master.fields) {
    const target = state.fields[def.field_name];
    if (!target || target.state !== 'SELECTED' || target.visibility === 'HIDE' || def.selection_mode === 'FIXED' || !present(target.value) || !target.allowed_values.length) continue;
    const selected = Array.isArray(target.value) ? target.value : [target.value];
    if (!selected.every((value) => target.allowed_values.some((candidate) => Object.is(candidate, value)))) state.errors.push({ code: 'SELECTION_NOT_ALLOWED', field: def.field_name, message: `${def.field_name}: Runtime allowed valuesに含まれない選択です。` });
  }
  state.dimension_result = evaluateDimension(master, state); evaluateInstallability(master, state);
  if (state.dimension_result) state.warnings.push(`DIMENSION ${state.dimension_result.status}: ${state.dimension_result.message}`);
  for (const row of state.manual_checks) state.warnings.push(`MANUAL_CHECK ${row.id}: ${row.reason}`);
  state.missing_required_fields = Object.entries(state.fields).filter(([,target]) => target.required && target.visibility !== 'HIDE' && !present(target.value)).map(([name]) => name);
  if (state.errors.length || ['BLOCK','BLOCKED'].includes(state.dimension_result?.status)) state.status = 'INVALID';
  else if (state.manual_checks.length || state.dimension_result?.status === 'REVIEW_REQUIRED') state.status = 'MANUAL_CHECK';
  else if (state.missing_required_fields.length || state.dimension_result?.status === 'PENDING') state.status = 'INCOMPLETE';
  else state.status = 'VALID';
  return state;
}
export function evaluateSemanticTableBundleV2(master, inputSelection = {}) {
  let selection = { ...inputSelection }, state = null; const cleared = new Set();
  for (let iteration = 0; iteration < 8; iteration += 1) {
    state = evaluateOnce(master, selection);
    const stale = new Set();
    for (const key of Object.keys(selection)) {
      const target = state.fields[key], def = master.fields.find((row) => row.field_name === key);
      if (!target || !def || def.selection_mode === 'FIXED') continue;
      if (target.visibility === 'HIDE' && !target.resolved_by_rule && !target.derived_by_rule) stale.add(key);
    }
    for (const error of state.errors) if (error.code === 'SELECTION_NOT_ALLOWED' && error.field && Object.hasOwn(selection, error.field)) stale.add(error.field);
    if (!stale.size) break;
    for (const key of stale) { delete selection[key]; cleared.add(key); }
    if (iteration === 7) fail('SEMANTIC_BUNDLE_CONVERGENCE_FAILED', 'Runtime selection did not converge after downstream clear.');
  }
  state.cleared_fields = [...cleared];
  state.errors = state.errors.filter((error) => error.code !== 'SELECTION_NOT_ALLOWED');
  if (!state.errors.length && !['BLOCK','BLOCKED'].includes(state.dimension_result?.status)) {
    if (state.manual_checks.length || state.dimension_result?.status === 'REVIEW_REQUIRED') state.status = 'MANUAL_CHECK';
    else if (state.missing_required_fields.length || state.dimension_result?.status === 'PENDING') state.status = 'INCOMPLETE';
    else state.status = 'VALID';
  }
  return state;
}
