import { has, same, unique, table } from './inplus-semantic-table-bundle-v1-data.mjs';

function maxHFromExpression(expression, width) {
  const text = String(expression ?? '').replace(/\s+/g, '');
  if (/^\d+(?:\.\d+)?$/.test(text)) return Number(text);
  let match = text.match(/^MIN\(([\d.]+),([\d.]+)\*W\)$/);
  if (match) return Math.min(Number(match[1]), Number(match[2]) * width);
  match = text.match(/^W<=([\d.]+):([\d.]+)\/([\d.]+)<W<=([\d.]+):([\d.]+)-([\d.]+)\*\(W-([\d.]+)\)$/);
  if (match) {
    if (width <= Number(match[1])) return Number(match[2]);
    if (width <= Number(match[4])) return Number(match[5]) - Number(match[6]) * (width - Number(match[7]));
    return null;
  }
  match = text.match(/^W<=([\d.]+):([\d.]+)\/([\d.]+)<W<=([\d.]+):([\d.]+)-\(W-([\d.]+)\)\*\(([\d.]+)\/([\d.]+)\)$/);
  if (match) {
    if (width <= Number(match[1])) return Number(match[2]);
    if (width <= Number(match[4])) return Number(match[5]) - (width - Number(match[6])) * (Number(match[7]) / Number(match[8]));
    return null;
  }
  return null;
}

function selectorRow(runtime, selection) {
  const rows = table(runtime, 'fabrication_selector_join');
  const upper = selection.window_type === '引違い窓' ? selection.upper_frame_spec : '標準';
  const joint = selection.joint_layout;
  const exact = rows.filter((row) =>
    (!has(row.window_type) || same(row.window_type, selection.window_type))
    && (!has(row.sash_configuration) || same(row.sash_configuration, selection.sash_configuration))
    && (!has(row.size_class) || row.size_class === '窓/テラス' || same(row.size_class, selection.size_class))
    && (!has(row.upper_frame_spec) || same(row.upper_frame_spec, upper))
    && (!has(row.joint_layout) || same(row.joint_layout, joint))
  );
  const specific = exact.filter((row) => has(row.joint_layout) === has(joint));
  return (specific.length === 1 ? specific[0] : exact.length === 1 ? exact[0] : null);
}

function pointChain(text) {
  if (!has(text)) return [];
  return [...String(text).matchAll(/[A-Z]\(([-\d.]+),([-\d.]+)\)/g)].map((match) => [Number(match[1]), Number(match[2])]);
}

function underPolyline(points, w, h) {
  if (points.length < 2) return null;
  const sorted = [...points].sort((a, b) => a[0] - b[0]);
  if (w <= sorted[0][0]) return h <= sorted[0][1] || w < sorted[0][0];
  if (w > sorted.at(-1)[0]) return false;
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const [x1, y1] = sorted[i], [x2, y2] = sorted[i + 1];
    if (w < x1 || w > x2 || x1 === x2) continue;
    const y = y1 + (y2 - y1) * ((w - x1) / (x2 - x1));
    return h <= y;
  }
  return null;
}

function inPolygon(points, x, y) {
  if (points.length < 3) return null;
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i], [xj, yj] = points[j];
    const intersects = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || Number.EPSILON) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

function evaluateGlassOverride(runtime, selection, baseId, width, height) {
  if (!has(selection.glass_detail)) return { status: 'PASS', message: 'ベース製作範囲内です。', evidence: [] };
  const configJoin = table(runtime, 'glass_config_family_join').find((row) => row.glass_config_id === selection.glass_detail);
  if (!configJoin) return { status: 'MANUAL_CHECK', message: 'glass_config_id の明示的な製作範囲Joinがありません。', evidence: [] };
  const candidateJoins = table(runtime, 'glass_limit_family_join').filter((row) => row.base_range_id === baseId
    && row.limit_family_id === configJoin.limit_family_id
    && (!has(row.decorative_pattern) || row.decorative_pattern === '非適用' || same(row.decorative_pattern, selection.decorative_pattern)));
  if (!candidateJoins.length) return { status: 'MANUAL_CHECK', message: '選択ガラスの製作範囲Joinが未解決です。', evidence: [] };
  const wantedSupply = selection.supply_form === 'ガラス入り完成品' ? '完成品' : selection.supply_form === 'ノックダウン品' ? 'ND' : null;
  const narrowed = wantedSupply ? candidateJoins.filter((row) => !has(row.supply_form) || String(row.supply_form).includes(wantedSupply)) : candidateJoins;
  const effective = narrowed.length ? narrowed : candidateJoins;
  if (effective.some((row) => String(row.supply_form).includes('ND')) && selection.supply_form === 'ノックダウン品') {
    return { status: 'MANUAL_CHECK', message: 'ノックダウン品の一部ガラス製作範囲はメーカー事前確認が必要です。', evidence: ['ND-01..ND-06'] };
  }
  const limits = unique(effective.map((row) => row.limit_id)).map((id) => table(runtime, 'glass_fabrication_limits').find((row) => row.limit_id === id)).filter(Boolean);
  if (!limits.length) return { status: 'MANUAL_CHECK', message: '製作範囲limit_idを解決できません。', evidence: [] };
  let manual = false;
  let anyPass = false;
  for (const limit of limits) {
    let pass = true;
    if (has(limit['H_min上書'])) pass = pass && height >= Number(limit['H_min上書']);
    if (has(limit['W_max上書'])) pass = pass && width <= Number(limit['W_max上書']);
    const method = String(limit['判定方法'] ?? '');
    const points = pointChain(limit['境界点チェーン']);
    if (method === '03Aベースのみ' || /^03A \+ (W<=|H>=)/.test(method)) {
      // numeric overrides above settle these variants
    } else if (method === '境界線より左下') {
      const under = underPolyline(points, width, height);
      if (under === null) manual = true; else pass = pass && under;
    } else if (method === 'ポリゴン内') {
      const inside = inPolygon(points, width, height);
      if (inside === null) manual = true; else pass = pass && inside;
    } else if (method.includes('03A')) {
      if (!has(limit['H_min上書']) && !has(limit['W_max上書']) && !points.length) manual = true;
    } else manual = true;
    anyPass = anyPass || pass;
  }
  if (anyPass && !manual) return { status: 'PASS', message: 'ガラス別製作範囲内です。', evidence: limits.map((row) => row.Evidence).filter(Boolean) };
  if (!anyPass && !manual) return { status: 'BLOCK', message: '選択ガラスの製作範囲外です。', evidence: limits.map((row) => row.Evidence).filter(Boolean) };
  return { status: 'MANUAL_CHECK', message: 'ガラス別製作範囲の境界条件は手動確認が必要です。', evidence: limits.map((row) => row.Evidence).filter(Boolean) };
}

