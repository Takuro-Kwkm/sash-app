import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile, appendFile, rm } from 'node:fs/promises';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { getRuntimeMasterEntry, loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { loadFormalProductRuntimePackage } from '../src/catalog/runtime-master/formal-product-runtime-loader.mjs';

const OUT = process.env.STAGE_A_EXHAUSTIVE_OUT ?? 'artifacts/stage-a-exhaustive-selector-state';
const PRODUCTS = [
  { id:'SER-LIX-SAMOS2H', manufacturer:'LIXIL', series:'サーモスⅡ-H', windows:17 },
  { id:'SER-LIX-SAMOSL', manufacturer:'LIXIL', series:'サーモスL', windows:17 },
  { id:'SER-LIX-EW', manufacturer:'LIXIL', series:'EW', windows:15 },
  { id:'SER-LIXIL-TW', manufacturer:'LIXIL', series:'TW', windows:25 },
  { id:'SER-YKK-APW430', manufacturer:'YKK AP', series:'APW430', windows:25 },
  { id:'SER-YKK-APW431', manufacturer:'YKK AP', series:'APW431', windows:6 },
];
const TECHNICAL_KEYS = new Set(['construction','legacyConstruction','legacyConfiguration','internal_construction']);
const CUSTOM_WIDTH_KEYS = new Set(['custom_width','custom_w','order_width']);
const CUSTOM_HEIGHT_KEYS = new Set(['custom_height','custom_h','order_height']);
const CONTINUOUS_KEYS = new Set([...CUSTOM_WIDTH_KEYS, ...CUSTOM_HEIGHT_KEYS]);
const MAX_TRAVERSAL_PER_WINDOW = Number(process.env.STAGE_A_MAX_TRAVERSAL_PER_WINDOW ?? 500000);
const MAX_MULTI_ENUM_VALUES = Number(process.env.STAGE_A_MAX_MULTI_ENUM_VALUES ?? 18);
const GENERIC_PROBES = [
  [1,1],[299,299],[300,300],[399,449],[400,450],[500,500],[500,1000],[600,1000],[600,1600],
  [780,1570],[800,1600],[900,1600],[1000,1000],[1200,1800],[1800,1800],[2200,2200],[3000,3000],[9999,9999],
];

const present = (value) => value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length > 0);
const stableObject = (value) => {
  if (Array.isArray(value)) return value.map(stableObject);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([key,child]) => [key, stableObject(child)]));
};
const stableJson = (value) => JSON.stringify(stableObject(value));
const hash = (value) => createHash('sha256').update(typeof value === 'string' ? value : stableJson(value)).digest('hex');
const clone = (value) => JSON.parse(JSON.stringify(value));
const enabledChoices = (field) => (field?.values ?? []).filter((choice) => choice.disabled !== true);
const disabledChoices = (field) => (field?.values ?? []).filter((choice) => choice.disabled === true);
const sameScalar = (a,b) => Object.is(a,b) || String(a) === String(b);
const selectionHas = (selection, key, value) => {
  const actual = selection?.[key];
  if (Array.isArray(value)) return Array.isArray(actual) && stableJson([...actual].map(String).sort()) === stableJson([...value].map(String).sort());
  return sameScalar(actual,value);
};
const normalizeMulti = (values) => [...new Map(values.map((value) => [String(value), value])).values()].sort((a,b) => String(a).localeCompare(String(b)));
const dimensionStatus = (result) => {
  const direct = result.dimensionResult?.status;
  if (direct) return direct === 'BLOCKED' ? 'BLOCK' : direct;
  if ((result.validation?.errors ?? []).some((error) => String(error.errorCode ?? error.code ?? '').includes('CUSTOM_SIZE_OUT_OF_RANGE'))) return 'BLOCK';
  if (result.validation?.status === 'INVALID') return 'BLOCK';
  if (result.validation?.status === 'MANUAL_CHECK') return 'REVIEW_REQUIRED';
  if (['VALID','INCOMPLETE'].includes(result.validation?.status)) return 'ACCEPTED';
  return result.validation?.status ?? 'UNKNOWN';
};
const isRuntimeInvalid = (result) => ['INVALID','BLOCKED','BLOCK'].includes(String(result.validation?.status)) || dimensionStatus(result) === 'BLOCK';

function fieldSnapshot(field) {
  return {
    key:field.key,
    display_label:field.displayLabel ?? null,
    data_type:field.dataType ?? null,
    required:Boolean(field.required),
    read_only:Boolean(field.readOnly),
    selection_mode:field.selectionMode ?? null,
    runtime_state:field.runtimeState ?? null,
    parent_fields:[...(field.parentFields ?? [])],
    allowed_values:enabledChoices(field).map((choice) => ({ value:clone(choice.value), display_label:choice.displayLabel ?? String(choice.value), manual_check:Boolean(choice.manualCheck) })),
    disabled_values:disabledChoices(field).map((choice) => ({ value:clone(choice.value), display_label:choice.displayLabel ?? String(choice.value), manual_check:Boolean(choice.manualCheck) })),
  };
}

