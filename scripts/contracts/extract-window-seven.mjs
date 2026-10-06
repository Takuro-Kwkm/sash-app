import fs from 'node:fs';
import path from 'node:path';
import {runtimeAppIntegrationInventory,resolveRuntimeAppProduct} from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
import {loadRegisteredRuntime} from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import {applyRuntimeUiCategoryOrder} from '../../src/catalog/runtime-master/new-construction-sash-runtime-ui-contract.mjs';
const out={sash:[],exterior:[],interior:[],errors:[],coverage_note:'Field union from declared contracts and deterministic branch samples; not exhaustive state coverage and not browser QA.'};
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const hashState=s=>JSON.stringify(s,Object.keys(s).sort());
const exists=x=>x!==undefined&&x!==null&&x!=='';
const targetIds = new Set(['SER-LIXIL-TW','SER-LIX-EW','SER-LIX-SAMOS2H','SER-LIX-SAMOSL','SER-YKKAP-UCHIRIMO','SER-YKK-APW430','SER-YKK-APW431']);
for(const integration of runtimeAppIntegrationInventory().filter(x=>targetIds.has(x.id))){
 const runtime=await loadRegisteredRuntime(integration.manufacturer,integration.series);
 const item={integration,fields:[],definitions:runtime.master?.fields??[],samples:[],source_integrity:runtime.sourcePackageIntegrity};
 const seen=new Map();
 function collect(r,selection,workflowScope='estimate'){
  item.samples.push({selection,workflowScope,field_order:r.fields.map(f=>f.key),normalized_selection:r.selection,clearedFields:r.clearedFields??[]});
  for(const f of r.fields){
   let rec=seen.get(f.key);if(!rec){rec={key:f.key,observations:[],options:[]};seen.set(f.key,rec);}
   rec.observations.push({...f,values:undefined});
   for(const v of f.values??[])if(!rec.options.some(x=>JSON.stringify(x.value)===JSON.stringify(v.value)&&x.displayLabel===v.displayLabel))rec.options.push(v);
  }
 }
 async function run(seed={},greedy=false){
  let s={...seed},prev='',r;
  for(let turn=0;turn<(greedy?15:1);turn++){
   r=await resolveRuntimeAppProduct(integration.id,s);collect(r,s);
   let next={...r.selection};
   for(const f of r.fields){if(f.readOnly||f.disabled||exists(next[f.key])||!f.required)continue;
    const value=f.values?.find(v=>!v.disabled)?.value;
    if(value!==undefined)next[f.key]=f.dataType==='MULTI_ENUM'?[value]:value;
   }
   const sig=hashState(next);if(sig===prev)break;prev=sig;s=next;
  }
  return {r,state:s};
 }
 try{
  const base=await run({},true);
  const first=await resolveRuntimeAppProduct(integration.id,{});
  for(const key of ['window_type','room_specification','product_variant','thermal_spec','lock_type','opening_type','transom']){
   const f=first.fields.find(f=>f.key===key)??base.r.fields.find(f=>f.key===key);
   for(const candidate of f?.values??[])if(!candidate.disabled)await run({...base.state,[key]:candidate.value},true);
  }
  for(const key of ['glass_family','low_e_type','screen_presence','screen_form','screen_net','size_mode','fukashi_presence','fukashi_depth','sash_configuration','design','electric_lock_power','sales_midrail_request']){
   const f=base.r.fields.find(f=>f.key===key);
   for(const v of (f?.values??[]).slice(0,8))if(!v.disabled)await run({...base.state,[key]:v.value},true);
  }
  for(const key of ['option_items','option']){
   const f=base.r.fields.find(f=>f.key===key);
   for(const v of (f?.values??[]).slice(0,8))await run({...base.state,[key]:[v.value]},true);
  }
  if(integration.uiCategory==='INNER_WINDOW')await run({...base.state,room_specification:'bathroom'},true);
  if(integration.id==='SER-LIXIL-INPLUS')await run({product_variant:'bathroom'},true);
  const survey=await resolveRuntimeAppProduct(integration.id,{...base.state,runtime_mode:'SITE_SURVEY'},{workflowScope:'site_survey'});collect(survey,{...base.state,runtime_mode:'SITE_SURVEY'},'site_survey');
  // Additional seeds come from this product's existing Formal node axes, never
  // inferred combinations. Survey and fukashi branches have separate scope.
  for(const node of runtime.master?.canonical?.product_nodes??[]){
   const seed={room_specification:node.room,window_type:node.window_type,sash_configuration:node.sash_configuration,size_class:node.size_class};
   const completed=await run(seed,true);
   await run({...seed,glass_family:'insulating_glass',sales_glass_design:'standard',sales_glass_appearance:'clear',low_e_type:'insulating'},false);
   const frameValues=runtime.master.innerWindowFrameContract?.fields.find(f=>f.field_name==='fukashi_reinforcement')?.values??[];
   for(const frame of [{},{frame_spec:'frame_projection'},...frameValues.map(v=>({fukashi_presence:'present',fukashi_depth:'60',fukashi_reinforcement:v.value}))]){
    const selection={...completed.state,...frame};
    const r=await resolveRuntimeAppProduct(integration.id,selection,{workflowScope:'site_survey'});collect(r,selection,'site_survey');
    const extras=node.room==='bathroom'?[{installation_environment:'unit_bath',existing_lower_jamb_angle_present:'yes',resin_jamb_face_screw_fixed:'no'},{installation_environment:'unit_bath',existing_lower_jamb_angle_present:'no',resin_jamb_face_screw_fixed:'no'},{installation_environment:'tile'}]:[{construction:'wood'}];
    for(const extra of extras){const q={...selection,...extra};const rr=await resolveRuntimeAppProduct(integration.id,q,{workflowScope:'site_survey'});collect(rr,q,'site_survey');}
   }
   for(const field of completed.r.fields.filter(f=>f.dataType==='ENUM'))for(const choice of (field.values??[]).slice(0,8)){
    const q={...completed.state,[field.key]:choice.value};const r=await resolveRuntimeAppProduct(integration.id,q,{workflowScope:'site_survey'});collect(r,q,'site_survey');
   }
  }
  for(const def of runtime.master?.fields??[]){
   if(seen.has(def.field_name))continue;
   try{const fields=applyRuntimeUiCategoryOrder([{key:def.field_name,field_name:def.field_name,displayLabel:def.display_label,dataType:({enum:'ENUM',array:'MULTI_ENUM',number:'NUMBER',integer:'NUMBER',string:'TEXT',boolean:'ENUM'})[def.data_type]??'UNKNOWN',values:[],required:def.required_mode==='REQUIRED',displayOrder:def.display_order,...def}],integration);
    if(fields[0])seen.set(def.field_name,{key:def.field_name,observations:[fields[0]],options:[],declared_only:true});
   }catch(error){item.unmapped??=[];item.unmapped.push({key:def.field_name,error:error.message});}
  }
  item.fields=[...seen.values()];
 }catch(error){out.errors.push({app:'sash',product:integration.id,message:error.message});item.fields=[...seen.values()];}
 out.sash.push(item);
 console.log('sash',integration.series,item.fields.length,item.samples.length);
}
for(const p of out.sash)for(const f of p.fields)f.observations=[...new Map(f.observations.map(o=>[JSON.stringify(o),o])).values()];
fs.mkdirSync('contracts/window-seven/evidence',{recursive:true});
fs.writeFileSync('contracts/window-seven/evidence/runtime-observations.json',JSON.stringify(out,null,2)+'\n');
if(out.errors.length)process.exitCode=1;
