import {
  NA,DESIGNS,SIZE_MODULES,
  NONFIRE_SW_846,NONFIRE_SW_791,NONFIRE_SH_1900,NONFIRE_SH_2030,
  FIRE_SW_846,FIRE_SW_791,FIRE_SH_1900,FIRE_SH_2030
} from "./concords30-data.mjs";

const r=(id,priority,when,set={},derive={})=>({id,priority,when,set,...(Object.keys(derive).length?{derive}:{})});
const v=(id,priority,when,errorCode,message,scope="raw")=>({id,priority,when,errorCode,message,severity:"ERROR",scope});
const inSet=s=>[...s];

export const RESOLUTION_RULES=[
  r("CONCORD-RES-FIRE-001",100,{fire_spec:"fire_door"},{panel_type:NA,closer_inclusion:"included",product_symbol_schema_id:"CONCORD_FIRE",product_prefix:"3SL"}),
  r("CONCORD-RES-FIRE-002",100,{fire_spec:"non_fire"},{product_symbol_schema_id:"CONCORD_NON_FIRE",product_prefix:"3EH"}),
  r("CONCORD-RES-FRAME-001",120,{frame_type:"sleeve"},{frame_variant:"15"}),
  r("CONCORD-RES-FRAME-002",120,{frame_type:"outside_retract"},{frame_variant:"91",sleeve_glass_procurement:NA,sleeve_glass_spec:NA,sleeve_glass_symbol:"1",punching_panel:NA}),
  r("CONCORD-RES-HAND-001",130,{handing:"right"},{handing_symbol:"R"}),
  r("CONCORD-RES-HAND-002",130,{handing:"left"},{handing_symbol:"L"}),
  r("CONCORD-RES-LOCK-001",200,{lock_system:"manual"},{smart_key_type:NA,power_supply:NA,handle_type:"manual_standard",thumbturn_type:"removable_lower_only",key_code:"",electrical_group_code:"",cylinder_color:""}),
  r("CONCORD-RES-LOCK-002",200,{lock_system:"smart_control_key"},{cylinder_type:NA,handle_type:"straight",thumbturn_type:"removable_upper_and_lower",closer_inclusion:"included"}),
  r("CONCORD-RES-KEY-001",210,{smart_key_type:"face_recognition"},{power_supply:"ac100v"}),
  r("CONCORD-RES-KEY-101",220,{smart_key_type:"pocket_key",power_supply:"ac100v"},{key_code:"T3",electrical_group_code:"T"}),
  r("CONCORD-RES-KEY-102",220,{smart_key_type:"pitatto_key",power_supply:"ac100v"},{key_code:"T4",electrical_group_code:"T"}),
  r("CONCORD-RES-KEY-103",220,{smart_key_type:"face_recognition",power_supply:"ac100v"},{key_code:"T6",electrical_group_code:"T"}),
  r("CONCORD-RES-KEY-104",220,{smart_key_type:"pocket_key",power_supply:"battery"},{key_code:"K3",electrical_group_code:"K"}),
  r("CONCORD-RES-KEY-105",220,{smart_key_type:"pitatto_key",power_supply:"battery"},{key_code:"K4",electrical_group_code:"K"}),
  r("CONCORD-RES-COLOR-001",230,{handle_color:"silver"},{handle_color_symbol:"A",cylinder_color:"silver",face_unit_color:"silver"}),
  r("CONCORD-RES-COLOR-002",230,{handle_color:"black"},{handle_color_symbol:"C",cylinder_color:"black",face_unit_color:"black"}),
  r("CONCORD-RES-SLEEVE-001",250,{frame_type:"sleeve",size_type:"special_order"},{sleeve_glass_procurement:"site_procured",sleeve_glass_spec:NA,sleeve_glass_symbol:"1"}),
  r("CONCORD-RES-SLEEVE-002",250,{frame_type:"sleeve",size_type:"standard",sleeve_glass_procurement:"site_procured"},{sleeve_glass_spec:NA,sleeve_glass_symbol:"1"}),
  r("CONCORD-RES-SLEEVE-003",250,{sleeve_glass_procurement:"ykk_unit",sleeve_glass_spec:"low_e_laminated_double"},{sleeve_glass_symbol:"2",sleeve_glass_total_thickness_mm:25.8}),
  r("CONCORD-RES-SLEEVE-004",250,{sleeve_glass_procurement:"ykk_unit",sleeve_glass_spec:"laminated_double"},{sleeve_glass_symbol:"3",sleeve_glass_total_thickness_mm:25.8}),
  r("CONCORD-RES-PUNCH-001",260,{punching_panel:"included"},{required_sleeve_glass_total_thickness_mm:25.8}),
  r("CONCORD-RES-OPT-001",270,{screen_type:{$exists:false}},{screen_type:"none"}),
  r("CONCORD-RES-OPT-002",270,{free_stopper:{$exists:false}},{free_stopper:"none"}),
  r("CONCORD-RES-OPT-003",270,{interior_trim_type:{$exists:false}},{interior_trim_type:"none"}),
  r("CONCORD-RES-OPT-004",270,{wreath_hook:{$exists:false}},{wreath_hook:"none"}),
  r("CONCORD-RES-PUNCH-002",270,{frame_type:"sleeve",size_type:"standard",punching_panel:{$exists:false}},{punching_panel:"none"}),
  r("CONCORD-RES-PUNCH-003",270,{any:[{frame_type:"outside_retract"},{size_type:"special_order"}]},{punching_panel:NA}),
  r("CONCORD-RES-SCREEN-001",280,{screen_type:"none"},{screen_body_color:NA,screen_net_color:NA,sleeve_mullion_aux_frame:NA}),
  r("CONCORD-RES-SCREEN-002",280,{screen_type:"horizontal_roll_screen_xmd_flat_single",frame_type:"sleeve"},{sleeve_mullion_aux_frame:"required"}),
  r("CONCORD-RES-SCREEN-003",280,{screen_type:"horizontal_roll_screen_xmd_flat_single",frame_type:"outside_retract"},{sleeve_mullion_aux_frame:NA}),
  r("CONCORD-RES-STRATEGY-001",900,{size_type:"standard"},{order_strategy:"door_set"}),
  r("CONCORD-RES-STRATEGY-002",910,{size_type:"special_order"},{order_strategy:"individual_components"}),
  r("CONCORD-RES-STRATEGY-003",920,{fire_spec:"non_fire",lock_system:"manual",closer_inclusion:"omitted"},{order_strategy:"individual_components"})
];

