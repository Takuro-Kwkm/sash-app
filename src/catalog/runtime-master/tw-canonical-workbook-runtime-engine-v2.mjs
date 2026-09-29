import { evaluateCanonicalWorkbookRuntime } from './canonical-workbook-runtime-engine.mjs';

const CUSTOM_CONTEXT_SIZE_ID = '__TW_CUSTOM_DIMENSION_CONTEXT__';
const present = (value) => value !== undefined && value !== null && value !== '';
const clone = (value) => structuredClone(value);
const referencedSizeIdsCache = new WeakMap();

function customRule(master, windowType) {
  return (master.customDimensionRules ?? []).find((rule) =>
    String(rule.productNode ?? rule.windowId ?? rule.selector?.window_type ?? '') === String(windowType));
}

function boundsFor(rule) {
  const raw = rule?.geometryRule?.bounds ?? rule?.bounds ?? null;
  if (!raw || typeof raw !== 'object') return null;
  const bounds = {
    minW: Number(raw.minW ?? raw.W_min), maxW: Number(raw.maxW ?? raw.W_max),
    minH: Number(raw.minH ?? raw.H_min), maxH: Number(raw.maxH ?? raw.H_max),
  };
  return Object.values(bounds).every(Number.isFinite) ? bounds : null;
}

function inside(width, height, bounds) {
  return bounds && width >= bounds.minW && width <= bounds.maxW && height >= bounds.minH && height <= bounds.maxH;
}

function clearedFromModeSwitch(input, mode) {
  const rows = [];
  if (mode === 'CUSTOM' && present(input.size)) rows.push({ field:'size', reason:'SIZE_MODE_CHANGED', removed:clone(input.size) });
  if (mode === 'STANDARD') {
    if (present(input.custom_width)) rows.push({ field:'custom_width', reason:'SIZE_MODE_CHANGED', removed:clone(input.custom_width) });
    if (present(input.custom_height)) rows.push({ field:'custom_height', reason:'SIZE_MODE_CHANGED', removed:clone(input.custom_height) });
  }
  return rows;
}

function without(input, keys) {
  const result = { ...(input ?? {}) };
  for (const key of keys) delete result[key];
  return result;
}

function exposeFormalCustomMode(master, fields, windowType) {
  const rule = customRule(master, windowType);
  if (!rule || !fields.size_mode) return fields;
  return {
    ...fields,
    size_mode: {
      ...fields.size_mode,
      allowed_values: ['STANDARD','CUSTOM'],
      resolved_by_rule: null,
    },
  };
}

function dimensionMetadata(rule) {
  if (!rule) return {};
  return {
    automatic: rule.automatic === true,
    ruleTypes: [rule.evaluationType ?? rule.geometryType ?? 'SOURCE_GRAPH_GATE'],
  };
}

function panelCount(row) {
  if (String(row.configuration ?? '').includes('4枚建') || /-4(?:$|\D)/.test(String(row.nominal_w ?? ''))) return '4枚建';
  return '2枚建';
}

function formalSizeCode(row) {
  const id = String(row?.id ?? '');
  const five = id.match(/(?:^|[-_])(\d{5})$/);
  if (five) return five[1];
  const w = present(row?.nominal_w) ? String(row.nominal_w).trim() : '';
  const h = present(row?.nominal_h) ? String(row.nominal_h).trim() : '';
  if (w.includes('-') && h) return `${w}-${h}`;
  if (w && h && (id === `${w}-${h}` || id.endsWith(`-${w}-${h}`))) return `${w}-${h}`;
  if (typeof row?.nominal_w === 'string' && typeof row?.nominal_h === 'string' && w && h) return `${w}${h}`;
  return null;
}

function standardSizeEquivalenceKey(row) {
  const callCode = formalSizeCode(row);
  if (!callCode) return null;
  return JSON.stringify([
    callCode,
    Number(row.actual_w), Number(row.actual_h),
    String(row.configuration ?? ''),
    Boolean(row.direction_required),
    String(row.direction_options ?? ''),
    String(row.direction_type ?? ''),
    panelCount(row),
  ]);
}

function collectExactSizeRefs(value, knownIds, refs) {
  if (typeof value === 'string') {
    if (knownIds.has(value)) refs.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectExactSizeRefs(item, knownIds, refs);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const item of Object.values(value)) collectExactSizeRefs(item, knownIds, refs);
}

function referencedSizeIds(master) {
  if (referencedSizeIdsCache.has(master)) return referencedSizeIdsCache.get(master);
  const knownIds = new Set((master.provider?.sizes ?? []).map((row) => row.id));
  const refs = new Set();
  collectExactSizeRefs(master.sourceRows ?? {}, knownIds, refs);
  referencedSizeIdsCache.set(master, refs);
  return refs;
}

