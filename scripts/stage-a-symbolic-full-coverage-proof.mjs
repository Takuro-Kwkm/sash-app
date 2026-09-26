import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { getRuntimeMasterEntry, loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { loadFormalProductRuntimePackage } from '../src/catalog/runtime-master/formal-product-runtime-loader.mjs';

const PROOF_MODEL_VERSION = 'RUNTIME_UI_SYMBOLIC_FULL_COVERAGE_V1';
const OUT = process.env.STAGE_A_SYMBOLIC_PROOF_OUT ?? 'artifacts/stage-a-symbolic-full-coverage-proof';
const HEAD_SHA = process.env.HEAD_SHA ?? null;
const SHARD_TOTAL = Number(process.env.STAGE_A_SHARD_TOTAL ?? 12);
const SHARD_INDEX = Number(process.env.STAGE_A_SHARD_INDEX ?? 0);
const MAX_EXPLICIT_MULTI_ENUM_VALUES = Number(process.env.STAGE_A_MAX_EXPLICIT_MULTI_ENUM_VALUES ?? 18);
const MAX_TRAVERSAL_PER_WINDOW = Number(process.env.STAGE_A_MAX_TRAVERSAL_PER_WINDOW ?? 50000);
const TW_ENGINE_SOURCE = 'src/catalog/runtime-master/canonical-workbook-runtime-engine.mjs';

assert.ok(Number.isInteger(SHARD_TOTAL) && SHARD_TOTAL >= 1);
assert.ok(Number.isInteger(SHARD_INDEX) && SHARD_INDEX >= 0 && SHARD_INDEX < SHARD_TOTAL);
assert.ok(Number.isInteger(MAX_TRAVERSAL_PER_WINDOW) && MAX_TRAVERSAL_PER_WINDOW >= 1);

const PRODUCTS = [
  { id:'SER-LIX-SAMOS2H', manufacturer:'LIXIL', series:'サーモスⅡ-H', expectedWindows:17 },
  { id:'SER-LIX-SAMOSL', manufacturer:'LIXIL', series:'サーモスL', expectedWindows:17 },
  { id:'SER-LIX-EW', manufacturer:'LIXIL', series:'EW', expectedWindows:15 },
  { id:'SER-LIXIL-TW', manufacturer:'LIXIL', series:'TW', expectedWindows:25 },
  { id:'SER-YKK-APW430', manufacturer:'YKK AP', series:'APW430', expectedWindows:25 },
  { id:'SER-YKK-APW431', manufacturer:'YKK AP', series:'APW431', expectedWindows:6 },
];

const TECHNICAL_KEYS = new Set(['construction','legacyConstruction','legacyConfiguration','internal_construction']);
const CUSTOM_WIDTH_KEYS = new Set(['custom_width','custom_w','order_width']);
const CUSTOM_HEIGHT_KEYS = new Set(['custom_height','custom_h','order_height']);
const CONTINUOUS_KEYS = new Set([...CUSTOM_WIDTH_KEYS, ...CUSTOM_HEIGHT_KEYS]);

const present = (value) => value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length > 0);
const enabled = (field) => (field?.values ?? []).filter((choice) => choice.disabled !== true);
const stable = (value) => {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([key,child]) => [key, stable(child)]));
};
const stableJson = (value) => JSON.stringify(stable(value));
const hash = (value) => createHash('sha256').update(typeof value === 'string' ? value : stableJson(value)).digest('hex');
const normalizeMulti = (values) => [...new Map(values.map((value) => [String(value), value])).values()].sort((a,b) => String(a).localeCompare(String(b)));
const sameScalar = (a,b) => Object.is(a,b) || String(a) === String(b);
const selectionHas = (selection,key,value) => {
  const actual = selection?.[key];
  if (Array.isArray(value)) return Array.isArray(actual) && stableJson(actual.map(String).sort()) === stableJson(value.map(String).sort());
  return sameScalar(actual,value);
};
const invalid = (result) => ['INVALID','BLOCKED','BLOCK'].includes(String(result.validation?.status ?? ''));

function fieldShape(field) {
  return {
    key:field.key,
    type:field.dataType ?? null,
    required:Boolean(field.required),
    readOnly:Boolean(field.readOnly),
    selectionMode:field.selectionMode ?? null,
    runtimeState:field.runtimeState ?? null,
    values:enabled(field).map((choice) => choice.value),
  };
}

