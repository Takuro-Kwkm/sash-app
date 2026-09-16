import { createModel, ACTIVE, has, uniq, clone, same, meaningfulHanding, selectedOne, sourceSpecId, sourceWindowId, baseValueRows } from './canonical-workbook-reference-v1-model.mjs';

const FORMAL_SELECTOR_KEYS = Object.freeze(['glass_configuration','profile','opening_class','panel_count','sill','wall_finish','configuration_variant']);
const RAW_SELECTOR_KEY = Object.freeze({ configuration_variant:'variant' });
const FORMAL_SELECTOR_WINDOWS = new Set(['WT-EW-HIKICHIGAI','WT-EW-SHUTTER-HIKI']);
const selectorRawKey = (key) => RAW_SELECTOR_KEY[key] ?? key;
const requirement = (field, required, visible = true) => ({ field, required, visible });
const uniqueWarnings = (values) => [...new Set(values.filter(Boolean))];

function selectorDimensions(model) {
  const raw = Array.isArray(model.selectorModel?.dimensions) ? model.selectorModel.dimensions : [];
  const byRawKey = new Map(raw.map((row) => [typeof row === 'string' ? row : row?.key, row]));
  return FORMAL_SELECTOR_KEYS.map((key) => {
    const rawKey = selectorRawKey(key);
    const source = byRawKey.get(rawKey);
    if (!source) return null;
    if (typeof source === 'string') return { key, rawKey, display_name:key, allowed_values:[] };
    return { ...source, key, rawKey };
  }).filter(Boolean);
}

function selectorDisplayValue(key, rawValue) {
  if (key === 'panel_count') return rawValue === null || rawValue === undefined ? 'NULL(HKK)' : String(rawValue);
  return rawValue === null || rawValue === undefined ? null : String(rawValue);
}

function selectorRawValue(key, displayValue) {
  if (key === 'panel_count') {
    if (displayValue === 'NULL(HKK)') return null;
    if (String(displayValue) === '2' || String(displayValue) === '4') return Number(displayValue);
  }
  return displayValue;
}

function selectorValueEquals(key, displayValue, rawValue) {
  return same(selectorRawValue(key, displayValue), rawValue) || String(selectorRawValue(key, displayValue)) === String(rawValue);
}

function augmentModelForFormalSelectors(model) {
  const dimensions = selectorDimensions(model);
  if (!dimensions.length) return { ...model, formalSelectorDimensions:[] };
  const fields = [...model.fields];
  const values = [...model.values];
  for (const [index, dimension] of dimensions.entries()) {
    const key = dimension.key;
    if (!fields.some((field) => field.field_name === key)) {
      fields.push({
        field_name:key,
        display_label:dimension.display_name ?? key,
        display_order:41 + index,
        data_type:'enum',
        parent_fields:['window_type'],
        required_mode:'OPTIONAL',
        selection_mode:'USER_SELECTABLE',
        runtime_included:true,
      });
    }
    const candidates = uniq([
      ...(dimension.allowed_values ?? []).map((value) => String(value)),
      ...(model.selectorCombos ?? []).map((row) => selectorDisplayValue(key,row?.[dimension.rawKey])).filter(has),
    ], (value) => String(value));
    for (const value of candidates) {
      if (values.some((row) => row.field_name === key && String(row.canonical_value) === String(value))) continue;
      values.push({
        value_id:`${key}:${value}`,
        field_name:key,
        canonical_value:value,
        display_label:String(value),
        status:'CURRENT',
        manual_check:false,
        user_selectable:true,
        runtime_selectable:true,
        source:{ formalSelectorModel:true, rawKey:dimension.rawKey },
      });
    }
  }
  return {
    ...model,
    fields,
    values,
    formalSelectorDimensions:dimensions.map((row) => row.key),
    formalSelectorDimensionDefs:dimensions,
  };
}