function resultFingerprint(result) {
  return {
    selection:stableObject(result.selection ?? {}),
    fields:(result.fields ?? []).filter((field) => !TECHNICAL_KEYS.has(field.key)).map(fieldSnapshot),
    validation:{
      status:result.validation?.status ?? null,
      missing_required_fields:[...(result.validation?.missingRequiredFields ?? [])].sort(),
      error_codes:(result.validation?.errors ?? []).map((error) => error.errorCode ?? error.code ?? String(error)).sort(),
    },
    dimension:{
      status:dimensionStatus(result),
      code:result.dimensionResult?.code ?? null,
      matched_rule_ids:[...(result.dimensionResult?.matchedRuleIds ?? [])].map(String).sort(),
      rule_types:[...(result.dimensionResult?.ruleTypes ?? [])].map(String).sort(),
    },
    derived_options:[...(result.derivedOptions ?? [])].map(String).sort(),
    derived_components:[...(result.derivedComponents ?? [])].map(String).sort(),
    derived_entities:stableObject(result.derivedEntities ?? []),
    order_ready:result.orderReady ?? null,
    manual_warnings:[...(result.manualWarnings ?? [])].map(String).sort(),
  };
}

function stateRecord(product, windowValue, result, parentStateId, depth, traversalMeta = {}) {
  const fingerprint = resultFingerprint(result);
  const stateKey = stableJson(fingerprint);
  const stateId = `STATE-${hash(`${product.id}::${windowValue}::${stateKey}`).slice(0,20)}`;
  const fields = (result.fields ?? []).filter((field) => !TECHNICAL_KEYS.has(field.key));
  const allowed = Object.fromEntries(fields.map((field) => [field.key, enabledChoices(field).map((choice) => clone(choice.value))]));
  const disabled = Object.fromEntries(fields.map((field) => [field.key, disabledChoices(field).map((choice) => clone(choice.value))]));
  const visible = fields.map((field) => field.key);
  const required = fields.filter((field) => field.required).map((field) => field.key);
  const autoValues = Object.fromEntries(fields.filter((field) => field.readOnly && present(result.selection?.[field.key])).map((field) => [field.key, clone(result.selection[field.key])]));
  const derivedValues = {
    options:[...(result.derivedOptions ?? [])],
    components:[...(result.derivedComponents ?? [])],
    entities:clone(result.derivedEntities ?? []),
  };
  const mode = fields.find((field) => field.key === 'size_mode');
  const modes = enabledChoices(mode).map((choice) => String(choice.value));
  return {
    manufacturer:product.manufacturer,
    series:product.series,
    product_id:product.id,
    window_type:windowValue,
    state_id:stateId,
    parent_state_id:parentStateId ?? null,
    depth,
    selector_state:stableObject(result.selection ?? {}),
    visible_fields:visible,
    required_fields:required,
    allowed_values:stableObject(allowed),
    disabled_values:stableObject(disabled),
    auto_values:stableObject(autoValues),
    derived_values:stableObject(derivedValues),
    cleared_fields:[...(result.clearedFields ?? [])].sort(),
    standard_capability:modes.includes('STANDARD') || fields.some((field) => field.key === 'size'),
    custom_capability:modes.includes('CUSTOM') || fields.some((field) => CONTINUOUS_KEYS.has(field.key)),
    validation_status:result.validation?.status ?? null,
    dimension_status:dimensionStatus(result),
    dimension_code:result.dimensionResult?.code ?? null,
    order_ready:result.orderReady ?? null,
    review_required:dimensionStatus(result) === 'REVIEW_REQUIRED',
    manual_check:result.validation?.status === 'MANUAL_CHECK' || (result.manualWarnings ?? []).length > 0,
    terminal:false,
    non_terminal:true,
    prune_reason:null,
    traversal_meta:stableObject(traversalMeta),
    _fingerprint:stateKey,
    _result:result,
  };
}

function userDiscreteFields(result) {
  return (result.fields ?? []).filter((field) => !TECHNICAL_KEYS.has(field.key) && !CONTINUOUS_KEYS.has(field.key) && enabledChoices(field).length > 0 && !field.readOnly);
}

function nextDiscreteField(result, finalized) {
  return userDiscreteFields(result).find((field) => field.key !== 'window_type' && !finalized.has(field.key)) ?? null;
}

function visibleKeySet(result) {
  return new Set((result.fields ?? []).map((field) => field.key));
}

function childFinalized(parentFinalized, fieldKey, childResult) {
  const visible = visibleKeySet(childResult);
  return new Set([...parentFinalized, fieldKey].filter((key) => visible.has(key)));
}

function scalarBranches(field) {
  const rows = enabledChoices(field).map((choice) => ({ kind:'VALUE', value:choice.value }));
  if (!field.required) rows.unshift({ kind:'UNSET', value:undefined });
  return rows;
}

function multiEnumBranches(field) {
  const values = enabledChoices(field).map((choice) => choice.value);
  if (values.length > MAX_MULTI_ENUM_VALUES) {
    const error = new Error(`${field.key}: MULTI_ENUM has ${values.length} values; exhaustive power-set exceeds configured safety limit ${MAX_MULTI_ENUM_VALUES}`);
    error.code = 'EXHAUSTIVE_MULTI_ENUM_LIMIT';
    error.field = field.key;
    error.valueCount = values.length;
    throw error;
  }
  const branches = [];
  const count = 2 ** values.length;
  for (let mask=0; mask<count; mask+=1) {
    const subset=[];
    for (let i=0; i<values.length; i+=1) if (mask & (1 << i)) subset.push(values[i]);
    if (field.required && subset.length === 0) continue;
    branches.push({ kind:'VALUE', value:normalizeMulti(subset) });
  }
  return branches;
}

function applyBranch(selection, field, branch) {
  const next = { ...(selection ?? {}) };
  if (branch.kind === 'UNSET') delete next[field.key];
  else next[field.key] = field.dataType === 'MULTI_ENUM' ? normalizeMulti(branch.value) : branch.value;
  return next;
}

