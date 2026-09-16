import { createModel, ACTIVE, has, uniq, clone, same, meaningfulHanding, selectedOne, selectedMany, sourceSpecId, sourceWindowId, sourceGlassId, baseValueRows, labelsToValues, findSize } from './canonical-workbook-reference-v1-model.mjs';

const requirement = (field, required, visible = true) => ({ field, required, visible });
const uniqueWarnings = (values) => [...new Set(values.filter(Boolean))];
const formalSelectorTargetWindow = (model) => model.selectorModel?.window_id ?? model.selectorModel?.window_type ?? 'WT-EW-HIKICHIGAI';
const formalSelectorKeys = (model) => model.formalSelectorDimensions ?? [];

function selectorTupleMatches(row, selection, keys) {
  for (const key of keys) {
    if (!has(selection?.[key])) continue;
    if (!same(selection[key], row?.[key])) return false;
  }
  return true;
}

function formalSelectorState(model, selection) {
  const keys = formalSelectorKeys(model);
  if (!keys.length || selection.window_type !== formalSelectorTargetWindow(model)) return null;
  const candidates = (model.selectorCombos ?? []).filter((row)=>selectorTupleMatches(row,selection,keys));
  const completed = keys.every((key)=>has(selection[key]));
  const exact = completed ? candidates.find((row)=>keys.every((key)=>same(row?.[key],selection[key]))) : null;
  return { keys, candidates, completed, exact };
}

