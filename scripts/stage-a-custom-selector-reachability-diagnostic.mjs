import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { runtimeAppIntegrationInventory, resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

const SHAPE=process.env.STAGE_A_CUSTOM_SHAPE_INPUT??'artifacts/stage-a-custom-dimension-source-shape/report.json';
const OUT=process.env.STAGE_A_CUSTOM_REACHABILITY_OUT??'artifacts/stage-a-custom-selector-reachability';
const HEAD_SHA=process.env.HEAD_SHA??null;
const MAX_STATES=Number(process.env.STAGE_A_CUSTOM_REACHABILITY_MAX_STATES??5000);
const stable=(v)=>Array.isArray(v)?v.map(stable):(!v||typeof v!=='object'?v:Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,stable(x)])));
const stableJson=(v)=>JSON.stringify(stable(v));
const hash=(v)=>createHash('sha256').update(stableJson(v)).digest('hex');
const same=(a,b)=>Object.is(a,b)||String(a)===String(b);
const enabled=(field)=>(field?.values??[]).filter((v)=>v.disabled!==true);
const selected=(selection,key)=>selection?.[key]!==undefined&&selection?.[key]!==null&&selection?.[key]!=='';

const shape=JSON.parse(await readFile(SHAPE,'utf8'));
if(shape.exact_head_sha!==HEAD_SHA)throw new Error('CUSTOM_REACHABILITY_SOURCE_HEAD_MISMATCH');
if(shape.source_shape_status!=='CUSTOM_SOURCE_SHAPE_INVENTORIED'||shape.unsupported_count!==0)throw new Error('CUSTOM_REACHABILITY_SOURCE_NOT_READY');

const integrations=runtimeAppIntegrationInventory();
const hiddenKeys=new Set(['construction','internal_construction']);
const identityKeys=new Set(['window_type','seriesWindowId']);
const aliases={
  specific_spec:['specific_spec','window_spec','type_spec','product_spec','specification'],
  leaf_configuration:['leaf_configuration','window_configuration','panel_count','type_spec'],
  regionStandard:['region_standard'],
  panelOrConfiguration:['panel_count','window_configuration'],
  typeOrSpec:['window_configuration','window_spec','type_spec'],
};
const continuousKeys=new Set(['custom_width','custom_height','custom_w','custom_h','order_width','order_height']);
const terminalLateKeys=new Set(['exterior_color','interior_color','glass_base','glass_type','glass_detail','glass_function','glass_spacer','glass_air_layer','screen_presence','screen_form','screen_type','screen_midrail','screen_net','option','options']);

function fieldAliases(sourceKey){return aliases[sourceKey]??[sourceKey];}
function normalizeDesired(selector={}){
  const exposed=[],hidden=[],ignored=[];
  for(const [key,value] of Object.entries(selector??{})){
    if(value===undefined||value===null||value===''||value==='*'){ignored.push({key,value,reason:'WILDCARD_OR_EMPTY'});continue;}
    if(hiddenKeys.has(key)){hidden.push({key,value});continue;}
    if(identityKeys.has(key)){ignored.push({key,value,reason:'WINDOW_IDENTITY'});continue;}
    if(value&&typeof value==='object')throw new Error(`CUSTOM_REACHABILITY_OPERATOR_SELECTOR_UNEXPECTED key=${key}`);
    exposed.push({source_key:key,value,aliases:fieldAliases(key)});
  }
  return{exposed,hidden,ignored};
}
function isInvalid(result){return ['INVALID','BLOCKED','BLOCK'].includes(String(result?.validation?.status??''));}
function customFields(result){
  const keys=new Set((result.fields??[]).map((f)=>f.key));
  const width=['custom_width','custom_w','order_width'].find((k)=>keys.has(k));
  const height=['custom_height','custom_h','order_height'].find((k)=>keys.has(k));
  return{width,height};
}
function desiredStatus(result,desired){
  const visible=new Map((result.fields??[]).map((f)=>[f.key,f]));
  const states=[];
  for(const item of desired){
    const selectedAlias=item.aliases.find((key)=>selected(result.selection,key)&&same(result.selection[key],item.value));
    if(selectedAlias){states.push({...item,status:'SATISFIED',field:selectedAlias});continue;}
    const candidateFields=item.aliases.filter((key)=>visible.has(key)).map((key)=>({key,field:visible.get(key),matches:enabled(visible.get(key)).filter((v)=>same(v.value,item.value))}));
    const satisfiableVisible=candidateFields.filter((row)=>row.matches.length);
    states.push({...item,status:satisfiableVisible.length?'VISIBLE_SELECTABLE':'NOT_YET_SELECTABLE',candidate_fields:candidateFields.map((r)=>({key:r.key,value_count:enabled(r.field).length,matching_count:r.matches.length}))});
  }
  return states;
}
function branchValue(base,key,value){return{...base,[key]:value};}
function branchMultiValue(base,key,value){return{...base,[key]:[value]};}