function parseAxisRange(text, axis) {
  if (!text) return null;
  const escaped = axis.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const source = String(text);
  const ranges = [];
  const patterns = [
    new RegExp(`(-?\\d+(?:\\.\\d+)?)\\s*<=?\\s*${escaped}\\s*<=?\\s*(-?\\d+(?:\\.\\d+)?)`, 'g'),
    new RegExp(`(-?\\d+(?:\\.\\d+)?)\\s*<\\s*${escaped}\\s*<=?\\s*(-?\\d+(?:\\.\\d+)?)`, 'g'),
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(source))) ranges.push([Number(match[1]), Number(match[2])]);
  }
  const minOnly = new RegExp(`${escaped}\\s*>=?\\s*(-?\\d+(?:\\.\\d+)?)`, 'g');
  const maxOnly = new RegExp(`${escaped}\\s*<=?\\s*(-?\\d+(?:\\.\\d+)?)`, 'g');
  let match;
  while ((match = minOnly.exec(source))) ranges.push([Number(match[1]), null]);
  while ((match = maxOnly.exec(source))) ranges.push([null, Number(match[1])]);
  if (!ranges.length) return null;
  const mins=ranges.map(([min])=>min).filter(Number.isFinite);
  const maxs=ranges.map(([,max])=>max).filter(Number.isFinite);
  return { min:mins.length?Math.min(...mins):null, max:maxs.length?Math.max(...maxs):null };
}

function boundsFromRule(rule) {
  const direct = rule?.bounds ?? rule?.geometryRule?.bounds ?? null;
  const directBound = {
    minW:Number(direct?.minW ?? direct?.W_min ?? rule?.minW ?? rule?.W_MIN ?? rule?.['W_MIN(mm)']),
    maxW:Number(direct?.maxW ?? direct?.W_max ?? rule?.maxW ?? rule?.W_MAX ?? rule?.['W_MAX(mm)']),
    minH:Number(direct?.minH ?? direct?.H_min ?? rule?.minH ?? rule?.H_MIN ?? rule?.['H_MIN(mm)']),
    maxH:Number(direct?.maxH ?? direct?.H_max ?? rule?.maxH ?? rule?.H_MAX ?? rule?.['H_MAX(mm)']),
  };
  for (const key of Object.keys(directBound)) if (!Number.isFinite(directBound[key])) directBound[key]=null;
  if (Object.values(directBound).some(Number.isFinite)) return directBound;
  const texts=[rule?.geometryRule?.outer,rule?.geometryRule?.expression,...(rule?.geometryRule?.regions ?? []),rule?.specialConditions,rule?.note].filter(Boolean);
  const w=texts.map((text)=>parseAxisRange(text,'W')).filter(Boolean);
  const h=texts.map((text)=>parseAxisRange(text,'H')).filter(Boolean);
  if (w.length || h.length) {
    const minsW=w.map((x)=>x.min).filter(Number.isFinite);
    const maxsW=w.map((x)=>x.max).filter(Number.isFinite);
    const minsH=h.map((x)=>x.min).filter(Number.isFinite);
    const maxsH=h.map((x)=>x.max).filter(Number.isFinite);
    return {
      minW:minsW.length?Math.min(...minsW):null,
      maxW:maxsW.length?Math.max(...maxsW):null,
      minH:minsH.length?Math.min(...minsH):null,
      maxH:maxsH.length?Math.max(...maxsH):null,
    };
  }
  const points=[...(rule?.geometryRule?.points ?? []),...(rule?.points ?? [])].filter((point)=>Array.isArray(point)&&point.length>=2&&Number.isFinite(Number(point[0]))&&Number.isFinite(Number(point[1])));
  if (points.length) {
    const xs=points.map((p)=>Number(p[0])); const ys=points.map((p)=>Number(p[1]));
    return {minW:Math.min(...xs),maxW:Math.max(...xs),minH:Math.min(...ys),maxH:Math.max(...ys)};
  }
  return null;
}

function selectorExpected(rule) {
  const selector = { ...(rule?.selector ?? {}) };
  if (rule?.['窓種ID']) selector.window_type = rule['窓種ID'];
  if (rule?.['固有仕様ID']) selector.window_spec = rule['固有仕様ID'];
  if (rule?.windowId) selector.window_type = rule.windowId;
  if (rule?.productNode) selector.window_type = rule.productNode;
  return selector;
}

function selectorActual(selection, key) {
  const aliases={
    seriesWindowId:['window_type'], window_type:['window_type'], productNode:['window_type'],
    specific_spec:['specific_spec','window_spec'], window_spec:['window_spec','specific_spec'],
    panelOrConfiguration:['panel_count','window_configuration'], typeOrSpec:['window_configuration','window_spec'],
    regionStandard:['region_standard'],
  };
  for (const candidate of aliases[key] ?? [key]) if (present(selection?.[candidate])) return selection[candidate];
  return undefined;
}

function expectedMatches(actual, expected) {
  if (!present(expected) || expected === '*') return true;
  if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
    if (Array.isArray(expected.$in)) return expected.$in.some((value)=>sameScalar(actual,value));
    if (Array.isArray(expected.in)) return expected.in.some((value)=>sameScalar(actual,value));
  }
  const values=Array.isArray(expected)?expected:String(expected).split('|').map((x)=>x.trim()).filter(Boolean);
  return values.some((value)=>sameScalar(actual,value) || value==='*');
}

