import{APW431_SOURCE as source}from'./apw431-source.mjs';

const PRODUCT_ID='SER-YKK-APW431';
const evidenceIds=['EV-APW431-MASTER'];
const definition=(key,label,order,selector={},dataType='ENUM',extra={})=>({id:`${PRODUCT_ID}:def:${key}`,productId:PRODUCT_ID,key,displayLabel:label,dataType,displayOrder:order,status:'ACTIVE',sourceRole:key==='size'?'SIZE':'SPECIFICATIONS',selector,evidenceIds,...extra});
const allowed=(key,value,label,order,selector={},metadata={})=>({id:`${PRODUCT_ID}:value:${key}:${order}`,productId:PRODUCT_ID,specificationKey:key,value,displayLabel:label,displayOrder:order,status:'ACTIVE',selector,evidenceIds,metadata});
const unique=(rows,key)=>[...new Map(rows.map((row)=>[key(row),row])).values()];
const effectiveShutter=(row)=>row.shutterTypeId&&row.shutterTypeId!=="ST-NONE"?row.shutterTypeId:null;
const upstream=(row,through)=>{
  const selector={window_type:row.windowId};
  const fields=[['region',row.region],['configuration',row.configuration],['variant',row.variant],['shutter_type',effectiveShutter(row)],['construction',row.construction],['frame_type',row.frameType],['floor_type',row.floorType]];
  for(const[key,value]of fields){if(key===through)break;if(value)selector[key]=value;}
  return selector;
};

const windowValues=source.windows.map((row,index)=>allowed('window_type',row.id,row.label,index+1,{},row));
const regionValues=unique(source.sizes,(row)=>`${row.windowId}|${row.region}`).map((row,index)=>allowed('region',row.region,row.region,index+1,{window_type:row.windowId}));
const configurationValues=unique(source.sizes,(row)=>`${row.windowId}|${row.region}|${row.configuration}`).map((row,index)=>allowed('configuration',row.configuration,row.configuration,index+1,upstream(row,'configuration')));
const variantValues=unique(source.sizes,(row)=>`${row.windowId}|${row.region}|${row.configuration}|${row.variant}`).map((row,index)=>allowed('variant',row.variant,row.variant,index+1,upstream(row,'variant')));
const shutterValues=unique(source.sizes.filter((row)=>effectiveShutter(row)),(row)=>effectiveShutter(row)).map((row,index)=>allowed('shutter_type',effectiveShutter(row),row.shutterLabel,index+1,{window_type:row.windowId},{jemaOptions:row.jemaOptions}));
const constructionValues=unique(source.sizes,(row)=>`${JSON.stringify(upstream(row,'construction'))}|${row.construction}`).map((row,index)=>allowed('construction',row.construction,row.construction,index+1,upstream(row,'construction')));
const frameValues=unique(source.sizes,(row)=>`${JSON.stringify(upstream(row,'frame_type'))}|${row.frameType}`).map((row,index)=>allowed('frame_type',row.frameType,row.frameType,index+1,upstream(row,'frame_type')));
const floorValues=unique(source.sizes,(row)=>`${JSON.stringify(upstream(row,'floor_type'))}|${row.floorType}`).map((row,index)=>allowed('floor_type',row.floorType,row.floorType,index+1,upstream(row,'floor_type')));
const sizeModeValues=[allowed('size_mode','STANDARD','規格サイズ',1),allowed('size_mode','CUSTOM','特注寸法',2)];
const sizeVariantsByWindow=new Map(source.windows.map((window)=>[window.id,new Set(source.sizes.filter((row)=>row.windowId===window.id).map((row)=>row.variant))]));
const customVariantWindows=new Set(source.windows.filter((window)=>source.rules.some((rule)=>rule.windowId===window.id&&!sizeVariantsByWindow.get(window.id)?.has(rule.variant))).map((window)=>window.id));
const customVariantValues=unique(source.rules.filter((row)=>customVariantWindows.has(row.windowId)),(row)=>`${row.windowId}|${row.variant}`).map((row,index)=>allowed('custom_variant',row.variant,row.variant,index+1,{size_mode:'CUSTOM',window_type:row.windowId}));

const standardSizeRecords=source.sizes.map((row)=>({
  id:row.id,baseSizeId:row.baseSizeId,productId:PRODUCT_ID,windowTypeId:row.windowId,
  construction:row.construction,frameType:row.frameType,configuration:row.configuration,
  nominalW:row.nominalW,nominalH:row.nominalH,actualW:row.actualW,actualH:row.actualH,sizeCode:row.sizeCode,
  selectable:true,status:'ACTIVE',selector:{...upstream(row,'floor_type'),floor_type:row.floorType,size_mode:'STANDARD'},
  displayLabel:`${row.sizeCode} ｜ ${row.actualW}×${row.actualH}mm`,displayOrder:row.displayOrder,evidenceIds,
  metadata:{sourceFile:source.master.title,sourceSheet:'26_統合候補マスター',sourceSizeId:row.baseSizeId,candidateKey:row.candidateKey,sourcePage:row.sourcePage,sourceUrl:row.sourceUrl,shutterTypeId:row.shutterTypeId,screenForm:row.screenForm,glassRuleId:row.glassRuleId}
}));

