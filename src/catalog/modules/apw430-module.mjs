import{APW430_SOURCE as source}from'./apw430-source.mjs';
import{APW430_RUNTIME_FORMAL_DIMENSION_DELTA_V10 as dimensionDelta}from'./apw430-runtime-formal-dimension-delta-v10.mjs';

const PRODUCT_ID='SER-YKK-APW430';
const evidenceIds=['EV-APW430-MASTER'];
const definition=(key,label,order,selector={},extra={})=>({id:`${PRODUCT_ID}:def:${key}`,productId:PRODUCT_ID,key,displayLabel:label,dataType:'ENUM',displayOrder:order,status:'ACTIVE',sourceRole:'SIZE',selector,evidenceIds,...extra});
const numberDefinition=(key,label,order,selector={})=>({...definition(key,label,order,selector),dataType:'NUMBER'});
const allowed=(key,value,label,order,selector={},metadata={})=>({id:`${PRODUCT_ID}:value:${key}:${order}`,productId:PRODUCT_ID,specificationKey:key,value,displayLabel:label,displayOrder:order,status:'ACTIVE',selector,evidenceIds,metadata});
const unique=(rows,key)=>[...new Map(rows.map((row)=>[key(row),row])).values()];

const windowValues=source.windows.map((row,index)=>allowed('window_type',row.id,row.label,index+1,{},row));
const specWindows=new Set();
const specificationValues=[];
for(const row of source.specifications){
  for(const window of source.windows.filter((item)=>item.commonWindowId===row.windowCommonId)){
    specWindows.add(window.id);
    specificationValues.push(allowed('specific_spec',row.id,row.label,specificationValues.length+1,{window_type:window.id},{type:row.type,source:row.source,note:row.note}));
  }
}
const configuredWindows=[...new Set(source.sizes.filter((row)=>row.configuration).map((row)=>row.windowId))];
const configurationValues=unique(source.sizes.filter((row)=>row.configuration),(row)=>`${row.windowId}|${row.configuration}`).map((row,index)=>allowed('configuration',row.configuration,row.configuration,index+1,{window_type:row.windowId}));
const constructionValues=unique(source.sizes,(row)=>`${row.windowId}|${row.configuration??''}|${row.construction}`).map((row,index)=>allowed('construction',row.construction,row.construction,index+1,{window_type:row.windowId,...(row.configuration?{configuration:row.configuration}:{})}));
const handingWindows=[...new Set(source.sizes.filter((row)=>row.handingRequired).map((row)=>row.windowId))];
const handingSelector={window_type:{$in:handingWindows},configuration:'マド・左右勝手あり'};
const handingValues=[allowed('handing','L','L（左吊元）',1,handingSelector),allowed('handing','R','R（右吊元）',2,handingSelector)];
const sizeModeValues=[allowed('size_mode','STANDARD','規格サイズ',1),allowed('size_mode','CUSTOM','特注寸法',2,{}, {sourceSheet:'06C_特注寸法範囲'})];

const standardSizeRecords=source.sizes.map((row,index)=>{
  const selector={size_mode:'STANDARD',window_type:row.windowId,construction:row.construction};
  if(row.configuration)selector.configuration=row.configuration;
  if(row.handingRequired)selector.handing={$in:row.handingCandidates};
  if(row.applicableSpecificationIds.length)selector.specific_spec={$in:row.applicableSpecificationIds};
  return{
    id:row.id,productId:PRODUCT_ID,windowTypeId:row.windowId,specificationIds:row.applicableSpecificationIds,
    construction:row.construction,configuration:row.configuration,nominalW:row.nominalW,nominalH:row.nominalH,
    actualW:row.actualW,actualH:row.actualH,sizeCode:row.sizeCode,selectable:true,status:'ACTIVE',selector,
    displayLabel:`${row.sizeCode} ｜ ${row.actualW}×${row.actualH}mm`,displayOrder:index+1,evidenceIds,
    metadata:{sourceFile:source.master.title,sourceSheet:'06_サイズ',sourceRow:row.sourceRow,sourceNote:row.sourceNote,handingRequired:row.handingRequired}
  };
});

