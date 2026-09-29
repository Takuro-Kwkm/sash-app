import { adaptTwCanonicalWorkbookReferenceV1 } from './tw-canonical-workbook-reference-v1-adapter.mjs';

const customField = (field_name, display_label, display_order) => ({
  field_id: `runtime:${field_name}`,
  field_name,
  display_label,
  display_order,
  data_type: 'number',
  required_mode: 'REQUIRED',
  parent_fields: ['window_type','size_mode'],
  selection_mode: 'USER_SELECTABLE',
  visibility_mode: 'CONDITIONAL',
  runtime_included: true,
  unit: 'mm',
});

const customValue = Object.freeze({
  value_id: 'size_mode:CUSTOM',
  field_name: 'size_mode',
  canonical_value: 'CUSTOM',
  display_label: '特注',
  status: 'CURRENT',
  runtime_selectable: true,
  user_selectable: true,
  manual_check: true,
  source: Object.freeze({ formalRuntime: 'dimensions.custom_dimension_rules' }),
});

function customRanges(rules = []) {
  return rules.map((rule) => ({
    '窓種ID': rule.productNode ?? rule.windowId ?? rule.selector?.window_type ?? null,
    minW: rule.geometryRule?.bounds?.minW ?? rule.bounds?.minW ?? null,
    maxW: rule.geometryRule?.bounds?.maxW ?? rule.bounds?.maxW ?? null,
    minH: rule.geometryRule?.bounds?.minH ?? rule.bounds?.minH ?? null,
    maxH: rule.geometryRule?.bounds?.maxH ?? rule.bounds?.maxH ?? null,
    rule_id: rule.id ?? null,
    evaluationType: rule.evaluationType ?? null,
    runtimeSafety: rule.runtimeSafety ?? null,
  }));
}

export function adaptTwCanonicalWorkbookReferenceV2(runtimePackage) {
  const base = adaptTwCanonicalWorkbookReferenceV1(runtimePackage);
  const document = runtimePackage.documents.runtime_master ?? runtimePackage.documents.RUNTIME_MASTER;
  const rules = document?.dimensions?.custom_dimension_rules;
  if (!Array.isArray(rules) || !rules.length) {
    throw Object.assign(new Error('TW_CANONICAL_WORKBOOK_REFERENCE_V2 requires formal dimensions.custom_dimension_rules'), {
      code: 'RUNTIME_ADAPTER_CUSTOM_DIMENSION_RULES_MISSING',
    });
  }

  const fields = base.fields.map((field) => field.field_name === 'size_mode'
    ? { ...field, selection_mode: 'USER_SELECTABLE' }
    : field);
  const sizeIndex = fields.findIndex((field) => field.field_name === 'size');
  fields.splice(sizeIndex + 1, 0,
    customField('custom_width', '特注W（mm）', 61),
    customField('custom_height', '特注H（mm）', 62),
  );

  return Object.freeze({
    ...base,
    fields,
    values: [...base.values, customValue],
    customDimensionRules: rules,
    canonicalWorkbook: Object.freeze({ customRanges: customRanges(rules) }),
    capabilities: Object.freeze({
      ...base.capabilities,
      size: 'STANDARD_AND_FORMAL_CUSTOM_SOURCE_GRAPH_GATE',
      customSize: 'FORMAL_SOURCE_GRAPH_GATE',
      customDimensionRuleCount: rules.length,
      customDimensionAutomaticRuleCount: rules.filter((rule) => rule.automatic === true).length,
      customDimensionSafety: 'OUTSIDE_BLOCK_INSIDE_REVIEW_REQUIRED',
    }),
  });
}
