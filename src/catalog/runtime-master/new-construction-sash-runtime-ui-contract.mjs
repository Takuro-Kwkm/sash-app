export const NEW_CONSTRUCTION_EXTERIOR_WINDOW_UI_CATEGORY = 'NEW_CONSTRUCTION_EXTERIOR_WINDOW';
import { INNER_WINDOW_UI_CATEGORY, applyInnerWindowUiOrder } from './inner-window-runtime-ui-contract.mjs';

// UI実装標準仕様書 v1.6.
// Runtime owns existence, values, dependencies and validity. This contract owns presentation semantics only.
export const NEW_CONSTRUCTION_SASH_UI_STANDARD_ORDER = Object.freeze([
  'manufacturer','product','window_type','window_spec','handing','size_mode','panel_count','size',
  'exterior_color','interior_color','screen_presence','screen_form','screen_midrail','screen_net',
  'glass_base','glass_type','glass_detail','glass_function','glass_spacer','glass_air_layer','option',
]);

const SLOT_ALIASES = Object.freeze({
  window_type:'window_type',
  window_spec:'window_spec',shutter_type:'window_spec',rain_shutter_type:'window_spec',grille_type:'window_spec',door_grille_type:'window_spec',
  operation_type:'window_spec',operation_method:'window_spec',operator_position:'window_spec',handle_type:'window_spec',handle_configuration:'window_spec',
  composition_type:'window_spec',configuration:'window_spec',window_configuration:'window_spec',variant:'window_spec',joinery_configuration:'window_spec',door_type:'window_spec',
  handing:'handing',
  size_mode:'size_mode',sash_count:'panel_count',panel_count:'panel_count',leaf_configuration:'panel_count',size:'size',standard_size:'size',size_id:'size',custom_width:'size',custom_height:'size',custom_w:'size',custom_h:'size',
  exterior_color:'exterior_color',interior_color:'interior_color',
  screen:'screen_presence',screen_presence:'screen_presence',screen_type:'screen_form',screen_form:'screen_form',screen_variant:'screen_form',screen_midrail:'screen_midrail',screen_net:'screen_net',
  glass:'glass_base',glass_base:'glass_base',glass_type:'glass_type',glass_detail:'glass_detail',glass_function:'glass_function',glass_additional:'glass_function',
  glass_spacer:'glass_spacer',glass_air_layer:'glass_air_layer',glass_gas:'glass_air_layer',
  option:'option',options:'option',
});
const SLOT_INDEX = new Map(NEW_CONSTRUCTION_SASH_UI_STANDARD_ORDER.map((slot,index)=>[slot,index]));

const STANDARD_LABELS = Object.freeze({
  window_type:'窓種類',window_configuration:'連窓構成',
  handing:'開き勝手（吊元）',size_mode:'サイズ方式',sash_count:'建具・枚数',panel_count:'建具・枚数',leaf_configuration:'建具・枚数',size:'サイズ',standard_size:'サイズ',
  custom_width:'特注W（mm）',custom_height:'特注H（mm）',custom_w:'特注W（mm）',custom_h:'特注H（mm）',
  exterior_color:'外観色',interior_color:'内観色',screen:'網戸',screen_presence:'網戸',screen_type:'網戸形式',screen_form:'網戸形式',screen_midrail:'網戸中桟',screen_net:'網戸ネット',
  glass:'ガラス',glass_base:'ガラス',glass_type:'ガラス種',glass_detail:'ガラス詳細',glass_function:'ガラス追加機能',glass_additional:'ガラス追加機能',glass_spacer:'スペーサー',glass_air_layer:'中空層',glass_gas:'中空層',
  option:'その他オプション',options:'その他オプション',
});

