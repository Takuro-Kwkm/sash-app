// Typed native format boundary. Product meaning is supplied by the bound policy.
import {projectRowTableMaster,evaluateRowTableProjection,normalizeRowCondition} from './row-table-runtime-projection.mjs';
import {evaluateCondition} from './runtime-condition.mjs';
import {selectorMatches} from '../selector.mjs';
import {applyDeclaredWindowFlow} from './declared-window-flow.mjs';
import {createRowTableSalesViews} from './row-table-sales-views.mjs';
import {fieldLabel} from '../../../contracts/ui-common/field-labels.v1.mjs';
import {readFileSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';

const present=v=>v!==null&&v!==undefined&&v!=='';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const flat=state=>Object.fromEntries(Object.entries(state.fields).filter(([,v])=>present(v.value)&&v.state!=='NOT_APPLICABLE').map(([k,v])=>[k,v.value]));
export function createRowTableUi(document,integration){
  if(document.schema!=='ROW_TABLE_UI_CANDIDATE_V1'||document.formalAdoption!==false)throw new Error('ROW_TABLE_UI_CANDIDATE_REQUIRED');
  const source=readFileSync(document.source_master.path);
  if(lstatSync(document.source_master.path).isSymbolicLink()||createHash('sha256').update(source).digest('hex')!==document.source_master.sha256
    ||document.source_master.sha256!==integration.sourceReference?.sourceMasterSha256||document.projection_policy.native_product_id!==integration.id
    ||!same(JSON.parse(source),document.master))throw new Error('ROW_TABLE_SOURCE_MASTER_IDENTITY');
  const projection=projectRowTableMaster(document.master,document.projection_policy);
  for(const ref of document.ui_policy.sales_views?.source_refs??[]){if(createHash('sha256').update(readFileSync(ref.path)).digest('hex')!==ref.sha256)throw new Error('ROW_TABLE_UI_SOURCE_CHANGED');}
  projection.master.dependency_rules.push(...(document.ui_policy.runtime_ui_rules??[]));
  const conditionFields=c=>[...(c.field?[c.field]:[]),...(c.all??c.any??[]).flatMap(conditionFields)];
  for(const rule of document.ui_policy.runtime_ui_rules??[])for(const effect of rule.effects){const def=projection.master.fields.find(f=>f.field_name===effect.field);if(def)def.parent_fields=[...new Set([...def.parent_fields,...conditionFields(rule.conditions).filter(k=>k!==effect.field)])];}
  const salesViews=createRowTableSalesViews(document,projection);
  const policy=document.ui_policy,definitions=new Map(projection.master.fields.map(f=>[f.field_name,f]));
  if(Object.keys(policy.fields).length!==definitions.size||[...definitions.keys()].some(k=>!policy.fields[k]))throw new Error('ROW_TABLE_UI_MAPPING_INCOMPLETE');
  const label=(field,value)=>document.choice_visuals?.[field]?.[value]?.alt??policy.value_labels?.[field]?.[value]
    ??projection.master.values.find(r=>r.field_name===field&&same(r.canonical_value,value))?.display_label;
  const sourceSelector=row=>Object.fromEntries(Object.entries(document.projection_policy.dimension_selector_map).filter(([,column])=>present(row[column])).map(([field,column])=>[field,row[column]]));
  const lookupDomain=(relation,selection)=>{
    if(Object.keys(relation.selectors).some(key=>!present(selection[key])))return null;
    return new Set(document.master[relation.table].filter(row=>Object.entries(relation.selectors).every(([key,column])=>same(selection[key],row[column]))).map(row=>row[relation.column]));
  };
  function eligibleFields(evaluated){
    const values=evaluated.values,state=evaluated.state;
    const bundle=document.master.rule_bundle_master.find(b=>b.window_type_id===values.window_type);
    const allowed=new Set(['window_type']);
    if(!bundle)return allowed;
    for(const key of JSON.parse(bundle.visible_fields_json))allowed.add(key);
    for(const assignment of JSON.parse(bundle.auto_assigned_fields_json))if(!assignment.endsWith('=NOT_APPLICABLE'))allowed.add(assignment.split('=')[0]);
    for(const rule of document.master.dependency_rule_master){
      const action=JSON.parse(rule.result_json);
      if(!rule.is_active||action.action==='clear_value'||action.target_field==='*')continue;
      if(evaluateCondition(normalizeRowCondition(JSON.parse(rule.condition_json)),state))allowed.add(action.target_field);
    }
    for(const [field,column] of Object.entries(document.projection_policy.dimension_selector_map)){
      if(document.master.custom_size_region_master.some(row=>present(row[column])&&row[column]!=='NOT_APPLICABLE'&&selectorMatches(Object.fromEntries(Object.entries(sourceSelector(row)).filter(([k])=>k!==field)),values)))allowed.add(field);
    }
    for(const rule of policy.runtime_ui_rules??[])if(evaluateCondition(rule.conditions,state))for(const effect of rule.effects)if(effect.values?.length)allowed.add(effect.field);
    const screen=document.master.screen_master.find(row=>row.canonical_value===values.screen_type);
    if(screen?.screen_mesh_supported)allowed.add('screen_mesh_type');
    return allowed;
  }
  function resolve(input={},context={changedFields:[]}){
    if((context.changedFields??[]).some(k=>!definitions.has(k)&&!salesViews?.keys.includes(k)))throw new Error('UNKNOWN_CHANGED_FIELD');
    const sales=salesViews?.prepare(input,context.changedFields??[]);
    const activeProjection=sales?.projection??projection;
    let selection={...(sales?.native??input)};const cleared=new Set(),assignmentErrors=[],assigned=new Set();
    const lookupErrors=[...(sales?.errors??[])];
    for(const relation of policy.lookup_constraints??[]){
      const domain=lookupDomain(relation,selection),value=selection[relation.target];
      if(!domain||!present(value)||domain.has(value))continue;
      if(!Object.keys(relation.selectors).some(key=>context.changedFields?.includes(key)))lookupErrors.push({field:relation.target,code:'SOURCE_LOOKUP_SCOPE_MISMATCH',message:'選択した分類と仕様が元の対応表に一致しません。'});
      delete selection[relation.target];cleared.add(relation.target);
    }
    // An explicit size-code edit replaces the previous dimensions. Restoring an
    // inconsistent saved tuple remains a strict import error.
    if((context.changedFields??[]).includes(policy.standard_size_field)&&present(selection[policy.standard_size_field])){
      for(const key of [policy.width_field,policy.height_field])if(present(selection[key])){delete selection[key];cleared.add(key);}
    }
    const bundle=document.master.rule_bundle_master.find(b=>b.window_type_id===selection.window_type);
    for(const assignment of JSON.parse(bundle?.auto_assigned_fields_json??'[]')){
      const [key,value]=assignment.split('=');if(value==='NOT_APPLICABLE')continue;
      if(present(selection[key])&&selection[key]!==value&&!(context.changedFields??[]).includes('window_type'))assignmentErrors.push({field:key,code:'SOURCE_ASSIGNMENT_CONFLICT',message:'元の商品仕様の自動設定値と一致しません。'});
      selection[key]=value;assigned.add(key);
    }
    // A previous UI response includes derived values. Recompute source SET_VALUE
    // targets after their actual condition inputs change; an inconsistent saved
    // import without that edit context continues to fail validation.
    if(context.changedFields?.length){
      const seedState=evaluateRowTableProjection(activeProjection,selection).state;
      const references=condition=>[...(condition.field?[condition.field]:[]),...(condition.all??condition.any??[]).flatMap(references)];
      for(const rule of document.master.dependency_rule_master){
        const action=JSON.parse(rule.result_json),condition=JSON.parse(rule.condition_json);
        if(!rule.is_active||action.action!=='set_value'||!references(condition).some(key=>context.changedFields.includes(key)))continue;
        if(evaluateCondition(normalizeRowCondition(condition),seedState)&&present(selection[action.target_field])&&!assigned.has(action.target_field)){
          delete selection[action.target_field];cleared.add(action.target_field);
        }
      }
    }
    // Clear only invalid descendants following a real parent edit. Initial
    // invalid imports remain errors; valid downstream values are retained.
    for(let pass=0;pass<definitions.size;pass++){
      const evaluated=evaluateRowTableProjection(activeProjection,selection);let changed=false;
      const affected=new Set([...(context.changedFields??[]),...cleared]),eligible=eligibleFields(evaluated);
      for(const [key,fs] of Object.entries(evaluated.state.fields)){
        if(!present(selection[key])||definitions.get(key).selection_mode==='FIXED')continue;
        const parents=definitions.get(key).parent_fields;
        const invalid=!eligible.has(key)||fs.state==='NOT_APPLICABLE'||fs.visibility==='HIDE'
          ||(Array.isArray(fs.allowed_values)&&!fs.allowed_values.some(v=>same(v,selection[key])));
        if(invalid&&(parents.some(k=>affected.has(k))||affected.has('window_type'))){delete selection[key];cleared.add(key);changed=true;}
      }
      if(!changed)break;
    }
    let evaluated=evaluateRowTableProjection(activeProjection,selection);
    // A standard-size tuple must be reevaluated against its actual native scope.
    if(evaluated.input_issues.some(i=>i.field==='size_code')&&(context.changedFields??[]).some(k=>policy.size_parents.includes(k))){
      for(const key of ['size_code','width','height'])if(present(selection[key])){delete selection[key];cleared.add(key);}
      evaluated=evaluateRowTableProjection(activeProjection,selection);
    }
    const state=evaluated.state,eligible=eligibleFields(evaluated);selection=flat(state);
    for(const [key,fs] of Object.entries(state.fields))if(Array.isArray(fs.allowed_values)&&present(selection[key])&&!fs.allowed_values.some(v=>same(v,selection[key])))delete selection[key];
    for(const issue of evaluated.input_issues)if(['UNKNOWN_INPUT_FIELD','UNSOURCED_MULTI_SELECT_VALUE'].includes(issue.code))delete selection[issue.field];
    const outside=[];
    for(const key of Object.keys(selection))if(!eligible.has(key)&&definitions.get(key)?.selection_mode!=='FIXED'){
      if(present((sales?.native??input)[key])&&!cleared.has(key))outside.push({field:key,code:'NATIVE_PRESENTATION_SCOPE',message:'この窓種の表示・適用条件を確認できない値が含まれています。'});
      delete selection[key];
    }
    for(const key of ['width','height'])if(present(evaluated.values[key]))selection[key]=evaluated.values[key];
    const fields=[];const unresolved=[];
    for(const def of projection.master.fields){
      const key=def.field_name,role=policy.fields[key],fs=state.fields[key];
      if(sales?.hiddenFields.has(key))continue;
      if(['NON_UI','HANDOFF_ONLY'].includes(role.role)){if(role.role==='HANDOFF_ONLY')unresolved.push({field:key,label:def.display_label,customer_visible:role.customer_visible!==false,message:def.display_label+'：'+role.reason});continue;}
      if(fs.visibility==='HIDE'||fs.state==='NOT_APPLICABLE')continue;
      if(!eligible.has(key))continue;
      if((role.show_after??[]).some(k=>!present(selection[k])))continue;
      let choices=projection.master.values.filter(r=>r.field_name===key)
        .filter(r=>!Array.isArray(fs.allowed_values)||fs.allowed_values.some(v=>same(v,r.canonical_value)))
        .map(r=>({value:r.canonical_value,displayLabel:label(key,r.canonical_value),disabled:false,
          ...(document.choice_visuals?.[key]?.[r.canonical_value]?{image:document.choice_visuals[key][r.canonical_value]}:{})}));
      for(const relation of policy.lookup_constraints??[])if(relation.target===key){const domain=lookupDomain(relation,selection);if(domain)choices=choices.filter(choice=>domain.has(choice.value));}
      if(key===policy.standard_size_field){
        const rows=document.master.size_master.filter(r=>selectorMatches(sourceSelector(r),evaluated.values));
        const codes=new Map();for(const row of rows){const previous=codes.get(row.size_code);if(previous&&!same([previous.width,previous.height],[row.width,row.height])){codes.set(row.size_code,null);continue;}if(!codes.has(row.size_code))codes.set(row.size_code,row);}
        choices=[...codes].filter(([,row])=>row).map(([value,row])=>({value,displayLabel:`${row.size_code} ｜ W ${row.width} × H ${row.height}`,disabled:false}));
      }
      const dimensionColumn=document.projection_policy.dimension_selector_map[key];
      if(dimensionColumn&&key!=='window_type'){
        const compatible=document.master.custom_size_region_master.filter(row=>selectorMatches(Object.fromEntries(Object.entries(sourceSelector(row)).filter(([k])=>k!==key)),evaluated.values));
        const domain=new Set(compatible.map(row=>row[dimensionColumn]).filter(present));
        if(domain.size)choices=choices.filter(choice=>domain.has(choice.value));
      }
      if(key==='screen_mesh_type'){
        const screen=document.master.screen_master.find(row=>row.canonical_value===evaluated.values.screen_type);
        const supported=screen?.screen_mesh_supported?.split('|');if(supported)choices=choices.filter(choice=>supported.includes(choice.value));
      }
      if(choices.some(c=>!c.displayLabel))throw new Error('UNMAPPED_NATIVE_CHOICE_LABEL:'+key);
      const readOnly=role.role==='DERIVED'||assigned.has(key)||['RESOLVED','DERIVED'].includes(fs.state)||(key===policy.width_field||key===policy.height_field)&&present(selection[policy.standard_size_field]);
      fields.push({key,fieldId:def.source.field_id??key,displayLabel:fieldLabel(key,role.label??def.display_label),dataType:def.data_type==='number'?'NUMBER':def.data_type==='array'?'MULTI_ENUM':'ENUM',values:choices,
        required:fs.required,readOnly,disabled:readOnly,selectionMode:readOnly?'DERIVED':'USER_SELECTABLE',parentFields:def.parent_fields,
        ...(def.data_type==='number'?{step:1,unit:'mm'}:{}),helpText:role.helpText??'',displayOrder:def.display_order});
    }
    const messages=new Map(document.master.user_message_master.map(r=>[r.user_message_id,r.message]));
    const reasonMessage=code=>messages.get(document.master.reason_code_master.find(r=>r.reason_code===code)?.default_user_message_id)??'この条件は積算・メーカーへ確認してください。';
    const reasonMessages=evaluated.all_reason_codes.map(reasonMessage);
    const manufacturerRequests=projection.manual.filter(r=>evaluated.source_manual_rule_ids.includes(r.row.dependency_rule_id??r.row.size_availability_id)).map(r=>({field:r.row.target_field,code:r.row.reason_code,message:reasonMessage(r.row.reason_code),status:'ESTIMATE_CONFIRM_REQUIRED',confirmation_target:'積算・メーカー'}));
    if(evaluated.dimension.status==='REVIEW_REQUIRED')manufacturerRequests.push({field:'width',message:'この寸法は原本グラフ・製作条件をメーカーへ確認してください。',status:'ESTIMATE_CONFIRM_REQUIRED',confirmation_target:'積算・メーカー'});
    if(sales?.customDimension)evaluated.dimension=sales.customDimension;
    if(sales?.openingAmbiguous)manufacturerRequests.push({field:'width',message:sales.customDimension.message,status:'ESTIMATE_CONFIRM_REQUIRED',confirmation_target:'積算・メーカー'});
    const confirmations=[...unresolved,...manufacturerRequests,...(sales?.confirmations??[])];
    if(sales){Object.assign(selection,sales.selection);fields.push(...sales.fields());for(const key of sales.cleared)cleared.add(key);}
    const errors=[...lookupErrors,...assignmentErrors,...outside,...evaluated.input_issues.map(i=>({field:i.field,code:i.code,message:'入力値が元の商品仕様と一致しません。'})),...state.errors,
      ...evaluated.source_invalid_rule_ids.map(id=>({code:id,message:'この組合せは選択できません。条件を変更してください。'}))];
    const missingRequiredFields=[...state.missing_required_fields.filter(k=>!sales?.hiddenFields.has(k)),...(sales?.fields()??[]).filter(f=>f.required&&!present(selection[f.key])).map(f=>f.key)];
    const result={productId:integration.id,manufacturer:integration.manufacturer,series:integration.series,selection,fields:applyDeclaredWindowFlow(fields,integration).map(f=>({...f,displayLabel:fieldLabel(f.key,f.displayLabel)})),clearedFields:[...cleared].filter(key=>!present(selection[key])),
      validation:{status:errors.length||(!sales?.openingAmbiguous&&evaluated.constraint_status==='INVALID')?'INVALID':!missingRequiredFields.length?'VALID':'INCOMPLETE',errors,missingRequiredFields},
      dimensionResult:evaluated.dimension,manualWarnings:[...reasonMessages,...(evaluated.constraint_status==='MANUAL_CONFIRMATION_REQUIRED'?['この寸法・仕様はメーカーへの確認が必要です。']:[])],
      confirmationRequests:confirmations,estimateConfirmations:confirmations,runtimeMaster:{packageVersion:integration.packageVersion,sourceMasterSha256:document.source_master.sha256,candidateOnly:true},
      presentation:{independentUserRequirements:true},candidateOnly:true,formalAdoption:false,runtimeUiAdopted:false,automaticOrderability:false,source:'RUNTIME_MASTER',constraintStatus:evaluated.constraint_status};
    return result;
  }
  return {projection,uiResolver:resolve};
}