const dimensionType=(row)=>{
  if(row.judgeCode.startsWith('SHUTTER')||row.judgeCode.startsWith('LARGE'))return'SOURCE_GRAPH_GATE';
  if(['DOOR_2','DOOR_3'].includes(row.judgeCode))return'COMPOUND_GATE';
  if(row.ratio!==null)return'AUTO_RATIO';
  return'AUTO_RECT';
};
const dimensionRules=source.rules.map((row)=>({
  id:row.id,productId:PRODUCT_ID,type:dimensionType(row),automatic:['AUTO_RECT','AUTO_RATIO'].includes(dimensionType(row)),
  selector:{size_mode:'CUSTOM',window_type:row.windowId,region:row.region,construction:row.construction,configuration:row.configuration,
    ...(customVariantWindows.has(row.windowId)?{custom_variant:row.variant}:(sizeVariantsByWindow.get(row.windowId)?.has(row.variant)?{variant:row.variant}:{}))},
  bounds:{minW:row.minW,maxW:row.maxW,minH:row.minH,maxH:row.maxH},
  ...(row.ratio!==null?{ratio:row.ratio,intercept:row.intercept??0}:{}),
  formula:row.formula,specialCondition:row.specialCondition,sourcePage:row.sourcePage,sourceUrl:row.sourceUrl,note:row.note,evidenceIds
}));

const definitions=[
  definition('window_type','窓種',10),definition('region','地域規格',20,{},'ENUM',{autoSelectSingle:true}),
  definition('configuration','建数・構成',30,{},'ENUM',{autoSelectSingle:true}),definition('variant','タイプ・仕様',35,{},'ENUM',{autoSelectSingle:true}),
  definition('shutter_type','シャッター種類',40,{window_type:'W431-002'}),definition('construction','工法',50,{},'ENUM',{autoSelectSingle:true}),
  definition('frame_type','枠仕様',55,{},'ENUM',{autoSelectSingle:true}),definition('floor_type','床仕様',60,{},'ENUM',{autoSelectSingle:true}),
  definition('size_mode','サイズ方式',70),definition('size','規格サイズ',80,{size_mode:'STANDARD'}),
  definition('custom_variant','オーダー仕様',75,{size_mode:'CUSTOM',window_type:{$in:[...customVariantWindows]}},'ENUM',{autoSelectSingle:true}),
  definition('custom_width','特注W（mm）',80,{size_mode:'CUSTOM'},'NUMBER'),definition('custom_height','特注H（mm）',90,{size_mode:'CUSTOM'},'NUMBER')
];
const requiredFieldRules=definitions.map((row)=>({id:`${PRODUCT_ID}:required:${row.key}`,productId:PRODUCT_ID,specificationKey:row.key,required:true,selector:row.selector??{},priority:row.displayOrder,evidenceIds}));

export const APW431_MODULE={
  product:{id:PRODUCT_ID,manufacturer:'YKK AP',displayName:'APW 431',category:'サッシ',status:'ACTIVE',recoveryStatus:'SIZE_MASTER_FORMAL',sizeFormalPass:true,source:source.master,sourceInventory:source.sourceInventory},
  specificationDefinitions:definitions,
  allowedValues:[...windowValues,...regionValues,...configurationValues,...variantValues,...shutterValues,...constructionValues,...frameValues,...floorValues,...sizeModeValues,...customVariantValues],
  standardSizeRecords,requiredFieldRules,
  ruleSets:[
    {id:`${PRODUCT_ID}:size-master`,productId:PRODUCT_ID,type:'STANDARD_SIZE_MASTER',status:'ACTIVE',selector:{},payload:{sourceSheet:'26_統合候補マスター',baseRows:332,selectableRows:538},evidenceIds},
    {id:`${PRODUCT_ID}:dimension-rules`,productId:PRODUCT_ID,type:'DIMENSION_RULES',status:'ACTIVE',selector:{},payload:dimensionRules,evidenceIds}
  ],dependencies:[],
  evidence:[{id:'EV-APW431-MASTER',productId:PRODUCT_ID,sourceType:'PRODUCT_MASTER',sourceId:source.master.id,title:source.master.title,version:source.master.version,sourceFolder:source.master.folder,sourceSheet:'05_規格サイズ / 26_統合候補マスター / 27_自由寸法Lookup',status:'VERIFIED_SOURCE'}],
  goldenTests:source.goldenTests,stats:source.sourceInventory
};

export{PRODUCT_ID as APW431_PRODUCT_ID,dimensionRules as APW431_DIMENSION_RULES};