const INTERNAL_EXACT = new Set(['construction','actual_w','actual_h','runtime_technical_state','dependency_only_selector','internal_provider_id','provider_id','source_id','internal_normalized_id','normalized_internal_id','legacyConstruction','legacyConfiguration']);
const isInternalKey=(key)=>{const token=String(key??'').trim();if(!token)return true;return INTERNAL_EXACT.has(token)||token.startsWith('_')||token.startsWith('internal_')||token.startsWith('runtime_internal_')||token.startsWith('dependency_only_')||token.startsWith('legacy_');};
export function semanticSlotForNewConstructionField(key){return SLOT_ALIASES[key]??`other:${String(key)}`;}
export function standardLabelForNewConstructionField(key,fallback){return STANDARD_LABELS[key]??fallback;}
export function shouldExposeNewConstructionRuntimeField(field={}){const key=field.key??field.field_name;if(isInternalKey(key))return false;if(field.runtimeIncluded===false||field.runtime_included===false)return false;if(field.technical===true||field.internal===true)return false;return true;}
export function applyNewConstructionSashUiOrder(fields=[]){return fields.filter(shouldExposeNewConstructionRuntimeField).map((field,index)=>{const slot=semanticSlotForNewConstructionField(field.key);return{...field,semanticSlot:slot,displayLabel:standardLabelForNewConstructionField(field.key,field.displayLabel),__uiSlotIndex:SLOT_INDEX.get(slot)??NEW_CONSTRUCTION_SASH_UI_STANDARD_ORDER.length,__runtimeOrder:Number(field.displayOrder??1000+index),__inputIndex:index};}).sort((a,b)=>a.__uiSlotIndex-b.__uiSlotIndex||a.__runtimeOrder-b.__runtimeOrder||a.__inputIndex-b.__inputIndex).map((field,index)=>{const{__uiSlotIndex,__runtimeOrder,__inputIndex,...rest}=field;return{...rest,displayOrder:(index+1)*10};});}
const firstPresent=(objects,keys)=>{for(const object of objects){if(!object||typeof object!=='object')continue;for(const key of keys)if(object[key]!==undefined&&object[key]!==null&&object[key]!=='')return object[key];}return null;};
export function standardSizeMetadataFromRuntimeValue(row={}){const objects=[row.sizeMetadata,row.metadata,row.source?.metadata,row.source,row];let callCode=firstPresent(objects,['callCode','call_code','sizeCode','size_code','呼称寸法']);const callW=firstPresent(objects,['callW','call_w','nominalW','nominal_w','呼称W']);const callH=firstPresent(objects,['callH','call_h','nominalH','nominal_h','呼称H']);const actualWRaw=firstPresent(objects,['actualW','actual_w','実寸W']);const actualHRaw=firstPresent(objects,['actualH','actual_h','実寸H']);if((callCode===null||callCode==='')&&callW!==null&&callH!==null)callCode=`${callW}${callH}`;if(callCode===null||callCode===''||actualWRaw===null||actualHRaw===null)return null;const actualW=Number(actualWRaw),actualH=Number(actualHRaw);if(!Number.isInteger(actualW)||!Number.isInteger(actualH))return null;return Object.freeze({callCode:String(callCode),actualW,actualH});}
export function formatStandardSizeLabel(metadata){if(!metadata){const error=new Error('Standard size display requires formal Runtime callCode/nominal dimensions and actualW/actualH.');error.code='RUNTIME_SIZE_DISPLAY_DATA_MISSING';throw error;}return `${metadata.callCode} ｜ W ${metadata.actualW} × H ${metadata.actualH}`;}
export function formatAndSortStandardSizeChoices(choices=[]){return choices.map((choice,index)=>{const metadata=standardSizeMetadataFromRuntimeValue(choice.runtimeValueRow??choice);return{...choice,displayLabel:formatStandardSizeLabel(metadata),sizeMetadata:metadata,__stableIndex:index};}).sort((a,b)=>a.sizeMetadata.actualW-b.sizeMetadata.actualW||a.sizeMetadata.actualH-b.sizeMetadata.actualH||a.__stableIndex-b.__stableIndex).map(({runtimeValueRow,__stableIndex,...choice})=>choice);}
export function applyRuntimeUiCategoryOrder(fields=[],integration={}){if(integration.uiCategory===INNER_WINDOW_UI_CATEGORY)return applyInnerWindowUiOrder(fields);if(integration.uiCategory===NEW_CONSTRUCTION_EXTERIOR_WINDOW_UI_CATEGORY)return applyNewConstructionSashUiOrder(fields);return[...fields].sort((a,b)=>a.displayOrder-b.displayOrder||a.key.localeCompare(b.key,'ja'));}
