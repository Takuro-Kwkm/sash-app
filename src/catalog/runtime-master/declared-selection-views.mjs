import {selectorMatches, buildCatalogContext} from '../selector.mjs';

const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

// A presentation choice may represent an exact tuple of adopted source values.
// Candidate validity still belongs to the existing Catalog selector/resolver.
export function resolveDeclaredSelectionViews(primary, document, input = {}) {
  const views = document.selection_views ?? [];
  const selection = {...input};
  for (const view of views) {
    let choice = view.choices.find(row => row.value === selection[view.key]);
    if (!own(selection, view.key)) {
      const matches = view.choices.filter(row => Object.entries(row.assign).every(([key, value]) => own(selection, key) && selection[key] === value));
      if (matches.length === 1) {
        [choice] = matches;
        selection[view.key] = choice.value;
      }
    }
    if (choice) Object.assign(selection, choice.assign);
  }
  let result = primary.uiResolver(selection);
  let changed = false;
  for (const view of views) {
    if (!own(selection, view.key) || own(result.selection, view.key)) continue;
    for (const key of view.source_fields) delete selection[key];
    delete selection[view.key];
    changed = true;
  }
  if (changed) result = primary.uiResolver(selection);
  const hidden = new Set(document.product_module.specificationDefinitions.filter(row => row.uiHidden).map(row => row.key));
  result.fields = result.fields.filter(field => !hidden.has(field.key));
  result.validation.missingRequiredFields = [...new Set(result.validation.missingRequiredFields.map(key =>
    views.find(view => view.source_fields.includes(key))?.key ?? key))];
  return result;
}

export function declaredSelectionErrors(module, input, selection) {
  const errors = [], context = buildCatalogContext(module, module.product.id);
  const keys = new Set(module.specificationDefinitions.map(row => row.key));
  for (const set of module.ruleSets ?? []) {
    if (set.type !== 'SELECTION_VALIDATION' || set.status === 'INACTIVE') continue;
    if (set.payload.rejectUnknownFields) {
      for (const key of Object.keys(input ?? {})) if (!keys.has(key)) errors.push({
        errorCode: 'UNDECLARED_SELECTION_FIELD', field: key, message: '未対応の入力項目があります。選択内容を確認してください。',
      });
    }
    for (const rule of set.payload.numbers ?? []) {
      const value = input?.[rule.key];
      if (value === undefined || value === null || value === '') continue;
      if (typeof value !== 'number' || !Number.isFinite(value) || rule.integer && !Number.isInteger(value) ||
        rule.minimum !== undefined && value < rule.minimum || rule.maximum !== undefined && value > rule.maximum) errors.push({
        errorCode: 'DECLARED_REQUEST_NUMBER_INVALID', field: rule.key, message: '依頼数量は1以上の整数で入力してください。',
      });
    }
    for (const rule of set.payload.rules) if (selectorMatches(rule.when, selection, context)) errors.push({
      errorCode: 'DECLARED_SELECTION_FORBIDDEN', ruleId: rule.id, fields: rule.fields,
      message: rule.message, evidenceIds: rule.evidenceIds,
    });
  }
  return errors;
}

export function attachDeclaredSalesHandoff(result, document) {
  const contract = document.sales_handoff;
  if (!contract) return;
  const context = buildCatalogContext(document.product_module, document.product_module.product.id);
  result.confirmationRequests = document.product_module.dependencies.filter(row => row.mode === 'MANUAL_CHECK' && row.metadata && selectorMatches(row.when, result.selection, context))
    .map(row => ({...row.metadata, code: row.metadata.id, message: row.metadata.question, confirmation_to: row.metadata.owner, automatic_orderability: false}));
  const valid = !result.validation.errors.length && !result.validation.missingRequiredFields.length;
  const width=result.selection[contract.dimensions.width], height=result.selection[contract.dimensions.height];
  result.sales_request_handoff = {
    quantity: result.selection[contract.quantity_field] ?? null, quantity_role: 'SALES_REQUEST_COUNT',
    dimensions: {width: width ?? null, height: height ?? null, label: contract.dimensions.label, unit: contract.dimensions.unit},
    specifications: Object.fromEntries(document.product_module.specificationDefinitions.filter(row => !contract.request_fields.includes(row.key) && !(document.selection_views ?? []).some(view => view.key === row.key))
      .filter(row => own(result.selection, row.key)).map(row => [row.key, result.selection[row.key]])),
    confirmation_requests: result.confirmationRequests, fixed_handoff_facts: document.fixed_handoff_facts,
    request_valid: valid, automatic_orderability: false, manufacturing_approval: false, price: null, bom: null, set_code: null,
  };
  result.sales_request_state=valid?'READY_FOR_MANUFACTURER_ESTIMATE':'INCOMPLETE';
}
