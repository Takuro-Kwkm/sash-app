export const DOOR_UI_STANDARD_ORDER = Object.freeze([
  'manufacturer',
  'product',
  'thermal_spec',
  'configuration',
  'design',
  'child_door_type',
  'child_door',
  'glass',
  'door_color',
  'frame_color',
  'handing',
  'door_closer',
  'handle',
  'handle_color',
  'lock_type',
  'lock_system',
  'lock_plan',
  'credential_type',
  'remote_count',
  'credential_package',
  'size_mode',
  'size',
  'custom_width',
  'custom_height',
  'option',
]);

const rank = new Map(DOOR_UI_STANDARD_ORDER.map((field, index) => [field, index]));

export function orderDoorRuntimeFields(fields) {
  return [...new Set(fields)].sort((left, right) => {
    const leftRank = rank.get(left) ?? rank.get('option') - 1;
    const rightRank = rank.get(right) ?? rank.get('option') - 1;
    return leftRank - rightRank;
  });
}
