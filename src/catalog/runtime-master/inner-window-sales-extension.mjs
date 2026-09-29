// App-side estimate-request vocabulary. These are requests, never product facts.
export const SALES_GLAZING_REQUEST = Object.freeze({
  suppressedFields:['glass_structure','glass_structure_code','glass_spec_id','glass_size_constraint_group','glass_surface_type','spacer_type','gas_fill','cavity_thickness_mm'],
  fields:[
    {key:'sales_glass_appearance',displayLabel:'希望するガラスの見た目',slot:'glass_type',handoffKey:'glass_appearance',values:[['clear','透明ガラス'],['pattern','型板ガラス'],['frosted','すり板ガラス'],['washi','和紙調ガラス（単板のみ）']],excludeUnless:{washi:['single_glazing']}},
    {key:'sales_spacer_type',displayLabel:'スペーサー',slot:'spacer_type',handoffKey:'spacer_type_request',families:['insulating_glass'],values:[['aluminum','アルミスペーサー'],['resin','樹脂スペーサー']]},
    {key:'sales_gas_fill',displayLabel:'中空層',slot:'gas_fill',handoffKey:'gas_fill_request',families:['insulating_glass'],values:[['air','空気層'],['argon','アルゴンガス入り']]},
  ],
});

export function applySalesRequestExtension(state, input, contract) {
  if (!contract) return state;
  const family=state.fields.glass_family?.value;
  const fields=[], selection={}, handoff={glass_structure:'MANUFACTURER_ESTIMATE_CONFIRMATION'};
  for(const definition of contract.fields){
    if(!family || (definition.families&&!definition.families.includes(family)))continue;
    const values=definition.values.filter(([value])=>!definition.excludeUnless?.[value]||definition.excludeUnless[value].includes(family)).map(([value,displayLabel])=>({value,displayLabel,manualCheck:true}));
    fields.push({key:definition.key,displayLabel:definition.displayLabel,dataType:'ENUM',required:false,values,parentFields:['glass_family'],helpText:'希望を見積依頼へ引き継ぎ、成立はメーカー見積で確認します。'});
    if(values.some(row=>row.value===input[definition.key])){
      selection[definition.key]=input[definition.key];handoff[definition.handoffKey]=input[definition.key];
    }
  }
  const suppressed=new Set(contract.suppressedFields);
  for(const key of suppressed)if(state.fields[key])state.fields[key]={...state.fields[key],value:null,visibility:'HIDE',required:false,readOnly:false,derived_by_rule:false,resolved_by_rule:false};
  state.missing_required_fields=(state.missing_required_fields??[]).filter(key=>!suppressed.has(key));
  state.presentationFields=fields;state.presentationSelection=selection;
  if(Object.keys(selection).length){
    state.sales_request_handoff=handoff;
    state.manual_warnings=[...(state.manual_warnings??[]),'ガラスの厚みと最終仕様はメーカー見積で確認します。選択した見た目・スペーサー・中空層は希望として見積依頼に引き継ぎます。'];
    if(!['INVALID','BLOCKED'].includes(state.status))state.status='MANUAL_CHECK';
    state.order_ready=false;
    if(!state.missing_required_fields.length&&['PASS','REVIEW_REQUIRED'].includes(state.dimension_result?.status)&&!state.errors?.length)state.sales_request_state='READY_FOR_MANUFACTURER_ESTIMATE';
  }
  return state;
}

