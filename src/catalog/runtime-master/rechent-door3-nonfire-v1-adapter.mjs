const FIELD_KEY_BY_ID = Object.freeze({
  'RE3NF-F-01':'input_mode','RE3NF-F-02':'thermal_spec','RE3NF-F-03':'transom','RE3NF-F-04':'opening_type','RE3NF-F-05':'design','RE3NF-F-06':'model_variant',
  'RE3NF-F-07':'body_color','RE3NF-F-08':'frame_color','RE3NF-F-09':'size_w','RE3NF-F-10':'size_h','RE3NF-F-11':'handing','RE3NF-F-12':'child_door',
  'RE3NF-F-13':'secondary_door','RE3NF-F-14':'sidelight_spec','RE3NF-F-15':'glass_safety','RE3NF-F-16':'lock_type','RE3NF-F-17':'handle_type','RE3NF-F-18':'handle_surface',
  'RE3NF-F-19':'handle_color','RE3NF-F-20':'interior_handle','RE3NF-F-21':'cylinder','RE3NF-F-22':'electric_lock_power','RE3NF-F-23':'electric_lock_reader',
  'RE3NF-F-24':'electric_lock_plan','RE3NF-F-25':'key_set','RE3NF-F-26':'additional_key','RE3NF-F-27':'exterior_trim','RE3NF-F-28':'interior_trim',
  'RE3NF-F-29':'threshold_flat_material','RE3NF-F-30':'existing_threshold_treatment','RE3NF-F-31':'threshold_step_mitigation','RE3NF-F-32':'option',
  'RE3NF-F-33':'fit_result','RE3NF-F-34':'order_configuration','RE3NF-F-35':'existing_frame_material','RE3NF-F-36':'existing_frame_type','RE3NF-F-37':'fastening_method',
  'RE3NF-F-38':'existing_opening_w1','RE3NF-F-39':'existing_opening_w2','RE3NF-F-40':'existing_opening_w_correction','RE3NF-F-41':'existing_opening_h1','RE3NF-F-42':'existing_opening_h2',
  'RE3NF-F-43':'exterior_trim_a','RE3NF-F-44':'exterior_trim_b','RE3NF-F-45':'exterior_trim_c','RE3NF-F-46':'interior_trim_d','RE3NF-F-47':'interior_trim_e',
  'RE3NF-F-48':'interior_trim_j','RE3NF-F-49':'interior_trim_k','RE3NF-F-50':'existing_threshold_g',
});

const HIDDEN_RUNTIME_KEYS = new Set(['input_mode','model_variant','secondary_door','order_configuration']);
const SURVEY_DELEGATED_ENUM_KEYS = new Set(['existing_frame_material','existing_frame_type','fastening_method']);
const splitCsv = (value) => String(value ?? '').split(',').map((x)=>x.trim()).filter(Boolean);
const uniq = (values) => [...new Set(values.filter((v)=>v !== undefined && v !== null && v !== ''))];
const asNumber = (value) => value === '' || value === null || value === undefined ? null : (Number.isFinite(Number(value)) ? Number(value) : null);
const choice = (value, displayLabel = String(value), extra = {}) => ({ value, displayLabel, manualCheck:false, disabled:false, ...extra });
const labelMap = (pairs) => new Map(pairs);

const LABELS = Object.freeze({
  thermal_spec: labelMap([['HIGH_INSULATION','高断熱仕様'],['INSULATION_K2_K4','断熱仕様（k2/k4）'],['ALUMINUM','アルミ仕様']]),
  transom: labelMap([['NONE','なし'],['PRESENT','あり']]),
  opening_type: labelMap([['SINGLE','片開き'],['PARENT_CHILD','親子'],['DOUBLE','両開き'],['SINGLE_SIDELIGHT','片袖'],['DOUBLE_SIDELIGHT','両袖']]),
  handing: labelMap([['R','右吊元'],['L','左吊元']]),
  lock_type: labelMap([['MANUAL','手動錠'],['FAMILOCK','FamiLock']]),
  handle_type: labelMap([['S','S型'],['A','A型'],['D','D型'],['F','F型']]),
  handle_surface: labelMap([['GENERAL','一般仕様'],['KIETECHNO_COAT','キエテクノコート']]),
  handle_color: labelMap([['1','ブラストシルバー'],['2','サテンゴールド'],['3','シルキーマットブラック']]),
  cylinder: labelMap([['DN','DNシリンダー'],['W','Wシリンダー']]),
  door_closer: labelMap([['TWO_STOP','2ストップ'],['FREE_STOP','フリーストップ']]),
  glass_safety: labelMap([['SAFETY_LAMINATED','安全合わせ']]),
  glass_spec: labelMap([['NOT_APPLICABLE','ガラスなし'],['LOW_E_IGU_A16_ARGON','Low-E複層（A16アルゴン）'],['LOW_E_IGU_A16','Low-E複層（A16）'],['LOW_E_IGU_ARGON','Low-E複層（アルゴン）'],['IGU_A16','複層（A16）'],['IGU_REDUCED_AIR','複層'],['LAMINATED_PATTERNED','合わせガラス'],['SEPARATE_GLASS','別途ガラス']]),
});

