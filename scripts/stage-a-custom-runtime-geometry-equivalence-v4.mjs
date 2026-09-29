import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const sourcePath=new URL('./stage-a-custom-runtime-geometry-equivalence-v2.mjs',import.meta.url);
let source=await readFile(sourcePath,'utf8');

const oldFinite="const finite=(v)=>Number.isFinite(Number(v));";
const safeFinite="const finite=(v)=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));";
if(!source.includes(oldFinite))throw new Error('CUSTOM_GEOMETRY_EQ_V4_FINITE_PATCH_TARGET_MISSING');
source=source.replace(oldFinite,safeFinite);

const start=source.indexOf("const autoTypes=new Set(['AUTO_RECT','AUTO_RATIO','AUTO_PIECEWISE','AUTO_POLYGON']);");
const end=source.indexOf('function runtimeStatus(result)',start);
if(start<0||end<0||end<=start)throw new Error('CUSTOM_GEOMETRY_EQ_V4_PATCH_TARGET_MISSING_EXPECTED_STATUS');

const expectedV4=`const autoTypes=new Set(['AUTO_RECT','AUTO_RATIO','AUTO_PIECEWISE','AUTO_POLYGON']);
const reviewTypes=new Set(['SOURCE_GRAPH_GATE','COMPOUND_GATE']);
function mergedGuardBounds(rule){
  const guardRow=guardBySeriesRule.get(\`\${rule.series}|\${rule.id}\`);
  if(!guardRow)return null;
  if(guardRow.guard_mode==='UNBOUNDED_REVIEW')return{unbounded:true,bounds:null};
  const components=guardRow.components??[];
  if(!components.length)return{unbounded:true,bounds:null};
  const minsW=components.map((row)=>row.bounds?.minW).filter(Number.isFinite),maxsW=components.map((row)=>row.bounds?.maxW).filter(Number.isFinite);
  const minsH=components.map((row)=>row.bounds?.minH).filter(Number.isFinite),maxsH=components.map((row)=>row.bounds?.maxH).filter(Number.isFinite);
  return{unbounded:false,bounds:{minW:minsW.length?Math.min(...minsW):null,maxW:maxsW.length?Math.max(...maxsW):null,minH:minsH.length?Math.min(...minsH):null,maxH:maxsH.length?Math.max(...maxsH):null}};
}
function apw430Expected(rules,w,h){
  const trueRuleIds=[];
  for(const rule of rules){
    const guard=mergedGuardBounds(rule);
    if(!guard)throw new Error(\`CUSTOM_GEOMETRY_EQ_V4_APW430_GUARD_MISSING \${rule.id}\`);
    if(guard.unbounded||inBoundsRuntime(w,h,guard.bounds))trueRuleIds.push(rule.id);
  }
  return{status:trueRuleIds.length?'REVIEW_REQUIRED':'BLOCK',trueRuleIds,applicableRuleIds:rules.map((rule)=>rule.id)};
}
function apw431BaseSelectorMatches(rule,selection,allRules){
  const selector=rule.selector??{};
  if(selector.regionStandard&&selection.region_standard&&!same(selector.regionStandard,selection.region_standard))return false;
  const panel=selector.panelOrConfiguration;
  if(panel&&panel!=='*'&&selection.panel_count&&!same(panel,selection.panel_count)&&!same(panel,selection.window_configuration))return false;
  const type=selector.typeOrSpec;
  if(type&&type!=='*'&&selection.window_configuration){
    const peerTypes=new Set(allRules.filter((candidate)=>{
      const s=candidate.selector??{};
      if(s.regionStandard&&selection.region_standard&&!same(s.regionStandard,selection.region_standard))return false;
      const p=s.panelOrConfiguration;
      if(p&&p!=='*'&&selection.panel_count&&!same(p,selection.panel_count)&&!same(p,selection.window_configuration))return false;
      return true;
    }).map((candidate)=>candidate.selector?.typeOrSpec).filter((value)=>value!==undefined&&value!==null&&value!==''&&value!=='*').map(String));
    if(peerTypes.has(String(selection.window_configuration))&&!same(type,selection.window_configuration))return false;
  }
  return true;
}
function apw431GuardSelectorMatches(rule,selection){
  const selector=rule.selector??{};
  for(const [key,expected] of Object.entries(selector)){
    if(['window_type','seriesWindowId','construction'].includes(key))continue;
    let actual;
    if(key==='regionStandard')actual=selection.region_standard;
    else if(key==='panelOrConfiguration')actual=selection.panel_count??selection.window_configuration;
    else if(key==='typeOrSpec')actual=selection.window_configuration??selection.window_spec;
    else actual=selection[key];
    if(actual===undefined||actual===null||actual==='')continue;
    if(!expectedMatches(actual,expected))return false;
  }
  return true;
}
function apw431BaseAllows(rule,w,h){
  if(!inBoundsRuntime(w,h,rule.bounds??{}))return false;
  if(finite(rule.upper_a)&&finite(rule.upper_b)&&Number(h)>Number(rule.upper_a)*Number(w)+Number(rule.upper_b))return false;
  return true;
}
function apw431Expected(allRules,w,h,result){
  const selection=result?.selection??{};
  const baseApplicable=allRules.filter((rule)=>apw431BaseSelectorMatches(rule,selection,allRules));
  const baseMatches=baseApplicable.filter((rule)=>apw431BaseAllows(rule,w,h));
  if(!baseMatches.length)return{status:'BLOCK',trueRuleIds:[],applicableRuleIds:baseApplicable.map((rule)=>rule.id)};
  const guardApplicable=allRules.filter((rule)=>apw431GuardSelectorMatches(rule,selection));
  const guardInside=guardApplicable.filter((rule)=>inBoundsRuntime(w,h,rule.bounds??{}));
  const guardEscalates=guardInside.some((rule)=>rule.special_condition_present||String(rule.runtime_safety??'').includes('REVIEW'));
  const trueRules=guardEscalates&&guardInside.length?guardInside:baseMatches;
  return{status:'REVIEW_REQUIRED',trueRuleIds:trueRules.map((rule)=>rule.id),applicableRuleIds:baseApplicable.map((rule)=>rule.id)};
}
function expectedStatus(adapterType,contextRules,windowRules,w,h,result){
  if(adapterType==='APW430_FORMAL_SPLIT_V1')return apw430Expected(contextRules,w,h);
  if(adapterType==='APW431_FORMAL_SPLIT_V1')return apw431Expected(windowRules,w,h,result);
  let applicable=contextRules.filter((rule)=>hiddenSelectorMatches(rule,result));
  const resolvedConstruction=actualFor(result,'construction');
  if(adapterType==='PRODUCT_MODULE_RUNTIME_V1'&&resolvedConstruction===undefined){
    const boundedCandidates=applicable.filter((rule)=>hiddenConstruction(rule)!==null&&inBoundsRuntime(w,h,rule.bounds??{}));
    const constructions=[...new Set(boundedCandidates.map(hiddenConstruction).filter((value)=>value!==null).map(String))];
    if(constructions.length>1)return{status:'REVIEW_REQUIRED',trueRuleIds:[],applicableRuleIds:boundedCandidates.map((rule)=>rule.id),constructionCandidates:constructions};
    if(constructions.length===1)applicable=applicable.filter((rule)=>hiddenConstruction(rule)===null||same(hiddenConstruction(rule),constructions[0]));
    else if(applicable.some((rule)=>hiddenConstruction(rule)!==null))return{status:'BLOCK',trueRuleIds:[],applicableRuleIds:applicable.map((rule)=>rule.id),constructionCandidates:[]};
  }
  const truth=applicable.filter((rule)=>geometryTruth(rule,w,h));
  if(adapterType==='TW_CANONICAL_WORKBOOK_REFERENCE_V2')return{status:truth.length?'REVIEW_REQUIRED':'BLOCK',trueRuleIds:truth.map((rule)=>rule.id),applicableRuleIds:applicable.map((rule)=>rule.id)};
  if(adapterType==='CANONICAL_WORKBOOK_REFERENCE_V1')return{status:truth.length?'PASS':'BLOCK',trueRuleIds:truth.map((rule)=>rule.id),applicableRuleIds:applicable.map((rule)=>rule.id)};
  if(adapterType==='PRODUCT_MODULE_RUNTIME_V1'){
    const review=truth.filter((rule)=>reviewTypes.has(rule.type));if(review.length)return{status:'REVIEW_REQUIRED',trueRuleIds:truth.map((rule)=>rule.id),applicableRuleIds:applicable.map((rule)=>rule.id)};
    const auto=truth.filter((rule)=>autoTypes.has(rule.type));const unsupported=applicable.filter((rule)=>!autoTypes.has(rule.type)&&!reviewTypes.has(rule.type));if(unsupported.length)throw new Error(\`CUSTOM_GEOMETRY_EQ_V4_PRODUCT_MODULE_TYPE_UNSUPPORTED \${unsupported.map((rule)=>rule.type).join(',')}\`);
    return{status:auto.length?'PASS':'BLOCK',trueRuleIds:truth.map((rule)=>rule.id),applicableRuleIds:applicable.map((rule)=>rule.id)};
  }
  throw new Error(\`CUSTOM_GEOMETRY_EQ_V4_ADAPTER_UNSUPPORTED \${adapterType}\`);
}
`;
source=source.slice(0,start)+expectedV4+source.slice(end);

