import { THERMOSL_SOURCE as source } from "./thermosl-source.mjs";

const PRODUCT_ID="SER-LIX-SAMOSL";
const master=source.master;
const ev=(id)=>[id];
const definition=(key,displayLabel,displayOrder,sourceRole,dataType="ENUM",extra={})=>({
  id:`${PRODUCT_ID}:def:${key}`,productId:PRODUCT_ID,key,displayLabel,
  description:`${displayLabel}を正式01_正本から選択`,dataType,category:"estimate",
  applicability:"SELECTOR_DRIVEN",displayOrder,evidenceIds:ev("EV-SL-MASTER"),
  version:master.version,status:"ACTIVE",sourceRole,...extra
});
const value=(key,raw,label,order,extra={})=>{
  const {idSuffix,...rest}=extra;
  return{id:`${PRODUCT_ID}:${key}:${raw}:${idSuffix??order}`,productId:PRODUCT_ID,
    specificationKey:key,value:raw,displayLabel:label,displayOrder:order,status:"ACTIVE",...rest};
};
const specific=(spec)=>spec&&spec!=="*"?{specific_spec:spec}:{};
const sourceMeta=(sheet,row,extra={})=>({sourceFile:master.title,sourceSheet:sheet,sourceRow:row,...extra});

const SPEC_FIELDS=new Map([
  ["シャッター種類",["shutter_type","シャッター種類"]],
  ["雨戸種類",["rain_shutter_type","雨戸種類"]],
  ["面格子種類",["grille_type","面格子種類"]],
  ["ハンドル×構成タイプ",["handle_configuration","ハンドル・構成"]],
  ["ハンドル種類",["handle_type","ハンドル種類"]],
  ["操作方式",["operation_method","操作方式"]],
  ["構成タイプ",["composition_type","構成タイプ"]],
  ["建具構成",["joinery_configuration","建具構成"]],
  ["ドアタイプ",["door_type","ドアタイプ"]]
]);

const windowValues=source.windows.map((row,index)=>value("window_type",row.id,row.label,index+1,{
  idSuffix:row.id,evidenceIds:ev("EV-SL-WINDOW"),metadata:sourceMeta("03_窓種",row.sourceRow)
}));
const specDefinitions=[];
const specValues=[];
for(const [type,[key,label]] of SPEC_FIELDS){
  const windows=source.windows.filter((row)=>row.specType===type).map((row)=>row.id);
  if(!windows.length)continue;
  specDefinitions.push(definition(key,label,20,"SPECIFICATIONS","ENUM",{
    selector:{window_type:{$in:windows}},autoSelectSingle:true
  }));
  for(const row of source.specs.filter((item)=>item.type===type)){
    specValues.push(value(key,row.id,row.label,row.order??999,{
      idSuffix:row.id,selector:{window_type:row.window},evidenceIds:ev("EV-SL-WINDOW"),
      metadata:sourceMeta("04_窓種固有仕様",row.sourceRow,{specific_spec:row.id,formalName:row.formalName,state:row.state})
    }));
  }
}

const handingScopes=[
  {window_type:"WT-SL-TATE-SUBERI",specific_spec:{$in:[
    "SP-SL-TATE-OP-T","SP-SL-TATE-OP-TF-OUT","SP-SL-TATE-OP-TF-IN",
    "SP-SL-TATE-CAM-T","SP-SL-TATE-CAM-TF-OUT","SP-SL-TATE-CAM-TF-IN"
  ]}},
  {window_type:"WT-SL-KOSHO-YOKO"},
  {window_type:"WT-SL-KAZARI-HIKI",specific_spec:"SP-SL-KAZARI-HK"},
  {window_type:"WT-SL-TERRACE-DOOR"},
  {window_type:"WT-SL-KATTEGUCHI-VENT-FS"},
  {window_type:"WT-SL-KATTEGUCHI"}
];
const handingSelector={any:handingScopes};
const handingValues=[
  value("handing","L","L（左吊元）",1,{selector:handingSelector,evidenceIds:ev("EV-SL-SIZE")}),
  value("handing","R","R（右吊元）",2,{selector:handingSelector,evidenceIds:ev("EV-SL-SIZE")})
];
const needsHanding=(windowId,specId)=>handingScopes.some((scope)=>{
  if(scope.window_type!==windowId)return false;
  if(!scope.specific_spec)return true;
  const expected=scope.specific_spec;
  return typeof expected==="string"?expected===specId:(expected.$in??[]).includes(specId);
});

