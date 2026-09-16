import { withCanonicalWorkbookReferenceV1FormalGeometry } from './canonical-workbook-reference-v1-formal-geometry-normalizer.mjs';

const has=(value)=>value!==undefined&&value!==null&&value!=='';
const same=(a,b)=>Object.is(a,b)||String(a)===String(b);
const uniq=(values)=>[...new Set(values.filter(has))];
const sourceWindowId=(row)=>row?.['窓種ID']??row?.window_id;
const sourceSpecId=(row)=>row?.['固有仕様ID']??row?.spec_id;
const screenFormOf=(row)=>row?.screen_type??row?.label;
const splitTargets=(value)=>String(value??'').split(/[・、,]/).map((part)=>part.trim()).filter(Boolean);
const windowIdMatches=(raw,windowId)=>String(raw??'').split('/').map((part)=>part.trim()).includes(windowId);

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

  const resolver=(inputSelection={})=>{
    const input=structuredClone(inputSelection??{});
    const windowId=input.window_type;
    const window=(model.windows??[]).find((row)=>same(row.id,windowId));
    const specs=(model.specs??[]).filter((row)=>same(sourceWindowId(row),windowId));
    if(window&&!has(input.window_spec)&&specs.length===1&&String(window.spec_required??'').includes('不要'))input.window_spec=specs[0].spec_id;

    const state=baseResolver(input);
    state.errors??=[]; state.cleared_fields??=[]; state.warnings??=[];

    for(const def of master.fields??[]){
      if(!(def.field_name in inputSelection)||!['enum','array'].includes(def.data_type))continue;
      const universe=enumUniverse(master,def.field_name);
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

    if(window&&validSpec){
      const selectedOptions=new Set(Array.isArray(input.option)?input.option:has(input.option)?[input.option]:[]);
      const optionRows=(model.options??[]).filter((row)=>(row.window_id==='*'||same(row.window_id,windowId))&&(!has(row['固有仕様ID'])||row['固有仕様ID']==='*'||same(row['固有仕様ID'],specId)));
      const optionIds=[];
      for(const row of optionRows){
        const rel=(model.optionApplicability??[]).find((one)=>same(one.window_id,windowId)&&same(one.option_id,row.id));
        if(rel?.applicability==='NON_APPLICABLE')continue;
        if(rel?.applicability==='CONDITIONAL_APPLICABLE'&&has(rel.dependency_option_id)&&!selectedOptions.has(rel.dependency_option_id))continue;
        optionIds.push(row.id);
      }
      if(state.fields?.option?.visibility==='SHOW')state.fields.option.allowed_values=uniq(optionIds);
    }

    if(!window&&has(windowId))appendError(state,{code:'SELECTION_NOT_ALLOWED',field:'window_type',value:windowId});
    return recompute(state);
  };
  return withCanonicalWorkbookReferenceV1FormalGeometry(Object.freeze({...adapted,resolver}));
}
