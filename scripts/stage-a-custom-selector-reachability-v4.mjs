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
const selected=(selection,key)=>selection?.[key]!==undefined&&selection?.[key]!==null&&selection?.[key]!==''&&(!Array.isArray(selection?.[key])||selection[key].length>0);

const shape=JSON.parse(await readFile(SHAPE,'utf8'));
if(shape.exact_head_sha!==HEAD_SHA)throw new Error('CUSTOM_REACHABILITY_V4_SOURCE_HEAD_MISMATCH');
if(shape.source_shape_status!=='CUSTOM_SOURCE_SHAPE_INVENTORIED'||shape.unsupported_count!==0)throw new Error('CUSTOM_REACHABILITY_V4_SOURCE_NOT_READY');

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
const implicitGeometryEligibleKeys=new Set(['typeOrSpec']);
const excludedSpecificSpecScanKeys=new Set(['window_type','size','size_mode',...continuousKeys]);

function fieldAliases(sourceKey){return aliases[sourceKey]??[sourceKey];}
function splitSpecificSpec(value){
  if(Array.isArray(value))return value.flatMap(splitSpecificSpec);
  return String(value??'').split('|').map((part)=>part.trim()).filter(Boolean);
}
function globRegex(pattern){return new RegExp(`^${String(pattern).replace(/[.+?^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*')}$`);}
function formalSpecPatterns(token){
  const text=String(token);const patterns=[];
  if(text.includes('/')&&text.includes('*')){
    const slash=text.indexOf('/'),left=text.slice(0,slash),right=text.slice(slash+1),dash=left.lastIndexOf('-');
    if(dash>=0){const base=left.slice(0,dash+1),leftVariant=left.slice(dash+1);patterns.push(`${base}${leftVariant}-*`,`${base}${right}`);}
  }
  if(!patterns.length&&text.includes('*'))patterns.push(text);
  return patterns;
}
function sourceSpecMatches(token,actual){
  if(actual===undefined||actual===null||actual==='')return false;
  if(same(token,actual))return true;
  return formalSpecPatterns(token).some((pattern)=>globRegex(pattern).test(String(actual)));
}
function normalizeScalarValues(key,value){
  const values=Array.isArray(value)?[...value]:[value];
  return key==='specific_spec'?[...new Set(values.flatMap(splitSpecificSpec))]:values;
}
function choiceMatches(item,choice){
  const accepted=item.values??[];
  if(item.source_key==='specific_spec')return accepted.some((value)=>sourceSpecMatches(value,choice?.value));
  return accepted.some((value)=>same(value,choice?.value));
}
function rawSelectionMatches(item,value){
  const values=Array.isArray(value)?value:[value];
  if(item.source_key==='specific_spec')return values.some((actual)=>(item.values??[]).some((expected)=>sourceSpecMatches(expected,actual)));
  return values.some((actual)=>(item.values??[]).some((expected)=>same(expected,actual)));
}
function choiceEvidence(choice){return{value:choice?.value,label:choice?.displayLabel??null};}
function candidateKeys(item,result){
  if(item.source_key==='specific_spec')return(result.fields??[]).map((field)=>field.key).filter((key)=>!excludedSpecificSpecScanKeys.has(key));
  return item.aliases;
}

