import{APW431_MODULE as baseModule}from'./apw431-module.mjs';

const PRODUCT_ID='SER-YKK-APW431';
const EVIDENCE=['EV-APW431-MASTER'];
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
  value('glass_base','LOWE','Low-E（トリプルガラス）',1,{metadata:{sourceSheet:'11_ガラス',formalGlassClass:'トリプルガラス／ダブルLow-E'}}),
  value('glass_type','CLEAR','透明',1,{metadata:{sourceSheet:'12_ガラス詳細',formalId:'GD431-001'}}),
  value('glass_type','PATTERN','型',2,{manualCheck:true,metadata:{sourceSheet:'12_ガラス詳細',formalId:'GD431-002',confirmationStatus:'CONFIRM_REQUIRED'}}),
  value('glass_type','FROST','すり（フロスト）',3,{manualCheck:true,metadata:{sourceSheet:'12_ガラス詳細',formalId:'GD431-003',confirmationStatus:'CONFIRM_REQUIRED'}}),
  value('glass_detail','CLEAR_GAIN','クリア（日射取得型）',1,{selector:{glass_base:'LOWE'},metadata:{sourceSheet:'11_ガラス',formalId:'GL431-001'}}),
  value('glass_detail','BLUE_SHIELD','ブルー（日射遮蔽型）',2,{selector:{glass_base:'LOWE'},metadata:{sourceSheet:'11_ガラス',formalId:'GL431-002'}}),
  value('glass_detail','BRONZE_SHIELD','ブロンズ（日射遮蔽型）',3,{selector:{glass_base:'LOWE'},metadata:{sourceSheet:'11_ガラス',formalId:'GL431-003'}}),
  value('glass_detail','NEUTRAL_SHIELD','ニュートラル（日射遮蔽型）',4,{selector:{glass_base:'LOWE'},metadata:{sourceSheet:'11_ガラス',formalId:'GL431-004'}}),
  value('glass_additional','NONE','なし',1,{metadata:{sourceSheet:'12_ガラス詳細'}}),
  value('glass_additional','SAFE','安全合わせ',2,{manualCheck:true,metadata:{sourceSheet:'12_ガラス詳細',formalId:'GD431-006',confirmationStatus:'CONFIRM_REQUIRED'}}),
  value('glass_additional','DISASTER_SAFE','防災安全合わせ',3,{manualCheck:true,metadata:{sourceSheet:'12_ガラス詳細',formalId:'GD431-007',confirmationStatus:'CONFIRM_REQUIRED'}}),
  value('glass_spacer','RESIN','樹脂スペーサー',1,{metadata:{sourceSheet:'12_ガラス詳細',formalId:'GD431-005'}}),
  value('glass_air_layer','ARGON','アルゴンガス',1,{metadata:{sourceSheet:'12_ガラス詳細',formalId:'GD431-004'}})
];
const requiredFieldRules=[
  ...baseModule.requiredFieldRules,
  ...glassDefinitions.map((row)=>({id:`${PRODUCT_ID}:required:${row.key}`,productId:PRODUCT_ID,specificationKey:row.key,required:true,selector:{},priority:row.displayOrder,evidenceIds:EVIDENCE}))
];
const dependencies=[
  ...baseModule.dependencies,
  {id:'DEP-APW431-GLASS-TYPE-CONFIRM',productId:PRODUCT_ID,evaluation:'MANUAL_CHECK',action:'REVIEW',targetField:'glass_type',when:{glass_type:{$in:['PATTERN','FROST']}},message:'型／すりガラスは窓種・サイズ別可否があります。YKK AP見積システムで最終確認してください。',priority:40,status:'ACTIVE',evidenceIds:EVIDENCE},
  {id:'DEP-APW431-GLASS-ADDITIONAL-CONFIRM',productId:PRODUCT_ID,evaluation:'MANUAL_CHECK',action:'REVIEW',targetField:'glass_additional',when:{glass_additional:{$in:['SAFE','DISASTER_SAFE']}},message:'安全合わせ／防災安全合わせはサイズ別ガラス可否記号に従うため、YKK AP見積システムで最終確認してください。',priority:41,status:'ACTIVE',evidenceIds:EVIDENCE}
];

export const APW431_MODULE={
  ...baseModule,
  specificationDefinitions:[...baseModule.specificationDefinitions,...glassDefinitions],
  allowedValues:[...baseModule.allowedValues,...glassValues],
  requiredFieldRules,dependencies,
  product:{...baseModule.product,notices:[...(baseModule.product.notices??[]),'APW 431の正式ガラスMaster 11/12を共通営業フローへ接続。YKK APの「すり」は共通UI上でフロスト相当として扱います。']},
  stats:{...baseModule.stats,salesGlassPresentation:'R1_COMMON_FLOW'}
};
