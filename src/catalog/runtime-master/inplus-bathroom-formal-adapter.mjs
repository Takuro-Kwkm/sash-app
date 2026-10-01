import formalMaster from '../runtime-master-packages/lixil-inplus-bathroom-v1.0/formal-product-master.json' with { type:'json' };

export const INPLUS_BATHROOM_FORMAL_SHA256 = '58397e2dfc4b4fb74f62b14b4d9b22943de96c866a107cc48d52dcadd2c1bfcb';
export const INPLUS_BATHROOM_FORMAL_FILE_ID = '1GJknHnjU0-hvNvTS2X8fajuTkE0SvX0m';
export const INPLUS_BATHROOM_PACKAGE_FILE_ID = '1NqtsDPZNOil3YUXTarIylFTrvipkNcdt';
export const INPLUS_BATHROOM_VARIANT = 'bathroom';

const LABELS = formalMaster.labels;
const fieldById = new Map(formalMaster.fields.map((field)=>[field.id,field]));
const glassAxes = Object.freeze(['window_type','glass_family','glass_design','low_e_color','gas','single_thickness']);
const conditionKeys = (condition, out=new Set()) => {
  if (!condition || condition === true || condition === false) return [...out];
  if (condition.all) for (const row of condition.all) conditionKeys(row,out);
  if (condition.any) for (const row of condition.any) conditionKeys(row,out);
  for (const op of ['eq','in','gte','lte','gt','lt']) if (condition[op]) out.add(condition[op][0]);
  return [...out];
};
const conditionMatches = (condition, selection) => {
  if (condition === true || condition == null) return true;
  if (condition === false) return false;
  if (condition.all) return condition.all.every((row)=>conditionMatches(row,selection));
  if (condition.any) return condition.any.some((row)=>conditionMatches(row,selection));
  if (condition.eq) return Object.is(selection[condition.eq[0]],condition.eq[1]);
  if (condition.in) return condition.in[1].some((value)=>Object.is(selection[condition.in[0]],value));
  if (condition.gte) return Number(selection[condition.gte[0]])>=Number(condition.gte[1]);
  if (condition.lte) return Number(selection[condition.lte[0]])<=Number(condition.lte[1]);
  if (condition.gt) return Number(selection[condition.gt[0]])>Number(condition.gt[1]);
  if (condition.lt) return Number(selection[condition.lt[0]])<Number(condition.lt[1]);
  return false;
};
const unique = (values) => [...new Map(values.filter((value)=>value!==null&&value!==undefined).map((value)=>[JSON.stringify(value),value])).values()];
const displayLabel = (value) => LABELS[String(value)] ?? String(value);
const numberOrNull = (value) => value === '' || value === null || value === undefined ? null : Number.isFinite(Number(value)) ? Number(value) : null;

const RAW_ARRAY_FIELDS = Object.freeze({
  raw_widths:Object.freeze(['raw_width_1','raw_width_2','raw_width_3']),
  raw_heights:Object.freeze(['raw_height_1','raw_height_2','raw_height_3']),
  raw_diagonals:Object.freeze(['raw_diagonal_1','raw_diagonal_2']),
  edge_bends:Object.freeze(['edge_bend_top','edge_bend_right','edge_bend_bottom','edge_bend_left']),
});

const ROLE_OVERRIDES = Object.freeze({
  panel_count:'DERIVED',handle:'DERIVED',frame:'DERIVED',color:'DERIVED',
  raw_widths:'SELECTOR_DECOMPOSED',raw_heights:'SELECTOR_DECOMPOSED',raw_diagonals:'SELECTOR_DECOMPOSED',edge_bends:'SELECTOR_DECOMPOSED',
  site_notes:'HANDOFF_ONLY',special_request:'HANDOFF_ONLY',
});

export const INPLUS_BATHROOM_CANONICAL_MAPPING = Object.freeze(formalMaster.fields.map((field)=>Object.freeze({
  formalFieldId:field.id,
  canonicalField:RAW_ARRAY_FIELDS[field.id]??field.id,
  runtimeKey:RAW_ARRAY_FIELDS[field.id]??field.id,
  uiControl:RAW_ARRAY_FIELDS[field.id]?'NUMBER_GROUP':field.type==='number'||field.type==='integer'?'NUMBER':field.type==='text'?'TEXT':['fixed','derived'].includes(field.type)?'READ_ONLY':'SELECT',
  valueMapping:field.value_source??(field.allowed_values?'IDENTITY_WITH_JAPANESE_LABEL':'DIRECT'),
  applicability:field.applies_when,
  required:field.required_when,
  dependency:unique([...conditionKeys(field.applies_when),...conditionKeys(field.required_when)]),
  resetRule:field.reset_policy,
  handoffKey:field.id,
  role:ROLE_OVERRIDES[field.id]??'SELECTOR',
  status:'MAPPED',
})));