for(const s of SIZE_MODULES){
  for(const [frameType,shape] of [["sleeve",s.sleeve],["outside_retract",s.outside]]){
    RESOLUTION_RULES.push(r(
      `CONCORD-RES-SIZE-${frameType}-${s.value}`,300,
      {size_type:"standard",size_module:s.value,frame_type:frameType},
      {region_code:s.regionCode,frame_width_mm:shape.w,frame_height_mm:shape.h,
       door_leaf_width_mm:frameType==="sleeve"?shape.w/2+51:shape.w/2+48.5,
       door_leaf_height_mm:frameType==="sleeve"?shape.h-28:shape.h+12}
    ));
  }
}
RESOLUTION_RULES.push(
  r("CONCORD-RES-SCREEN-101",330,{screen_type:"horizontal_roll_screen_xmd_flat_single",frame_type:"sleeve",
    frame_width_mm:{$exists:true},frame_height_mm:{$exists:true}}, {}, {
      screen_mw:{op:"linear",field:"frame_width_mm",factor:0.5,offset:6},
      screen_mh:{op:"linear",field:"frame_height_mm",factor:1,offset:-20}
    }),
  r("CONCORD-RES-SCREEN-102",330,{screen_type:"horizontal_roll_screen_xmd_flat_single",frame_type:"outside_retract",
    frame_width_mm:{$exists:true},frame_height_mm:{$exists:true}}, {}, {
      screen_mw:{op:"linear",field:"frame_width_mm",factor:0.5,offset:3.5},
      screen_mh:{op:"linear",field:"frame_height_mm",factor:1,offset:-20}
    }),
  r("CONCORD-RES-SCREEN-110",340,{screen_type:"horizontal_roll_screen_xmd_flat_single",screen_mw:{$lte:740}},{screen_min_mh:1500,screen_max_mh:2400}),
  r("CONCORD-RES-SCREEN-111",340,{screen_type:"horizontal_roll_screen_xmd_flat_single",screen_mw:{$gt:740,$lte:900}},{screen_max_mh:2400},{screen_min_mh:{op:"linear",field:"screen_mw",factor:2,offset:20}}),
  r("CONCORD-RES-SCREEN-112",340,{screen_type:"horizontal_roll_screen_xmd_flat_single",screen_mw:{$gt:900,$lte:940}},{screen_min_mh:1820,screen_max_mh:2220}),
  r("CONCORD-RES-SCREEN-120",350,{screen_type:"horizontal_roll_screen_xmd_flat_single",screen_mh:{$exists:true},screen_min_mh:{$exists:true}}, {}, {
    screen_min_ok:{op:"compare",leftField:"screen_mh",rightField:"screen_min_mh",comparator:"gte"}
  }),
  r("CONCORD-RES-SCREEN-121",350,{screen_type:"horizontal_roll_screen_xmd_flat_single",screen_mh:{$exists:true},screen_max_mh:{$exists:true}}, {}, {
    screen_max_ok:{op:"compare",leftField:"screen_mh",rightField:"screen_max_mh",comparator:"lte"}
  })
);

