import { applyGlobalWindowSelectionFlow } from './global-window-selection-flow-engine.mjs';
import { INNER_WINDOW_UI_CATEGORY, applyInnerWindowUiOrder } from './inner-window-runtime-ui-contract.mjs';
import { ENTRY_DOOR_COVER_UI_CATEGORY, applyEntryDoorCoverUiOrder } from './entry-door-cover-runtime-ui-contract.mjs';

export const NEW_CONSTRUCTION_EXTERIOR_WINDOW_UI_CATEGORY = 'NEW_CONSTRUCTION_EXTERIOR_WINDOW';

// UI実装標準仕様書 v1.8.
// Runtime owns existence, values, dependencies and validity. The Global Window
// Selection Flow owns presentation order and semantic stage normalization.
export const NEW_CONSTRUCTION_SASH_UI_STANDARD_ORDER = Object.freeze([
  'manufacturer','product','window_type','window_spec','handing','size_mode','panel_count','size',
  'exterior_color','interior_color','screen_presence','screen_form','screen_midrail','screen_net',
  'glass_base','glass_type','glass_detail','glass_function','glass_spacer','glass_air_layer','option',
]);

const SLOT_ALIASES = Object.freeze({
  manufacturer:'manufacturer',product:'product',
  window_type:'window_type',
  window_spec:'window_spec',shutter_type:'window_spec',rain_shutter_type:'window_spec',grille_type:'window_spec',door_grille_type:'window_spec',
  operation_type:'window_spec',operation_method:'window_spec',operator_position:'window_spec',handle_type:'window_spec',handle_configuration:'window_spec',
  composition_type:'window_spec',configuration:'window_spec',window_configuration:'window_spec',configuration_variant:'window_spec',variant:'window_spec',joinery_configuration:'window_spec',door_type:'window_spec',
  region_standard:'window_spec',door_installation:'window_spec',
  handing:'handing',
  sash_count:'panel_count',panel_count:'panel_count',leaf_configuration:'panel_count',
  size_mode:'size_mode',size:'size',standard_size:'size',size_id:'size',custom_width:'size',custom_height:'size',custom_w:'size',custom_h:'size',
  exterior_color:'exterior_color',interior_color:'interior_color',
  screen:'screen_presence',screen_presence:'screen_presence',screen_type:'screen_form',screen_form:'screen_form',screen_variant:'screen_form',screen_midrail:'screen_midrail',screen_net:'screen_net',
  glass:'glass_base',glass_base:'glass_base',glass_type:'glass_type',glass_detail:'glass_detail',glass_function:'glass_function',glass_additional:'glass_function',
  glass_spacer:'glass_spacer',glass_air_layer:'glass_air_layer',glass_gas:'glass_air_layer',
  option:'option',options:'option',
});

const PRODUCT_SLOTS = new Set(['manufacturer','product']);
const CONFIGURATION_SLOTS = new Set(['window_spec','handing']);
const SIZE_SLOTS = new Set(['size_mode','panel_count','size']);
const FINISH_SLOTS = new Set(['exterior_color','interior_color']);
const SCREEN_SLOTS = new Set(['screen_presence','screen_form','screen_midrail','screen_net']);
const GLAZING_SLOTS = new Set(['glass_base','glass_type','glass_detail','glass_function','glass_spacer','glass_air_layer']);

const STANDARD_LABELS = Object.freeze({
  window_type:'窓種類',window_configuration:'連窓構成',configuration_variant:'仕様バリアント',region_standard:'地域規格',door_installation:'ドア納まり',
  handing:'開き勝手（吊元）',size_mode:'サイズ方式',sash_count:'建具・枚数',panel_count:'建具・枚数',leaf_configuration:'建具・枚数',size:'サイズ',standard_size:'サイズ',
  custom_width:'特注W（mm）',custom_height:'特注H（mm）',custom_w:'特注W（mm）',custom_h:'特注H（mm）',
  exterior_color:'外観色',interior_color:'内観色',screen:'網戸',screen_presence:'網戸',screen_type:'網戸形式',screen_form:'網戸形式',screen_midrail:'網戸中桟',screen_net:'網戸ネット',
  glass:'ガラス',glass_base:'ガラス',glass_type:'ガラス種',glass_detail:'ガラス詳細',glass_function:'ガラス追加機能',glass_additional:'ガラス追加機能',glass_spacer:'スペーサー',glass_air_layer:'中空層',glass_gas:'中空層',
  option:'その他オプション',options:'その他オプション',
});