function stateDigest(result, finalized, continuousFinalized) {
  return hash({
    selection:result.selection ?? {},
    finalized:[...finalized].sort(),
    continuousFinalized,
    fields:(result.fields ?? []).filter((field) => !TECHNICAL_KEYS.has(field.key)).map(fieldShape),
    validation:{
      status:result.validation?.status ?? null,
      missing:[...(result.validation?.missingRequiredFields ?? [])].sort(),
      errors:(result.validation?.errors ?? []).map((row) => row.errorCode ?? row.code ?? String(row)).sort(),
    },
    dimension:{ status:result.dimensionResult?.status ?? null, code:result.dimensionResult?.code ?? null },
    orderReady:result.orderReady ?? null,
    derivedOptions:[...(result.derivedOptions ?? [])].map(String).sort(),
    derivedComponents:[...(result.derivedComponents ?? [])].map(String).sort(),
  });
}

function userDiscreteFields(result) {
  return (result.fields ?? []).filter((field) => !TECHNICAL_KEYS.has(field.key) && !CONTINUOUS_KEYS.has(field.key) && enabled(field).length > 0 && !field.readOnly);
}
function nextDiscreteField(result, finalized) {
  return userDiscreteFields(result).find((field) => field.key !== 'window_type' && !finalized.has(field.key)) ?? null;
}
function visibleKeys(result) { return new Set((result.fields ?? []).map((field) => field.key)); }
function childFinalized(parent,key,result) {
  const visible = visibleKeys(result);
  return new Set([...parent,key].filter((candidate) => visible.has(candidate)));
}
function scalarBranches(field) {
  const rows = enabled(field).map((choice) => ({kind:'VALUE',value:choice.value}));
  if (!field.required) rows.unshift({kind:'UNSET',value:undefined});
  return rows;
}
function* explicitMultiBranches(field) {
  const values = enabled(field).map((choice) => choice.value);
  const count = 2 ** values.length;
  for (let mask=0; mask<count; mask+=1) {
    const subset=[];
    for (let i=0;i<values.length;i+=1) if (mask & (1<<i)) subset.push(values[i]);
    if (field.required && subset.length===0) continue;
    yield {kind:'VALUE',value:normalizeMulti(subset)};
  }
}
function applyBranch(selection,field,branch) {
  const next={...(selection ?? {})};
  if (branch.kind==='UNSET') delete next[field.key];
  else next[field.key]=field.dataType==='MULTI_ENUM' ? normalizeMulti(branch.value) : branch.value;
  return next;
}
function survives(result,field,branch) {
  if (branch.kind==='UNSET') return !present(result.selection?.[field.key]) || !field.required;
  return selectionHas(result.selection,field.key,branch.value);
}
function customKeys(result) {
  return {
    width:(result.fields ?? []).find((field) => CUSTOM_WIDTH_KEYS.has(field.key))?.key ?? null,
    height:(result.fields ?? []).find((field) => CUSTOM_HEIGHT_KEYS.has(field.key))?.key ?? null,
  };
}

function bitCount(mask) { let count=0; for (let value=mask; value; value >>= 1n) count += Number(value & 1n); return count; }
function connectedComponents(adjacency) {
  const seen=new Set(), components=[];
  for (const vertex of adjacency.keys()) {
    if (seen.has(vertex)) continue;
    const stack=[vertex], component=[]; seen.add(vertex);
    while (stack.length) {
      const current=stack.pop(); component.push(current);
      for (const next of adjacency.get(current) ?? []) if (!seen.has(next)) { seen.add(next); stack.push(next); }
    }
    components.push(component);
  }
  return components;
}
function independentSetCount(component,adjacency) {
  const index=new Map(component.map((value,i)=>[value,i]));
  const neighbors=component.map((value) => {
    let mask=0n;
    for (const next of adjacency.get(value) ?? []) { const i=index.get(next); if (i!==undefined) mask |= 1n << BigInt(i); }
    return mask;
  });
  const memo=new Map();
  const solve=(mask) => {
    if (mask===0n) return 1n;
    const key=mask.toString(); if (memo.has(key)) return memo.get(key);
    let edge=false;
    for (let i=0;i<component.length;i+=1) { const bit=1n<<BigInt(i); if ((mask&bit) && (neighbors[i]&mask)) { edge=true; break; } }
    if (!edge) { const result=1n<<BigInt(bitCount(mask)); memo.set(key,result); return result; }
    let chosen=-1,best=-1;
    for (let i=0;i<component.length;i+=1) { const bit=1n<<BigInt(i); if (!(mask&bit)) continue; const degree=bitCount(neighbors[i]&mask); if (degree>best) { best=degree; chosen=i; } }
    const bit=1n<<BigInt(chosen), without=mask&~bit;
    const result=solve(without)+solve(without&~neighbors[chosen]); memo.set(key,result); return result;
  };
  return solve((1n<<BigInt(component.length))-1n);
}
function exactIndependentSetCount(adjacency) {
  return connectedComponents(adjacency).reduce((product,component)=>product*independentSetCount(component,adjacency),1n);
}

