import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { getRuntimeMasterEntry, loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { loadFormalProductRuntimePackage } from '../src/catalog/runtime-master/formal-product-runtime-loader.mjs';

const OUT=process.env.STAGE_A_CUSTOM_SHAPE_OUT??'artifacts/stage-a-custom-dimension-source-shape';
const HEAD_SHA=process.env.HEAD_SHA??null;
const stable=(v)=>Array.isArray(v)?v.map(stable):(!v||typeof v!=='object'?v:Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,stable(x)])));
const hash=(v)=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const num=(v)=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
const active=(r)=>r?.active!==false&&r?.['有効']!==false&&r?.status!=='INACTIVE'&&r?.['状態']!=='廃止';
const uniq=(xs)=>[...new Set(xs.filter((x)=>x!==null&&x!==undefined&&x!==''))];

const TARGETS=[
  ['LIXIL','サーモスⅡ-H'],['LIXIL','サーモスL'],['LIXIL','EW'],['LIXIL','TW'],['YKK AP','APW430'],['YKK AP','APW431'],
];

function boundsOf(rule){
  const direct=rule?.bounds??rule?.geometryRule?.bounds??{};
  return {
    minW:num(direct.minW??direct.W_min??rule?.W_MIN??rule?.['W_MIN(mm)']),
    maxW:num(direct.maxW??direct.W_max??rule?.W_MAX??rule?.['W_MAX(mm)']),
    minH:num(direct.minH??direct.H_min??rule?.H_MIN??rule?.['H_MIN(mm)']),
    maxH:num(direct.maxH??direct.H_max??rule?.H_MAX??rule?.['H_MAX(mm)']),
  };
}
function windowIdOf(rule){
  return rule?.selector?.window_type??rule?.selector?.seriesWindowId??rule?.productNode??rule?.windowId??rule?.['窓種ID']??rule?.window_id??'*';
}
function typeOf(rule,sourceKind){
  return String(rule?.type??rule?.evaluationType??rule?.judgeCode??rule?.['判定方式']??(sourceKind==='EW_CUSTOM_RANGE'?'AUTO_RECT':'UNKNOWN'));
}
function collectPoints(rule){
  const points=[];
  const push=(rows)=>{if(Array.isArray(rows))for(const p of rows){if(Array.isArray(p)&&p.length>=2&&Number.isFinite(Number(p[0]))&&Number.isFinite(Number(p[1])))points.push([Number(p[0]),Number(p[1])]);}};
  push(rule?.points);push(rule?.geometryRule?.points);
  for(const v of rule?.geometryRule?.variants??[])if(v&&typeof v==='object')push(v.points);
  return points;
}
function collectRegions(rule){
  const rows=rule?.regions??rule?.geometryRule?.regions??[];
  return Array.isArray(rows)?rows.filter((r)=>Array.isArray(r)&&r.length>=4).map((r)=>r.slice(0,4).map(num)):[];
}
function selectorSummary(rule){
  const selector=rule?.selector??{};
  return Object.fromEntries(Object.entries(selector).map(([k,v])=>[k,v]));
}
function normalizedRule(rule,sourceKind){
  const bounds=boundsOf(rule);
  const points=collectPoints(rule);
  const regions=collectRegions(rule);
  const sourceJudgeCode=typeOf(rule,sourceKind);
  const type=sourceKind==='APW431_FORMAL_SPLIT_V1'?'APW431_AFFINE_BOUNDS':sourceJudgeCode;
  const geometryKeys=Object.keys(rule?.geometryRule??{}).sort();
  const ratio=num(rule?.ratio??rule?.geometryRule?.ratio);
  const upperA=sourceKind==='APW431_FORMAL_SPLIT_V1'?num(rule?.bounds?.H_upper_a):null;
  const upperB=sourceKind==='APW431_FORMAL_SPLIT_V1'?num(rule?.bounds?.H_upper_b):null;
  const axisConstants=uniq([bounds.minW,bounds.maxW,bounds.minH,bounds.maxH,...regions.flat(),...points.flat()]).filter(Number.isFinite).sort((a,b)=>a-b);
  return {
    id:String(rule?.id??rule?.range_id??rule?.rule_id??`${sourceKind}:${windowIdOf(rule)}:${sourceJudgeCode}`),
    source_kind:sourceKind,
    window_id:String(windowIdOf(rule)),
    type,
    source_judge_code:sourceKind==='APW431_FORMAL_SPLIT_V1'?sourceJudgeCode:null,
    selector:selectorSummary(rule),
    bounds,
    ratio,
    upper_a:upperA,
    upper_b:upperB,
    regions,
    points,
    geometry_keys:geometryKeys,
    axis_constants:axisConstants,
    runtime_safety:rule?.runtimeSafety??null,
    result:rule?.result??rule?.APP結果??null,
    special_condition_present:Boolean(rule?.specialConditions||rule?.windPressureGlassFamily||rule?.note||rule?.sourceNote),
  };
}

