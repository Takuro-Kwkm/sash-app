import { THERMOSL_SOURCE as source } from './thermosl-source.mjs';
import { THERMOSL_MODULE as baseModule } from './thermosl-module.mjs';

const PRODUCT_ID='SER-LIX-SAMOSL';
const GLASS_KEYS=new Set(['glass_detail','glass_spacer','glass_air_layer','glass_type','glass_function']);
const MOVED_GATE_IDS=new Set([
  'GL-SL-FUNC-GREEN','GL-SL-FUNC-GREEN-HS','GL-SL-FUNC-HISOLAR',
  'GL-SL-OPT-PATTERN','GL-SL-OPT-FROST'
]);
const MANUAL_PERFORMANCE=new Set(['LOWE_GREEN','LOWE_GREEN_HS','LOWE_CLEAR_HISOLAR']);

const specific=(spec)=>spec&&spec!=='*'?{specific_spec:spec}:{};
const makeValue=(key,raw,label,order,{idSuffix,selector={},manualCheck=false,metadata={}}={})=>({
  id:`${PRODUCT_ID}:${key}:${raw}:${idSuffix??order}`,
  productId:PRODUCT_ID,specificationKey:key,value:raw,displayLabel:label,displayOrder:order,
  status:manualCheck?'MANUAL_CHECK':'ACTIVE',selector,evidenceIds:['EV-SL-GLASS'],
  metadata:{...metadata,manualCheck}
});
const sourceMeta=(sheet,row,extra={})=>({sourceFile:source.master.title,sourceSheet:sheet,sourceRow:row,...extra});
const scopeFor=(row)=>({window_type:row.window,...specific(row.spec)});
const hasLowe=(row)=>row.loweClear||row.lowePattern;
const hasPair=(row)=>row.pairClear||row.pairPattern;

// Sales UI keeps glass performance at a business-level category. Exact 3/4mm + A/Ar thickness builds remain in the formal Master,
// but are no longer exposed as a required manual choice.
const glassDetailValues=[];
for(const row of source.glassControls){
  const scope=scopeFor(row);
  if(hasLowe(row)){
    const options=[
      ['LOWE_STANDARD','Low-E 標準',1,null],
      ['LOWE_GREEN','遮熱（Low-E グリーン）',2,'GL-SL-FUNC-GREEN'],
      ['LOWE_GREEN_HS','高遮熱（Low-E グリーン）',3,'GL-SL-FUNC-GREEN-HS'],
      ['LOWE_CLEAR_HISOLAR','高日射取得（Low-E クリア）',4,'GL-SL-FUNC-HISOLAR']
    ];
    for(const[raw,label,order,gateId]of options)glassDetailValues.push(makeValue('glass_detail',raw,label,order,{
      idSuffix:`${row.id}-${raw}`,selector:{...scope,glass_base:'LOWE'},manualCheck:Boolean(gateId),
      metadata:sourceMeta(gateId?'08E_機能ガラス確認ゲート':'08_ガラス',gateId?source.glassGates.find((gate)=>gate.glassId===gateId)?.sourceRow:null,{
        presentationLevel:'SALES_CATEGORY',formalGateId:gateId,confirmationStatus:gateId?'CONFIRM_REQUIRED':'AUTO'
      })
    }));
  }
  if(hasPair(row))glassDetailValues.push(makeValue('glass_detail','PAIR_STANDARD','一般複層ガラス',1,{
    idSuffix:`${row.id}-PAIR_STANDARD`,selector:{...scope,glass_base:'PAIR'},
    metadata:sourceMeta('08_ガラス',null,{presentationLevel:'SALES_CATEGORY',confirmationStatus:'AUTO'})
  }));
}

const physicalRows=source.glass.filter((row)=>/^GL-SL-00[1-9]$/.test(row.id));
const spacers=(row)=>[
  ...(String(row.spacer).includes('アルミ')?[['ALUMINUM','アルミスペーサー']]:[]),
  ...(String(row.spacer).includes('樹脂')?[['RESIN','樹脂スペーサー']]:[])
];
const airLayers=(row)=>[
  ...(String(row.gas).includes('乾燥空気')?[['DRY_AIR','乾燥空気']]:[]),
  ...(String(row.gas).includes('アルゴン')?[['ARGON','アルゴンガス']]:[])
];
const baseKey=(row)=>row.base==='Low-E複層ガラス'?'LOWE':'PAIR';
const glassSpacerValues=[];
const spacerSeen=new Set();
const glassAirLayerValues=[];
const airSeen=new Set();
for(const row of physicalRows){
  const base=baseKey(row);
  for(const[spacer,label]of spacers(row)){
    const skey=`${base}|${spacer}`;
    if(!spacerSeen.has(skey)){
      spacerSeen.add(skey);
      glassSpacerValues.push(makeValue('glass_spacer',spacer,label,spacer==='RESIN'?1:2,{
        idSuffix:`${base}-${spacer}`,selector:{glass_base:base},
        metadata:sourceMeta('08_ガラス',row.sourceRow,{presentationLevel:'SALES_CATEGORY',formalGlassIds:physicalRows.filter((candidate)=>baseKey(candidate)===base&&spacers(candidate).some(([value])=>value===spacer)).map((candidate)=>candidate.id)})
      }));
    }
    for(const[air,labelAir]of airLayers(row)){
      if(spacer==='RESIN'&&air!=='ARGON')continue;
      const akey=`${base}|${spacer}|${air}`;
      if(airSeen.has(akey))continue;
      airSeen.add(akey);
      glassAirLayerValues.push(makeValue('glass_air_layer',air,labelAir,air==='ARGON'?1:2,{
        idSuffix:`${base}-${spacer}-${air}`,selector:{glass_base:base,glass_spacer:spacer},
        metadata:sourceMeta('08_ガラス',row.sourceRow,{presentationLevel:'SALES_CATEGORY'})
      }));
    }
  }
}

