import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

const OUT = process.env.STAGE_A_TW_PROJECTION_OUT ?? 'artifacts/stage-a-tw-behavioral-projection-count-pilot';
const HEAD_SHA = process.env.HEAD_SHA ?? null;
const TARGET = process.env.STAGE_A_TARGET_WINDOW ?? 'SWT-LIX-TW-TATE-GREMON-TF';
const PRODUCT_ID = 'SER-LIXIL-TW';
const MAX_STATES = Number(process.env.STAGE_A_MAX_MEMO_STATES_PER_WINDOW ?? 12000);
const MAX_CALLS = Number(process.env.STAGE_A_MAX_RESOLVER_CALLS_PER_WINDOW ?? 120000);
const MAX_EXPLICIT_NONTERMINAL_MULTI = Number(process.env.STAGE_A_MAX_EXPLICIT_MULTI_ENUM_VALUES ?? 12);

const TECHNICAL = new Set(['construction','legacyConstruction','legacyConfiguration','internal_construction','color_relation_id']);
const CONTINUOUS = new Set(['custom_width','custom_w','order_width','custom_height','custom_h','order_height']);
const present = (value) => value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length > 0);
const enabledChoices = (field) => (field?.values ?? []).filter((choice) => choice.disabled !== true);
const stable = (value) => Array.isArray(value)
  ? value.map(stable)
  : (!value || typeof value !== 'object'
    ? value
    : Object.fromEntries(Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => [k, stable(v)])));
const stableJson = (value) => JSON.stringify(stable(value));
const hash = (value) => createHash('sha256').update(typeof value === 'string' ? value : stableJson(value)).digest('hex');
const unique = (values) => [...new Set(values.filter((value) => value !== undefined && value !== null && value !== ''))];
const normalizeMulti = (values) => [...new Map(values.map((value) => [String(value), value])).values()].sort((a,b) => String(a).localeCompare(String(b)));
const invalid = (result) => ['INVALID','BLOCKED','BLOCK'].includes(String(result.validation?.status ?? result.status ?? ''));
const visibleKeys = (result) => new Set((result.fields ?? []).map((field) => field.key));
const userFields = (result) => (result.fields ?? []).filter((field) => !TECHNICAL.has(field.key) && !CONTINUOUS.has(field.key) && enabledChoices(field).length > 0 && !field.readOnly);
const nextField = (result, done) => userFields(result).find((field) => field.key !== 'window_type' && !done.has(field.key)) ?? null;
const childDone = (done, key, result) => { const visible = visibleKeys(result); return new Set([...done, key].filter((field) => visible.has(field))); };
const customPending = (result) => {
  const width = (result.fields ?? []).find((field) => ['custom_width','custom_w','order_width'].includes(field.key))?.key;
  const height = (result.fields ?? []).find((field) => ['custom_height','custom_h','order_height'].includes(field.key))?.key;
  return Boolean(width && height && (!present(result.selection?.[width]) || !present(result.selection?.[height])));
};
const fieldSig = (field) => field ? {
  visibility: 'SHOW', key: field.key, dataType: field.dataType, required: Boolean(field.required), readOnly: Boolean(field.readOnly),
  selectionMode: field.selectionMode ?? null, values: enabledChoices(field).map((choice) => choice.value),
} : { visibility: 'HIDDEN' };

const TW_CONTRACT = new Map(Object.entries({
  shutter_type:['window_type','size'], grille_type:['window_type','size'], operation_type:['window_type','size'], door_grille_type:['window_type','size'],
  handing:['window_type','panel_count'], operator_position:['window_type','panel_count'], size_mode:['window_type'], panel_count:['window_type'], size:['window_type','panel_count','size_mode'],
  exterior_color:['size'], interior_color:['size','exterior_color'], screen_presence:['window_type','size','exterior_color','interior_color'], screen_type:['window_type','screen_presence'],
  screen_midrail:['window_type','size','screen_presence'], screen_net:['window_type','screen_presence'], glass_base:['window_type','size'], glass_type:['glass_base'],
  glass_detail:['glass_base','glass_type'], glass_function:['glass_base','glass_type'], glass_spacer:['glass_base','glass_type','glass_detail'], glass_air_layer:['glass_base','glass_type','glass_detail','glass_spacer'],
  option:['window_type','size','panel_count','glass_base','shutter_type','operation_type'],
}).map(([key, value]) => [key, [...value].sort()]));