const sizeModeValues=[
  value("size_mode","STANDARD","規格サイズ",1,{evidenceIds:ev("EV-SL-SIZE")}),
  value("size_mode","CUSTOM","特注寸法",2,{evidenceIds:ev("EV-SL-CUSTOM")})
];

const standardConstructionValues=[];
const standardSeen=new Set();
for(const row of source.sizes.filter((item)=>item.active)){
  const key=JSON.stringify([row.window,row.spec,row.construction]);
  if(standardSeen.has(key))continue;
  standardSeen.add(key);
  standardConstructionValues.push(value("construction",row.construction,row.construction==="在来・204"?"在来・2×4共通":row.construction,standardConstructionValues.length+1,{
    idSuffix:`standard-${standardConstructionValues.length+1}`,
    selector:{size_mode:"STANDARD",window_type:row.window,...specific(row.spec)},
    evidenceIds:ev("EV-SL-SIZE"),metadata:sourceMeta("06_サイズ",row.sourceRow)
  }));
}
const customConstructionValues=[];
const customSeen=new Set();
for(const row of source.dimensionRules){
  const key=JSON.stringify([row.window,row.spec,row.construction]);
  if(customSeen.has(key))continue;
  customSeen.add(key);
  const label={"在来・204":"在来・2×4共通","在来・204・単純段差":"在来・2×4・単純段差"}[row.construction]??row.construction;
  customConstructionValues.push(value("construction",row.construction,label,customConstructionValues.length+1,{
    idSuffix:`custom-${customConstructionValues.length+1}`,
    selector:{size_mode:"CUSTOM",window_type:row.window,...specific(row.spec)},
    evidenceIds:ev("EV-SL-CUSTOM"),metadata:sourceMeta("06C_特注寸法範囲",row.sourceRow)
  }));
}

const highAllowedBySize=new Map();
for(const row of source.highOperationMatrix.filter((item)=>item.allowed)){
  if(!highAllowedBySize.has(row.sizeId))highAllowedBySize.set(row.sizeId,[]);
  highAllowedBySize.get(row.sizeId).push(row.spec);
}
const sizeValues=source.sizes.filter((row)=>row.active).map((row,index)=>{
  const selector={size_mode:"STANDARD",window_type:row.window,construction:row.construction,...specific(row.spec)};
  if(row.window==="WT-SL-KOSHO-YOKO")selector.specific_spec={$in:highAllowedBySize.get(row.id)??[]};
  if(needsHanding(row.window,row.spec))selector.handing={$in:["L","R"]};
  return value("size",row.id,`${row.callCode} ｜ ${row.actualW}×${row.actualH}mm`,index+1,{
    idSuffix:row.id,selector,evidenceIds:ev("EV-SL-SIZE"),
    metadata:sourceMeta("06_サイズ",row.sourceRow,{
      sourceSizeId:row.id,actualW:row.actualW,actualH:row.actualH,callW:row.callW,callH:row.callH,
      callCode:row.callCode,construction:row.construction,windowClass:row.windowClass,
      glassSymbol:row.glassSymbol,glassState:row.glassState,page:row.page
    })
  });
});

const leafValues=["2枚建","4枚建"].map((label,index)=>value("leaf_configuration",label,label,index+1,{
  selector:{size_mode:"CUSTOM",window_type:"WT-SL-MENKOSHI-HIKI"},evidenceIds:ev("EV-SL-CUSTOM")
}));

