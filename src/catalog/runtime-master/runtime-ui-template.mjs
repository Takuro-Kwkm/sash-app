const TEMPLATES = Object.freeze({
  INPLUS_V04R1: Object.freeze({
    id: 'INPLUS_V04R1',
    source: Object.freeze({
      manufacturer: 'LIXIL',
      series: 'インプラス',
      packageVersion: 'v0.4-R1',
      authoringMasterDriveFileId: '1NbvIhvxINl45MStUR17LqPOP2123fUAQ',
    }),
    fieldOrder: Object.freeze([
      'window_type',
      'sash_configuration',
      'size_class',
      'reverse_handing',
      'hinge_side',
      'order_width',
      'order_height',
      'upper_frame_spec',
      'sash_midrail',
      'crescent_position',
      'frame_install_spec',
      'fukashi_spec',
      'joint_layout',
      'body_color',
      'glass_family',
      'glass_type',
      'lowe_color',
      'cavity_fill',
      'supply_form',
      'glass_detail',
      'decorative_pattern',
      'option_items',
    ]),
    forbiddenUiFields: Object.freeze([
      'manufacturer',
      'series',
      'product_category',
      'evidence',
      'spacer',
      'glass_config_id',
      'size_mode',
      'screen',
      'screen_type',
      'screen_midrail',
      'screen_net',
      'exterior_color',
      'interior_color',
    ]),
  }),
});

const present = (value) => value !== null && value !== undefined && value !== '';

export function getRuntimeUiTemplate(templateId) {
  return TEMPLATES[templateId] ?? null;
}

function contractFieldVisible(templateId, field, state) {
  if (templateId !== 'INPLUS_V04R1') return true;
  if (field.key === 'upper_frame_spec') {
    return present(state?.fields?.order_width?.value) && present(state?.fields?.order_height?.value);
  }
  if (['cavity_fill', 'supply_form'].includes(field.key) && field.values.length <= 1) return false;
  if (['frame_install_spec', 'option_items'].includes(field.key) && field.values.length === 0) return false;
  return true;
}

export function projectRuntimeUiFields(templateId, fields, state) {
  const template = getRuntimeUiTemplate(templateId);
  if (!template) return fields;
  const byKey = new Map(fields.map((field) => [field.key, field]));
  return template.fieldOrder
    .map((key, index) => {
      const field = byKey.get(key);
      if (!field || !contractFieldVisible(templateId, field, state)) return null;
      return Object.freeze({ ...field, displayOrder: index + 1 });
    })
    .filter(Boolean);
}

function buildGapAudit(template, master) {
  if (!template) return Object.freeze({ status: 'NOT_APPLICABLE', gaps: Object.freeze([]) });
  const runtimeFieldKeys = new Set((master.fields ?? []).map((field) => field.field_name));
  const missing = template.fieldOrder.filter((key) => !runtimeFieldKeys.has(key));
  const gaps = missing.map((key) => Object.freeze({
    affected_ui_field: key,
    expected_by_ui_spec: 'Formal Authoring Master v0.4-R1 UI field',
    runtime_support: 'MISSING',
    blocking_or_nonblocking: 'BLOCKING',
    product_master_mutation: 0,
  }));
  return Object.freeze({ status: gaps.length ? 'OPEN' : 'NONE', gaps: Object.freeze(gaps) });
}

export function buildRuntimeUiSections({ templateId, master }) {
  const template = getRuntimeUiTemplate(templateId);
  if (!template) {
    return Object.freeze({
      templateId: null,
      sections: Object.freeze([]),
      gapAudit: Object.freeze({ status: 'NOT_APPLICABLE', gaps: Object.freeze([]) }),
    });
  }
  return Object.freeze({
    templateId: template.id,
    sections: Object.freeze([]),
    gapAudit: buildGapAudit(template, master),
  });
}

export function auditRuntimeUiGrouping(templateId, fields) {
  const template = getRuntimeUiTemplate(templateId);
  if (!template) return Object.freeze({ status: 'NOT_APPLICABLE', leakedFieldKeys: Object.freeze([]), orderMatches: true });
  const actual = fields.map((field) => field.key);
  const allowed = new Set(template.fieldOrder);
  const forbidden = new Set(template.forbiddenUiFields);
  const leaked = actual.filter((key) => !allowed.has(key) || forbidden.has(key));
  const expectedPositions = actual.map((key) => template.fieldOrder.indexOf(key));
  const orderMatches = expectedPositions.every((position, index) => position >= 0 && (index === 0 || expectedPositions[index - 1] < position));
  return Object.freeze({
    status: leaked.length || !orderMatches ? 'FAIL' : 'PASS',
    leakedFieldKeys: Object.freeze(leaked),
    orderMatches,
  });
}

export const runtimeUiTemplateTopLevelOrder = Object.freeze(Object.fromEntries(
  Object.entries(TEMPLATES).map(([id, template]) => [id, template.fieldOrder])
));
