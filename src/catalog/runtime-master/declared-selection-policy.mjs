import {selectorMatches, buildCatalogContext} from '../selector.mjs';

const has = value => value !== undefined && value !== null && value !== '';

// Classifications use the master ranges; overlapping ranges remain unresolved.
export function classifyDeclaredFields(module, input) {
  const selection = {...input}, context = buildCatalogContext(module, module.product.id);
  const results = [];
  for (const set of module.ruleSets ?? []) {
    if (set.type !== 'INTERNAL_CLASSIFICATIONS' || set.status === 'INACTIVE') continue;
    for (const rule of set.payload) {
      delete selection[rule.targetField];
      if (!selectorMatches(rule.applicability, selection, context)) continue;
      if (!has(selection[rule.widthField]) || !has(selection[rule.heightField])) continue;
      const width = Number(selection[rule.widthField]), height = Number(selection[rule.heightField]);
      const matches = rule.cases.filter(row => selectorMatches(row.when, selection, context) &&
        width >= row.bounds.minW && width <= row.bounds.maxW && height >= row.bounds.minH && height <= row.bounds.maxH);
      const values = [...new Set(matches.map(row => row.value))];
      if (values.length === 1) selection[rule.targetField] = values[0];
      results.push({field: rule.targetField, status: values.length === 1 ? 'RESOLVED' : 'REVIEW_REQUIRED', candidateCount:values.length, ruleIds: matches.map(row => row.id)});
    }
  }
  return {selection, results};
}

// Shared local/reference policy: only declared mappings may assign a linked value.
export function applyDeclaredSelectionLinks(result, module) {
  const context = buildCatalogContext(module, module.product.id);
  for (const set of module.ruleSets ?? []) {
    if (set.type !== 'SELECTION_LINKS' || set.status === 'INACTIVE') continue;
    for (const rule of set.payload) {
      if (!selectorMatches(rule.applicability, result.selection, context)) continue;
      const field = result.fields.find(row => row.key === rule.targetField);
      delete result.selection[rule.targetField];
      if (!field) continue;
      field.readOnly = true; field.disabled = true; field.selectionMode = 'DERIVED';
      const matches = rule.cases.filter(row => selectorMatches(row.when, result.selection, context));
      const values = [...new Set(matches.map(row => row.value))];
      const value = values.length === 1 && field.values.some(row => row.value === values[0]) ? values[0] : undefined;
      if (has(value)) {
        result.selection[rule.targetField] = value;
        field.feedback = {severity:'info', message:rule.resolvedMessage};
      } else {
        field.feedback = {severity:'warning', message:rule.parents.every(key => has(result.selection[key])) ? rule.unavailableMessage : rule.pendingMessage};
        if (rule.parents.every(key => has(result.selection[key]))) result.manualWarnings.push(rule.unavailableMessage);
      }
    }
  }
}