const exteriorValues=source.colors.map((row,index)=>value("exterior_color",row.exteriorId,row.exteriorLabel,index+1,{
  idSuffix:row.id,evidenceIds:ev("EV-SL-COLOR"),metadata:sourceMeta("07_色",row.sourceRow)
}));
const interiorValues=source.colors.map((row,index)=>value("interior_color",row.interiorId,row.interiorLabel,index+1,{
  idSuffix:row.id,selector:{exterior_color:row.exteriorId},evidenceIds:ev("EV-SL-COLOR"),
  metadata:sourceMeta("07_色",row.sourceRow)
}));

const positiveScreens=source.screens.filter((row)=>row.presence==="あり");
const screenScopes=[];
const screenScopeSeen=new Set();
for(const row of positiveScreens){
  const selector={window_type:row.window,...specific(row.spec)},key=JSON.stringify(selector);
  if(!screenScopeSeen.has(key)){screenScopeSeen.add(key);screenScopes.push(selector);}
}
const screenSelector={any:screenScopes};
const mandatoryScreenWindows=new Set(["WT-SL-KATTEGUCHI-VENT-FS"]);
const screenPresenceValues=[];
let screenPresenceOrder=1;
for(const selector of screenScopes){
  if(!mandatoryScreenWindows.has(selector.window_type))screenPresenceValues.push(value("screen_presence","なし","なし",screenPresenceOrder++,{
    idSuffix:`none-${screenPresenceOrder}`,selector,evidenceIds:ev("EV-SL-SCREEN")
  }));
  screenPresenceValues.push(value("screen_presence","あり",mandatoryScreenWindows.has(selector.window_type)?"あり（必須）":"あり",screenPresenceOrder++,{
    idSuffix:`yes-${screenPresenceOrder}`,selector,evidenceIds:ev("EV-SL-SCREEN")
  }));
}
const fixedForms=(row)=>{
  if(row.form!=="固定式網戸")return[row.form];
  if(row.window==="WT-SL-UCHIDAOSHI")return["固定式網戸（内倒し窓用）"];
  return["固定式網戸（フレームレス）","固定式網戸（タグ付フレームレス）","固定式網戸（フレーム付）"];
};
const screenFormValues=[];
for(const row of positiveScreens)for(const [variantIndex,form] of fixedForms(row).entries())screenFormValues.push(value("screen_form",form,form,row.order??999,{
  idSuffix:`${row.id}-${variantIndex}`,selector:{window_type:row.window,screen_presence:"あり",...specific(row.spec)},
  evidenceIds:ev("EV-SL-SCREEN"),metadata:sourceMeta("09_網戸",row.sourceRow,{formalName:row.formalName})
}));
const underMidrail={any:[{actualH:{$lt:1370}},{custom_height:{$lt:1370}}]};
const overMidrail={any:[{actualH:{$gte:1370}},{custom_height:{$gte:1370}}]};
const screenMidrailValues=[
  value("screen_midrail","なし","中桟なし",1,{selector:{screen_form:{$in:["引違い網戸","開き網戸"]},...underMidrail},evidenceIds:ev("EV-SL-SCREEN")}),
  value("screen_midrail","あり","中桟付き",2,{selector:{screen_form:"引違い網戸"},evidenceIds:ev("EV-SL-SCREEN")}),
  value("screen_midrail","あり","中桟付き",3,{idSuffix:"open",selector:{screen_form:"開き網戸",...overMidrail},evidenceIds:ev("EV-SL-SCREEN")})
];
const screenNetValues=source.netRelations.filter((row)=>row.allowed).map((row,index)=>{
  const selector={screen_form:row.form};
  if(row.net==="ペットネット")selector.any=[{actualW:{$lte:780}},{custom_width:{$lte:780}}];
  return value("screen_net",row.net,row.net,index+1,{
    idSuffix:row.id,selector,evidenceIds:ev("EV-SL-SCREEN"),
    metadata:sourceMeta("09D_網戸ネット設定可否",row.sourceRow,{standard:row.standard,state:row.state})
  });
});