export function verifyInplusBathroomFormalIdentity() {
  return Object.freeze({
    productId:formalMaster.identity.product_id,
    revision:formalMaster.revision,
    formalFileId:INPLUS_BATHROOM_FORMAL_FILE_ID,
    packageFileId:INPLUS_BATHROOM_PACKAGE_FILE_ID,
    declaredSha256:INPLUS_BATHROOM_FORMAL_SHA256,
    fieldCount:formalMaster.fields.length,
    mappedFieldCount:INPLUS_BATHROOM_CANONICAL_MAPPING.filter((row)=>row.status==='MAPPED').length,
    criticalUnmappedCount:INPLUS_BATHROOM_CANONICAL_MAPPING.filter((row)=>row.status==='ERROR').length,
    controlledUnresolvedCount:formalMaster.controlled_unresolved.length,
  });
}

function allowedGlassValues(fieldId,selection) {
  return unique(formalMaster.glass_variants.filter((variant)=>glassAxes.every((axis)=>{
    if (axis===fieldId) return true;
    const selected=selection[axis];
    return selected===null||selected===undefined||selected===''||Object.is(variant[axis],selected);
  })).map((variant)=>variant[fieldId]));
}

function fieldAllowedValues(field,selection) {
  if (field.value_source==='glass_variants') return allowedGlassValues(field.id,selection);
  if (field.type==='derived') {
    if (field.id==='frame') return selection.window_type==='sliding'?['partition']:selection.window_type==='casement'?['bath_casement']:[];
    return [];
  }
  return field.allowed_values??[];
}

function fixedOrDerivedValue(field,selection,allowed) {
  if (field.fixed_value!==undefined) return field.fixed_value;
  if (field.id==='frame') return allowed[0]??null;
  return null;
}

function normalizeSelection(input={}) {
  let selection={product_variant:INPLUS_BATHROOM_VARIANT};
  for (const field of formalMaster.fields) {
    if (RAW_ARRAY_FIELDS[field.id]) {
      const legacy=Array.isArray(input[field.id])?input[field.id]:[];
      RAW_ARRAY_FIELDS[field.id].forEach((key,index)=>{
        const value=numberOrNull(input[key]??legacy[index]);
        if (value!==null) selection[key]=value;
      });
      continue;
    }
    const raw=input[field.id];
    if (raw===undefined||raw===null||raw==='') continue;
    if (['number','integer'].includes(field.type)) {
      const value=numberOrNull(raw);
      if (value!==null) selection[field.id]=field.type==='integer'?Math.trunc(value):value;
    } else selection[field.id]=raw;
  }
  for (let pass=0;pass<formalMaster.fields.length+2;pass++) {
    const before=JSON.stringify(selection);
    for (const field of formalMaster.fields) {
      const applies=conditionMatches(field.applies_when,selection);
      const decomposed=RAW_ARRAY_FIELDS[field.id];
      if (!applies) {
        if (decomposed) for (const key of decomposed) delete selection[key];
        else delete selection[field.id];
        continue;
      }
      const allowed=fieldAllowedValues(field,selection);
      const automatic=fixedOrDerivedValue(field,selection,allowed);
      if (automatic!==null) selection[field.id]=automatic;
      else if (field.default!==undefined&&selection[field.id]===undefined) selection[field.id]=field.default;
      else if (['enum','dependent_enum'].includes(field.type)&&selection[field.id]!==undefined&&!allowed.some((value)=>Object.is(value,selection[field.id]))) delete selection[field.id];
    }
    if (before===JSON.stringify(selection)) break;
  }
  return selection;
}

