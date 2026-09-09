export const INNER_WINDOW_UI_CATEGORY = 'INNER_WINDOW';

// UI実装標準仕様書 v1.6 §4. Runtime owns values and dependencies; this map
// only places canonical fields into the fixed inner-window presentation slots.
const ORDER = Object.freeze({
  room_specification: 25,
  window_type: 30,
  sash_configuration: 32,
  size_class: 34,
  reverse_handing: 36,
  three_panel_layout: 37,
  hinge_side: 38,
  glass_family: 40,
  glass_structure: 42,
  low_e_type: 50,
  glass_coating_color: 52,
  glass_surface_type: 54,
  safety_treatment: 56,
  grille_type: 57,
  grille_material: 58,
  muntin_type: 59,
  vacuum_glass_product: 59.5,
  spacer_type: 60,
  gas_fill: 70,
  cavity_thickness_mm: 72,
  frame_color: 80,
  frame_installation_mode: 90,
  frame_projection: 91,
  extension_frame_type: 92,
  extension_frame_reinforcement: 93,
  bathroom_installation_type: 94,
  size_mode: 100,
  size_w: 101,
  size_h: 102,
  sash_width_allocation: 103,
  sash_w1: 104,
  sash_w2: 105,
  sash_w3: 106,
  sash_w4: 107,
});

const OPTION_DOMAINS = new Set(['HARDWARE', 'OPTION']);
const INSTALLATION_BASE = 90;
const OPTION_BASE = 110;

export function innerWindowDisplayOrder(field, index = 0) {
  if (ORDER[field.field_name] !== undefined) return ORDER[field.field_name];
  if (field.domain === 'INSTALLATION') return INSTALLATION_BASE + 5 + index / 1000;
  if (OPTION_DOMAINS.has(field.domain)) return OPTION_BASE + index / 1000;
  return 109 + index / 1000;
}

export function applyInnerWindowUiOrder(fields = []) {
  return fields.map((field, index) => ({
    ...field,
    displayOrder: ORDER[field.key] ?? Number(field.displayOrder ?? 1000 + index),
  })).sort((a, b) => a.displayOrder - b.displayOrder || a.key.localeCompare(b.key, 'ja'));
}
