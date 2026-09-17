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

const installationExtension = (key, order) => Object.freeze({ slot:`extension:installation:${key}`, stage:'INSTALLATION_SURVEY', order });
const optionExtension = (key, order) => Object.freeze({ slot:`extension:option:${key}`, stage:'OPTION', order });

// Category differences are declarative extensions, never a domain-based fallback.
// These keys are the current formal Uchirimo user-facing measurement/installation
// and hardware/option fields. Any new key requires an explicit code review entry.
const APPROVED_INNER_WINDOW_EXTENSIONS = Object.freeze({
  opening_w_top: installationExtension('opening_w_top', 200),
  opening_w_middle: installationExtension('opening_w_middle', 201),
  opening_w_bottom: installationExtension('opening_w_bottom', 202),
  opening_h_left: installationExtension('opening_h_left', 203),
  opening_h_middle: installationExtension('opening_h_middle', 204),
  opening_h_right: installationExtension('opening_h_right', 205),
  diagonal_1: installationExtension('diagonal_1', 206),
  diagonal_2: installationExtension('diagonal_2', 207),
  available_mounting_depth: installationExtension('available_mounting_depth', 208),
  existing_window_interference: installationExtension('existing_window_interference', 209),
  existing_hardware_interference: installationExtension('existing_hardware_interference', 210),
  structural_support_condition: installationExtension('structural_support_condition', 211),
  floor_support_condition: installationExtension('floor_support_condition', 212),
  construction: installationExtension('construction', 213),
  jamb_projection_a_mm: installationExtension('jamb_projection_a_mm', 214),
  jamb_face_b_mm: installationExtension('jamb_face_b_mm', 215),
  jamb_height_h_mm: installationExtension('jamb_height_h_mm', 216),
  jamb_height_h1_mm: installationExtension('jamb_height_h1_mm', 217),
  jamb_height_h2_mm: installationExtension('jamb_height_h2_mm', 218),
  jamb_height_h3_mm: installationExtension('jamb_height_h3_mm', 219),
  sill_upper_c_mm: installationExtension('sill_upper_c_mm', 220),
  sill_lower_d_mm: installationExtension('sill_lower_d_mm', 221),
  wall_surface_for_reinforcement_available: installationExtension('wall_surface_for_reinforcement_available', 222),
  substrate_present: installationExtension('substrate_present', 223),
  substrate_wall_gap_present: installationExtension('substrate_wall_gap_present', 224),
  substrate_or_structure_present: installationExtension('substrate_or_structure_present', 225),
  substrate_or_structure_wall_gap_present: installationExtension('substrate_or_structure_wall_gap_present', 226),
  stud_spacing_condition_met: installationExtension('stud_spacing_condition_met', 227),
  tool_floor_interference: installationExtension('tool_floor_interference', 228),
  floor_supports_load: installationExtension('floor_supports_load', 229),
  floor_screw_holding: installationExtension('floor_screw_holding', 230),
  baseboard_interference: installationExtension('baseboard_interference', 231),
  vertical_horizontal_jamb_step_e_mm: installationExtension('vertical_horizontal_jamb_step_e_mm', 232),
  lower_mounting_surface_horizontal_or_adjustable: installationExtension('lower_mounting_surface_horizontal_or_adjustable', 233),
  mounting_surface_flat: installationExtension('mounting_surface_flat', 234),
  mounting_surface_damage_protection: installationExtension('mounting_surface_damage_protection', 235),
  resin_jamb_face_screw_fixed: installationExtension('resin_jamb_face_screw_fixed', 236),
  lower_resin_jamb_space_mm: installationExtension('lower_resin_jamb_space_mm', 237),
  existing_lower_jamb_angle_present: installationExtension('existing_lower_jamb_angle_present', 238),
  lower_jamb_a_mm: installationExtension('lower_jamb_a_mm', 239),
  lower_jamb_a_prime_mm: installationExtension('lower_jamb_a_prime_mm', 240),
  hardware_tip_mounting_depth_A_mm: installationExtension('hardware_tip_mounting_depth_A_mm', 241),
  existing_angle_height_mm: installationExtension('existing_angle_height_mm', 242),
  existing_angle_tip_mm: installationExtension('existing_angle_tip_mm', 243),
  system_bath_component_screw_interference: installationExtension('system_bath_component_screw_interference', 244),
  existing_window_to_jamb_step_large: installationExtension('existing_window_to_jamb_step_large', 245),
  crescent_presence: optionExtension('crescent_presence', 300),
  crescent_type: optionExtension('crescent_type', 301),
  pull_handle_type: optionExtension('pull_handle_type', 302),
  pull_handle_position: optionExtension('pull_handle_position', 303),
  operating_handle_type: optionExtension('operating_handle_type', 304),
  middle_rail_option: optionExtension('middle_rail_option', 305),
  middle_rail_position: optionExtension('middle_rail_position', 306),
  ventilator_option: optionExtension('ventilator_option', 307),
  bottom_rail_type: optionExtension('bottom_rail_type', 308),
  arm_stopper_option: optionExtension('arm_stopper_option', 309),
  outside_handle_option: optionExtension('outside_handle_option', 310),
});

const INNER_WINDOW_TECHNICAL_EXACT = new Set([
  'glass_structure_code','glass_spec_id','glass_size_constraint_group',
]);

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

export function approvedInnerWindowExtensionForField(key) {
  return APPROVED_INNER_WINDOW_EXTENSIONS[key] ?? null;
}

export function shouldExposeInnerWindowRuntimeField(field = {}) {
  const key = String(field.key ?? field.field_name ?? '').trim();
  if (!key || INNER_WINDOW_TECHNICAL_EXACT.has(key)) return false;
  if (field.runtimeIncluded === false || field.runtime_included === false) return false;
  if (field.technical === true || field.internal === true) return false;
  const visibility = field.visibilityMode ?? field.visibility_mode ?? field.initialVisibility ?? field.initial_visibility ?? null;
  const selectionMode = field.selectionMode ?? field.selection_mode ?? null;
  const showReadOnly = field.showReadOnly === true || field.show_read_only === true;
  if ((visibility === 'HIDDEN' || visibility === 'HIDE') && !showReadOnly) return false;
  if (selectionMode === 'FIXED' && (visibility === 'HIDDEN' || visibility === 'HIDE') && !showReadOnly) return false;
  return true;
}

export function applyInnerWindowUiOrder(fields = []) {
  return applyGlobalWindowSelectionFlow(fields, {
    uiCategory: INNER_WINDOW_UI_CATEGORY,
    canonicalSlotOrder: INNER_WINDOW_UI_STANDARD_ORDER,
    semanticSlotForField: semanticSlotForInnerWindowField,
    semanticStageForSlot: semanticStageForInnerWindowSlot,
    approvedExtensionForField: approvedInnerWindowExtensionForField,
    shouldExposeField: shouldExposeInnerWindowRuntimeField,
    standardLabelForField: standardLabelForInnerWindowField,
  });
}