function fieldRows(selection) {
  const rows=[];
  for (const field of formalMaster.fields) {
    if (!conditionMatches(field.applies_when,selection)) continue;
    const required=conditionMatches(field.required_when,selection);
    if (RAW_ARRAY_FIELDS[field.id]) {
      RAW_ARRAY_FIELDS[field.id].forEach((key,index)=>rows.push({
        key,displayLabel:`${field.label.replace(/W1,W2,W3|H1,H2,H3|対角L1,L2|各辺のたわみ/g,'').trim()}${({raw_widths:['W1','W2','W3'],raw_heights:['H1','H2','H3'],raw_diagonals:['L1','L2'],edge_bends:['上辺','右辺','下辺','左辺']})[field.id][index]}`,
        dataType:'NUMBER',unit:field.unit??'mm',step:field.precision??'any',required:false,values:[],parentFields:conditionKeys(field.applies_when),formalFieldId:field.id,
      }));
      continue;
    }
    const allowed=fieldAllowedValues(field,selection);
    const readOnly=['fixed','derived'].includes(field.type);
    rows.push({
      key:field.id,displayLabel:field.label,
      dataType:['number','integer'].includes(field.type)?'NUMBER':field.type==='text'?'TEXT':'ENUM',
      unit:field.unit??null,step:field.precision??(field.type==='integer'?1:null),required,readOnly,
      values:allowed.map((value)=>({value,displayLabel:displayLabel(value),manualCheck:false,disabled:false})),
      parentFields:unique([...conditionKeys(field.applies_when),...(field.value_source==='glass_variants'?glassAxes.filter((key)=>key!==field.id):[])]),
      formalFieldId:field.id,
      helpText:field.unknown_behavior?'未確認の値は0に置き換えず、積算確認事項として引き継ぎます。':null,
    });
  }
  return rows;
}

function selectedGlassVariants(selection) {
  return formalMaster.glass_variants.filter((variant)=>glassAxes.every((axis)=>selection[axis]===undefined||Object.is(variant[axis],selection[axis])));
}

function evaluateDimension(selection) {
  const width=numberOrNull(selection.width),height=numberOrNull(selection.height);
  if (width===null||height===null||!selection.window_type||!selection.fit||!selection.glass_design) return null;
  const blind=selection.glass_design==='blind_in';
  const rule=formalMaster.dimensions.find((row)=>row.window_type===selection.window_type&&(Array.isArray(row.fit)?row.fit.includes(selection.fit):row.fit===selection.fit)&&(row.glass_design_is_blind===undefined||row.glass_design_is_blind===blind));
  if (!rule) return {status:'BLOCKED',code:'INPLUS_BATHROOM_DIMENSION_RULE_MISSING',message:'この条件の正式寸法Ruleがありません。'};
  if (width<rule.width_min||width>rule.width_max||height<rule.height_min||height>rule.height_max) return {status:'BLOCKED',code:'INPLUS_BATHROOM_DIMENSION_OUT_OF_RANGE',message:`発注寸法は W ${rule.width_min}～${rule.width_max} / H ${rule.height_min}～${rule.height_max} mm の範囲外です。`,matchedRuleIds:[rule.id]};
  if (selection.window_type==='sliding'&&rule.graph_vertices?.length===2) {
    const [[x1,y1],[x2,y2]]=rule.graph_vertices;
    const graphLimit=width<=x1?y1:width>=x2?rule.height_max:y1+(y2-y1)*(width-x1)/(x2-x1);
    const expressionLimit=Math.min(rule.height_max,1.7*width);
    const lower=Math.min(graphLimit,expressionLimit),upper=Math.max(graphLimit,expressionLimit);
    if (height>upper) return {status:'BLOCKED',code:'INPLUS_BATHROOM_SLOPE_OUT_OF_RANGE',message:'入力寸法は正式資料の斜辺解釈をすべて超えるため成立しません。',matchedRuleIds:[rule.id]};
    if (height>lower) return {status:'REVIEW_REQUIRED',code:'INPLUS_BATHROOM_SLOPE_CONFIRM',message:'斜辺境界の図と式に差があるため、正式製作可否をLIXILへ確認します。',matchedRuleIds:[rule.id,'IB-G001']};
  }
  const tempered=String(selection.glass_design??'').startsWith('tempered_');
  if (tempered) {
    const single=selection.glass_family==='single';
    const limits=selection.window_type==='sliding'?[584,367]:single?[365,421]:[385,441];
    if (width<limits[0]&&height<limits[1]) return {status:'BLOCKED',code:'INPLUS_BATHROOM_TEMPERED_TOO_SMALL',message:`強化ガラスは W ${limits[0]} 未満かつ H ${limits[1]} 未満のため成立しません。`,matchedRuleIds:['IB-R-TEMPERED']};
  }
  return {status:'PASS',code:'INPLUS_BATHROOM_DIMENSION_PASS',message:'Formal v1.0の自動判定範囲内です。',matchedRuleIds:[rule.id]};
}

