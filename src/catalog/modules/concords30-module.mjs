import {
  PRODUCT_ID,EV_ORDER,EV_PRODUCT,NA,DESIGNS,SIZE_MODULES,COLOR_NAMES,FRAME_COLORS,
  NONFIRE_SW_SUPPORT,NONFIRE_SH_SUPPORT,FIRE_SW_SUPPORT,FIRE_SH_SUPPORT
} from "./concords30-data.mjs";
import {
  RESOLUTION_RULES,VALIDATION_RULES,ORDER_COMPONENT_RULES,PRODUCT_SYMBOL_SCHEMAS
} from "./concords30-rules.mjs";

const def=(key,label,order,selector={},dataType="ENUM",extra={})=>({
  id:`${PRODUCT_ID}:def:${key}`,productId:PRODUCT_ID,key,displayLabel:label,dataType,displayOrder:order,
  status:"ACTIVE",selector,evidenceIds:[EV_ORDER],...extra
});
let valueSeq=0;
const val=(key,value,label,order,selector={},metadata={})=>({
  id:`${PRODUCT_ID}:value:${key}:${String(value).replace(/[^A-Za-z0-9_-]/g,"_")}:${++valueSeq}`,
  productId:PRODUCT_ID,specificationKey:key,value,displayLabel:label,displayOrder:order,status:"ACTIVE",
  selector,metadata,evidenceIds:[EV_ORDER]
});
const req=(key,selector={})=>({
  id:`${PRODUCT_ID}:required:${key}:${JSON.stringify(selector)}`,productId:PRODUCT_ID,
  specificationKey:key,required:true,selector,evidenceIds:[EV_ORDER]
});

const specificationDefinitions=[
  def("fire_spec","防火区分",10),
  def("panel_type","商品タイプ",20,{fire_spec:"non_fire"}),
  def("design_code","デザイン",30,{fire_spec:{$exists:true}}),
  def("frame_type","枠タイプ",40,{design_code:{$exists:true}}, "ENUM",{autoSelectSingle:true}),
  def("handing","勝手",50,{frame_type:{$exists:true}}),
  def("size_type","サイズ方式",60,{handing:{$exists:true}}),
  def("size_module","規格サイズ",70,{size_type:"standard"}),
  def("frame_width_mm","枠W",71,{size_type:"special_order"},"NUMBER"),
  def("frame_height_mm","枠H",72,{size_type:"special_order"},"NUMBER"),
  def("door_leaf_width_mm","ドア本体SW",73,{size_type:"special_order",swOrder:true},"NUMBER"),
  def("door_leaf_height_mm","ドア本体SH",74,{size_type:"special_order",shOrder:true},"NUMBER"),
  def("door_color","ドアカラー",80,{design_code:{$exists:true}}),
  def("frame_color","枠カラー",90,{design_code:{$exists:true}}),
  def("lock_system","錠仕様",100,{frame_color:{$exists:true}}),
  def("smart_key_type","スマートキー種類",110,{lock_system:"smart_control_key"}),
  def("power_supply","電源方式",120,{smart_key_type:{$exists:true}},"ENUM",{autoSelectSingle:true}),
  def("handle_color","ハンドル色",130,{lock_system:{$exists:true}}),
  def("cylinder_type","シリンダー",140,{lock_system:"manual"}),
  def("closer_inclusion","クローザー",150,{fire_spec:"non_fire",lock_system:"manual"}),
  def("sleeve_glass_procurement","袖ガラス手配",160,{frame_type:"sleeve",size_type:"standard"}),
  def("sleeve_glass_spec","袖ガラス仕様",170,{frame_type:"sleeve",size_type:"standard",sleeve_glass_procurement:"ykk_unit"}),
  def("punching_panel","パンチングパネル",180,{frame_type:"sleeve",size_type:"standard"}),
  def("screen_type","網戸",190,{frame_type:{$exists:true}}),
  def("screen_body_color","網戸本体色",200,{screen_type:"horizontal_roll_screen_xmd_flat_single"}),
  def("screen_net_color","網戸ネット色",210,{screen_type:"horizontal_roll_screen_xmd_flat_single"}),
  def("free_stopper","フリーストッパー",220,{frame_type:{$exists:true}}),
  def("interior_trim_type","内額縁",230,{frame_type:{$exists:true}}),
  def("wreath_hook","リースフック",240,{frame_type:{$exists:true}})
];