const glassBaseValues=[];
const glassTypeValues=[];
for(const row of source.glassControls){
  const scope={window_type:row.window,...specific(row.spec)};
  if(row.loweClear||row.lowePattern)glassBaseValues.push(value("glass_base","LOWE","Low-E複層ガラス",1,{
    idSuffix:`${row.id}-lowe`,selector:scope,evidenceIds:ev("EV-SL-GLASS")
  }));
  if(row.pairClear||row.pairPattern)glassBaseValues.push(value("glass_base","PAIR","一般複層ガラス",2,{
    idSuffix:`${row.id}-pair`,selector:scope,evidenceIds:ev("EV-SL-GLASS")
  }));
  if(row.loweClear)glassTypeValues.push(value("glass_type","CLEAR","透明",1,{idSuffix:`${row.id}-lowe-clear`,selector:{...scope,glass_base:"LOWE"},evidenceIds:ev("EV-SL-GLASS")}));
  if(row.lowePattern)glassTypeValues.push(value("glass_type","PATTERN","型板",2,{idSuffix:`${row.id}-lowe-pattern`,selector:{...scope,glass_base:"LOWE"},evidenceIds:ev("EV-SL-GLASS")}));
  if(row.pairClear)glassTypeValues.push(value("glass_type","CLEAR","透明",1,{idSuffix:`${row.id}-pair-clear`,selector:{...scope,glass_base:"PAIR"},evidenceIds:ev("EV-SL-GLASS")}));
  if(row.pairPattern)glassTypeValues.push(value("glass_type","PATTERN","型板",2,{idSuffix:`${row.id}-pair-pattern`,selector:{...scope,glass_base:"PAIR"},evidenceIds:ev("EV-SL-GLASS")}));
}
const gatedGlassIds=new Set(source.glassGates.map((row)=>row.glassId));
const glassDetailValues=source.glass.filter((row)=>row.base!=="追加機能"&&!gatedGlassIds.has(row.id)).map((row,index)=>value("glass_detail",row.id,row.build,index+1,{
  idSuffix:row.id,selector:{glass_base:row.base==="Low-E複層ガラス"?"LOWE":"PAIR"},
  evidenceIds:ev("EV-SL-GLASS"),metadata:sourceMeta("08_ガラス",row.sourceRow,{
    lowE:row.lowE,appearance:row.appearance,gas:row.gas,spacer:row.spacer,state:row.state
  })
}));
const glassFunctionValues=[
  value("glass_function","NONE","なし",1,{evidenceIds:ev("EV-SL-GLASS")}),
  ...source.glassGates.map((row,index)=>value("glass_function",row.glassId,row.function,index+2,{
    idSuffix:row.id,evidenceIds:ev("EV-SL-GLASS"),status:"MANUAL_CHECK",
    metadata:sourceMeta("08E_機能ガラス確認",row.sourceRow,{
      manualCheck:true,confirmationStatus:"CONFIRM_REQUIRED",finalCheck:row.finalCheck,
      region:row.region,state:row.state,url:row.url
    })
  }))
];