// Evaluate each formal size-class candidate through the existing resolver. No
// height threshold or invented classification is introduced by presentation.
function evaluateInnerWindowPass(master, input, resolve, sales=null) {
  const selection={...input};
  delete selection.size_class;
  const size=master.capabilities?.uiSemanticSupport?.customSize;
  if(size?.standardSupported===false&&size.allowedModes?.length===1)selection[size.modeField]=size.allowedModes[0];
  for(const key of sales?.suppressedFields??[])delete selection[key];
  const evaluate=resolve;
  resolve=(requested)=>{
    let resolved=evaluate(requested);
    // Some source evaluators clear a whole dependency branch when one value is
    // invalid. Recheck surviving user choices against the stabilized parents.
    for(const def of master.fields){
      const key=def.field_name,old=requested[key],field=resolved.fields[key];
      if(old===undefined||old===null||!field||field.visibility==='HIDE'||field.readOnly||field.derived_by_rule||field.resolved_by_rule||field.value!==null&&field.value!==undefined)continue;
      if(!(field.allowed_values??[]).some(v=>JSON.stringify(v)===JSON.stringify(old)))continue;
      const retained=Object.fromEntries(Object.entries(resolved.fields).filter(([,f])=>f.value!==null&&f.value!==undefined).map(([k,f])=>[k,f.value]));
      const probe=evaluate({...retained,[key]:old});
      if(JSON.stringify(probe.fields[key]?.value)!==JSON.stringify(old)||probe.fields[key]?.visibility==='HIDE')continue;
      if(Object.entries(retained).some(([k,v])=>JSON.stringify(probe.fields[k]?.value)!==JSON.stringify(v)))continue;
      if((probe.errors?.length??0)>(resolved.errors?.length??0))continue;
      resolved=probe;
    }
    return resolved;
  };
  let state=resolve(selection);
  const classes=state.fields.size_class?.allowed_values??[];
  if(classes.length&&!state.errors?.length){
    const candidates=classes.map(value=>resolve({...selection,size_class:value}));
    const feasible=candidates.filter(row=>!['BLOCK','BLOCKED'].includes(row.dimension_result?.status));
    const applicable=feasible.length?feasible:candidates;
    if(applicable.length===1){
      state=applicable[0];state.fields.size_class={...state.fields.size_class,readOnly:true,derived_by_rule:true};
    }else{
      state={...state,fields:{...state.fields}};
      for(const def of master.fields){
        const rows=applicable.map(row=>row.fields[def.field_name]).filter(Boolean);
        const shown=rows.filter(row=>row.visibility!=='HIDE');
        if(!shown.length)continue;
        const allowed=[...new Map(shown.flatMap(row=>row.allowed_values??[]).map(value=>[JSON.stringify(value),value])).values()];
        const requested=selection[def.field_name];
        const commonValue=rows.every(row=>JSON.stringify(row.value)===JSON.stringify(rows[0].value))?rows[0].value:(requested!==undefined&&shown.some(row=>JSON.stringify(row.value)===JSON.stringify(requested))?requested:null);
        state.fields[def.field_name]={...shown[0],value:commonValue,allowed_values:allowed,readOnly:rows.every(row=>row.readOnly||row.derived_by_rule||row.resolved_by_rule),derived_by_rule:false,resolved_by_rule:false};
      }
      state.fields.size_class={...state.fields.size_class,value:null,visibility:'HIDE',required:false};
      state.status=feasible.length?'MANUAL_CHECK':'INVALID';state.order_ready=false;
      state.dimension_result={status:feasible.length?'REVIEW_REQUIRED':'BLOCKED',message:feasible.length?'窓／テラス区分が一意に確定しないため、製作範囲・仕様をメーカー見積で確認してください。':'入力寸法は正式Runtimeの全サイズ区分で製作範囲外です。',matchedRuleIds:[...new Set(applicable.flatMap(row=>row.dimension_result?.matchedRuleIds??[]))]};
      state.manual_warnings=[...(state.manual_warnings??[]),'窓／テラス区分：メーカー見積確認。自動発注不可。'];
      state.confirmation_requests=[{code:'INNER_WINDOW_SIZE_CLASS_CONFIRM',message:'窓／テラス区分と適用する製作範囲をメーカー見積で確認してください。'}];
      state.missing_required_fields=Object.entries(state.fields).filter(([key,row])=>key!=='size_class'&&row.visibility!=='HIDE'&&row.required&&(row.value===null||row.value===undefined||row.value==='')).map(([key])=>key);
      state.errors=applicable.every(row=>row.errors?.length)?applicable.flatMap(row=>row.errors):[];
    }
  }
  if(size?.standardSupported===false&&size.allowedModes?.length===1&&state.fields[size.modeField])state.fields[size.modeField]={...state.fields[size.modeField],readOnly:true,derived_by_rule:true};
  return applySalesRequestExtension(state,input,sales);
}

export function evaluateInnerWindowPresentation(master,input,resolve,sales=null){
  let requested={...input};
  const cleared=new Set();
  const identity=value=>JSON.stringify(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)));
  for(let pass=0;pass<=master.fields.length;pass++){
    const state=evaluateInnerWindowPass(master,requested,resolve,sales);
    for(const key of state.cleared_fields??[])cleared.add(key);
    const selection={...Object.fromEntries(Object.entries(state.fields).filter(([,f])=>f.value!==null&&f.value!==undefined).map(([k,f])=>[k,f.value])),...(state.presentationSelection??{})};
    if(identity(selection)===identity(requested)){
      for(const key of Object.keys(input))if(selection[key]===undefined)cleared.add(key);
      state.cleared_fields=[...cleared].filter(key=>JSON.stringify(input[key])!==JSON.stringify(selection[key]));
      return state;
    }
    requested=selection;
  }
  throw new Error('INNER_WINDOW_PRESENTATION_DID_NOT_STABILIZE');
}
