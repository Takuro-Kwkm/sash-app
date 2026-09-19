import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { currentExactHead } from './governance/governance-lib.mjs';
import { loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

const PRODUCT_ID='SER-YKKAP-UCHIRIMO';
const OUT=process.env.UCHIRIMO_FULL_SELECTOR_OUT ?? 'artifacts/uchirimo-full-selector-proof';
const MAX_STATES=Number(process.env.UCHIRIMO_SELECTOR_MAX_STATES ?? 250000);
const MAX_TERMINALS=Number(process.env.UCHIRIMO_SELECTOR_MAX_TERMINALS ?? 50000);
const CONTINUOUS_KEYS=new Set(['size_w','size_h','frame_projection','fukashi_dimension','custom_w','custom_h','custom_width','custom_height']);
const TECHNICAL_KEYS=new Set(['legacyConstruction','legacyConfiguration','internal_construction']);
mkdirSync(OUT,{recursive:true});
const writeFailure=(error)=>{
  try{
    writeFileSync(`${OUT}/failure.json`,JSON.stringify({
      exact_head:process.env.HEAD_SHA??process.env.GITHUB_SHA??null,
      status:'FAIL',
      code:error?.code??null,
      message:error?.message??String(error),
      stack:error?.stack??null,
      observed_at:new Date().toISOString()
    },null,2)+'\n');
  }catch{}
};
process.on('uncaughtException',(error)=>{writeFailure(error);console.error(error);process.exit(1);});
process.on('unhandledRejection',(error)=>{writeFailure(error);console.error(error);process.exit(1);});
const stable=(value)=>{
  if(Array.isArray(value))return value.map(stable);
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,stable(v)]));
};
const stableJson=(value)=>JSON.stringify(stable(value));
const sha=(value)=>createHash('sha256').update(typeof value==='string'?value:stableJson(value)).digest('hex');
const present=(value)=>value!==undefined&&value!==null&&value!==''&&(!Array.isArray(value)||value.length>0);
const same=(a,b)=>Array.isArray(b)
  ? Array.isArray(a)&&stableJson(a.map(String).sort())===stableJson(b.map(String).sort())
  : Object.is(a,b)||String(a)===String(b);
const enabled=(field)=>(field?.values??[]).filter((row)=>row.disabled!==true);
const normalizeMulti=(rows)=>[...new Map(rows.map((v)=>[String(v),v])).values()].sort((a,b)=>String(a).localeCompare(String(b)));

function branches(field){
  const values=enabled(field).map((row)=>row.value);
  if(field.dataType==='MULTI_ENUM'){
    if(values.length>12)throw new Error(`UCHIRIMO_MULTI_ENUM_SYMBOLIC_PROOF_REQUIRED:${field.key}:${values.length}`);
    const out=[];
    const total=2**values.length;
    for(let mask=0;mask<total;mask+=1){
      const subset=[];
      for(let i=0;i<values.length;i+=1)if(mask&(1<<i))subset.push(values[i]);
      if(field.required&&subset.length===0)continue;
      out.push({kind:'VALUE',value:normalizeMulti(subset)});
    }
    return out;
  }
  const out=values.map((value)=>({kind:'VALUE',value}));
  if(!field.required)out.unshift({kind:'UNSET'});
  return out;
}
function applyBranch(selection,field,branch){
  const next={...(selection??{})};
  if(branch.kind==='UNSET')delete next[field.key];
  else next[field.key]=branch.value;
  return next;
}
function decisionSurvives(result,key,decision){
  if(decision.kind==='UNSET')return !result.fields.find((field)=>field.key===key)?.required || !present(result.selection?.[key]);
  return same(result.selection?.[key],decision.value);
}
function flowSignature(result){
  return (result.fields??[])
    .filter((field)=>!TECHNICAL_KEYS.has(field.key))
    .map((field)=>`${field.semanticStage}:${field.semanticSlot}:${field.key}:${field.required?'R':'O'}:${field.readOnly?'RO':'RW'}`)
    .join('|');
}

const head=currentExactHead();
const runtime=await loadRegisteredRuntime('YKK AP','ウチリモ 内窓');
if(!runtime?.sourcePackageIntegrity?.match)throw new Error('UCHIRIMO_RUNTIME_INTEGRITY_NOT_PASS');

const root=await resolveRuntimeAppProduct(PRODUCT_ID,{});
const rootWindow=root.fields.find((field)=>field.key==='window_type');
if(!rootWindow||enabled(rootWindow).length!==4)throw new Error(`UCHIRIMO_WINDOW_POPULATION_MISMATCH:${enabled(rootWindow).length}`);

const queue=[{selection:{},decisions:{}}];
const visited=new Set();
const terminalRows=[];
const signatureCounts=new Map();
let transitionChecks=0;
let dependencyRejections=0;
let downstreamClearChecks=0;
let maxQueue=queue.length;