function ancestors(map, key, cache = new Map(), stack = new Set()) {
  if (cache.has(key)) return cache.get(key);
  if (stack.has(key)) return new Set();
  stack.add(key);
  const out = new Set();
  for (const parent of map.get(key) ?? []) {
    out.add(parent);
    for (const ancestor of ancestors(map, parent, cache, stack)) out.add(ancestor);
  }
  stack.delete(key);
  cache.set(key, out);
  return out;
}

function futureSignature(result, done) {
  const keys = new Set([...TW_CONTRACT.keys(), ...userFields(result).map((field) => field.key)]);
  const byKey = new Map((result.fields ?? []).map((field) => [field.key, field]));
  const rows = [];
  for (const key of [...keys].filter((key) => key !== 'window_type' && !TECHNICAL.has(key) && !CONTINUOUS.has(key) && !done.has(key)).sort()) {
    rows.push([key, fieldSig(byKey.get(key) ?? null)]);
  }
  return {
    rows,
    validation: result.validation?.status ?? result.status ?? null,
    dimension: result.dimensionResult?.status ?? result.dimension_result?.status ?? null,
    custom_pending: customPending(result),
  };
}

function memoKey(result, done) {
  const future = [...TW_CONTRACT.keys()].filter((key) => key !== 'window_type' && !TECHNICAL.has(key) && !CONTINUOUS.has(key) && !done.has(key));
  const cache = new Map();
  const live = new Set();
  for (const key of future) {
    live.add(key);
    for (const ancestor of ancestors(TW_CONTRACT, key, cache)) live.add(ancestor);
  }
  const liveSelection = {};
  for (const key of [...live].sort()) if (Object.prototype.hasOwnProperty.call(result.selection ?? {}, key)) liveSelection[key] = result.selection[key];
  return hash({ done:[...done].sort(), liveSelection, observable:futureSignature(result, done) });
}

function panelCount(row) {
  if (String(row?.configuration ?? '').includes('4枚建') || /-4(?:$|\D)/.test(String(row?.nominal_w ?? ''))) return '4枚建';
  return '2枚建';
}
function categoryColumn(category) { return category === 'トリプルガラス' ? 'トリプル適用' : category === 'Low-E複層ガラス' ? 'ペア適用' : null; }
function dimensionCondition(condition, dimensions) {
  const text = String(condition ?? '').normalize('NFKC').replaceAll('≦','<=').replaceAll('≧','>=').replaceAll('≤','<=').replaceAll('≥','>=').replace(/\s+/g,'');
  let saw = false;
  const comparisons = [];
  for (const match of text.matchAll(/(W|H)(<=|>=|<|>)(\d+(?:\.\d+)?)/gi)) comparisons.push([match[1], match[2], match[3]]);
  for (const match of text.matchAll(/(\d+(?:\.\d+)?)(<=|>=|<|>)(W|H)/gi)) {
    const inverted = ({ '<':'>', '>':'<', '<=':'>=', '>=':'<=' })[match[2]];
    comparisons.push([match[3], inverted, match[1]]);
  }
  for (const [axis, operator, rawRight] of comparisons) {
    saw = true;
    const left = dimensions[axis.toUpperCase()], right = Number(rawRight);
    if (!Number.isFinite(left)) return null;
    if (!({ '<':left<right, '>':left>right, '<=':left<=right, '>=':left>=right })[operator]) return false;
  }
  return saw ? true : null;
}

