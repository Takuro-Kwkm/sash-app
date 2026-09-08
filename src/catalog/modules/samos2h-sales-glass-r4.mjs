import{SAMOS2H_MODULE as baseModule}from'./samos2h-module.mjs';
import{SAMOS2H_SOURCE as source}from'./samos2h-source.mjs';

const PRODUCT_ID='SER-LIX-SAMOS2H';
const EVIDENCE=['EV-S2H-006'];
const REPLACED_KEYS=new Set(['glass_detail','glass_spacer','glass_gas','glass_type']);
const makeValue=(key,value,displayLabel,displayOrder,{selector={},manualCheck=false,metadata={}}={})=>({
  id:`${PRODUCT_ID}:sales-r4:${key}:${value}:${displayOrder}`,
  productId:PRODUCT_ID,specificationKey:key,value,displayLabel,displayOrder,
  status:manualCheck?'MANUAL_CHECK':'ACTIVE',selector,evidenceIds:EVIDENCE,
  metadata:{...metadata,...(manualCheck?{manualCheck:true}:{})}
});
const dedupe=(rows)=>[...new Map(rows.map((row)=>[`${row.specificationKey}|${row.value}|${JSON.stringify(row.selector??{})}`,row])).values()];
const baseRows=source.glass.filter((row)=>row['ガラス大分類']!=='追加機能'&&row['有効']!==false);

const glassDetail=[];
if(baseRows.some((row)=>row['ガラス大分類']==='Low-E複層ガラス')){
  const details=[
    ['クリア','LOWE_CLEAR','クリア',1],
    ['グリーン','LOWE_GREEN','グリーン',2],
    ['高日射取得','LOWE_CLEAR_HISOLAR','クリア（高日射取得）',3],
    ['高遮熱','LOWE_GREEN_HS','グリーン（高遮熱）',4]
  ];
  for(const[needle,value,label,order]of details){
    if(baseRows.some((row)=>row['ガラス大分類']==='Low-E複層ガラス'&&String(row['Low-E区分']??'').includes(needle)))
      glassDetail.push(makeValue('glass_detail',value,label,order,{selector:{glass_base:'LOWE'},metadata:{presentationLevel:'SALES_CATEGORY',formalRows:baseRows.filter((row)=>row['ガラス大分類']==='Low-E複層ガラス'&&String(row['Low-E区分']??'').includes(needle)).map((row)=>row.glass_id)}}));
  }
}
if(baseRows.some((row)=>row['ガラス大分類']==='一般複層ガラス'))glassDetail.push(makeValue('glass_detail','PAIR_STANDARD','標準',1,{selector:{glass_base:'PAIR'},metadata:{presentationLevel:'SALES_CATEGORY',formalRows:baseRows.filter((row)=>row['ガラス大分類']==='一般複層ガラス').map((row)=>row.glass_id)}}));

const glassType=[
  makeValue('glass_type','CLEAR','透明',1),
  makeValue('glass_type','PATTERN','型板',2,{selector:{patternAllowed:true}}),
  makeValue('glass_type','FROST','フロスト',3,{manualCheck:true,metadata:{formalGlassId:'GL-S2H-OPT-FROST',confirmationStatus:'CONFIRM_REQUIRED'}})
];

const glassSpacer=[];
if(baseRows.some((row)=>String(row['スペーサー']??'').includes('アルミ')))glassSpacer.push(makeValue('glass_spacer','ALUMINUM','アルミスペーサー',1));
if(baseRows.some((row)=>row['ガラス大分類']==='Low-E複層ガラス'&&String(row['スペーサー']??'').includes('樹脂')))glassSpacer.push(makeValue('glass_spacer','RESIN','樹脂スペーサー',2,{selector:{glass_base:'LOWE'}}));

const glassGas=[
  makeValue('glass_gas','DRY_AIR','乾燥空気',1,{selector:{glass_spacer:'ALUMINUM'}}),
  makeValue('glass_gas','ARGON','アルゴンガス',2,{selector:{glass_base:'LOWE',glass_spacer:{$in:['ALUMINUM','RESIN']}}})
];

const allowedValues=[
  ...baseModule.allowedValues.filter((row)=>!REPLACED_KEYS.has(row.specificationKey)),
  ...dedupe(glassType),...dedupe(glassDetail),...dedupe(glassSpacer),...dedupe(glassGas)
];
const dependencies=[
  ...baseModule.dependencies,
  {id:'DEP-S2H-GLASS-FROST-CONFIRM',productId:PRODUCT_ID,evaluation:'MANUAL_CHECK',action:'REVIEW',targetField:'glass_type',when:{glass_type:'FROST'},message:'フロストは窓種・サイズにより設定不可があります。LIXIL見積システムで最終確認してください。',priority:40,status:'ACTIVE',evidenceIds:EVIDENCE}
];

export const SAMOS2H_SALES_MODULE={
  ...baseModule,
  allowedValues,dependencies,
  product:{...baseModule.product,notices:[...(baseModule.product.notices??[]),'ガラス厚・中空層寸法などの物理構成は正式Master内部で保持し、営業UIでは大分類で選択します。']},
  stats:{...baseModule.stats,salesGlassPresentation:'R4_COMMON_FLOW'}
};
