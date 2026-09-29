import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { getRuntimeMasterEntry } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { loadFormalProductRuntimePackage } from '../src/catalog/runtime-master/formal-product-runtime-loader.mjs';

const OUT=process.env.STAGE_A_CUSTOM_GUARD_OUT??'artifacts/stage-a-formal-split-custom-guard-shape';
const HEAD_SHA=process.env.HEAD_SHA??null;
const finite=(v)=>Number.isFinite(Number(v));
const num=(v)=>v===null||v===undefined||v===''?null:Number(v);
const active=(r)=>r?.active!==false&&r?.['有効']!==false&&r?.status!=='INACTIVE'&&r?.['状態']!=='廃止';
const stable=(v)=>Array.isArray(v)?v.map(stable):(!v||typeof v!=='object'?v:Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,stable(x)])));
const hash=(v)=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');

function parseAxisRange(text,axis){
  if(!text)return null;
  const escaped=axis.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const ranges=[];
  const patterns=[new RegExp(`(-?\\d+(?:\\.\\d+)?)\\s*<=?\\s*${escaped}\\s*<=?\\s*(-?\\d+(?:\\.\\d+)?)`,'g'),new RegExp(`(-?\\d+(?:\\.\\d+)?)\\s*<\\s*${escaped}\\s*<=?\\s*(-?\\d+(?:\\.\\d+)?)`,'g')];
  for(const pattern of patterns){let m;while((m=pattern.exec(String(text))))ranges.push([Number(m[1]),Number(m[2])]);}
  const minOnly=new RegExp(`${escaped}\\s*>=?\\s*(-?\\d+(?:\\.\\d+)?)`,'g');
  const maxOnly=new RegExp(`${escaped}\\s*<=?\\s*(-?\\d+(?:\\.\\d+)?)`,'g');
  let m;while((m=minOnly.exec(String(text))))ranges.push([Number(m[1]),null]);while((m=maxOnly.exec(String(text))))ranges.push([null,Number(m[1])]);
  if(!ranges.length)return null;
  const mins=ranges.map(([x])=>x).filter(Number.isFinite),maxs=ranges.map(([,x])=>x).filter(Number.isFinite);
  return{min:mins.length?Math.min(...mins):null,max:maxs.length?Math.max(...maxs):null};
}
function textBounds(text){const w=parseAxisRange(text,'W'),h=parseAxisRange(text,'H');if(!w&&!h)return null;return{minW:w?.min??null,maxW:w?.max??null,minH:h?.min??null,maxH:h?.max??null};}
function pointBounds(points){if(!Array.isArray(points)||!points.length)return null;const xs=points.map((p)=>Number(p?.[0])).filter(Number.isFinite),ys=points.map((p)=>Number(p?.[1])).filter(Number.isFinite);if(!xs.length||!ys.length)return null;return{minW:Math.min(...xs),maxW:Math.max(...xs),minH:Math.min(...ys),maxH:Math.max(...ys)};}
function directBounds(rule){const d=rule?.bounds;if(!d||typeof d!=='object')return null;const b={minW:num(d.W_min??d.minW),maxW:num(d.W_max??d.maxW),minH:num(d.H_min??d.minH),maxH:num(d.H_max??d.maxH)};return Object.values(b).some(Number.isFinite)?b:null;}
function guardComponents(rule){
  const direct=directBounds(rule);if(direct)return[{source:'DIRECT_BOUNDS',specific_spec:null,bounds:direct}];
  const geometry=rule?.geometryRule??{};
  for(const key of ['outer','bounds']){const b=textBounds(geometry[key]);if(b)return[{source:`GEOMETRY_${key.toUpperCase()}`,specific_spec:null,bounds:b}];}
  const out=[];
  const push=(source,b,specific_spec=null)=>{if(b)out.push({source,specific_spec,bounds:b});};
  push('GEOMETRY_EXPRESSION',textBounds(geometry.expression));
  for(const [i,region] of (geometry.regions??[]).entries())push(`GEOMETRY_REGION_${i}`,textBounds(region));
  for(const [i,variant] of (geometry.variants??[]).entries()){
    if(typeof variant==='string'){push(`GEOMETRY_VARIANT_${i}_TEXT`,textBounds(variant));continue;}
    if(!variant||typeof variant!=='object')continue;
    push(`GEOMETRY_VARIANT_${i}_BOUNDS`,textBounds(variant.bounds),variant.spec??null);
    push(`GEOMETRY_VARIANT_${i}_POINTS`,pointBounds(variant.points),variant.spec??null);
  }
  push('GEOMETRY_POINTS',pointBounds(geometry.points));
  return out;
}

const targets=[['YKK AP','APW430'],['YKK AP','APW431']];
const series=[];
for(const [manufacturer,name] of targets){
  const entry=getRuntimeMasterEntry(manufacturer,name);if(!entry)throw new Error(`entry missing ${name}`);
  const pkg=await loadFormalProductRuntimePackage(entry);if(pkg.integrity?.match!==true)throw new Error(`integrity mismatch ${name}`);
  const rules=(pkg.documents?.DIMENSIONS?.custom_dimension_rules??[]).filter(active);
  const rows=rules.map((rule)=>{
    const components=guardComponents(rule);
    return{id:String(rule.id??rule.range_id??''),window_id:String(rule.windowId??rule.productNode??rule.selector?.window_type??rule.selector?.seriesWindowId??'*'),selector:rule.selector??{},judge_code:rule.judgeCode??rule.evaluationType??null,component_count:components.length,guard_mode:components.length?'BOUNDED_COMPONENT_MERGE':'UNBOUNDED_REVIEW',components,component_digest:hash(components)};
  });
  const componentCount=rows.reduce((n,r)=>n+r.component_count,0),unbounded=rows.filter((r)=>r.guard_mode==='UNBOUNDED_REVIEW').length;
  series.push({manufacturer,series:name,adapter_type:entry.adapterType,manifest_sha256:entry.runtimeManifestSha256??null,rule_count:rows.length,bounded_rule_count:rows.length-unbounded,unbounded_review_rule_count:unbounded,component_count:componentCount,rows,series_digest:hash({manifest:entry.runtimeManifestSha256,rows})});
}
const report={exact_head_sha:HEAD_SHA,task_classification:'NON-PRODUCT-MASTER',product_master_mutation:0,model_version:'FORMAL_SPLIT_CUSTOM_GUARD_SHAPE_V1',series,rule_count:series.reduce((n,s)=>n+s.rule_count,0),component_count:series.reduce((n,s)=>n+s.component_count,0),unbounded_review_rule_count:series.reduce((n,s)=>n+s.unbounded_review_rule_count,0),status:'PASS'};
report.evidence_digest=hash({head:HEAD_SHA,series:series.map((s)=>s.series_digest)});
await mkdir(OUT,{recursive:true});await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2)+'\n','utf8');
for(const s of series)console.log(`CUSTOM_GUARD_SHAPE series=${s.series} rules=${s.rule_count} bounded=${s.bounded_rule_count} unbounded_review=${s.unbounded_review_rule_count} components=${s.component_count}`);
console.log(`CUSTOM_GUARD_SHAPE_STATUS=${report.status}`);console.log(`CUSTOM_GUARD_SHAPE_DIGEST=${report.evidence_digest}`);console.log('APP_INTEGRATION_READY=false');console.log('RELEASE_INPUT_GATE=BLOCKED');