const runtime = await loadRegisteredRuntime('LIXIL','TW');
if (!runtime?.master) throw new Error('TW runtime master unavailable');
const master = runtime.master;
const windowRow = (master.provider?.windows ?? []).find((row) => row.id === TARGET && row.active !== false);
if (!windowRow) throw new Error(`TW target window not found: ${TARGET}`);
const sizeById = new Map((master.provider?.sizes ?? []).map((row) => [String(row.id), row]));

function filterSpecsByFormalRules(sizeRow) {
  const specType = windowRow?.spec_type;
  if (!specType) return [];
  const specs = (master.sourceRows?.specs ?? []).filter((row) => row['窓種ID'] === windowRow.common_window_id && row['固有仕様種別'] === specType);
  const rules = (master.sourceRows?.specDimensionRules ?? []).filter((row) => row['シリーズ窓種ID'] === TARGET);
  const denied = new Set(rules.filter((row) => row['ルール種別'] === 'WINDOW_TYPE_DENY').map((row) => row['固有仕様ID']));
  let result = specs.filter((row) => !denied.has(row.spec_id));
  const allowOnly = rules.filter((row) => row['ルール種別'] === 'SIZE_ALLOW_ONLY' && row['size_id/条件'] === sizeRow.id);
  if (allowOnly.length) return result.filter((row) => allowOnly.some((rule) => rule['固有仕様ID'] === row.spec_id)).map((row) => row.spec_id).sort();
  const dimensionRules = rules.filter((row) => row['ルール種別'] === 'DIMENSION_ALLOW');
  if (!dimensionRules.length) return result.map((row) => row.spec_id).sort();
  const W = Number(sizeRow.actual_w), H = Number(sizeRow.actual_h);
  return result.filter((row) => {
    const rule = dimensionRules.find((candidate) => candidate['固有仕様ID'] === row.spec_id);
    if (!rule) return false;
    return (!rule['最小W'] || W >= Number(rule['最小W'])) && (!rule['最大W'] || W <= Number(rule['最大W'])) &&
      (!rule['最小H'] || H >= Number(rule['最小H'])) && (!rule['最大H'] || H <= Number(rule['最大H'])) &&
      (!rule['H/W上限'] || H / W <= Number(rule['H/W上限']));
  }).map((row) => row.spec_id).sort();
}

const relevantOptionRules = (master.sourceRows?.optionDependencies ?? []).filter((row) =>
  row?.active !== false && row['アクション'] === '選択不可' && String(row['対象シリーズ窓種ID'] ?? '').split('|').includes(TARGET));
const wConditions = unique(relevantOptionRules.filter((row) => row['条件項目'] === '実寸W(mm)').map((row) => String(row['条件値'] ?? ''))).sort();
const outputDimensionConditions = unique((master.optionCodeLinkages ?? []).filter((row) => String(row.series_window_scope ?? '').split('|').includes(TARGET)).map((row) => String(row.condition ?? '')).filter(Boolean)).sort();