function formalSelectorKeys(model) { return model.formalSelectorDimensions ?? []; }
function formalSelectorApplies(model, selection) {
  if (!formalSelectorKeys(model).length) return false;
  const windowId = selection?.window_type;
  if (FORMAL_SELECTOR_WINDOWS.has(windowId)) return true;
  return windowId === (model.selectorModel?.window_id ?? model.selectorModel?.window_type);
}
function selectorTupleMatches(model, row, selection, keys) {
  for (const key of keys) {
    if (!has(selection?.[key])) continue;
    if (!selectorValueEquals(key,selection[key],row?.[selectorRawKey(key)])) return false;
  }
  return true;
}
function formalSelectorState(model, selection) {
  const keys = formalSelectorKeys(model);
  if (!keys.length || !formalSelectorApplies(model,selection)) return null;
  const candidates = (model.selectorCombos ?? []).filter((row)=>selectorTupleMatches(model,row,selection,keys));
  const completed = keys.every((key)=>has(selection[key]));
  const exact = completed ? candidates.find((row)=>keys.every((key)=>selectorValueEquals(key,selection[key],row?.[selectorRawKey(key)]))) : null;
  return { keys, candidates, completed, exact };
}
function formalRuleSelector(rule) { return rule?.selector_json ?? rule?.selector ?? {}; }
function formalRuleWindow(rule) {
  const selector = formalRuleSelector(rule);
  if (has(selector.window_type)) return selector.window_type;
  const productNode = rule?.product_node ?? rule?.productNode ?? rule?.windowId;
  return has(productNode) ? String(productNode).split('::')[0] : null;
}
function formalRuleSpec(rule) {
  const selector = formalRuleSelector(rule);
  return selector.specific_spec ?? selector.window_spec ?? null;
}

function visibleFieldMapToBridgeState(model, selection, fieldList, errors, warnings, clearedFields) {
  const visibleByKey = new Map(fieldList.map((field)=>[field.field_name,field]));
  const fields = {};
  for (const def of model.fields) {
    const visible = visibleByKey.get(def.field_name);
    const value = has(selection[def.field_name]) || Array.isArray(selection[def.field_name]) ? clone(selection[def.field_name]) : null;
    const allowedValues = visible ? (visible.values ?? []).map((row)=>row?.canonical_value ?? row).filter((value)=>value !== undefined) : [];
    const readOnly = Boolean(visible?.readOnly || (def.selection_mode === 'AUTO_RESOLVE' && allowedValues.length === 1));
    fields[def.field_name] = {
      value,
      state: !visible ? 'NOT_APPLICABLE' : value === null ? 'UNSET' : readOnly ? 'RESOLVED' : 'SELECTED',
      visibility: visible ? 'SHOW' : 'HIDE',
      required:Boolean(visible?.required),
      allowed_values:allowedValues,
      readOnly,
      display_label:visible?.display_label ?? def.display_label ?? null,
      unit:def.unit ?? null,
    };
  }
  const missing = Object.entries(fields).filter(([,state])=>state.visibility==='SHOW' && state.required && !has(state.value)).map(([name])=>name);
  const uniqueErrors = uniq(errors,(row)=>JSON.stringify([row.code,row.field,row.value,row.message]));
  const manualCheck = warnings.length > 0;
  const status = uniqueErrors.length ? 'INVALID' : missing.length ? 'INCOMPLETE' : manualCheck ? 'MANUAL_CHECK' : 'VALID';
  return {
    fields,
    derived_components:new Set(),
    derived_entities:[],
    derived_options:[],
    warnings:uniqueWarnings(warnings),
    matched_invalid_rules:uniqueErrors.filter((row)=>row.ruleId).map((row)=>row.ruleId),
    errors:uniqueErrors,
    status,
    missing_required_fields:missing,
    cleared_fields:[...new Set(clearedFields)].map((field)=>({field,reason:'DEPENDENCY'})),
    order_ready:status === 'VALID',
  };
}