const allowedValues=[];
allowedValues.push(
  val("fire_spec","non_fire","非防火",1),
  val("fire_spec","fire_door","防火ドア",2),
  val("panel_type","insulated","断熱タイプ",1,{fire_spec:"non_fire"}),
  val("panel_type","aluminum","アルミタイプ",2,{fire_spec:"non_fire"})
);

let n=0;
for(const d of DESIGNS){
  const swN=NONFIRE_SW_SUPPORT.has(d.code),shN=NONFIRE_SH_SUPPORT.has(d.code);
  allowedValues.push(val("design_code",d.code,d.code,++n,{fire_spec:"non_fire",panel_type:d.panelType},{
    designTaste:d.taste,designFunction:d.function,panelType:d.panelType,fireAvailable:d.fire,swOrder:swN,shOrder:shN
  }));
  if(d.fire){
    allowedValues.push(val("design_code",d.code,d.code,++n,{fire_spec:"fire_door"},{
      designTaste:d.taste,designFunction:d.function,panelType:NA,fireAvailable:true,
      swOrder:FIRE_SW_SUPPORT.has(d.code),shOrder:FIRE_SH_SUPPORT.has(d.code)
    }));
  }
}
allowedValues.push(
  val("frame_type","sleeve","袖付タイプ",1,{fire_spec:"non_fire"}),
  val("frame_type","outside_retract","外引込みタイプ",2,{fire_spec:"non_fire"}),
  val("frame_type","outside_retract","外引込みタイプ",3,{fire_spec:"fire_door"}),
  val("handing","right","右勝手",1),val("handing","left","左勝手",2),
  val("size_type","standard","規格サイズ",1),val("size_type","special_order","特注寸法",2)
);
SIZE_MODULES.forEach((s,i)=>allowedValues.push(val("size_module",s.value,s.label,i+1,{size_type:"standard"},{regionCode:s.regionCode})));

for(const d of DESIGNS){
  d.doorColors.forEach((c,i)=>allowedValues.push(val("door_color",c,`${c} ${COLOR_NAMES[c]}`,i+1,{design_code:d.code})));
}
FRAME_COLORS.forEach((c,i)=>allowedValues.push(val("frame_color",c,`${c} ${COLOR_NAMES[c]}`,i+1,{panelType:{$ne:"aluminum"}})));
["H2","B7"].forEach((c,i)=>allowedValues.push(val("frame_color",c,`${c} ${COLOR_NAMES[c]}`,i+1,{panelType:"aluminum"})));