function sizeBehavior(value) {
  const row = sizeById.get(String(value));
  if (!row) return { missing_size_row: String(value) };
  const W = Number(row.actual_w), H = Number(row.actual_h), configuration = String(row.configuration ?? '');
  return {
    panel_count: panelCount(row),
    spec_allowed_ids: filterSpecsByFormalRules(row),
    screen_midrail_class: configuration.startsWith('マド') ? 'MADO_FORCE_NO_MIDRAIL' : 'GENERAL',
    option_terrace_class: configuration.includes('テラス') ? 'TERRACE' : 'NON_TERRACE',
    derived_option_height_class: configuration.includes('大壁和室') ? 'OOYA_WASHITSU' : configuration.includes('マド') ? (H < 571 ? 'MADO_H_LT_571' : 'MADO_H_GE_571') : configuration.includes('テラス') ? 'TERRACE' : 'OTHER',
    option_w_predicates: Object.fromEntries(wConditions.map((condition) => [condition, dimensionCondition(`W${condition}`, { W, H })])),
    output_dimension_predicates: Object.fromEntries(outputDimensionConditions.map((condition) => [condition, dimensionCondition(condition, { W, H })])),
  };
}
function glassTypeBehavior(value, result) {
  const base = result.selection?.glass_base;
  const column = categoryColumn(base);
  const functions = (master.sourceRows?.glassFunctions ?? []).filter((row) => row[column] === '可' || row[column] === '要照合')
    .filter((row) => String(value) !== 'GLA-TW-MILKY' || row.option_id === 'GLF-TW-SAFE-LAM').map((row) => row.option_id).sort();
  return { glass_base:base ?? null, glass_function_allowed_ids:functions };
}
function glassDetailBehavior(value, result) {
  const base = result.selection?.glass_base;
  const rows = (master.provider?.glass ?? []).filter((row) => row.active !== false && row.category === base && row.low_e === value);
  const spacers = unique(rows.map((row) => row.spacer)).sort();
  return { glass_base:base ?? null, spacer_to_gas:Object.fromEntries(spacers.map((spacer) => [spacer, unique(rows.filter((row) => row.spacer === spacer).map((row) => row.gas)).sort()])) };
}
function behaviorFor(field, value, result) {
  if (field.key === 'size') return sizeBehavior(value);
  if (field.key === 'glass_type') return glassTypeBehavior(value, result);
  if (field.key === 'glass_detail') return glassDetailBehavior(value, result);
  return null;
}

function groupProjectedScalar(field, result) {
  const choices = enabledChoices(field).map((choice) => choice.value);
  if (!['size','glass_type','glass_detail'].includes(field.key)) {
    const rows = choices.map((value) => ({ kind:'VALUE', value, members:[value], multiplicity:1n, projection_type:null, behavior:null }));
    if (!field.required) rows.unshift({ kind:'UNSET', members:[], multiplicity:1n, projection_type:null, behavior:null });
    return rows;
  }
  const grouped = new Map();
  for (const value of choices) {
    const behavior = behaviorFor(field, value, result);
    const key = stableJson(behavior);
    if (!grouped.has(key)) grouped.set(key, { kind:'VALUE', value, members:[], behavior, projection_type:`${field.key.toUpperCase()}_BEHAVIOR_V1` });
    grouped.get(key).members.push(value);
  }
  const rows = [...grouped.values()].map((row) => ({ ...row, multiplicity:BigInt(row.members.length) }));
  if (!field.required) rows.unshift({ kind:'UNSET', members:[], multiplicity:1n, projection_type:null, behavior:null });
  return rows;
}
function* explicitMultiBranches(field) {
  const values = enabledChoices(field).map((choice) => choice.value);
  for (let mask=0; mask<2**values.length; mask++) {
    const subset=[];
    for (let index=0; index<values.length; index++) if (mask & (1<<index)) subset.push(values[index]);
    if (!subset.length) { if (!field.required) yield { kind:'UNSET', multiplicity:1n }; continue; }
    yield { kind:'VALUE', value:normalizeMulti(subset), multiplicity:1n };
  }
}
function apply(selection, field, branchValue, unset=false) {
  const next = { ...(selection ?? {}) };
  if (unset) delete next[field.key];
  else next[field.key] = field.dataType === 'MULTI_ENUM' ? normalizeMulti(branchValue) : branchValue;
  return next;
}
function survives(result, field, value, unset=false) {
  if (unset) return !present(result.selection?.[field.key]);
  const actual = result.selection?.[field.key];
  return Array.isArray(value)
    ? Array.isArray(actual) && stableJson(actual.map(String).sort()) === stableJson(value.map(String).sort())
    : String(actual) === String(value);
}

let resolverCalls = 0;
async function resolve(selection) {
  if (resolverCalls >= MAX_CALLS) throw Object.assign(new Error('resolver call limit'), { code:'RESOLVER_CALL_LIMIT' });
  resolverCalls++;
  return resolveRuntimeAppProduct(PRODUCT_ID, selection);
}