function evaluateDimensions(runtime, selection) {
  const width = Number(selection.order_width), height = Number(selection.order_height);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return { status: 'PENDING', message: '発注寸法W/Hを入力してください。' };
  const selector = selectorRow(runtime, selection);
  if (!selector) return { status: 'MANUAL_CHECK', message: '製作範囲selectorの明示的Joinを解決できません。' };
  if (selector.mapping_state === 'MISSING' || selector.evaluation_policy === 'MANUAL_CHECK') {
    return { status: 'MANUAL_CHECK', message: selector.mapping_basis ?? 'メーカー確認が必要な製作範囲です。', ruleId: selector.mapping_state === 'MISSING' ? 'SZ-SL3W' : 'fabrication_selector_join' };
  }
  const base = table(runtime, 'fabrication_range_base').find((row) => row.range_id === selector.base_range_id);
  if (!base || base['状態'] !== 'VERIFIED') return { status: 'MANUAL_CHECK', message: '製作範囲ベースが未確定です。' };
  const maxH = maxHFromExpression(base['max_H式'], width);
  if (!Number.isFinite(maxH)) return { status: 'MANUAL_CHECK', message: 'max_H式を安全に評価できません。' };
  const basePass = width >= Number(base.W_min) && width <= Number(base.W_max) && height >= Number(base.H_min) && height <= Math.min(Number(base.H_max), maxH);
  if (!basePass) return { status: 'BLOCK', message: `製作範囲外です（${base.range_id}）。`, rangeId: base.range_id };
  const glass = evaluateGlassOverride(runtime, selection, base.range_id, width, height);
  return { ...glass, rangeId: base.range_id };
}

function installScope(runtime, selection) {
  const rows = table(runtime, 'installability_scope_join').filter((row) => same(row.window_type, selection.window_type)
    && (row.glass_family === '*' || same(row.glass_family, selection.glass_family)));
  return rows.length === 1 ? rows[0] : null;
}

function matrixCellState(cell) {
  const text = String(cell ?? '');
  if (!text || text === '-') return 'NOT_APPLICABLE';
  if (text.startsWith('×')) return 'BLOCK';
  if (text.startsWith('△') || /注\d+/.test(text)) return 'MANUAL_CHECK';
  if (text.startsWith('○')) return 'PASS';
  return 'MANUAL_CHECK';
}

function matrixKey(runtime, field, value, selection) {
  const matches = table(runtime, 'installability_id_join').filter((row) => row.selection_field === field && same(row.canonical_id_or_value, value)
    && (!has(row.context_window_type) || same(row.context_window_type, selection.window_type)));
  if (matches.length !== 1) return { state: 'MANUAL_CHECK', key: null };
  const row = matches[0];
  if (row.evaluation_policy === 'MANUAL_CHECK') return { state: 'MANUAL_CHECK', key: row.matrix_key };
  if (row.evaluation_policy === 'NOT_APPLICABLE') return { state: 'NOT_APPLICABLE', key: null };
  if (row.evaluation_policy === 'DELEGATE') return { state: 'DELEGATE', key: null };
  return { state: 'PASS', key: row.matrix_key };
}