async function formalPackage(entry){
  const pkg=await loadFormalProductRuntimePackage(entry);
  if(pkg.integrity?.match!==true)throw new Error(`${entry.series}: formal package integrity mismatch`);
  return pkg;
}
function productModuleDocument(pkg,entry){
  const preferred=entry.productModuleRole;
  if(preferred&&pkg.documents?.[preferred])return pkg.documents[preferred];
  return Object.values(pkg.documents??{}).find((d)=>d?.product_module)??null;
}
function productModuleRules(pkg,entry){
  const doc=productModuleDocument(pkg,entry);
  const module=doc?.product_module;
  if(!module)throw new Error(`${entry.series}: product_module missing`);
  const direct=(module.ruleSets??[]).filter((s)=>s.type==='DIMENSION_RULES'&&s.status!=='INACTIVE').flatMap((s)=>Array.isArray(s.payload)?s.payload:(s.payload?.rules??[])).filter(active);
  if(direct.length)return direct.map((r)=>normalizedRule(r,'PRODUCT_MODULE_DIMENSION_RULES'));
  const legacy=(module.ruleSets??[]).filter((s)=>s.type==='CUSTOM_DIMENSION_RULE_TABLE'&&s.status!=='INACTIVE').flatMap((s)=>Array.isArray(s.payload)?s.payload:[]).filter(active);
  return legacy.map((row)=>normalizedRule({
    id:row.range_id,
    type:row['判定方式'],
    bounds:{minW:row.W_MIN,maxW:row.W_MAX,minH:row.H_MIN,maxH:row.H_MAX},
    selector:{window_type:row['窓種ID'],specific_spec:row['固有仕様ID']},
    result:row.APP結果,
    source:row,
  },'PRODUCT_MODULE_CUSTOM_DIMENSION_RULE_TABLE'));
}

async function extractSeries(manufacturer,series){
  const entry=getRuntimeMasterEntry(manufacturer,series);
  if(!entry)throw new Error(`Runtime entry missing ${manufacturer}/${series}`);
  let rules=[];
  if(entry.adapterType==='PRODUCT_MODULE_RUNTIME_V1'){
    const pkg=await formalPackage(entry);rules=productModuleRules(pkg,entry);
  }else if(entry.adapterType==='APW430_FORMAL_SPLIT_V1'||entry.adapterType==='APW431_FORMAL_SPLIT_V1'){
    const pkg=await formalPackage(entry);const dims=pkg.documents?.DIMENSIONS;
    if(!dims)throw new Error(`${series}: DIMENSIONS missing`);
    rules=(dims.custom_dimension_rules??[]).filter(active).map((r)=>normalizedRule(r,entry.adapterType));
  }else if(entry.adapterType==='CANONICAL_WORKBOOK_REFERENCE_V1'){
    const runtime=await loadRegisteredRuntime(manufacturer,series);
    if(runtime?.sourcePackageIntegrity?.match!==true)throw new Error(`${series}: integrity mismatch`);
    const rows=runtime?.master?.canonicalWorkbook?.customRanges??[];
    rules=rows.filter(active).map((r)=>normalizedRule({
      id:r.range_id??r.rule_id,
      type:'AUTO_RECT',
      bounds:{minW:r['W_MIN(mm)']??r.minW,maxW:r['W_MAX(mm)']??r.maxW,minH:r['H_MIN(mm)']??r.minH,maxH:r['H_MAX(mm)']??r.maxH},
      selector:{window_type:r['窓種ID']??r.window_id,specific_spec:r['固有仕様ID']??r.spec_id},
    },'EW_CUSTOM_RANGE'));
  }else if(entry.adapterType==='TW_CANONICAL_WORKBOOK_REFERENCE_V2'){
    const runtime=await loadRegisteredRuntime(manufacturer,series);
    if(runtime?.sourcePackageIntegrity?.match!==true)throw new Error(`${series}: integrity mismatch`);
    rules=(runtime?.master?.customDimensionRules??[]).filter(active).map((r)=>normalizedRule(r,'TW_CUSTOM_DIMENSION_RULES'));
  }else throw new Error(`Unsupported adapter for CUSTOM shape ${entry.adapterType}`);

  const supportedTypes=new Set(['AUTO_RECT','AUTO_RATIO','AUTO_PIECEWISE','AUTO_POLYGON','SOURCE_GRAPH_GATE','COMPOUND_GATE','RECT_RANGE','REVIEW_REQUIRED','SOURCE_GRAPH','POLYGON','PIECEWISE','APW431_AFFINE_BOUNDS']);
  const unsupported=[];
  for(const r of rules){
    if(!supportedTypes.has(r.type))unsupported.push({rule_id:r.id,reason:'UNKNOWN_RULE_TYPE',type:r.type});
    if(['AUTO_RECT','AUTO_RATIO','AUTO_PIECEWISE'].includes(r.type)&&![r.bounds.minW,r.bounds.maxW,r.bounds.minH,r.bounds.maxH].some(Number.isFinite)&&!r.regions.length)unsupported.push({rule_id:r.id,reason:'MISSING_NUMERIC_BOUNDARY'});
    if(r.type==='AUTO_POLYGON'&&!r.points.length)unsupported.push({rule_id:r.id,reason:'POLYGON_POINTS_MISSING'});
    if(r.type==='AUTO_RATIO'&&!Number.isFinite(r.ratio))unsupported.push({rule_id:r.id,reason:'RATIO_MISSING'});
    if(r.type==='APW431_AFFINE_BOUNDS'){
      if(![r.bounds.minW,r.bounds.maxW,r.bounds.minH,r.bounds.maxH].every(Number.isFinite))unsupported.push({rule_id:r.id,reason:'APW431_RECT_BOUNDS_INCOMPLETE',bounds:r.bounds,judge_code:r.source_judge_code});
      const hasA=Number.isFinite(r.upper_a),hasB=Number.isFinite(r.upper_b);
      if(hasA!==hasB)unsupported.push({rule_id:r.id,reason:'AFFINE_COEFFICIENT_PAIR_INCOMPLETE',upper_a:r.upper_a,upper_b:r.upper_b,judge_code:r.source_judge_code});
    }
  }
  const typeCounts={};for(const r of rules)typeCounts[r.type]=(typeCounts[r.type]??0)+1;
  const sourceJudgeCounts={};for(const r of rules)if(r.source_judge_code)sourceJudgeCounts[r.source_judge_code]=(sourceJudgeCounts[r.source_judge_code]??0)+1;
  const windowIds=uniq(rules.map((r)=>r.window_id)).sort();
  const boundaryConstants=uniq(rules.flatMap((r)=>r.axis_constants)).filter(Number.isFinite).sort((a,b)=>a-b);
  return {
    manufacturer,series,adapter_type:entry.adapterType,manifest_sha256:entry.runtimeManifestSha256??null,
    custom_rule_count:rules.length,custom_window_id_count:windowIds.length,custom_window_ids:windowIds,
    type_counts:typeCounts,source_judge_code_counts:sourceJudgeCounts,boundary_constant_count:boundaryConstants.length,boundary_constants:boundaryConstants,
    unsupported_count:unsupported.length,unsupported,rules,
    series_shape_digest:hash({manifest:entry.runtimeManifestSha256,rules}),
  };
}