let projectionGroupAudits = 0, projectionMemberChecks = 0, projectionMismatchCount = 0;
const projectionAuditEvidence = new Map();
async function resolveBranchGroup(result, done, field, group) {
  if (group.kind === 'UNSET') {
    const child = await resolve(apply(result.selection, field, null, true));
    return { child, multiplicity:1n, survives:survives(child, field, null, true), projection:null };
  }
  if (!group.projection_type) {
    const child = await resolve(apply(result.selection, field, group.value, false));
    return { child, multiplicity:1n, survives:survives(child, field, group.value, false), projection:null };
  }
  projectionGroupAudits++;
  let representative = null, reference = null;
  const memberEvidence = [];
  for (const member of group.members) {
    const child = await resolve(apply(result.selection, field, member, false));
    projectionMemberChecks++;
    const didSurvive = survives(child, field, member, false);
    const nextDone = childDone(done, field.key, child);
    const signature = {
      survives: didSurvive,
      invalid: invalid(child),
      future: futureSignature(child, nextDone),
      behavior: group.behavior,
    };
    memberEvidence.push({ member:String(member), signature_digest:hash(signature) });
    if (!reference) { reference = signature; representative = child; }
    else if (stableJson(reference) !== stableJson(signature)) {
      projectionMismatchCount++;
      throw Object.assign(new Error(`projection audit mismatch for ${field.key}`), {
        code:'PROJECTION_AUDIT_MISMATCH', field:field.key, projection_type:group.projection_type,
        behavior:group.behavior, members:group.members.map(String), reference, mismatch:signature,
      });
    }
  }
  const evidenceKey = hash({ field:field.key, projection_type:group.projection_type, behavior:group.behavior, members:group.members.map(String).sort() });
  if (!projectionAuditEvidence.has(evidenceKey)) projectionAuditEvidence.set(evidenceKey, {
    field:field.key, projection_type:group.projection_type, behavior:group.behavior,
    member_count:group.members.length, member_ids:group.members.map(String).sort(), member_evidence:memberEvidence,
  });
  return { child:representative, multiplicity:group.multiplicity, survives:reference?.survives === true, projection:group.projection_type };
}

function bitCount(mask) { let count=0; for (let value=mask; value; value>>=1n) count += Number(value & 1n); return count; }
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
function independentSetCount(component, adjacency) {
  const index=new Map(component.map((value,i)=>[value,i]));
  const neighbors=component.map((value)=>{ let mask=0n; for (const next of adjacency.get(value) ?? []) { const i=index.get(next); if (i !== undefined) mask |= 1n << BigInt(i); } return mask; });
  const memo=new Map();
  const solve=(mask)=>{
    if (mask===0n) return 1n;
    const key=mask.toString(); if (memo.has(key)) return memo.get(key);
    let hasEdge=false;
    for (let i=0;i<component.length;i++) { const bit=1n<<BigInt(i); if ((mask&bit) && (neighbors[i]&mask)) { hasEdge=true; break; } }
    if (!hasEdge) { const result=1n<<BigInt(bitCount(mask)); memo.set(key,result); return result; }
    let chosen=-1,best=-1;
    for (let i=0;i<component.length;i++) { const bit=1n<<BigInt(i); if (!(mask&bit)) continue; const degree=bitCount(neighbors[i]&mask); if (degree>best) { best=degree; chosen=i; } }
    const bit=1n<<BigInt(chosen), without=mask&~bit;
    const result=solve(without)+solve(without&~neighbors[chosen]); memo.set(key,result); return result;
  };
  return solve((1n<<BigInt(component.length))-1n);
}
const exactIndependentSetCount = (adjacency) => connectedComponents(adjacency).reduce((product, component) => product * independentSetCount(component, adjacency), 1n);

