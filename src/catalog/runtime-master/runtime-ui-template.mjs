const INNER_WINDOW_SECTIONS = Object.freeze([
  Object.freeze({ id: 'manufacturer', label: 'メーカー', kind: 'STATIC_IDENTITY', fieldKeys: Object.freeze([]), alwaysVisible: true }),
  Object.freeze({ id: 'product', label: '商品', kind: 'STATIC_PRODUCT', fieldKeys: Object.freeze([]), alwaysVisible: true }),
  Object.freeze({ id: 'window_type', label: '窓種類', kind: 'RUNTIME', fieldKeys: Object.freeze(['window_type','sash_configuration','size_class','reverse_handing','hinge_side']), alwaysVisible: true }),
  Object.freeze({ id: 'glass_spec', label: 'ガラス仕様', kind: 'RUNTIME', fieldKeys: Object.freeze(['glass_family','glass_type','supply_form','glass_detail','decorative_pattern']) }),
  Object.freeze({ id: 'lowe_performance', label: 'Low-E性能', kind: 'RUNTIME', fieldKeys: Object.freeze(['lowe_color']) }),
  Object.freeze({ id: 'spacer', label: 'スペーサー', kind: 'RUNTIME', fieldKeys: Object.freeze(['spacer']) }),
  Object.freeze({ id: 'cavity', label: '中空層', kind: 'RUNTIME', fieldKeys: Object.freeze(['cavity_fill']) }),
  Object.freeze({ id: 'body_color', label: '本体色', kind: 'RUNTIME', fieldKeys: Object.freeze(['body_color']) }),
  Object.freeze({ id: 'frame_install', label: '枠仕様 / 納まり', kind: 'RUNTIME', fieldKeys: Object.freeze(['upper_frame_spec','sash_midrail','crescent_position','frame_install_spec','fukashi_spec','joint_layout']) }),
  Object.freeze({ id: 'custom_size', label: '特注サイズ', kind: 'RUNTIME', fieldKeys: Object.freeze(['size_mode','order_width','order_height']), alwaysVisible: true }),
  Object.freeze({ id: 'options', label: 'オプション', kind: 'RUNTIME', fieldKeys: Object.freeze(['option_items']) }),
]);

const TEMPLATES = Object.freeze({
  INPLUS_V04R2: Object.freeze({
    id: 'INPLUS_V04R2',
    source: Object.freeze({
      manufacturer: 'LIXIL', series: 'インプラス', packageVersion: 'v0.4-R2',
      uiStandard: 'サッシ情報管理アプリ_UI実装標準仕様書_v1.7',
      uiStandardDriveFileId: '1tHPcGmN4a6BdhhozgFAFsF-KOB2R3Y4y',
      runtimeManifestDriveFileId: '1TokjIpcipm8TPxwrSO0FjyPxxvhCq5iZ',
    }),
    sections: INNER_WINDOW_SECTIONS,
    forbiddenUiFields: Object.freeze(['manufacturer','series','product_category','evidence','glass_config_id','screen','screen_type','screen_midrail','screen_net','exterior_color','interior_color']),
  }),
});

export function getRuntimeUiTemplate(templateId) { return TEMPLATES[templateId] ?? null; }
function templateFieldOrder(template) { return template.sections.flatMap((section) => section.fieldKeys); }
export function projectRuntimeUiFields(templateId, fields) {
  const template = getRuntimeUiTemplate(templateId);
  if (!template) return fields;
  const byKey = new Map(fields.map((field) => [field.key, field]));
  let displayOrder = 0;
  return template.sections.flatMap((section) => section.fieldKeys).map((key) => {
    const field = byKey.get(key);
    if (!field) return null;
    displayOrder += 1;
    return Object.freeze({ ...field, displayOrder, uiSectionId: template.sections.find((section) => section.fieldKeys.includes(key))?.id ?? null });
  }).filter(Boolean);
}
function buildGapAudit(template, master) {
  if (!template) return Object.freeze({ status: 'NOT_APPLICABLE', gaps: Object.freeze([]) });
  const runtimeFieldKeys = new Set((master.fields ?? []).map((field) => field.field_name));
  const requiredFields = ['window_type','glass_family','glass_type','body_color','frame_install_spec','size_mode','order_width','order_height','option_items'];
  const gaps = [];
  for (const key of requiredFields) if (!runtimeFieldKeys.has(key)) gaps.push(Object.freeze({ affected_ui_field: key, expected_by_ui_spec: template.source.uiStandard, runtime_support: 'MISSING', blocking_or_nonblocking: 'BLOCKING', product_master_mutation: 0 }));
  const customSize = master.capabilities?.uiSemanticSupport?.customSize;
  if (!customSize?.modeField || customSize.customSupported !== true || customSize.standardSupported !== false || !Array.isArray(customSize.dimensionFields) || customSize.dimensionFields.length !== 2) {
    gaps.push(Object.freeze({ affected_ui_field: 'size_mode', expected_by_ui_spec: 'Formal size capability contract', runtime_support: 'INVALID_OR_INCOMPLETE', blocking_or_nonblocking: 'BLOCKING', product_master_mutation: 0 }));
  }
  return Object.freeze({ status: gaps.length ? 'OPEN' : 'NONE', gaps: Object.freeze(gaps) });
}
export function buildRuntimeUiSections({ templateId, fields, master }) {
  const template = getRuntimeUiTemplate(templateId);
  if (!template) return Object.freeze({ templateId: null, sections: Object.freeze([]), gapAudit: Object.freeze({ status: 'NOT_APPLICABLE', gaps: Object.freeze([]) }) });
  const visible = new Set((fields ?? []).map((field) => field.key));
  const sections = template.sections.map((section, index) => Object.freeze({
    id: section.id, label: section.label, kind: section.kind, displayOrder: index + 1, fieldKeys: section.fieldKeys,
    visibleFieldKeys: Object.freeze(section.fieldKeys.filter((key) => visible.has(key))),
    visible: Boolean(section.alwaysVisible || section.kind.startsWith('STATIC_') || section.fieldKeys.some((key) => visible.has(key))),
  }));
  return Object.freeze({ templateId: template.id, sections: Object.freeze(sections), gapAudit: buildGapAudit(template, master) });
}
export function auditRuntimeUiGrouping(templateId, fields) {
  const template = getRuntimeUiTemplate(templateId);
  if (!template) return Object.freeze({ status: 'NOT_APPLICABLE', leakedFieldKeys: Object.freeze([]), orderMatches: true, sectionOrderMatches: true });
  const allowedOrder = templateFieldOrder(template), allowed = new Set(allowedOrder), forbidden = new Set(template.forbiddenUiFields);
  const actual = fields.map((field) => field.key), leaked = actual.filter((key) => !allowed.has(key) || forbidden.has(key));
  const expectedPositions = actual.map((key) => allowedOrder.indexOf(key));
  const orderMatches = expectedPositions.every((position, index) => position >= 0 && (index === 0 || expectedPositions[index - 1] < position));
  return Object.freeze({ status: leaked.length || !orderMatches ? 'FAIL' : 'PASS', leakedFieldKeys: Object.freeze(leaked), orderMatches, sectionOrderMatches: true });
}
export const runtimeUiTemplateTopLevelOrder = Object.freeze(Object.fromEntries(Object.entries(TEMPLATES).map(([id, template]) => [id, Object.freeze(template.sections.map((section) => section.id))])));
export const runtimeUiTemplateFieldOrder = Object.freeze(Object.fromEntries(Object.entries(TEMPLATES).map(([id, template]) => [id, Object.freeze(templateFieldOrder(template))])));