async function findReachable(productId,windowId,desired){
  const queue=[{selection:{window_type:windowId},trace:[`window_type=${windowId}`]}];
  const visited=new Set();let resolverCalls=0,maxQueue=1,lastReason='NO_PATH';
  while(queue.length&&visited.size<MAX_STATES){
    maxQueue=Math.max(maxQueue,queue.length);
    const state=queue.shift();const inputKey=stableJson(state.selection);if(visited.has(inputKey))continue;visited.add(inputKey);
    let result;try{result=await resolveRuntimeAppProduct(productId,state.selection);resolverCalls++;}catch(error){lastReason=`RESOLVER_THROW:${error.code??error.message}`;continue;}
    if(isInvalid(result)){lastReason=`INVALID:${result.validation?.status}`;continue;}
    const canonical={...(result.selection??{})};
    if(!same(canonical.window_type,windowId)){lastReason='WINDOW_CLEARED';continue;}
    const fields=new Map((result.fields??[]).map((f)=>[f.key,f]));
    const statuses=desiredStatus(result,desired);
    const desiredBranches=[];
    for(const item of statuses.filter((x)=>x.status==='VISIBLE_SELECTABLE')){
      for(const alias of item.aliases){const f=fields.get(alias);if(!f)continue;for(const choice of enabled(f).filter((v)=>same(v.value,item.value)))desiredBranches.push({selection:branchValue(canonical,alias,choice.value),trace:[...state.trace,`${alias}=${choice.value} [selector:${item.source_key}]`]});}
      if(desiredBranches.length)break;
    }
    if(desiredBranches.length){queue.push(...desiredBranches);continue;}

    const unsatisfied=statuses.filter((x)=>x.status!=='SATISFIED');
    const mode=fields.get('size_mode');
    const customChoice=enabled(mode).find((v)=>same(v.value,'CUSTOM'));
    if(mode&&customChoice&&!same(canonical.size_mode,'CUSTOM')){
      queue.push({selection:branchValue(canonical,'size_mode',customChoice.value),trace:[...state.trace,'size_mode=CUSTOM']});continue;
    }
    const cf=customFields(result);
    if(!unsatisfied.length&&same(canonical.size_mode,'CUSTOM')&&cf.width&&cf.height){
      return{reachable:true,visited_state_count:visited.size,resolver_call_count:resolverCalls,max_queue_size:maxQueue,selection_prefix:canonical,trace:state.trace,custom_width_field:cf.width,custom_height_field:cf.height,visible_field_keys:[...fields.keys()],desired_status:statuses};
    }

    const required=(result.fields??[]).filter((f)=>f.required&&!f.readOnly&&!continuousKeys.has(f.key)&&!selected(canonical,f.key)&&enabled(f).length>0);
    if(required.length){
      const f=required[0];
      const branches=enabled(f).map((choice)=>({selection:f.dataType==='MULTI_ENUM'?branchMultiValue(canonical,f.key,choice.value):branchValue(canonical,f.key,choice.value),trace:[...state.trace,`${f.key}=${choice.value} [required]`]}));
      queue.push(...branches);continue;
    }

    // If the Runtime exposes an optional bridge selector before CUSTOM, exhaust it rather than choosing a representative.
    const optional=(result.fields??[]).filter((f)=>!f.required&&!f.readOnly&&!continuousKeys.has(f.key)&&!terminalLateKeys.has(f.key)&&f.key!=='window_type'&&f.key!=='size'&&f.key!=='size_mode'&&!selected(canonical,f.key)&&enabled(f).length>0);
    if(optional.length){
      const f=optional[0];
      const branches=enabled(f).map((choice)=>({selection:f.dataType==='MULTI_ENUM'?branchMultiValue(canonical,f.key,choice.value):branchValue(canonical,f.key,choice.value),trace:[...state.trace,`${f.key}=${choice.value} [optional-bridge]`]}));
      queue.push(...branches);continue;
    }
    lastReason=unsatisfied.length?`UNSATISFIED_SELECTOR:${unsatisfied.map((x)=>x.source_key).join(',')}`:(mode&&!customChoice?'CUSTOM_NOT_ALLOWED':'CUSTOM_FIELDS_NOT_EXPOSED');
  }
  return{reachable:false,visited_state_count:visited.size,resolver_call_count:resolverCalls,max_queue_size:maxQueue,reason:visited.size>=MAX_STATES?'STATE_LIMIT':lastReason};
}

