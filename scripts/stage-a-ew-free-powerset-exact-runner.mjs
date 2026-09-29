import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const BASE = new URL('./stage-a-terminal-multi-enum-proof-pilot.mjs', import.meta.url);
const GENERATED = new URL('./.stage-a-ew-free-powerset-generated.mjs', import.meta.url);
const baseSource = await readFile(BASE, 'utf8');
const baseSha256 = createHash('sha256').update(baseSource).digest('hex');

const marker = "async function exactTerminalMulti(product,result,field,depMap){const key=terminalContextKey(product,result,field,depMap);if(terminalProofCache.has(key)){terminalCacheHits++;return terminalProofCache.get(key);}terminalCacheMisses++;const proof=product.series==='TW'?await exactTerminalTw(product,result,field,key):await exactTerminalBfs(product,result,field,key);terminalProofCache.set(key,proof);return proof;}";
if (!baseSource.includes(marker)) throw new Error('base terminal MULTI implementation drifted');

const replacement = String.raw`
async function exactTerminalEwFreePowerset(product,result,field,contextKey){
  if(field.key!=='option') return exactTerminalBfs(product,result,field,contextKey);
  const runtime=await loadRegisteredRuntime('LIXIL','EW');
  if(runtime?.sourcePackageIntegrity?.match!==true)throw Object.assign(new Error('EW canonical package integrity mismatch'),{code:'EW_RUNTIME_INTEGRITY_MISMATCH'});
  const model=runtime?.master?.canonicalWorkbook;
  if(!model)throw Object.assign(new Error('EW canonical source model missing'),{code:'EW_CANONICAL_SOURCE_MODEL_MISSING'});
  const windowId=String(result.selection?.window_type??TARGET);
  const specId=result.selection?.window_spec;
  const hasValue=(value)=>value!==undefined&&value!==null&&value!=='';
  const optionRows=(model.options??[]).filter((row)=>
    (String(row.window_id??'')==='*'||String(row.window_id??'')===windowId)&&
    (!hasValue(row['固有仕様ID']??row.spec_id)||(row['固有仕様ID']??row.spec_id)==='*'||String(row['固有仕様ID']??row.spec_id)===String(specId))
  );
  if(!optionRows.length)throw Object.assign(new Error('EW source option rows missing for terminal context'),{code:'EW_OPTION_SOURCE_ROWS_MISSING'});
  const sourceIds=optionRows.map((row)=>String(row.id??''));
  if(sourceIds.some((id)=>!id)||new Set(sourceIds).size!==sourceIds.length)throw Object.assign(new Error('EW source option ids missing or duplicated'),{code:'EW_OPTION_SOURCE_ID_INVALID'});
  const applicabilityRows=(model.optionApplicability??[]).filter((row)=>String(row.window_id??'')===windowId);
  const applicabilityByOption=new Map();
  for(const row of applicabilityRows){
    const id=String(row.option_id??'');
    if(!id)throw Object.assign(new Error('EW applicability option id missing'),{code:'EW_OPTION_APPLICABILITY_ID_MISSING'});
    if(applicabilityByOption.has(id))throw Object.assign(new Error('EW duplicate applicability rows'),{code:'EW_OPTION_APPLICABILITY_DUPLICATE'});
    applicabilityByOption.set(id,row);
  }
  const expected=[];
  const relevantApplicability=[];
  for(const row of optionRows){
    const id=String(row.id);
    const rel=applicabilityByOption.get(id);
    const mode=rel?.applicability===undefined||rel?.applicability===null?'':String(rel.applicability);
    if(mode==='NON_APPLICABLE'){relevantApplicability.push({option_id:id,applicability:mode});continue;}
    if(mode==='CONDITIONAL_APPLICABLE')throw Object.assign(new Error('EW conditional option dependency present'),{code:'EW_OPTION_DEPENDENCY_PRESENT'});
    if(mode&&mode!=='APPLICABLE')throw Object.assign(new Error('EW unknown option applicability mode'),{code:'EW_OPTION_APPLICABILITY_UNKNOWN'});
    expected.push(id);
    relevantApplicability.push({option_id:id,applicability:mode||'IMPLICIT_APPLICABLE'});
  }
  expected.sort();
  const actual=enabled(field).map((c)=>String(c.value)).sort();
  if(stableJson(actual)!==stableJson(expected))throw Object.assign(new Error('EW source/UI terminal option candidate mismatch'),{code:'EW_OPTION_CANDIDATE_MISMATCH'});
  const allSelection={...(result.selection??{}),[field.key]:expected};
  const allResolved=await resolve(product,allSelection);terminalTransitionChecks++;
  const allActual=normalizeMulti(Array.isArray(allResolved.selection?.[field.key])?allResolved.selection[field.key]:[]).map(String).sort();
  if(invalid(allResolved)||stableJson(allActual)!==stableJson(expected))throw Object.assign(new Error('EW all-options witness rejected'),{code:'EW_ALL_OPTIONS_WITNESS_REJECTED'});
  const emptySelection={...(result.selection??{})};delete emptySelection[field.key];
  const emptyResolved=await resolve(product,emptySelection);terminalTransitionChecks++;
  if(invalid(emptyResolved)||present(emptyResolved.selection?.[field.key]))throw Object.assign(new Error('EW empty-option witness rejected'),{code:'EW_EMPTY_OPTION_WITNESS_REJECTED'});
  let count=1n<<BigInt(expected.length);
  if(field.required)count-=1n;
  const shape={window_id:windowId,window_spec:specId??null,candidate_ids:expected,applicability:relevantApplicability,runtime_manifest_sha256:runtime.entry?.runtimeManifestSha256??null};
  return{count,proof_type:'SOURCE_SHAPE_AUDITED_FREE_POWERSET',context_key:contextKey,candidate_count:expected.length,empty_selection_included:!field.required,all_options_witness:true,empty_option_witness:true,source_shape_digest:hash(shape),shape};
}
async function exactTerminalMulti(product,result,field,depMap){const key=terminalContextKey(product,result,field,depMap);if(terminalProofCache.has(key)){terminalCacheHits++;return terminalProofCache.get(key);}terminalCacheMisses++;const proof=product.series==='TW'?await exactTerminalTw(product,result,field,key):(product.series==='EW'?await exactTerminalEwFreePowerset(product,result,field,key):await exactTerminalBfs(product,result,field,key));terminalProofCache.set(key,proof);return proof;}`;

let generated = baseSource.replace(marker, replacement);
generated = generated.replace(
  "note:'Pilot only. Terminal MULTI_ENUM is counted exactly: EW by UI-reachable subset graph closure; TW by source-shape-audited pairwise conflict graph and exact independent-set counting. Empty optional selection is included. No Product Master mutation.'",
  `note:'Pilot only. Terminal MULTI_ENUM is counted exactly: EW option by source-shape-audited free powerset counting with all/empty resolver witnesses; TW by source-shape-audited pairwise conflict graph and exact independent-set counting. Empty optional selection is included. No Product Master mutation.',base_runner_sha256:'${baseSha256}'`
);
await writeFile(GENERATED, generated, 'utf8');
console.log(`EW_FREE_POWERSET_BASE_RUNNER_SHA256=${baseSha256}`);
await import(`${GENERATED.href}?v=${Date.now()}`);