const INTERNAL_EXACT = new Set(['construction','actual_w','actual_h','runtime_technical_state','dependency_only_selector','internal_provider_id','provider_id','source_id','internal_normalized_id','normalized_internal_id','legacyConstruction','legacyConfiguration']);
const TECHNICAL_NON_UI_FIELDS = new Set(['glass_air_layer','glass_gas','glass_thickness','glass_makeup','glass_composition']);
const isInternalKey=(key)=>{const token=String(key??'').trim();if(!token)return true;return INTERNAL_EXACT.has(token)||token.startsWith('_')||token.startsWith('internal_')||token.startsWith('runtime_internal_')||token.startsWith('dependency_only_')||token.startsWith('legacy_');};

// Approved declarative extension slots for formal Runtime fields which are
// configuration selectors but are not part of the base canonical slot set.
// Exact-key only: no series/manufacturer fallback and no generic escape hatch.
const APPROVED_NEW_CONSTRUCTION_EXTENSIONS = Object.freeze({
  glass_configuration:Object.freeze({slot:'ext.glass_configuration',stage:'CONFIGURATION',order:41}),
  profile:Object.freeze({slot:'ext.profile',stage:'CONFIGURATION',order:42}),
  opening_class:Object.freeze({slot:'ext.opening_class',stage:'CONFIGURATION',order:43}),
  sill:Object.freeze({slot:'ext.sill',stage:'CONFIGURATION',order:44}),
  wall_finish:Object.freeze({slot:'ext.wall_finish',stage:'CONFIGURATION',order:45}),
});

export function semanticSlotForNewConstructionField(key){return SLOT_ALIASES[key]??null;}
export function semanticStageForNewConstructionSlot(slot){if(PRODUCT_SLOTS.has(slot))return'PRODUCT';if(slot==='window_type')return'OPENING';if(CONFIGURATION_SLOTS.has(slot))return'CONFIGURATION';if(SIZE_SLOTS.has(slot))return'SIZE';if(FINISH_SLOTS.has(slot))return'FINISH';if(SCREEN_SLOTS.has(slot))return'SCREEN';if(GLAZING_SLOTS.has(slot))return'GLAZING';if(slot==='option')return'OPTION';return null;}
export function standardLabelForNewConstructionField(key,fallback){return STANDARD_LABELS[key]??fallback;}
export function shouldExposeNewConstructionRuntimeField(field={}){const key=field.key??field.field_name;if(isInternalKey(key)||TECHNICAL_NON_UI_FIELDS.has(String(key??'').trim()))return false;if(field.runtimeIncluded===false||field.runtime_included===false)return false;if(field.technical===true||field.internal===true)return false;return true;}
export function approvedNewConstructionExtensionForField(key){return APPROVED_NEW_CONSTRUCTION_EXTENSIONS[key]??null;}
export function applyNewConstructionSashUiOrder(fields=[]){return applyGlobalWindowSelectionFlow(fields,{uiCategory:NEW_CONSTRUCTION_EXTERIOR_WINDOW_UI_CATEGORY,canonicalSlotOrder:NEW_CONSTRUCTION_SASH_UI_STANDARD_ORDER,semanticSlotForField:semanticSlotForNewConstructionField,semanticStageForSlot:semanticStageForNewConstructionSlot,approvedExtensionForField:approvedNewConstructionExtensionForField,shouldExposeField:shouldExposeNewConstructionRuntimeField,standardLabelForField:standardLabelForNewConstructionField});}

