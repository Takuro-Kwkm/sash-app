// Shared presentation names for equivalent window fields. Product choices and rules stay in their masters.
const WINDOW_CATEGORIES = new Set(['NEW_CONSTRUCTION_EXTERIOR_WINDOW', 'NEW_CONSTRUCTION_SASH', 'INNER_WINDOW']);
const SLOT_LABELS = Object.freeze({
  window_type: '窓種類', handing: '左右勝手', frame_angle: '枠アングル',
  size_mode: 'サイズ区分', exterior_color: '外観色', interior_color: '内観色',
  screen_presence: '網戸', screen_form: '網戸形式', screen_midrail: '網戸中桟', screen_net: '網戸ネット',
  glass_family: 'ガラス', spacer_type: 'スペーサー', spacer: 'スペーサー', gas_fill: '中空層', cavity_fill: '中空層', option_items: 'その他オプション',
  glass_base: 'ガラス', glass_type: 'ガラス種', glass_spacer: 'スペーサー', glass_air_layer: '中空層',
});
// Shared slots can contain different concepts; only these equivalent field keys share names.
const FIELD_LABELS = Object.freeze({
  size: { size: '規格サイズ', standard_size: '規格サイズ',
    width: '特注W（mm）', height: '特注H（mm）',
    custom_width: '特注W（mm）', custom_height: '特注H（mm）', custom_w: '特注W（mm）', custom_h: '特注H（mm）',
    size_w: '特注W（mm）', size_h: '特注H（mm）', order_width: '特注W（mm）', order_height: '特注H（mm）' },
  glass_detail: { glass_detail: 'ガラス詳細', low_e_type: 'Low-E性能', lowe_color: 'Low-E性能', glass_solar: 'Low-E性能' },
  glass_function: { glass_function: 'ガラス追加機能', glass_additional: 'ガラス追加機能', glass_extra: 'ガラス追加機能' },
  option: { option: 'その他オプション', options: 'その他オプション', option_items: 'その他オプション',
    main_options: 'その他オプション', request_quantity: '数量' },
});
export function standardWindowFieldLabel({ uiCategory, semanticSlot, key, fallback }) {
  if (!WINDOW_CATEGORIES.has(uiCategory)) return fallback;
  return SLOT_LABELS[semanticSlot] ?? FIELD_LABELS[semanticSlot]?.[key] ?? fallback;
}