const terminalProofCache = new Map();
let terminalCacheHits=0, terminalCacheMisses=0, terminalTransitionChecks=0;
function terminalContextKey(result, field) {
  const deps=[...ancestors(TW_CONTRACT, field.key)].sort();
  const context={};
  for (const key of deps) if (Object.prototype.hasOwnProperty.call(result.selection ?? {}, key)) context[key]=result.selection[key];
  return hash({ field:field.key, context, signature:fieldSig(field) });
}
function targetSelectionDenialRules() {
  return (master.sourceRows?.optionDependencies ?? []).filter((row) => row?.active !== false && row['アクション'] === '選択不可' && String(row['対象シリーズ窓種ID'] ?? '').split('|').includes(TARGET));
}
function auditPairwiseRuleShape() {
  const rows=targetSelectionDenialRules();
  const allowedKeys=new Set(['窓種適用','建て方/区分','障子枚数','実寸W(mm)','ガラス大分類','電動仕様','選択状態']);
  const unsupported=[];
  for (const row of rows) {
    const trigger=row['トリガーoption_id'];
    if (Array.isArray(trigger) || (trigger && typeof trigger === 'object')) unsupported.push({ reason:'NON_SCALAR_TRIGGER', trigger });
    const key=String(row['条件項目'] ?? '');
    if (key && !allowedKeys.has(key)) unsupported.push({ reason:'CONDITION_KEY', key });
  }
  return { row_count:rows.length, unsupported_count:unsupported.length, unsupported, digest:hash(rows) };
}
async function exactTerminalOption(result, field) {
  const key=terminalContextKey(result, field);
  if (terminalProofCache.has(key)) { terminalCacheHits++; return terminalProofCache.get(key); }
  terminalCacheMisses++;
  const audit=auditPairwiseRuleShape();
  if (audit.unsupported_count) throw Object.assign(new Error('TW option rules are not pairwise-safe'), { code:'TW_HIGHER_ORDER_OPTION_RULE', audit });
  const candidates=enabledChoices(field).map((choice)=>String(choice.value));
  if (audit.row_count === 0) {
    let count=1n<<BigInt(candidates.length); if (field.required) count-=1n;
    const proof={ count, proof_type:'NO_ACTIVE_SELECTION_DENIAL_RULES_EXACT_POWERSET', context_key:key, candidate_count:candidates.length, conflict_edge_count:0, shape_audit:audit };
    terminalProofCache.set(key,proof); return proof;
  }
  const adjacency=new Map(candidates.map((value)=>[value,new Set()]));
  let singletonChecks=0,pairChecks=0;
  for (let i=0;i<candidates.length;i++) {
    const a=candidates[i];
    const one=await resolve({ ...(result.selection ?? {}), [field.key]:[a] }); terminalTransitionChecks++;
    const selectedOne=new Set((Array.isArray(one.selection?.[field.key]) ? one.selection[field.key] : []).map(String));
    if (!selectedOne.has(a)) throw Object.assign(new Error(`TW singleton rejected ${a}`), { code:'TW_SINGLETON_REJECTED' });
    singletonChecks++;
    for (let j=i+1;j<candidates.length;j++) {
      const b=candidates[j];
      const two=await resolve({ ...(result.selection ?? {}), [field.key]:[a,b] }); terminalTransitionChecks++;
      const selected=new Set((Array.isArray(two.selection?.[field.key]) ? two.selection[field.key] : []).map(String));
      if (!(selected.has(a)&&selected.has(b))) { adjacency.get(a).add(b); adjacency.get(b).add(a); }
      pairChecks++;
    }
  }
  let count=exactIndependentSetCount(adjacency); if (field.required) count-=1n;
  const edges=[]; for (const [a,neighbors] of adjacency) for (const b of neighbors) if (a<b) edges.push([a,b]);
  const proof={ count, proof_type:'PAIRWISE_RULE_SHAPE_AUDIT_PLUS_EXACT_INDEPENDENT_SET', context_key:key, candidate_count:candidates.length, singleton_checks:singletonChecks, pair_checks:pairChecks, conflict_edge_count:edges.length, conflict_digest:hash(edges.sort()), shape_audit:audit };
  terminalProofCache.set(key,proof); return proof;
}