const dimensionRules=dimensionDelta.rules.map((row)=>({...row,productId:PRODUCT_ID,evidenceIds:['EV-APW430-CUSTOM']}));
if(dimensionRules.length!==25)throw new Error('APW430 formal CUSTOM dimension rule inventory drift');
if(dimensionRules.filter((row)=>row.automatic).length!==0)throw new Error('APW430 CUSTOM rules must not final-auto-pass at v1.0');
if(dimensionRules.filter((row)=>row.type==='COMPOUND_GATE').length!==20||dimensionRules.filter((row)=>row.type==='SOURCE_GRAPH_GATE').length!==5)throw new Error('APW430 CUSTOM exact/review classification drift');

const definitions=[
  definition('window_type','窓種',10),
  definition('specific_spec','窓種固有仕様',20,{window_type:{$in:[...specWindows]}}),
  definition('configuration','構成・区分',30,{window_type:{$in:configuredWindows}},{autoSelectSingle:true}),
  definition('handing','開き勝手（吊元）',35,handingSelector),
  definition('construction','工法・枠区分',40,{}, {autoSelectSingle:true}),
  definition('size_mode','サイズ方式',50),
  definition('size','規格サイズ',60,{size_mode:'STANDARD'}),
  numberDefinition('custom_width','特注W（mm）',60,{size_mode:'CUSTOM'}),
  numberDefinition('custom_height','特注H（mm）',70,{size_mode:'CUSTOM'})
];
const requiredFieldRules=definitions.map((row)=>({id:`${PRODUCT_ID}:required:${row.key}`,productId:PRODUCT_ID,specificationKey:row.key,required:true,selector:row.selector??{},priority:row.displayOrder,evidenceIds:row.key.startsWith('custom_')?['EV-APW430-CUSTOM']:evidenceIds}));

export const APW430_MODULE={
  product:{id:PRODUCT_ID,manufacturer:'YKK AP',displayName:'APW 430',category:'サッシ',status:'ACTIVE',recoveryStatus:'CANONICAL_MASTER_CONNECTED',sizeFormalPass:true,source:source.master,sourceInventory:{...source.sourceInventory,dimensionRules:25,dimensionAuto:0,dimensionReview:25},notices:['CUSTOMは正式Master 06C_特注寸法範囲に接続済みです。W/Hだけでは最終AUTO PASSせず、ガラス重量・耐風圧・複合条件・原本グラフはREVIEW_REQUIREDです。']},
  specificationDefinitions:definitions,
  allowedValues:[...windowValues,...specificationValues,...configurationValues,...constructionValues,...handingValues,...sizeModeValues],
  standardSizeRecords,requiredFieldRules,
  ruleSets:[
    {id:`${PRODUCT_ID}:size-master`,productId:PRODUCT_ID,type:'STANDARD_SIZE_MASTER',status:'ACTIVE',selector:{},payload:{sourceSheet:'06_サイズ',canonicalRows:718},evidenceIds},
    {id:`${PRODUCT_ID}:dimension-rules`,productId:PRODUCT_ID,type:'DIMENSION_RULES',status:'ACTIVE',selector:{},payload:dimensionRules,evidenceIds:['EV-APW430-CUSTOM']}
  ],
  dependencies:[],
  evidence:[
    {id:'EV-APW430-MASTER',productId:PRODUCT_ID,sourceType:'PRODUCT_MASTER',sourceId:source.master.id,title:source.master.title,version:source.master.version,sourceFolder:source.master.folder,sourceSheet:'06_サイズ',status:'VERIFIED_SOURCE'},
    {id:'EV-APW430-CUSTOM',productId:PRODUCT_ID,sourceType:'MASTER_SHEET',sourceId:dimensionDelta.formalMaster.driveFileId,title:'APW430 特注寸法範囲',sourceSheet:'06C_特注寸法範囲',status:'VERIFIED_SOURCE',proposalId:dimensionDelta.proposalId,proposalFingerprint:dimensionDelta.proposalFingerprint,semanticFingerprint:dimensionDelta.formalSemanticFingerprint,driveRevisionId:dimensionDelta.formalMaster.driveRevisionId}
  ],
  goldenTests:source.goldenTests,
  stats:{...source.sourceInventory,handingRows:source.sizes.filter((row)=>row.handingRequired).length,dimensionRules:25,dimensionAuto:0,dimensionReview:25},
  runtimeRegeneration:{version:'v1.0',formalMaster:dimensionDelta.formalMaster,dimensionRuleAdds:25,proposalId:dimensionDelta.proposalId,proposalFingerprint:dimensionDelta.proposalFingerprint}
};

export{PRODUCT_ID as APW430_PRODUCT_ID,dimensionRules as APW430_DIMENSION_RULES};
