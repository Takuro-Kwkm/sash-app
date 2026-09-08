const TEMPLATES = Object.freeze({
  INNER_WINDOW: Object.freeze({
    id: 'INNER_WINDOW',
    topLevelOrder: Object.freeze([
      'manufacturer',
      'product',
      'window_type',
      'glass_spec',
      'lowe_performance',
      'spacer',
      'cavity_fill',
      'body_color',
      'frame_installation',
      'custom_size',
      'options',
    ]),
    slots: Object.freeze([
      Object.freeze({
        key: 'window_type', label: '窓種類', alwaysRender: true,
        fieldKeys: Object.freeze(['window_type','sash_configuration','size_class','reverse_handing','hinge_side']),
      }),
      Object.freeze({
        key: 'glass_spec', label: 'ガラス仕様', alwaysRender: true,
        fieldKeys: Object.freeze(['glass_family','glass_type','supply_form','glass_detail','decorative_pattern','glass_config_id']),
      }),
      Object.freeze({
        key: 'lowe_performance', label: 'Low-E 性能', alwaysRender: false,
        fieldKeys: Object.freeze(['lowe_color']),
      }),
      Object.freeze({
        key: 'spacer', label: 'スペーサー', alwaysRender: false,
        fieldKeys: Object.freeze(['spacer']),
      }),
      Object.freeze({
        key: 'cavity_fill', label: '中空層', alwaysRender: false,
        fieldKeys: Object.freeze(['cavity_fill']),
      }),
      Object.freeze({
        key: 'body_color', label: '本体色', alwaysRender: true,
        fieldKeys: Object.freeze(['body_color']),
      }),
      Object.freeze({
        key: 'frame_installation', label: '枠仕様 / 納まり', alwaysRender: true,
        fieldKeys: Object.freeze(['upper_frame_spec','sash_midrail','crescent_position','frame_install_spec','fukashi_spec','joint_layout']),
      }),
      Object.freeze({
        key: 'custom_size', label: '特注サイズ', alwaysRender: true,
        fieldKeys: Object.freeze(['size_mode','order_width','order_height']),
      }),
      Object.freeze({
        key: 'options', label: 'オプション', alwaysRender: false,
        fieldKeys: Object.freeze(['option_items']),
      }),
    ]),
  }),
});

const rawLeakKeys = Object.freeze(new Set([
  'sash_configuration','size_class','reverse_handing','hinge_side',
  'glass_family','glass_type','supply_form','glass_detail','decorative_pattern',
  'upper_frame_spec','sash_midrail','crescent_position','frame_install_spec','fukashi_spec','joint_layout',
]));

export function getRuntimeUiTemplate(templateId) {
  return TEMPLATES[templateId] ?? null;
}

function buildGapAudit(template, master) {
  if (!template) return Object.freeze({ status: 'NOT_APPLICABLE', gaps: Object.freeze([]) });
  const fieldKeys = new Set((master.fields ?? []).map((field) => field.field_name));
  const gaps = [];
  if (template.id === 'INNER_WINDOW') {
    if (!fieldKeys.has('spacer')) {
      gaps.push(Object.freeze({
        affected_ui_field: 'スペーサー',
        expected_by_ui_spec: '内窓系基本項目。対象仕様で正式Runtimeが候補またはDerived/Fixed値を評価する。',
        runtime_support: 'NONE',
        actual_runtime: 'UI semantic field `spacer` をRuntime Adapterで解決できない。',
        blocking_or_nonblocking: 'BLOCKING',
        product_master_mutation: 0,
      }));
    }
    const hasDimensions = fieldKeys.has('order_width') && fieldKeys.has('order_height');
    const hasMode = fieldKeys.has('size_mode');
    const standardRecords = Boolean(master.capabilities?.uiSemanticSupport?.customSize?.standardRecordSource);
    if (!hasMode || !standardRecords) {
      gaps.push(Object.freeze({
        affected_ui_field: '特注サイズ',
        expected_by_ui_spec: '「規格 / 特注」を選択し、規格は正式Size Record、特注はRuntime Dimension Ruleで評価する。',
        runtime_support: hasDimensions ? 'PARTIAL_CUSTOM_DIMENSION_ONLY' : 'NONE',
        actual_runtime: hasDimensions
          ? 'order_width / order_height と製作範囲Ruleは存在するが、size_modeおよび正式Standard Size Record sourceが存在しない。'
          : '特注寸法入力を評価するRuntime fieldが不足している。',
        blocking_or_nonblocking: 'BLOCKING',
        product_master_mutation: 0,
      }));
    }
  }
  return Object.freeze({ status: gaps.length ? 'OPEN' : 'NONE', gaps: Object.freeze(gaps) });
}

export function buildRuntimeUiSections({ templateId, fields, master }) {
  const template = getRuntimeUiTemplate(templateId);
  if (!template) return Object.freeze({ templateId: null, sections: Object.freeze([]), gapAudit: Object.freeze({ status: 'NOT_APPLICABLE', gaps: Object.freeze([]) }) });
  const byKey = new Map(fields.map((field) => [field.key, field]));
  const gapAudit = buildGapAudit(template, master);
  const gapBySlot = new Map();
  for (const gap of gapAudit.gaps) {
    const slot = gap.affected_ui_field === 'スペーサー' ? 'spacer' : gap.affected_ui_field === '特注サイズ' ? 'custom_size' : null;
    if (!slot) continue;
    if (!gapBySlot.has(slot)) gapBySlot.set(slot, []);
    gapBySlot.get(slot).push(gap);
  }
  const sections = template.slots.map((slot, slotIndex) => {
    const slotFields = slot.fieldKeys.map((key) => byKey.get(key)).filter(Boolean);
    const gaps = gapBySlot.get(slot.key) ?? [];
    const render = slot.alwaysRender || slotFields.length > 0 || gaps.length > 0;
    return Object.freeze({
      key: slot.key,
      label: slot.label,
      displayOrder: slotIndex + 1,
      fields: Object.freeze(slotFields),
      runtimeGaps: Object.freeze(gaps),
      render,
    });
  }).filter((section) => section.render);
  return Object.freeze({ templateId: template.id, sections: Object.freeze(sections), gapAudit });
}

export function auditRuntimeUiGrouping(templateId, fields) {
  const template = getRuntimeUiTemplate(templateId);
  if (!template) return Object.freeze({ status: 'NOT_APPLICABLE', leakedFieldKeys: Object.freeze([]) });
  const grouped = new Set(template.slots.flatMap((slot) => slot.fieldKeys));
  const leaked = fields.map((field) => field.key).filter((key) => rawLeakKeys.has(key) && !grouped.has(key));
  return Object.freeze({ status: leaked.length ? 'FAIL' : 'PASS', leakedFieldKeys: Object.freeze(leaked) });
}

export const runtimeUiTemplateTopLevelOrder = Object.freeze(Object.fromEntries(
  Object.entries(TEMPLATES).map(([id, template]) => [id, template.topLevelOrder])
));