function docs(runtimePackage) {
  const byName = runtimePackage.documentsByFileName ?? {};
  const requireDoc = (name) => {
    const doc = byName[name];
    if (!doc) { const e = new Error(`Rechent formal Runtime document missing: ${name}`); e.code='RECHENT_RUNTIME_DOCUMENT_MISSING'; throw e; }
    return doc;
  };
  return {
    canonical:requireDoc('canonical_fields.json'), product:requireDoc('product_rules.json'), hardware:requireDoc('hardware_rules.json'),
    installation:requireDoc('installation_rules.json'), option:requireDoc('option_order_rules.json'), dependency:requireDoc('dependency_rules.json'),
    evidence:requireDoc('evidence_manual_checks.json'), qa:requireDoc('runtime_qa.json'),
  };
}

function currentDesign(product, selection) {
  return product.design_master.find((row)=>row.design_id===selection.design && (!selection.thermal_spec || row.thermal_scope===selection.thermal_spec)) ?? null;
}
function modelVariant(product, selection) { return currentDesign(product, selection)?.base_model_variant ?? null; }
function frameAllowedRows(product, selection) {
  const model = modelVariant(product, selection);
  return product.frame_atomic_rules.filter((row)=>row.result==='ALLOW'
    && (!selection.thermal_spec || row.thermal_scope===selection.thermal_spec)
    && (!selection.design || row.design_id===selection.design)
    && (!model || row.model_variant===model));
}
function hardwareRows(hardware, product, selection) {
  const model = modelVariant(product, selection);
  return hardware.hardware_atomic_rules.filter((row)=>row.result==='ALLOW'
    && (!selection.thermal_spec || row.thermal_scope===selection.thermal_spec)
    && (!selection.design || row.design_id===selection.design)
    && (!model || row.model_variant_scope===model)
    && (!selection.handle_type || row.handle_type===selection.handle_type)
    && (!selection.lock_type || row.entry_system===selection.lock_type));
}
function optionFromValueMaster(field) { return (field?.value_master ?? []).map((row)=>choice(row.value_code,row.official_label ?? row.value_code)); }
function fieldById(canonical, id) { return canonical.fields.find((row)=>row.field_id===id) ?? null; }
function canonicalField(canonical,key){const id=Object.entries(FIELD_KEY_BY_ID).find(([,mapped])=>mapped===key)?.[0]; return id?fieldById(canonical,id):null;}

