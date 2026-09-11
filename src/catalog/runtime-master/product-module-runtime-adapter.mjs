import { createCatalog } from '../catalog-adapter.mjs';
import { stabilizeSelection } from '../catalog-resolver.mjs';
import { buildCatalogContext, selectorMatches } from '../selector.mjs';

const has = (value) => value !== undefined && value !== null && value !== '';
const same = (a, b) => Object.is(a, b) || String(a) === String(b);
const clone = (value) => JSON.parse(JSON.stringify(value));
const finite = (value) => Number.isFinite(Number(value));
const within = (value, min, max) => finite(value) && (min === null || min === undefined || Number(value) >= Number(min)) && (max === null || max === undefined || Number(value) <= Number(max));

function runtimeDocument(runtimePackage, entry) {
  const preferred = entry.productModuleRole;
  if (preferred && runtimePackage.documents[preferred]) return runtimePackage.documents[preferred];
  for (const role of ['RUNTIME_JSON_PACKAGE', 'runtime_master', 'RUNTIME_MASTER']) {
    if (runtimePackage.documents[role]) return runtimePackage.documents[role];
  }
  const document = Object.values(runtimePackage.documents).find((value) => value?.product_module);
  if (!document) {
    const error = new Error('Formal Runtime package does not contain a product_module document');
    error.code = 'PRODUCT_MODULE_RUNTIME_DOCUMENT_MISSING';
    throw error;
  }
  return document;
}

function internalDefinition(definition) {
  return definition?.internal === true || definition?.technical === true || definition?.userSelectable === false ||
    definition?.selectionMode === 'DERIVED' || definition?.applicability === 'INTERNAL_RESOLVED' || definition?.key === 'construction';
}

function constructionFromSelector(selector, fallback = null) {
  const raw = selector?.construction;
  if (typeof raw === 'string') return raw;
  const values = raw?.$in;
  if (Array.isArray(values) && values.length === 1) return values[0];
  if (Array.isArray(values) && values.includes(fallback)) return fallback;
  return fallback;
}

function prepareModuleForInternalConstruction(sourceModule) {
  const module = clone(sourceModule);
  const constructionDef = module.specificationDefinitions?.find((def) => def.key === 'construction');
  const formalDefault = constructionDef?.defaultValue ?? null;
  for (const row of module.allowedValues ?? []) {
    if (row.specificationKey !== 'size' || !row.selector?.construction) continue;
    row.metadata ??= {};
    row.metadata.internalConstructionSelector = clone(row.selector.construction);
    row.metadata.derivedConstruction ??= constructionFromSelector(row.selector, formalDefault);
    const { construction, ...rest } = row.selector;
    row.selector = rest;
  }
  for (const set of module.ruleSets ?? []) {
    if (set.type !== 'DIMENSION_RULES') continue;
    const rules = Array.isArray(set.payload) ? set.payload : (set.payload?.rules ?? []);
    for (const rule of rules) {
      if (!rule.selector?.internal_construction) continue;
      rule.selector = { ...rule.selector, construction: rule.selector.internal_construction };
      delete rule.selector.internal_construction;
    }
  }
  const hasDimensionRules = (module.ruleSets ?? []).some((set) => set.type === 'DIMENSION_RULES' && set.status !== 'INACTIVE');
  if (!hasDimensionRules) {
    const sourceSet = (module.ruleSets ?? []).find((set) => set.type === 'CUSTOM_DIMENSION_RULE_TABLE' && set.status !== 'INACTIVE');
    if (sourceSet) {
      const converted = (sourceSet.payload ?? []).filter((row) => row['有効'] !== false).map((row) => {
        const selector = { window_type: row['窓種ID'] };
        const specs = String(row['固有仕様ID'] ?? '').split('|').map((value) => value.trim()).filter((value) => value && value !== '*');
        if (specs.length === 1) selector.specific_spec = specs[0];
        else if (specs.length > 1) selector.specific_spec = { $in: specs };
        return {
          id: row.range_id,
          type: row['判定方式'],
          bounds: { minW: row.W_MIN, maxW: row.W_MAX, minH: row.H_MIN, maxH: row.H_MAX },
          selector,
          result: row.APP結果 ?? 'REVIEW_REQUIRED',
          source: row,
        };
      });
      module.ruleSets.push({
        id: `${module.product.id}:formal-custom-dimension-runtime`,
        productId: module.product.id,
        type: 'DIMENSION_RULES',
        status: 'ACTIVE',
        selector: { size_mode: 'CUSTOM' },
        payload: converted,
        evidenceIds: sourceSet.evidenceIds ?? [],
      });
    }
  }
  return module;
}

function allowedRowFor(catalog, productId, field, value, selection, context) {
  return catalog.allowedValues.find((row) => row.productId === productId && row.specificationKey === field &&
    row.status !== 'INACTIVE' && same(row.value, value) && selectorMatches(row.selector, selection, context)) ?? null;
}

function deriveStandardConstruction(module, selection, defaultConstruction = null) {
  if (!has(selection.size)) return null;
  const sizeRow = (module.allowedValues ?? []).find((row) => row.specificationKey === 'size' && same(row.value, selection.size));
  const metadata = sizeRow?.metadata ?? {};
  const explicit = metadata.derivedConstruction ?? metadata.construction ?? metadata.constructionSource;
  if (has(explicit) && !String(explicit).includes('・')) return explicit;
  return constructionFromSelector({ construction: metadata.internalConstructionSelector }, explicit ?? defaultConstruction) ?? explicit ?? defaultConstruction;
}