async function proveTwOptionRuleShape() {
  const source = await readFile(TW_ENGINE_SOURCE,'utf8');
  const start = source.indexOf('function scopedOptions(');
  const end = source.indexOf('\nfunction ', start + 10);
  assert.ok(start>=0 && end>start, 'TW scopedOptions source not found');
  const body = source.slice(start,end);
  const selectionKeys=[...new Set([...body.matchAll(/selection\.([A-Za-z_][A-Za-z0-9_]*)/g)].map((match)=>match[1]))].sort();
  const allowedKeys=new Set(['glass_base','size','panel_count','shutter_type','operation_type','option']);
  const unknown=selectionKeys.filter((key)=>!allowedKeys.has(key));
  const optionRefs=(body.match(/selection\.option/g) ?? []).length;
  assert.deepEqual(unknown,[],`TW scopedOptions unknown selection keys: ${unknown.join(',')}`);
  assert.equal(optionRefs,1,'TW scopedOptions must have exactly one selection.option reference');
  assert.ok(body.includes("const trigger = rule['トリガーoption_id']"),'TW scalar trigger extraction missing');
  assert.ok(body.includes('(selection.option ?? []).includes(trigger)'),'TW single-trigger membership check missing');
  assert.ok(!/selection\.option[^\n]*(every|filter|reduce|some)\s*\(/.test(body),'TW higher-order option interaction detected');
  return { source_path:TW_ENGINE_SOURCE, source_sha256:hash(source), scoped_options_sha256:hash(body), selection_keys:selectionKeys };
}
const TW_RULE_SHAPE = await proveTwOptionRuleShape();
const optionProofCache = new Map();

function optionContextSignature(product,result,field) {
  const context={};
  for (const key of TW_RULE_SHAPE.selection_keys) if (key!=='option') context[key]=result.selection?.[key] ?? null;
  return hash({product_id:product.id,context,candidates:enabled(field).map((choice)=>String(choice.value)).sort()});
}

async function symbolicTwOptionProof(product,result,field) {
  assert.equal(product.id,'SER-LIXIL-TW');
  assert.equal(field.key,'option');
  const cacheKey=optionContextSignature(product,result,field);
  if (optionProofCache.has(cacheKey)) return {...optionProofCache.get(cacheKey),cache_hit:true};
  const candidates=enabled(field).map((choice)=>String(choice.value));
  const adjacency=new Map(candidates.map((value)=>[value,new Set()]));
  let singletonChecks=0,pairChecks=0;
  for (let i=0;i<candidates.length;i+=1) {
    const a=candidates[i];
    const singleton=await resolveRuntimeAppProduct(product.id,{...(result.selection ?? {}),[field.key]:[a]});
    const singletonSelected=new Set((Array.isArray(singleton.selection?.[field.key])?singleton.selection[field.key]:[]).map(String));
    assert.ok(singletonSelected.has(a),`${product.id}: symbolic option singleton rejected ${a}`);
    singletonChecks+=1;
    for (let j=i+1;j<candidates.length;j+=1) {
      const b=candidates[j];
      const pair=await resolveRuntimeAppProduct(product.id,{...(result.selection ?? {}),[field.key]:[a,b]});
      const selected=new Set((Array.isArray(pair.selection?.[field.key])?pair.selection[field.key]:[]).map(String));
      if (!(selected.has(a)&&selected.has(b))) { adjacency.get(a).add(b); adjacency.get(b).add(a); }
      pairChecks+=1;
    }
  }
  let exact=exactIndependentSetCount(adjacency);
  if (field.required) exact-=1n;
  const conflicts=[];
  for (let i=0;i<candidates.length;i+=1) for (let j=i+1;j<candidates.length;j+=1) if (adjacency.get(candidates[i]).has(candidates[j])) conflicts.push([candidates[i],candidates[j]]);
  const proof={
    proof_model:'TW_SINGLE_TRIGGER_DENY_PAIRWISE_INDEPENDENT_SET',
    proof_model_version:PROOF_MODEL_VERSION,
    context_signature:cacheKey,
    candidate_count:candidates.length,
    singleton_checks:singletonChecks,
    pair_checks:pairChecks,
    conflict_edge_count:conflicts.length,
    conflict_digest:hash(conflicts),
    exact_compatible_subset_count:exact.toString(),
    rule_shape:TW_RULE_SHAPE,
    cache_hit:false,
  };
  optionProofCache.set(cacheKey,proof);
  return proof;
}

function parseAxisRange(text, axis) {
  if (!text) return null;
  const escaped=axis.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const source=String(text), ranges=[];
  const patterns=[new RegExp(`(-?\\d+(?:\\.\\d+)?)\\s*<=?\\s*${escaped}\\s*<=?\\s*(-?\\d+(?:\\.\\d+)?)`,'g'),new RegExp(`(-?\\d+(?:\\.\\d+)?)\\s*<\\s*${escaped}\\s*<=?\\s*(-?\\d+(?:\\.\\d+)?)`,'g')];
  for (const pattern of patterns) { let match; while ((match=pattern.exec(source))) ranges.push([Number(match[1]),Number(match[2])]); }
  const minOnly=new RegExp(`${escaped}\\s*>=?\\s*(-?\\d+(?:\\.\\d+)?)`,'g');
  const maxOnly=new RegExp(`${escaped}\\s*<=?\\s*(-?\\d+(?:\\.\\d+)?)`,'g');
  let match; while ((match=minOnly.exec(source))) ranges.push([Number(match[1]),null]); while ((match=maxOnly.exec(source))) ranges.push([null,Number(match[1])]);
  if (!ranges.length) return null;
  const mins=ranges.map(([min])=>min).filter(Number.isFinite), maxs=ranges.map(([,max])=>max).filter(Number.isFinite);
  return {min:mins.length?Math.min(...mins):null,max:maxs.length?Math.max(...maxs):null};
}
function boundsFromRule(rule) {
  const direct=rule?.bounds ?? rule?.geometryRule?.bounds ?? null;
  const result={
    minW:Number(direct?.minW ?? direct?.W_min ?? rule?.minW ?? rule?.W_MIN ?? rule?.['W_MIN(mm)']),
    maxW:Number(direct?.maxW ?? direct?.W_max ?? rule?.maxW ?? rule?.W_MAX ?? rule?.['W_MAX(mm)']),
    minH:Number(direct?.minH ?? direct?.H_min ?? rule?.minH ?? rule?.H_MIN ?? rule?.['H_MIN(mm)']),
    maxH:Number(direct?.maxH ?? direct?.H_max ?? rule?.maxH ?? rule?.H_MAX ?? rule?.['H_MAX(mm)']),
  };
  for (const key of Object.keys(result)) if (!Number.isFinite(result[key])) result[key]=null;
  if (Object.values(result).some(Number.isFinite)) return result;
  const texts=[rule?.geometryRule?.outer,rule?.geometryRule?.expression,...(rule?.geometryRule?.regions ?? []),rule?.specialConditions,rule?.note].filter(Boolean);
  const w=texts.map((text)=>parseAxisRange(text,'W')).filter(Boolean), h=texts.map((text)=>parseAxisRange(text,'H')).filter(Boolean);
  if (!w.length && !h.length) return null;
  const minsW=w.map((x)=>x.min).filter(Number.isFinite), maxsW=w.map((x)=>x.max).filter(Number.isFinite), minsH=h.map((x)=>x.min).filter(Number.isFinite), maxsH=h.map((x)=>x.max).filter(Number.isFinite);
  return {minW:minsW.length?Math.min(...minsW):null,maxW:maxsW.length?Math.max(...maxsW):null,minH:minsH.length?Math.min(...minsH):null,maxH:maxsH.length?Math.max(...maxsH):null};
}
function selectorExpected(rule) {
  const selector={...(rule?.selector ?? {})};
  if (rule?.['窓種ID']) selector.window_type=rule['窓種ID'];
  if (rule?.['固有仕様ID']) selector.window_spec=rule['固有仕様ID'];
  if (rule?.windowId) selector.window_type=rule.windowId;
  if (rule?.productNode) selector.window_type=rule.productNode;
  return selector;
}
function selectorActual(selection,key) {
  const aliases={seriesWindowId:['window_type'],window_type:['window_type'],productNode:['window_type'],specific_spec:['specific_spec','window_spec'],window_spec:['window_spec','specific_spec'],panelOrConfiguration:['panel_count','window_configuration'],typeOrSpec:['window_configuration','window_spec'],regionStandard:['region_standard']};
  for (const candidate of aliases[key] ?? [key]) if (present(selection?.[candidate])) return selection[candidate];
  return undefined;
}
function expectedMatches(actual,expected) {
  if (!present(expected) || expected==='*') return true;
  if (expected && typeof expected==='object' && !Array.isArray(expected)) {
    if (Array.isArray(expected.$in)) return expected.$in.some((value)=>sameScalar(actual,value));
    if (Array.isArray(expected.in)) return expected.in.some((value)=>sameScalar(actual,value));
  }
  const values=Array.isArray(expected)?expected:String(expected).split('|').map((x)=>x.trim()).filter(Boolean);
  return values.some((value)=>sameScalar(actual,value)||value==='*');
}
function ruleMatchesSelection(rule,selection) {
  for (const [key,expected] of Object.entries(selectorExpected(rule))) {
    if (['construction','internal_construction'].includes(key)) continue;
    const actual=selectorActual(selection,key);
    if (actual===undefined) continue;
    if (!expectedMatches(actual,expected)) return false;
  }
  return true;
}
function normalizeFormalRule(rule,source) {
  return {id:String(rule?.id ?? rule?.range_id ?? rule?.rule_id ?? hash(rule).slice(0,12)),type:String(rule?.evaluationType ?? rule?.judgeCode ?? rule?.type ?? rule?.['判定方式'] ?? 'FORMAL_RULE'),source,selector:stable(selectorExpected(rule)),bounds:boundsFromRule(rule),geometry:stable(rule?.geometryRule ?? null),raw:rule};
}
async function loadFormalRules(product,runtime) {
  const rules=[];
  const entry=getRuntimeMasterEntry(product.manufacturer,product.series);
  if (entry?.packageType==='FORMAL_PRODUCT_RUNTIME') {
    const pkg=await loadFormalProductRuntimePackage(entry);
    for (const row of pkg.documents?.DIMENSIONS?.custom_dimension_rules ?? []) rules.push(normalizeFormalRule(row,'FORMAL_DIMENSIONS.custom_dimension_rules'));
    for (const document of Object.values(pkg.documents ?? {})) {
      const module=document?.product_module;
      for (const set of module?.ruleSets ?? []) {
        if (set.status==='INACTIVE') continue;
        if (set.type==='DIMENSION_RULES') for (const row of Array.isArray(set.payload)?set.payload:(set.payload?.rules ?? [])) rules.push(normalizeFormalRule(row,'PRODUCT_MODULE.DIMENSION_RULES'));
        if (set.type==='CUSTOM_DIMENSION_RULE_TABLE') for (const row of set.payload ?? []) rules.push(normalizeFormalRule(row,'PRODUCT_MODULE.CUSTOM_DIMENSION_RULE_TABLE'));
      }
    }
  }
  for (const row of runtime?.master?.canonicalWorkbook?.customRanges ?? []) rules.push(normalizeFormalRule(row,'CANONICAL_WORKBOOK.customRanges'));
  for (const row of runtime?.master?.dimensionRules ?? []) rules.push(normalizeFormalRule(row,'MASTER.dimensionRules'));
  return [...new Map(rules.map((rule)=>[stableJson({id:rule.id,type:rule.type,source:rule.source,selector:rule.selector,bounds:rule.bounds}),rule])).values()];
}

function customProofAssessment(formalRules,selection) {
  const matching=formalRules.filter((rule)=>ruleMatchesSelection(rule.raw,selection));
  const completeRect=matching.filter((rule)=>rule.bounds && [rule.bounds.minW,rule.bounds.maxW,rule.bounds.minH,rule.bounds.maxH].every(Number.isFinite));
  const unsupported=matching.filter((rule)=>!completeRect.includes(rule));
  if (!matching.length) return {status:'UNVERIFIED_NO_FORMAL_RULE',matching_rule_count:0,continuous_partition_count:0,unverified_partition_count:1,rules:[]};
  // Governing v1.5 requires every discontinuity, not only outer bounds. Until all
  // dimension-sensitive downstream rules are normalized into the proof input, keep
  // this fail-closed even when a simple outer rectangle is available.
  return {
    status:'UNVERIFIED_DOWNSTREAM_DIMENSION_PARTITION',
    matching_rule_count:matching.length,
    complete_rect_rule_count:completeRect.length,
    unsupported_rule_count:unsupported.length,
    continuous_partition_count:0,
    unverified_partition_count:1,
    rules:matching.map((rule)=>({id:rule.id,type:rule.type,source:rule.source,bounds:rule.bounds,geometry_digest:hash(rule.geometry)})),
  };
}

async function inventoryWindows(product) {
  const root=await resolveRuntimeAppProduct(product.id,{});
  const field=(root.fields ?? []).find((row)=>row.key==='window_type');
  assert.ok(field,`${product.id}: window_type missing`);
  const windows=enabled(field).map((choice)=>String(choice.value));
  assert.equal(windows.length,product.expectedWindows,`${product.id}: window count ${windows.length}/${product.expectedWindows}`);
  return windows;
}

await mkdir(OUT,{recursive:true});
const inventory=[]; let globalWindowIndex=0;
for (const product of PRODUCTS) for (const windowType of await inventoryWindows(product)) inventory.push({...product,windowType,globalWindowIndex:globalWindowIndex++});
assert.equal(inventory.length,105,'BASE_WINDOW_COUNT mismatch');
const assigned=inventory.filter((row)=>row.globalWindowIndex%SHARD_TOTAL===SHARD_INDEX);

const runtimes=new Map(), formalRulesByProduct=new Map();
for (const product of PRODUCTS) {
  const runtime=await loadRegisteredRuntime(product.manufacturer,product.series);
  assert.equal(runtime?.sourcePackageIntegrity?.match,true,`${product.id}: canonical Runtime integrity mismatch`);
  runtimes.set(product.id,runtime);
  formalRulesByProduct.set(product.id,await loadFormalRules(product,runtime));
}

const windows=[]; const symbolicOptionProofs=[]; const customProofs=[]; const unresolved=[];
let explicitStateCount=0n, symbolicStateCount=0n, verifiedTransitionCount=0n, prunedTransitionCount=0n;
let symbolicOptionContextCount=0, unverifiedLogicalStateCount=0, unverifiedProofClassCount=0, unverifiedContinuousPartitionCount=0;

for (const row of assigned) {
  const root=await resolveRuntimeAppProduct(row.id,{window_type:row.windowType});
  assert.equal(String(root.selection?.window_type),row.windowType,`${row.id}/${row.windowType}: window did not survive`);
  const visited=new Set(); let traversalCount=0; let windowExplicit=0n, windowSymbolic=0n, windowVerifiedTransitions=0n, windowPruned=0n;
  let windowSymbolicContexts=0, windowUnverified=0, windowUnverifiedContinuous=0, traversalLimitHit=false;
  const formalRules=formalRulesByProduct.get(row.id) ?? [];

  async function visit(result,finalized,continuousFinalized,depth) {
    const digest=stateDigest(result,finalized,continuousFinalized);
    if (visited.has(digest)) return;
    visited.add(digest); traversalCount+=1; explicitStateCount+=1n; windowExplicit+=1n;
    if (traversalCount>MAX_TRAVERSAL_PER_WINDOW) {
      traversalLimitHit=true; windowUnverified+=1; unverifiedLogicalStateCount+=1; unverifiedProofClassCount+=1;
      unresolved.push({manufacturer:row.manufacturer,series:row.series,product_id:row.id,window_type:row.windowType,type:'EXPLICIT_TRAVERSAL_LIMIT_REACHED',visited_state_count:traversalCount,depth});
      return;
    }

    const field=nextDiscreteField(result,finalized);
    if (field) {
      const valueCount=enabled(field).length;
      if (field.dataType==='MULTI_ENUM' && valueCount>MAX_EXPLICIT_MULTI_ENUM_VALUES) {
        const remaining=userDiscreteFields(result).filter((candidate)=>candidate.key!=='window_type'&&!finalized.has(candidate.key));
        if (row.id==='SER-LIXIL-TW' && field.key==='option' && remaining.length===1) {
          const proof=await symbolicTwOptionProof(row,result,field);
          symbolicOptionProofs.push({manufacturer:row.manufacturer,series:row.series,product_id:row.id,window_type:row.windowType,parent_state_digest:digest,parent_selection:stable(result.selection ?? {}),field:field.key,required:Boolean(field.required),...proof});
          symbolicOptionContextCount+=1; windowSymbolicContexts+=1;
          const compatible=BigInt(proof.exact_compatible_subset_count);
          const addedStates=field.required ? compatible : compatible-1n;
          symbolicStateCount+=addedStates; windowSymbolic+=addedStates;
          verifiedTransitionCount+=addedStates; windowVerifiedTransitions+=addedStates;
          return;
        }
        windowUnverified+=1; unverifiedProofClassCount+=1;
        unresolved.push({manufacturer:row.manufacturer,series:row.series,product_id:row.id,window_type:row.windowType,type:'UNSUPPORTED_OVERSIZED_MULTI_ENUM',field:field.key,candidate_count:valueCount,parent_state_digest:digest});
        return;
      }
      const branches=field.dataType==='MULTI_ENUM'?explicitMultiBranches(field):scalarBranches(field);
      for (const branch of branches) {
        if (traversalLimitHit) break;
        const resolved=await resolveRuntimeAppProduct(row.id,applyBranch(result.selection,field,branch));
        if (!survives(resolved,field,branch) || invalid(resolved)) {
          prunedTransitionCount+=1n; windowPruned+=1n; verifiedTransitionCount+=1n; windowVerifiedTransitions+=1n;
          continue;
        }
        verifiedTransitionCount+=1n; windowVerifiedTransitions+=1n;
        await visit(resolved,childFinalized(finalized,field.key,resolved),continuousFinalized,depth+1);
      }
      return;
    }

    const keys=customKeys(result);
    const customPending=Boolean(keys.width&&keys.height&&(!present(result.selection?.[keys.width])||!present(result.selection?.[keys.height])));
    if (customPending && !continuousFinalized) {
      const proof=customProofAssessment(formalRules,result.selection ?? {});
      customProofs.push({manufacturer:row.manufacturer,series:row.series,product_id:row.id,window_type:row.windowType,parent_state_digest:digest,parent_selection:stable(result.selection ?? {}),width_key:keys.width,height_key:keys.height,...proof});
      unverifiedContinuousPartitionCount+=proof.unverified_partition_count; windowUnverifiedContinuous+=proof.unverified_partition_count;
      if (proof.unverified_partition_count>0) { windowUnverified+=1; unverifiedProofClassCount+=1; }
      return;
    }
  }

  await visit(root,new Set(['window_type']),false,0);
  windows.push({
    manufacturer:row.manufacturer,series:row.series,product_id:row.id,window_type:row.windowType,
    explicit_state_count:windowExplicit.toString(),symbolic_state_count:windowSymbolic.toString(),
    logical_discrete_state_count:(windowExplicit+windowSymbolic).toString(),
    verified_transition_count:windowVerifiedTransitions.toString(),pruned_transition_count:windowPruned.toString(),
    symbolic_option_context_count:windowSymbolicContexts,unverified_proof_class_count:windowUnverified,
    unverified_continuous_partition_count:windowUnverifiedContinuous,traversal_limit_hit:traversalLimitHit,
  });
  console.log(`WINDOW_DONE shard=${SHARD_INDEX}/${SHARD_TOTAL} product=${row.id} window=${row.windowType} explicit=${windowExplicit} symbolic=${windowSymbolic} unresolved=${windowUnverified} custom_unverified=${windowUnverifiedContinuous}`);
}

const discreteLogicalStateCount=explicitStateCount+symbolicStateCount;
const statePopulationPass=assigned.length===windows.length && unverifiedLogicalStateCount===0 && unverifiedProofClassCount===0 && windows.every((row)=>!row.traversal_limit_hit);
const report={
  proof_model_version:PROOF_MODEL_VERSION,
  governing_spec:'サッシ情報管理アプリ_Runtime UI統合共通仕様書_v1.5',
  proof_status:statePopulationPass?'STATE_POPULATION_PROOF_PASS':'STATE_POPULATION_PROOF_BLOCKED',
  exact_head_sha:HEAD_SHA,
  task_classification:'NON-PRODUCT-MASTER',product_master_mutation:0,
  shard_index:SHARD_INDEX,shard_total:SHARD_TOTAL,
  base_window_count:assigned.length,
  max_traversal_per_window:MAX_TRAVERSAL_PER_WINDOW,
  discrete_logical_state_count:discreteLogicalStateCount.toString(),
  explicit_state_count:explicitStateCount.toString(),symbolic_state_count:symbolicStateCount.toString(),
  materialized_case_count:explicitStateCount.toString(),
  verified_transition_count:verifiedTransitionCount.toString(),pruned_transition_count:prunedTransitionCount.toString(),
  transition_obligation_count:verifiedTransitionCount.toString(),
  symbolic_option_context_count:symbolicOptionContextCount,
  proof_class_count:symbolicOptionProofs.length+customProofs.length,
  continuous_partition_count:customProofs.reduce((sum,row)=>sum+Number(row.continuous_partition_count??0),0),
  browser_proof_class_count:0,
  unverified_logical_state_count:unverifiedLogicalStateCount,
  unverified_proof_class_count:unverifiedProofClassCount,
  unverified_continuous_partition_count:unverifiedContinuousPartitionCount,
  unverified_browser_proof_class_count:1,
  tw_rule_shape_proof:TW_RULE_SHAPE,
  windows,symbolic_option_proofs:symbolicOptionProofs,custom_proofs:customProofs,unresolved,
  gates:{
    state_population_proof_gate:statePopulationPass?'PASS':'BLOCKED',
    custom_partition_proof_gate:unverifiedContinuousPartitionCount===0?'PASS':'BLOCKED',
    transition_proof_gate:'PARTIAL',
    browser_equivalence_proof_gate:'NOT_EVALUATED',
    exhaustive_state_graph_gate:statePopulationPass?'PASS':'BLOCKED',
    qa_population_gate:'BLOCKED_UNTIL_ALL_PROOF_COMPONENTS_PASS',
    full_window_coverage_gate:'BLOCKED_UNTIL_ALL_PROOF_COMPONENTS_PASS',
    custom_size_coverage_gate:unverifiedContinuousPartitionCount===0?'PENDING_OTHER_COMPONENTS':'BLOCKED',
    full_browser_qa_gate:'NOT_STARTED',
    app_integration_ready:false,release_input_gate:'BLOCKED',
  },
  determinism_digest:hash({proof_model_version:PROOF_MODEL_VERSION,head:HEAD_SHA,windows,symbolic_option_proofs:symbolicOptionProofs.map((row)=>({context_signature:row.context_signature,exact_compatible_subset_count:row.exact_compatible_subset_count,conflict_digest:row.conflict_digest})),custom_proofs:customProofs.map((row)=>({product_id:row.product_id,window_type:row.window_type,parent_state_digest:row.parent_state_digest,status:row.status,rules:row.rules}))}),
  note:'Gate-bearing v1.5 state-population proof lane. Ordinary discrete branches are exhaustively materialized. Oversized terminal TW option frontiers use an exact independent-set count only after mechanically checking the single-trigger rule shape in the exact-head Runtime engine source. CUSTOM continuous domains remain fail-closed until all dimension-sensitive downstream discontinuities are normalized into exact partitions. Browser equivalence and full transition equivalence are separate v1.5 proof components and remain blocked/pending here.',
};
await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2)+'\n','utf8');
console.log(`PROOF_MODEL_VERSION=${PROOF_MODEL_VERSION}`);
console.log(`BASE_WINDOW_COUNT=${report.base_window_count}`);
console.log(`DISCRETE_LOGICAL_STATE_COUNT=${report.discrete_logical_state_count}`);
console.log(`SYMBOLIC_OPTION_CONTEXT_COUNT=${report.symbolic_option_context_count}`);
console.log(`UNVERIFIED_LOGICAL_STATE_COUNT=${report.unverified_logical_state_count}`);
console.log(`UNVERIFIED_PROOF_CLASS_COUNT=${report.unverified_proof_class_count}`);
console.log(`UNVERIFIED_CONTINUOUS_PARTITION_COUNT=${report.unverified_continuous_partition_count}`);
console.log(`STATE_POPULATION_PROOF_GATE=${report.gates.state_population_proof_gate}`);
console.log('APP_INTEGRATION_READY=false');
console.log('RELEASE_INPUT_GATE=BLOCKED');