const firstPresent=(objects,keys)=>{for(const object of objects){if(!object||typeof object!=='object')continue;for(const key of keys)if(object[key]!==undefined&&object[key]!==null&&object[key]!=='')return object[key];}return null;};
const exactCallCodeFromFormalSizeId=(objects,callW,callH)=>{for(const object of objects){if(!object||typeof object!=='object')continue;for(const key of ['sizeId','size_id','id','サイズID']){const raw=object[key];if(raw===undefined||raw===null||raw==='')continue;const id=String(raw);const tokens=id.split(/[^0-9A-Za-z]+/).filter(Boolean);for(let index=tokens.length-1;index>=0;index-=1)if(/^\d{5}$/.test(tokens[index]))return tokens[index];const w=callW===null||callW===undefined?'':String(callW).trim();const h=callH===null||callH===undefined?'':String(callH).trim();if(w&&h){const suffix=`${w}-${h}`;if(id===suffix||id.endsWith(`-${suffix}`))return suffix;}}}return null;};
export function standardSizeMetadataFromRuntimeValue(row={}){const objects=[row.sizeMetadata,row.metadata,row.source?.metadata,row.source,row];let callCode=firstPresent(objects,['callCode','call_code','sizeCode','size_code','呼称寸法']);const callW=firstPresent(objects,['callW','call_w','nominalW','nominal_w','呼称W']);const callH=firstPresent(objects,['callH','call_h','nominalH','nominal_h','呼称H']);if(callCode===null||callCode==='')callCode=exactCallCodeFromFormalSizeId(objects,callW,callH);const actualWRaw=firstPresent(objects,['actualW','actual_w','実寸W']);const actualHRaw=firstPresent(objects,['actualH','actual_h','実寸H']);if((callCode===null||callCode==='')&&typeof callW==='string'&&callW.includes('-')&&callH!==null&&callH!==undefined&&String(callH).trim())callCode=`${callW.trim()}-${String(callH).trim()}`;if((callCode===null||callCode==='')&&typeof callW==='string'&&typeof callH==='string'&&callW.trim()&&callH.trim())callCode=`${callW.trim()}${callH.trim()}`;if(callCode===null||callCode===''||actualWRaw===null||actualHRaw===null)return null;const actualW=Number(actualWRaw),actualH=Number(actualHRaw);if(!Number.isInteger(actualW)||!Number.isInteger(actualH))return null;return Object.freeze({callCode:String(callCode),actualW,actualH});}
export function formatStandardSizeLabel(metadata){if(!metadata){const error=new Error('Standard size display requires formal Runtime callCode/nominal dimensions and actualW/actualH.');error.code='RUNTIME_SIZE_DISPLAY_DATA_MISSING';throw error;}return `${metadata.callCode} ｜ W ${metadata.actualW} × H ${metadata.actualH}`;}
export function formatAndSortStandardSizeChoices(choices=[]){return choices.map((choice,index)=>{const metadata=standardSizeMetadataFromRuntimeValue(choice.runtimeValueRow??choice);return{...choice,displayLabel:formatStandardSizeLabel(metadata),sizeMetadata:metadata,__stableIndex:index};}).sort((a,b)=>a.sizeMetadata.actualW-b.sizeMetadata.actualW||a.sizeMetadata.actualH-b.sizeMetadata.actualH||a.__stableIndex-b.__stableIndex).map(({runtimeValueRow,__stableIndex,...choice})=>choice);}
export function applyRuntimeUiCategoryOrder(fields=[],integration={}){
  if(integration.uiCategory===INNER_WINDOW_UI_CATEGORY)return applyInnerWindowUiOrder(fields);
  if(integration.uiCategory===NEW_CONSTRUCTION_EXTERIOR_WINDOW_UI_CATEGORY)return applyNewConstructionSashUiOrder(fields);
  if(integration.uiCategory===ENTRY_DOOR_COVER_UI_CATEGORY)return applyEntryDoorCoverUiOrder(fields);
  const error=new Error(`Runtime UI category is not mapped to the Global Window Selection Flow: ${integration.uiCategory??'UNKNOWN'}`);
  error.code='WINDOW_UI_CATEGORY_UNMAPPED';
  throw error;
}