function resolveModel(model, inputSelection = {}) {
  const selection = clone(inputSelection ?? {});
  const clearedFields = [];
  const errors = [];
  const warnings = [];
  const fields = [];

  const windowRows = baseValueRows(model,'window_type');
  fields.push({ field_name:'window_type', values:windowRows, ...requirement('window_type',true,true) });
  const windowId = selectedOne(selection,'window_type');
  if (!windowId) return { selection, fields, errors, warnings, clearedFields, missingRequiredFields:['window_type'], status:'INCOMPLETE', orderReady:false };
  const window = model.windows.find((row)=>same(row.id,windowId));
  if (!window) errors.push({code:'INVALID_WINDOW_TYPE',field:'window_type',value:windowId});

  const specRows = baseValueRows(model,'window_spec').filter((row)=>same(sourceWindowId(row.source),windowId));
  fields.push({ field_name:'window_spec', values:specRows, ...requirement('window_spec',true,true) });
  let specId = selectedOne(selection,'window_spec');
  if (specId && !specRows.some((row)=>same(row.canonical_value,specId))) { delete selection.window_spec; specId=null; clearedFields.push('window_spec'); }

  const selectorState = formalSelectorState(model,selection);
  if (selectorState) {
    let running = model.selectorCombos ?? [];
    for (const key of selectorState.keys) {
      const values = uniq(running.map((row)=>row?.[key]).filter(has),(v)=>v).map((value)=>({
        value_id:`${key}:${value}`,field_name:key,canonical_value:value,display_label:String(value),status:'CURRENT',manual_check:false,user_selectable:true,runtime_selectable:true,source:{formalSelectorModel:true},
      }));
      fields.push({field_name:key,values,...requirement(key,true,true)});
      if (has(selection[key])) {
        if (!values.some((row)=>same(row.canonical_value,selection[key]))) {
          delete selection[key]; clearedFields.push(key);
          for (const downstream of selectorState.keys.slice(selectorState.keys.indexOf(key)+1)) if (has(selection[downstream])) { delete selection[downstream]; clearedFields.push(downstream); }
          break;
        }
        running=running.filter((row)=>same(row?.[key],selection[key]));
      }
    }
    const refreshed=formalSelectorState(model,selection);
    if (refreshed?.completed && !refreshed.exact) errors.push({code:'FORMAL_SELECTOR_COMBINATION_BLOCKED',field:'window_type',value:windowId});
  }

  const variantRows = baseValueRows(model,'variant').filter((row)=>{
    const rel=model.variantRelations.filter((relation)=>same(relation.variant_id,row.canonical_value));
    return !rel.length || rel.some((relation)=>same(relation.window_id??relation['窓種ID'],windowId));
  });
  if (variantRows.length) fields.push({field_name:'variant',values:variantRows,...requirement('variant',false,true)});
  if (selection.variant && !variantRows.some((row)=>same(row.canonical_value,selection.variant))) { delete selection.variant; clearedFields.push('variant'); }

  const handingValues = uniq(specRows.flatMap((row)=>meaningfulHanding(row.source?.['開き勝手'] ?? row.source?.handing)),(v)=>v).map((v)=>baseValueRows(model,'handing').find((row)=>same(row.canonical_value,v))).filter(Boolean);
  if (handingValues.length) fields.push({field_name:'handing',values:handingValues,...requirement('handing',false,true)});
  if (selection.handing && !handingValues.some((row)=>same(row.canonical_value,selection.handing))) { delete selection.handing; clearedFields.push('handing'); }

  const customRules = model.document?.working_extensions?.custom_dimension_rules?.rules ?? [];
  const hasFormalCustom = customRules.some((rule)=>same(rule.productNode??rule.windowId??rule.selector?.window_type,windowId) && (!specId || !rule.selector?.specific_spec || same(rule.selector.specific_spec,specId)));
  const hasBaselineCustom = model.customRanges.some((row)=>same(row['窓種ID']??row.window_id,windowId) && (!specId || same(row['固有仕様ID']??row.spec_id,specId)));
  const sizeModes = baseValueRows(model,'size_mode').filter((row)=>row.canonical_value==='STANDARD' || (row.canonical_value==='CUSTOM' && (hasFormalCustom||hasBaselineCustom)));
  fields.push({field_name:'size_mode',values:sizeModes,...requirement('size_mode',true,true)});
  if (selection.size_mode && !sizeModes.some((row)=>same(row.canonical_value,selection.size_mode))) { delete selection.size_mode; clearedFields.push('size_mode'); }

  const formalPanelValues = baseValueRows(model,'panel_count');
  if (selection.window_type===formalSelectorTargetWindow(model) && formalPanelValues.length) {
    const allowed = formalSelectorState(model,selection)?.candidates?.map((row)=>row.panel_count) ?? [];
    const rows=formalPanelValues.filter((row)=>allowed.some((v)=>same(v,row.canonical_value)));
    fields.push({field_name:'panel_count',values:rows,...requirement('panel_count',true,true)});
  }

  if (selection.size_mode==='STANDARD') {
    const rows=baseValueRows(model,'size').filter((row)=>same(row.source?.window_id,windowId)&&(!specId||same(row.source?.spec_id,specId)));
    fields.push({field_name:'size',values:rows,...requirement('size',true,true)});
    if (selection.size && !rows.some((row)=>same(row.canonical_value,selection.size))) { delete selection.size; clearedFields.push('size'); }
    for (const field of ['custom_w','custom_h']) if (has(selection[field])) { delete selection[field]; clearedFields.push(field); }
  } else if (selection.size_mode==='CUSTOM') {
    fields.push({field_name:'custom_w',values:[],...requirement('custom_w',true,true)});
    fields.push({field_name:'custom_h',values:[],...requirement('custom_h',true,true)});
    if (has(selection.size)) { delete selection.size; clearedFields.push('size'); }
  }

  const exteriorRows=baseValueRows(model,'exterior_color');
  fields.push({field_name:'exterior_color',values:exteriorRows,...requirement('exterior_color',true,true)});
  if (selection.exterior_color&&!exteriorRows.some((row)=>same(row.canonical_value,selection.exterior_color))) {delete selection.exterior_color;clearedFields.push('exterior_color');}
  const interiorRows=baseValueRows(model,'interior_color');
  fields.push({field_name:'interior_color',values:interiorRows,...requirement('interior_color',true,true)});
  if (selection.interior_color&&!interiorRows.some((row)=>same(row.canonical_value,selection.interior_color))) {delete selection.interior_color;clearedFields.push('interior_color');}

  const screenPresenceRows=baseValueRows(model,'screen_presence');
  fields.push({field_name:'screen_presence',values:screenPresenceRows,...requirement('screen_presence',false,true)});
  if (selection.screen_presence==='あり') {
    const formRows=baseValueRows(model,'screen_form');
    if(formRows.length)fields.push({field_name:'screen_form',values:formRows,...requirement('screen_form',false,true)});
    const midrailRows=baseValueRows(model,'screen_midrail');
    if(midrailRows.length)fields.push({field_name:'screen_midrail',values:midrailRows,...requirement('screen_midrail',false,true)});
    const netRows=baseValueRows(model,'screen_net');
    if(netRows.length)fields.push({field_name:'screen_net',values:netRows,...requirement('screen_net',false,true)});
  } else {
    for(const field of ['screen_form','screen_midrail','screen_net'])if(has(selection[field])){delete selection[field];clearedFields.push(field);}
  }

  const glassBaseRows=baseValueRows(model,'glass_base');
  fields.push({field_name:'glass_base',values:glassBaseRows,...requirement('glass_base',true,true)});
  if(selection.glass_base&&!glassBaseRows.some((row)=>same(row.canonical_value,selection.glass_base))){delete selection.glass_base;clearedFields.push('glass_base');}
  if(selection.glass_base){
    for(const field of ['glass_detail','glass_function','glass_spacer','glass_air_layer']){
      const rows=baseValueRows(model,field);
      if(rows.length)fields.push({field_name:field,values:rows,...requirement(field,false,true)});
    }
  }

  const optionRows=baseValueRows(model,'option');
  if(optionRows.length)fields.push({field_name:'option',values:optionRows,...requirement('option',false,true)});

  if (selection.size_mode==='CUSTOM' && has(selection.custom_w) && has(selection.custom_h)) {
    const w=Number(selection.custom_w),h=Number(selection.custom_h);
    const applicable=customRules.filter((rule)=>{
      const wid=rule.productNode??rule.windowId??rule.selector?.window_type;
      if(wid&&!same(wid,windowId))return false;
      const ss=rule.selector?.specific_spec;
      return !ss||!specId||same(ss,specId);
    });
    const parseBounds=(rule)=>{
      const direct=rule.bounds??{};
      const nums={minW:Number(direct.W_min??direct.minW),maxW:Number(direct.W_max??direct.maxW),minH:Number(direct.H_min??direct.minH),maxH:Number(direct.H_max??direct.maxH)};
      if(Object.values(nums).some(Number.isFinite))return nums;
      const text=String(rule.geometry_rule_json??rule.geometryRule?.outer??rule.geometryRule?.bounds??rule.geometryRule?.expression??'');
      const pair=(axis)=>{const m=text.match(new RegExp(`(-?\\d+(?:\\.\\d+)?)\\s*<=?\\s*${axis}\\s*<=?\\s*(-?\\d+(?:\\.\\d+)?)`));return m?[Number(m[1]),Number(m[2])]:[null,null];};
      const [minW,maxW]=pair('W'),[minH,maxH]=pair('H');return {minW,maxW,minH,maxH};
    };
    const known=applicable.map((rule)=>({rule,b:parseBounds(rule)})).filter(({b})=>Object.values(b).some(Number.isFinite));
    const inside=known.filter(({b})=>(!Number.isFinite(b.minW)||w>=b.minW)&&(!Number.isFinite(b.maxW)||w<=b.maxW)&&(!Number.isFinite(b.minH)||h>=b.minH)&&(!Number.isFinite(b.maxH)||h<=b.maxH));
    if(applicable.length&&known.length&&!inside.length)errors.push({code:'CUSTOM_DIMENSION_OUT_OF_FORMAL_OUTER_BOUNDS',field:'size_mode',value:'CUSTOM'});
    else if(applicable.length){warnings.push('正式Runtimeの特注寸法条件内です。複合条件・耐風圧・ガラス製作可否はメーカー見積確認が必要な場合があります。');}
  }

  const selectorAfter=formalSelectorState(model,selection);
  if(selectorAfter?.completed&&!selectorAfter.exact)errors.push({code:'FORMAL_SELECTOR_COMBINATION_BLOCKED',field:'window_type',value:windowId});
  const glassContract=model.document?.working_extensions?.glass_manufacturability;
  if(selection.glass_base&&glassContract?.exact_matrix_status==='ESTIMATE_CONFIRM_REQUIRED')warnings.push(glassContract.user_facing_message??'メーカー見積で最終確認してください。');

  const missingRequiredFields=fields.filter((field)=>field.required&&field.visible!==false&&!has(selection[field.field_name])).map((field)=>field.field_name);
  const manualCheck=warnings.length>0;
  const status=errors.length?'INVALID':missingRequiredFields.length?'INCOMPLETE':manualCheck?'MANUAL_CHECK':'VALID';
  return {selection,fields,errors,warnings:uniqueWarnings(warnings),clearedFields:[...new Set(clearedFields)],missingRequiredFields,status,orderReady:status==='VALID'};
}

export function adaptCanonicalWorkbookReferenceV1(runtimePackage) {
  const document = runtimePackage?.documents?.runtime_master ?? runtimePackage?.documents?.RUNTIME_MASTER ?? Object.values(runtimePackage?.documents ?? {})[0];
  if (!document) {
    const error = new Error('Canonical workbook Runtime package is missing runtime_master document');
    error.code = 'RUNTIME_ADAPTER_SCHEMA_MISMATCH';
    throw error;
  }
  const model = createModel(document);
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
  return Object.freeze({
    master,
    resolver:(selection)=>resolveModel(model,selection),
  });
}
