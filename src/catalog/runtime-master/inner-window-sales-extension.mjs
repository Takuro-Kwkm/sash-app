import { validateInplusMidrailF } from './inplus-presentation-rules.mjs';
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
  suppressedFields:Object.freeze([...SALES_GLAZING_REQUEST.suppressedFields,'grille_type','grille_material','muntin_type']),
  confirmationTo:'積算／YKK AP',
  confirmationCode:'UCHIRIMO_SALES_REQUEST_CONFIRM',
  fields:Object.freeze([
    ...SALES_GLAZING_REQUEST.fields,
    {
      key:'sales_glass_design',
      displayLabel:'ガラスデザイン',
      handoffKey:'glass_design_request',
      families:['insulating_glass'],
      values:[
        ['standard','標準複層ガラス',false],
        ['grid','格子入り複層ガラス',false],
        ['japanese','和室用複層ガラス',false],
      ],
      valueWhen:{
        grid:{room_specification:'residential',window_type:['sliding_window','fix_window']},
        japanese:{room_specification:'residential',window_type:['sliding_window','fix_window']},
      },
      helpText:'格子入り／和室用のデザイン区分を選択します。選択後に対応するデザイン詳細を表示します。',
    },
    {
      key:'sales_glass_pattern',
      displayLabel:'デザイン',
      handoffKey:'glass_design_detail_request',
      families:['insulating_glass'],
      when:{sales_glass_design:['grid','japanese']},
      values:[
        ['plain','プレーンタイプ',false],
        ['elegant','エレガントタイプ',false],
        ['wa01_aluminum','洋風タイプ WA01（アルミ格子）',false],
        ['wa01_resin','洋風タイプ WA01（樹脂格子）',false],
        ['wa02','洋風タイプ WA02',false],
        ['pa01','プレーリータイプ PA01',false],
        ['pa02','プレーリータイプ PA02',false],
        ['wp01','洋風タイプ WP01',false],
        ['aramagoushi','荒間格子',false],
        ['yokoshige_fukiyose','横繁吹寄格子',false],
        ['tateshige_fukiyose','たて繁吹寄格子',false],
      ],
      valueWhen:{
        plain:{sales_glass_design:'grid'},
        elegant:{sales_glass_design:'grid'},
        wa01_aluminum:{sales_glass_design:'grid'},
        wa01_resin:{sales_glass_design:'grid'},
        wa02:{sales_glass_design:'grid'},
        pa01:{sales_glass_design:'grid'},
        pa02:{sales_glass_design:'grid'},
        wp01:{sales_glass_design:'grid'},
        aramagoushi:{sales_glass_design:'japanese'},
        yokoshige_fukiyose:{sales_glass_design:'japanese'},
        tateshige_fukiyose:{sales_glass_design:'japanese'},
      },
      helpText:'R5 Formalに保持されている格子・和室用デザインを営業見積依頼用に選択します。',
    },
    {
      key:'crescent_position_custom_mm',
      displayLabel:'クレセント位置（mm）',
      dataType:'NUMBER',
      unit:'mm',
      required:true,
      manualCheck:true,
      handoffKey:'crescent_position_custom_mm',
      when:{crescent_position:'custom'},
      helpText:'位置指定時の数値を入力します。特注W/H入力後に表示し、最終製作可否は積算／YKK AP確認へ引き継ぎます。',
    },
    {
      key:'pull_handle_position_custom_mm',
      displayLabel:'引手位置（mm）',
      dataType:'NUMBER',
      unit:'mm',
      required:true,
      manualCheck:true,
      handoffKey:'pull_handle_position_custom_mm',
      when:{pull_handle_position:'custom'},
      helpText:'位置指定時の引手位置寸法を入力します。クレセント位置入力の後に表示し、最終製作可否は積算／YKK AP確認へ引き継ぎます。',
    },
    {
      key:'middle_rail_position_custom_mm',
      displayLabel:'中桟位置（mm）',
      dataType:'NUMBER',
      unit:'mm',
      required:true,
      manualCheck:true,
      handoffKey:'middle_rail_position_custom_mm',
      when:{middle_rail_option:'enabled',middle_rail_position:'custom'},
      helpText:'中桟あり・位置指定時の中桟位置寸法を入力します。引手位置入力の後に表示し、最終製作可否は積算／YKK AP確認へ引き継ぎます。',
    },
    {
      key:'option_items',
      displayLabel:'オプション',
      dataType:'MULTI_ENUM',
      handoffKey:'option_items',
      values:[
        ['jamb_step_spacer','額縁段差スペーサー',false],
        ['sweep_attachment','掃き出しアタッチメント',false],
        ['meeting_stile_exterior_pull','突合せ框専用外部引手',false],
        ['sash_stopper','障子ストッパー',false],
        ['washitsu_filler','和障子用埋め木',false],
        ['decorative_jamb','化粧額縁',false],
        ['outer_window_replacement_crescent','外窓用 取替用クレセント（汎用クレセント）',true],
        ['outer_window_universal_handle','外窓用汎用ハンドル',true],
        ['adjustment_material','調整材',false],
        ['cover_material','カバー材',false],
      ],
      valueWhen:{
        jamb_step_spacer:{room_specification:'residential'},
        sweep_attachment:{room_specification:'residential',window_type:'sliding_window'},
        meeting_stile_exterior_pull:{room_specification:'residential',window_type:'sliding_window',sash_configuration:['three_panel','four_panel_equal','offset_four_panel']},
        sash_stopper:{window_type:'sliding_window'},
        washitsu_filler:{room_specification:'residential',window_type:'sliding_window'},
        decorative_jamb:{room_specification:'residential',window_type:'sliding_window',fukashi_presence:'none'},
        cover_material:{room_specification:'bathroom'},
      },
      helpText:'R6 Formal Product Masterの公式アクセサリを複数選択できます。既設外窓条件が必要な取替用クレセント／汎用ハンドルは積算・YKK AP確認へ引き継ぎます。',
    },
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
  suppressedFields:['supply_form','glass_detail','spacer','cavity_fill','crescent_position'],
  handoffDefaults:{
    supply_form:'ESTIMATION_RESPONSIBILITY',
    glass_detail:'MANUFACTURER_ESTIMATE_CONFIRMATION',
  },
  manualWarning:'営業入力で確定しない仕様は、選択した希望条件を積算／LIXIL確認事項として見積依頼へ引き継ぎます。',
  confirmationTo:'積算／LIXIL',
  confirmationCode:'INPLUS_SALES_REQUEST_CONFIRM',
  alwaysConfirm:true,
  valueAugmentations:Object.freeze([
    {
      field:'fukashi_reinforcement',
      handoffKey:'fukashi_reinforcement_request',
      when:{fukashi_depth:['40','50','70']},
      values:[['lower_reinforcement','ふかし枠下部補強部材',true]],
    },
    {
      field:'option_items',
      handoffKey:'additional_option_items',
      when:{window_type:['引違い窓','FIX窓','開き窓','テラスドア']},
      values:[
        ['OP-STEP','段差スペーサー',true],
        ['OP-EMBED-RESIN','埋め木樹脂材',true],
        ['OP-TRUE-WALL-SCREW','真壁取付用ねじ',true],
        ['OP-REPLACEMENT-CRESCENT','外窓用 交換用クレセント（汎用クレセント）',true],
      ],
    },
  ]),
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
      key:'sales_gas_fill',
      displayLabel:'中空層',
      slot:'gas_fill',
      handoffKey:'gas_fill_request',
      families:['Low-E複層','一般複層'],
      values:[['air','乾燥空気',false],['argon','アルゴンガス',false]],
      helpText:'営業では空気層厚を指定せず、乾燥空気／アルゴンガスの希望だけを見積依頼へ引き継ぎます。最終ガラス構成は積算／LIXILで確認します。',
    },
    {
      key:'crescent_presence',
      displayLabel:'クレセント有無',
      handoffKey:'crescent_presence',
      when:{window_type:'引違い窓'},
      values:[['installed','あり',false],['crescentless_special_order','なし（特注・要確認）',true]],
      helpText:'クレセントなしは特注対応可能ですが基本性能を満足しないため、積算／LIXIL確認事項として扱います。',
    },
    {
      key:'crescent_type',
      displayLabel:'クレセント種類',
      handoffKey:'crescent_type',
      when:{window_type:'引違い窓',crescent_presence:'installed'},
      values:[['standard','標準クレセント',false],['keyed','キー付きクレセント',true]],
      helpText:'キー付きクレセントはLIXIL現行有償品。詳細な適用・手配は積算／LIXILで確認します。',
    },
    {
      key:'crescent_position_mode',
      displayLabel:'クレセント位置',
      handoffKey:'crescent_position_mode',
      when:{window_type:'引違い窓'},
      unless:{crescent_presence:'crescentless_special_order'},
      values:[['standard','標準位置',false],['custom','位置指定',true]],
      helpText:'位置指定を選ぶと、特注W/Hの後にクレセント位置Pを入力します。',
    },
    {
      key:'crescent_position_p_mm',
      displayLabel:'クレセント位置P',
      dataType:'NUMBER',
      unit:'mm',
      step:0.5,
      required:true,
      manualCheck:true,
      validator:'INPLUS_CRESCENT_P',
      handoffKey:'crescent_position_p_mm',
      when:{crescent_position_mode:'custom'},
      helpText:'窓枠上面からクレセント中心までのP寸法。正式P寸法Ruleで範囲判定し、最終製作可否はLIXIL確認へ引き継ぎます。',
    },
    {
      key:'middle_rail_position_mode',displayLabel:'中桟位置',
      handoffKey:'middle_rail_position_mode',formalField:'sash_midrail',
      when:{sash_midrail:'あり'},required:true,
      values:[['standard','標準位置',false],['custom','位置指定',true]],
      helpText:'位置指定を選ぶと、特注W/Hとクレセント位置Pの後に中桟位置Fを入力します。',
    },
    {
      key:'middle_rail_position_f_mm',displayLabel:'中桟位置F（mm）',
      dataType:'NUMBER',unit:'mm',step:'any',required:true,manualCheck:true,
      validator:'INPLUS_MIDRAIL_F',handoffKey:'middle_rail_position_f_mm',
      formalField:'sash_midrail',when:{sash_midrail:'あり',middle_rail_position_mode:'custom'},
      parentFields:['sash_midrail','middle_rail_position_mode','order_height','upper_frame_spec','glass_family','crescent_position_mode','crescent_position_p_mm'],
      helpText:'中桟位置Fを正式PFルールで検証します。式や区分を確定できない場合は積算／LIXIL確認へ引き継ぎます。',
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
  ]),
});

