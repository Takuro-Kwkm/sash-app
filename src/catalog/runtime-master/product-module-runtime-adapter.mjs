import { createCatalog } from '../catalog-adapter.mjs';
import { stabilizeSelection } from '../catalog-resolver.mjs';
import { buildCatalogContext, selectorMatches } from '../selector.mjs';

const has = (value) => value !== undefined && value !== null && value !== '';
const same = (a, b) => Object.is(a, b) || String(a) === String(b);
const clone = (value) => JSON.parse(JSON.stringify(value));

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
  return module;
}

function allowedRowFor(catalog, productId, field, value, selection, context) {
  return catalog.allowedValues.find((row) => row.productId === productId && row.specificationKey === field &&
    row.status !== 'INACTIVE' && same(row.value, value) && selectorMatches(row.selector, selection, context)) ?? null;
}

function deriveInternalConstruction(module, selection, defaultConstruction = null) {
  if (!has(selection.size)) return null;
  const sizeRow = (module.allowedValues ?? []).find((row) => row.specificationKey === 'size' && same(row.value, selection.size));
  const metadata = sizeRow?.metadata ?? {};
  const explicit = metadata.derivedConstruction ?? metadata.construction ?? metadata.constructionSource;
  if (has(explicit) && !String(explicit).includes('・')) return explicit;
  return constructionFromSelector({ construction: metadata.internalConstructionSelector }, defaultConstruction) ?? defaultConstruction;
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
  const catalog = createCatalog([module]);
  const productId = module.product.id;

  function resolveUi(inputSelection = {}) {
    const original = { ...(inputSelection ?? {}) };
    delete original.construction;
    let working = { ...original };
    let result = stabilizeSelection(catalog, productId, working);

    const derivedConstruction = deriveInternalConstruction(module, result.selection, constructionDefault);
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

    return {
      selection: publicSelection,
      internalSelection: resolved,
      fields,
      notices: result.notices ?? [],
      manualWarnings: result.manualWarnings ?? [],
      dimensionResult: result.dimensionResult ?? null,
      clearedFields,
      validation: { status: missingRequiredFields.length ? 'INCOMPLETE' : 'VALID', errors: [], missingRequiredFields },
      orderReady: false,
    };
  }

  return Object.freeze({ master: null, resolver: null, uiResolver: resolveUi, productModule: module });
}
