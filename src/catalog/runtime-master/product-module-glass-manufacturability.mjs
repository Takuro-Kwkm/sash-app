import { buildCatalogContext, selectorMatches } from '../selector.mjs';

const active = (row) => row?.status !== 'INACTIVE';
const same = (left, right) => Object.is(left, right) || String(left) === String(right);

function knownRows(module = {}) {
  return (module.ruleSets ?? [])
    .filter((set) => set.type === 'GLASS_MANUFACTURABILITY_KNOWN_CONSTRAINTS' && active(set))
    .flatMap((set) => Array.isArray(set.payload) ? set.payload : []);
}

function scopeSelection(module, selection) {
  return {
    manufacturer: module.product?.manufacturer,
    series: module.product?.displayName ?? module.product?.series,
    ...selection,
  };
}

function exactWhenMatches(when = {}, selection = {}) {
  return Object.entries(when).every(([key, expected]) => same(selection[key], expected));
}

function semanticMatches(rule = {}, selection = {}) {
  if (!rule.semantic) return true;
  return ['glass_base','glass_type','glass_detail','glass_function']
    .some((key) => same(selection[key], rule.semantic));
}

function finite(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

function glassOpening(selection = {}) {
  const width = selection.glass_opening_width ?? selection.glassOpeningWidth;
  const height = selection.glass_opening_height ?? selection.glassOpeningHeight;
  return finite(width) && finite(height) ? { width:Number(width), height:Number(height) } : null;
}

function outsideRange(value, min, max) {
  return (finite(min) && value < Number(min)) || (finite(max) && value > Number(max));
}

export function createProductModuleGlassManufacturability(module = {}, catalog = null) {
  const rows = knownRows(module);
  const directStandard = rows.filter((row) => row.ruleType === 'STANDARD_SIZE_MANUFACTURABILITY_EVIDENCE');
  const explicitBlocks = rows.filter((row) => row.ruleType === 'EXPLICIT_BLOCK');
  const numericRules = rows.filter((row) => row.ruleType === 'GLASS_OPENING_NUMERIC_MANUFACTURABILITY');
  const blindScope = rows.find((row) => row.ruleType === 'WINDOW_SELECTOR_SCOPE' && row.glassFunction === 'BLIND') ?? null;
  const confirmationRoute = rows.find((row) => row.confirmationRoute)?.confirmationRoute ?? 'メーカー見積システム';
  const context = catalog ? buildCatalogContext(catalog, module.product?.id) : null;

  function candidateSelectable(row, selection = {}) {
    if (!row) return true;
    if (row.status === 'BLOCKED' || row.metadata?.candidateHidden === true || row.metadata?.confirmationStatus === 'BLOCK') return false;
    if (row.specificationKey !== 'glass_function' || row.value !== 'BLIND' || !blindScope) return true;
    const windowType = selection.window_type;
    if (!windowType) return true;
    if ((blindScope.blockedWindowTypes ?? []).includes(windowType)) return false;
    const partial = (blindScope.partialSelectorScopes ?? []).find((scope) => scope.windowTypeId === windowType);
    if (!partial || !selection.specific_spec) return true;
    return !(partial.blockedSpecificSpecs ?? []).includes(selection.specific_spec);
  }

  function selectedValueRow(field, value, selection = {}) {
    return (module.allowedValues ?? []).find((row) => row.specificationKey === field
      && same(row.value, value)
      && active(row)
      && (!catalog || selectorMatches(row.selector, selection, context)));
  }

  function evaluate(selection = {}) {
    const scoped = scopeSelection(module, selection);
    const explicit = explicitBlocks.find((rule) => semanticMatches(rule, scoped) && exactWhenMatches(rule.when ?? {}, scoped));
    if (explicit) return {
      status:'BLOCK', code:explicit.id, message:'正式Runtimeの既知組合せ制限により選択できません。',
      ruleIds:[explicit.id], confirmationRoute:null,
    };

    if (selection.glass_function === 'BLIND' && blindScope) {
      const windowType = selection.window_type;
      const partial = (blindScope.partialSelectorScopes ?? []).find((scope) => scope.windowTypeId === windowType);
      if ((blindScope.blockedWindowTypes ?? []).includes(windowType)
        || (partial && selection.specific_spec && (partial.blockedSpecificSpecs ?? []).includes(selection.specific_spec))) {
        return { status:'BLOCK', code:blindScope.id, message:'調光ブラインドインは選択中の窓種・仕様では製作対象外です。', ruleIds:[blindScope.id], confirmationRoute:null };
      }
      const opening = glassOpening(selection);
      if (opening && (outsideRange(opening.width, blindScope.horizontalRangeMm?.min, blindScope.horizontalRangeMm?.max)
        || outsideRange(opening.height, blindScope.verticalRangeMm?.min, blindScope.verticalRangeMm?.max))) {
        return { status:'BLOCK', code:`${blindScope.id}:DIMENSION`, message:'調光ブラインドインのガラス開口寸法が公式製作範囲外です。', ruleIds:[blindScope.id], confirmationRoute:null };
      }
    }

    if (selection.glass_function === 'SAFE') {
      if (selection.size_mode === 'STANDARD' && selection.size) {
        const direct = directStandard.find((rule) => same(rule.sizeId, selection.size) && (!rule.windowTypeId || same(rule.windowTypeId, selection.window_type)));
        if (direct) {
          if (direct.availabilityState === 'BLOCKED') return { status:'BLOCK', code:direct.id, message:'安全合わせガラスは選択中の規格サイズでは製作不可です。', ruleIds:[direct.id], confirmationRoute:null };
          if (direct.availabilityState === 'ALLOWED') return { status:'ALLOWED', code:direct.id, message:null, ruleIds:[direct.id], confirmationRoute:null };
        }
      }
      return { status:'ESTIMATE_CONFIRM_REQUIRED', code:'SAFE_RESIDUAL_ECR', message:`安全合わせガラスの最終製作可否を${confirmationRoute}で確認してください。`, ruleIds:[], confirmationRoute };
    }

    for (const field of ['glass_detail','glass_type','glass_function']) {
      const value = selection[field];
      if (value === undefined || value === null || value === '' || value === 'NONE') continue;
      const row = selectedValueRow(field, value, selection);
      if (row?.metadata?.confirmationStatus === 'ESTIMATE_CONFIRM_REQUIRED' || row?.status === 'ESTIMATE_CONFIRM_REQUIRED') {
        return {
          status:'ESTIMATE_CONFIRM_REQUIRED', code:row.metadata?.sourceGate ?? row.id,
          message:`${row.displayLabel}の最終製作可否を${row.metadata?.confirmationRoute ?? confirmationRoute}で確認してください。`,
          ruleIds:[row.id], confirmationRoute:row.metadata?.confirmationRoute ?? confirmationRoute,
        };
      }
    }
    return null;
  }

  return Object.freeze({ candidateSelectable, evaluate, directStandardCount:directStandard.length, numericRuleCount:numericRules.length });
}
