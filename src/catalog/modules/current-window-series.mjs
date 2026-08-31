import { SAMOS2H_MODULE } from "./samos2h-module.mjs";

const makeDefinition=(productId,key,label,order,sourceRole,dataType="ENUM")=>({
  id:`${productId}:def:${key}`,productId,key,displayLabel:label,dataType,displayOrder:order,
  status:"ACTIVE",sourceRole,evidenceIds:[`${productId}:ev:master`]
});
const makeSkeleton=({id,manufacturer,displayName,source,appControlSheet,sizeMode="STANDARD",windows})=>{
  const defs=[
    makeDefinition(id,"window_type","窓種",10,"WINDOWS"),
    makeDefinition(id,"size_mode","サイズ方式",20,"SIZE"),
    makeDefinition(id,"size","サイズ",30,"SIZE"),
    makeDefinition(id,"exterior_color","外観色",40,"COLOR"),
    makeDefinition(id,"interior_color","内観色",50,"INNER_COLOR"),
    makeDefinition(id,"screen","網戸",60,"SCREEN"),
    makeDefinition(id,"glass","ガラス",70,"GLASS"),
    makeDefinition(id,"options","その他オプション",80,"OPTIONS","MULTI_ENUM")
  ];
  const values=windows.map(([v,l],i)=>({
    id:`${id}:value:window:${v}`,productId:id,specificationKey:"window_type",value:v,displayLabel:l,
    displayOrder:i+1,status:"ACTIVE",evidenceIds:[`${id}:ev:master`]
  }));
  values.push({id:`${id}:value:size-mode:standard`,productId:id,specificationKey:"size_mode",value:"STANDARD",displayLabel:"規格サイズ",displayOrder:1,status:"ACTIVE",evidenceIds:[`${id}:ev:master`]});
  if(sizeMode==="STANDARD_CUSTOM") values.push({id:`${id}:value:size-mode:custom`,productId:id,specificationKey:"size_mode",value:"CUSTOM",displayLabel:"特注寸法",displayOrder:2,status:"ACTIVE",evidenceIds:[`${id}:ev:master`]});
  return {
    product:{id,manufacturer,displayName,category:"サッシ",status:"ACTIVE",recoveryStatus:"WAVE1_SCAFFOLD",source},
    specificationDefinitions:defs,allowedValues:values,
    requiredFieldRules:[
      {id:`${id}:required:window_type`,productId:id,specificationKey:"window_type",required:true,selector:{},evidenceIds:[`${id}:ev:master`]},
      {id:`${id}:required:size_mode`,productId:id,specificationKey:"size_mode",required:true,selector:{},evidenceIds:[`${id}:ev:master`]},
      {id:`${id}:required:size`,productId:id,specificationKey:"size",required:true,selector:{},evidenceIds:[`${id}:ev:master`]}
    ],
    ruleSets:[{id:`${id}:rules:app-control`,productId:id,type:"SOURCE_ROUTING",status:"ACTIVE",selector:{productId:id},payload:{appControlSheet},evidenceIds:[`${id}:ev:master`]}],
    dependencies:[],
    evidence:[{id:`${id}:ev:master`,productId:id,sourceType:"PRODUCT_MASTER",sourceId:source.id,sourceFile:source.title,title:source.title,status:"VERIFIED_SOURCE"}]
  };
};