for(const d of DESIGNS){
  const proc=d.function==="non_daylighting"?NA:(d.function==="ventilation"||d.panelType==="aluminum")?"separate_order_required":"included";
  RESOLUTION_RULES.push(r(`CONCORD-RES-DESIGN-${d.code}`,360,{design_code:d.code},{
    design_taste:d.taste,design_function:d.function,door_glass_procurement:proc
  }));
}

RESOLUTION_RULES.push(
  r("CONCORD-RES-SPECIAL-SW-NA",370,{size_type:"special_order",swOrder:false},{door_leaf_width_mm:NA}),
  r("CONCORD-RES-SPECIAL-SH-NA",370,{size_type:"special_order",shOrder:false},{door_leaf_height_mm:NA})
);

export const VALIDATION_RULES=[
  v("CONCORD-VAL-FIRE-001",200,{fire_spec:"fire_door",frame_type:"sleeve"},"CONCORD_FIRE_SLEEVE_NOT_AVAILABLE","防火ドアには袖付タイプの設定がありません。"),
  v("CONCORD-VAL-FIRE-002",210,{fire_spec:"fire_door",smart_key_type:"face_recognition"},"CONCORD_FIRE_FACE_KEY_NOT_AVAILABLE","顔認証キーは防火仕様では選択できません。"),
  v("CONCORD-VAL-KEY-001",220,{smart_key_type:"face_recognition",power_supply:"battery"},"CONCORD_FACE_KEY_BATTERY_NOT_AVAILABLE","顔認証キーは電池式では選択できません。"),
  v("CONCORD-VAL-PANEL-001",230,{fire_spec:"fire_door",panel_type:"aluminum"},"CONCORD_ALUMINUM_FIRE_NOT_AVAILABLE","アルミタイプには防火仕様の設定がありません。"),
  v("CONCORD-VAL-SLEEVE-001",300,{frame_type:"outside_retract",sleeve_glass_procurement:{$exists:true}},"CONCORD_OUTSIDE_SLEEVE_GLASS_NOT_APPLICABLE","外引込みタイプでは袖ガラスを選択できません。"),
  v("CONCORD-VAL-PUNCH-001",310,{frame_type:"outside_retract",punching_panel:"included"},"CONCORD_OUTSIDE_PUNCHING_NOT_AVAILABLE","パンチングパネルは袖付タイプのみ選択できます。"),
  v("CONCORD-VAL-PUNCH-002",320,{size_type:"special_order",punching_panel:"included"},"CONCORD_PUNCHING_CUSTOM_SIZE_NOT_AVAILABLE","パンチングパネルは規格サイズのみ対応しています。"),
  v("CONCORD-VAL-PUNCH-003",325,{punching_panel:"included",sleeve_glass_total_thickness_mm:{$exists:true,$ne:25.8}},"CONCORD_PUNCHING_GLASS_THICKNESS_INVALID","パンチングパネル使用時の袖ガラス総厚は25.8mmです。"),
  v("CONCORD-VAL-SCREEN-001",330,{screen_type:"horizontal_roll_screen_xmd_flat_single",interior_trim_type:"aluminum_inner_trim"},"CONCORD_SCREEN_ALUMINUM_TRIM_CONFLICT","横引きロール網戸とアルミ製内額縁は併用できません。"),
  v("CONCORD-VAL-SCREEN-002",335,{screen_type:"horizontal_roll_screen_xmd_flat_single",frame_type:"sleeve",screen_body_color:{$exists:true,$notIn:["H2","B7"]}},"CONCORD_SCREEN_SLEEVE_COLOR_INVALID","袖付タイプで網戸を使用する場合、網戸色はH2またはB7を選択してください。"),
  v("CONCORD-VAL-CLOSER-001",400,{lock_system:"smart_control_key",closer_inclusion:"omitted"},"CONCORD_SMART_CLOSER_REQUIRED","スマートコントロールキーではクローザーが必須です。"),
  v("CONCORD-VAL-CLOSER-002",410,{fire_spec:"fire_door",closer_inclusion:"omitted"},"CONCORD_FIRE_CLOSER_REQUIRED","防火ドアではクローザーが必須です。"),
  v("CONCORD-VAL-LOCK-001",420,{lock_system:"manual",smart_key_type:{$exists:true}},"CONCORD_MANUAL_SMART_KEY_NOT_APPLICABLE","手動錠ではスマートキー方式を選択できません。"),
  v("CONCORD-VAL-LOCK-002",430,{lock_system:"smart_control_key",cylinder_type:{$exists:true}},"CONCORD_SMART_CYLINDER_NOT_USER_SELECTABLE","スマートコントロールキーでは手動錠用シリンダーを選択できません。")
];

