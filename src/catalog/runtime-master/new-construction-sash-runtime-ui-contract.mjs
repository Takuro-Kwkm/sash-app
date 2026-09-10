export const NEW_CONSTRUCTION_EXTERIOR_WINDOW_UI_CATEGORY = 'NEW_CONSTRUCTION_EXTERIOR_WINDOW';
import { INNER_WINDOW_UI_CATEGORY, applyInnerWindowUiOrder } from './inner-window-runtime-ui-contract.mjs';

// UI実装標準仕様書 v1.6 §15.
// Runtime owns existence, values and dependencies. This contract owns presentation semantics only.
export const NEW_CONSTRUCTION_SASH_UI_STANDARD_ORDER = Object.freeze([
  'manufacturer',
  'product',
  'window_type',
  'window_spec',
  'handing',
  'size_mode',
  'panel_leaf',
  'size',
  'exterior_color',
  'interior_color',
  'screen_presence',
  'screen_form',
  'screen_midrail',
  'screen_net',
  'glass_base',
  'glass_type',
  'glass_detail',
  'glass_function',
  'glass_spacer',
  'glass_air_layer',
  'option',
]);

const SLOT_ORDER = Object.freeze(Object.fromEntries(NEW_CONSTRUCTION_SASH_UI_STANDARD_ORDER.map((key, index) => [key, (index + 1) * 10])));

const ALIAS_TO_SLOT = Object.freeze({
  manufacturer: 'manufacturer',
  product: 'product',
  series: 'product',
  window_type: 'window_type',

  window_spec: 'window_spec',
  shutter_type: 'window_spec',
  rain_shutter_type: 'window_spec',
  grille_type: 'window_spec',
  operation_type: 'window_spec',
  operation_method: 'window_spec',
  operator_position: 'window_spec',
  handle_type: 'window_spec',
  handle_configuration: 'window_spec',
  composition_type: 'window_spec',
  configuration: 'window_spec',
  variant: 'window_spec',

  handing: 'handing',
  size_mode: 'size_mode',
  sash_count: 'panel_leaf',
  panel_count: 'panel_leaf',
  leaf_configuration: 'panel_leaf',
  size: 'size',
  standard_size: 'size',
  custom_w: 'size',
  custom_width: 'size',
  custom_h: 'size',
  custom_height: 'size',
  exterior_color: 'exterior_color',
  interior_color: 'interior_color',

  screen: 'screen_presence',
  screen_presence: 'screen_presence',
  screen_type: 'screen_form',
  screen_form: 'screen_form',
  screen_midrail: 'screen_midrail',
  screen_net: 'screen_net',

  glass: 'glass_base',
  glass_base: 'glass_base',
  glass_type: 'glass_type',
  glass_detail: 'glass_detail',
  glass_function: 'glass_function',
  glass_additional: 'glass_function',
  glass_spacer: 'glass_spacer',
  glass_air_layer: 'glass_air_layer',
  glass_gas: 'glass_air_layer',

  option: 'option',
  options: 'option',
});

const COMMON_LABELS = Object.freeze({
  manufacturer: 'メーカー', product: '商品', window_type: '窓種類', handing: '開き勝手（吊元）',
  size_mode: 'サイズ方式', panel_leaf: '建具・枚数', size: 'サイズ', exterior_color: '外観色', interior_color: '内観色',
  screen_presence: '網戸', screen_form: '網戸形式', screen_midrail: '網戸中桟', screen_net: '網戸ネット',
  glass_base: 'ガラス', glass_type: 'ガラス種', glass_detail: 'ガラス詳細', glass_function: 'ガラス追加機能',
  glass_spacer: 'スペーサー', glass_air_layer: '中空層', option: 'その他オプション',
});

const INTERNAL_FIELDS = Object.freeze(new Set([
  'construction','internal_provider_id','provider_id','source_id','dependency_only_selector','actual_w','actual_h',
  'runtime_technical_state','internal_normalized_id','common_window_id',
]));

export function semanticSlotForRuntimeField(fieldKey) { return ALIAS_TO_SLOT[fieldKey] ?? null; }
export function isInternalRuntimeUiField(fieldKey) { return INTERNAL_FIELDS.has(fieldKey); }
export function commonLabelForRuntimeField(fieldKey, fallback = null) {
  const slot = semanticSlotForRuntimeField(fieldKey);
  return (slot && COMMON_LABELS[slot]) || fallback;
}
export function normalizeNewConstructionSashUiField(field, index = 0) {
  const slot = semanticSlotForRuntimeField(field.key);
  return { ...field, semanticSlot: slot, displayLabel: commonLabelForRuntimeField(field.key, field.displayLabel), displayOrder: slot ? SLOT_ORDER[slot] : Number(field.displayOrder ?? 1000 + index) };
}
export function applyNewConstructionSashUiOrder(fields = []) {
  return fields.filter((field) => !isInternalRuntimeUiField(field.key)).map(normalizeNewConstructionSashUiField)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.key.localeCompare(b.key, 'ja'));
}
export function applyRuntimeUiCategoryOrder(fields = [], integration = {}) {
  if (integration.uiCategory === INNER_WINDOW_UI_CATEGORY) return applyInnerWindowUiOrder(fields);
  if (integration.uiCategory === NEW_CONSTRUCTION_EXTERIOR_WINDOW_UI_CATEGORY) return applyNewConstructionSashUiOrder(fields);
  return [...fields].sort((a, b) => a.displayOrder - b.displayOrder || a.key.localeCompare(b.key, 'ja'));
}
