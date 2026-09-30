// App-side estimate-request vocabulary. These are requests, never product facts.
export const SALES_GLAZING_REQUEST = Object.freeze({
  suppressedFields:['glass_structure','glass_structure_code','glass_spec_id','glass_size_constraint_group','glass_surface_type','spacer_type','gas_fill','cavity_thickness_mm'],
  handoffDefaults:{glass_structure:'MANUFACTURER_ESTIMATE_CONFIRMATION'},
  manualWarning:'ガラスの厚みと最終仕様はメーカー見積で確認します。選択した見た目・スペーサー・中空層は希望として見積依頼に引き継ぎます。',
  requireManufacturerGlassDetail:true,
  fields:[
    {key:'sales_glass_appearance',displayLabel:'希望するガラスの見た目',slot:'glass_type',handoffKey:'glass_appearance',values:[['clear','透明ガラス'],['pattern','型板ガラス'],['frosted','すり板ガラス'],['washi','和紙調ガラス（単板のみ）']],excludeUnless:{washi:['single_glazing']}},
    {key:'sales_spacer_type',displayLabel:'スペーサー',slot:'spacer_type',handoffKey:'spacer_type_request',families:['insulating_glass'],values:[['aluminum','アルミスペーサー'],['resin','樹脂スペーサー']]},
    {key:'sales_gas_fill',displayLabel:'中空層',slot:'gas_fill',handoffKey:'gas_fill_request',families:['insulating_glass'],values:[['air','空気層'],['argon','アルゴンガス入り']]},
  ],
});

export const UCHIRIMO_SALES_REQUEST = Object.freeze({
  ...SALES_GLAZING_REQUEST,
  confirmationTo:'積算／YKK AP',
  confirmationCode:'UCHIRIMO_SALES_REQUEST_CONFIRM',
  fields:Object.freeze([
    ...SALES_GLAZING_REQUEST.fields,
    {
      key:'fukashi_curtain_rail',
      displayLabel:'カーテンレール対応',
      handoffKey:'fukashi_curtain_rail_request',
      when:{fukashi_presence:'present',fukashi_depth:['25','40']},
      values:[['none','なし',false],['enabled','あり',true]],
      helpText:'現行YKK AP現場調査資料でカーテンレール対応が確認できるふかし枠25/40で表示します。',
    },
  ]),
});

export const INPLUS_SALES_REQUEST = Object.freeze({
  suppressedFields:['supply_form','glass_detail','spacer'],
  handoffDefaults:{
    supply_form:'ESTIMATION_RESPONSIBILITY',
    glass_detail:'MANUFACTURER_ESTIMATE_CONFIRMATION',
  },
  manualWarning:'営業入力で確定しない仕様は、選択した希望条件を積算／LIXIL確認事項として見積依頼へ引き継ぎます。',
  confirmationTo:'積算／LIXIL',
  confirmationCode:'INPLUS_SALES_REQUEST_CONFIRM',
  requireManufacturerGlassDetail:true,
  fields:Object.freeze([
    {
      key:'sales_spacer_type',
      displayLabel:'スペーサー',
      slot:'spacer_type',
      handoffKey:'spacer_type_request',
      families:['Low-E複層','一般複層'],
      values:[['aluminum','アルミスペーサー',true],['resin','樹脂スペーサー',true]],
      helpText:'供給形態は営業では選択しません。スペーサーの希望のみ見積依頼へ引き継ぎ、成立は積算／LIXILで確認します。',
    },
    {
      key:'crescent_presence',
      displayLabel:'クレセント',
      handoffKey:'crescent_request',
      when:{window_type:'引違い窓'},
      values:[['installed','あり',false],['crescentless_special_order','なし（特注・要確認）',true]],
      helpText:'クレセントなしは特注対応可能ですが基本性能を満足しないため、積算／LIXIL確認事項として扱います。',
    },
    {
      key:'fukashi_curtain_rail',
      displayLabel:'カーテンレール対応',
      handoffKey:'fukashi_curtain_rail_request',
      when:{fukashi_presence:'present',fukashi_depth:['20','40','50','70']},
      unless:{fukashi_reinforcement:'corner'},
      values:[['none','なし',false],['enabled','あり',true]],
      helpText:'正式資料でカーテンレール仕様が確認できるふかし枠20/40/50/70系で表示します。',
    },
    {
      key:'sales_installation_auxiliaries',
      displayLabel:'施工用選択品・確認事項',
      dataType:'MULTI_ENUM',
      handoffKey:'installation_auxiliaries',
      when:{window_type:['引違い窓','FIX窓','開き窓','テラスドア']},
      values:[
        ['OP-STEP','段差スペーサー',true],
        ['TRUE_WALL_SCREW','真壁取付用ねじ',true],
        ['JAPANESE_ROOM_GROOVE_INFIL','和室溝の埋木対応',true],
      ],
      helpText:'複数選択できます。現場条件に応じて積算／LIXIL確認へ引き継ぎます。',
    },
  ]),
});

