import{APW430_SOURCE as source}from'./apw430-source.mjs';

const PRODUCT_ID='SER-YKK-APW430';
const evidenceIds=['EV-APW430-MASTER'];
const definition=(key,label,order,selector={},extra={})=>({id:`${PRODUCT_ID}:def:${key}`,productId:PRODUCT_ID,key,displayLabel:label,dataType:'ENUM',displayOrder:order,status:'ACTIVE',sourceRole:'SIZE',selector,evidenceIds,...extra});
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
const sizeModeValues=[allowed('size_mode','STANDARD','規格サイズ',1)];

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

const definitions=[
  definition('window_type','窓種',10),
  definition('specific_spec','窓種固有仕様',20,{window_type:{$in:[...specWindows]}}),
  definition('configuration','構成・区分',30,{window_type:{$in:configuredWindows}},{autoSelectSingle:true}),
  definition('handing','開き勝手（吊元）',35,handingSelector),
  definition('construction','工法・枠区分',40,{}, {autoSelectSingle:true}),
  definition('size_mode','サイズ方式',50,{}, {autoSelectSingle:true}),
  definition('size','規格サイズ',60,{size_mode:'STANDARD'})
];
const requiredFieldRules=definitions.map((row)=>({id:`${PRODUCT_ID}:required:${row.key}`,productId:PRODUCT_ID,specificationKey:row.key,required:true,selector:row.selector??{},priority:row.displayOrder,evidenceIds}));

export const APW430_MODULE={
  product:{id:PRODUCT_ID,manufacturer:'YKK AP',displayName:'APW 430',category:'サッシ',status:'ACTIVE',recoveryStatus:'SIZE_MASTER_FORMAL',sizeFormalPass:true,source:source.master,sourceInventory:source.sourceInventory},
  specificationDefinitions:definitions,
  allowedValues:[...windowValues,...specificationValues,...configurationValues,...constructionValues,...handingValues,...sizeModeValues],
  standardSizeRecords,requiredFieldRules,
  ruleSets:[{id:`${PRODUCT_ID}:size-master`,productId:PRODUCT_ID,type:'STANDARD_SIZE_MASTER',status:'ACTIVE',selector:{},payload:{sourceSheet:'06_サイズ',canonicalRows:718},evidenceIds}],
  dependencies:[],
  evidence:[{id:'EV-APW430-MASTER',productId:PRODUCT_ID,sourceType:'PRODUCT_MASTER',sourceId:source.master.id,title:source.master.title,version:source.master.version,sourceFolder:source.master.folder,sourceSheet:'06_サイズ',status:'VERIFIED_SOURCE'}],
  goldenTests:source.goldenTests,stats:{...source.sourceInventory,handingRows:source.sizes.filter((row)=>row.handingRequired).length}
};

export{PRODUCT_ID as APW430_PRODUCT_ID};