function selectedMatrixKeys(runtime, selection, skipField, skipValue) {
  const items = [];
  const add = (field, value, lookupField = field) => {
    if (!has(value) || (field === skipField && same(value, skipValue))) return;
    const mapped = matrixKey(runtime, lookupField, value, selection);
    if (mapped.state === 'PASS' && has(mapped.key) && !String(mapped.key).includes('|')) items.push(mapped.key);
    else if (mapped.state === 'MANUAL_CHECK') items.push('__MANUAL__');
  };
  add('frame_install_spec', selection.frame_install_spec);
  add('fukashi_spec', selection.fukashi_spec, 'frame_install_spec');
  add('joint_layout', selection.joint_layout);
  for (const option of Array.isArray(selection.option_items) ? selection.option_items : []) add('option_items', option);
  return unique(items);
}

function pairwiseMatrixState(runtime, leftKey, rightKey) {
  if (!has(leftKey) || !has(rightKey) || leftKey === rightKey) return 'PASS';
  const states = [];
  for (const [rowKey, columnKey] of [[leftKey, rightKey], [rightKey, leftKey]]) {
    const row = table(runtime, 'option_installability_matrix').find((candidate) => candidate['対象'] === rowKey);
    if (row && columnKey in row) states.push(matrixCellState(row[columnKey]));
  }
  if (!states.length || states.includes('MANUAL_CHECK')) return 'MANUAL_CHECK';
  if (states.includes('BLOCK')) return 'BLOCK';
  return 'PASS';
}

function evaluateItemAgainstMatrix(runtime, selection, field, value) {
  const scope = installScope(runtime, selection);
  if (!scope) return { status: 'MANUAL_CHECK', message: '取付可否scopeの明示的Joinを解決できません。' };
  const item = matrixKey(runtime, field, value, selection);
  if (item.state === 'MANUAL_CHECK') return { status: 'MANUAL_CHECK', message: `${value}: 取付可否ID Joinが手動確認対象です。` };
  if (item.state === 'NOT_APPLICABLE') return { status: 'PASS', message: null };
  let key = item.key;
  if (item.state === 'DELEGATE') {
    const delegated = matrixKey(runtime, 'joint_layout', selection.joint_layout, selection);
    if (delegated.state !== 'PASS') return { status: 'MANUAL_CHECK', message: `${value}: joint_layoutへの委譲Joinが未解決です。` };
    key = delegated.key;
  }
  if (!has(key) || String(key).includes('|')) return { status: 'MANUAL_CHECK', message: `${value}: 取付可否matrix keyが一意ではありません。` };
  const matrix = table(runtime, 'option_installability_matrix').find((row) => row['対象'] === scope.matrix_scope_key);
  if (!matrix || !(key in matrix)) return { status: 'MANUAL_CHECK', message: `${value}: 取付可否matrix cellを解決できません。` };
  const state = matrixCellState(matrix[key]);
  if (state === 'BLOCK') return { status: state, message: `${key}は現在の窓種/ガラス条件では取付不可です。` };
  let manualMessage = state === 'MANUAL_CHECK' ? `${key}は注記条件の確認が必要です（${matrix[key]}）。` : null;
  for (const selectedKey of selectedMatrixKeys(runtime, selection, field, value)) {
    if (selectedKey === '__MANUAL__') return { status: 'MANUAL_CHECK', message: `${key}との併用条件に手動確認対象が含まれます。` };
    const pair = pairwiseMatrixState(runtime, selectedKey, key);
    if (pair === 'BLOCK') return { status: 'BLOCK', message: `${selectedKey}と${key}は併用不可です。` };
    if (pair === 'MANUAL_CHECK') manualMessage ??= `${selectedKey}と${key}の併用条件は注記確認が必要です。`;
  }
  return { status: manualMessage ? 'MANUAL_CHECK' : 'PASS', message: manualMessage };
}

function sourceApplicableFrame(runtime, selection, id) {
  const row = table(runtime, 'frame_installation').find((candidate) => candidate.frame_id === id);
  if (!row) return true;
  const target = row['適用窓種'];
  if (target === '引違い窓') return selection.window_type === '引違い窓';
  if (target === '引違い窓テラスタイプ') return selection.window_type === '引違い窓' && selection.size_class === 'テラスタイプ';
  if (target === '連窓/段窓') return has(selection.joint_layout);
  if (target === 'コーナー構成') return selection.joint_layout === 'コーナー方立';
  return true;
}

function allowedInstallItems(runtime, selection, field, candidates) {
  if (!has(selection.window_type)) return [];
  return candidates.filter((value) => sourceApplicableFrame(runtime, selection, value) && evaluateItemAgainstMatrix(runtime, selection, field, value).status !== 'BLOCK');
}

function fieldState(def, visible, required, allowed, value, readOnly = false) {
  return { state: has(value) ? 'SET' : 'UNSET', value: has(value) ? value : null, visibility: visible ? 'SHOW' : 'HIDE', required, allowed_values: allowed, display_label: def.display_label, unit: def.unit, readOnly };
}

export { evaluateDimensions, evaluateItemAgainstMatrix, allowedInstallItems, fieldState };
