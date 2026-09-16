import { applyGlobalWindowSelectionFlow } from './global-window-selection-flow-engine.mjs';

export const INNER_WINDOW_UI_CATEGORY = 'INNER_WINDOW';

// Runtime/Adapter may retain its own source order for normalization, but the final
// presentation order is owned exclusively by Global Window Selection Flow.
const ORDER = Object.freeze({
  room_specification:25, window_type:30, sash_configuration:32, size_class:34, reverse_handing:36, three_panel_layout:37, hinge_side:38,
  glass_family:40, glass_structure:42, glass_type:43, supply_form:44, glass_detail:45, decorative_pattern:46,
  low_e_type:50, lowe_color:51, glass_coating_color:52, glass_surface_type:54, safety_treatment:56,
  grille_type:57, grille_material:58, muntin_type:59, vacuum_glass_product:59.5, spacer_type:60, spacer:61, gas_fill:70, cavity_fill:71, cavity_thickness_mm:72,
  frame_color:80, body_color:81,
  frame_installation_mode:90, frame_projection:91, extension_frame_type:92, extension_frame_reinforcement:93, bathroom_installation_type:94,
  upper_frame_spec:95, sash_midrail:96, crescent_position:97, frame_install_spec:98, fukashi_spec:99, joint_layout:99.5,
  size_mode:100, size_w:101, size_h:102, order_width:103, order_height:104, sash_width_allocation:105, sash_w1:106, sash_w2:107, sash_w3:108, sash_w4:109,
  option_items:120,
});

export function innerWindowDisplayOrder(field, index = 0) {
  if (ORDER[field.field_name] !== undefined) return ORDER[field.field_name];
  return Number(field.display_order ?? field.displayOrder ?? 1000 + index);
}

// Canonical category slots are explicit and closed. This intentionally contains
// both current Uchirimo and Inplus user-facing Runtime fields. Unknown fields do
// not fall through by domain: they fail FLOW_SCHEMA_UNMAPPED_FIELD_GATE instead.
export const INNER_WINDOW_UI_STANDARD_ORDER = Object.freeze([
  'window_type',
  'room_specification','sash_configuration','reverse_handing','three_panel_layout','hinge_side',
  'size_class','size_mode','size_w','size_h','order_width','order_height','sash_width_allocation','sash_w1','sash_w2','sash_w3','sash_w4',
  'frame_color','body_color',
  'glass_family','glass_structure','glass_type','supply_form','glass_detail','decorative_pattern','low_e_type','lowe_color','glass_coating_color','glass_surface_type','safety_treatment',
  'grille_type','grille_material','muntin_type','vacuum_glass_product','spacer_type','spacer','gas_fill','cavity_fill','cavity_thickness_mm',
  'frame_installation_mode','frame_projection','extension_frame_type','extension_frame_reinforcement','bathroom_installation_type',
  'upper_frame_spec','sash_midrail','crescent_position','frame_install_spec','fukashi_spec','joint_layout',
  'option_items',
]);

const CONFIGURATION_SLOTS = new Set(['room_specification','sash_configuration','reverse_handing','three_panel_layout','hinge_side']);
const SIZE_SLOTS = new Set(['size_class','size_mode','size_w','size_h','order_width','order_height','sash_width_allocation','sash_w1','sash_w2','sash_w3','sash_w4']);
const FINISH_SLOTS = new Set(['frame_color','body_color']);
const GLAZING_SLOTS = new Set(['glass_family','glass_structure','glass_type','supply_form','glass_detail','decorative_pattern','low_e_type','lowe_color','glass_coating_color','glass_surface_type','safety_treatment','grille_type','grille_material','muntin_type','vacuum_glass_product','spacer_type','spacer','gas_fill','cavity_fill','cavity_thickness_mm']);
const INSTALLATION_SLOTS = new Set(['frame_installation_mode','frame_projection','extension_frame_type','extension_frame_reinforcement','bathroom_installation_type','upper_frame_spec','sash_midrail','crescent_position','frame_install_spec','fukashi_spec','joint_layout']);
const OPTION_SLOTS = new Set(['option_items']);

export function semanticSlotForInnerWindowField(key) {
  return INNER_WINDOW_UI_STANDARD_ORDER.includes(key) ? key : null;
}

export function semanticStageForInnerWindowSlot(slot) {
  if (slot === 'window_type') return 'OPENING';
  if (CONFIGURATION_SLOTS.has(slot)) return 'CONFIGURATION';
  if (SIZE_SLOTS.has(slot)) return 'SIZE';
  if (FINISH_SLOTS.has(slot)) return 'FINISH';
  if (GLAZING_SLOTS.has(slot)) return 'GLAZING';
  if (INSTALLATION_SLOTS.has(slot)) return 'INSTALLATION_SURVEY';
  if (OPTION_SLOTS.has(slot)) return 'OPTION';
  return null;
}

const STANDARD_LABELS = Object.freeze({
  window_type:'窓種類', size_mode:'サイズ方式', size_w:'特注W（mm）', size_h:'特注H（mm）', order_width:'特注W（mm）', order_height:'特注H（mm）',
  frame_color:'本体色', body_color:'本体色', glass_family:'ガラス仕様', glass_type:'ガラス種', low_e_type:'Low-E性能', lowe_color:'Low-E性能',
  spacer_type:'スペーサー', spacer:'スペーサー', gas_fill:'中空層', cavity_fill:'中空層', frame_installation_mode:'枠仕様 / 納まり', frame_install_spec:'枠仕様 / 納まり',
  option_items:'オプション',
});

function standardLabelForInnerWindowField(key, fallback) {
  return STANDARD_LABELS[key] ?? fallback;
}

export function applyInnerWindowUiOrder(fields = []) {
  return applyGlobalWindowSelectionFlow(fields, {
    uiCategory: INNER_WINDOW_UI_CATEGORY,
    canonicalSlotOrder: INNER_WINDOW_UI_STANDARD_ORDER,
    semanticSlotForField: semanticSlotForInnerWindowField,
    semanticStageForSlot: semanticStageForInnerWindowSlot,
    approvedExtensionForField: () => null,
    standardLabelForField: standardLabelForInnerWindowField,
  });
}