function selectedRuntimeValues(state){
  return Object.fromEntries(Object.entries(state.fields??{})
    .filter(([,field])=>field?.value!==null&&field?.value!==undefined&&field?.value!=='')
    .map(([key,field])=>[key,field.value]));
}

function requestFieldApplies(definition,state){
  const selected=selectedRuntimeValues(state);
  const family=selected.glass_family;
  if(definition.families&&!definition.families.includes(family))return false;
  for(const [key,expected] of Object.entries(definition.when??{})){
    const allowed=Array.isArray(expected)?expected:[expected];
    if(!allowed.some(value=>Object.is(value,selected[key])))return false;
  }
  for(const [key,excluded] of Object.entries(definition.unless??{})){
    const denied=Array.isArray(excluded)?excluded:[excluded];
    if(denied.some(value=>Object.is(value,selected[key])))return false;
  }
  return true;
}

function requestChoices(definition){
  return (definition.values??[]).map((row)=>{
    const [value,displayLabel,manualCheck=true]=row;
    return {value,displayLabel,manualCheck:Boolean(manualCheck)};
  });
}

export function applySalesRequestExtension(state, input, contract) {
  if (!contract) return state;
  const fields=[], selection={}, handoff={...(contract.handoffDefaults??{})};
  let requiresManual=false;

  for(const definition of contract.fields??[]){
    if(!requestFieldApplies(definition,state))continue;
    const family=state.fields.glass_family?.value;
    const values=requestChoices(definition)
      .filter(({value})=>!definition.excludeUnless?.[value]||definition.excludeUnless[value].includes(family));
    const dataType=definition.dataType??'ENUM';
    fields.push({
      key:definition.key,
      displayLabel:definition.displayLabel,
      dataType,
      required:Boolean(definition.required),
      values,
      parentFields:definition.parentFields??Object.keys(definition.when??{}),
      helpText:definition.helpText??'希望を見積依頼へ引き継ぎ、成立はメーカー見積で確認します。',
    });

    const raw=input[definition.key];
    if(dataType==='MULTI_ENUM'){
      const allowed=new Set(values.map(row=>row.value));
      const selected=(Array.isArray(raw)?raw:[]).filter(value=>allowed.has(value));
      if(selected.length){
        selection[definition.key]=selected;
        handoff[definition.handoffKey]=selected;
        if(values.some(row=>selected.includes(row.value)&&row.manualCheck))requiresManual=true;
      }
      continue;
    }

    const chosen=values.find(row=>Object.is(row.value,raw));
    if(chosen){
      selection[definition.key]=raw;
      handoff[definition.handoffKey]=raw;
      if(chosen.manualCheck)requiresManual=true;
    }
  }

  const suppressed=new Set(contract.suppressedFields??[]);
  for(const key of suppressed)if(state.fields[key])state.fields[key]={...state.fields[key],value:null,visibility:'HIDE',required:false,readOnly:false,derived_by_rule:false,resolved_by_rule:false};
  state.missing_required_fields=(state.missing_required_fields??[]).filter(key=>!suppressed.has(key));
  state.presentationFields=fields;
  state.presentationSelection=selection;

  if(contract.requireManufacturerGlassDetail&&suppressed.has('glass_detail')&&state.dimension_result?.status==='PASS'){
    state.dimension_result={
      ...state.dimension_result,
      status:'REVIEW_REQUIRED',
      message:'基本製作範囲内です。営業UIではガラス詳細を確定しないため、最終のガラス別製作可否は積算／メーカー見積で確認してください。',
    };
    requiresManual=true;
  }

  if(Object.keys(handoff).length)state.sales_request_handoff=handoff;
  if(requiresManual){
    const warning=contract.manualWarning??'選択した希望条件はメーカー見積で確認します。';
    state.manual_warnings=[...(state.manual_warnings??[]),warning];
    state.confirmation_requests=[
      ...(state.confirmation_requests??[]),
      {
        code:contract.confirmationCode??'INNER_WINDOW_SALES_REQUEST_CONFIRM',
        status:'ESTIMATE_CONFIRM_REQUIRED',
        confirmation_to:contract.confirmationTo??'積算／メーカー',
        message:warning,
      },
    ].filter((row,index,all)=>all.findIndex(other=>JSON.stringify(other)===JSON.stringify(row))===index);
    if(!['INVALID','BLOCKED'].includes(state.status))state.status='MANUAL_CHECK';
    state.order_ready=false;
  }
  if(Object.keys(handoff).length&&!state.missing_required_fields.length&&['PASS','REVIEW_REQUIRED'].includes(state.dimension_result?.status)&&!state.errors?.length)state.sales_request_state='READY_FOR_MANUFACTURER_ESTIMATE';
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
      state.confirmation_requests=[...(state.confirmation_requests??[]),...applicable.flatMap(row=>row.confirmation_requests??[]),{code:'INNER_WINDOW_SIZE_CLASS_CONFIRM',message:'窓／テラス区分と適用する製作範囲をメーカー見積で確認してください。'}].filter((row,index,all)=>all.findIndex(other=>JSON.stringify(other)===JSON.stringify(row))===index);
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