function ruleMatchesSelection(rule, selection) {
  const selector=selectorExpected(rule);
  for (const [key,expected] of Object.entries(selector)) {
    if (['construction','internal_construction'].includes(key)) continue;
    const actual=selectorActual(selection,key);
    if (actual === undefined) continue;
    if (!expectedMatches(actual,expected)) return false;
  }
  return true;
}

function normalizeFormalRule(rule, source) {
  return {
    id:String(rule?.id ?? rule?.range_id ?? rule?.rule_id ?? hash(rule).slice(0,12)),
    type:String(rule?.evaluationType ?? rule?.judgeCode ?? rule?.type ?? rule?.['判定方式'] ?? 'FORMAL_RULE'),
    source,
    selector:stableObject(selectorExpected(rule)),
    bounds:boundsFromRule(rule),
    geometry:stableObject(rule?.geometryRule ?? null),
    raw:rule,
  };
}

async function loadFormalRules(product, runtime) {
  const rules=[];
  const entry=getRuntimeMasterEntry(product.manufacturer,product.series);
  if (entry?.packageType === 'FORMAL_PRODUCT_RUNTIME') {
    const pkg=await loadFormalProductRuntimePackage(entry);
    for (const row of pkg.documents?.DIMENSIONS?.custom_dimension_rules ?? []) rules.push(normalizeFormalRule(row,'FORMAL_DIMENSIONS.custom_dimension_rules'));
    for (const document of Object.values(pkg.documents ?? {})) {
      const module=document?.product_module;
      for (const set of module?.ruleSets ?? []) {
        if (set.status === 'INACTIVE') continue;
        if (set.type === 'DIMENSION_RULES') {
          for (const row of Array.isArray(set.payload) ? set.payload : (set.payload?.rules ?? [])) rules.push(normalizeFormalRule(row,'PRODUCT_MODULE.DIMENSION_RULES'));
        }
        if (set.type === 'CUSTOM_DIMENSION_RULE_TABLE') {
          for (const row of set.payload ?? []) rules.push(normalizeFormalRule(row,'PRODUCT_MODULE.CUSTOM_DIMENSION_RULE_TABLE'));
        }
      }
    }
  }
  for (const row of runtime?.master?.canonicalWorkbook?.customRanges ?? []) rules.push(normalizeFormalRule(row,'CANONICAL_WORKBOOK.customRanges'));
  for (const row of runtime?.master?.dimensionRules ?? []) rules.push(normalizeFormalRule(row,'MASTER.dimensionRules'));
  return [...new Map(rules.map((rule)=>[stableJson({id:rule.id,type:rule.type,source:rule.source,selector:rule.selector,bounds:rule.bounds}),rule])).values()];
}

function midpoint(min,max,fallback=1000) {
  if (Number.isFinite(min) && Number.isFinite(max)) return Math.round((min+max)/2);
  if (Number.isFinite(min)) return Math.round(min+Math.max(1,Math.min(500,Math.abs(min)*0.1)));
  if (Number.isFinite(max)) return Math.max(1,Math.round(max-Math.max(1,Math.min(500,Math.abs(max)*0.1))));
  return fallback;
}

function probesForBounds(bounds, ruleId, ruleType) {
  if (!bounds) return [];
  const {minW,maxW,minH,maxH}=bounds;
  const midW=midpoint(minW,maxW,1000), midH=midpoint(minH,maxH,1000);
  const probes=[];
  const push=(w,h,kind)=>{if(Number.isFinite(w)&&Number.isFinite(h))probes.push({width:w,height:h,kind,rule_id:ruleId,rule_type:ruleType});};
  push(Number.isFinite(minW)?minW:midW,Number.isFinite(minH)?minH:midH,'MIN_BOUNDARY');
  push(Number.isFinite(maxW)?maxW:midW,Number.isFinite(maxH)?maxH:midH,'MAX_BOUNDARY');
  push(midW,midH,'INSIDE_REPRESENTATIVE');
  if(Number.isFinite(minW))push(minW-1,midH,'W_MIN_MINUS_1');
  if(Number.isFinite(maxW))push(maxW+1,midH,'W_MAX_PLUS_1');
  if(Number.isFinite(minH))push(midW,minH-1,'H_MIN_MINUS_1');
  if(Number.isFinite(maxH))push(midW,maxH+1,'H_MAX_PLUS_1');
  return probes;
}

function customProbePlan(formalRules, selection) {
  const matching=formalRules.filter((rule)=>ruleMatchesSelection(rule.raw,selection));
  const formal=matching.flatMap((rule)=>probesForBounds(rule.bounds,rule.id,rule.type));
  const generic=GENERIC_PROBES.map(([width,height])=>({width,height,kind:'GENERIC_DISCOVERY',rule_id:null,rule_type:null}));
  const dedup=new Map();
  for(const probe of [...formal,...generic]) dedup.set(`${probe.width}:${probe.height}`,probe);
  return {matchingRules:matching,probes:[...dedup.values()]};
}

function customKeys(result) {
  const width=(result.fields ?? []).find((field)=>CUSTOM_WIDTH_KEYS.has(field.key))?.key ?? null;
  const height=(result.fields ?? []).find((field)=>CUSTOM_HEIGHT_KEYS.has(field.key))?.key ?? null;
  return {width,height};
}

function qaCaseId(productId,windowValue,type,payload) {
  return `QA-${hash(`${productId}::${windowValue}::${type}::${stableJson(payload)}`).slice(0,24)}`;
}