function normalizeDesired(selector={}){
  const exposed=[],hidden=[],ignored=[];
  for(const[key,value]of Object.entries(selector??{})){
    if(value===undefined||value===null||value===''||value==='*'){ignored.push({key,value,reason:'WILDCARD_OR_EMPTY'});continue;}
    if(hiddenKeys.has(key)){hidden.push({key,value});continue;}
    if(identityKeys.has(key)){ignored.push({key,value,reason:'WINDOW_IDENTITY'});continue;}
    if(value&&typeof value==='object'&&!Array.isArray(value))throw new Error(`CUSTOM_REACHABILITY_V4_OPERATOR_SELECTOR_UNEXPECTED key=${key}`);
    const values=normalizeScalarValues(key,value);
    if(values.some((candidate)=>candidate&&typeof candidate==='object'))throw new Error(`CUSTOM_REACHABILITY_V4_NESTED_OPERATOR_SELECTOR_UNEXPECTED key=${key}`);
    exposed.push({source_key:key,values,aliases:fieldAliases(key)});
  }
  return{exposed,hidden,ignored};
}
function geometrySignature(rule){const{id,source_kind,window_id,source_judge_code,selector,...geometry}=rule;return stableJson(geometry);}
function selectorWithoutKey(selector,key){const out={...(selector??{})};delete out[key];return stableJson(out);}
function inertRuleForKey(seriesRules,rule,key){
  if(!implicitGeometryEligibleKeys.has(key)||!Object.prototype.hasOwnProperty.call(rule.selector??{},key))return false;
  const basis=selectorWithoutKey(rule.selector,key);
  const siblings=seriesRules.filter((candidate)=>candidate.window_id===rule.window_id&&selectorWithoutKey(candidate.selector,key)===basis);
  return siblings.length>0&&new Set(siblings.map(geometrySignature)).size===1;
}
function isInvalid(result){return['INVALID','BLOCKED','BLOCK'].includes(String(result?.validation?.status??''));}
function customFields(result){
  const keys=new Set((result.fields??[]).map((field)=>field.key));
  return{width:['custom_width','custom_w','order_width'].find((key)=>keys.has(key)),height:['custom_height','custom_h','order_height'].find((key)=>keys.has(key))};
}
function desiredStatus(result,desired){
  const visible=new Map((result.fields??[]).map((field)=>[field.key,field]));
  const states=[];
  for(const item of desired){
    let satisfied=null;
    for(const key of candidateKeys(item,result)){
      if(!selected(result.selection,key))continue;
      const field=visible.get(key);
      const selectedValues=Array.isArray(result.selection[key])?result.selection[key]:[result.selection[key]];
      const selectedChoices=selectedValues.map((value)=>enabled(field).find((choice)=>same(choice.value,value))).filter(Boolean);
      if(selectedChoices.some((choice)=>choiceMatches(item,choice))||rawSelectionMatches(item,result.selection[key])){satisfied={key,selectedChoices};break;}
    }
    if(satisfied){
      states.push({...item,status:'SATISFIED',field:satisfied.key,selected_value:result.selection[satisfied.key],selected_choices:satisfied.selectedChoices.map(choiceEvidence)});continue;
    }
    const candidateFields=candidateKeys(item,result).filter((key)=>visible.has(key)).map((key)=>{
      const field=visible.get(key);const matches=enabled(field).filter((choice)=>choiceMatches(item,choice));
      return{key,dataType:field.dataType,value_count:enabled(field).length,matching_count:matches.length,matching_values:matches.map(choiceEvidence)};
    });
    if(candidateFields.some((row)=>row.matching_count>0)){
      states.push({...item,status:'VISIBLE_SELECTABLE',candidate_fields:candidateFields});continue;
    }
    if(item.implicit_geometry_inert===true){
      states.push({...item,status:'IMPLICIT_GEOMETRY_INERT',candidate_fields:candidateFields,proof:item.implicit_geometry_proof});continue;
    }
    states.push({...item,status:'NOT_YET_SELECTABLE',candidate_fields:candidateFields});
  }
  return states;
}
function branchValue(base,key,value){return{...base,[key]:value};}
function branchMultiValue(base,key,value){return{...base,[key]:[value]};}