function equivalentStandardRows(master, row) {
  const key = standardSizeEquivalenceKey(row);
  if (!key) return [row];
  const refs = referencedSizeIds(master);
  const rows = (master.provider?.sizes ?? []).filter((candidate) =>
    candidate.active !== false &&
    candidate.window_id === row.window_id &&
    standardSizeEquivalenceKey(candidate) === key);
  if (rows.length < 2 || rows.some((candidate) => refs.has(candidate.id))) return [row];
  return rows;
}

function canonicalizeStandardInput(master, input) {
  const result = { ...(input ?? {}) };
  if (!present(result.size)) return { input:result, canonicalized:null };
  const selected = (master.provider?.sizes ?? []).find((row) => row.id === result.size);
  if (!selected) return { input:result, canonicalized:null };
  const group = equivalentStandardRows(master, selected);
  const representative = group[0]?.id;
  if (!representative || representative === result.size) return { input:result, canonicalized:null };
  const previous = result.size;
  result.size = representative;
  return { input:result, canonicalized:{ field:'size', reason:'EQUIVALENT_FORMAL_SIZE_CANONICALIZED', removed:previous, replacement:representative } };
}

function dedupeStandardSizeField(master, fields) {
  const field = fields.size;
  if (!field || !Array.isArray(field.allowed_values) || field.allowed_values.length < 2) return fields;
  const sourceById = new Map((master.provider?.sizes ?? []).map((row) => [row.id, row]));
  const refs = referencedSizeIds(master);
  const grouped = new Map();
  for (const id of field.allowed_values) {
    const row = sourceById.get(id);
    const key = row ? standardSizeEquivalenceKey(row) : null;
    const groupKey = key ?? `__UNIQUE__:${id}`;
    if (!grouped.has(groupKey)) grouped.set(groupKey, []);
    grouped.get(groupKey).push(id);
  }
  const keep = new Set();
  for (const ids of grouped.values()) {
    const canCollapse = ids.length > 1 && !ids.some((id) => refs.has(id));
    if (canCollapse) keep.add(ids[0]);
    else for (const id of ids) keep.add(id);
  }
  const allowedValues = field.allowed_values.filter((id) => keep.has(id));
  if (allowedValues.length === field.allowed_values.length) return fields;
  return { ...fields, size:{ ...field, allowed_values:allowedValues } };
}

function customConfiguration(master, input) {
  const rows = (master.provider?.sizes ?? []).filter((row) => row.active !== false && row.window_id === input.window_type &&
    (!input.panel_count || panelCount(row) === input.panel_count));
  const families = [...new Set(rows.map((row) => {
    const configuration = String(row.configuration ?? '');
    if (configuration.includes('テラス')) return 'テラス';
    if (configuration.includes('マド')) return 'マド';
    return null;
  }).filter(Boolean))];
  const family = families.length === 1 ? families[0] : null;
  return [family, input.panel_count].filter(Boolean).join('・') || null;
}

function continuationMaster(master, input, width, height) {
  const contextSize = {
    id: CUSTOM_CONTEXT_SIZE_ID,
    active: true,
    window_id: input.window_type,
    actual_w: width,
    actual_h: height,
    nominal_w: String(width),
    nominal_h: String(height),
    configuration: customConfiguration(master, input),
    runtime_context_only: true,
  };
  const contextValue = {
    value_id: `size:${CUSTOM_CONTEXT_SIZE_ID}`,
    field_name: 'size',
    canonical_value: CUSTOM_CONTEXT_SIZE_ID,
    display_label: '特注寸法評価コンテキスト',
    status: 'CURRENT',
    runtime_selectable: true,
    user_selectable: true,
    source: { runtimeContextOnly:true },
  };
  return {
    ...master,
    provider: { ...master.provider, sizes:[...(master.provider?.sizes ?? []), contextSize] },
    values: [...master.values, contextValue],
  };
}

function customBaseInput(input) {
  return without(input, ['size_mode','size','custom_width','custom_height']);
}

function evaluateCustomContinuation(master, input, width, height) {
  const contextMaster = continuationMaster(master, input, width, height);
  return evaluateCanonicalWorkbookRuntime(contextMaster, {
    ...customBaseInput(input),
    size_mode: 'STANDARD',
    size: CUSTOM_CONTEXT_SIZE_ID,
  });
}

function clearContextSize(fields) {
  if (!fields.size) return fields;
  return {
    ...fields,
    size: { ...fields.size, value:null, state:'NOT_APPLICABLE', visibility:'HIDE', required:false, allowed_values:[] },
  };
}