function resolveModel(model, inputSelection = {}) {
  const selection = clone(inputSelection ?? {});
  const clearedFields = [];
  const errors = [];
  const warnings = [];
  const fields = [];
  const pushField = (field_name, values, required=false, visible=true, extra={}) => {
    const prior = fields.findIndex((field)=>field.field_name===field_name);
    const next = { field_name, values, ...requirement(field_name,required,visible), ...extra };
    if (prior >= 0) fields[prior] = next; else fields.push(next);
  };
  const clearField = (key) => {
    if (has(selection[key]) || Array.isArray(selection[key])) {
      delete selection[key];
      clearedFields.push(key);
    }
  };

  const windowRows = baseValueRows(model,'window_type');
  pushField('window_type',windowRows,true,true);
  const windowId = selectedOne(selection,'window_type');
  if (!windowId) return visibleFieldMapToBridgeState(model,selection,fields,errors,warnings,clearedFields);
  const window = model.windows.find((row)=>same(row.id,windowId));
  if (!window) errors.push({code:'INVALID_WINDOW_TYPE',field:'window_type',value:windowId});

  const specRows = baseValueRows(model,'window_spec').filter((row)=>same(sourceWindowId(row.source),windowId));
  if (specRows.length) pushField('window_spec',specRows,true,true,{display_label:window?.spec_type ?? '窓種固有仕様'});
  let specId = selectedOne(selection,'window_spec');
  if (specId && !specRows.some((row)=>same(row.canonical_value,specId))) { clearField('window_spec'); specId=null; }

  if (formalSelectorApplies(model,selection)) {
    let running = model.selectorCombos ?? [];
    for (const key of formalSelectorKeys(model)) {
      const rawKey = selectorRawKey(key);
      const values = uniq(running.map((row)=>selectorDisplayValue(key,row?.[rawKey])).filter(has),(value)=>String(value)).map((value)=>
        baseValueRows(model,key).find((row)=>String(row.canonical_value)===String(value)) ?? ({
          value_id:`${key}:${value}`,field_name:key,canonical_value:value,display_label:String(value),status:'CURRENT',manual_check:false,user_selectable:true,runtime_selectable:true,source:{formalSelectorModel:true,rawKey},
        })
      );
      pushField(key,values,true,true);
      if (has(selection[key])) {
        if (!values.some((row)=>String(row.canonical_value)===String(selection[key]))) {
          const at=formalSelectorKeys(model).indexOf(key);
          clearField(key);
          for (const downstream of formalSelectorKeys(model).slice(at+1)) clearField(downstream);
          break;
        }
        running=running.filter((row)=>selectorValueEquals(key,selection[key],row?.[rawKey]));
      }
    }
    const refreshed=formalSelectorState(model,selection);
    if (refreshed?.completed && !refreshed.exact) errors.push({code:'FORMAL_SELECTOR_COMBINATION_BLOCKED',field:'window_type',value:windowId});
  } else {
    for (const key of formalSelectorKeys(model)) clearField(key);
  }

  const variantRows = baseValueRows(model,'variant').filter((row)=>{
    const rel=model.variantRelations.filter((relation)=>same(relation.variant_id,row.canonical_value));
    return !rel.length || rel.some((relation)=>same(relation.window_id??relation['窓種ID'],windowId));
  });
  if (variantRows.length) pushField('variant',variantRows,false,true);
  if (selection.variant && !variantRows.some((row)=>same(row.canonical_value,selection.variant))) clearField('variant');

  const handingValues = uniq(specRows.flatMap((row)=>meaningfulHanding(row.source?.['開き勝手'] ?? row.source?.handing)),(value)=>value).map((value)=>baseValueRows(model,'handing').find((row)=>same(row.canonical_value,value))).filter(Boolean);
  if (handingValues.length) pushField('handing',handingValues,false,true);
  if (selection.handing && !handingValues.some((row)=>same(row.canonical_value,selection.handing))) clearField('handing');

  const customRules = model.document?.working_extensions?.custom_dimension_rules?.rules ?? [];
  const formalRulesForWindow = customRules.filter((rule)=>{
    if (!same(formalRuleWindow(rule),windowId)) return false;
    const ruleSpec=formalRuleSpec(rule);
    return !specId || !ruleSpec || same(ruleSpec,specId);
  });
  const hasFormalCustom = formalRulesForWindow.length > 0;
  const hasBaselineCustom = model.customRanges.some((row)=>same(row['窓種ID']??row.window_id,windowId) && (!specId || same(row['固有仕様ID']??row.spec_id,specId)));
  const sizeModes = baseValueRows(model,'size_mode').filter((row)=>row.canonical_value==='STANDARD' || (row.canonical_value==='CUSTOM' && (hasFormalCustom||hasBaselineCustom)));
  if (specRows.length === 0 || specId || String(window?.spec_required??'').includes('不要')) pushField('size_mode',sizeModes,true,true);
  if (selection.size_mode && !sizeModes.some((row)=>same(row.canonical_value,selection.size_mode))) clearField('size_mode');

  if (selection.size_mode==='STANDARD') {
    const rows=baseValueRows(model,'size').filter((row)=>same(row.source?.window_id,windowId)&&(!specId||same(row.source?.spec_id,specId)));
    if (rows.length) pushField('size',rows,true,true);
    if (selection.size && !rows.some((row)=>same(row.canonical_value,selection.size))) clearField('size');
    clearField('custom_w'); clearField('custom_h');
  } else if (selection.size_mode==='CUSTOM' && (hasFormalCustom||hasBaselineCustom)) {
    pushField('custom_w',[],true,true); pushField('custom_h',[],true,true); clearField('size');
  }

  const effectiveVariant = selection.variant ?? model.standardVariant;
  const colorRows = model.colors.filter((row)=>!effectiveVariant || row.variant_id===effectiveVariant).filter((row)=>row.available===true||row.available==='○'||row.available==='可');
  const exteriorRows = uniq(colorRows,(row)=>row.exterior_id).map((row)=>baseValueRows(model,'exterior_color').find((value)=>same(value.canonical_value,row.exterior_id))).filter(Boolean);
  if (exteriorRows.length) pushField('exterior_color',exteriorRows,true,true);
  if (selection.exterior_color&&!exteriorRows.some((row)=>same(row.canonical_value,selection.exterior_color))) clearField('exterior_color');
  if (selection.exterior_color) {
    const interiorIds=uniq(colorRows.filter((row)=>same(row.exterior_id,selection.exterior_color)).map((row)=>row.interior_id),(value)=>value);
    const interiorRows=interiorIds.map((value)=>baseValueRows(model,'interior_color').find((row)=>same(row.canonical_value,value))).filter(Boolean);
    if (interiorRows.length) pushField('interior_color',interiorRows,true,true);
    if (selection.interior_color&&!interiorRows.some((row)=>same(row.canonical_value,selection.interior_color))) clearField('interior_color');
  } else clearField('interior_color');

  const windowScreens=model.screens.filter((row)=>same(row.window_id,windowId)&&row.presence==='あり');
  if (windowScreens.length) {
    pushField('screen_presence',baseValueRows(model,'screen_presence'),false,true);
    if (selection.screen_presence==='あり') {
      const forms=uniq(windowScreens.map((row)=>row.screen_type??row.label).filter(has),(value)=>value);
      const formRows=forms.map((value)=>baseValueRows(model,'screen_form').find((row)=>same(row.canonical_value,value))).filter(Boolean);
      if (formRows.length) pushField('screen_form',formRows,false,true);
      const form=selection.screen_form;
      const screenCandidates=windowScreens.filter((row)=>!form||same(row.screen_type??row.label,form));
      const midrails=uniq(screenCandidates.map((row)=>row.midrail).filter((value)=>has(value)&&!['対象外','なし（固定）'].includes(value)),(value)=>value);
      const midrailRows=midrails.map((value)=>baseValueRows(model,'screen_midrail').find((row)=>same(row.canonical_value,value))).filter(Boolean);
      if(midrailRows.length)pushField('screen_midrail',midrailRows,false,true);
      const meshes=uniq(screenCandidates.map((row)=>row.mesh).filter((value)=>has(value)&&value!=='対象外'),(value)=>value);
      const netRows=meshes.map((value)=>baseValueRows(model,'screen_net').find((row)=>same(row.canonical_value,value))).filter(Boolean);
      if(netRows.length)pushField('screen_net',netRows,false,true);
    } else { clearField('screen_form'); clearField('screen_midrail'); clearField('screen_net'); }
  } else { clearField('screen_presence'); clearField('screen_form'); clearField('screen_midrail'); clearField('screen_net'); }

  let glassRows=[];
  if (formalSelectorApplies(model,selection) && has(selection.glass_configuration)) {
    const triple=selection.glass_configuration==='TRIPLE';
    glassRows=baseValueRows(model,'glass_base').filter((row)=>{
      const category=String(row.source?.['ガラス大分類']??row.display_label??'');
      return triple ? category.includes('トリプル') : !category.includes('トリプル');
    });
  } else if (selection.size_mode==='STANDARD' && selection.size) {
    const sizeRow=baseValueRows(model,'size').find((row)=>same(row.canonical_value,selection.size));
    const ids=sizeRow?.source?.glass_ids??[];
    glassRows=baseValueRows(model,'glass_base').filter((row)=>ids.some((id)=>same(id,row.canonical_value)));
  } else glassRows=baseValueRows(model,'glass_base');
  if (glassRows.length) pushField('glass_base',glassRows,true,true);
  if(selection.glass_base&&!glassRows.some((row)=>same(row.canonical_value,selection.glass_base))) clearField('glass_base');
  if(selection.glass_base){
    const detailRows=baseValueRows(model,'glass_detail').filter((row)=>same(row.source?.glass_id,selection.glass_base));
    if(detailRows.length)pushField('glass_detail',detailRows,false,true);
    const functionRows=baseValueRows(model,'glass_function').filter((row)=>same(row.source?.['対象glass_id'],selection.glass_base));
    if(functionRows.length)pushField('glass_function',functionRows,false,true);
    const glass=model.glasses.find((row)=>same(row.id,selection.glass_base));
    const selectedDetail=detailRows.find((row)=>same(row.canonical_value,selection.glass_detail));
    const spacer=selectedDetail?.source?.['スペーサー']??glass?.spacer??glass?.['スペーサー'];
    const gas=selectedDetail?.source?.['ガス']??glass?.gas??glass?.['基本ガス'];
    if(has(spacer)){
      const rows=baseValueRows(model,'glass_spacer').filter((row)=>same(row.canonical_value,spacer));
      if(rows.length)pushField('glass_spacer',rows,false,true,{readOnly:true});
      if(!has(selection.glass_spacer))selection.glass_spacer=spacer;
    }
    if(has(gas)){
      const rows=baseValueRows(model,'glass_air_layer').filter((row)=>same(row.canonical_value,gas));
      if(rows.length)pushField('glass_air_layer',rows,false,true,{readOnly:true});
      if(!has(selection.glass_air_layer))selection.glass_air_layer=gas;
    }
  } else { clearField('glass_detail'); clearField('glass_function'); clearField('glass_spacer'); clearField('glass_air_layer'); }

  const optionRows=baseValueRows(model,'option').filter((row)=>{
    const source=row.source??{};
    return source.window_id==='*'||!has(source.window_id)||same(source.window_id,windowId);
  });
  if(optionRows.length)pushField('option',optionRows,false,true);

  if (selection.size_mode==='CUSTOM' && has(selection.custom_w) && has(selection.custom_h)) {
    const w=Number(selection.custom_w),h=Number(selection.custom_h);
    if(!Number.isFinite(w))errors.push({code:'CUSTOM_SIZE_INVALID_NUMBER',field:'custom_w'});
    if(!Number.isFinite(h))errors.push({code:'CUSTOM_SIZE_INVALID_NUMBER',field:'custom_h'});
    if(Number.isFinite(w)&&Number.isFinite(h)){
      const applicable=formalRulesForWindow.filter((rule)=>{
        const selector=formalRuleSelector(rule);
        if(selector.selector_id && formalSelectorApplies(model,selection)){
          const exact=formalSelectorState(model,selection)?.exact;
          if(!exact||!same(selector.selector_id,exact.selector_id))return false;
        }
        if(selector.glass_base){
          const ids=Array.isArray(selector.glass_base)?selector.glass_base:[selector.glass_base];
          if(selection.glass_base&&!ids.includes(selection.glass_base))return false;
        }
        return true;
      });
      if (formalSelectorApplies(model,selection) && !formalSelectorState(model,selection)?.completed) errors.push({code:'MISSING_SELECTOR',field:'size_mode',value:'CUSTOM'});
      else if(applicable.length){
        const inside=applicable.some((rule)=>{
          const geometry=rule.geometry_rule_json??{};
          if(geometry.type==='AUTO_RECT'&&typeof geometry.bounds==='string'){
            const wm=geometry.bounds.match(/(-?\d+(?:\.\d+)?)<=W<=(-?\d+(?:\.\d+)?)/);
            const hm=geometry.bounds.match(/(-?\d+(?:\.\d+)?)<=H<=(-?\d+(?:\.\d+)?)/);
            return (!wm||(w>=Number(wm[1])&&w<=Number(wm[2])))&&(!hm||(h>=Number(hm[1])&&h<=Number(hm[2])));
          }
          if(geometry.type==='AUTO_POLYGON'&&Array.isArray(geometry.points)){
            let insidePoly=false; const points=geometry.points;
            for(let i=0,j=points.length-1;i<points.length;j=i++){
              const [xi,yi]=points[i],[xj,yj]=points[j];
              const intersects=((yi>h)!==(yj>h))&&(w<(xj-xi)*(h-yi)/(yj-yi)+xi);
              if(intersects)insidePoly=!insidePoly;
            }
            const onBoundary=points.some(([x1,y1],i)=>{
              const [x2,y2]=points[(i+1)%points.length];
              const cross=(w-x1)*(y2-y1)-(h-y1)*(x2-x1);
              if(Math.abs(cross)>1e-7)return false;
              return w>=Math.min(x1,x2)&&w<=Math.max(x1,x2)&&h>=Math.min(y1,y2)&&h<=Math.max(y1,y2);
            });
            return insidePoly||onBoundary;
          }
          return true;
        });
        if(!inside)errors.push({code:'CUSTOM_SIZE_OUT_OF_RANGE',field:'size',message:'入力寸法は正式Runtimeの特注製作範囲外です。'});
      } else if(hasFormalCustom) errors.push({code:'CUSTOM_SELECTOR_RULE_NOT_FOUND',field:'size_mode'});
      else {
        const matches=model.customRanges.filter((row)=>{
          if(!same(row['窓種ID']??row.window_id,windowId))return false;
          if(specId&&!same(row['固有仕様ID']??row.spec_id,specId))return false;
          return w>=Number(row['W_MIN(mm)'])&&w<=Number(row['W_MAX(mm)'])&&h>=Number(row['H_MIN(mm)'])&&h<=Number(row['H_MAX(mm)']);
        });
        if(!matches.length)errors.push({code:'CUSTOM_SIZE_OUT_OF_RANGE',field:'size',message:'入力寸法は正式Runtimeの特注製作範囲外です。'});
      }
    }
  }

  const selectorAfter=formalSelectorState(model,selection);
  if(selectorAfter?.completed&&!selectorAfter.exact)errors.push({code:'UNREACHABLE_TUPLE',field:'window_type',value:windowId});
  const glassContract=model.document?.working_extensions?.glass_manufacturability;
  if(selection.glass_base&&glassContract?.exact_matrix_status==='ESTIMATE_CONFIRM_REQUIRED') warnings.push(glassContract.user_facing_requirement??'メーカー見積で最終確認してください。');
  return visibleFieldMapToBridgeState(model,selection,fields,errors,warnings,clearedFields);
}