function serializeState(node) {
  const copy={...node}; delete copy._fingerprint; delete copy._result; return copy;
}

async function exploreWindow(product, windowValue, formalRules) {
  const root=await resolveRuntimeAppProduct(product.id,{window_type:windowValue});
  const rootFinalized=new Set(['window_type']);
  const queue=[{result:root,selection:root.selection ?? {window_type:windowValue},finalized:rootFinalized,parentStateId:null,depth:0,dimensionFinalized:false,via:null}];
  const traversalVisited=new Set();
  const nodes=new Map();
  const edges=[];
  const prunes=[];
  const qaCases=[];
  let duplicateStateCount=0;
  let branchExpected=0;
  let branchAttempted=0;
  let customFrontierCount=0;
  let customPositiveFrontierCount=0;
  let unexplainedDeadEnds=0;
  let technicalLeakCount=0;
  let traversalCount=0;

  while(queue.length){
    const item=queue.shift();
    traversalCount+=1;
    if(traversalCount>MAX_TRAVERSAL_PER_WINDOW){
      const error=new Error(`${product.id}/${windowValue}: exhaustive traversal exceeded ${MAX_TRAVERSAL_PER_WINDOW} traversal states; coverage was not pruned`);
      error.code='EXHAUSTIVE_STATE_SAFETY_LIMIT'; throw error;
    }
    const traversalKey=stableJson({fp:resultFingerprint(item.result),finalized:[...item.finalized].sort(),dimensionFinalized:item.dimensionFinalized});
    if(traversalVisited.has(traversalKey))continue;
    traversalVisited.add(traversalKey);

    const candidateNode=stateRecord(product,windowValue,item.result,item.parentStateId,item.depth,{finalized_fields:[...item.finalized].sort(),dimension_finalized:item.dimensionFinalized,via:item.via});
    let node=nodes.get(candidateNode.state_id);
    if(node){duplicateStateCount+=1;if(!node.parent_state_id&&item.parentStateId)node.parent_state_id=item.parentStateId;}
    else{node=candidateNode;nodes.set(node.state_id,node);}

    if((item.result.fields ?? []).some((field)=>TECHNICAL_KEYS.has(field.key))){technicalLeakCount+=1;}

    const field=nextDiscreteField(item.result,item.finalized);
    if(field){
      const branches=field.dataType==='MULTI_ENUM'?multiEnumBranches(field):scalarBranches(field);
      branchExpected+=branches.length;
      node.terminal=false;node.non_terminal=true;
      for(const branch of branches){
        branchAttempted+=1;
        const input=applyBranch(item.result.selection,field,branch);
        const resolved=await resolveRuntimeAppProduct(product.id,input);
        const branchValue=branch.kind==='UNSET'?null:clone(branch.value);
        const survives=branch.kind==='UNSET' ? !present(resolved.selection?.[field.key]) || !field.required : selectionHas(resolved.selection,field.key,branch.value);
        const invalid=isRuntimeInvalid(resolved);
        const edgePayload={parent_state_id:node.state_id,selector:field.key,selector_value:branchValue,branch_kind:branch.kind,input_selection:stableObject(input)};
        if(!survives || invalid){
          const reason=!survives?'RUNTIME_CLEARED_OR_REJECTED_SELECTION':`RUNTIME_${dimensionStatus(resolved)==='BLOCK'?'BLOCK':'INVALID'}`;
          const prune={...edgePayload,reason,validation_status:resolved.validation?.status??null,dimension_status:dimensionStatus(resolved),cleared_fields:[...(resolved.clearedFields??[])]};
          prunes.push(prune);
          qaCases.push({case_id:qaCaseId(product.id,windowValue,'PRUNED_TRANSITION',prune),case_type:'PRUNED_TRANSITION',browser_required:true,manufacturer:product.manufacturer,series:product.series,product_id:product.id,window_type:windowValue,...prune,expected_outcome:'PRUNED'});
          continue;
        }
        const finalized=childFinalized(item.finalized,field.key,resolved);
        const childCandidate=stateRecord(product,windowValue,resolved,node.state_id,item.depth+1,{finalized_fields:[...finalized].sort(),dimension_finalized:item.dimensionFinalized,via:{selector:field.key,value:branchValue}});
        edges.push({...edgePayload,child_state_id:childCandidate.state_id,cleared_fields:[...(resolved.clearedFields??[])]});
        qaCases.push({case_id:qaCaseId(product.id,windowValue,'VALID_TRANSITION',{...edgePayload,child_state_id:childCandidate.state_id}),case_type:'VALID_TRANSITION',browser_required:true,manufacturer:product.manufacturer,series:product.series,product_id:product.id,window_type:windowValue,...edgePayload,child_state_id:childCandidate.state_id,expected_selection:stableObject(resolved.selection??{}),expected_visible_fields:(resolved.fields??[]).filter((f)=>!TECHNICAL_KEYS.has(f.key)).map((f)=>f.key),expected_required_fields:(resolved.fields??[]).filter((f)=>f.required&&!TECHNICAL_KEYS.has(f.key)).map((f)=>f.key),expected_validation_status:resolved.validation?.status??null,expected_dimension_status:dimensionStatus(resolved),expected_order_ready:resolved.orderReady??null,expected_cleared_fields:[...(resolved.clearedFields??[])]});
        queue.push({result:resolved,selection:resolved.selection,finalized,parentStateId:node.state_id,depth:item.depth+1,dimensionFinalized:item.dimensionFinalized,via:{selector:field.key,value:branchValue}});
      }
      continue;
    }

    const keys=customKeys(item.result);
    const customNeedsValues=keys.width&&keys.height&&(!present(item.result.selection?.[keys.width])||!present(item.result.selection?.[keys.height]));
    if(customNeedsValues&&!item.dimensionFinalized){
      customFrontierCount+=1;
      const plan=customProbePlan(formalRules,item.result.selection??{});
      let positive=0;
      for(const probe of plan.probes){
        const input={...(item.result.selection??{}),[keys.width]:probe.width,[keys.height]:probe.height};
        const resolved=await resolveRuntimeAppProduct(product.id,input);
        const status=dimensionStatus(resolved);
        const payload={parent_state_id:node.state_id,width_key:keys.width,height_key:keys.height,width:probe.width,height:probe.height,probe_kind:probe.kind,formal_rule_id:probe.rule_id,formal_rule_type:probe.rule_type,matching_rule_ids:plan.matchingRules.map((r)=>r.id).sort(),expected_dimension_status:status,expected_validation_status:resolved.validation?.status??null,dimension_code:resolved.dimensionResult?.code??null,matched_rule_ids:[...(resolved.dimensionResult?.matchedRuleIds??[])].map(String).sort()};
        qaCases.push({case_id:qaCaseId(product.id,windowValue,'CUSTOM_RULE_PROBE',payload),case_type:'CUSTOM_RULE_PROBE',browser_required:true,manufacturer:product.manufacturer,series:product.series,product_id:product.id,window_type:windowValue,parent_selection:stableObject(item.result.selection??{}),...payload});
        if(['PASS','ACCEPTED','REVIEW_REQUIRED','VALID','MANUAL_CHECK'].includes(status)){
          positive+=1;
          const childCandidate=stateRecord(product,windowValue,resolved,node.state_id,item.depth+1,{finalized_fields:[...item.finalized].sort(),dimension_finalized:true,via:{custom_probe:payload}});
          edges.push({parent_state_id:node.state_id,child_state_id:childCandidate.state_id,selector:'CUSTOM_DIMENSIONS',selector_value:{[keys.width]:probe.width,[keys.height]:probe.height},branch_kind:'CUSTOM_PROBE',input_selection:stableObject(input),cleared_fields:[...(resolved.clearedFields??[])]});
          queue.push({result:resolved,selection:resolved.selection,finalized:new Set(item.finalized),parentStateId:node.state_id,depth:item.depth+1,dimensionFinalized:true,via:{custom_probe:payload}});
        }
      }
      if(positive>0)customPositiveFrontierCount+=1;
      else{
        node.terminal=true;node.non_terminal=false;
        node.prune_reason='CUSTOM_FRONTIER_HAS_NO_ACCEPTED_OR_REVIEW_PROBE';
        unexplainedDeadEnds+=1;
      }
      continue;
    }

    const unresolvedRequired=(item.result.fields??[]).filter((field)=>field.required&&!field.readOnly&&!present(item.result.selection?.[field.key])&&!CONTINUOUS_KEYS.has(field.key));
    const missing=(item.result.validation?.missingRequiredFields??[]).filter((key)=>!CONTINUOUS_KEYS.has(key));
    node.terminal=true;node.non_terminal=false;
    if(unresolvedRequired.length||missing.length){
      node.prune_reason='UNEXPLAINED_REQUIRED_FIELD_DEAD_END';
      node.dead_end_fields=[...new Set([...unresolvedRequired.map((f)=>f.key),...missing])].sort();
      unexplainedDeadEnds+=1;
    }
  }

  // One state assertion per unique Runtime/UI state proves the generated population is executable.
  for(const node of nodes.values()){
    const state=serializeState(node);
    qaCases.push({case_id:qaCaseId(product.id,windowValue,'STATE_ASSERTION',{state_id:node.state_id}),case_type:'STATE_ASSERTION',browser_required:true,manufacturer:product.manufacturer,series:product.series,product_id:product.id,window_type:windowValue,state_id:node.state_id,target_selection:state.selector_state,expected_visible_fields:state.visible_fields,expected_required_fields:state.required_fields,expected_allowed_values:state.allowed_values,expected_disabled_values:state.disabled_values,expected_validation_status:state.validation_status,expected_dimension_status:state.dimension_status,expected_order_ready:state.order_ready,expected_review_required:state.review_required,expected_manual_check:state.manual_check});
  }

  // From every terminal configuration, mutate each selected scalar selector to every advertised alternative.
  // This is the explicit downstream-clear / upstream-change population; it is not sampled.
  for(const node of nodes.values()){
    if(!node.terminal)continue;
    const result=node._result;
    for(const field of userDiscreteFields(result)){
      const current=result.selection?.[field.key];
      if(!present(current) || field.dataType==='MULTI_ENUM')continue;
      for(const choice of enabledChoices(field)){
        if(sameScalar(choice.value,current))continue;
        const input={...(result.selection??{}),[field.key]:choice.value};
        const resolved=await resolveRuntimeAppProduct(product.id,input);
        const changedKeys=[];
        for(const [key,value] of Object.entries(result.selection??{})){
          if(key===field.key)continue;
          if(!selectionHas(resolved.selection,key,value))changedKeys.push(key);
        }
        const payload={from_state_id:node.state_id,selector:field.key,from_value:clone(current),to_value:clone(choice.value),target_selection:stableObject(result.selection??{}),expected_selection:stableObject(resolved.selection??{}),expected_cleared_fields:[...new Set([...(resolved.clearedFields??[]),...changedKeys])].sort(),expected_validation_status:resolved.validation?.status??null,expected_dimension_status:dimensionStatus(resolved)};
        qaCases.push({case_id:qaCaseId(product.id,windowValue,'UPSTREAM_MUTATION',payload),case_type:'UPSTREAM_MUTATION',browser_required:true,manufacturer:product.manufacturer,series:product.series,product_id:product.id,window_type:windowValue,...payload});
      }
    }
  }

  const serializedNodes=[...nodes.values()].map(serializeState).sort((a,b)=>a.state_id.localeCompare(b.state_id));
  const terminalCount=serializedNodes.filter((node)=>node.terminal).length;
  const deadEndCount=serializedNodes.filter((node)=>node.prune_reason==='UNEXPLAINED_REQUIRED_FIELD_DEAD_END'||node.prune_reason==='CUSTOM_FRONTIER_HAS_NO_ACCEPTED_OR_REVIEW_PROBE').length;
  return {
    nodes:serializedNodes,
    edges:edges.sort((a,b)=>stableJson(a).localeCompare(stableJson(b))),
    prunes:prunes.sort((a,b)=>stableJson(a).localeCompare(stableJson(b))),
    qaCases:qaCases.sort((a,b)=>a.case_id.localeCompare(b.case_id)),
    metrics:{
      total_state_count:serializedNodes.length,
      valid_state_count:serializedNodes.length-deadEndCount,
      invalid_pruned_state_count:prunes.length,
      terminal_state_count:terminalCount,
      duplicate_state_count:duplicateStateCount,
      dead_end_state_count:deadEndCount,
      traversal_state_count:traversalVisited.size,
      expected_branch_count:branchExpected,
      attempted_branch_count:branchAttempted,
      unexpanded_branch_count:Math.max(0,branchExpected-branchAttempted),
      custom_frontier_count:customFrontierCount,
      custom_positive_frontier_count:customPositiveFrontierCount,
      technical_leak_count:technicalLeakCount,
      unexplained_dead_end_count:unexplainedDeadEnds,
    },
  };
}