export function evaluateTwCanonicalWorkbookRuntimeV2(master, input = {}) {
  const mode = input.size_mode === 'CUSTOM' ? 'CUSTOM' : 'STANDARD';
  if (mode === 'STANDARD') {
    const normalized = canonicalizeStandardInput(master, without(input, ['custom_width','custom_height']));
    const base = evaluateCanonicalWorkbookRuntime(master, normalized.input);
    const sizeFields = dedupeStandardSizeField(master, { ...base.fields });
    return {
      ...base,
      fields: exposeFormalCustomMode(master, sizeFields, normalized.input.window_type),
      cleared_fields: [
        ...(base.cleared_fields ?? []),
        ...(normalized.canonicalized ? [normalized.canonicalized] : []),
        ...clearedFromModeSwitch(input, 'STANDARD'),
      ],
    };
  }

  const width = present(input.custom_width) ? Number(input.custom_width) : null;
  const height = present(input.custom_height) ? Number(input.custom_height) : null;
  const rule = customRule(master, input.window_type);
  const bounds = boundsFor(rule);
  const dimensionComplete = Number.isFinite(width) && Number.isFinite(height);
  const dimensionInside = dimensionComplete && Boolean(rule) && Boolean(bounds) && inside(width, height, bounds);

  // CUSTOM is allowed to continue through the ordinary dependency graph only after the
  // formal outer-envelope check succeeds. The context size is evaluation-only and is
  // never exposed or persisted as a standard-size selection.
  const base = dimensionInside
    ? evaluateCustomContinuation(master, input, width, height)
    : evaluateCanonicalWorkbookRuntime(master, customBaseInput(input));
  let fields = clearContextSize({ ...base.fields });

  fields.size_mode = {
    ...(fields.size_mode ?? {}), value:'CUSTOM', state:'SELECTED', visibility:'SHOW', required:true,
    allowed_values:['STANDARD','CUSTOM'], resolved_by_rule:null,
  };
  fields.custom_width = {
    ...(fields.custom_width ?? {}), value:Number.isFinite(width) ? width : null,
    state:Number.isFinite(width) ? 'SELECTED' : 'UNSET', visibility:'SHOW', required:true, allowed_values:[], unit:'mm',
  };
  fields.custom_height = {
    ...(fields.custom_height ?? {}), value:Number.isFinite(height) ? height : null,
    state:Number.isFinite(height) ? 'SELECTED' : 'UNSET', visibility:'SHOW', required:true, allowed_values:[], unit:'mm',
  };

  const missing = (base.missing_required_fields ?? []).filter((key) => !['size_mode','size','custom_width','custom_height'].includes(key));
  if (!Number.isFinite(width)) missing.push('custom_width');
  if (!Number.isFinite(height)) missing.push('custom_height');

  let dimensionResult = null;
  let status = (base.errors ?? []).length ? 'INVALID' : missing.length ? 'INCOMPLETE' : 'MANUAL_CHECK';
  const manualWarnings = [...(base.manual_warnings ?? [])];
  const errors = [...(base.errors ?? [])].filter((error) => error?.value !== CUSTOM_CONTEXT_SIZE_ID);
  if (dimensionComplete) {
    if (!rule || !bounds) {
      dimensionResult = {
        status:'BLOCK', code:'CUSTOM_DIMENSION_FORMAL_RULE_MISSING',
        matchedRuleIds:rule?.id ? [rule.id] : [],
        ...dimensionMetadata(rule),
      };
      errors.push({ code:'CUSTOM_DIMENSION_FORMAL_RULE_MISSING', field:'size_mode' });
      status = 'INVALID';
    } else if (!dimensionInside) {
      dimensionResult = {
        status:'BLOCK', code:'CUSTOM_DIMENSION_OUT_OF_FORMAL_OUTER_BOUNDS',
        matchedRuleIds:[rule.id].filter(Boolean),
        ...dimensionMetadata(rule),
      };
      errors.push({ code:'CUSTOM_DIMENSION_OUT_OF_FORMAL_OUTER_BOUNDS', field:'custom_width' });
      status = 'INVALID';
    } else {
      dimensionResult = {
        status:'REVIEW_REQUIRED', code:'CUSTOM_DIMENSION_FORMAL_REVIEW_REQUIRED',
        matchedRuleIds:[rule.id].filter(Boolean),
        ...dimensionMetadata(rule),
      };
      manualWarnings.push('正式Runtimeの特注寸法外枠範囲内。営業見積入力は継続可能。原本グラフ・ガラス構成・耐風圧・各仕様条件はメーカー一次資料で最終確認。');
      status = missing.length ? 'INCOMPLETE' : 'MANUAL_CHECK';
    }
  }

  return {
    ...base,
    fields,
    errors,
    status,
    missing_required_fields:[...new Set(missing)],
    cleared_fields:[...(base.cleared_fields ?? []).filter((row) => row?.removed !== CUSTOM_CONTEXT_SIZE_ID), ...clearedFromModeSwitch(input, 'CUSTOM')],
    manual_warnings:[...new Set(manualWarnings)],
    dimension_result:dimensionResult,
    order_ready:false,
  };
}