const HIKI=["WT-SL-HIKICHIGAI","WT-SL-SHUTTER-HIKI","WT-SL-AMADO-HIKI","WT-SL-MENKOSHI-HIKI","WT-SL-KAZARI-HIKI"];
const HIKI_NO_DECOR=HIKI.filter((id)=>id!=="WT-SL-KAZARI-HIKI");
const DECOR=["WT-SL-TATE-SUBERI","WT-SL-YOKO-SUBERI","WT-SL-KOSHO-YOKO","WT-SL-AGE-SAGE-FS","WT-SL-MENKOSHI-AGE-FS","WT-SL-FIX-OUT","WT-SL-FIX-IN","WT-SL-UCHIDAOSHI","WT-SL-SOTODAOSHI","WT-SL-KAZARI-HIKI"];
const DOORS=["WT-SL-TERRACE-DOOR","WT-SL-KATTEGUCHI-VENT-FS","WT-SL-KATTEGUCHI"];
const ELECTRIC=["SP-SL-KOSHO-ELECTRIC","SP-SL-SHUT-E-STD","SP-SL-SHUT-E-VENT","SP-SL-SHUT-E-WIND"];
const optionSelector=(row)=>{
  let selector={};
  if(row.window==="引違い窓系（装飾窓除く）")selector.window_type={$in:HIKI_NO_DECOR};
  else if(row.window==="引違い窓系")selector.window_type={$in:HIKI};
  else if(row.window==="装飾窓系")selector.window_type={$in:DECOR};
  else if(row.window==="ドア系")selector.window_type={$in:DOORS};
  else if(row.window==="電動対象窓種")selector.specific_spec={$in:ELECTRIC};
  else if(row.window==="引違い網戸")selector.screen_form="引違い網戸";
  else if(row.window==="しまえるんですJ")selector.screen_form="しまえるんですJ";
  else if(row.window!=="*"&&row.window.startsWith("WT-"))selector.window_type={$in:row.window.split("/")};
  if(row.spec&&row.spec!=="*")selector.specific_spec=row.spec;
  if(row.id==="OP-SL-FINGER-GUARD")selector.options={$notContains:"OP-SL-ANGLE-COVER"};
  if(row.id==="OP-SL-ANGLE-COVER")selector.options={$notContains:"OP-SL-FINGER-GUARD"};
  return selector;
};
const optionValues=source.options.filter((row)=>row.usage==="見積選択").map((row,index)=>{
  const manual=/通過時|制限|不可|確認/.test(`${row.condition} ${row.note}`);
  return value("options",row.id,row.label,row.order??index+1,{
    idSuffix:row.id,selector:optionSelector(row),status:manual?"MANUAL_CHECK":"ACTIVE",
    evidenceIds:ev("EV-SL-OPTION"),metadata:sourceMeta("10_その他OP",row.sourceRow,{
      usage:row.usage,manualCheck:manual?row.note||row.condition:null,state:row.state
    })
  });
});

const dimensionRules=source.dimensionRules.map((row)=>({
  ...row,productId:PRODUCT_ID,
  selector:{
    window_type:row.window,construction:row.construction,...specific(row.spec),
    ...(["2枚建","4枚建"].includes(row.leafConfiguration)?{leaf_configuration:row.leafConfiguration}:{})
  },
  evidenceIds:ev("EV-SL-CUSTOM")
}));

const dependencies=[
  {id:"DEP-SL-SCREEN-MANDATORY",productId:PRODUCT_ID,evaluation:"AUTO",action:"FORCE_CANDIDATE",
    targetField:"screen_presence",targetValue:"あり",when:{window_type:"WT-SL-KATTEGUCHI-VENT-FS"},
    priority:10,status:"ACTIVE",evidenceIds:ev("EV-SL-SCREEN")},
  {id:"DEP-SL-SCREEN-FORM-MANDATORY",productId:PRODUCT_ID,evaluation:"AUTO",action:"FORCE_CANDIDATE",
    targetField:"screen_form",targetValue:"網付格子",when:{window_type:"WT-SL-KATTEGUCHI-VENT-FS",screen_presence:"あり"},
    priority:20,status:"ACTIVE",evidenceIds:ev("EV-SL-SCREEN")},
  {id:"DEP-SL-GLASS-CONFIRM",productId:PRODUCT_ID,evaluation:"MANUAL_CHECK",action:"REVIEW",
    targetField:"glass_function",when:{glass_function:{$ne:"NONE"}},
    message:"機能ガラスはCONFIRM_REQUIREDです。LIXIL見積システムで最終組合せを確認してください。",
    priority:30,status:"ACTIVE",evidenceIds:ev("EV-SL-GLASS")}
];

