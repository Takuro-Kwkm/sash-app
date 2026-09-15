import { applyGlobalWindowSelectionFlow } from './global-window-selection-flow-engine.mjs';

export const INNER_WINDOW_UI_CATEGORY = 'INNER_WINDOW';

// Legacy adapter-facing order remains available for Runtime model construction.
// Final presentation order is owned by Global Window Selection Flow.
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

export const INNER_WINDOW_UI_STANDARD_ORDER = Object.freeze([
  'window_type',
  'room_specification', 'sash_configuration', 'reverse_handing', 'three_panel_layout', 'hinge_side',
  'size_class', 'size_mode', 'size_w', 'size_h', 'sash_width_allocation', 'sash_w1', 'sash_w2', 'sash_w3', 'sash_w4',
  'frame_color',
  'glass_family', 'glass_structure', 'low_e_type', 'glass_coating_color', 'glass_surface_type', 'safety_treatment',
  'grille_type', 'grille_material', 'muntin_type', 'vacuum_glass_product', 'spacer_type', 'gas_fill', 'cavity_thickness_mm',
  'frame_installation_mode', 'frame_projection', 'extension_frame_type', 'extension_frame_reinforcement', 'bathroom_installation_type',
]);

const CONFIGURATION_SLOTS = new Set(['room_specification', 'sash_configuration', 'reverse_handing', 'three_panel_layout', 'hinge_side']);
const SIZE_SLOTS = new Set(['size_class', 'size_mode', 'size_w', 'size_h', 'sash_width_allocation', 'sash_w1', 'sash_w2', 'sash_w3', 'sash_w4']);
const GLAZING_SLOTS = new Set(['glass_family', 'glass_structure', 'low_e_type', 'glass_coating_color', 'glass_surface_type', 'safety_treatment', 'grille_type', 'grille_material', 'muntin_type', 'vacuum_glass_product', 'spacer_type', 'gas_fill', 'cavity_thickness_mm']);
const INSTALLATION_SLOTS = new Set(['frame_installation_mode', 'frame_projection', 'extension_frame_type', 'extension_frame_reinforcement', 'bathroom_installation_type']);

export function semanticSlotForInnerWindowField(key) {
  return INNER_WINDOW_UI_STANDARD_ORDER.includes(key) ? key : null;
}

export function semanticStageForInnerWindowSlot(slot) {
  if (slot === 'window_type') return 'OPENING';
  if (CONFIGURATION_SLOTS.has(slot)) return 'CONFIGURATION';
  if (SIZE_SLOTS.has(slot)) return 'SIZE';
  if (slot === 'frame_color') return 'FINISH';
  if (GLAZING_SLOTS.has(slot)) return 'GLAZING';
  if (INSTALLATION_SLOTS.has(slot)) return 'INSTALLATION_SURVEY';
  return null;
}

function approvedInnerWindowExtension(key, field = {}) {
  if (field.domain === 'INSTALLATION') return { slot: `extension:installation:${key}`, stage: 'INSTALLATION_SURVEY', order: field.displayOrder };
  if (OPTION_DOMAINS.has(field.domain)) return { slot: `extension:option:${key}`, stage: 'OPTION', order: field.displayOrder };
  return null;
}

export function applyInnerWindowUiOrder(fields = []) {
  return applyGlobalWindowSelectionFlow(fields, {
    uiCategory: INNER_WINDOW_UI_CATEGORY,
    canonicalSlotOrder: INNER_WINDOW_UI_STANDARD_ORDER,
    semanticSlotForField: semanticSlotForInnerWindowField,
    semanticStageForSlot: semanticStageForInnerWindowSlot,
    approvedExtensionForField: approvedInnerWindowExtension,
  });
}