function transomChoices(product, selection) {
  const rows = product.dimension_ranges.filter((row)=>!selection.thermal_spec || row.thermal_scope===selection.thermal_spec);
  const values = uniq(rows.flatMap((row)=>row.transom==='ANY'?['NONE','PRESENT']:[row.transom]).filter((v)=>v!=='ANY'));
  return values.map((v)=>choice(v,LABELS.transom.get(v)??v));
}
function thermalChoices(product){return uniq(product.design_master.map((row)=>row.thermal_scope)).map((v)=>choice(v,LABELS.thermal_spec.get(v)??v));}
function designChoices(product,selection){return product.design_master.filter((row)=>!selection.thermal_spec||row.thermal_scope===selection.thermal_spec).map((row)=>choice(row.design_id,row.design_id));}
function openingChoices(product,selection){return uniq(frameAllowedRows(product,selection).map((row)=>row.frame_configuration)).map((v)=>choice(v,LABELS.opening_type.get(v)??v));}
function childDoorChoices(product,selection){return product.child_doors.filter((row)=>!selection.thermal_spec||row.thermal_scope===selection.thermal_spec).map((row)=>choice(row.child_design,row.child_design));}
function sidelightChoices(canonical){return optionFromValueMaster(canonicalField(canonical,'sidelight_spec'));}
function colorChoices(product,selection,kind){
  const master = kind==='body'?product.door_colors:product.frame_colors;
  let allowed = null;
  if(kind==='body'&&selection.design){const row=product.design_color_allow.find((r)=>r.design_id===selection.design&&(!selection.thermal_spec||r.thermal_scope===selection.thermal_spec));if(row)allowed=new Set(splitCsv(row.allowed_door_colors));}
  if(kind==='frame'&&selection.design&&selection.body_color){
    const required=product.frame_color_rules.find((r)=>r.constraint==='REQUIRED'&&splitCsv(r.design_scope).includes(selection.design)&&splitCsv(r.door_color_scope).includes(selection.body_color));
    if(required)allowed=new Set(splitCsv(required.frame_color_result));
  }
  return master.filter((row)=>!allowed||allowed.has(row.code)).map((row)=>choice(row.code,row.official_name??row.code));
}
function hardwareChoice(rows,key,labelKey=key){return uniq(rows.flatMap((row)=>splitCsv(row[key]))).map((v)=>choice(v,LABELS[labelKey]?.get(v)??v));}
function handleColors(hardware){return hardware.hardware_recovery_reference.filter((row)=>row.field_or_rule==='handle_color_code'&&row.status==='VERIFIED').map((row)=>choice(String(row.value_or_scope),row.result));}
function trimChoices(installation,kind){return (kind==='exterior'?installation.exterior_trim:installation.interior_trim).map((row)=>choice(row.trim_id,row.trim_id));}
function optionChoices(option,selection,category){return option.user_options.filter((row)=>{if(category==='additional_key'&&!['RE3NF-OPT-CARD-BK','RE3NF-OPT-CARD-LG','RE3NF-OPT-TAG','RE3NF-OPT-REMOTE'].includes(row.option_id))return false;if(category==='option'&&['RE3NF-OPT-CARD-BK','RE3NF-OPT-CARD-LG','RE3NF-OPT-TAG','RE3NF-OPT-REMOTE'].includes(row.option_id))return false;try{const c=JSON.parse(row.visible_when??'{}');if(c.entry_system&&selection.lock_type!==c.entry_system)return false;if(c.door_color_not?.includes(selection.body_color))return false;}catch{}return true;}).map((row)=>choice(row.option_id,row.official_name));}
function glassSpecChoice(product,selection){
  if(!selection.design)return[];
  const scopes = selection.thermal_spec==='INSULATION_K2_K4'?['INSULATION_K2','INSULATION_K4']:[selection.thermal_spec];
  const rows=product.glass_master.filter((row)=>scopes.includes(row.thermal_scope)&&row.component==='BODY'&&splitCsv(row.design_scope).includes(selection.design));
  return uniq(rows.map((row)=>row.glass_spec)).map((v)=>choice(v,LABELS.glass_spec.get(v)??v));
}
function glassSafetyApplicable(dependency,selection){
  if(!selection.design||!selection.thermal_spec)return false;
  const component = selection.opening_type==='DOUBLE'?'DOUBLE':selection.opening_type==='PARENT_CHILD'?'CHILD':'BODY';
  const rows=dependency.predicates.filter((row)=>row.predicate_id==='glass_safety_applicable'
    && (row.thermal_scope==='ANY'||row.thermal_scope===selection.thermal_spec)
    && (row.component_scope==='ANY'||row.component_scope===component)
    && (row.design_scope==='ANY'||splitCsv(row.design_scope).includes(selection.design)))
    .sort((a,b)=>Number(b.priority)-Number(a.priority));
  return rows[0]?.result==='TRUE';
}
function flatPartChoices(canonical,product,selection){
  if(selection.thermal_spec==='HIGH_INSULATION')return[];
  return optionFromValueMaster(canonicalField(canonical,'threshold_flat_material'));
}
function sizeScope(selection){
  if(!selection.opening_type)return null;
  if(['SINGLE_SIDELIGHT','DOUBLE_SIDELIGHT'].includes(selection.opening_type)){
    const suffix={PLAIN:'PLAIN',DECORATED_CENTER_BAR_POST:'CENTER_BAR_POST',DECORATED_CENTER_BAR_NO_POST:'CENTER_BAR_NO_POST',CENTER_BAR_POST:'CENTER_BAR_POST',CENTER_BAR_NO_POST:'CENTER_BAR_NO_POST'}[selection.sidelight_spec];
    return suffix?`${selection.opening_type}_${suffix}`:selection.opening_type;
  }
  return selection.opening_type;
}
function matchingDimensionRows(product,selection,field){
  const scope=sizeScope(selection);const entry=selection.lock_type??'ANY';const transom=selection.transom??'ANY';
  return product.dimension_ranges.filter((row)=>row.field===field&&(!selection.thermal_spec||row.thermal_scope===selection.thermal_spec)
    && (row.frame_scope==='ANY'||row.frame_scope===scope||row.frame_scope===(['PARENT_CHILD','DOUBLE'].includes(scope)?'PARENT_CHILD_OR_DOUBLE':null)||row.frame_scope==='OTHER_FRAME')
    && (row.transom==='ANY'||row.transom===transom)&&(row.entry==='ANY'||row.entry===entry)&&!String(row.frame_scope).startsWith('HIGH_SIZE'));
}
function validateDimensions(product,selection){
  const errors=[]; const w=asNumber(selection.size_w),h=asNumber(selection.size_h);
  if(w!==null){const rows=matchingDimensionRows(product,selection,'frame_w');if(rows.length&&!rows.some((r)=>w>=r.min&&w<=r.max))errors.push({errorCode:'WIDTH_OUT_OF_RANGE',field:'size_w',message:'Wが正式Runtimeの製作範囲外です。'});}
  if(h!==null){const rows=matchingDimensionRows(product,selection,'frame_h');if(rows.length&&!rows.some((r)=>h>=r.min&&h<=r.max))errors.push({errorCode:'HEIGHT_OUT_OF_RANGE',field:'size_h',message:'Hが正式Runtimeの製作範囲外です。'});}
  return errors;
}
function manualWarnings(_evidence,selection){
  const warnings=[]; const h=asNumber(selection.size_h); const highSize=selection.thermal_spec==='INSULATION_K2_K4'&&h!==null&&h>=2440;
  if(['G12','G15'].includes(selection.design)&&highSize&&selection.opening_type==='DOUBLE')warnings.push('MANUAL_CHECK HIGH_SIZE_DOUBLE_CHILD_RANGE_UNVERIFIED: G12/G15 × HIGH_SIZE × DOUBLE の第二扉製作範囲は発注前確認が必要です。');
  return warnings;
}
function valuesFor(key,d,selection){
  const {canonical,product,hardware,installation,option,dependency}=d;
  const hw=hardwareRows(hardware,product,selection);
  switch(key){
    case 'thermal_spec': return thermalChoices(product);
    case 'transom': return transomChoices(product,selection);
    case 'opening_type': return openingChoices(product,selection);
    case 'design': return designChoices(product,selection);
    case 'body_color': return colorChoices(product,selection,'body');
    case 'frame_color': return colorChoices(product,selection,'frame');
    case 'handing': return optionFromValueMaster(canonicalField(canonical,'handing'));
    case 'child_door': return childDoorChoices(product,selection);
    case 'sidelight_spec': return sidelightChoices(canonical);
    case 'glass_spec': return glassSpecChoice(product,selection);
    case 'glass_safety': return glassSafetyApplicable(dependency,selection)?[choice('SAFETY_LAMINATED','安全合わせ')]:[];
    case 'lock_type': return uniq(hw.map((row)=>row.entry_system)).map((v)=>choice(v,LABELS.lock_type.get(v)??v));
    case 'handle_type': return uniq(hardwareRows(hardware,product,{...selection,handle_type:null,lock_type:null}).map((row)=>row.handle_type)).map((v)=>choice(v,LABELS.handle_type.get(v)??v));
    case 'handle_surface': return hardwareChoice(hw,'allowed_handle_surfaces','handle_surface');
    case 'handle_color': return handleColors(hardware);
    case 'interior_handle': {const vals=optionFromValueMaster(canonicalField(canonical,'interior_handle')); return selection.handle_surface==='KIETECHNO_COAT'?vals.filter((x)=>x.value==='ALUMINUM_SAME_AS_EXTERIOR'):vals;}
    case 'cylinder': return hardwareChoice(hw,'allowed_cylinders','cylinder');
    case 'door_closer': return hardwareChoice(hw,'allowed_door_closers','door_closer');
    case 'electric_lock_power': return selection.lock_type==='FAMILOCK'?hardwareChoice(hw,'allowed_power_types','electric_lock_power'):[];
    case 'electric_lock_reader': return selection.lock_type==='FAMILOCK'?hardwareChoice(hw,'allowed_reader_types','electric_lock_reader'):[];
    case 'electric_lock_plan': {let vals=optionFromValueMaster(canonicalField(canonical,'electric_lock_plan'));if(selection.electric_lock_power&&selection.electric_lock_power!=='AC100V')vals=vals.filter((x)=>x.value==='BASIC');return selection.lock_type==='FAMILOCK'?vals:[];}
    case 'key_set': return selection.lock_type==='FAMILOCK'?optionFromValueMaster(canonicalField(canonical,'key_set')):[];
    case 'additional_key': return selection.lock_type==='FAMILOCK'?optionChoices(option,selection,'additional_key'):[];
    case 'exterior_trim': return trimChoices(installation,'exterior');
    case 'interior_trim': return trimChoices(installation,'interior');
    case 'threshold_flat_material': return flatPartChoices(canonical,product,selection);
    case 'existing_threshold_treatment': return optionFromValueMaster(canonicalField(canonical,'existing_threshold_treatment'));
    case 'threshold_step_mitigation': return optionFromValueMaster(canonicalField(canonical,'threshold_step_mitigation'));
    case 'option': return optionChoices(option,selection,'option');
    default: return optionFromValueMaster(canonicalField(canonical,key));
  }
}
function isVisible(key,selection,d){
  if(HIDDEN_RUNTIME_KEYS.has(key))return false;
  if(key==='child_door')return selection.opening_type==='PARENT_CHILD';
  if(key==='sidelight_spec')return ['SINGLE_SIDELIGHT','DOUBLE_SIDELIGHT'].includes(selection.opening_type);
  if(key==='glass_safety')return glassSafetyApplicable(d.dependency,selection);
  if(['electric_lock_power','electric_lock_reader','electric_lock_plan','key_set','additional_key'].includes(key))return selection.lock_type==='FAMILOCK';
  if(key==='threshold_flat_material')return selection.thermal_spec!=='HIGH_INSULATION';
  if(SURVEY_DELEGATED_ENUM_KEYS.has(key))return selection.runtime_mode==='SURVEY_LINKED';
  if(['existing_opening_w1','existing_opening_w2','existing_opening_w_correction','existing_opening_h1','existing_opening_h2','exterior_trim_a','exterior_trim_b','exterior_trim_c','interior_trim_d','interior_trim_e','interior_trim_j','interior_trim_k','existing_threshold_g'].includes(key))return selection.runtime_mode==='SURVEY_LINKED';
  return true;
}
function isRequired(key,selection,_d){
  if(['thermal_spec','opening_type','design','body_color','frame_color','handing','lock_type','handle_type','handle_surface','handle_color','interior_handle','cylinder','exterior_trim','interior_trim','threshold_step_mitigation'].includes(key))return true;
  if(['size_w','size_h'].includes(key))return selection.runtime_mode==='PRODUCT_SELECTION';
  if(key==='child_door')return selection.opening_type==='PARENT_CHILD';
  if(key==='sidelight_spec')return ['SINGLE_SIDELIGHT','DOUBLE_SIDELIGHT'].includes(selection.opening_type);
  if(key==='glass_safety')return glassSafetyApplicable(_d.dependency,selection);
  if(['electric_lock_power','electric_lock_reader','electric_lock_plan','key_set'].includes(key))return selection.lock_type==='FAMILOCK';
  if(key==='existing_threshold_treatment')return selection.threshold_flat_material==='PRESENT';
  return false;
}
function dataTypeFor(valueType){if(valueType==='NUMBER_MM')return'NUMBER';if(valueType==='MULTI_OPTION')return'MULTI_ENUM';if(valueType==='VALIDATION_RESULT')return'TEXT';return'ENUM';}
function buildFields(d,selection){
  const fields=[];
  for(const def of d.canonical.fields){
    const key=FIELD_KEY_BY_ID[def.field_id]; if(!key||!isVisible(key,selection,d))continue;
    if(['model_variant','secondary_door','order_configuration','input_mode'].includes(key))continue;
    fields.push({key,displayLabel:def.display_name,displayOrder:fields.length+1,dataType:dataTypeFor(def.value_type),unit:def.value_type==='NUMBER_MM'?'mm':null,required:isRequired(key,selection,d),values:valuesFor(key,d,selection),selectionMode:def.selection_mode,readOnly:def.selection_mode==='AUTO_DERIVED'||def.selection_mode==='SYSTEM_VALIDATED',parentFields:[]});
  }
  const lockIndex=fields.findIndex((f)=>f.key==='handle_type');
  if(lockIndex>=0){const v=valuesFor('door_closer',d,selection);if(v.length)fields.splice(lockIndex,0,{key:'door_closer',displayLabel:'ドアクローザ',displayOrder:lockIndex+0.5,dataType:'ENUM',required:true,values:v,selectionMode:'USER_SELECTABLE',readOnly:false,parentFields:['thermal_spec','design','handle_type','lock_type']});}
  const gv=valuesFor('glass_spec',d,selection); if(gv.length){fields.push({key:'glass_spec',displayLabel:'ガラス',displayOrder:99,dataType:'ENUM',required:false,values:gv,selectionMode:'DERIVED',readOnly:true,parentFields:['thermal_spec','design']});}
  return fields;
}
function clearInvalidSelections(fields,selection){
  const next={...selection}; const cleared=[];
  const byKey=new Map(fields.map((f)=>[f.key,f]));
  for(const [key,value] of Object.entries(selection)){
    if(key==='runtime_mode')continue;
    const field=byKey.get(key); if(!field){delete next[key];cleared.push(key);continue;}
    if(field.dataType==='NUMBER'||field.dataType==='TEXT'||field.readOnly)continue;
    const allowed=new Set(field.values.map((x)=>String(x.value)));
    const values=Array.isArray(value)?value:[value]; if(values.some((v)=>!allowed.has(String(v)))){delete next[key];cleared.push(key);}
  }
  return {selection:next,clearedFields:cleared};
}