const definitions=[
  definition("window_type","窓種",10,"WINDOWS"),
  ...specDefinitions,
  definition("handing","開き勝手（吊元）",25,"SIZE","ENUM",{selector:handingSelector}),
  definition("size_mode","サイズ方式",30,"SIZE"),
  definition("construction","工法区分",40,"SIZE","ENUM",{selector:{size_mode:{$in:["STANDARD","CUSTOM"]}},autoSelectSingle:true}),
  definition("leaf_configuration","建具・枚数",45,"CUSTOM_SIZE","ENUM",{selector:{size_mode:"CUSTOM",window_type:"WT-SL-MENKOSHI-HIKI"}}),
  definition("size","規格サイズ",50,"SIZE","ENUM",{selector:{size_mode:"STANDARD"}}),
  definition("custom_width","特注W（mm）",50,"CUSTOM_SIZE","NUMBER",{selector:{size_mode:"CUSTOM"}}),
  definition("custom_height","特注H（mm）",60,"CUSTOM_SIZE","NUMBER",{selector:{size_mode:"CUSTOM"}}),
  definition("exterior_color","外観色",70,"COLOR"),
  definition("interior_color","内観色",80,"INNER_COLOR"),
  definition("screen_presence","網戸",90,"SCREEN","ENUM",{selector:screenSelector,autoSelectSingle:true}),
  definition("screen_form","網戸形式",100,"SCREEN","ENUM",{selector:{screen_presence:"あり"},autoSelectSingle:true}),
  definition("screen_midrail","網戸中桟",110,"SCREEN","ENUM",{selector:{screen_form:{$in:["引違い網戸","開き網戸"]}},autoSelectSingle:true}),
  definition("screen_net","網戸ネット",120,"SCREEN_NET","ENUM",{selector:{screen_presence:"あり"},autoSelectSingle:true}),
  definition("glass_base","ガラス",130,"GLASS"),
  definition("glass_type","ガラス種",140,"GLASS"),
  definition("glass_detail","ガラス構成",150,"GLASS"),
  definition("glass_function","機能ガラス",160,"GLASS_LIMIT","ENUM",{autoSelectSingle:true}),
  definition("options","その他オプション",170,"OPTIONS","MULTI_ENUM")
];
const optionalKeys=new Set(["options","glass_function"]);
const requiredFieldRules=definitions.filter((row)=>!optionalKeys.has(row.key)).map((row)=>({
  id:`${PRODUCT_ID}:required:${row.key}`,productId:PRODUCT_ID,specificationKey:row.key,
  required:true,selector:row.selector??{},priority:row.displayOrder,evidenceIds:row.evidenceIds
}));

const evidence=[
  {id:"EV-SL-MASTER",productId:PRODUCT_ID,sourceType:"PRODUCT_MASTER",title:master.title,sourceId:master.id,version:master.version,sourceFolder:master.folder,status:"VERIFIED_SOURCE"},
  {id:"EV-SL-WINDOW",productId:PRODUCT_ID,sourceType:"MASTER_SHEET",title:"窓種・固有仕様",sourceSheet:"03_窓種 / 04_窓種固有仕様 / 05_設定可否関係",status:"VERIFIED_SOURCE"},
  {id:"EV-SL-SIZE",productId:PRODUCT_ID,sourceType:"MASTER_SHEET",title:"規格サイズ",sourceSheet:"06_サイズ",status:"VERIFIED_SOURCE"},
  {id:"EV-SL-CUSTOM",productId:PRODUCT_ID,sourceType:"MASTER_SHEET",title:"寸法特注範囲",sourceSheet:"06C_特注寸法範囲",status:"VERIFIED_SOURCE"},
  {id:"EV-SL-COLOR",productId:PRODUCT_ID,sourceType:"MASTER_SHEET",title:"色",sourceSheet:"07_色",status:"VERIFIED_SOURCE"},
  {id:"EV-SL-GLASS",productId:PRODUCT_ID,sourceType:"MASTER_SHEET",title:"ガラス・確認ゲート",sourceSheet:"08_ガラス / 08B / 08E",status:"VERIFIED_SOURCE"},
  {id:"EV-SL-SCREEN",productId:PRODUCT_ID,sourceType:"MASTER_SHEET",title:"網戸・ネット・制御",sourceSheet:"09_網戸 / 09C / 09D",status:"VERIFIED_SOURCE"},
  {id:"EV-SL-OPTION",productId:PRODUCT_ID,sourceType:"MASTER_SHEET",title:"その他有償品",sourceSheet:"10_その他OP",status:"VERIFIED_SOURCE"},
  {id:"EV-SL-HIGH",productId:PRODUCT_ID,sourceType:"MASTER_SHEET",title:"高所操作サイズ可否",sourceSheet:"06B_高所操作サイズ",status:"VERIFIED_SOURCE"},
  {id:"EV-SL-APP",productId:PRODUCT_ID,sourceType:"MASTER_SHEET",title:"APP候補制御",sourceSheet:"16_APP_候補制御",status:"VERIFIED_SOURCE"},
  {id:"EV-SL-GOLDEN",productId:PRODUCT_ID,sourceType:"MASTER_SHEET",title:"Golden Test",sourceSheet:"17_Golden_Test",status:"VERIFIED_SOURCE"}
];

