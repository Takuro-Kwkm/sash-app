import { withCanonicalWorkbookReferenceV1FormalGeometry } from './canonical-workbook-reference-v1-formal-geometry-normalizer.mjs';

const has=(value)=>value!==undefined&&value!==null&&value!=='';
const same=(a,b)=>Object.is(a,b)||String(a)===String(b);
const uniq=(values)=>[...new Set(values.filter(has))];
const sourceWindowId=(row)=>row?.['窓種ID']??row?.window_id;
const sourceSpecId=(row)=>row?.['固有仕様ID']??row?.spec_id;
const screenFormOf=(row)=>row?.screen_type??row?.label;
const splitTargets=(value)=>String(value??'').split(/[・、,]/).map((part)=>part.trim()).filter(Boolean);
const windowIdMatches=(raw,windowId)=>String(raw??'').split('/').map((part)=>part.trim()).includes(windowId);
const selectedOptionsOf=(selection)=>new Set(Array.isArray(selection?.option)?selection.option:has(selection?.option)?[selection.option]:[]);
function dependencyPredicateMatches(condition,selection){
  if(!condition||typeof condition!=='object')return true;
  const selected=selectedOptionsOf(selection);
  for(const[key,value]of Object.entries(condition)){
    if(key==='option_selected'||key==='base_option_selected'){
      if(!selected.has(value))return false;
      continue;
    }
    if(!same(selection?.[key],value))return false;
  }
  return true;
}
function optionRelationAllows(relation,selection,windowId){
  if(!relation||relation.active===false||!same(relation.window_id,windowId))return false;
  if(relation.applicability==='NON_APPLICABLE')return false;
  if(relation.applicability==='APPLICABLE')return true;
  if(relation.applicability!=='CONDITIONAL_APPLICABLE')return false;
  if(relation.required_when&&typeof relation.required_when==='object')return dependencyPredicateMatches(relation.required_when,selection);
  if(has(relation.dependency_option_id))return selectedOptionsOf(selection).has(relation.dependency_option_id);
  return false;
}
function optionSourceMatchesWindow(row,windowId){
  if(row?.window_id==='*'||!has(row?.window_id))return true;
  return windowIdMatches(row.window_id,windowId);
}
const GLAZING_SEMANTIC_SLOTS=Object.freeze(['glass_type','glass_detail','glass_function']);
const GLAZING_SEMANTIC_LABEL=Object.freeze({glass_type:'ガラス種別',glass_detail:'ガラス詳細',glass_function:'ガラス追加機能'});
const GLAZING_SEMANTIC_ORDER=Object.freeze({glass_type:130,glass_detail:140,glass_function:150});

function meaningfulHanding(raw){
  if(!has(raw))return[];
  const token=String(raw).trim();
  if(['-','―','—','対象外','なし'].includes(token))return[];
  if(token==='L/R'||token==='R/L')return['L','R'];
  return token.split(/[\/,、]/).map((value)=>value.trim()).filter((value)=>value&&!['対象外','なし'].includes(value));
}