while(queue.length){
  if(visited.size>=MAX_STATES)throw new Error(`UCHIRIMO_SELECTOR_STATE_LIMIT_REACHED:${MAX_STATES}`);
  const current=queue.shift();
  const result=await resolveRuntimeAppProduct(PRODUCT_ID,current.selection);
  const visibleKeys=new Set((result.fields??[]).map((field)=>field.key));
  const decisions=Object.fromEntries(Object.entries(current.decisions).filter(([key])=>visibleKeys.has(key)));
  const stateKey=sha({selection:result.selection,decisions});
  if(visited.has(stateKey))continue;
  visited.add(stateKey);

  for(const field of result.fields??[]){
    if(TECHNICAL_KEYS.has(field.key))throw new Error(`UCHIRIMO_TECHNICAL_FIELD_VISIBLE:${field.key}`);
    if(!field.semanticStage||!field.semanticSlot)throw new Error(`UCHIRIMO_UNMAPPED_UI_FIELD:${field.key}`);
  }
  const signature=flowSignature(result);
  signatureCounts.set(signature,(signatureCounts.get(signature)??0)+1);

  const nextField=(result.fields??[]).find((field)=>
    !field.readOnly &&
    !CONTINUOUS_KEYS.has(field.key) &&
    field.dataType!=='NUMBER' &&
    enabled(field).length>0 &&
    !Object.prototype.hasOwnProperty.call(decisions,field.key)
  );

  if(!nextField){
    if(terminalRows.length>=MAX_TERMINALS)throw new Error(`UCHIRIMO_TERMINAL_LIMIT_REACHED:${MAX_TERMINALS}`);
    terminalRows.push({
      case_id:`UCHIRIMO-SEL-${String(terminalRows.length+1).padStart(6,'0')}`,
      window_type:result.selection?.window_type??null,
      selection:stable(result.selection??{}),
      validation_status:result.validation?.status??null,
      continuous_fields:(result.fields??[]).filter((field)=>CONTINUOUS_KEYS.has(field.key)||field.dataType==='NUMBER').map((field)=>field.key),
      flow_signature_sha256:sha(signature),
      required_fields:(result.fields??[]).filter((field)=>field.required).map((field)=>field.key),
    });
    continue;
  }

  for(const branch of branches(nextField)){
    transitionChecks+=1;
    const input=applyBranch(result.selection,nextField,branch);
    const child=await resolveRuntimeAppProduct(PRODUCT_ID,input);
    const nextDecisions={...decisions,[nextField.key]:branch};
    const branchSurvives=branch.kind==='UNSET'
      ? (!nextField.required && !present(child.selection?.[nextField.key]))
      : same(child.selection?.[nextField.key],branch.value);
    const priorSurvive=Object.entries(decisions).every(([key,decision])=>decisionSurvives(child,key,decision));
    if(!branchSurvives||!priorSurvive){
      dependencyRejections+=1;
      continue;
    }
    downstreamClearChecks+=(child.clearedFields??[]).length;
    queue.push({selection:child.selection,decisions:nextDecisions});
  }
  if(queue.length>maxQueue)maxQueue=queue.length;
}

const windows=new Map();
for(const row of terminalRows)windows.set(String(row.window_type),(windows.get(String(row.window_type))??0)+1);
const expectedWindows=enabled(rootWindow).map((row)=>String(row.value)).sort();
if(terminalRows.length===0)throw new Error('UCHIRIMO_NO_TERMINAL_SELECTOR_CONTEXTS');
if(expectedWindows.some((window)=>!windows.has(window)))throw new Error(`UCHIRIMO_WINDOW_TERMINAL_GAP:${expectedWindows.filter((window)=>!windows.has(window)).join(',')}`);

const casesPath=`${OUT}/cases.json`;
writeFileSync(casesPath,JSON.stringify({exact_head:head,cases:terminalRows},null,2)+'\n');
const report={
  schema_version:'1.0.0',
  exact_head:head,
  task_classification:'NON-PRODUCT-MASTER',
  product_master_mutation:0,
  proof_model:'UCHIRIMO_REACHABLE_DISCRETE_SELECTOR_EXHAUSTIVE_V1',
  runtime_manifest_sha256:runtime.sourcePackageIntegrity.actual,
  runtime_integrity_match:runtime.sourcePackageIntegrity.match,
  window_type_count:expectedWindows.length,
  terminal_context_count:terminalRows.length,
  visited_state_count:visited.size,
  transition_check_count:transitionChecks,
  dependency_rejection_count:dependencyRejections,
  downstream_clear_event_count:downstreamClearChecks,
  flow_signature_count:signatureCounts.size,
  per_window_terminal_count:Object.fromEntries([...windows.entries()].sort()),
  continuous_dimension_coverage_delegated_to:'CUSTOM_SIZE_COVERAGE_GATE',
  unverified_discrete_selector_case_count:0,
  case_artifact:casesPath,
  case_artifact_sha256:sha(JSON.stringify({exact_head:head,cases:terminalRows},null,2)+'\n'),
  max_queue_depth:maxQueue,
  status:'PASS'
};
writeFileSync(`${OUT}/report.json`,JSON.stringify(report,null,2)+'\n');
console.log(`UCHIRIMO_FULL_SELECTOR_PROOF=PASS terminals=${report.terminal_context_count} states=${report.visited_state_count} transitions=${report.transition_check_count}`);
console.log('UCHIRIMO_UNVERIFIED_DISCRETE_SELECTOR_CASE_COUNT=0');
