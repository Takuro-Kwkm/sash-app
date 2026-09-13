import { evaluateCanonicalWorkbookRuntime } from './canonical-workbook-runtime-engine.mjs';

const present = (value) => value !== undefined && value !== null && value !== '';
const clone = (value) => structuredClone(value);

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

export function evaluateTwCanonicalWorkbookRuntimeV2(master, input = {}) {
  const mode = input.size_mode === 'CUSTOM' ? 'CUSTOM' : 'STANDARD';
  if (mode === 'STANDARD') {
    const base = evaluateCanonicalWorkbookRuntime(master, without(input, ['custom_width','custom_height']));
    return {
      ...base,
      fields: exposeFormalCustomMode(master, { ...base.fields }, input.window_type),
      cleared_fields: [...(base.cleared_fields ?? []), ...clearedFromModeSwitch(input, 'STANDARD')],
    };
  }

  const baseInput = without(input, ['size_mode','size','custom_width','custom_height']);
  const base = evaluateCanonicalWorkbookRuntime(master, baseInput);
  const fields = { ...base.fields };
  const width = present(input.custom_width) ? Number(input.custom_width) : null;
  const height = present(input.custom_height) ? Number(input.custom_height) : null;

  fields.size_mode = {
    ...(fields.size_mode ?? {}), value:'CUSTOM', state:'SELECTED', visibility:'SHOW', required:true,
    allowed_values:['STANDARD','CUSTOM'], resolved_by_rule:null,
  };
  if (fields.size) fields.size = { ...fields.size, value:null, state:'NOT_APPLICABLE', visibility:'HIDE', required:false, allowed_values:[] };
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
  const errors = [...(base.errors ?? [])];
  if (Number.isFinite(width) && Number.isFinite(height)) {
    const rule = customRule(master, input.window_type);
    const bounds = boundsFor(rule);
    if (!rule || !bounds) {
      dimensionResult = {
        status:'BLOCK', code:'CUSTOM_DIMENSION_FORMAL_RULE_MISSING',
        matchedRuleIds:rule?.id ? [rule.id] : [],
        ...dimensionMetadata(rule),
      };
      errors.push({ code:'CUSTOM_DIMENSION_FORMAL_RULE_MISSING', field:'size_mode' });
      status = 'INVALID';
    } else if (!inside(width, height, bounds)) {
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
      manualWarnings.push('正式Runtimeの特注寸法外枠範囲内。原本グラフ・ガラス構成・耐風圧・各仕様条件はメーカー一次資料で最終確認。');
      status = missing.length ? 'INCOMPLETE' : 'MANUAL_CHECK';
    }
  }

  return {
    ...base,
    fields,
    errors,
    status,
    missing_required_fields:[...new Set(missing)],
    cleared_fields:[...(base.cleared_fields ?? []), ...clearedFromModeSwitch(input, 'CUSTOM')],
    manual_warnings:[...new Set(manualWarnings)],
    dimension_result:dimensionResult,
    order_ready:false,
  };
}