function targetContainsForm(raw,form){
  return splitTargets(raw).some((target)=>target===form||String(form).includes(target)||target.includes(String(form)));
}
function screenOrderRule(model,form,mesh){
  if(!has(form)||!has(mesh))return null;
  const exact=(model.screenOrderRules??[]).find((row)=>row['網戸タイプ']===form&&row['ネット種類']===mesh);
  if(exact)return exact;
  const netSpec=(model.screenNetSpecs??[]).find((row)=>row['ネット種類']===mesh&&targetContainsForm(row['対象網戸'],form));
  if(!netSpec)return null;
  return (model.screenOrderRules??[]).find((row)=>row['網戸タイプ']===netSpec['タイプ']&&row['ネット種類']===mesh)??null;
}
function screenCandidateAllowed(model,form,mesh){
  const rule=screenOrderRule(model,form,mesh);
  if(!rule)return true;
  return rule['商品候補表示']!=='非表示'&&rule['見積確定可否']!=='不可'&&rule['未確認時アプリ状態']!=='ERROR';
}
function fixedMidrailRule(model,windowId,form){
  return (model.screenRules??[]).find((row)=>windowIdMatches(row['窓種ID'],windowId)&&row['網戸形式']===form&&['固定','継承'].includes(row['判定']))??null;
}
function formalRuleSelector(rule){return rule?.selector_json??rule?.selector??{};}
function formalRuleWindow(rule){
  const selector=formalRuleSelector(rule);
  if(has(selector.window_type))return selector.window_type;
  const node=rule?.product_node??rule?.productNode??rule?.windowId;
  return has(node)?String(node).split('::')[0]:null;
}
function formalRuleSpec(rule){
  const selector=formalRuleSelector(rule);
  return selector.specific_spec??selector.window_spec??null;
}
function normalizeTable(sourceTables,name,headerKey){
  const values=sourceTables?.[name]?.values??[];
  const headerIndex=values.findIndex((row)=>row?.[0]===headerKey);
  if(headerIndex<0)return[];
  const headers=values[headerIndex];
  return values.slice(headerIndex+1)
    .filter((row)=>row?.some((cell)=>has(cell)))
    .map((row)=>Object.fromEntries(headers.map((header,index)=>[header,row[index]])));
}
function formalGlazingSemanticRows(model){
  const declared=model.document?.working_extensions?.glazing_semantic;
  if(!declared)return[];
  const sourceName=declared.source_sheet??'08D_UIガラスSemantic';
  return normalizeTable(model.sourceTables,sourceName,'semantic_id').filter((row)=>
    GLAZING_SEMANTIC_SLOTS.includes(row.semantic_slot)&&row['有効']!==false&&row['UI表示']!=='非表示'&&has(row.canonical_value)
  );
}
function glazingTargetMatches(raw,glassBase){
  if(!has(raw)||raw==='*')return true;
  return String(raw).split(/[\/、,]/).map((value)=>value.trim()).filter(Boolean).some((value)=>same(value,glassBase));
}
function semanticRowsFor(rows,slot,glassBase){
  return rows.filter((row)=>row.semantic_slot===slot&&glazingTargetMatches(row.glass_base,glassBase));
}
function semanticStatusManual(row){return has(row?.['適用状態'])&&row['適用状態']!=='ACTIVE';}
function semanticMasterValue(row){
  return Object.freeze({
    value_id:row.semantic_id??`${row.semantic_slot}:${row.canonical_value}`,
    field_name:row.semantic_slot,
    canonical_value:row.canonical_value,
    display_label:row['表示名']??String(row.canonical_value),
    status:'CURRENT',
    manual_check:semanticStatusManual(row),
    user_selectable:true,
    runtime_selectable:true,
    source:Object.freeze({...row,formalGlazingSemantic:true}),
  });
}
function withFormalGlazingSemanticMaster(master,model,rows){
  if(!rows.length)return master;
  const presentSlots=new Set(rows.map((row)=>row.semantic_slot));
  const existingByKey=new Map((master.fields??[]).map((field)=>[field.field_name,field]));
  const fields=(master.fields??[]).filter((field)=>!presentSlots.has(field.field_name)).map((field)=>field);
  for(const slot of GLAZING_SEMANTIC_SLOTS){
    if(!presentSlots.has(slot))continue;
    const existing=existingByKey.get(slot);
    fields.push(Object.freeze({
      ...(existing??{}),
      field_name:slot,
      display_label:existing?.display_label??GLAZING_SEMANTIC_LABEL[slot],
      display_order:GLAZING_SEMANTIC_ORDER[slot],
      data_type:slot==='glass_function'?'array':'enum',
      parent_fields:['glass_base'],
      required_mode:existing?.required_mode??'OPTIONAL',
      selection_mode:existing?.selection_mode??'USER_SELECTABLE',
      runtime_included:true,
    }));
  }
  const values=(master.values??[]).filter((row)=>!presentSlots.has(row.field_name)).map((row)=>row);
  const seen=new Set();
  for(const row of rows){
    const key=JSON.stringify([row.semantic_slot,row.canonical_value,row.glass_base]);
    if(seen.has(key))continue;
    seen.add(key);
    values.push(semanticMasterValue(row));
  }
  return Object.freeze({...master,fields:Object.freeze(fields),values:Object.freeze(values)});
}
function applyFormalGlazingSemantic(state,inputSelection,rows){
  if(!rows.length)return;
  const glassBase=inputSelection.glass_base;
  for(const slot of GLAZING_SEMANTIC_SLOTS){
    const candidates=has(glassBase)?semanticRowsFor(rows,slot,glassBase):[];
    if(!has(glassBase)||!candidates.length){hideField(state,slot);continue;}
    const allowed=uniq(candidates.map((row)=>row.canonical_value));
    const raw=inputSelection[slot];
    const selected=slot==='glass_function'?(Array.isArray(raw)?raw:has(raw)?[raw]:[]):has(raw)?[raw]:[];
    const invalid=selected.filter((value)=>!allowed.some((candidate)=>same(candidate,value)));
    if(invalid.length){
      for(const value of invalid)appendError(state,{code:'SELECTION_INCOMPATIBLE',field:slot,value});
      appendCleared(state,slot,'DEPENDENCY',slot==='glass_function'?selected:raw);
    }
    const accepted=selected.filter((value)=>allowed.some((candidate)=>same(candidate,value)));
    const value=slot==='glass_function'?(accepted.length?accepted:null):(accepted[0]??null);
    showField(state,slot,{value,allowed,required:false,readOnly:false,label:GLAZING_SEMANTIC_LABEL[slot]});
    for(const chosen of accepted){
      const row=candidates.find((candidate)=>same(candidate.canonical_value,chosen));
      if(row&&semanticStatusManual(row)){
        const notice=row['備考']??`${row['表示名']??chosen} はメーカー確認が必要です。`;
        state.warnings??=[];
        if(!state.warnings.includes(notice))state.warnings.push(notice);
      }
    }
  }
}
function enumUniverse(master,field){
  return (master.values??[]).filter((row)=>row.field_name===field).map((row)=>row.canonical_value);
}
function appendError(state,error){
  state.errors??=[];
  const key=JSON.stringify([error.code,error.field,error.value,error.message]);
  if(!(state.errors??[]).some((row)=>JSON.stringify([row.code,row.field,row.value,row.message])===key))state.errors.push(error);
}
function appendCleared(state,field,reason='DEPENDENCY',removed=undefined){
  state.cleared_fields??=[];
  if(!(state.cleared_fields??[]).some((row)=>row.field===field))state.cleared_fields.push({field,reason,...(removed===undefined?{}:{removed})});
}
function hideField(state,key){
  const field=state.fields?.[key];
  if(!field)return;
  field.value=null; field.state='NOT_APPLICABLE'; field.visibility='HIDE'; field.required=false; field.allowed_values=[]; field.readOnly=false;
}
function showField(state,key,{value=null,allowed=[],required=false,readOnly=false,label=null}={}){
  state.fields??={};
  const field=state.fields[key]??{};
  state.fields[key]={...field,value,state:value===null?'UNSET':readOnly?'RESOLVED':'SELECTED',visibility:'SHOW',required,allowed_values:allowed,readOnly,display_label:label??field.display_label??null};
}
function recompute(state){
  const missing=Object.entries(state.fields??{}).filter(([,field])=>field.visibility==='SHOW'&&field.required&&!has(field.value)).map(([key])=>key);
  state.missing_required_fields=missing;
  state.status=(state.errors??[]).length?'INVALID':missing.length?'INCOMPLETE':(state.warnings??[]).length?'MANUAL_CHECK':'VALID';
  state.order_ready=state.status==='VALID';
  return state;
}

