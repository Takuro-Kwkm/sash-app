import{APW430_MODULE as baseModule}from'./apw430-module.mjs';

const PRODUCT_ID='SER-YKK-APW430';
const EVIDENCE=['EV-APW430-MASTER'];
const definition=(key,label,order,{autoSelectSingle=false}={})=>({id:`${PRODUCT_ID}:def:${key}`,productId:PRODUCT_ID,key,displayLabel:label,dataType:'ENUM',displayOrder:order,status:'ACTIVE',sourceRole:'GLASS',selector:{},evidenceIds:EVIDENCE,autoSelectSingle});
const value=(key,raw,label,order,{selector={},manualCheck=false,metadata={}}={})=>({
  id:`${PRODUCT_ID}:sales-glass:${key}:${raw}`,productId:PRODUCT_ID,specificationKey:key,value:raw,displayLabel:label,displayOrder:order,
  status:manualCheck?'MANUAL_CHECK':'ACTIVE',selector,evidenceIds:EVIDENCE,metadata:{...metadata,...(manualCheck?{manualCheck:true}:{})}
});

const glassDefinitions=[
  definition('glass_base','ガラス',120,{autoSelectSingle:true}),
  definition('glass_type','ガラス種',130),
  definition('glass_detail','ガラス詳細',140),
  definition('glass_additional','ガラス追加機能',150),
  definition('glass_spacer','スペーサー',160,{autoSelectSingle:true}),
  definition('glass_air_layer','中空層',170,{autoSelectSingle:true})
];
const glassValues=[
  value('glass_base','LOWE','Low-E（トリプルガラス）',1,{metadata:{sourceSheet:'08_ガラス',formalGlassClass:'トリプルガラス／ダブルLow-E'}}),
  value('glass_type','CLEAR','透明',1,{metadata:{sourceSheet:'08E_ガラス種',formalId:'GLA-YKK-APW430-TRANSPARENT'}}),
  value('glass_type','PATTERN','型',2,{manualCheck:true,metadata:{sourceSheet:'08E_ガラス種',formalId:'GLA-YKK-APW430-PATTERN',confirmationStatus:'CONFIRM_REQUIRED'}}),
  value('glass_detail','CLEAR_GAIN','クリア（日射取得型）',1,{selector:{glass_base:'LOWE'},metadata:{sourceSheet:'08_ガラス',formalId:'GL-YKK-APW430-TG-CLEAR-AR'}}),
  value('glass_detail','BLUE_SHIELD','ブルー（日射遮蔽型）',2,{selector:{glass_base:'LOWE'},metadata:{sourceSheet:'08_ガラス',formalId:'GL-YKK-APW430-TG-BLUE-AR'}}),
  value('glass_detail','BRONZE_SHIELD','ブロンズ（日射遮蔽型）',3,{selector:{glass_base:'LOWE'},metadata:{sourceSheet:'08_ガラス',formalId:'GL-YKK-APW430-TG-BRONZE-AR'}}),
  value('glass_detail','NEUTRAL_SHIELD','ニュートラル（日射遮蔽型）',4,{selector:{glass_base:'LOWE'},metadata:{sourceSheet:'08_ガラス',formalId:'GL-YKK-APW430-TG-NEUTRAL-AR'}}),
  value('glass_additional','NONE','なし',1,{metadata:{sourceSheet:'08D_ガラス追加機能',formalId:'GLF-YKK-APW430-NORMAL'}}),
  value('glass_additional','SAFE','安全合わせ',2,{manualCheck:true,metadata:{sourceSheet:'08D_ガラス追加機能',formalId:'GLF-YKK-APW430-SAFE-LAM',confirmationStatus:'CONFIRM_REQUIRED'}}),
  value('glass_additional','DISASTER_SAFE','防災安全合わせ',3,{manualCheck:true,metadata:{sourceSheet:'08D_ガラス追加機能',formalId:'GLF-YKK-APW430-DISASTER-LAM',confirmationStatus:'CONFIRM_REQUIRED'}}),
  value('glass_spacer','RESIN','樹脂スペーサー',1,{metadata:{sourceSheet:'08_ガラス'}}),
  value('glass_air_layer','ARGON','アルゴンガス',1,{metadata:{sourceSheet:'08_ガラス'}})
];
const requiredFieldRules=[
  ...baseModule.requiredFieldRules,
  ...glassDefinitions.map((row)=>({id:`${PRODUCT_ID}:required:${row.key}`,productId:PRODUCT_ID,specificationKey:row.key,required:true,selector:{},priority:row.displayOrder,evidenceIds:EVIDENCE}))
];
const dependencies=[
  ...baseModule.dependencies,
  {id:'DEP-APW430-GLASS-PATTERN-CONFIRM',productId:PRODUCT_ID,evaluation:'MANUAL_CHECK',action:'REVIEW',targetField:'glass_type',when:{glass_type:'PATTERN'},message:'型ガラスは窓種・サイズで設定制限があります。YKK AP見積システムで最終確認してください。',priority:40,status:'ACTIVE',evidenceIds:EVIDENCE},
  {id:'DEP-APW430-GLASS-ADDITIONAL-CONFIRM',productId:PRODUCT_ID,evaluation:'MANUAL_CHECK',action:'REVIEW',targetField:'glass_additional',when:{glass_additional:{$in:['SAFE','DISASTER_SAFE']}},message:'安全合わせ／防災安全合わせは窓種・サイズ別可否があります。YKK AP見積システムで最終確認してください。',priority:41,status:'ACTIVE',evidenceIds:EVIDENCE}
];

export const APW430_MODULE={
  ...baseModule,
  specificationDefinitions:[...baseModule.specificationDefinitions,...glassDefinitions],
  allowedValues:[...baseModule.allowedValues,...glassValues],
  requiredFieldRules,dependencies,
  product:{...baseModule.product,notices:[...(baseModule.product.notices??[]),'APW 430のガラスは正式Master 08/08D/08Eを営業UIへ接続。フロストは正式ガラス種Masterに設定がないため候補化しません。']},
  stats:{...baseModule.stats,salesGlassPresentation:'R1_COMMON_FLOW'}
};