await mkdir(OUT,{recursive:true});
const series=[];for(const [m,s] of TARGETS)series.push(await extractSeries(m,s));
const unsupported=series.flatMap((s)=>s.unsupported.map((u)=>({series:s.series,...u})));
const report={
  exact_head_sha:HEAD_SHA,task_classification:'NON-PRODUCT-MASTER',product_master_mutation:0,
  proof_model_version:'RUNTIME_UI_SYMBOLIC_FULL_COVERAGE_V1',diagnostic_model_version:'STAGE_A_CUSTOM_DIMENSION_SOURCE_SHAPE_V2_APW431_AFFINE',
  series_count:series.length,total_custom_rule_count:series.reduce((n,s)=>n+s.custom_rule_count,0),
  total_explicit_custom_window_id_count:new Set(series.flatMap((s)=>s.custom_window_ids.map((w)=>`${s.series}:${w}`))).size,
  unsupported_count:unsupported.length,unsupported,series,
  source_shape_status:unsupported.length?'BLOCKED_UNSUPPORTED_CUSTOM_RULE_SHAPE':'CUSTOM_SOURCE_SHAPE_INVENTORIED',
};
report.evidence_digest=hash({head:HEAD_SHA,series:series.map((s)=>({series:s.series,manifest:s.manifest_sha256,digest:s.series_shape_digest}))});
report.gate_status={discrete_population_gate:'PASS_EVIDENCE_EXTERNAL',custom_size_coverage_gate:'BLOCKED_PARTITION_PROOF_NOT_YET_RUN',qa_population_gate:'BLOCKED_CONTINUOUS_CUSTOM_PROOF_PENDING',app_integration_ready:false,release_input_gate:'BLOCKED'};
await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2)+'\n','utf8');
for(const s of series)console.log(`CUSTOM_SHAPE series=${s.series} adapter=${s.adapter_type} rules=${s.custom_rule_count} windows=${s.custom_window_id_count} types=${JSON.stringify(s.type_counts)} judge_codes=${JSON.stringify(s.source_judge_code_counts)} boundaries=${s.boundary_constant_count} unsupported=${s.unsupported_count}`);
console.log(`CUSTOM_SOURCE_SHAPE_STATUS=${report.source_shape_status}`);
console.log(`TOTAL_CUSTOM_RULE_COUNT=${report.total_custom_rule_count}`);
console.log(`TOTAL_EXPLICIT_CUSTOM_WINDOW_ID_COUNT=${report.total_explicit_custom_window_id_count}`);
console.log(`UNSUPPORTED_COUNT=${report.unsupported_count}`);
console.log(`CUSTOM_SHAPE_EVIDENCE_DIGEST=${report.evidence_digest}`);
console.log('CUSTOM_SIZE_COVERAGE_GATE=BLOCKED_PARTITION_PROOF_NOT_YET_RUN');
console.log('APP_INTEGRATION_READY=false');
console.log('RELEASE_INPUT_GATE=BLOCKED');
if(unsupported.length)process.exitCode=2;