function dimensionRules(module) {
  return (module.ruleSets ?? []).filter((row) => row.type === 'DIMENSION_RULES' && row.status !== 'INACTIVE')
    .flatMap((row) => Array.isArray(row.payload) ? row.payload : (row.payload?.rules ?? []));
}

function customConstructionCandidates(module, catalog, productId, selection) {
  if (selection.size_mode !== 'CUSTOM' || !finite(selection.custom_width) || !finite(selection.custom_height)) return [];
  const context = buildCatalogContext(catalog, productId);
  const candidates = [];
  for (const rule of dimensionRules(module)) {
    const selector = { ...(rule.selector ?? {}) };
    delete selector.construction;
    if (!selectorMatches(selector, selection, context)) continue;
    const bounds = rule.bounds ?? {};
    if (!within(selection.custom_width, bounds.minW, bounds.maxW) || !within(selection.custom_height, bounds.minH, bounds.maxH)) continue;
    if (has(rule.construction)) candidates.push(String(rule.construction));
    else if (has(rule.selector?.construction)) candidates.push(String(rule.selector.construction));
  }
  return [...new Set(candidates)];
}

function isEmpty(value) {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
}

export function adaptProductModuleRuntimeV1(runtimePackage, entry) {
  const document = runtimeDocument(runtimePackage, entry);
  const sourceModule = document.product_module;
  if (!sourceModule?.product?.id || !Array.isArray(sourceModule.specificationDefinitions) || !Array.isArray(sourceModule.allowedValues)) {
    const error = new Error('Formal Runtime product_module is incomplete');
    error.code = 'PRODUCT_MODULE_RUNTIME_INVALID';
    throw error;
  }
  const module = prepareModuleForInternalConstruction(sourceModule);
  const constructionDef = module.specificationDefinitions.find((def) => def.key === 'construction');
  const constructionDefault = constructionDef?.defaultValue ?? null;
  const constructionResolution = (module.ruleSets ?? []).find((set) => set.type === 'INTERNAL_FIELD_RESOLUTION' && set.payload?.field === 'construction');
  const customConstructionResolutionEnabled = constructionResolution?.payload?.custom?.mode === 'DERIVE_FROM_APPLICABLE_DIMENSION_RULES';
  const catalog = createCatalog([module]);
  const productId = module.product.id;

  function resolveUi(inputSelection = {}) {
    const original = { ...(inputSelection ?? {}) };
    delete original.construction;
    delete original.internal_construction;
    let working = { ...original };
    let result = stabilizeSelection(catalog, productId, working);
    let dimensionOverride = null;
    const manualWarnings = [...(result.manualWarnings ?? [])];

    let derivedConstruction = deriveStandardConstruction(module, result.selection, constructionDefault);
    if (!derivedConstruction && customConstructionResolutionEnabled && result.selection.size_mode === 'CUSTOM' && finite(result.selection.custom_width) && finite(result.selection.custom_height)) {
      const candidates = customConstructionCandidates(module, catalog, productId, result.selection);
      if (candidates.length === 1) derivedConstruction = candidates[0];
      else if (candidates.length > 1) {
        dimensionOverride = {
          status: 'REVIEW_REQUIRED',
          code: 'REVIEW_REQUIRED_CONSTRUCTION_AMBIGUOUS',
          message: `特注寸法に複数の内部工法候補（${candidates.join(' / ')}）が成立します。工法はユーザー入力に戻さず、一次資料・見積システムで最終確認してください。`,
          constructionCandidates: candidates,
        };
        manualWarnings.push(dimensionOverride.message);
      } else {
        dimensionOverride = {
          status: 'BLOCK',
          code: 'RUNTIME_CONSTRUCTION_NOT_RESOLVED',
          message: '特注寸法に対応する内部工法候補を正式Runtimeから解決できません。',
          constructionCandidates: [],
        };
      }
    }

    if (derivedConstruction) {
      working = { ...result.selection, construction: derivedConstruction };
      result = stabilizeSelection(catalog, productId, working);
    }

    const resolved = { ...result.selection };
    const context = buildCatalogContext(catalog, productId);
    const fields = result.fields.map((field) => ({
      ...field,
      values: field.values.map((choice) => {
        const row = allowedRowFor(catalog, productId, field.key, choice.value, resolved, context);
        return {
          ...choice,
          ...(row ? { runtimeValueRow: row } : {}),
          disabled: row?.userSelectable === false || row?.runtimeSelectable === false,
        };
      }).filter((choice) => !choice.disabled || internalDefinition(module.specificationDefinitions.find((def) => def.key === field.key))),
    }));

    const missingRequiredFields = fields.filter((field) => field.required && isEmpty(resolved[field.key])).map((field) => field.key);
    const clearedFields = Object.keys(original).filter((key) => !Object.prototype.hasOwnProperty.call(resolved, key));
    const publicSelection = { ...resolved };
    delete publicSelection.construction;
    delete publicSelection.internal_construction;
    const dimensionResult = dimensionOverride ?? result.dimensionResult ?? null;
    const validationStatus = missingRequiredFields.length ? 'INCOMPLETE'
      : dimensionResult?.status === 'BLOCK' ? 'INVALID'
      : dimensionResult?.status === 'REVIEW_REQUIRED' ? 'MANUAL_CHECK'
      : 'VALID';

    return {
      selection: publicSelection,
      internalSelection: resolved,
      fields,
      notices: result.notices ?? [],
      manualWarnings,
      dimensionResult,
      clearedFields,
      validation: { status: validationStatus, errors: [], missingRequiredFields },
      orderReady: false,
    };
  }

  return Object.freeze({ master: null, resolver: null, uiResolver: resolveUi, productModule: module });
}