allowedValues.push(
  val("lock_system","manual","手動錠",1),val("lock_system","smart_control_key","スマートコントロールキー",2),
  val("smart_key_type","pocket_key","ポケットキー",1,{lock_system:"smart_control_key"}),
  val("smart_key_type","pitatto_key","ピタットキー",2,{lock_system:"smart_control_key"}),
  val("smart_key_type","face_recognition","顔認証キー",3,{lock_system:"smart_control_key",fire_spec:"non_fire"}),
  val("power_supply","ac100v","AC100V式",1,{smart_key_type:{$in:["pocket_key","pitatto_key","face_recognition"]}}),
  val("power_supply","battery","電池式",2,{smart_key_type:{$in:["pocket_key","pitatto_key"]}}),
  val("handle_color","silver","シルバー",1),val("handle_color","black","ブラック",2),
  val("cylinder_type","ps_miwa","PS（美和ロック）",1,{lock_system:"manual"}),
  val("cylinder_type","wg_minebea_showa","WG（ミネベアショウワ）",2,{lock_system:"manual"}),
  val("closer_inclusion","included","クローザーあり",1,{fire_spec:"non_fire",lock_system:"manual"}),
  val("closer_inclusion","omitted","クローザーなし",2,{fire_spec:"non_fire",lock_system:"manual"}),
  val("sleeve_glass_procurement","ykk_unit","YKK AP 袖ガラスユニット",1,{frame_type:"sleeve",size_type:"standard"}),
  val("sleeve_glass_procurement","site_procured","現地調達ガラス",2,{frame_type:"sleeve",size_type:"standard"}),
  val("sleeve_glass_spec","low_e_laminated_double","Low-E防犯合わせ複層ガラス（乳白色）",1,{sleeve_glass_procurement:"ykk_unit"}),
  val("sleeve_glass_spec","laminated_double","防犯合わせ複層ガラス（乳白色）",2,{sleeve_glass_procurement:"ykk_unit"}),
  val("punching_panel","none","なし",1,{frame_type:"sleeve",size_type:"standard"}),
  val("punching_panel","included","あり",2,{frame_type:"sleeve",size_type:"standard"}),
  val("screen_type","none","なし",1),
  val("screen_type","horizontal_roll_screen_xmd_flat_single","横引きロール網戸 フラットタイプ XMD 片引き",2),
  val("screen_net_color","black","ブラック",1,{screen_type:"horizontal_roll_screen_xmd_flat_single"}),
  val("screen_net_color","gray","グレイ",2,{screen_type:"horizontal_roll_screen_xmd_flat_single"}),
  val("free_stopper","none","なし",1),val("free_stopper","included","あり",2),
  val("interior_trim_type","none","なし",1),val("interior_trim_type","interior_trim_angle","室内額縁用アングル",2),
  val("interior_trim_type","aluminum_inner_trim","アルミ製内額縁",3,{screen_type:{$ne:"horizontal_roll_screen_xmd_flat_single"}}),
  val("wreath_hook","none","なし",1),val("wreath_hook","included","あり",2)
);
const screenColors={B1:"ブラウン",B7:"カームブラック",H2:"プラチナステン",S1:"ピュアシルバー",YW:"ホワイト",CD:"クリア",CE:"ナチュラル",CM:"ダークブラウン"};
Object.entries(screenColors).forEach(([code,label],i)=>{
  const selector=["H2","B7"].includes(code)
    ?{screen_type:"horizontal_roll_screen_xmd_flat_single"}
    :{screen_type:"horizontal_roll_screen_xmd_flat_single",frame_type:"outside_retract"};
  allowedValues.push(val("screen_body_color",code,`${code} ${label}`,i+1,selector));
});

const requiredFieldRules=[
  req("fire_spec"),req("panel_type",{fire_spec:"non_fire"}),req("design_code"),req("frame_type"),
  req("handing"),req("size_type"),req("size_module",{size_type:"standard"}),
  req("frame_width_mm",{size_type:"special_order"}),req("frame_height_mm",{size_type:"special_order"}),
  req("door_leaf_width_mm",{size_type:"special_order",swOrder:true}),req("door_leaf_height_mm",{size_type:"special_order",shOrder:true}),
  req("door_color"),req("frame_color"),req("lock_system"),req("smart_key_type",{lock_system:"smart_control_key"}),
  req("power_supply",{lock_system:"smart_control_key"}),req("handle_color"),req("cylinder_type",{lock_system:"manual"}),
  req("closer_inclusion",{fire_spec:"non_fire",lock_system:"manual"}),
  req("sleeve_glass_procurement",{frame_type:"sleeve",size_type:"standard"}),
  req("sleeve_glass_spec",{frame_type:"sleeve",size_type:"standard",sleeve_glass_procurement:"ykk_unit"}),
  req("screen_body_color",{screen_type:"horizontal_roll_screen_xmd_flat_single"}),
  req("screen_net_color",{screen_type:"horizontal_roll_screen_xmd_flat_single"})
];