export const THERMOSL_MODULE={
  product:{
    id:PRODUCT_ID,manufacturer:"LIXIL",displayName:"サーモスL",category:"サッシ",status:"ACTIVE",
    recoveryStatus:"CANONICAL_MASTER_CONNECTED",source:master,sourceInventory:source.sourceInventory,
    notices:["要求耐風圧等級（S-1〜S-4）は通常見積UIへ表示しません。特殊案件はCONFIRM_REQUIREDです。"]
  },
  specificationDefinitions:definitions,
  allowedValues:[
    ...windowValues,...specValues,...handingValues,...sizeModeValues,
    ...standardConstructionValues,...customConstructionValues,...leafValues,...sizeValues,
    ...exteriorValues,...interiorValues,...screenPresenceValues,...screenFormValues,...screenMidrailValues,...screenNetValues,
    ...glassBaseValues,...glassTypeValues,...glassDetailValues,...glassFunctionValues,...optionValues
  ],
  requiredFieldRules,
  ruleSets:[
    {id:`${PRODUCT_ID}:app-control`,productId:PRODUCT_ID,type:"SOURCE_ROUTING",status:"ACTIVE",selector:{},payload:source.appControls,evidenceIds:ev("EV-SL-APP")},
    {id:`${PRODUCT_ID}:dimension-rules`,productId:PRODUCT_ID,type:"DIMENSION_RULES",status:"ACTIVE",selector:{},payload:dimensionRules,evidenceIds:ev("EV-SL-CUSTOM")},
    {id:`${PRODUCT_ID}:high-operation`,productId:PRODUCT_ID,type:"SIZE_AVAILABILITY_MATRIX",status:"ACTIVE",selector:{window_type:"WT-SL-KOSHO-YOKO"},payload:source.highOperationMatrix,evidenceIds:ev("EV-SL-HIGH")},
    {id:`${PRODUCT_ID}:screen-rules`,productId:PRODUCT_ID,type:"MASTER_RULE_TABLE",status:"ACTIVE",selector:{},payload:source.screenLimits,evidenceIds:ev("EV-SL-SCREEN")},
    {id:`${PRODUCT_ID}:glass-confirm`,productId:PRODUCT_ID,type:"CONFIRM_REQUIRED",status:"ACTIVE",selector:{},payload:source.glassGates,evidenceIds:ev("EV-SL-GLASS")},
    {id:`${PRODUCT_ID}:manual-check`,productId:PRODUCT_ID,type:"MANUAL_CHECK_POLICY",status:"ACTIVE",selector:{},payload:{blocksNormalEstimate:false,windPressureInputVisible:false},evidenceIds:ev("EV-SL-MASTER")}
  ],
  dependencies,
  evidence,
  goldenTests:source.goldenTests,
  stats:{...source.sourceInventory,handingScopes:handingScopes.length,activeFeatureSpecs:source.specs.length,normalEstimateOptions:source.options.filter((row)=>row.usage==="見積選択").length}
};

export { PRODUCT_ID as THERMOSL_PRODUCT_ID, dimensionRules as THERMOSL_DIMENSION_RULES };