function selectedRuntimeValues(state){
  return Object.fromEntries(Object.entries(state.fields??{})
    .filter(([,field])=>field?.value!==null&&field?.value!==undefined&&field?.value!=='')
    .map(([key,field])=>[key,field.value]));
}

function requestFieldApplies(definition,state,input={}){
  const selected={...selectedRuntimeValues(state),...(state.presentationSelection??{}),...input};
  if(definition.formalField){
    const formal=state.fields[definition.formalField];
    if(!formal||formal.visibility==='HIDE'||!formal.allowed_values?.length)return false;
    selected[definition.formalField]=formal.value;
  }
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

function conditionObjectMatches(conditions,selected){
  for(const [key,expected] of Object.entries(conditions??{})){
    const allowed=Array.isArray(expected)?expected:[expected];
    if(!allowed.some(value=>Object.is(value,selected[key])))return false;
  }
  return true;
}

function requestChoices(definition,state,input={}){
  const selected={...selectedRuntimeValues(state),...(state.presentationSelection??{}),...input};
  return (definition.values??[]).map((row)=>{
    const [value,displayLabel,manualCheck=true]=row;
    return {value,displayLabel,manualCheck:Boolean(manualCheck)};
  }).filter(({value})=>conditionObjectMatches(definition.valueWhen?.[value],selected));
}

function uniqueValues(values){
  const out=[];const seen=new Set();
  for(const value of values??[]){const key=JSON.stringify(value);if(seen.has(key))continue;seen.add(key);out.push(value);}
  return out;
}

function validateInplusCrescentP(master,state,value){
  const p=Number(value),h=Number(state.fields.order_height?.value);
  if(!Number.isFinite(p))return{ok:false,message:'クレセント位置Pは数値で入力してください。'};
  if(!Number.isFinite(h))return{ok:true,pending:true,message:'特注H入力後にクレセント位置Pを再評価します。'};
  const sizeClass=state.fields.size_class?.value;
  const upper=state.fields.upper_frame_spec?.value==='adjust_upper_frame'?'アジャスト上枠':'標準';
  const size=sizeClass==='テラスタイプ'?'テラスタイプ':'窓タイプ';
  const rows=master?.document?.tables?.pf_position_rules?.records??[];
  const candidates=rows.filter(row=>row['指定項目']==='クレセント位置P'&&row['上枠']===upper&&row['サイズ区分']===size&&h>=Number(row.H_min??-Infinity)&&(row.H_max===null||row.H_max===undefined||h<=Number(row.H_max)));
  if(candidates.length!==1)return{ok:true,pending:true,message:'クレセント位置Pの最終範囲は積算／LIXIL確認へ引き継ぎます。'};
  const expr=String(candidates[0]['判定式']??'').replace(/\s+/g,'');
  let ok=false;
  let m=expr.match(/^([0-9.]+)<=P<=([0-9.]+)$/);
  if(m)ok=p>=Number(m[1])&&p<=Number(m[2]);
  m=expr.match(/^H\/4<=P<=3H\/4ANDH-P<=([0-9.]+)$/);
  if(m)ok=p>=h/4&&p<=3*h/4&&h-p<=Number(m[1]);
  m=expr.match(/^\(H\+2\)\/4<=P<=3\*\(H\+2\)\/4ANDH-P<=([0-9.]+)$/);
  if(m){const hp=h+2;ok=p>=hp/4&&p<=3*hp/4&&h-p<=Number(m[1]);}
  if(!m&&!/^([0-9.]+)<=P<=([0-9.]+)$/.test(expr)&&!/^H\/4<=P<=3H\/4ANDH-P<=([0-9.]+)$/.test(expr))return{ok:true,pending:true,message:'クレセント位置Pの式を自動評価できないため積算／LIXIL確認へ引き継ぎます。'};
  return{ok,ruleId:candidates[0].rule_id,message:ok?`クレセント位置Pは正式範囲内です。（${candidates[0].rule_id}）`:`クレセント位置Pが正式範囲外です。（${candidates[0].rule_id}: ${candidates[0]['判定式']}）`};
}

export function applySalesRequestExtension(state, input, contract, master=null) {
  if (!contract) return state;
  const fields=[], selection={}, handoff={...(contract.handoffDefaults??{})};
  const augmentations={};
  let requiresManual=Boolean(contract.alwaysConfirm);
  let presentationMissing=false;

  for(const definition of contract.fields??[]){
    if(!requestFieldApplies(definition,state,input))continue;
    const family=state.fields.glass_family?.value;
    const dataType=definition.dataType??'ENUM';
    const field={
      key:definition.key,
      displayLabel:definition.displayLabel,
      dataType,
      unit:definition.unit??null,
      step:definition.step??null,
      required:Boolean(definition.required),
      values:dataType==='NUMBER'?[]:requestChoices(definition,state,input).filter(({value})=>!definition.excludeUnless?.[value]||definition.excludeUnless[value].includes(family)),
      parentFields:definition.parentFields??Object.keys(definition.when??{}),
      helpText:definition.helpText??'希望を見積依頼へ引き継ぎ、成立はメーカー見積で確認します。',
    };
    fields.push(field);
    const raw=input[definition.key];

    if(dataType==='NUMBER'){
      if(raw===null||raw===undefined||raw===''){
        if(definition.required){state.missing_required_fields=[...new Set([...(state.missing_required_fields??[]),definition.key])];presentationMissing=true;}
        continue;
      }
      const number=Number(raw);
      if(!Number.isFinite(number)){
        state.errors=[...(state.errors??[]),{code:'PRESENTATION_NUMBER_INVALID',field:definition.key,message:`${definition.displayLabel}は数値で入力してください。`}];
        continue;
      }
      selection[definition.key]=number;handoff[definition.handoffKey]=number;
      if(definition.manualCheck)requiresManual=true;
      if(definition.validator==='INPLUS_CRESCENT_P'){
        const result=validateInplusCrescentP(master,state,number);
        if(!result.ok)state.errors=[...(state.errors??[]),{code:'INPLUS_CRESCENT_POSITION_OUT_OF_RANGE',field:definition.key,message:result.message}];
        else if(result.pending)requiresManual=true;
      }
      if(definition.validator==='INPLUS_MIDRAIL_F'){
        const result=validateInplusMidrailF(master,state,number,input);
        handoff.middle_rail_position_validation={status:result.ok?(result.pending?'ESTIMATE_CONFIRM_REQUIRED':'FORMAL_RULE_RANGE_VALID'):'INVALID',rule_ids:result.ruleIds,message:result.message};
        if(result.linkedP!==undefined)handoff.middle_rail_linked_crescent_p={value:result.linkedP,unit:'mm',rule_id:result.linkRuleId,status:'ESTIMATE_CONFIRM_REQUIRED'};
        if(!result.ok)state.errors=[...(state.errors??[]),{code:'INPLUS_MIDRAIL_POSITION_OUT_OF_RANGE',field:definition.key,message:result.message}];
        if(result.pending){requiresManual=true;state.confirmation_requests=[...(state.confirmation_requests??[]),{code:'INPLUS_MIDRAIL_F_CONFIRM',status:'ESTIMATE_CONFIRM_REQUIRED',confirmation_to:'積算／LIXIL',message:result.message}];}
      }
      continue;
    }

    const values=field.values;
    if(dataType==='MULTI_ENUM'){
      const allowed=new Set(values.map(row=>row.value));
      const selected=(Array.isArray(raw)?raw:[]).filter(value=>allowed.has(value));
      if(selected.length){
        selection[definition.key]=selected;handoff[definition.handoffKey]=selected;
        if(values.some(row=>selected.includes(row.value)&&row.manualCheck))requiresManual=true;
      }
      continue;
    }
    const chosen=values.find(row=>Object.is(row.value,raw));
    if(chosen){
      selection[definition.key]=raw;handoff[definition.handoffKey]=raw;
      if(chosen.manualCheck)requiresManual=true;
    }else if(definition.required){
      state.missing_required_fields=[...new Set([...(state.missing_required_fields??[]),definition.key])];presentationMissing=true;
    }
  }

  for(const definition of contract.valueAugmentations??[]){
    if(!requestFieldApplies(definition,state,input))continue;
    const choices=requestChoices(definition,state,input);
    augmentations[definition.field]=choices;
    const raw=input[definition.field];
    const extraSet=new Set(choices.map(row=>row.value));
    if(Array.isArray(raw)){
      const extras=raw.filter(value=>extraSet.has(value));
      const formalAllowed=new Set(state.fields[definition.field]?.allowed_values??[]);
      const formalFromInput=raw.filter(value=>!extraSet.has(value)&&formalAllowed.has(value));
      const formalFromState=Array.isArray(state.fields[definition.field]?.value)?state.fields[definition.field].value:[];
      const merged=uniqueValues([...formalFromState,...formalFromInput,...extras]);
      if(merged.length)selection[definition.field]=merged;
      if(extras.length){
        handoff[definition.handoffKey]=extras;
        if(choices.some(row=>extras.includes(row.value)&&row.manualCheck))requiresManual=true;
      }
    }else if(extraSet.has(raw)){
      selection[definition.field]=raw;
      handoff[definition.handoffKey]=raw;
      if(choices.find(row=>Object.is(row.value,raw))?.manualCheck)requiresManual=true;
    }
  }

  const suppressed=new Set(contract.suppressedFields??[]);
  for(const key of suppressed)if(state.fields[key])state.fields[key]={...state.fields[key],value:null,visibility:'HIDE',required:false,readOnly:false,derived_by_rule:false,resolved_by_rule:false};
  state.missing_required_fields=(state.missing_required_fields??[]).filter(key=>!suppressed.has(key));
  state.presentationFields=fields;
  state.presentationSelection=selection;
  state.presentationValueAugmentations=augmentations;

  if(Object.keys(handoff).length)state.sales_request_handoff=handoff;
  const hasErrors=(state.errors??[]).length>0;
  if(hasErrors)state.status='INVALID';
  else if(presentationMissing&&!['INVALID','BLOCKED'].includes(state.status))state.status='INCOMPLETE';
  else if(requiresManual){
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
    if(!['INVALID','BLOCKED','INCOMPLETE'].includes(state.status))state.status='MANUAL_CHECK';
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
  return applySalesRequestExtension(state,input,sales,master);
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
