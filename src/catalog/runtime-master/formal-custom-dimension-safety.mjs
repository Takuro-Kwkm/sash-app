const finite = (value) => Number.isFinite(Number(value));
const num = (value) => value === null || value === undefined || value === '' ? null : Number(value);
const same = (a, b) => String(a) === String(b);
const active = (rule) => rule?.active !== false && rule?.['有効'] !== false && rule?.status !== 'INACTIVE' && rule?.['状態'] !== '廃止';

function scalar(value) {
  return Array.isArray(value) ? value[0] : value;
}

function oneOf(actual, expected) {
  if (expected === undefined || expected === null || expected === '' || expected === '*') return true;
  const values = Array.isArray(expected) ? expected : [expected];
  return values.some((value) => same(actual, value));
}

function selectorValue(selection, key) {
  const aliases = {
    window_type: ['window_type'],
    seriesWindowId: ['window_type'],
    regionStandard: ['region_standard'],
    panelOrConfiguration: ['panel_count', 'window_configuration'],
    typeOrSpec: ['window_configuration', 'window_spec'],
    specific_spec: ['window_spec', 'specific_spec'],
  };
  for (const candidate of aliases[key] ?? [key]) {
    const value = scalar(selection[candidate]);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function ruleMatches(rule, selection) {
  const windowId = rule.windowId ?? rule.productNode ?? rule.selector?.window_type ?? rule.selector?.seriesWindowId;
  if (windowId && !same(selection.window_type, windowId)) return false;
  const selector = rule.selector ?? {};
  for (const [key, expected] of Object.entries(selector)) {
    if (['window_type', 'seriesWindowId', 'construction'].includes(key)) continue;
    const actual = selectorValue(selection, key);
    if (actual === undefined) continue;
    if (!oneOf(actual, expected)) return false;
  }
  return true;
}

function parseAxisRange(text, axis) {
  if (!text) return null;
  const escaped = axis.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const ranges = [];
  const patterns = [
    new RegExp(`(-?\\d+(?:\\.\\d+)?)\\s*<=?\\s*${escaped}\\s*<=?\\s*(-?\\d+(?:\\.\\d+)?)`, 'g'),
    new RegExp(`(-?\\d+(?:\\.\\d+)?)\\s*<\\s*${escaped}\\s*<=?\\s*(-?\\d+(?:\\.\\d+)?)`, 'g'),
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(String(text)))) ranges.push([Number(match[1]), Number(match[2])]);
  }
  const minOnly = new RegExp(`${escaped}\\s*>=?\\s*(-?\\d+(?:\\.\\d+)?)`, 'g');
  const maxOnly = new RegExp(`${escaped}\\s*<=?\\s*(-?\\d+(?:\\.\\d+)?)`, 'g');
  let match;
  while ((match = minOnly.exec(String(text)))) ranges.push([Number(match[1]), null]);
  while ((match = maxOnly.exec(String(text)))) ranges.push([null, Number(match[1])]);
  if (!ranges.length) return null;
  const mins = ranges.map(([min]) => min).filter(Number.isFinite);
  const maxs = ranges.map(([, max]) => max).filter(Number.isFinite);
  return {
    min: mins.length ? Math.min(...mins) : null,
    max: maxs.length ? Math.max(...maxs) : null,
  };
}

function mergeBounds(boundsList) {
  const valid = boundsList.filter(Boolean);
  if (!valid.length) return null;
  const minsW = valid.map((b) => b.minW).filter(Number.isFinite);
  const maxsW = valid.map((b) => b.maxW).filter(Number.isFinite);
  const minsH = valid.map((b) => b.minH).filter(Number.isFinite);
  const maxsH = valid.map((b) => b.maxH).filter(Number.isFinite);
  return {
    minW: minsW.length ? Math.min(...minsW) : null,
    maxW: maxsW.length ? Math.max(...maxsW) : null,
    minH: minsH.length ? Math.min(...minsH) : null,
    maxH: maxsH.length ? Math.max(...maxsH) : null,
  };
}

function textBounds(text) {
  const w = parseAxisRange(text, 'W');
  const h = parseAxisRange(text, 'H');
  if (!w && !h) return null;
  return { minW: w?.min ?? null, maxW: w?.max ?? null, minH: h?.min ?? null, maxH: h?.max ?? null };
}

function pointBounds(points) {
  if (!Array.isArray(points) || !points.length) return null;
  const xs = points.map((point) => Number(point?.[0])).filter(Number.isFinite);
  const ys = points.map((point) => Number(point?.[1])).filter(Number.isFinite);
  if (!xs.length || !ys.length) return null;
  return { minW: Math.min(...xs), maxW: Math.max(...xs), minH: Math.min(...ys), maxH: Math.max(...ys) };
}

