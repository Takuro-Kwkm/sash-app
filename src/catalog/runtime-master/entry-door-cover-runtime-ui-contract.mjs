import { applyGlobalWindowSelectionFlow } from './global-window-selection-flow-engine.mjs';

export const ENTRY_DOOR_COVER_UI_CATEGORY = 'ENTRY_DOOR_COVER';

// UI実装標準仕様書 v1.8 section 11 normalized to the single Global Window
// Selection Flow. Category differences are declarative semantic slots only;
// no manufacturer/series/product branching belongs here.
export const ENTRY_DOOR_COVER_UI_STANDARD_ORDER = Object.freeze([
  'opening_type',
  'thermal_spec','transom','design','child_door','sidelight_spec','handing',
  'door_closer','handle_type','handle_surface','lock_type','cylinder','electric_lock_power','electric_lock_reader','electric_lock_plan','key_set',
  'size_w','size_h',
  'body_color','frame_color','handle_color','interior_handle',
  'glass_spec','glass_safety',
  'exterior_trim','interior_trim','existing_threshold_treatment','threshold_flat_material','threshold_step_mitigation',
  'existing_frame_material','existing_frame_type','fastening_method',
  'existing_opening_w1','existing_opening_w2','existing_opening_w_correction','existing_opening_h1','existing_opening_h2',
  'exterior_trim_a','exterior_trim_b','exterior_trim_c','interior_trim_d','interior_trim_e','interior_trim_j','interior_trim_k','existing_threshold_g','fit_result',
  'additional_key','option',
]);

const OPENING = new Set(['opening_type']);
const CONFIGURATION = new Set([
  'thermal_spec','transom','design','child_door','sidelight_spec','handing',
  'door_closer','handle_type','handle_surface','lock_type','cylinder','electric_lock_power','electric_lock_reader','electric_lock_plan','key_set',
]);
const SIZE = new Set(['size_w','size_h']);
const FINISH = new Set(['body_color','frame_color','handle_color','interior_handle']);
const GLAZING = new Set(['glass_spec','glass_safety']);
const INSTALLATION = new Set([
  'exterior_trim','interior_trim','existing_threshold_treatment','threshold_flat_material','threshold_step_mitigation',
  'existing_frame_material','existing_frame_type','fastening_method',
  'existing_opening_w1','existing_opening_w2','existing_opening_w_correction','existing_opening_h1','existing_opening_h2',
  'exterior_trim_a','exterior_trim_b','exterior_trim_c','interior_trim_d','interior_trim_e','interior_trim_j','interior_trim_k','existing_threshold_g','fit_result',
]);
const OPTION = new Set(['additional_key','option']);

export function semanticSlotForEntryDoorCoverField(key) {
  return ENTRY_DOOR_COVER_UI_STANDARD_ORDER.includes(key) ? key : null;
}

export function semanticStageForEntryDoorCoverSlot(slot) {
  if (OPENING.has(slot)) return 'OPENING';
  if (CONFIGURATION.has(slot)) return 'CONFIGURATION';
  if (SIZE.has(slot)) return 'SIZE';
  if (FINISH.has(slot)) return 'FINISH';
  if (GLAZING.has(slot)) return 'GLAZING';
  if (INSTALLATION.has(slot)) return 'INSTALLATION_SURVEY';
  if (OPTION.has(slot)) return 'OPTION';
  return null;
}

const STANDARD_LABELS = Object.freeze({
  opening_type:'開き形式', thermal_spec:'断熱仕様', transom:'ランマ', design:'デザイン', child_door:'子扉', sidelight_spec:'ガラス / 袖仕様', handing:'吊元',
  door_closer:'ドアクローザ', handle_type:'ハンドル種類', handle_surface:'ハンドル表面仕様', lock_type:'錠仕様', cylinder:'シリンダー',
  electric_lock_power:'電源 / プラン', electric_lock_reader:'FamiLockリーダー', electric_lock_plan:'FamiLockプラン', key_set:'キーセット',
  size_w:'W', size_h:'H', body_color:'本体色', frame_color:'枠色', handle_color:'ハンドル色', interior_handle:'室内側ハンドル',
  glass_spec:'ガラス', glass_safety:'ガラス安全仕様', exterior_trim:'外額縁', interior_trim:'内額縁', existing_threshold_treatment:'既設下枠処理',
  threshold_flat_material:'下枠フラット材', threshold_step_mitigation:'下枠段差緩和材', existing_frame_material:'既設枠材質', existing_frame_type:'既設枠タイプ', fastening_method:'固定方式',
  existing_opening_w1:'既設開口W1', existing_opening_w2:'既設開口W2', existing_opening_w_correction:'既設開口W補正', existing_opening_h1:'既設開口H1', existing_opening_h2:'既設開口H2',
  exterior_trim_a:'外額縁寸法a', exterior_trim_b:'外額縁寸法b', exterior_trim_c:'外額縁寸法c', interior_trim_d:'内額縁寸法d', interior_trim_e:'内額縁寸法e', interior_trim_j:'内額縁寸法j', interior_trim_k:'内額縁寸法k', existing_threshold_g:'既設下枠寸法g',
  fit_result:'施工Fit判定', additional_key:'追加キー', option:'オプション',
});

function standardLabelForEntryDoorCoverField(key, fallback) {
  return STANDARD_LABELS[key] ?? fallback;
}

export function applyEntryDoorCoverUiOrder(fields = []) {
  return applyGlobalWindowSelectionFlow(fields, {
    uiCategory: ENTRY_DOOR_COVER_UI_CATEGORY,
    canonicalSlotOrder: ENTRY_DOOR_COVER_UI_STANDARD_ORDER,
    semanticSlotForField: semanticSlotForEntryDoorCoverField,
    semanticStageForSlot: semanticStageForEntryDoorCoverSlot,
    approvedExtensionForField: () => null,
    standardLabelForField: standardLabelForEntryDoorCoverField,
  });
}