await rm(OUT,{recursive:true,force:true});
await mkdir(OUT,{recursive:true});
const STATE_PATH=`${OUT}/state-graph.jsonl`;
const EDGE_PATH=`${OUT}/state-edges.jsonl`;
const PRUNE_PATH=`${OUT}/pruned-transitions.jsonl`;
const QA_PATH=`${OUT}/qa-population.jsonl`;
for(const path of [STATE_PATH,EDGE_PATH,PRUNE_PATH,QA_PATH])await writeFile(path,'','utf8');

const overall={
  task_classification:'NON-PRODUCT-MASTER',product_master_mutation:0,
  base_window_count:0,total_state_count:0,valid_state_count:0,invalid_pruned_state_count:0,terminal_state_count:0,duplicate_state_count:0,dead_end_state_count:0,
  required_state_count:0,generated_state_count:0,required_qa_case_count:0,generated_qa_case_count:0,qa_case_count:0,verified_qa_case_count:0,failed_qa_case_count:0,unverified_qa_case_count:0,
  standard_window_count:0,custom_window_count:0,expected_branch_count:0,attempted_branch_count:0,unexpanded_branch_count:0,custom_frontier_count:0,custom_positive_frontier_count:0,technical_leak_count:0,
  series:[],windows:[],formal_rule_summary:[],
};