const frameRange=(frame,minW,maxW,minH,maxH)=>{
  VALIDATION_RULES.push(
    v(`CONCORD-VAL-SIZE-${frame}-W-MIN`,500,{size_type:"special_order",frame_type:frame,frame_width_mm:{$lt:minW}},"CONCORD_FRAME_SIZE_OUT_OF_RANGE","特注枠Wが製作範囲外です。"),
    v(`CONCORD-VAL-SIZE-${frame}-W-MAX`,500,{size_type:"special_order",frame_type:frame,frame_width_mm:{$gt:maxW}},"CONCORD_FRAME_SIZE_OUT_OF_RANGE","特注枠Wが製作範囲外です。"),
    v(`CONCORD-VAL-SIZE-${frame}-H-MIN`,500,{size_type:"special_order",frame_type:frame,frame_height_mm:{$lt:minH}},"CONCORD_FRAME_SIZE_OUT_OF_RANGE","特注枠Hが製作範囲外です。"),
    v(`CONCORD-VAL-SIZE-${frame}-H-MAX`,500,{size_type:"special_order",frame_type:frame,frame_height_mm:{$gt:maxH}},"CONCORD_FRAME_SIZE_OUT_OF_RANGE","特注枠Hが製作範囲外です。")
  );
};
frameRange("sleeve",1480,1870,1928,2235);
frameRange("outside_retract",1485,1875,1888,2195);

VALIDATION_RULES.push(
  v("CONCORD-VAL-SW-UNSUPPORTED",510,{size_type:"special_order",swOrder:false,door_leaf_width_mm:{$exists:true}},"CONCORD_DOOR_SW_OUT_OF_RANGE","このデザインはドア本体SWのサイズオーダーに対応していません。"),
  v("CONCORD-VAL-SH-UNSUPPORTED",510,{size_type:"special_order",shOrder:false,door_leaf_height_mm:{$exists:true}},"CONCORD_DOOR_SH_OUT_OF_RANGE","このデザインはドア本体SHのサイズオーダーに対応していません。")
);
const dimRules=(prefix,fireSpec,sets,field,min,max,code,message)=>{
  for(const [set,minValue] of sets){
    VALIDATION_RULES.push(
      v(`${prefix}-${minValue}-MIN`,520,{size_type:"special_order",fire_spec:fireSpec,design_code:{$in:inSet(set)},[field]:{$lt:minValue}},code,message),
      v(`${prefix}-${minValue}-MAX`,520,{size_type:"special_order",fire_spec:fireSpec,design_code:{$in:inSet(set)},[field]:{$gt:max}},code,message)
    );
  }
};
dimRules("CONCORD-VAL-NF-SW","non_fire",[[NONFIRE_SW_846,846],[NONFIRE_SW_791,791]],"door_leaf_width_mm",null,986,"CONCORD_DOOR_SW_OUT_OF_RANGE","ドア本体SWが製作範囲外です。");
dimRules("CONCORD-VAL-NF-SH","non_fire",[[NONFIRE_SH_1900,1900],[NONFIRE_SH_2030,2030]],"door_leaf_height_mm",null,2207,"CONCORD_DOOR_SH_OUT_OF_RANGE","ドア本体SHが製作範囲外です。");
dimRules("CONCORD-VAL-F-SW","fire_door",[[FIRE_SW_846,846],[FIRE_SW_791,791]],"door_leaf_width_mm",null,986,"CONCORD_DOOR_SW_OUT_OF_RANGE","防火ドア本体SWが製作範囲外です。");
dimRules("CONCORD-VAL-F-SH","fire_door",[[FIRE_SH_1900,1900],[FIRE_SH_2030,2030]],"door_leaf_height_mm",null,2207,"CONCORD_DOOR_SH_OUT_OF_RANGE","防火ドア本体SHが製作範囲外です。");