export function withCanonicalWorkbookReferenceV1Behavior(adapted){
  const master=adapted?.master;
  const baseResolver=adapted?.resolver;
  if(!master||typeof baseResolver!=='function')return adapted;
  const model=master.canonicalWorkbook;
  if(!model)return adapted;
  const glazingSemanticRows=formalGlazingSemanticRows(model);
  const normalizedMaster=withFormalGlazingSemanticMaster(master,model,glazingSemanticRows);

  const resolver=(inputSelection={})=>{
    const input=structuredClone(inputSelection??{});
    const windowId=input.window_type;
    const window=(model.windows??[]).find((row)=>same(row.id,windowId));
    const specs=(model.specs??[]).filter((row)=>same(sourceWindowId(row),windowId));
    if(window&&!has(input.window_spec)&&specs.length===1&&String(window.spec_required??'').includes('不要'))input.window_spec=specs[0].spec_id;

    const legacyInput=structuredClone(input);
    for(const slot of GLAZING_SEMANTIC_SLOTS)delete legacyInput[slot];
    const state=baseResolver(legacyInput);
    state.errors??=[]; state.cleared_fields??=[]; state.warnings??=[];

    for(const def of normalizedMaster.fields??[]){
      if(!(def.field_name in inputSelection)||!['enum','array'].includes(def.data_type))continue;
      const universe=enumUniverse(normalizedMaster,def.field_name);
      const raw=def.data_type==='array'?(Array.isArray(inputSelection[def.field_name])?inputSelection[def.field_name]:[inputSelection[def.field_name]]):[inputSelection[def.field_name]];
      for(const value of raw.filter(has))if(!universe.some((candidate)=>same(candidate,value)))appendError(state,{code:'SELECTION_NOT_ALLOWED',field:def.field_name,value});
    }

    const specId=input.window_spec;
    const validSpec=specs.find((row)=>same(row.spec_id,specId));
    if(has(inputSelection.window_spec)&&!validSpec){
      appendError(state,{code:'SELECTION_INCOMPATIBLE',field:'window_spec',value:inputSelection.window_spec});
      appendCleared(state,'window_spec');
    }
    if(window&&validSpec&&specs.length===1&&String(window.spec_required??'').includes('不要')){
      showField(state,'window_spec',{value:specId,allowed:[specId],required:true,readOnly:true,label:window.spec_type||'窓種固有仕様'});
    }

    if(window&&validSpec){
      const sizeRows=(model.normalizedSizes??[]).filter((row)=>same(row.window_id,windowId)&&same(row.spec_id,specId));
      const handings=uniq(sizeRows.flatMap((row)=>meaningfulHanding(row.handing)));
      if(handings.length){
        let value=has(inputSelection.handing)?inputSelection.handing:null;
        if(value!==null&&!handings.some((allowed)=>same(allowed,value))){appendError(state,{code:'SELECTION_INCOMPATIBLE',field:'handing',value});appendCleared(state,'handing');value=null;}
        showField(state,'handing',{value,allowed:handings,required:true,readOnly:false});
      }else hideField(state,'handing');

      const baselineCustom=(model.customRanges??[]).filter((row)=>same(sourceWindowId(row),windowId)&&same(sourceSpecId(row),specId));
      const formalCustom=(model.document?.working_extensions?.custom_dimension_rules?.rules??[]).filter((rule)=>{
        if(!same(formalRuleWindow(rule),windowId))return false;
        const ruleSpec=formalRuleSpec(rule);
        return !has(ruleSpec)||same(ruleSpec,specId);
      });
      const modes=[]; if(sizeRows.length)modes.push('STANDARD'); if(baselineCustom.length||formalCustom.length)modes.push('CUSTOM');
      if(state.fields?.size_mode?.visibility==='SHOW')state.fields.size_mode.allowed_values=modes;
      if(has(inputSelection.size_mode)&&!modes.includes(inputSelection.size_mode)){
        appendError(state,{code:'SELECTION_INCOMPATIBLE',field:'size_mode',value:inputSelection.size_mode});appendCleared(state,'size_mode');
        if(state.fields?.size_mode){state.fields.size_mode.value=null;state.fields.size_mode.state='UNSET';}
      }
    }

    const windowScreens=(model.screens??[]).filter((row)=>same(row.window_id,windowId)&&row.presence==='あり');
    if(!windowScreens.length){
      for(const key of ['screen_presence','screen_form','screen_midrail','screen_net'])hideField(state,key);
    }else if(input.screen_presence==='あり'){
      const forms=uniq(windowScreens.map(screenFormOf));
      const effectiveForm=input.screen_form||(forms.length===1?forms[0]:null);
      if(effectiveForm){
        const candidates=windowScreens.filter((row)=>same(screenFormOf(row),effectiveForm));
        if(fixedMidrailRule(model,windowId,effectiveForm))hideField(state,'screen_midrail');
        const meshes=uniq(candidates.map((row)=>row.mesh).filter((mesh)=>has(mesh)&&mesh!=='対象外'&&screenCandidateAllowed(model,effectiveForm,mesh)));
        if(state.fields?.screen_net?.visibility==='SHOW')state.fields.screen_net.allowed_values=meshes;
      }
    }

    applyFormalGlazingSemantic(state,inputSelection,glazingSemanticRows);

    if(window&&validSpec){
      const optionRows=(model.options??[]).filter((row)=>optionSourceMatchesWindow(row,windowId)&&(!has(row['固有仕様ID'])||row['固有仕様ID']==='*'||same(row['固有仕様ID'],specId)));
      const optionIds=[];
      for(const row of optionRows){
        const relations=(model.optionApplicability??[]).filter((one)=>same(one.option_id,row.id)&&same(one.window_id,windowId));
        if(relations.length){
          if(!relations.some((relation)=>optionRelationAllows(relation,input,windowId)))continue;
        }
        optionIds.push(row.id);
      }
      if(state.fields?.option?.visibility==='SHOW')state.fields.option.allowed_values=uniq(optionIds);
    }

    if(!window&&has(windowId))appendError(state,{code:'SELECTION_NOT_ALLOWED',field:'window_type',value:windowId});
    return recompute(state);
  };
  return withCanonicalWorkbookReferenceV1FormalGeometry(Object.freeze({...adapted,master:normalizedMaster,resolver}));
}