const oldCall="const expected=expectedStatus(integration.adapterType,contextRules,witness.point[0],witness.point[1],result),actual=runtimeStatus(result);";
const newCall="const expected=expectedStatus(integration.adapterType,contextRules,reconstructedWindow.rules,witness.point[0],witness.point[1],result),actual=runtimeStatus(result);";
if(!source.includes(oldCall))throw new Error('CUSTOM_GEOMETRY_EQ_V4_PATCH_TARGET_MISSING_CALL');
source=source.replace(oldCall,newCall);

const oldModel="CUSTOM_RUNTIME_GEOMETRY_EQUIVALENCE_FULL_ARRANGEMENT_V2_RUNTIME_SEMANTICS";
const newModel="CUSTOM_RUNTIME_GEOMETRY_EQUIVALENCE_FULL_ARRANGEMENT_V4_NULL_SAFE_FORMAL_WRAPPER";
if(!source.includes(oldModel))throw new Error('CUSTOM_GEOMETRY_EQ_V4_PATCH_TARGET_MISSING_MODEL');
source=source.replaceAll(oldModel,newModel).replaceAll('CUSTOM_RUNTIME_GEOMETRY_EQUIVALENCE_V2_GATE','CUSTOM_RUNTIME_GEOMETRY_EQUIVALENCE_V4_GATE').replaceAll('CUSTOM_RUNTIME_GEOMETRY_EQUIVALENCE_V2_DIGEST','CUSTOM_RUNTIME_GEOMETRY_EQUIVALENCE_V4_DIGEST');

const generated=new URL('./.stage-a-custom-runtime-geometry-equivalence-v4-runner.mjs',import.meta.url);
await writeFile(generated,source,'utf8');
await import(`${pathToFileURL(generated.pathname).href}?head=${encodeURIComponent(process.env.HEAD_SHA??'')}`);
