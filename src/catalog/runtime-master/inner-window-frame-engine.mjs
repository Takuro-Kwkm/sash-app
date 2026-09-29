// Product-runtime reference evaluator. All product values/rules come from data.
const has=v=>v!==undefined&&v!==null&&v!=='';
const same=(a,b)=>String(a)===String(b);
export function matches(rule,s){
  if(!rule)return true;
  if(rule.all)return rule.all.every(x=>matches(x,s));
  if(rule.any)return rule.any.some(x=>matches(x,s));
  if('eq'in rule)return same(s[rule.field],rule.eq);
  if('in'in rule)return rule.in.some(v=>same(s[rule.field],v));
  if('present'in rule)return has(s[rule.field])===rule.present;
  throw new Error('UNSUPPORTED_FRAME_CONDITION');
}
export function normalizeFrameInput(contract,input){
  const s={...input};
  for(const [key,aliases] of Object.entries(contract.input_aliases??{}))if(Object.hasOwn(aliases,s[key]))s[key]=aliases[s[key]];
  // A canonical value, including explicit none, wins over any stale legacy value.
  for(const def of contract.fields){
    if(has(s[def.field_name]))continue;
    const raw=input[def.source_field];
    const candidate=def.values.find(v=>has(raw)&&(same(v.source_value,raw)||(v.derive_from_source_values??[]).includes(raw)));
    if(candidate)s[def.field_name]=candidate.value;
  }
  // Inplus scalar legacy selections can map to exactly one component.
  for(const def of contract.fields)for(const value of def.values){
    if(!has(s[def.field_name])&&value.validation_item_field&&same(input[value.validation_item_field],value.source_value)){
      s[def.field_name]=value.value;
      if(def.field_name.startsWith('fukashi_'))s.fukashi_presence='present';
    }
  }
  for(const option of contract.option_migrations??[])if(same(input[option.from_field],option.value))s[contract.option_field]=[...new Set([...(s[contract.option_field]??[]),option.value])];
  for(const key of contract.legacy_internal_fields)delete s[key];
  return s;
}
export function toSourceSelection(contract,input){
  const s={...input};
  for(const def of contract.fields)delete s[def.field_name];
  for(const key of contract.legacy_internal_fields)delete s[key];
  for(const [key,binding] of Object.entries(contract.source_field_bindings)){
    if(binding.clear_before_bind)delete s[binding.target];
    if(Object.hasOwn(binding.values,input[key]))s[binding.target]=binding.values[input[key]];
  }
  const migrated=new Set((contract.option_migrations??[]).map(x=>x.value));
  if(Array.isArray(s[contract.option_field]))s[contract.option_field]=s[contract.option_field].filter(x=>!migrated.has(x));
  return s;
}
function matrixStatus(matrix,cell,selection){
  if(cell===undefined||cell===null||cell===''||cell==='-')return 'MANUAL_CHECK';
  const text=String(cell);
  if(text.startsWith('×'))return 'DENY';
  const notes=[...text.matchAll(/注(\d+)/g)].map(x=>Number(x[1]));
  if((matrix.note_denials??[]).some(r=>notes.includes(r.note)&&matches(r.when,selection)))return 'DENY';
  return notes.length||text.startsWith('△')?'MANUAL_CHECK':text.startsWith('○')?'ALLOW':'MANUAL_CHECK';
}
function components(contract,s){
  const rows=[];
  for(const def of contract.fields){
    const v=def.values.find(x=>same(x.value,s[def.field_name]));
    if(v?.special_component){
      const sub=contract.component_substitution;
      if(sub&&def.field_name===sub.replaced_field&&has(s[sub.replacement_field])&&s[sub.replacement_field]!==sub.inactive_value)continue;
      rows.push({field:def.field_name,...v});
    }
  }
  for(const join of contract.matrix?.item_bindings??[]){
    if(!['joint_layout',contract.option_field].includes(join.selection_field))continue;
    if(join.context_window_type&&join.context_window_type!==s.window_type)continue;
    const val=s[join.selection_field];
    if((Array.isArray(val)?val:[val]).includes(join.canonical_id_or_value))rows.push({field:join.selection_field,value:join.canonical_id_or_value,matrix_key:join.matrix_key,source_value:join.canonical_id_or_value});
  }
  return rows;
}
function matrixChecks(contract,s){
  const m=contract.matrix;if(!m)return [];
  const cs=components(contract,s),checks=[];
  const scopes=m.scope_rows.filter(x=>x.window_type===s.window_type&&(x.glass_family===s.glass_family||x.glass_family==='*'));
  const row=scopes.length===1?m.rows.find(x=>x['対象']===scopes[0].matrix_scope_key):null;
  for(const c of cs)checks.push({status:row?matrixStatus(m,row[c.matrix_key],s):'MANUAL_CHECK',fields:[c.field],values:[c.value],reason:row?`${row['対象']} / ${c.matrix_key}`:'窓種・ガラス別取付可否を確認',source:c.source_value});
  for(let a=0;a<cs.length;a++)for(let b=a+1;b<cs.length;b++){
    const x=cs[a],y=cs[b];
    const rx=m.rows.find(r=>r['対象']===(m.row_aliases[x.matrix_key]??x.matrix_key));
    const ry=m.rows.find(r=>r['対象']===(m.row_aliases[y.matrix_key]??y.matrix_key));
    const cells=[rx?.[y.matrix_key],ry?.[x.matrix_key]].filter(v=>v!==undefined&&v!==null&&v!==''&&v!=='-');
    const statuses=cells.map(cell=>matrixStatus(m,cell,s));
    const status=statuses.includes('DENY')?'DENY':statuses.includes('MANUAL_CHECK')||!statuses.length?'MANUAL_CHECK':'ALLOW';
    checks.push({status,fields:[x.field,y.field],values:[x.value,y.value],reason:`${x.matrix_key} + ${y.matrix_key}: ${cells.join(' / ')||'直接証明なし'}`,source:'EV-007'});
  }
  return checks;
}
export function resolveFrameContract(contract,input,baseState=null){
  const original={...input},s=normalizeFrameInput(contract,input),cleared=new Set();
  let fields={},checks=[];
  const clear=(key)=>{if(has(s[key]))cleared.add(key);delete s[key];};
  for(let pass=0;pass<12;pass++){
    const before=JSON.stringify(s);fields={};
    for(const def of contract.fields){
      const key=def.field_name;let visible=def.selection_mode!=='NOT_APPLICABLE'&&matches(def.when,s);
      let values=visible?def.values.filter(v=>matches(v.when,s)):[];
      for(const rule of contract.rules)if(matches(rule.when,s)&&rule.field===key){
        if(rule.action==='allow_only')values=values.filter(v=>rule.values.includes(v.value));
        if(rule.action==='fixed'){values=values.filter(v=>same(v.value,rule.value));s[key]=rule.value;}
      }
      if(!visible||has(s[key])&&!values.some(v=>same(v.value,s[key])))clear(key);
      // Direct source candidates provide manufacturer dependency filtering.
      if(visible&&def.source_field&&baseState?.fields?.[def.source_field]?.visibility==='SHOW'){
        const allowed=baseState.fields[def.source_field].allowed_values;
        if(Array.isArray(allowed))values=values.filter(v=>!has(v.source_value)||allowed.some(x=>same(x,v.source_value)));
        if(has(s[key])&&!values.some(v=>same(v.value,s[key])))clear(key);
      }
      if(!values.length){visible=false;clear(key);}
      fields[key]={value:s[key]??null,visibility:visible?'SHOW':'HIDE',required:visible&&(def.required||!!def.required_when&&matches(def.required_when,s)),allowed_values:values.map(v=>v.value),readOnly:visible&&contract.rules.some(r=>r.field===key&&r.action==='fixed'&&matches(r.when,s)),display_label:def.display_label};
    }
    checks=matrixChecks(contract,s);
    // Preserve the earlier semantic choice; clear the conflicting downstream item.
    for(const check of checks.filter(c=>c.status==='DENY')){
      const key=check.fields.at(-1),value=check.values.at(-1);
      if(Array.isArray(s[key])){s[key]=s[key].filter(v=>v!==value);cleared.add(key);}else clear(key);
    }
    for(const option of contract.option_migrations??[])if(!matches(option.when,s)&&Array.isArray(s[contract.option_field])&&s[contract.option_field].includes(option.value)){
      s[contract.option_field]=s[contract.option_field].filter(v=>v!==option.value);cleared.add(contract.option_field);
    }
    if(before===JSON.stringify(s))break;
    if(pass===11)throw new Error('FRAME_TRANSITION_NOT_STABLE');
  }
  // Candidate exclusion checks evaluate the full prospective selection.
  for(const def of contract.fields){
    const f=fields[def.field_name];
    f.allowed_values=f.allowed_values.filter(value=>!matrixChecks(contract,{...s,[def.field_name]:value}).some(c=>c.status==='DENY'&&c.fields.at(-1)===def.field_name));
    f.value=s[def.field_name]??null;
  }
  const confirmations=checks.filter(x=>x.status==='MANUAL_CHECK').map(x=>({id:contract.manual_check_id??'FRAME_SOURCE_CONFIRM',status:'MANUAL_CHECK',confirmation_to:'積算／メーカー',message:x.reason,source:x.source}));
  for(const r of contract.rules)if(r.action==='confirm'&&matches(r.when,s))confirmations.push({id:r.id,status:'ESTIMATE_CONFIRM_REQUIRED',confirmation_to:'積算／メーカー',message:r.message,source:r.evidence});
  if(contract.composite_option_confirmation&&(contract.option_migrations??[]).some(o=>(s[contract.option_field]??[]).includes(o.value))&&components(contract,s).length)confirmations.push({...contract.composite_option_confirmation,status:'MANUAL_CHECK'});
  for(const key of contract.legacy_internal_fields)delete s[key];
  for(const [key,f] of Object.entries(fields))if(f.visibility==='HIDE')delete s[key];
  const missing=Object.entries(fields).filter(([,f])=>f.required&&!has(f.value)).map(([k])=>k);
  const state={selection:s,fields,cleared_fields:[...cleared],missing_required_fields:missing,confirmation_requests:confirmations,status:missing.length?'INCOMPLETE':confirmations.length?'MANUAL_CHECK':'VALID',order_ready:false};
  state.handoff={selection:{...s},confirmation_requests:confirmations,order_ready:false};
  return state;
}