function positionErrors(selection) {
  const errors=[];
  const height=numberOrNull(selection.height);
  if (!height) return errors;
  if (selection.window_type==='sliding'&&selection.position_mode==='custom'&&selection.crescent_p!==undefined) {
    const p=Number(selection.crescent_p),fit=selection.fit;
    const bands=formalMaster.rules.find((row)=>row.id==='IB-R-POSITION').sliding_custom[fit]??[];
    const band=bands.find((row)=>height>=row.H[0]&&height<=row.H[1]);
    const value=(raw)=>typeof raw==='number'?raw:raw==='H/4'?height/4:raw==='3H/4'?3*height/4:raw==='H/4+14'?height/4+14:raw==='3H/4+14'?3*height/4+14:NaN;
    const valid=band&&p>=value(band.Pmin)&&p<=value(band.Pmax)&&height-p>=166.5&&(band.HminusPmax===undefined||height-p<=band.HminusPmax);
    if (!valid) errors.push({errorCode:'INPLUS_BATHROOM_CRESCENT_P_OUT_OF_RANGE',field:'crescent_p',message:'指定クレセント位置PがFormal v1.0の範囲外です。'});
  }
  if (selection.window_type==='casement'&&selection.handle_position_mode==='custom'&&selection.handle_p!==undefined) {
    const p=Number(selection.handle_p),band=formalMaster.rules.find((row)=>row.id==='IB-R-POSITION').casement_custom.find((row)=>height>=row.H[0]&&height<=row.H[1]);
    const value=(raw)=>typeof raw==='number'?raw:raw==='H-130'?height-130:raw==='H/4'?height/4:raw==='3H/4'?3*height/4:NaN;
    if (!band||p<value(band.Pmin)||p>value(band.Pmax)) errors.push({errorCode:'INPLUS_BATHROOM_HANDLE_P_OUT_OF_RANGE',field:'handle_p',message:'指定ハンドル位置PがFormal v1.0の範囲外です。'});
  }
  return errors;
}

function siteErrors(selection) {
  const errors=[];
  if (selection.bath_bay_window==='present') errors.push({errorCode:'INPLUS_BATHROOM_BAY_WINDOW_FORBIDDEN',field:'bath_bay_window',message:'浴室出窓には取付できません。'});
  if (selection.window_type==='sliding'&&selection.fit==='unit_bath'&&selection.outer_sash_material==='resin') errors.push({errorCode:'INPLUS_BATHROOM_OUTER_RESIN_FORBIDDEN',field:'outer_sash_material',message:'引違い窓・ユニットバス納まりでは既存外窓が樹脂の場合は成立しません。'});
  if (Number(selection.water_slope_deg)>1) errors.push({errorCode:'INPLUS_BATHROOM_WATER_SLOPE_FORBIDDEN',field:'water_slope_deg',message:'水勾配が1度を超えるため成立しません。'});
  if (selection.mounting_surface_step==='present') errors.push({errorCode:'INPLUS_BATHROOM_MOUNTING_STEP_FORBIDDEN',field:'mounting_surface_step',message:'取付面に段差があるため成立しません。'});
  if (selection.window_type==='casement'&&selection.fit==='unit_bath'&&selection.surround_material==='resin'&&selection.resin_trim_clearance!==undefined&&Number(selection.resin_trim_clearance)<30) errors.push({errorCode:'INPLUS_BATHROOM_RESIN_CLEARANCE_FORBIDDEN',field:'resin_trim_clearance',message:'樹脂額縁室内面から30mm未満のため成立しません。'});
  if (selection.step_relief==='requested'&&selection.outer_angle_height!==undefined&&Number(selection.outer_angle_height)>3) errors.push({errorCode:'INPLUS_BATHROOM_STEP_RELIEF_ANGLE_FORBIDDEN',field:'outer_angle_height',message:'既存外窓アングル高さが3mmを超えるため段差緩和部材は成立しません。'});
  if (selection.grille_request==='requested') errors.push({errorCode:'INPLUS_BATHROOM_GRILLE_AUTO_FULFILLMENT_FORBIDDEN',field:'grille_request',message:'単板の格子希望は完成品へ自動付属できません。特別希望欄で別手配可否を積算へ確認してください。'});
  const depthRule=formalMaster.rules.find((row)=>row.id==='IB-R-DEPTH');
  let requiredDepth=null;
  if (selection.window_type==='sliding'&&selection.fit==='unit_bath') requiredDepth=depthRule.sliding_unit[selection.unit_pattern];
  if (selection.window_type==='sliding'&&selection.fit==='tile') requiredDepth=selection.water_prevention==='requested'?depthRule.sliding_tile_water:depthRule.sliding_tile;
  if (selection.window_type==='casement') requiredDepth=selection.fit==='unit_bath'?depthRule.casement_unit:depthRule.casement_tile;
  if (requiredDepth&&selection.effective_depth!==undefined&&Number(selection.effective_depth)<requiredDepth) errors.push({errorCode:'INPLUS_BATHROOM_DEPTH_INSUFFICIENT',field:'effective_depth',message:`有効取付奥行きは ${requiredDepth}mm 以上必要です。`});
  const widths=RAW_ARRAY_FIELDS.raw_widths.map((key)=>selection[key]).filter(Number.isFinite);
  const heights=RAW_ARRAY_FIELDS.raw_heights.map((key)=>selection[key]).filter(Number.isFinite);
  if (widths.length===3&&Math.max(...widths)-Math.min(...widths)>3) errors.push({errorCode:'INPLUS_BATHROOM_WIDTH_SPREAD_FORBIDDEN',field:'raw_width_1',message:'W1～W3の差が3mmを超えています。'});
  if (heights.length===3&&Math.max(...heights)-Math.min(...heights)>3) errors.push({errorCode:'INPLUS_BATHROOM_HEIGHT_SPREAD_FORBIDDEN',field:'raw_height_1',message:'H1～H3の差が3mmを超えています。'});
  if (selection.window_type==='casement'&&RAW_ARRAY_FIELDS.edge_bends.some((key)=>selection[key]!==undefined&&Math.abs(Number(selection[key]))>1.5)) errors.push({errorCode:'INPLUS_BATHROOM_EDGE_BEND_FORBIDDEN',field:'edge_bend_top',message:'各辺のたわみは±1.5mm以内が必要です。'});
  return errors;
}