export function adaptRechentDoor3NonFireV1(runtimePackage, _entry={}) {
  const d=docs(runtimePackage);
  if(d.qa.all_pass!==true){const e=new Error('Rechent formal Runtime QA is not PASS.');e.code='RECHENT_RUNTIME_QA_NOT_PASS';throw e;}
  const uiResolver=(rawSelection={})=>{
    const withMode={runtime_mode:rawSelection.runtime_mode??'PRODUCT_SELECTION',...rawSelection};
    let fields=buildFields(d,withMode);
    const cleared=clearInvalidSelections(fields,withMode);
    const selection=cleared.selection;
    fields=buildFields(d,selection);
    const errors=validateDimensions(d.product,selection);
    const missingRequiredFields=fields.filter((f)=>f.required&&!f.readOnly&&(selection[f.key]===undefined||selection[f.key]===null||selection[f.key]==='')).map((f)=>f.key);
    const delegated=fields.filter((f)=>SURVEY_DELEGATED_ENUM_KEYS.has(f.key)&&f.values.length===0).map((f)=>f.key);
    if(delegated.length)errors.push({errorCode:'SURVEY_LAYER_VALUE_SOURCE_REQUIRED',field:delegated[0],message:`Survey Layerの共通値Source未接続: ${delegated.join(', ')}`});
    const manual=manualWarnings(d.evidence,selection);
    const status=errors.length?'INVALID':missingRequiredFields.length?'INCOMPLETE':'VALID';
    return {selection,fields,dependencyFields:fields.map((f)=>({key:f.key,parentFields:f.parentFields??[]})),notices:delegated.length?['Survey Layer委譲fieldは共通Survey Layer接続まで選択不可です。']:[],manualWarnings:manual,validation:{status,errors,missingRequiredFields},clearedFields:cleared.clearedFields,orderReady:status==='VALID'&&manual.length===0,runtimeCapabilities:{presentationOrderAuthority:'GLOBAL_WINDOW_SELECTION_FLOW_ENGINE',surveyLayerDelegatedFields:[...SURVEY_DELEGATED_ENUM_KEYS]},dimensionResult:{width:asNumber(selection.size_w),height:asNumber(selection.size_h)}};
  };
  return Object.freeze({master:null,uiResolver});
}