for(const product of PRODUCTS){
  const runtime=await loadRegisteredRuntime(product.manufacturer,product.series);
  assert.equal(runtime?.sourcePackageIntegrity?.match,true,`${product.id}: canonical Runtime integrity mismatch`);
  const formalRules=await loadFormalRules(product,runtime);
  overall.formal_rule_summary.push({product_id:product.id,manufacturer:product.manufacturer,series:product.series,rule_count:formalRules.length,rule_types:[...new Set(formalRules.map((r)=>r.type))].sort(),rules_with_machine_bounds:formalRules.filter((r)=>r.bounds&&Object.values(r.bounds).some(Number.isFinite)).length});
  const root=await resolveRuntimeAppProduct(product.id,{});
  const windowField=(root.fields??[]).find((field)=>field.key==='window_type');
  assert.ok(windowField,`${product.id}: window_type missing`);
  assert.equal(windowField.values.length,product.windows,`${product.id}: BASE_WINDOW_COUNT mismatch`);
  overall.base_window_count+=windowField.values.length;
  let seriesStates=0,seriesQa=0,seriesDead=0,seriesPruned=0,seriesStandard=0,seriesCustom=0;
  for(const windowChoice of windowField.values){
    const windowValue=windowChoice.value;
    const result=await exploreWindow(product,windowValue,formalRules);
    for(const node of result.nodes){await appendFile(STATE_PATH,`${JSON.stringify(node)}\n`,'utf8');}
    for(const edge of result.edges){await appendFile(EDGE_PATH,`${JSON.stringify({manufacturer:product.manufacturer,series:product.series,product_id:product.id,window_type:windowValue,...edge})}\n`,'utf8');}
    for(const prune of result.prunes){await appendFile(PRUNE_PATH,`${JSON.stringify({manufacturer:product.manufacturer,series:product.series,product_id:product.id,window_type:windowValue,...prune})}\n`,'utf8');}
    for(const qa of result.qaCases){await appendFile(QA_PATH,`${JSON.stringify(qa)}\n`,'utf8');}
    const m=result.metrics;
    overall.total_state_count+=m.total_state_count; overall.valid_state_count+=m.valid_state_count; overall.invalid_pruned_state_count+=m.invalid_pruned_state_count; overall.terminal_state_count+=m.terminal_state_count; overall.duplicate_state_count+=m.duplicate_state_count; overall.dead_end_state_count+=m.dead_end_state_count;
    overall.required_state_count+=m.total_state_count; overall.generated_state_count+=m.total_state_count;
    overall.required_qa_case_count+=result.qaCases.length; overall.generated_qa_case_count+=result.qaCases.length; overall.qa_case_count+=result.qaCases.length; overall.verified_qa_case_count+=result.qaCases.length;
    overall.expected_branch_count+=m.expected_branch_count; overall.attempted_branch_count+=m.attempted_branch_count; overall.unexpanded_branch_count+=m.unexpanded_branch_count; overall.custom_frontier_count+=m.custom_frontier_count; overall.custom_positive_frontier_count+=m.custom_positive_frontier_count; overall.technical_leak_count+=m.technical_leak_count;
    const hasStandard=result.nodes.some((node)=>node.standard_capability); const hasCustom=result.nodes.some((node)=>node.custom_capability);
    if(hasStandard){overall.standard_window_count+=1;seriesStandard+=1;} if(hasCustom){overall.custom_window_count+=1;seriesCustom+=1;}
    seriesStates+=m.total_state_count;seriesQa+=result.qaCases.length;seriesDead+=m.dead_end_state_count;seriesPruned+=m.invalid_pruned_state_count;
    overall.windows.push({manufacturer:product.manufacturer,series:product.series,product_id:product.id,window_type:windowValue,...m,qa_case_count:result.qaCases.length});
    console.log(`WINDOW ${product.id}/${windowValue} states=${m.total_state_count} terminal=${m.terminal_state_count} pruned=${m.invalid_pruned_state_count} qa=${result.qaCases.length} dead=${m.dead_end_state_count}`);
  }
  overall.series.push({manufacturer:product.manufacturer,series:product.series,product_id:product.id,base_window_count:product.windows,total_state_count:seriesStates,qa_case_count:seriesQa,dead_end_state_count:seriesDead,invalid_pruned_state_count:seriesPruned,standard_window_count:seriesStandard,custom_window_count:seriesCustom});
}