function activeGap(gap,selection,dimension) {
  if (gap.id==='IB-G001') return selection.window_type==='sliding'&&Boolean(dimension);
  if (gap.id==='IB-G002') return selection.window_type==='sliding'&&selection.fit==='unit_bath'&&['B','C'].includes(selection.unit_pattern)&&[10,20,25].includes(Number(selection.unit_lower_step));
  if (gap.id==='IB-G003') return Boolean(selection.window_type&&selection.glass_family&&selection.glass_design);
  if (gap.id==='IB-G004') return selection.window_type==='sliding'&&(selection.position_mode==='custom'||selection.grille_request==='requested');
  if (gap.id==='IB-G005') return ['unknown',undefined].includes(selection.surround_material)||['unknown',undefined].includes(selection.outer_sash_material)||selection.support_checked!=='confirmed'||selection.effective_depth===undefined||Number(selection.water_slope_deg)===1;
  if (gap.id==='IB-G006') return Boolean(String(selection.special_request??'').trim());
  if (gap.id==='IB-G007') return true;
  return false;
}

function arrayValue(selection,formalField) {
  const values=RAW_ARRAY_FIELDS[formalField].map((key)=>selection[key]);
  return values.some((value)=>value!==undefined)?values.map((value)=>value??null):null;
}

function handoff(selection,gaps,glassVariants,dimension) {
  const normalized={};
  for (const field of formalMaster.fields) {
    if (RAW_ARRAY_FIELDS[field.id]) {
      const values=arrayValue(selection,field.id);
      if (values) normalized[field.id]=values;
    } else if (selection[field.id]!==undefined) normalized[field.id]=selection[field.id];
  }
  const active=gaps.filter((row)=>row.active);
  return {
    manufacturer:'LIXIL',product:'インプラス',product_variant:'浴室仕様',formal_product_id:formalMaster.identity.product_id,
    formal_revision:formalMaster.revision,business_scope:formalMaster.business_scope,baseline:'LIXIL SN4200 2026年09月版',
    quantity:selection.quantity??null,selection:normalized,
    glass_supply_candidates:unique(glassVariants.map((row)=>row.supply)),
    final_glass_specification:'MANUFACTURER_ESTIMATE_CONFIRMATION',dimension_status:dimension?.status??'INCOMPLETE',
    controlled_unresolved:gaps,active_confirmation_count:active.length,
    confirmation_questions:active.map((row)=>({gap_id:row.gap_id,status:row.status,condition:row.target_condition,question:row.confirmation_question,confirmation_to:row.confirmation_to})),
    price:'ESTIMATE_CONFIRM_REQUIRED',bom:'ESTIMATE_CONFIRM_REQUIRED',order_ready:false,
    evidence_identity:formalMaster.evidence_identity,source_ids:formalMaster.sources.map((row)=>row.id),
  };
}