VALIDATION_RULES.push(
  v("CONCORD-VAL-SCREEN-MW-MIN",550,{screen_type:"horizontal_roll_screen_xmd_flat_single",screen_mw:{$lt:300}},"CONCORD_SCREEN_SIZE_OUT_OF_RANGE","横引きロール網戸の製作範囲外です。","resolved"),
  v("CONCORD-VAL-SCREEN-MW-MAX",550,{screen_type:"horizontal_roll_screen_xmd_flat_single",screen_mw:{$gt:940}},"CONCORD_SCREEN_SIZE_OUT_OF_RANGE","横引きロール網戸の製作範囲外です。","resolved"),
  v("CONCORD-VAL-SCREEN-MH-MIN",550,{screen_type:"horizontal_roll_screen_xmd_flat_single",screen_min_ok:false},"CONCORD_SCREEN_SIZE_OUT_OF_RANGE","横引きロール網戸の製作範囲外です。","resolved"),
  v("CONCORD-VAL-SCREEN-MH-MAX",550,{screen_type:"horizontal_roll_screen_xmd_flat_single",screen_max_ok:false},"CONCORD_SCREEN_SIZE_OUT_OF_RANGE","横引きロール網戸の製作範囲外です。","resolved")
);

export const PRODUCT_SYMBOL_SCHEMAS=[
  {id:"CONCORD-DOOR-SET",when:{size_type:"standard",fire_spec:"non_fire"},template:"{frame_color}3EH{region_code}-{frame_variant}{sleeve_glass_symbol}{design_code}{door_color}-{handing_symbol}{key_code}"},
  {id:"CONCORD-DOOR-SET",when:{size_type:"standard",fire_spec:"fire_door"},template:"{frame_color}3SL{region_code}-911{design_code}{door_color}-{handing_symbol}{key_code}"},
  {id:"CONCORD-FRAME-UNIT",when:{size_type:"standard",fire_spec:"non_fire"},template:"{frame_color}3EH{region_code}-WG-{frame_variant}-{handing_symbol}{electrical_group_code}"},
  {id:"CONCORD-FRAME-UNIT",when:{size_type:"standard",fire_spec:"fire_door"},template:"{frame_color}3SL{region_code}-WG-91-{handing_symbol}{electrical_group_code}"},
  {id:"CONCORD-DOOR-LEAF",when:{size_type:"standard",fire_spec:"non_fire"},template:"{frame_color}3EH{region_code}-D-{design_code}{door_color}-{handing_symbol}{key_code}"},
  {id:"CONCORD-DOOR-LEAF",when:{size_type:"standard",fire_spec:"fire_door"},template:"{frame_color}3SL{region_code}-D-{design_code}{door_color}-{handing_symbol}{key_code}"},
  {id:"CONCORD-SLEEVE-GLASS",when:{frame_type:"sleeve",size_type:"standard",sleeve_glass_procurement:"ykk_unit"},template:"YSDEH{region_code}-LG-{sleeve_glass_symbol}-11"},
  {id:"CONCORD-MANUAL-HANDLE",when:{lock_system:"manual"},template:"YSKAG-H-S01{handle_color_symbol}-D"},
  {id:"CONCORD-MANUAL-CYLINDER",when:{lock_system:"manual",cylinder_type:"ps_miwa"},template:"YSKAG-S-S1{handle_color_symbol}2-D"},
  {id:"CONCORD-MANUAL-CYLINDER",when:{lock_system:"manual",cylinder_type:"wg_minebea_showa"},template:"YSKAG-S-S3{handle_color_symbol}2-D"},
  {id:"CONCORD-SMART-HANDLE",when:{lock_system:"smart_control_key",power_supply:"ac100v"},template:"YSKAG-H-S51{handle_color_symbol}{handing_symbol}T-D"},
  {id:"CONCORD-SMART-HANDLE",when:{lock_system:"smart_control_key",power_supply:"battery"},template:"YSKAG-H-S51{handle_color_symbol}{handing_symbol}K-DV"},
  {id:"CONCORD-FACE",when:{smart_key_type:"face_recognition"},template:"YSKAG-B8{handle_color_symbol}"},
  {id:"CONCORD-PUNCHING",when:{punching_panel:"included"},template:"YSDHP{region_code}-6001"}
];

