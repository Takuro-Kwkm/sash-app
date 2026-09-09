export const NEW_CONSTRUCTION_EXTERIOR_WINDOW_UI_CATEGORY = 'NEW_CONSTRUCTION_EXTERIOR_WINDOW';
import { INNER_WINDOW_UI_CATEGORY, applyInnerWindowUiOrder } from './inner-window-runtime-ui-contract.mjs';

// UI実装標準仕様書 v1.5 §15.1 / §15.4 / §15.5.
// Runtime owns existence, values and dependencies. This contract owns only the fixed presentation slots.
export const NEW_CONSTRUCTION_SASH_UI_STANDARD_ORDER = Object.freeze([
  'manufacturer',
  'product',
  'window_type',
  'window_spec',
  'handing',
  'size_mode',
  'sash_count',
  'panel_count',
  'size',
  'custom_w',
  'custom_h',
  'exterior_color',
  'interior_color',
  'screen_presence',
  'screen_form',
  'screen_type',
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

const FIXED_ORDER = Object.freeze({
  window_type: 30,
  window_spec: 40,
  handing: 50,
  size_mode: 60,
  sash_count: 70,
  panel_count: 70,
  size: 80,
  custom_w: 81,
  custom_h: 82,
  exterior_color: 90,
  interior_color: 100,
  screen_presence: 110,
  screen_form: 112,
  screen_type: 112,
  screen_midrail: 114,
  screen_net: 116,
  glass_base: 120,
  glass_type: 130,
  glass_detail: 140,
  glass_function: 150,
  glass_spacer: 160,
  glass_air_layer: 170,
  option: 210,
});

export function applyNewConstructionSashUiOrder(fields = []) {
  return fields.map((field, index) => ({
    ...field,
    displayOrder: FIXED_ORDER[field.key] ?? Number(field.displayOrder ?? 1000 + index),
  })).sort((a, b) => a.displayOrder - b.displayOrder || a.key.localeCompare(b.key, 'ja'));
}

export function applyRuntimeUiCategoryOrder(fields = [], integration = {}) {
  if (integration.uiCategory === INNER_WINDOW_UI_CATEGORY) return applyInnerWindowUiOrder(fields);
  if (integration.uiCategory === NEW_CONSTRUCTION_EXTERIOR_WINDOW_UI_CATEGORY) {
    return applyNewConstructionSashUiOrder(fields);
  }
  return [...fields].sort((a, b) => a.displayOrder - b.displayOrder || a.key.localeCompare(b.key, 'ja'));
}