const THERMOS_L=makeSkeleton({
  id:"SER-LIX-SAMOSL",manufacturer:"LIXIL",displayName:"サーモスL",
  source:{id:"17lVzBZ1hp4RVcGv0yNdnrKt25SFO2FhL",title:"サーモスL_商品マスター_v0.7_特注寸法発注アプリ投入完成版_QA確定.xlsx"},
  appControlSheet:"16_APP_候補制御",sizeMode:"STANDARD_CUSTOM",
  windows:[
    ["WT-SL-HIKICHIGAI","単体引違い窓"],["WT-SL-SHUTTER-HIKI","シャッター付引違い窓"],
    ["WT-SL-AMADO-HIKI","雨戸付引違い窓"],["WT-SL-MENKOSHI-HIKI","面格子付引違い窓"],
    ["WT-SL-TATE-SUBERI","縦すべり出し窓"],["WT-SL-YOKO-SUBERI","横すべり出し窓"],
    ["WT-SL-KOSHO-YOKO","高所用横すべり出し窓"],["WT-SL-AGE-SAGE-FS","上げ下げ窓FS"],
    ["WT-SL-MENKOSHI-AGE-FS","面格子付上げ下げ窓FS"],["WT-SL-FIX-OUT","FIX窓（外押縁タイプ）"],
    ["WT-SL-FIX-IN","FIX窓（内押縁タイプ）"],["WT-SL-UCHIDAOSHI","内倒し窓"],
    ["WT-SL-SOTODAOSHI","外倒し窓"],["WT-SL-KAZARI-HIKI","装飾引違い窓"],
    ["WT-SL-TERRACE-DOOR","テラスドア"],["WT-SL-KATTEGUCHI-VENT-FS","採風勝手口ドアFS"],
    ["WT-SL-KATTEGUCHI","勝手口ドア"]
  ]
});
const APW430=makeSkeleton({
  id:"SER-YKK-APW430",manufacturer:"YKK AP",displayName:"APW 430",
  source:{id:"1QDocQ7yoXE6TAnzHtfsyKwwK6YB5_mgk90Bw1hm4iPo",title:"20260830_YKKAP_APW430_商品マスター_正本"},
  appControlSheet:"COMMON_MASTER_RULE_TABLES",sizeMode:"STANDARD_CUSTOM",
  windows:[
    ["SWT-YKK-APW430-TATE-GREMON-SINGLE","たてすべり出し窓（グレモンハンドル仕様）単窓"],
    ["SWT-YKK-APW430-TATE-GREMON-FIX-DAN","たてすべり出し窓（グレモンハンドル仕様）＋FIX段窓"],
    ["SWT-YKK-APW430-TATE-GREMON-FIX-REN","たてすべり出し窓（グレモンハンドル仕様）＋FIX連窓"],
    ["SWT-YKK-APW430-TATE-GREMON-WINDCATCH","たてすべり出し窓（グレモンハンドル仕様）ウインドキャッチ連窓"],
    ["SWT-YKK-APW430-TATE-OP-SINGLE","たてすべり出し窓（オペレーターハンドル仕様）単窓"],
    ["SWT-YKK-APW430-TATE-OP-FIX-DAN","たてすべり出し窓（オペレーターハンドル仕様）＋FIX段窓"],
    ["SWT-YKK-APW430-TATE-OP-FIX-REN","たてすべり出し窓（オペレーターハンドル仕様）＋FIX連窓"],
    ["SWT-YKK-APW430-TATE-OP-WINDCATCH","たてすべり出し窓（オペレーターハンドル仕様）ウインドキャッチ連窓"],
    ["SWT-YKK-APW430-SUBERI-GREMON-SINGLE","すべり出し窓（グレモンハンドル仕様）単窓"],
    ["SWT-YKK-APW430-SUBERI-GREMON-FIX-DAN","すべり出し窓（グレモンハンドル仕様）＋FIX段窓"],
    ["SWT-YKK-APW430-SUBERI-GREMON-FIX-REN","すべり出し窓（グレモンハンドル仕様）＋FIX連窓"],
    ["SWT-YKK-APW430-SUBERI-OP-SINGLE","すべり出し窓（オペレーターハンドル仕様）単窓"],
    ["SWT-YKK-APW430-SUBERI-OP-FIX-DAN","すべり出し窓（オペレーターハンドル仕様）＋FIX段窓"],
    ["SWT-YKK-APW430-SUBERI-OP-FIX-REN","すべり出し窓（オペレーターハンドル仕様）＋FIX連窓"],
    ["SWT-YKK-APW430-HIGH-SINGLE","高所用すべり出し窓 単窓"],
    ["SWT-YKK-APW430-HIGH-ENDOP-SINGLE","高所用すべり出し窓（端部操作仕様）単窓"],
    ["SWT-YKK-APW430-TWOACTION-SINGLE","ツーアクション窓 単窓"],
    ["SWT-YKK-APW430-TWOACTION-FIX-DAN","ツーアクション窓＋FIX段窓"],
    ["SWT-YKK-APW430-TWOACTION-FIX-REN","ツーアクション窓＋FIX連窓"],
    ["SWT-YKK-APW430-HIKI","引違い窓"],["SWT-YKK-APW430-MENKOSHI-HIKI","面格子付引違い窓"],
    ["SWT-YKK-APW430-SHUTTER-HIKI","シャッター付引違い窓"],["SWT-YKK-APW430-FIX-MADO","FIX窓 窓タイプ"],
    ["SWT-YKK-APW430-FIX-TR-ZAIRAI","FIX窓 テラスタイプ（在来）"],["SWT-YKK-APW430-FIX-TR-204","FIX窓 テラスタイプ（2×4）"]
  ]
});
const APW431=makeSkeleton({
  id:"SER-YKK-APW431",manufacturer:"YKK AP",displayName:"APW 431",
  source:{id:"1TBEn2tTbFjBLeIOeDs0fR3iIDcLEn3jI",title:"APW431_商品マスター_v1.0_最終QA正式固定版.xlsx"},
  appControlSheet:"27_APP統合選択",sizeMode:"STANDARD_CUSTOM",
  windows:[
    ["W431-001","引違いテラス戸"],["W431-002","シャッター付引違いテラス戸"],
    ["W431-003","大開口スライディング"],["W431-004","開き窓テラス"],
    ["W431-005","テラスドア"],["W431-006","勝手口ドア"]
  ]
});

export const CURRENT_WINDOW_SERIES_MODULES=[SAMOS2H_MODULE,THERMOS_L,APW430,APW431];