export function resolveInplusBathroomFormal(input={}) {
  const selection=normalizeSelection(input);
  const fields=fieldRows(selection);
  const missingRequiredFields=fields.filter((field)=>field.required&&(selection[field.key]===undefined||selection[field.key]===null||selection[field.key]===''||(Array.isArray(selection[field.key])&&!selection[field.key].length))).map((field)=>field.key);
  const dimensionResult=evaluateDimension(selection);
  const errors=[...positionErrors(selection),...siteErrors(selection)];
  if (dimensionResult?.status==='BLOCKED') errors.push({errorCode:dimensionResult.code,field:'width',message:dimensionResult.message});
  const glassVariants=selectedGlassVariants(selection);
  if (selection.window_type&&selection.glass_family&&selection.glass_design&&!glassVariants.length) errors.push({errorCode:'INPLUS_BATHROOM_GLASS_COMBINATION_FORBIDDEN',field:'glass_design',message:'選択したガラス組合せはFormal v1.0に存在しません。'});
  const controlled=formalMaster.controlled_unresolved.map((gap)=>({
    gap_id:gap.id,status:gap.status,original_status:gap.original_status,classification:gap.classification,target_condition:gap.target_condition,
    reason:gap.reason,evidence_state:gap.evidence_state,active:activeGap(gap,selection,dimensionResult),
    auto_resolved:false,confirmation_question:gap.confirmation_question,confirmation_to:gap.confirmation_contact,reopen_condition:gap.reopen_condition,
  }));
  const active=controlled.filter((row)=>row.active);
  const confirmationRequests=active.map((row)=>({code:row.gap_id,status:row.status,condition:row.target_condition,confirmation_to:row.confirmation_to,question:row.confirmation_question,message:row.reason}));
  const ready=!errors.length&&!missingRequiredFields.length;
  const status=errors.length?'INVALID':missingRequiredFields.length?'INCOMPLETE':active.length||dimensionResult?.status==='REVIEW_REQUIRED'?'MANUAL_CHECK':'PASS';
  return {
    selection,fields,confirmationRequests,
    sales_request_handoff:handoff(selection,controlled,glassVariants,dimensionResult),
    sales_request_state:ready?'READY_FOR_MANUFACTURER_ESTIMATE':'INCOMPLETE',
    notices:['浴室仕様 Formal v1.0 / LIXIL SN4200 2026年09月版','営業見積依頼用。価格・BOM・最終発注可否は積算確認へ引き継ぎます。'],
    manualWarnings:active.length?[`未確定事項 ${active.length}件を自動確定せず、確認事項として引き継ぎます。`]:[],
    validation:{status,errors,missingRequiredFields},clearedFields:Object.keys(input).filter((key)=>key!=='product_variant'&&selection[key]===undefined),
    orderReady:false,dimensionResult,
    runtimeMaster:{
      masterVersion:'v1.0',packageVersion:'v1.0',schemaVersion:formalMaster.schema_version,adapterType:'INPLUS_BATHROOM_FORMAL_V1',
      sourceHash:INPLUS_BATHROOM_FORMAL_SHA256,canonicalRuntimeReference:{formalProductMasterDriveFileId:INPLUS_BATHROOM_FORMAL_FILE_ID,formalPackageDriveFileId:INPLUS_BATHROOM_PACKAGE_FILE_ID},
      productMasterFormalReference:{packageVersion:'v1.0',revision:'v1.0',formalDriveFileId:INPLUS_BATHROOM_FORMAL_FILE_ID,formalPackageDriveFileId:INPLUS_BATHROOM_PACKAGE_FILE_ID,runtimeScope:formalMaster.runtime_scope},
      sourcePackageIntegrity:{expected:INPLUS_BATHROOM_FORMAL_SHA256,actual:INPLUS_BATHROOM_FORMAL_SHA256,match:true,manifestDriveFileId:INPLUS_BATHROOM_FORMAL_FILE_ID,files:[{fileId:INPLUS_BATHROOM_FORMAL_FILE_ID,sha256:INPLUS_BATHROOM_FORMAL_SHA256}]},
      productVariant:'bathroom',formalSelectionScopeId:formalMaster.formal_selection_scope_id,evidenceIdentity:formalMaster.evidence_identity,
    },
  };
}

export { formalMaster as inplusBathroomFormalMaster };