const glassTypeValues=[];
for(const row of source.glassControls){
  const scope=scopeFor(row);
  const add=(base,raw,label,order,{manualCheck=false,sourceGlassId=null}={})=>glassTypeValues.push(makeValue('glass_type',raw,label,order,{
    idSuffix:`${row.id}-${base}-${raw}`,selector:{...scope,glass_base:base},manualCheck,
    metadata:sourceMeta(sourceGlassId?'08E_機能ガラス確認ゲート':'08B_ガラス窓種制御',sourceGlassId?source.glassGates.find((gate)=>gate.glassId===sourceGlassId)?.sourceRow:row.sourceRow,{
      presentationLevel:'APPEARANCE',formalGlassId:sourceGlassId,confirmationStatus:manualCheck?'CONFIRM_REQUIRED':'AUTO'
    })
  }));
  if(row.loweClear)add('LOWE','CLEAR','透明',1);
  if(row.lowePattern)add('LOWE','PATTERN','型板',2);
  if(hasLowe(row))add('LOWE','FROST','フロスト',3,{manualCheck:true,sourceGlassId:'GL-SL-OPT-FROST'});
  if(row.pairClear)add('PAIR','CLEAR','透明',1);
  if(row.pairPattern)add('PAIR','PATTERN','型板',2);
  if(hasPair(row))add('PAIR','FROST','フロスト',3,{manualCheck:true,sourceGlassId:'GL-SL-OPT-FROST'});
}

// Pattern/Frost are now represented once in glass_type. Low-E performance choices moved to glass_detail.
const glassFunctionValues=baseModule.allowedValues.filter((row)=>
  row.specificationKey==='glass_function'&&!MOVED_GATE_IDS.has(row.value)
).map((row)=>({...row,displayLabel:row.value==='NONE'?'なし':row.displayLabel}));

const definitions=baseModule.specificationDefinitions.map((row)=>{
  if(row.key==='glass_detail')return{...row,displayLabel:'ガラス性能',autoSelectSingle:true};
  if(row.key==='glass_type')return{...row,displayLabel:'ガラス種類'};
  if(row.key==='glass_function')return{...row,displayLabel:'付加機能'};
  return row;
});
const allowedValues=[
  ...baseModule.allowedValues.filter((row)=>!GLASS_KEYS.has(row.specificationKey)),
  ...glassDetailValues,...glassSpacerValues,...glassAirLayerValues,...glassTypeValues,...glassFunctionValues
];
const dependencies=[
  ...baseModule.dependencies,
  {id:'DEP-SL-GLASS-PERFORMANCE-CONFIRM',productId:PRODUCT_ID,evaluation:'MANUAL_CHECK',action:'REVIEW',
    targetField:'glass_detail',when:{glass_detail:{$in:[...MANUAL_PERFORMANCE]}},
    message:'選択したLow-E性能区分はCONFIRM_REQUIREDです。LIXIL見積システムで最終組合せを確認してください。',
    priority:31,status:'ACTIVE',evidenceIds:['EV-SL-GLASS']},
  {id:'DEP-SL-GLASS-FROST-CONFIRM',productId:PRODUCT_ID,evaluation:'MANUAL_CHECK',action:'REVIEW',
    targetField:'glass_type',when:{glass_type:'FROST'},
    message:'フロストは窓種・サイズにより不可があります。CONFIRM_REQUIREDとしてLIXIL見積システムで最終確認してください。',
    priority:32,status:'ACTIVE',evidenceIds:['EV-SL-GLASS']}
];

export const THERMOSL_MODULE={
  ...baseModule,
  specificationDefinitions:definitions,
  allowedValues,
  dependencies,
  product:{...baseModule.product,notices:[...(baseModule.product.notices??[]),'ガラスの厚み・中空層寸法などの物理構成は営業UIで直接選択せず、正式Masterの内部情報として保持します。']},
  stats:{...baseModule.stats,salesGlassPresentation:'R3_BROAD_CATEGORY_WITH_FROST'}
};