let states=0, memoHits=0, maxDepth=0, blocker=null;
const stateByNextField=new Map();
const memo=new Map(), inProgress=new Set();
resolverCalls=0;
const root=await resolve({ window_type:TARGET });

async function count(result, done, depth=0) {
  if (blocker) return null;
  maxDepth=Math.max(maxDepth,depth);
  const key=memoKey(result,done), signature=futureSignature(result,done), cached=memo.get(key);
  if (cached) {
    if (stableJson(cached.signature)!==stableJson(signature)) { blocker={ status:'CONTRACT_INCONSISTENT', memo_key:key, previous_signature:cached.signature, current_signature:signature }; return null; }
    memoHits++; return cached.counts;
  }
  if (inProgress.has(key)) { blocker={ status:'MEMO_CYCLE_DETECTED', memo_key:key }; return null; }
  if (states>=MAX_STATES) { blocker={ status:'MEMO_STATE_LIMIT_REACHED', states, calls:resolverCalls, next_field:nextField(result,done)?.key ?? null }; return null; }
  inProgress.add(key); states++;
  const field=nextField(result,done);
  const nextKey=field?.key ?? '__TERMINAL__'; stateByNextField.set(nextKey,(stateByNextField.get(nextKey)??0)+1);
  if (!field) {
    const counts={ terminal:1n, custom:customPending(result)?1n:0n };
    memo.set(key,{ counts, signature }); inProgress.delete(key); return counts;
  }
  const remaining=userFields(result).filter((candidate)=>candidate.key!=='window_type'&&!done.has(candidate.key));
  if (field.dataType==='MULTI_ENUM' && remaining.length===1) {
    try {
      const proof=await exactTerminalOption(result,field);
      const counts={ terminal:proof.count, custom:customPending(result)?proof.count:0n };
      memo.set(key,{ counts, signature, terminal_multi_proof:proof }); inProgress.delete(key); return counts;
    } catch (error) {
      blocker={ status:error.code ?? 'TERMINAL_MULTI_PROOF_FAILED', field:field.key, message:error.message, states, calls:resolverCalls };
      inProgress.delete(key); return null;
    }
  }
  let groups;
  if (field.dataType==='MULTI_ENUM') {
    if (enabledChoices(field).length>MAX_EXPLICIT_NONTERMINAL_MULTI) { blocker={ status:'NONTERMINAL_MULTI_REQUIRES_SYMBOLIC_PROOF', field:field.key, candidate_count:enabledChoices(field).length, states, calls:resolverCalls }; inProgress.delete(key); return null; }
    groups=[...explicitMultiBranches(field)];
  } else groups=groupProjectedScalar(field,result);
  let terminal=0n, custom=0n;
  for (const group of groups) {
    let resolved;
    try {
      if (field.dataType==='MULTI_ENUM') {
        const unset=group.kind==='UNSET';
        const child=await resolve(apply(result.selection,field,group.value,unset));
        resolved={ child, multiplicity:group.multiplicity, survives:survives(child,field,group.value,unset) };
      } else resolved=await resolveBranchGroup(result,done,field,group);
    } catch (error) {
      blocker={ status:error.code ?? 'PROJECTION_OR_RESOLVER_FAILED', field:field.key, message:error.message, detail:error.code==='PROJECTION_AUDIT_MISMATCH'?{ projection_type:error.projection_type, behavior:error.behavior, members:error.members }:null, states, calls:resolverCalls };
      inProgress.delete(key); return null;
    }
    if (!resolved.survives || invalid(resolved.child)) continue;
    const childCounts=await count(resolved.child,childDone(done,field.key,resolved.child),depth+1);
    if (!childCounts) { inProgress.delete(key); return null; }
    terminal += childCounts.terminal * resolved.multiplicity;
    custom += childCounts.custom * resolved.multiplicity;
  }
  const counts={ terminal, custom };
  memo.set(key,{ counts, signature }); inProgress.delete(key); return counts;
}