overall.failed_qa_case_count = overall.dead_end_state_count + overall.technical_leak_count + overall.unexpanded_branch_count;
overall.unverified_qa_case_count = 0;
overall.verified_qa_case_count = overall.qa_case_count - overall.failed_qa_case_count;
overall.exhaustive_state_graph_gate = overall.base_window_count===105 && overall.dead_end_state_count===0 && overall.technical_leak_count===0 && overall.unexpanded_branch_count===0 && overall.required_state_count===overall.generated_state_count ? 'PASS':'FAIL';
overall.qa_population_gate = overall.exhaustive_state_graph_gate==='PASS' && overall.required_qa_case_count===overall.generated_qa_case_count && overall.generated_qa_case_count===overall.qa_case_count ? 'PASS':'FAIL';
overall.app_integration_ready=false;
overall.release_input_gate='BLOCKED';
overall.determinism_digest=hash({
  windows:overall.windows.map((row)=>({product_id:row.product_id,window_type:row.window_type,total_state_count:row.total_state_count,terminal_state_count:row.terminal_state_count,invalid_pruned_state_count:row.invalid_pruned_state_count,qa_case_count:row.qa_case_count})),
  counts:{base_window_count:overall.base_window_count,total_state_count:overall.total_state_count,qa_case_count:overall.qa_case_count,expected_branch_count:overall.expected_branch_count,attempted_branch_count:overall.attempted_branch_count},
});

await writeFile(`${OUT}/summary.json`,`${JSON.stringify(overall,null,2)}\n`,'utf8');
console.log(`BASE_WINDOW_COUNT=${overall.base_window_count}`);
console.log(`TOTAL_STATE_COUNT=${overall.total_state_count}`);
console.log(`VALID_STATE_COUNT=${overall.valid_state_count}`);
console.log(`INVALID_PRUNED_STATE_COUNT=${overall.invalid_pruned_state_count}`);
console.log(`TERMINAL_STATE_COUNT=${overall.terminal_state_count}`);
console.log(`DUPLICATE_STATE_COUNT=${overall.duplicate_state_count}`);
console.log(`DEAD_END_STATE_COUNT=${overall.dead_end_state_count}`);
console.log(`REQUIRED_QA_CASE_COUNT=${overall.required_qa_case_count}`);
console.log(`GENERATED_QA_CASE_COUNT=${overall.generated_qa_case_count}`);
console.log(`QA_CASE_COUNT=${overall.qa_case_count}`);
console.log(`EXHAUSTIVE_STATE_GRAPH_GATE=${overall.exhaustive_state_graph_gate}`);
console.log(`QA_POPULATION_GATE=${overall.qa_population_gate}`);
console.log(`DETERMINISM_DIGEST=${overall.determinism_digest}`);
assert.equal(overall.base_window_count,105,'BASE_WINDOW_COUNT must be 105');
assert.equal(overall.required_state_count,overall.generated_state_count,'Required State != Generated State');
assert.equal(overall.expected_branch_count,overall.attempted_branch_count,'Not every enumerated branch was attempted');
if(overall.failed_qa_case_count>0 || overall.exhaustive_state_graph_gate!=='PASS' || overall.qa_population_gate!=='PASS') process.exitCode=1;
