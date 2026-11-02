// Native source-derived expectations, prepared before any Browser observations.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {projectRowTableMaster,evaluateRowTableProjection} from '../../src/catalog/runtime-master/row-table-runtime-projection.mjs';
import {GLOBAL_WINDOW_STAGE_ORDER,NEW_CONSTRUCTION_CANONICAL_SLOT_ORDER} from '../../src/catalog/runtime-master/canonical-window-semantic-schema.mjs';
import {standardWindowFieldLabel} from '../../src/catalog/runtime-master/window-field-labels.mjs';
import {fieldLabel} from '../../contracts/ui-common/field-labels.v1.mjs';
import {evaluateCondition} from '../../src/catalog/runtime-master/runtime-condition.mjs';
import {selectorMatches} from '../../src/catalog/selector.mjs';
const [candidateDir,outDir,sharedRoot]=process.argv.slice(2),root=path.resolve(new URL('../../',import.meta.url).pathname),out=path.resolve(outDir);
if(fs.existsSync(out))throw new Error('PRESERVE_EXISTING_INVENTORY');fs.mkdirSync(out,{recursive:true});
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),ref=p=>({path:path.resolve(p),sha256:hash(fs.readFileSync(p))}),write=(n,d)=>fs.writeFileSync(path.join(out,n),JSON.stringify(d,null,2)+'\n');
const base=path.resolve(candidateDir),doc=JSON.parse(fs.readFileSync(path.join(base,'candidate.json'))),index=JSON.parse(fs.readFileSync(path.join(base,'candidate-index.json'))),entry=index.products[0],source=doc.master;
const projection=projectRowTableMaster(source,doc.projection_policy),roles=doc.ui_policy.fields;
projection.master.dependency_rules.push(...(doc.ui_policy.runtime_ui_rules??[]));
const views=doc.ui_policy.sales_views;
const seeds=JSON.parse(fs.readFileSync(path.join(base,'case-seeds.json'))),cases=structuredClone(seeds.cases),baseline=seeds.field_baselines,primary=cases.find(c=>c.id==='PRIMARY').input;
for(const row of source.color_master)cases.push({id:'COLOR_'+row.color_combination_id,input:{...primary,color_combination:row.color_combination_id}});
for(const row of source.glass_master){const input={...primary};for(const v of views.glazing){const option=v.values.find(o=>o.native_probe===row.glass_type||o.native_value===row.glass_type);if(option)input[v.key]=v.multi?[option.value]:option.value;}if(row.glass_type===views.general_native_value){input.glazing_base='GENERAL';delete input.glazing_performance;input.glazing_gas='AIR';}cases.push({id:'GLASS_'+row.glass_option_id,input});}
cases.push({id:'PANELS',input:{...primary,size_mode:views.standard_size.standard_value,standard_size:'25118:2550:1830:terrace',opening_class:'terrace',size_code:'25118-2',width:2550,height:1830,panel_count:'2'}});
const scope={repository:'Takuro-Kwkm/sash-app',product_id:entry.id,master_sha256:doc.source_master.sha256,flow_sha256:ref(path.join(base,'flow.json')).sha256};
const fields=source.field_master.map(f=>{
 const key=f.field_name,role=roles[key],stateId=baseline[key]??'PRIMARY',input=cases.find(c=>c.id===stateId).input;
 const bundle=source.rule_bundle_master.find(b=>b.window_type_id===input.window_type),configured={...input};
 for(const a of JSON.parse(bundle?.auto_assigned_fields_json??'[]')){const [k,v]=a.split('=');if(v!=='NOT_APPLICABLE')configured[k]=v;}
 const evaluated=evaluateRowTableProjection(projection,configured),fs=evaluated.state.fields[key];
 let candidates=projection.master.values.filter(r=>r.field_name===key).filter(r=>!Array.isArray(fs.allowed_values)||fs.allowed_values.includes(r.canonical_value)).map(r=>r.canonical_value);
 for(const relation of doc.ui_policy.lookup_constraints??[])if(relation.target===key&&Object.keys(relation.selectors).every(k=>input[k]!==undefined)){
  const domain=new Set(source[relation.table].filter(row=>Object.entries(relation.selectors).every(([k,col])=>input[k]===row[col])).map(row=>row[relation.column]));candidates=candidates.filter(value=>domain.has(value));
 }
 if(key==='size_code')candidates=[...new Set(source.size_master.filter(row=>selectorMatches(Object.fromEntries(Object.entries(doc.projection_policy.dimension_selector_map).filter(([,col])=>row[col]).map(([k,col])=>[k,row[col]])),evaluated.values)).map(r=>r.size_code))];
 if(key==='screen_mesh_type'){const row=source.screen_master.find(r=>r.canonical_value===evaluated.values.screen_type);if(row?.screen_mesh_supported)candidates=candidates.filter(v=>row.screen_mesh_supported.split('|').includes(v));}
 if(role.role==='DERIVED')candidates=fs.value===null||fs.value===undefined?[]:[fs.value];
 const ui=['SELECTOR','DERIVED'].includes(role.role),type=f.value_type==='integer'?'NUMBER':f.selection_type==='multi_select'?'MULTI_ENUM':'ENUM';
 const label=fieldLabel(key,standardWindowFieldLabel({uiCategory:entry.uiCategory,semanticSlot:role.slot,key,fallback:fieldLabel(key,role.label)}));
 const field={field_id:key,master_field_id:key,stage:role.stage,semantic_slot:role.slot,role:role.role,label,visible:ui,required:ui&&fs.required,
 control:ui?(role.role==='DERIVED'?'output':type==='NUMBER'?'number':type==='MULTI_ENUM'?(role.control==='DROPDOWN_MULTI'?'select-add-remove':'checkbox-group'):'select'):'none',candidate_values:ui?candidates:[],state_id:stateId,source_refs:[doc.source_master],...(role.reason?{reason:role.reason}:{})};
 if(key==='window_type')field.image_required=true;
 if(['color_combination','exterior_color','interior_color'].includes(key))field.image_cases=source.color_master.map(row=>({state_id:'COLOR_'+row.color_combination_id,candidate_values:key==='color_combination'?source.color_master.map(r=>r.color_combination_id):[row[key]]}));
 if(key==='window_type')field.image_cases=[{state_id:'PRIMARY',candidate_values:candidates}];
 return field;
}).sort((a,b)=>GLOBAL_WINDOW_STAGE_ORDER.indexOf(a.stage)-GLOBAL_WINDOW_STAGE_ORDER.indexOf(b.stage)||(entry.uiFlowContract.slotOrder.indexOf(roles[a.field_id].slot)-entry.uiFlowContract.slotOrder.indexOf(roles[b.field_id].slot))||(source.field_master.find(f=>f.field_name===a.field_id).sort_order-source.field_master.find(f=>f.field_name===b.field_id).sort_order));
const projectionFields=[];
const addView=(field_id,label,stage,slot,candidates,state_id,extra={})=>projectionFields.push({field_id,master_field_id:null,stage,semantic_slot:slot,role:'SELECTOR',label,visible:true,required:true,control:'select',candidate_values:candidates,state_id,source_refs:views.source_refs,...extra});
const std=views.standard_size;
const sourceGroups=new Map();for(const row of source.size_master.filter(r=>r.window_type_id===primary.window_type&&r.construction_module===primary.construction_module)){
 const code=row.size_code.replace(/-[24]$/,''),id=[code,row.width,row.height,row.opening_class].join(':');if(!std.row_panel_counts[row.size_master_id]||std.row_panel_counts[row.size_master_id]===primary.panel_count){if(!sourceGroups.has(id))sourceGroups.set(id,[]);sourceGroups.get(id).push(row);}
}
const sourceRowsInOrder=[...sourceGroups].sort(([,a],[,b])=>{for(const column of std.sort_columns??['width','height','size_code']){const x=a[0][column],y=b[0][column],order=typeof x==='number'&&typeof y==='number'?x-y:String(x??'').localeCompare(String(y??''),'ja',{numeric:true});if(order)return order;}return 0;});
addView(std.mode_key,fieldLabel(std.mode_key,std.mode_label),'SIZE','size',[std.standard_value,std.custom_value],'PRIMARY');
addView(std.key,'規格サイズ','SIZE','size',sourceRowsInOrder.map(([key])=>key),'PANELS');
addView(std.panel_key,'建数','SIZE','size',['2','4'],'PANELS');
for(const view of views.glazing){
 const configured={...primary};const nativeInput=Object.fromEntries(Object.entries(configured).filter(([k])=>source.field_master.some(f=>f.field_name===k)));
 const values=view.values.filter(o=>Object.entries(o.show_when??{}).every(([k,v])=>configured[k]===v)).filter(o=>!o.native_probe||evaluateRowTableProjection(projection,{...nativeInput,glass_type:o.native_probe,glass_category:source.glass_master.find(r=>r.glass_type===o.native_probe).glass_category}).state.fields.glass_type.allowed_values.includes(o.native_probe));
 const label=fieldLabel(view.key,standardWindowFieldLabel({uiCategory:entry.uiCategory,semanticSlot:view.slot,key:view.key,fallback:view.label}));
 const images=values.filter(o=>o.image).map(o=>o.value);
 addView(view.key,label,'GLAZING',view.slot,values.map(o=>o.value),'PRIMARY',{required:Boolean(view.required),control:view.multi?(view.control==='DROPDOWN_MULTI'?'select-add-remove':'checkbox-group'):'select',...(images.length?{image_required:true,image_cases:[{state_id:'PRIMARY',candidate_values:images}]}:{})});
}
for(const view of views.request_fields??[]){
 const state_id=view.key==='catalogue_options'?'PRIMARY':'SHUTTER',input=cases.find(c=>c.id===state_id).input;
 const matches=condition=>!condition||evaluateCondition(condition,{fields:Object.fromEntries(Object.entries(input).map(([key,value])=>[key,{value}]))});
 const candidates=view.values.filter(o=>matches(o.when)&&(!o.exclude_when||!matches(o.exclude_when))).map(o=>o.value);
 addView(view.key,view.label,'OPTION','option',candidates,state_id,{required:false,control:view.multi?'select-add-remove':'select'});
}
fields.push(...projectionFields);
fields.sort((a,b)=>GLOBAL_WINDOW_STAGE_ORDER.indexOf(a.stage)-GLOBAL_WINDOW_STAGE_ORDER.indexOf(b.stage)||entry.uiFlowContract.slotOrder.indexOf(a.semantic_slot)-entry.uiFlowContract.slotOrder.indexOf(b.semantic_slot)||({panel_count:20,size_mode:21,standard_size:22,width:23,height:24}[a.field_id]??100)-({panel_count:20,size_mode:21,standard_size:22,width:23,height:24}[b.field_id]??100));
const presentationPolicy=ref(path.join(sharedRoot,'docs/architecture-v2/screen-presentation-policy.v1.json'));
fields.push(...[
 {field_id:'__workflow.special_specification_requested',master_field_id:null,stage:'OPTION',semantic_slot:'option',role:'SELECTOR',label:'特別仕様の相談',visible:true,required:false,control:'checkbox-group',candidate_values:[true],state_id:'PRIMARY',source_refs:[presentationPolicy]},
 {field_id:'__workflow.user_requirements',master_field_id:null,stage:'OPTION',semantic_slot:'option',role:'SELECTOR',label:'ユーザーの要望',visible:true,required:false,control:'textarea',candidate_values:[],state_id:'PRIMARY',source_refs:[presentationPolicy]},
]);
write('expected-inventory.json',{...scope,origin:'REVIEWED_FLOW_AND_OFFICIAL_SOURCE',review_ref:'SOURCE_DERIVED_INVENTORY_AND_INDEPENDENT_LOCAL_QA_REVIEW',source_refs:[doc.source_master,ref(path.join(base,'flow.json')),ref(path.join(base,'ui-policy.json')),presentationPolicy],fields});
write('mapping.json',{...scope,fields});
write('master-projection.json',{...scope,fields:source.field_master.map(f=>({field_id:f.field_name,native_field_id:f.field_id??f.field_name,source:f}))});
write('case-plan.json',{...scope,cases,field_baselines:baseline,scope:'SOURCE_BUNDLE_AND_ORIGINAL_NATIVE_RULES; REPRESENTATIVE_STATES_NOT_EXHAUSTIVE_SPACE'});
const implNames=['src/catalog/runtime-master/row-table-sales-views.mjs','src/catalog/runtime-master/row-table-runtime-ui.mjs','src/catalog/runtime-master/row-table-runtime-projection.mjs','src/catalog/runtime-master/generic-rule-engine.mjs','src/catalog/runtime-master/runtime-state.mjs','src/catalog/runtime-master/runtime-condition.mjs','src/catalog/runtime-master/runtime-effects.mjs','src/catalog/runtime-master/declared-window-flow.mjs','src/catalog/runtime-master/canonical-window-semantic-schema.mjs','src/catalog/runtime-master/global-window-selection-flow-engine.mjs','src/catalog/runtime-master/window-field-labels.mjs','src/catalog/runtime-master/candidate-runtime-registry.mjs','src/catalog/dimension-resolver.mjs','src/catalog/selector.mjs','src/server/candidate-runtime-preview.mjs','src/server/recovery-app.mjs','src/ui/web/product-configuration-editor.mjs','src/ui/web/app.js','src/ui/web/index.html','src/ui/web/styles.css','src/ui/web/styles-wave3.css','src/ui/web/theme.css','src/ui/web/theme.js','src/ui/web/estimate-output.css','src/ui/web/estimate-output-integration.mjs','src/ui/web/product-choice-model.mjs','src/ui/web/work-management.css','src/work-management/domain.mjs','src/work-management/field-workflow-scope.mjs','src/work-management/configuration-migration.mjs','contracts/ui-common/choice-images.v1.mjs','contracts/ui-common/field-labels.v1.mjs',...['candidate.json','candidate-index.json','flow.json','ui-policy.json','case-seeds.json','option-coverage.json'].map(n=>path.relative(root,path.join(base,n)))];
const ui_files=implNames.map(native_path=>({...ref(path.join(root,native_path)),native_path}));write('ui-files.json',ui_files);
write('preview.json',{...scope,url:'http://127.0.0.1:'+(process.argv[5]??'4268')+'/runtime-lab?product='+encodeURIComponent(entry.id),candidate_index:ref(path.join(base,'candidate-index.json')),ui_files,formalAdoption:false,release:false});
write('image-inventory.json',{schema:'UI_IMAGE_INVENTORY_V1',repository:scope.repository,product_id:entry.id,master_sha256:scope.master_sha256,flow_sha256:scope.flow_sha256,mapping_sha256:ref(path.join(out,'mapping.json')).sha256,preview_sha256:ref(path.join(out,'preview.json')).sha256,ui_files_sha256:hash(JSON.stringify(ui_files.map(r=>r.sha256).sort())),images:[...Object.entries(doc.choice_visuals).flatMap(([field_id,values])=>Object.entries(values).map(([value,image])=>({...image,field_id,value}))),...views.glazing.flatMap(v=>v.values.filter(o=>o.image).map(o=>({...o.image,field_id:v.key,value:o.value})))]});
console.log(JSON.stringify({fields:fields.length,ui_fields:fields.filter(f=>['SELECTOR','DERIVED'].includes(f.role)).length,cases:cases.length,out}));
