// Shared display terminology. This never changes keys, values or manufacturer facts.
export const FIELD_LABELS=Object.freeze({
  size_group:'サイズ', size_mode:'サイズ区分', standard_size:'規格サイズ',
  width:'幅（W）', height:'高さ（H）', depth:'奥行（D）',
  opening_width:'開口幅（W）', opening_height:'開口高さ（H）',
  measured_width:'採寸幅（W）', measured_height:'採寸高さ（H）',
  frame_width:'枠外幅（W）', frame_height:'枠外高さ（H）',
  door_width:'扉幅（DW）', door_height:'扉高さ（DH）', child_width:'子扉幅（SW）',
  color:'色', body_color:'本体色', frame_color:'枠色',
  exterior_color:'外観色', interior_color:'内観色',
  handing:'吊元', design:'デザイン', glass_type:'ガラスの種類',
  quantity:'見積依頼数量', options:'オプション',
});
// Exact aliases only. Unknown or domain-specific measurements retain their label.
const aliases=Object.freeze({
  ...Object.fromEntries(Object.keys(FIELD_LABELS).map(key=>[key,key])),
  size_mode:'size_mode', dimension_mode:'size_mode',
  size:'standard_size', nominal_size:'standard_size', standard_size:'standard_size', size_code:'standard_size',
  size_w:'width', width_mm:'width', w_mm:'width', custom_w:'width',
  size_h:'height', height_mm:'height', h_mm:'height', custom_h:'height',
  opening_width_mm:'opening_width', site_opening_width_mm:'opening_width',
  opening_height_mm:'opening_height', site_opening_height_mm:'opening_height',
  measured_w:'measured_width', measured_h:'measured_height',
  frame_width_mm:'frame_width', frame_height_mm:'frame_height',
  dw_mm:'door_width', dh_mm:'door_height', child_width_mm:'child_width',
  exterior_color:'exterior_color', interior_color:'interior_color',
  body_color:'body_color', body_color_code:'body_color', frame_color:'frame_color', frame_color_code:'frame_color',
  handing:'handing', design_code:'design', request_quantity:'quantity', quantity:'quantity', major_options:'options', option:'options',
  glass_base:'glass_type', glass_family:'glass_type',
});
export function fieldLabel(key,fallback,semanticRole){
  const meaning=aliases[semanticRole]??aliases[key], label=FIELD_LABELS[meaning];
  if(!label)return fallback;
  // Preserve native measurement reference points: these are different meanings.
  const source=String(fallback??'');
  if(meaning==='width'&&source.includes('枠外'))return FIELD_LABELS.frame_width;
  if(meaning==='height'&&source.includes('床面〜上枠上端'))return '高さ（H：床面〜上枠上端）';
  if(meaning==='door_width'&&source.includes('親扉'))return '親扉幅（DW）';
  return label;
}
