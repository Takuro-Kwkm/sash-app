import { SAMOS2H_SOURCE as source } from './samos2h-source.mjs';
export const PRODUCT_ID='SER-LIX-SAMOS2H';
export const master={id:'1zHi-XsMqJp0MKH-sDoTcnTqkLMGcuRdo',title:'サーモスⅡH_商品マスター_v0.7_完全完成版.xlsx',version:'v0.7',folder:'01_正本'};
export const ev=id=>[id];
export const definition=(key,displayLabel,displayOrder,sourceRole,dataType='ENUM',extra={})=>({id:`${PRODUCT_ID}:def:${key}`,productId:PRODUCT_ID,key,displayLabel,description:`${displayLabel}を正本商品マスターから選択`,dataType,category:'estimate',applicability:'SELECTOR_DRIVEN',displayOrder,evidenceIds:ev('EV-S2H-001'),version:master.version,status:'ACTIVE',sourceRole,...extra});
export const value=(key,raw,label,order,extra={})=>{const{idSuffix,...rest}=extra;return{id:`${PRODUCT_ID}:${key}:${raw}:${idSuffix??order}`,productId:PRODUCT_ID,specificationKey:key,value:raw,displayLabel:label,displayOrder:order,status:'ACTIVE',...rest};};
const SPEC_FIELDS=new Map([['シャッター種類',['shutter_type','シャッター種類']],['雨戸種類',['rain_shutter_type','雨戸種類']],['面格子種類',['grille_type','面格子種類']],['ハンドル×構成タイプ',['handle_configuration','ハンドル・構成']],['ハンドル種類',['handle_type','ハンドル種類']],['操作方式',['operation_method','操作方式']],['構成タイプ',['composition_type','構成タイプ']],['建具構成',['joinery_configuration','建具構成']],['ドアタイプ',['door_type','ドアタイプ']]]);
export const windowValues=source.windows.map((r,i)=>value('window_type',r.window_type_id,r['窓種表示名'],i+1,{evidenceIds:ev('EV-S2H-001'),metadata:{sourceFile:master.title,sourceSheet:r._sourceSheet,sourceRow:r._sourceRow}}));
export const specDefinitions=[];export const specValues=[];
for(const[specType,[key,label]]of SPEC_FIELDS){const windows=source.windows.filter(r=>r['固有仕様種別']===specType).map(r=>r.window_type_id);if(!windows.length)continue;specDefinitions.push(definition(key,label,20,'SPEC','ENUM',{selector:{window_type:{$in:windows}},autoSelectSingle:true}));for(const r of source.specs.filter(r=>r['固有仕様種別']===specType))specValues.push(value(key,r.spec_id,r['表示名'],Number(r['表示順']??999),{selector:{window_type:r['窓種ID']},evidenceIds:ev('EV-S2H-001'),metadata:{specific_spec:r.spec_id,sourceFile:master.title,sourceSheet:r._sourceSheet,sourceRow:r._sourceRow,formalName:r['メーカー正式名称']}}));}
export { source };