function geometryBounds(rule, selection) {
  const direct = rule.bounds;
  if (direct && typeof direct === 'object') {
    const minW = num(direct.W_min ?? direct.minW);
    const maxW = num(direct.W_max ?? direct.maxW);
    const minH = num(direct.H_min ?? direct.minH);
    const maxH = num(direct.H_max ?? direct.maxH);
    if ([minW, maxW, minH, maxH].some(Number.isFinite)) return { minW, maxW, minH, maxH };
  }

  const geometry = rule.geometryRule ?? {};
  for (const key of ['outer', 'bounds']) {
    const parsed = textBounds(geometry[key]);
    if (parsed) return parsed;
  }

  const candidates = [];
  if (geometry.expression) candidates.push(textBounds(geometry.expression));
  for (const region of geometry.regions ?? []) candidates.push(textBounds(region));

  for (const variant of geometry.variants ?? []) {
    if (typeof variant === 'string') {
      candidates.push(textBounds(variant));
      continue;
    }
    if (!variant || typeof variant !== 'object') continue;
    if (variant.spec) {
      const selectedSpec = selectorValue(selection, 'specific_spec');
      if (selectedSpec && !same(selectedSpec, variant.spec)) continue;
    }
    candidates.push(textBounds(variant.bounds));
    candidates.push(pointBounds(variant.points));
  }
  candidates.push(pointBounds(geometry.points));
  return mergeBounds(candidates);
}

function insideOuterBounds(width, height, bounds) {
  if (!bounds) return null;
  if (Number.isFinite(bounds.minW) && width < bounds.minW) return false;
  if (Number.isFinite(bounds.maxW) && width > bounds.maxW) return false;
  if (Number.isFinite(bounds.minH) && height < bounds.minH) return false;
  if (Number.isFinite(bounds.maxH) && height > bounds.maxH) return false;
  return true;
}

function secondaryReviewRequired(rule) {
  if (rule.runtimeSafety && String(rule.runtimeSafety).includes('REVIEW')) return true;
  if (String(rule.evaluationType ?? '').includes('GATE')) return true;
  return Boolean(rule.specialConditions || rule.windPressureGlassFamily || rule.note || rule.sourceNote);
}

function uniqueWarnings(values) {
  return [...new Set(values.filter(Boolean))];
}

export function applyFormalCustomDimensionSafety(rawResult, dimensions) {
  const rules = (dimensions?.custom_dimension_rules ?? []).filter(active);
  const selection = rawResult?.selection ?? {};
  if (!rules.length || selection.size_mode !== 'CUSTOM') return rawResult;

  const width = Number(selection.custom_width);
  const height = Number(selection.custom_height);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return rawResult;

  const applicable = rules.filter((rule) => ruleMatches(rule, selection));
  if (!applicable.length) return rawResult;

  // Preserve a stricter formal adapter rejection. The guard never upgrades BLOCK to REVIEW/PASS.
  if (['BLOCK', 'BLOCKED'].includes(rawResult.dimensionResult?.status)) return rawResult;

  const bounded = applicable.map((rule) => ({ rule, bounds: geometryBounds(rule, selection) }));
  const known = bounded.filter((row) => row.bounds);
  const unknown = bounded.filter((row) => !row.bounds);
  const inside = known.filter((row) => insideOuterBounds(width, height, row.bounds) === true);

  if (known.length && !inside.length && !unknown.length) {
    const message = '正式Runtimeの特注寸法外枠範囲外です。';
    return {
      ...rawResult,
      dimensionResult: {
        status: 'BLOCK',
        code: 'CUSTOM_DIMENSION_OUT_OF_FORMAL_OUTER_BOUNDS',
        matchedRuleIds: applicable.map((rule) => rule.id ?? rule.range_id).filter(Boolean),
      },
      manualWarnings: uniqueWarnings(rawResult.manualWarnings ?? []),
      validation: {
        ...(rawResult.validation ?? {}),
        status: 'INVALID',
        errors: rawResult.validation?.errors ?? [],
        missingRequiredFields: rawResult.validation?.missingRequiredFields ?? [],
      },
      notices: uniqueWarnings([...(rawResult.notices ?? []), message]),
      orderReady: false,
    };
  }

  const reviewRules = [...inside.map((row) => row.rule), ...unknown.map((row) => row.rule)];
  if (reviewRules.length && (rawResult.dimensionResult?.status === 'PASS' || reviewRules.some(secondaryReviewRequired) || !rawResult.dimensionResult)) {
    const message = '正式Runtimeの特注寸法外枠範囲内です。複合条件・原本グラフ・耐風圧等はメーカー一次資料で最終確認してください。';
    return {
      ...rawResult,
      dimensionResult: {
        status: 'REVIEW_REQUIRED',
        code: 'CUSTOM_DIMENSION_FORMAL_REVIEW_REQUIRED',
        matchedRuleIds: reviewRules.map((rule) => rule.id ?? rule.range_id).filter(Boolean),
        ruleTypes: [...new Set(reviewRules.map((rule) => rule.evaluationType ?? rule.judgeCode ?? 'FORMAL_RULE'))],
      },
      manualWarnings: uniqueWarnings([...(rawResult.manualWarnings ?? []), message]),
      validation: {
        ...(rawResult.validation ?? {}),
        status: (rawResult.validation?.missingRequiredFields ?? []).length ? 'INCOMPLETE' : 'MANUAL_CHECK',
        errors: rawResult.validation?.errors ?? [],
        missingRequiredFields: rawResult.validation?.missingRequiredFields ?? [],
      },
      orderReady: false,
    };
  }

  return rawResult;
}

export function guardFormalCustomDimensionUiResolver(adapted, runtimePackage) {
  const dimensions = runtimePackage?.documents?.DIMENSIONS;
  if (!adapted?.uiResolver || !Array.isArray(dimensions?.custom_dimension_rules)) return adapted;
  const baseResolver = adapted.uiResolver;
  return {
    ...adapted,
    uiResolver(selection = {}) {
      return applyFormalCustomDimensionSafety(baseResolver(selection), dimensions);
    },
  };
}