const ruleSets=[
  {id:`${PRODUCT_ID}:rules:resolution`,productId:PRODUCT_ID,type:"RESOLUTION_RULES",status:"ACTIVE",payload:RESOLUTION_RULES,evidenceIds:[EV_ORDER,EV_PRODUCT]},
  {id:`${PRODUCT_ID}:rules:validation`,productId:PRODUCT_ID,type:"VALIDATION_RULES",status:"ACTIVE",payload:VALIDATION_RULES,evidenceIds:[EV_ORDER,EV_PRODUCT]},
  {id:`${PRODUCT_ID}:rules:order`,productId:PRODUCT_ID,type:"ORDER_COMPONENT_RULES",status:"ACTIVE",payload:ORDER_COMPONENT_RULES,evidenceIds:[EV_ORDER]},
  {id:`${PRODUCT_ID}:rules:symbol`,productId:PRODUCT_ID,type:"PRODUCT_SYMBOL_SCHEMAS",status:"ACTIVE",payload:PRODUCT_SYMBOL_SCHEMAS,evidenceIds:[EV_ORDER]},
  {id:`${PRODUCT_ID}:rules:runtime`,productId:PRODUCT_ID,type:"RUNTIME_SPEC",status:"ACTIVE",payload:{
    masterVersion:"1.0",runtimeReady:true,notApplicableValue:NA,
    runtimeUserSelectFields:["fire_spec","panel_type","design_code","frame_type","handing","size_type","size_module","frame_width_mm","frame_height_mm","door_leaf_width_mm","door_leaf_height_mm","door_color","frame_color","lock_system","smart_key_type","power_supply","handle_color","cylinder_type","closer_inclusion","sleeve_glass_procurement","sleeve_glass_spec","punching_panel","screen_type","screen_body_color","screen_net_color","free_stopper","interior_trim_type","wreath_hook"],
    runtimeAutoFields:["design_taste","design_function","door_glass_procurement","handle_type","thumbturn_type","cylinder_color","face_unit_color","product_symbol_schema_id","order_strategy","screen_mw","screen_mh"],
    runtimeHiddenFields:["frame_variant","region_code","handing_symbol","key_code","electrical_group_code","handle_color_symbol","sleeve_glass_symbol","sleeve_glass_total_thickness_mm","required_sleeve_glass_total_thickness_mm","screen_min_mh","screen_max_mh"],
    deprecated:[{name:"sleeve_glass_spec:none",replacement:"sleeve_glass_procurement:site_procured",safeToRemove:true}]
  },evidenceIds:[EV_ORDER,EV_PRODUCT]}
];

const evidence=[
  {id:EV_ORDER,productId:PRODUCT_ID,sourceType:"OFFICIAL_ORDER_CATALOG",sourceId:"17EAfL1k8p0dMqSjR6xZN0xfLdsIF5wVH",sourceFile:"202605_YKKAP_コンコードS30_受発注用.pdf",title:"コンコード S30 受発注用 2026年5月",catalogCode:"XAAAA-H26-048K1",status:"VERIFIED_OFFICIAL"},
  {id:EV_PRODUCT,productId:PRODUCT_ID,sourceType:"OFFICIAL_PRODUCT_CATALOG",sourceId:"1gD4Rs4YgcNQfRsWGBBNNNxkp9VwGI1uw",sourceFile:"202605_YKKAP_コンコードS30_商品カタログ.pdf",title:"コンコード S30 商品カタログ 2026年5月",catalogCode:"XAAAA-H26-048-1",status:"VERIFIED_OFFICIAL"}
];

export const CONCORDS30_MODULE={
  product:{
    id:PRODUCT_ID,manufacturer:"YKK AP",displayName:"コンコード S30",category:"玄関引戸",
    status:"ACTIVE",recoveryStatus:"MASTER_COMPLETE",runtimeReady:true,masterVersion:"1.0",
    source:{id:"17EAfL1k8p0dMqSjR6xZN0xfLdsIF5wVH",title:"202605_YKKAP_コンコードS30_受発注用.pdf",version:"2026-05",catalogCode:"XAAAA-H26-048K1"}
  },
  specificationDefinitions,allowedValues,requiredFieldRules,ruleSets,dependencies:[],evidence
};
