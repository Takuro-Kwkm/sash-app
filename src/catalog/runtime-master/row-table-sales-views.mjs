// Source-backed presentation projections for row-table inputs. Product differences
// are declared in the bound policy; all rule and geometry execution stays shared.
import {evaluateRowTableProjection} from './row-table-runtime-projection.mjs';
const present=v=>v!==undefined&&v!==null&&v!=='';
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const naturalOrder=new Intl.Collator('ja',{numeric:true});
export function createRowTableSalesViews(document,projection){
 const policy=document.ui_policy.sales_views;if(!policy)return null;
 const size=policy.standard_size,modeKey=size.mode_key,viewKeys=[modeKey,size.key,size.panel_key,...policy.glazing.map(v=>v.key)];
 const matching=(row,input,ignore=[])=>Object.entries(document.projection_policy.dimension_selector_map).every(([key,col])=>ignore.includes(key)||!present(row[col])||row[col]==='NOT_APPLICABLE'||!present(input[key])||eq(row[col],input[key]));
 const groups=input=>{
  if(!present(input.window_type)||!present(input.construction_module))return [];
  const map=new Map();for(const row of document.master.size_master.filter(r=>matching(r,input,['opening_class']))){
   const code=row.size_code.replace(/-[24]$/,''),key=`${code}:${row.width}:${row.height}:${row.opening_class}`;
   if(!map.has(key))map.set(key,{key,label:`${code} ｜ W ${row.width} × H ${row.height}`,rows:[]});map.get(key).rows.push(row);
  }return [...map.values()].sort((a,b)=>{
   for(const column of size.sort_columns??['width','height','size_code']){
    const x=a.rows[0][column],y=b.rows[0][column];
    const order=typeof x==='number'&&typeof y==='number'?x-y:naturalOrder.compare(String(x??''),String(y??''));if(order)return order;
   }return naturalOrder.compare(a.key,b.key);
  });
 };
 const filteredProjection=count=>({...projection,dimensionCatalog:{...projection.dimensionCatalog,ruleSets:projection.dimensionCatalog.ruleSets.map(set=>({...set,payload:set.payload.filter(r=>!size.region_panel_counts[r.id]||size.region_panel_counts[r.id]===count)}))}});
 const visible=(definition,values)=>Object.entries(definition.show_when??{}).every(([k,v])=>values[k]===v);
 function prepare(input,changed=[]){
  const native={...input},selection=Object.fromEntries(viewKeys.filter(k=>present(input[k])).map(k=>[k,input[k]])),errors=[],cleared=[];
  for(const key of viewKeys)delete native[key];
  const edited=keys=>keys.some(k=>changed.includes(k));
  const clearTuple=()=>{for(const key of ['opening_class','size_code','width','height'])delete native[key];};
  const explicitModeClear=changed.includes(modeKey)&&!present(selection[modeKey]);
  const explicitSizeClear=changed.includes(size.key)&&!present(selection[size.key]);
  // Migrate earlier saved views, including CUSTOM in the old size dropdown.
  // An explicit current mode is authoritative and contradictory imports fail.
  if(!Object.hasOwn(input,modeKey)&&!changed.includes(modeKey)){
   if(selection[size.key]===size.custom_value){selection[modeKey]=size.custom_value;delete selection[size.key];}
   else if(present(selection[size.key])||present(native.size_code))selection[modeKey]=size.standard_value;
   else if(present(native.width)||present(native.height))selection[modeKey]=size.custom_value;
  }
  if(present(selection[modeKey])&&![size.standard_value,size.custom_value].includes(selection[modeKey])){errors.push({field:modeKey,code:'UNKNOWN_SIZE_MODE',message:'サイズ区分を選び直してください。'});delete selection[modeKey];}
  if(changed.includes(modeKey)){delete selection[size.key];clearTuple();}
  if(explicitSizeClear)clearTuple();
  if(!changed.length&&Object.hasOwn(input,modeKey)&&!present(input[modeKey])&&[size.key,'size_code','width','height'].some(k=>present(input[k])))errors.push({field:modeKey,code:'EMPTY_SIZE_MODE_CONFLICT',message:'サイズ区分が未選択のまま寸法が保存されています。'});
  if(!changed.length&&Object.hasOwn(input,size.key)&&!present(input[size.key])&&selection[modeKey]!==size.custom_value&&['size_code','width','height'].some(k=>present(native[k])))errors.push({field:size.key,code:'EMPTY_SIZE_VIEW_CONFLICT',message:'未選択のサイズに寸法が保存されています。規格サイズを選び直してください。'});
  if(edited(['window_type','construction_module','opening_angle'])&&selection[modeKey]!==size.custom_value){
   delete selection[size.key];delete selection[size.panel_key];clearTuple();
  }
  const available=groups(native);
  if(!explicitModeClear&&!explicitSizeClear&&selection[modeKey]===size.standard_value&&!Object.hasOwn(input,size.key)&&!present(selection[size.key])&&present(native.size_code)){
   const group=available.find(g=>g.rows.some(r=>r.size_code===native.size_code&&matching(r,native)));
   if(group){selection[size.key]=group.key;const row=group.rows.find(r=>r.size_code===native.size_code);if(size.row_panel_counts[row.size_master_id]&&!present(selection[size.panel_key]))selection[size.panel_key]=size.row_panel_counts[row.size_master_id];}
  }
  if(selection[modeKey]!==size.standard_value&&present(selection[size.key])){errors.push({field:modeKey,code:'SIZE_MODE_VIEW_CONFLICT',message:'サイズ区分と規格サイズが一致しません。'});delete selection[size.key];}
  const panelDomain=[...new Set(available.flatMap(g=>g.rows.map(r=>size.row_panel_counts[r.size_master_id]).filter(present)))];
  if(changed.includes(size.panel_key)&&!present(selection[size.panel_key])){delete selection[size.key];for(const key of ['opening_class','size_code','width','height'])delete native[key];}
  let group=available.find(g=>g.key===selection[size.key]);
  if(present(selection[size.key])&&!group){errors.push({field:size.key,code:'SOURCE_SIZE_VIEW_SCOPE',message:'規格サイズを選び直してください。'});delete selection[size.key];}
  const custom=selection[modeKey]===size.custom_value;
  const counts=panelDomain;
  if(group&&counts.length&&present(selection[size.panel_key])&&!group.rows.some(r=>size.row_panel_counts[r.size_master_id]===selection[size.panel_key])){
   if(changed.includes(size.panel_key)){delete selection[size.key];for(const key of ['opening_class','size_code','width','height'])delete native[key];cleared.push(size.key);group=null;}
   else errors.push({field:size.key,code:'STANDARD_PANEL_SCOPE',message:'建数に対応する規格サイズを選択してください。'});
  }
  if(counts.length===1){
   if(present(selection[size.panel_key])&&selection[size.panel_key]!==counts[0]&&!edited([size.key,'window_type','construction_module']))errors.push({field:size.panel_key,code:'FIXED_PANEL_CONFLICT',message:'保存された建数と規格サイズが一致しません。'});
   selection[size.panel_key]=counts[0];
  }
  if(present(selection[size.panel_key])&&(!counts.includes(selection[size.panel_key]))){if(!edited([size.key,'window_type','construction_module']))errors.push({field:size.panel_key,code:'SOURCE_PANEL_SCOPE',message:'この規格サイズに対応する建数ではありません。'});delete selection[size.panel_key];cleared.push(size.panel_key);}
  const sizeEdited=edited([modeKey,size.key,size.panel_key]);
  if(custom){
   if(present(native.size_code)&&!changed.includes(modeKey))errors.push({field:size.key,code:'CUSTOM_NATIVE_CODE_CONFLICT',message:'特注サイズと規格サイズのコードが同時に保存されています。'});
   delete native.size_code;delete native.opening_class;
   if(changed.includes(modeKey)){delete native.width;delete native.height;}
  }else if(group){
   const rows=group.rows.filter(r=>!size.row_panel_counts[r.size_master_id]||size.row_panel_counts[r.size_master_id]===selection[size.panel_key]);
   if(rows.length===1){const row=rows[0];
    if(!sizeEdited&&['width','height'].some(k=>present(native[k])&&native[k]!==row[k]))errors.push({field:size.key,code:'STANDARD_DIMENSION_MISMATCH',message:'保存された規格サイズと寸法が一致しません。'});
    if(!sizeEdited&&present(native.opening_class)&&native.opening_class!==row.opening_class)errors.push({field:size.key,code:'SOURCE_OPENING_CONTEXT_CONFLICT',message:'保存された枠仕様と規格サイズが一致しません。'});
    if(!sizeEdited&&present(native.size_code)&&native.size_code!==row.size_code)errors.push({field:size.key,code:'SOURCE_SIZE_TUPLE_CONFLICT',message:'保存された規格サイズと建数が一致しません。'});
    Object.assign(native,{size_code:row.size_code,opening_class:row.opening_class,width:row.width,height:row.height});
   }else{if(!sizeEdited&&['size_code','width','height'].some(key=>present(native[key])))errors.push({field:size.key,code:'UNRESOLVED_SIZE_TUPLE',message:'建数が未選択のサイズに寸法が保存されています。'});for(const key of ['size_code','opening_class','width','height'])delete native[key];}
  }
  if(selection[modeKey]===size.standard_value&&!group&&['size_code','width','height'].some(key=>present(native[key]))){errors.push({field:size.key,code:'STANDARD_WITHOUT_SIZE',message:'規格サイズと保存された寸法が一致しません。'});clearTuple();}
  let contextualProjection=projection,customDimension=null,openingAmbiguous=false;
  if(custom&&size.panel_windows.includes(native.window_type)&&!present(selection[size.panel_key])){customDimension={status:'PENDING',matchedRuleIds:[],message:'建数を選択してください。'};openingAmbiguous=true;}
  if(custom){
   contextualProjection=filteredProjection(selection[size.panel_key]);
   if(Number.isSafeInteger(native.width)&&Number.isSafeInteger(native.height)){
    const contexts=[...new Set(document.master.custom_size_region_master.filter(r=>matching(r,native,['opening_class'])&&(!size.region_panel_counts[r.custom_size_region_id]||size.region_panel_counts[r.custom_size_region_id]===selection[size.panel_key])).map(r=>r.opening_class))];
    const probes=contexts.map(opening_class=>({opening_class,result:evaluateRowTableProjection(contextualProjection,{...native,opening_class})})).filter(p=>['PASS','REVIEW_REQUIRED'].includes(p.result.dimension.status));
    if(present(input.opening_class)&&probes.length&&!probes.some(p=>p.opening_class===input.opening_class)&&!edited([modeKey,size.key,size.panel_key,'width','height','window_type','construction_module']))errors.push({field:size.key,code:'CUSTOM_CONTEXT_NOT_IN_SOURCE_FITS',message:'保存された枠仕様と寸法条件が一致しません。'});
    if(probes.length===1){
     if(present(input.opening_class)&&input.opening_class!==probes[0].opening_class&&!edited([modeKey,size.key,size.panel_key,'width','height','window_type','construction_module']))errors.push({field:size.key,code:'CUSTOM_OPENING_CONTEXT_CONFLICT',message:'保存された枠仕様と寸法条件が一致しません。'});
     native.opening_class=probes[0].opening_class;
    }
    else if(probes.length>1){openingAmbiguous=true;customDimension={status:'REVIEW_REQUIRED',matchedRuleIds:[...new Set(probes.flatMap(p=>p.result.dimension.matchedRuleIds))],message:'寸法に適合する枠仕様が複数あります。納まり条件を積算・メーカーへ確認してください。'};}
   }
  }
  // Legacy mixed glass choices are carried into their own request axis. Missing
  // appearance/base is intentionally left unanswered rather than invented.
  const suppliedGlass={type:native.glass_type,category:native.glass_category};
  if(present(native.glass_category)&&!document.master.glass_master.some(r=>r.glass_category===native.glass_category)&&!edited(['glazing_base','glazing_performance']))errors.push({field:'glazing_base',code:'UNKNOWN_NATIVE_GLASS_CATEGORY',message:'保存されたガラス分類を確認してください。'});
  const legacy=document.master.glass_master.find(r=>r.glass_type===native.glass_type);
  if(legacy&&present(native.glass_category)&&native.glass_category!==legacy.glass_category&&!edited(['glazing_base','glazing_performance']))errors.push({field:'glazing_base',code:'NATIVE_GLASS_CATEGORY_CONFLICT',message:'保存されたガラス分類と仕様が一致しません。'});
  if(present(native.glass_type)&&!legacy)errors.push({field:'glazing_base',code:'UNKNOWN_NATIVE_GLASS',message:'保存されたガラス仕様を確認してください。'});
  if(legacy&&!policy.glazing.some(v=>present(selection[v.key]))){
   for(const v of policy.glazing){const option=v.values.find(o=>o.native_value===legacy.glass_type||o.native_probe===legacy.glass_type);if(option)selection[v.key]=v.multi?[option.value]:option.value;}
   if(legacy.glass_type===policy.general_native_value)selection.glazing_base='GENERAL';
   else if(legacy.glass_category==='standard')selection.glazing_base='LOW_E';
  }
  if(edited(['glazing_base'])){
   delete native.glass_type;delete native.glass_category;
   if(selection.glazing_base!=='LOW_E'){delete selection.glazing_performance;if(selection.glazing_gas==='ARGON'){delete selection.glazing_gas;cleared.push('glazing_gas');}}
  }
  const glassProbe=value=>evaluateRowTableProjection(projection,{...native,glass_type:value,glass_category:document.master.glass_master.find(r=>r.glass_type===value)?.glass_category});
  const allowedGlass=value=>{const r=glassProbe(value);return r.state.fields.glass_type.allowed_values?.includes(value)!==false&&!r.source_invalid_rule_ids.some(id=>id.includes('GLASS'));};
  for(const view of policy.glazing){
   if(!visible(view,selection)){if(present(selection[view.key])&&!edited(['glazing_base']))errors.push({field:view.key,code:'GLAZING_AXIS_SCOPE',message:'ガラス基本構成に対応する項目ではありません。'});delete selection[view.key];continue;}
   const options=view.values.filter(o=>visible(o,selection)&&(!o.native_probe||allowedGlass(o.native_probe)));
   const selected=view.multi?selection[view.key]??[]:present(selection[view.key])?[selection[view.key]]:[];
   if(!Array.isArray(selected)||selected.some(value=>!options.some(o=>o.value===value))){
    if(edited(['window_type','glazing_base',modeKey,size.key,size.panel_key,'width','height'])){if(view.multi)selection[view.key]=Array.isArray(selected)?selected.filter(value=>options.some(o=>o.value===value)):[];else delete selection[view.key];cleared.push(view.key);}
    else{errors.push({field:view.key,code:'SOURCE_GLAZING_SCOPE',message:'ガラスの選択内容を確認してください。'});delete selection[view.key];}
   }
  }
  if(selection.glazing_base==='GENERAL'){native.glass_type=policy.general_native_value;native.glass_category='standard';}
  else if(selection.glazing_base==='LOW_E'){
   const value=policy.glazing.find(v=>v.key==='glazing_performance').values.find(o=>o.value===selection.glazing_performance)?.native_value;
   if(value){native.glass_type=value;native.glass_category='standard';}else{delete native.glass_type;delete native.glass_category;}
  }else{delete native.glass_type;delete native.glass_category;}
  if(!edited(['glazing_base','glazing_performance'])&&present(suppliedGlass.category)&&present(native.glass_category)&&suppliedGlass.category!==native.glass_category)errors.push({field:'glazing_base',code:'NATIVE_GLAZING_CATEGORY_VIEW_CONFLICT',message:'保存されたガラス分類と選択項目が一致しません。'});
  if(!edited(['glazing_base','glazing_performance'])&&present(suppliedGlass.type)&&present(native.glass_type)&&suppliedGlass.type!==native.glass_type)errors.push({field:'glazing_base',code:'NATIVE_GLAZING_VIEW_CONFLICT',message:'保存されたガラス仕様と選択項目が一致しません。'});
  function fields(){
   if(!present(native.window_type))return [];
   const result=[];const add=(key,label,values,other={})=>result.push({key,fieldId:key,displayLabel:label,dataType:'ENUM',values:values.map(o=>({value:o.value,displayLabel:o.label,disabled:false,...(o.image?{image:o.image}:{})})),required:false,readOnly:false,disabled:false,selectionMode:'USER_SELECTABLE',parentFields:[],...other});
   if(present(native.construction_module)){
    if(counts.length)add(size.panel_key,size.panel_label,counts.map(value=>({value,label:value+'枚建'})),{required:true,displayOrder:20,readOnly:counts.length===1,disabled:counts.length===1,selectionMode:counts.length===1?'DERIVED':'USER_SELECTABLE',parentFields:['construction_module']});
    if(!counts.length||counts.includes(selection[size.panel_key])){
     const rows=available.filter(g=>!counts.length||g.rows.some(r=>size.row_panel_counts[r.size_master_id]===selection[size.panel_key]));
     add(modeKey,size.mode_label,[{value:size.standard_value,label:'規格'},{value:size.custom_value,label:'特注'}],{required:true,displayOrder:21,parentFields:counts.length?[size.panel_key]:['construction_module']});
     if(selection[modeKey]===size.standard_value)add(size.key,size.label,rows.map(g=>({value:g.key,label:g.label})),{required:true,displayOrder:22,parentFields:[modeKey,...(counts.length?[size.panel_key]:[])]});
    }
   }
   for(const v of policy.glazing)if(visible(v,selection))add(v.key,v.label,v.values.filter(o=>visible(o,selection)&&(!o.native_probe||allowedGlass(o.native_probe))),{required:Boolean(v.required),dataType:v.multi?'MULTI_ENUM':'ENUM',displayOrder:33,helpText:v.helpText??'',parentFields:[]});
   return result;
  }
  return {native,selection,errors,cleared,projection:contextualProjection,custom,customDimension,openingAmbiguous,fields,
   confirmations:[...(policy.confirmations??[]).filter(r=>Object.entries(r.when).every(([key,value])=>Array.isArray(value)?value.includes(native[key]):native[key]===value)).map(({when,...row})=>({...row,status:'ESTIMATE_CONFIRM_REQUIRED',confirmation_target:'積算・メーカー'})),...(policy.glazing.some(v=>present(selection[v.key]))?[{field:'glazing_base',code:'SOURCE_GLAZING_COMBINATION_CONFIRMATION',message:policy.glazing_combination_message,status:'ESTIMATE_CONFIRM_REQUIRED',confirmation_target:'積算・メーカー',selection:structuredClone(selection),source_refs:policy.source_refs}]:[])],
   hiddenFields:new Set(['opening_class','size_code','glass_category','glass_type',...(!custom?['width','height']:[])])};
 }
 return {prepare,keys:viewKeys,groups};
}
