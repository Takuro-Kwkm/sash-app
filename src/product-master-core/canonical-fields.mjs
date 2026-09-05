export const CANONICAL_FIELD_REGISTRY=Object.freeze([
  {id:'FIELD-window_type',canonicalName:'window_type',labelJa:'窓種',dataType:'ENUM',scope:'PRODUCT_SELECTION',status:'ACTIVE'},
  {id:'FIELD-specific_spec',canonicalName:'specific_spec',labelJa:'窓種固有仕様',dataType:'ENUM',scope:'PRODUCT_SELECTION',status:'ACTIVE'},
  {id:'FIELD-configuration',canonicalName:'configuration',labelJa:'構成・区分',dataType:'ENUM',scope:'PRODUCT_SELECTION',status:'ACTIVE'},
  {id:'FIELD-handing',canonicalName:'handing',labelJa:'開き勝手',dataType:'ENUM',scope:'PRODUCT_SELECTION',status:'ACTIVE'},
  {id:'FIELD-construction',canonicalName:'construction',labelJa:'工法・枠区分',dataType:'ENUM',scope:'PRODUCT_SELECTION',status:'ACTIVE'},
  {id:'FIELD-size_mode',canonicalName:'size_mode',labelJa:'サイズ方式',dataType:'ENUM',scope:'SIZE',status:'ACTIVE'},
  {id:'FIELD-size',canonicalName:'size',labelJa:'規格サイズ',dataType:'REFERENCE',scope:'SIZE',status:'ACTIVE'}
]);

export const CANONICAL_FIELD_NAMES=new Set(CANONICAL_FIELD_REGISTRY.map((row)=>row.canonicalName));
export const CANONICAL_FIELDS_BY_NAME=new Map(CANONICAL_FIELD_REGISTRY.map((row)=>[row.canonicalName,row]));

export function getCanonicalField(name){return CANONICAL_FIELDS_BY_NAME.get(name)??null;}