const contextMap=new Map();let sourceRuleCount=0;
for(const series of shape.series){
  const integration=integrations.find((row)=>row.manufacturer===series.manufacturer&&row.series===series.series&&row.selectable!==false);
  if(!integration)throw new Error(`CUSTOM_REACHABILITY_INTEGRATION_MISSING ${series.manufacturer}/${series.series}`);
  for(const rule of series.rules){
    sourceRuleCount++;
    const desired=normalizeDesired(rule.selector??{});
    const key=stableJson({manufacturer:series.manufacturer,series:series.series,window_id:rule.window_id,exposed:desired.exposed});
    const row=contextMap.get(key)??{manufacturer:series.manufacturer,series:series.series,product_id:integration.id,window_id:rule.window_id,exposed_selector:desired.exposed,rule_ids:[],hidden_constraints:[],ignored_selector_parts:[]};
    row.rule_ids.push(rule.id);row.hidden_constraints.push(...desired.hidden.map((x)=>({...x,rule_id:rule.id})));row.ignored_selector_parts.push(...desired.ignored.map((x)=>({...x,rule_id:rule.id})));contextMap.set(key,row);
  }
}

const contexts=[];let idx=0;
for(const row of contextMap.values()){
  idx++;const result=await findReachable(row.product_id,row.window_id,row.exposed_selector);
  contexts.push({...row,context_index:idx,...result});
  console.log(`CUSTOM_SELECTOR_REACHABILITY series=${row.series} window=${row.window_id} context=${idx}/${contextMap.size} rules=${row.rule_ids.length} reachable=${result.reachable} states=${result.visited_state_count} calls=${result.resolver_call_count}${result.reason?` reason=${result.reason}`:''}`);
}
const unreachable=contexts.filter((r)=>!r.reachable);
const coveredRuleIds=new Set(contexts.flatMap((r)=>r.rule_ids));
const report={exact_head_sha:HEAD_SHA,task_classification:'NON-PRODUCT-MASTER',product_master_mutation:0,model_version:'CUSTOM_SELECTOR_UI_REACHABILITY_EXHAUSTIVE_BFS_V1',source_shape_digest:shape.evidence_digest,source_rule_count:sourceRuleCount,covered_rule_count:coveredRuleIds.size,unique_context_count:contexts.length,reachable_context_count:contexts.length-unreachable.length,unreachable_context_count:unreachable.length,total_visited_state_count:contexts.reduce((n,r)=>n+r.visited_state_count,0),total_resolver_call_count:contexts.reduce((n,r)=>n+r.resolver_call_count,0),contexts,status:unreachable.length?'BLOCKED_UNREACHABLE_CUSTOM_SELECTOR_CONTEXT':'PASS'};
report.evidence_digest=hash({head:HEAD_SHA,source:shape.evidence_digest,contexts:contexts.map((r)=>({series:r.series,window:r.window_id,exposed:r.exposed_selector,rules:r.rule_ids,hidden:r.hidden_constraints,reachable:r.reachable,selection:r.selection_prefix??null,trace:r.trace??null,reason:r.reason??null}))});
report.gate_status={custom_geometry_partition_gate:'PASS_EVIDENCE_EXTERNAL',custom_selector_reachability_gate:unreachable.length?'BLOCKED':'PASS',custom_size_coverage_gate:'BLOCKED_RUNTIME_GEOMETRY_EQUIVALENCE_PENDING',qa_population_gate:'BLOCKED_CONTINUOUS_CUSTOM_RUNTIME_EQUIVALENCE_PENDING',app_integration_ready:false,release_input_gate:'BLOCKED'};
await mkdir(OUT,{recursive:true});await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2)+'\n','utf8');
console.log(`CUSTOM_SELECTOR_REACHABILITY_GATE=${unreachable.length?'BLOCKED':'PASS'} contexts=${contexts.length} reachable=${report.reachable_context_count} rules=${report.covered_rule_count}/${report.source_rule_count}`);
console.log(`CUSTOM_SELECTOR_REACHABILITY_DIGEST=${report.evidence_digest}`);
console.log('CUSTOM_SIZE_COVERAGE_GATE=BLOCKED_RUNTIME_GEOMETRY_EQUIVALENCE_PENDING');console.log('APP_INTEGRATION_READY=false');console.log('RELEASE_INPUT_GATE=BLOCKED');
if(unreachable.length)process.exitCode=2;