async function findReachableDirected(productId,windowId,desired){
  const stack=[{selection:{window_type:windowId},trace:[`window_type=${windowId}`]}];
  const visited=new Set();let resolverCalls=0,maxFrontier=1,lastReason='NO_PATH';
  while(stack.length&&visited.size<MAX_STATES){
    maxFrontier=Math.max(maxFrontier,stack.length);
    const state=stack.pop(),inputKey=stableJson(state.selection);if(visited.has(inputKey))continue;visited.add(inputKey);
    let result;try{result=await resolveRuntimeAppProduct(productId,state.selection);resolverCalls++;}catch(error){lastReason=`RESOLVER_THROW:${error.code??error.message}`;continue;}
    if(isInvalid(result)){lastReason=`INVALID:${result.validation?.status}`;continue;}
    const canonical={...(result.selection??{})};if(!same(canonical.window_type,windowId)){lastReason='WINDOW_CLEARED';continue;}
    const fields=new Map((result.fields??[]).map((field)=>[field.key,field]));
    const statuses=desiredStatus(result,desired);
    const desiredBranches=[];
    for(const item of statuses.filter((row)=>row.status==='VISIBLE_SELECTABLE')){
      for(const candidate of item.candidate_fields.filter((row)=>row.matching_count>0)){
        const field=fields.get(candidate.key);if(!field)continue;
        for(const match of candidate.matching_values){
          desiredBranches.push({selection:field.dataType==='MULTI_ENUM'?branchMultiValue(canonical,candidate.key,match.value):branchValue(canonical,candidate.key,match.value),trace:[...state.trace,`${candidate.key}=${match.value} [selector:${item.source_key}:visible-value-normalized]`]});
        }
      }
      if(desiredBranches.length)break;
    }
    if(desiredBranches.length){for(const branch of desiredBranches.reverse())stack.push(branch);continue;}

    const unsatisfied=statuses.filter((row)=>!['SATISFIED','IMPLICIT_GEOMETRY_INERT'].includes(row.status));
    const mode=fields.get('size_mode'),customChoice=enabled(mode).find((value)=>same(value.value,'CUSTOM'));
    if(mode&&customChoice&&!same(canonical.size_mode,'CUSTOM')){stack.push({selection:branchValue(canonical,'size_mode','CUSTOM'),trace:[...state.trace,'size_mode=CUSTOM']});continue;}
    const cf=customFields(result);
    if(!unsatisfied.length&&same(canonical.size_mode,'CUSTOM')&&cf.width&&cf.height){
      return{reachable:true,visited_state_count:visited.size,resolver_call_count:resolverCalls,max_frontier_size:maxFrontier,selection_prefix:canonical,trace:state.trace,custom_width_field:cf.width,custom_height_field:cf.height,visible_field_keys:[...fields.keys()],desired_status:statuses};
    }

    const required=(result.fields??[]).filter((field)=>field.required&&!field.readOnly&&!continuousKeys.has(field.key)&&!selected(canonical,field.key)&&enabled(field).length>0);
    if(required.length){const field=required[0];for(const choice of enabled(field).slice().reverse())stack.push({selection:field.dataType==='MULTI_ENUM'?branchMultiValue(canonical,field.key,choice.value):branchValue(canonical,field.key,choice.value),trace:[...state.trace,`${field.key}=${choice.value} [required-directed]`]});continue;}
    const optional=(result.fields??[]).filter((field)=>!field.required&&!field.readOnly&&!continuousKeys.has(field.key)&&!terminalLateKeys.has(field.key)&&field.key!=='window_type'&&field.key!=='size'&&field.key!=='size_mode'&&!selected(canonical,field.key)&&enabled(field).length>0);
    if(optional.length){const field=optional[0];for(const choice of enabled(field).slice().reverse())stack.push({selection:field.dataType==='MULTI_ENUM'?branchMultiValue(canonical,field.key,choice.value):branchValue(canonical,field.key,choice.value),trace:[...state.trace,`${field.key}=${choice.value} [optional-directed]`]});continue;}
    lastReason=unsatisfied.length?`UNSATISFIED_SELECTOR:${unsatisfied.map((row)=>row.source_key).join(',')}`:(mode&&!customChoice?'CUSTOM_NOT_ALLOWED':'CUSTOM_FIELDS_NOT_EXPOSED');
  }
  return{reachable:false,visited_state_count:visited.size,resolver_call_count:resolverCalls,max_frontier_size:maxFrontier,reason:visited.size>=MAX_STATES?'STATE_LIMIT':lastReason};
}

const ruleBySeriesId=new Map(),seriesRulesByName=new Map();
for(const series of shape.series??[]){seriesRulesByName.set(series.series,series.rules??[]);for(const rule of series.rules??[])ruleBySeriesId.set(`${series.series}|${rule.id}`,rule);}
const contextMap=new Map();let sourceRuleCount=0;
for(const series of shape.series){
  const integration=integrations.find((row)=>row.manufacturer===series.manufacturer&&row.series===series.series&&row.selectable!==false);
  if(!integration)throw new Error(`CUSTOM_REACHABILITY_V4_INTEGRATION_MISSING ${series.manufacturer}/${series.series}`);
  for(const rule of series.rules){
    sourceRuleCount++;const desired=normalizeDesired(rule.selector??{});
    const key=stableJson({manufacturer:series.manufacturer,series:series.series,window_id:rule.window_id,exposed:desired.exposed});
    const row=contextMap.get(key)??{manufacturer:series.manufacturer,series:series.series,product_id:integration.id,window_id:rule.window_id,exposed_selector:desired.exposed,rule_ids:[],hidden_constraints:[],ignored_selector_parts:[]};
    row.rule_ids.push(rule.id);row.hidden_constraints.push(...desired.hidden.map((item)=>({...item,rule_id:rule.id})));row.ignored_selector_parts.push(...desired.ignored.map((item)=>({...item,rule_id:rule.id})));contextMap.set(key,row);
  }
}
for(const row of contextMap.values()){
  const seriesRules=seriesRulesByName.get(row.series)??[];
  row.exposed_selector=row.exposed_selector.map((item)=>{
    const rules=row.rule_ids.map((id)=>ruleBySeriesId.get(`${row.series}|${id}`)).filter(Boolean);
    const inert=implicitGeometryEligibleKeys.has(item.source_key)&&rules.length>0&&rules.every((rule)=>inertRuleForKey(seriesRules,rule,item.source_key));
    return inert?{...item,implicit_geometry_inert:true,implicit_geometry_proof:{mode:'SOURCE_GEOMETRY_INVARIANT_WHEN_SELECTOR_OMITTED',rule_ids:[...row.rule_ids]}}:item;
  });
}

