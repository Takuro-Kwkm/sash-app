import {normalizeFrameInput,toSourceSelection,resolveFrameContract} from './inner-window-frame-engine.mjs';
const has=v=>v!==null&&v!==undefined&&v!=='';
export function adaptFrameRuntime(base,contract){
 const hidden=new Set(contract.legacy_internal_fields),canonical=new Set(contract.fields.map(f=>f.field_name));
 const master={...base.master};
 master.fields=[...base.master.fields.filter(f=>!hidden.has(f.field_name)&&!canonical.has(f.field_name)),...contract.fields.map(f=>({field_name:f.field_name,display_label:f.display_label,display_order:0,data_type:'enum',selection_mode:f.selection_mode,runtime_included:true,parent_fields:f.parent_fields,initial_visibility:'HIDE'}))];
 master.values=[...(base.master.values??[]).filter(v=>!hidden.has(v.field_name)&&!canonical.has(v.field_name)),...contract.fields.flatMap(f=>f.values.map(v=>({field_name:f.field_name,canonical_value:v.value,display_label:v.label,status:'CURRENT',runtime_selectable:true,user_selectable:true}))),...(contract.option_migrations??[]).map(v=>({field_name:contract.option_field,canonical_value:v.value,display_label:v.label,status:'CURRENT',runtime_selectable:true,user_selectable:true}))];
 master.innerWindowFrameContract=contract;
 master.fieldByName=new Map(master.fields.map(f=>[f.field_name,f]));
 master.valueRowsByField=new Map(master.fields.map(f=>[f.field_name,master.values.filter(v=>v.field_name===f.field_name&&v.status==='CURRENT'&&v.runtime_selectable!==false)]));
 master.valueLookupByField=new Map([...master.valueRowsByField].map(([key,rows])=>[key,new Map(rows.map(v=>[JSON.stringify(v.canonical_value),v]))]));
 function pass(input={}){
  const canonicalInput=normalizeFrameInput(contract,input);
  const pre=resolveFrameContract(contract,canonicalInput);
  const source=toSourceSelection(contract,pre.selection);
  let state=base.resolver(source);
  // A hidden canonical choice may still be a one-value source selector used
  // by the formal size join. Bind only that exact source-proven singleton.
  let rebound=false;
  for(const [key,binding] of Object.entries(contract.source_field_bindings)){
    const field=state.fields[binding.target];
    if(pre.fields[key]?.visibility==='HIDE'&&!has(source[binding.target])&&field?.visibility==='SHOW'&&field.allowed_values?.length===1&&Object.values(binding.values).includes(field.allowed_values[0])){
      source[binding.target]=field.allowed_values[0];rebound=true;
    }
  }
  if(rebound)state=base.resolver(source);
  const ctx={...pre.selection,...Object.fromEntries(Object.entries(state.fields).filter(([k,v])=>!canonical.has(k)&&!hidden.has(k)&&has(v.value)).map(([k,v])=>[k,v.value]))};
  for(const [k,v] of Object.entries(state.fields))if(!canonical.has(k)&&!hidden.has(k)&&!has(v.value))delete ctx[k];
  const migrated=(contract.option_migrations??[]).filter(o=>pre.selection[contract.option_field]?.includes(o.value)).map(o=>o.value);
  if(migrated.length)ctx[contract.option_field]=[...new Set([...(ctx[contract.option_field]??[]),...migrated])];
  const frame=resolveFrameContract(contract,ctx,state);
  for(const k of hidden)delete state.fields[k];
  Object.assign(state.fields,frame.fields);
  if(contract.option_migrations?.length&&state.fields[contract.option_field]){
    const field=state.fields[contract.option_field];
    const admitted=contract.option_migrations.filter(v=>frame.selection[contract.option_field]?.includes(v.value));
    const visible=contract.option_migrations.filter(v=>{
      const probe=resolveFrameContract(contract,{...ctx,[contract.option_field]:[v.value]});
      return probe.selection[contract.option_field]?.includes(v.value);
    });
    field.allowed_values=[...new Set([...(field.allowed_values??[]),...visible.map(v=>v.value)])];
    field.value=[...new Set([...(Array.isArray(field.value)?field.value:[]),...admitted.map(v=>v.value)])];
    if(!field.value.length)field.value=null;
    if(visible.length)field.visibility='SHOW';
  }
  state.missing_required_fields=[...(state.missing_required_fields??[]).filter(k=>!hidden.has(k)&&!canonical.has(k)),...frame.missing_required_fields];
  state.cleared_fields=[...(state.cleared_fields??[]).filter(x=>!hidden.has(typeof x==='string'?x:x.field)&&!canonical.has(typeof x==='string'?x:x.field)),...pre.cleared_fields.map(field=>({field,reason:'CANONICAL_DEPENDENCY'})),...frame.cleared_fields.map(field=>({field,reason:'CANONICAL_DEPENDENCY'}))];
  state.confirmation_requests=[...(state.confirmation_requests??[]),...frame.confirmation_requests];
  state.manual_warnings=[...(state.manual_warnings??[]),...frame.confirmation_requests.map(r=>r.id+': '+r.message+' 確認先: '+r.confirmation_to)];
  if(!['INVALID','BLOCKED'].includes(state.status)&&frame.confirmation_requests.length)state.status='MANUAL_CHECK';
  if(state.status==='VALID'&&state.missing_required_fields.length)state.status='INCOMPLETE';
  state.order_ready=false;
  return state;
 }
 function resolver(input={}){
  let requested=input;const cleared=new Map(),errors=new Map(),manuals=new Map(),confirmations=new Map();
  const identity=s=>JSON.stringify(Object.entries(s).sort(([a],[b])=>a.localeCompare(b)));
  for(let count=0;count<=master.fields.length;count++){
   const state=pass(requested);for(const row of state.cleared_fields??[])cleared.set(typeof row==='string'?row:row.field,row);for(const error of state.errors??[])errors.set(JSON.stringify(error),error);for(const warning of state.manual_warnings??[])manuals.set(JSON.stringify(warning),warning);for(const confirmation of state.confirmation_requests??[])confirmations.set(JSON.stringify(confirmation),confirmation);
   const next=Object.fromEntries(Object.entries(state.fields).filter(([,f])=>has(f.value)).map(([k,f])=>[k,f.value]));
   if(identity(next)===identity(requested)){state.cleared_fields=[...cleared.values()];state.errors=[...errors.values()];state.manual_warnings=[...manuals.values()];state.confirmation_requests=[...confirmations.values()];if(state.errors.length)state.status='INVALID';else if(!['INVALID','BLOCKED'].includes(state.status)&&state.manual_warnings.length)state.status='MANUAL_CHECK';return state;}
   requested=next;
  }
  throw new Error('FRAME_RUNTIME_TRANSITION_NOT_STABLE');
 }
 return {master,resolver};
}
