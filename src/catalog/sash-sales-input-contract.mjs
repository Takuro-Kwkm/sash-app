export const SASH_SALES_INPUT_CONTRACT_VERSION='1.0';

export const SASH_INTERNAL_INPUT_KEYS=Object.freeze(['construction']);

export const SASH_GLASS_FIELD_SEQUENCE=Object.freeze([
  {key:'glass_base',label:'ガラス',order:120},
  {key:'glass_type',label:'ガラス種',order:130},
  {key:'glass_detail',label:'ガラス詳細',order:140},
  {key:'glass_function',label:'ガラス追加機能',order:150},
  {key:'glass_additional',label:'ガラス追加機能',order:150},
  {key:'glass_spacer',label:'スペーサー',order:160},
  {key:'glass_air_layer',label:'中空層',order:170},
  {key:'glass_gas',label:'中空層',order:170}
]);

const GLASS_META=new Map(SASH_GLASS_FIELD_SEQUENCE.map((row)=>[row.key,row]));
const GLASS_KEYS=new Set(GLASS_META.keys());

function normalizeDefinition(row){
  const glass=GLASS_META.get(row.key);
  if(glass)return{...row,displayLabel:glass.label,displayOrder:glass.order};
  if(SASH_INTERNAL_INPUT_KEYS.includes(row.key))return{...row,presentationHidden:true};
  // Keep the six glass inputs contiguous. Existing later fields move behind the glass block.
  if(Number(row.displayOrder)>=120)return{...row,displayOrder:Number(row.displayOrder)+100};
  return row;
}

export function applySashSalesInputContract(module){
  if(module?.product?.category!=='サッシ')return module;
  const definitions=(module.specificationDefinitions??[]).map(normalizeDefinition);
  const product={
    ...module.product,
    salesInputContractVersion:SASH_SALES_INPUT_CONTRACT_VERSION,
    salesInputPolicy:{
      ...(module.product.salesInputPolicy??{}),
      glassFlow:['glass_base','glass_type','glass_detail','glass_additional_or_function','glass_spacer','glass_air_layer_or_gas'],
      hiddenTechnicalInputs:[...SASH_INTERNAL_INPUT_KEYS],
      sizeModePolicy:'SHOW_STANDARD_AND_CUSTOM_WHEN_FORMAL_SOURCE_CAPABILITY_EXISTS'
    }
  };
  return{...module,product,specificationDefinitions:definitions};
}

export function isGlassFieldKey(key){return GLASS_KEYS.has(key);}