const contexts=[];let idx=0;
for(const row of contextMap.values()){
  idx++;const result=await findReachableDirected(row.product_id,row.window_id,row.exposed_selector);contexts.push({...row,context_index:idx,...result});
  console.log(`CUSTOM_SELECTOR_REACHABILITY_V4 series=${row.series} window=${row.window_id} context=${idx}/${contextMap.size} rules=${row.rule_ids.length} reachable=${result.reachable} states=${result.visited_state_count} calls=${result.resolver_call_count}${result.reason?` reason=${result.reason}`:''}`);
}
const unreachable=contexts.filter((row)=>!row.reachable),coveredRuleIds=new Set(contexts.flatMap((row)=>row.rule_ids));
const implicitProofCount=contexts.reduce((n,row)=>n+(row.exposed_selector??[]).filter((item)=>item.implicit_geometry_inert).length,0);
const report={exact_head_sha:HEAD_SHA,task_classification:'NON-PRODUCT-MASTER',product_master_mutation:0,model_version:'CUSTOM_SELECTOR_UI_REACHABILITY_DIRECTED_V4_VISIBLE_VALUE_NORMALIZATION',normalization_model:{specific_spec_pipe_semantics:'ONE_OF',specific_spec_ui_bridge:'ALL_VISIBLE_CHOICE_VALUES',specific_spec_matching:'EXACT_OR_FORMAL_WILDCARD',implicit_selector_policy:'GEOMETRY_INERT_ONLY',search:'DIRECTED_DFS'},source_shape_digest:shape.evidence_digest,source_rule_count:sourceRuleCount,covered_rule_count:coveredRuleIds.size,unique_context_count:contexts.length,reachable_context_count:contexts.length-unreachable.length,unreachable_context_count:unreachable.length,implicit_geometry_inert_selector_count:implicitProofCount,total_visited_state_count:contexts.reduce((n,row)=>n+row.visited_state_count,0),total_resolver_call_count:contexts.reduce((n,row)=>n+row.resolver_call_count,0),contexts,status:unreachable.length?'BLOCKED_UNREACHABLE_CUSTOM_SELECTOR_CONTEXT':'PASS'};
report.evidence_digest=hash({head:HEAD_SHA,source:shape.evidence_digest,model:report.model_version,contexts:contexts.map((row)=>({series:row.series,window:row.window_id,exposed:row.exposed_selector,rules:row.rule_ids,hidden:row.hidden_constraints,reachable:row.reachable,selection:row.selection_prefix??null,trace:row.trace??null,reason:row.reason??null}))});
report.gate_status={custom_geometry_partition_gate:'PASS_EVIDENCE_EXTERNAL',custom_selector_reachability_gate:unreachable.length?'BLOCKED':'PASS',custom_size_coverage_gate:'BLOCKED_RUNTIME_GEOMETRY_EQUIVALENCE_PENDING',qa_population_gate:'BLOCKED_CONTINUOUS_CUSTOM_RUNTIME_EQUIVALENCE_PENDING',app_integration_ready:false,release_input_gate:'BLOCKED'};
await mkdir(OUT,{recursive:true});await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2)+'\n','utf8');
console.log(`CUSTOM_SELECTOR_REACHABILITY_V4_GATE=${unreachable.length?'BLOCKED':'PASS'} contexts=${contexts.length} reachable=${report.reachable_context_count} rules=${report.covered_rule_count}/${report.source_rule_count} implicit_geometry_inert=${implicitProofCount}`);
console.log(`CUSTOM_SELECTOR_REACHABILITY_V4_DIGEST=${report.evidence_digest}`);
console.log('CUSTOM_SIZE_COVERAGE_GATE=BLOCKED_RUNTIME_GEOMETRY_EQUIVALENCE_PENDING');
console.log('APP_INTEGRATION_READY=false');
console.log('RELEASE_INPUT_GATE=BLOCKED');
if(unreachable.length)process.exitCode=2;