const counts=await count(root,new Set(['window_type']));
const proofByContext=[...terminalProofCache.values()];
const report={
  exact_head_sha:HEAD_SHA,
  task_classification:'NON-PRODUCT-MASTER', product_master_mutation:0, pilot_only:true,
  proof_model_version:'RUNTIME_UI_SYMBOLIC_FULL_COVERAGE_V1', projection_model_version:'TW_WEIGHTED_BEHAVIORAL_PROJECTION_V1',
  runtime_manifest_sha256:runtime.entry?.runtimeManifestSha256 ?? null,
  product_id:PRODUCT_ID, window_type:TARGET,
  status:blocker?'BLOCKED':'COUNTED_CANDIDATE',
  exact_discrete_terminal_context_count:counts?.terminal?.toString() ?? null,
  custom_pending_context_count:counts?.custom?.toString() ?? null,
  memo_state_count:states, memo_hit_count:memoHits, resolver_call_count:resolverCalls, max_depth:maxDepth,
  state_by_next_field:Object.fromEntries([...stateByNextField.entries()].sort(([a],[b])=>a.localeCompare(b))),
  projection_group_audit_count:projectionGroupAudits, projection_member_check_count:projectionMemberChecks, projection_mismatch_count:projectionMismatchCount,
  projection_audit_classes:[...projectionAuditEvidence.values()], projection_audit_digest:hash([...projectionAuditEvidence.values()]),
  terminal_multi_proof_context_count:terminalProofCache.size, terminal_multi_cache_hits:terminalCacheHits, terminal_multi_cache_misses:terminalCacheMisses,
  terminal_transition_checks:terminalTransitionChecks,
  terminal_multi_proofs:proofByContext.map((proof)=>Object.fromEntries(Object.entries(proof).map(([key,value])=>[key,typeof value==='bigint'?value.toString():value]))),
  blocker,
  gate_status:{ qa_population_gate:'BLOCKED_PILOT_ONLY', custom_size_coverage_gate:'BLOCKED_CONTINUOUS_PARTITION_NOT_PROVEN', app_integration_ready:false, release_input_gate:'BLOCKED' },
  note:'Pilot only. Exact logical multiplicity is preserved when Runtime values are grouped into behavior classes. Every member of every projected group is resolved and compared for survival, validity, and the full immediate future selector signature. Projection behavior keys are derived from the TW canonical Runtime rule semantics; mismatch fails closed. No Product Master mutation.',
};
await mkdir(OUT,{recursive:true});
await writeFile(`${OUT}/report.json`,`${JSON.stringify(report,null,2)}\n`,'utf8');
console.log(`TW_BEHAVIORAL_PROJECTION_STATUS=${report.status}`);
console.log(`WINDOW=${TARGET}`);
console.log(`EXACT_DISCRETE_TERMINAL_CONTEXT_COUNT=${report.exact_discrete_terminal_context_count ?? 'BLOCKED'}`);
console.log(`CUSTOM_PENDING_CONTEXT_COUNT=${report.custom_pending_context_count ?? 'BLOCKED'}`);
console.log(`MEMO_STATE_COUNT=${states}`);
console.log(`MEMO_HIT_COUNT=${memoHits}`);
console.log(`RESOLVER_CALL_COUNT=${resolverCalls}`);
console.log(`PROJECTION_GROUP_AUDIT_COUNT=${projectionGroupAudits}`);
console.log(`PROJECTION_MEMBER_CHECK_COUNT=${projectionMemberChecks}`);
console.log(`PROJECTION_MISMATCH_COUNT=${projectionMismatchCount}`);
console.log(`TERMINAL_MULTI_PROOF_CONTEXT_COUNT=${terminalProofCache.size}`);
console.log(`BLOCKER=${blocker?JSON.stringify(blocker):'NONE'}`);
console.log('APP_INTEGRATION_READY=false');
console.log('RELEASE_INPUT_GATE=BLOCKED');
