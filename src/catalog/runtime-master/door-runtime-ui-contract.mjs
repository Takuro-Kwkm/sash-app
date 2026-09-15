export const NEW_CONSTRUCTION_ENTRY_DOOR_UI_CATEGORY = 'NEW_CONSTRUCTION_ENTRY_DOOR';

// UI実装標準仕様書 v1.7 §5. Runtime owns availability/business rules;
// this file only fixes category presentation slots plus declared series-specific supplemental fields.
export const NEW_CONSTRUCTION_ENTRY_DOOR_UI_STANDARD_ORDER = Object.freeze([
  'manufacturer',
  'product',
  'thermal_spec',
  'fire_classification',
  'frame_system',
  'configuration',
  'design',
  'child_door',
  'glass',
  'door_color',
  'handing',
  'frame_installation_type',
  'angle_attached_frame',
  'door_closer',
  'handle',
  'handle_color',
  'lock_type',
  'lock_system',
  'power_supply',
  'lock_plan',
  'credential_type',
  'remote_count',
  'credential_package',
  'size_mode',
  'size',
  'custom_width',
  'custom_height',
  'wall_thickness_mm',
  'option',
]);

const rank = new Map(NEW_CONSTRUCTION_ENTRY_DOOR_UI_STANDARD_ORDER.map((field,index)=>[field,index]));

export function applyNewConstructionEntryDoorUiOrder(fields = []) {
  return fields.map((field,index)=>({
    ...field,
    displayOrder: rank.has(field.key) ? (rank.get(field.key)+1)*10 : Number(field.displayOrder ?? 1000+index),
  })).sort((a,b)=>a.displayOrder-b.displayOrder||a.key.localeCompare(b.key,'ja'));
}