export const ORDER_COMPONENT_RULES=[
  {id:"CONCORD-ORDER-001",when:{order_strategy:"door_set"},componentType:"door_set",requiredStatus:"REQUIRED",symbolSchemaId:"CONCORD-DOOR-SET"},
  {id:"CONCORD-ORDER-002",when:{order_strategy:"individual_components",size_type:"standard"},componentType:"frame_unit",requiredStatus:"REQUIRED",symbolSchemaId:"CONCORD-FRAME-UNIT"},
  {id:"CONCORD-ORDER-003",when:{order_strategy:"individual_components",size_type:"special_order"},componentType:"frame_unit",requiredStatus:"REQUIRED"},
  {id:"CONCORD-ORDER-004",when:{order_strategy:"individual_components",closer_inclusion:"included"},componentType:"closer_unit",requiredStatus:"REQUIRED",symbol:"YSSCU-01"},
  {id:"CONCORD-ORDER-005",when:{order_strategy:"individual_components",frame_type:"sleeve",size_type:"standard",sleeve_glass_procurement:"ykk_unit"},componentType:"sleeve_glass_unit",requiredStatus:"REQUIRED",symbolSchemaId:"CONCORD-SLEEVE-GLASS"},
  {id:"CONCORD-ORDER-006",when:{order_strategy:"individual_components",size_type:"standard"},componentType:"door_leaf_unit",requiredStatus:"REQUIRED",symbolSchemaId:"CONCORD-DOOR-LEAF"},
  {id:"CONCORD-ORDER-007",when:{order_strategy:"individual_components",size_type:"special_order"},componentType:"door_leaf_unit",requiredStatus:"REQUIRED"},
  {id:"CONCORD-ORDER-008",when:{lock_system:"manual"},componentType:"handle_unit",requiredStatus:"REQUIRED",symbolSchemaId:"CONCORD-MANUAL-HANDLE"},
  {id:"CONCORD-ORDER-009",when:{lock_system:"manual"},componentType:"cylinder_unit",requiredStatus:"REQUIRED",symbolSchemaId:"CONCORD-MANUAL-CYLINDER"},
  {id:"CONCORD-ORDER-010",when:{lock_system:"smart_control_key"},componentType:"handle_unit",requiredStatus:"REQUIRED",symbolSchemaId:"CONCORD-SMART-HANDLE"},
  {id:"CONCORD-ORDER-011",when:{smart_key_type:"face_recognition"},componentType:"face_recognition_unit",requiredStatus:"REQUIRED",symbolSchemaId:"CONCORD-FACE"},
  {id:"CONCORD-ORDER-012",when:{punching_panel:"included"},componentType:"punching_panel_unit",requiredStatus:"REQUIRED",symbolSchemaId:"CONCORD-PUNCHING"},
  {id:"CONCORD-ORDER-013",when:{screen_type:"horizontal_roll_screen_xmd_flat_single"},componentType:"screen_unit",requiredStatus:"REQUIRED"},
  {id:"CONCORD-ORDER-014",when:{screen_type:"horizontal_roll_screen_xmd_flat_single",frame_type:"sleeve"},componentType:"sleeve_mullion_aux_frame",requiredStatus:"AUTO_INCLUDED"},
  {id:"CONCORD-ORDER-015",when:{free_stopper:"included"},componentType:"free_stopper_unit",requiredStatus:"OPTIONAL",symbol:"YS 6K-13334"},
  {id:"CONCORD-ORDER-016",when:{wreath_hook:"included"},componentType:"wreath_hook_unit",requiredStatus:"OPTIONAL"}
];