export function adaptCanonicalWorkbookReferenceV1(runtimePackage) {
  const document = runtimePackage?.documents?.runtime_master ?? runtimePackage?.documents?.RUNTIME_MASTER ?? Object.values(runtimePackage?.documents ?? {})[0];
  if (!document) {
    const error = new Error('Canonical workbook Runtime package is missing runtime_master document');
    error.code = 'RUNTIME_ADAPTER_SCHEMA_MISMATCH';
    throw error;
  }
  const baseModel=createModel(document);
  const model=augmentModelForFormalSelectors(baseModel);
  const master = Object.freeze({
    fields:Object.freeze(model.fields.map((row)=>Object.freeze(row))),
    values:Object.freeze(model.values.map((row)=>Object.freeze(row))),
    capabilities:Object.freeze({
      runtimeContract:document.runtime_contract,
      newConstructionExteriorWindow:true,
      standardSizeRecords:model.normalizedSizes.length,
      sourceStandardSizeRows:model.provider.sizes?.filter(ACTIVE).length ?? 0,
      targetWindowSizeRows:Object.fromEntries(model.windows.map((window)=>[window.id,(model.provider.sizes ?? []).filter((row)=>ACTIVE(row)&&row.window_id===window.id).length])),
      customDimensionRules:(document?.working_extensions?.custom_dimension_rules?.rules?.length ?? model.customRanges.length),
      formalSelectorDimensions:model.formalSelectorDimensions.length,
      formalSelectorCombinations:model.selectorCombos.length,
      manualConfirmation:true,
      sourcePackageVersion:document.package_version,
    }),
    canonicalWorkbook:model,
  });
  return Object.freeze({ master, resolver:(selection)=>resolveModel(model,selection) });
}
