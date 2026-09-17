import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

const OUT=process.env.STAGE_A_SEMANTIC_DAG_OUT??'artifacts/stage-a-semantic-continuation-dag-pilot';
const HEAD_SHA=process.env.HEAD_SHA??null;
const MAX_STATES=Number(process.env.STAGE_A_MAX_CONCRETE_STATES_PER_WINDOW??12000);
const MAX_CALLS=Number(process.env.STAGE_A_MAX_RESOLVER_CALLS_PER_WINDOW??50000);
const MAX_MULTI=Number(process.env.STAGE_A_MAX_EXPLICIT_MULTI_ENUM_VALUES??18);
const TARGETS=String(process.env.STAGE_A_TARGET_WINDOWS??'').split(',').map((v)=>v.trim()).filter(Boolean);
const PRODUCTS=[
{id:'SER-LIX-SAMOS2H',manufacturer:'LIXIL',series:'サーモスⅡ-H'},
{id:'SER-LIX-SAMOSL',manufacturer:'LIXIL',series:'サーモスL'},
{id:'SER-LIX-EW',manufacturer:'LIXIL',series:'EW'},
{id:'SER-LIXIL-TW',manufacturer:'LIXIL',series:'TW'},
{id:'SER-YKK-APW430',manufacturer:'YKK AP',series:'APW430'},
{id:'SER-YKK-APW431',manufacturer:'YKK AP',series:'APW431'},
];
const CONTINUOUS=new Set(['custom_width','custom_w','order_width','custom_height','custom_h','order_height']);
const TECHNICAL=new Set(['construction','legacyConstruction','legacyConfiguration','internal_construction']);
const present=(v)=>v!==undefined&&v!==null&&v!==''&&(!Array.isArray(v)||v.length>0);
const enabled=(f)=>(f?.values??[]).filter((c)=>c.disabled!==true);
const stable=(v)=>Array.isArray(v)?v.map(stable):(!v||typeof v!=='object'?v:Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,stable(x)])));
const stableJson=(v)=>JSON.stringify(stable(v));
const hash=(v)=>createHash('sha256').update(typeof v==='string'?v:stableJson(v)).digest('hex');
const normalizeMulti=(values)=>[...new Map(values.map((v)=>[String(v),v])).values()].sort((a,b)=>String(a).localeCompare(String(b)));
const invalid=(r)=>['INVALID','BLOCKED','BLOCK'].includes(String(r.validation?.status??''));
const visibleKeys=(r)=>new Set((r.fields??[]).map((f)=>f.key));
const userFields=(r)=>(r.fields??[]).filter((f)=>!TECHNICAL.has(f.key)&&!CONTINUOUS.has(f.key)&&enabled(f).length>0&&!f.readOnly);
const nextField=(r,done)=>userFields(r).find((f)=>f.key!=='window_type'&&!done.has(f.key))??null;
const childDone=(done,key,r)=>{const visible=visibleKeys(r);return new Set([...done,key].filter((k)=>visible.has(k)));};
const customPending=(r)=>{const w=(r.fields??[]).find((f)=>['custom_width','custom_w','order_width'].includes(f.key))?.key;const h=(r.fields??[]).find((f)=>['custom_height','custom_h','order_height'].includes(f.key))?.key;return Boolean(w&&h&&(!present(r.selection?.[w])||!present(r.selection?.[h])));};
const fieldSig=(f)=>({key:f.key,type:f.dataType,required:Boolean(f.required),readOnly:Boolean(f.readOnly),selectionMode:f.selectionMode??null,values:enabled(f).map((c)=>c.value)});
const branchLabel=(b)=>b.kind==='UNSET'?{kind:'UNSET'}:{kind:'VALUE',value:stable(b.value)};
const scalarBranches=(f)=>{const rows=enabled(f).map((c)=>({kind:'VALUE',value:c.value}));if(!f.required)rows.unshift({kind:'UNSET'});return rows;};
function* multiBranches(f){const values=enabled(f).map((c)=>c.value);for(let mask=0;mask<2**values.length;mask++){const subset=[];for(let i=0;i<values.length;i++)if(mask&(1<<i))subset.push(values[i]);if(f.required&&subset.length===0)continue;yield{kind:'VALUE',value:normalizeMulti(subset)};}}
const apply=(selection,f,b)=>{const next={...(selection??{})};if(b.kind==='UNSET')delete next[f.key];else next[f.key]=f.dataType==='MULTI_ENUM'?normalizeMulti(b.value):b.value;return next;};
const survives=(r,f,b)=>{if(b.kind==='UNSET')return !present(r.selection?.[f.key]);const actual=r.selection?.[f.key];return Array.isArray(b.value)?Array.isArray(actual)&&stableJson(actual.map(String).sort())===stableJson(b.value.map(String).sort()):String(actual)===String(b.value);};
const concreteKey=(r,done)=>hash({selection:r.selection??{},done:[...done].sort(),visible:(r.fields??[]).map((f)=>f.key),validation:r.validation?.status??null,dimension:r.dimensionResult?.status??null});

async function inventory(){const rows=[];for(const product of PRODUCTS){const root=await resolveRuntimeAppProduct(product.id,{});const wf=(root.fields??[]).find((f)=>f.key==='window_type');assert.ok(wf,`${product.id}: window_type missing`);for(const choice of enabled(wf)){const windowType=String(choice.value);if(!TARGETS.length||TARGETS.includes(windowType))rows.push({...product,windowType});}}if(TARGETS.length)assert.equal(rows.length,TARGETS.length,`target windows resolved ${rows.length}/${TARGETS.length}`);return rows;}

await mkdir(OUT,{recursive:true});
const windows=[];
for(const row of await inventory()){
 let calls=1,states=0,reuse=0,maxDepth=0,blocker=null;
 const concrete=new Map(),inProgress=new Set(),classes=new Map();
 const root=await resolveRuntimeAppProduct(row.id,{window_type:row.windowType});
 const budget=(stage,extra=0)=>{if(states>=MAX_STATES){blocker={status:'CONCRETE_STATE_LIMIT_REACHED',stage,states,calls};return false;}if(calls+extra>MAX_CALLS){blocker={status:'RESOLVER_CALL_LIMIT_REACHED',stage,states,calls,additionalCalls:extra};return false;}return true;};
 async function classify(result,done,depth=0){
  if(blocker)return null;maxDepth=Math.max(maxDepth,depth);
  const ck=concreteKey(result,done);if(concrete.has(ck)){reuse++;return concrete.get(ck);}if(inProgress.has(ck)){blocker={status:'SEMANTIC_CYCLE_DETECTED',selection:stable(result.selection??{}),done:[...done].sort()};return null;}if(!budget('CLASSIFY'))return null;inProgress.add(ck);states++;
  const field=nextField(result,done);
  if(!field){const stage={kind:'TERMINAL',customPending:customPending(result),validation:result.validation?.status??null,dimension:result.dimensionResult?.status??null};const sh=hash(stage);let cls=classes.get(sh);if(!cls){cls={hash:sh,count:1n,custom:stage.customPending?1n:0n,kind:'TERMINAL'};classes.set(sh,cls);}else reuse++;concrete.set(ck,cls);inProgress.delete(ck);return cls;}
  const remaining=userFields(result).filter((f)=>f.key!=='window_type'&&!done.has(f.key));
  if(field.dataType==='MULTI_ENUM'&&enabled(field).length>MAX_MULTI){const frontier={kind:'SYMBOLIC_FRONTIER',field:fieldSig(field),remaining:remaining.map((f)=>f.key)};const sh=hash(frontier);let cls=classes.get(sh);if(!cls){cls={hash:sh,count:null,custom:null,kind:'SYMBOLIC_FRONTIER',frontier};classes.set(sh,cls);}concrete.set(ck,cls);inProgress.delete(ck);return cls;}
  const branches=field.dataType==='MULTI_ENUM'?[...multiBranches(field)]:scalarBranches(field);if(!budget(`FIELD:${field.key}`,branches.length)){inProgress.delete(ck);return null;}
  const transitions=[];let total=0n,custom=0n,hasSymbolic=false;
  for(const b of branches){const child=await resolveRuntimeAppProduct(row.id,apply(result.selection,field,b));calls++;const label=branchLabel(b);if(!survives(child,field,b)||invalid(child)){transitions.push({branch:label,outcome:'PRUNED',validation:child.validation?.status??null,dimension:child.dimensionResult?.status??null});continue;}const cc=await classify(child,childDone(done,field.key,child),depth+1);if(!cc){inProgress.delete(ck);return null;}transitions.push({branch:label,outcome:cc.kind==='SYMBOLIC_FRONTIER'?'SYMBOLIC_FRONTIER':'CHILD',child:cc.hash});if(cc.count===null)hasSymbolic=true;else{total+=cc.count;custom+=cc.custom;}}
  const stage={kind:'BRANCHING',field:fieldSig(field),transitions};const sh=hash(stage);let cls=classes.get(sh);if(!cls){cls={hash:sh,count:hasSymbolic?null:total,custom:hasSymbolic?null:custom,kind:hasSymbolic?'BRANCHING_WITH_SYMBOLIC_FRONTIER':'BRANCHING'};classes.set(sh,cls);}else{if(cls.count!==null&&!hasSymbolic)assert.equal(cls.count,total);reuse++;}concrete.set(ck,cls);inProgress.delete(ck);return cls;
 }
 const rootClass=await classify(root,new Set(['window_type']));
 const symbolicFrontiers=[...classes.values()].filter((c)=>c.kind==='SYMBOLIC_FRONTIER').map((c)=>c.frontier);
 const status=blocker?'BLOCKED':symbolicFrontiers.length?'SYMBOLIC_FRONTIER_REACHED':'COUNTED_CANDIDATE';
 windows.push({manufacturer:row.manufacturer,series:row.series,product_id:row.id,window_type:row.windowType,status,exact_discrete_terminal_context_count:rootClass?.count?.toString()??null,custom_pending_context_count:rootClass?.custom?.toString()??null,concrete_state_count:states,semantic_class_count:classes.size,class_reuse_count:reuse,resolver_call_count:calls,max_depth:maxDepth,symbolic_frontiers:symbolicFrontiers,blocker});
 console.log(`SEMANTIC_DAG_WINDOW product=${row.id} window=${row.windowType} status=${status} terminals=${rootClass?.count??'SYMBOLIC_OR_BLOCKED'} concrete=${states} classes=${classes.size} reuse=${reuse} calls=${calls}`);
}
const blocked=windows.filter((w)=>w.status==='BLOCKED'),symbolic=windows.filter((w)=>w.status==='SYMBOLIC_FRONTIER_REACHED'),counted=windows.filter((w)=>w.status==='COUNTED_CANDIDATE');
const report={exact_head_sha:HEAD_SHA,task_classification:'NON-PRODUCT-MASTER',product_master_mutation:0,proof_status:blocked.length?'PILOT_BLOCKED':'PILOT_COMPLETE',proof_basis:'EXACT_RUNTIME_BRANCH_SEMANTIC_DAG_NO_DEPENDENCY_METADATA_REUSE',pilot_only:true,target_windows:TARGETS,base_window_count:windows.length,counted_window_count:counted.length,symbolic_frontier_window_count:symbolic.length,blocked_window_count:blocked.length,concrete_state_count:windows.reduce((n,w)=>n+w.concrete_state_count,0),semantic_class_count:windows.reduce((n,w)=>n+w.semantic_class_count,0),class_reuse_count:windows.reduce((n,w)=>n+w.class_reuse_count,0),resolver_call_count:windows.reduce((n,w)=>n+w.resolver_call_count,0),windows,gate_status:{exhaustive_state_graph_gate:'BLOCKED_PILOT_ONLY',qa_population_gate:'BLOCKED_PILOT_ONLY',full_browser_qa_gate:'NOT_STARTED',app_integration_ready:false,release_input_gate:'BLOCKED'},note:'Diagnostic pilot only; not a full-coverage or release gate. Dependency metadata is not used to justify continuation reuse. Semantic classes are keyed by exact runtime branch outcomes and child semantic hashes. Oversized MULTI_ENUM is handed off as an unresolved symbolic frontier.'};
await writeFile(`${OUT}/report.json`,`${JSON.stringify(report,null,2)}\n`,'utf8');
console.log(`SEMANTIC_DAG_PILOT_STATUS=${report.proof_status}`);console.log(`COUNTED_WINDOW_COUNT=${report.counted_window_count}`);console.log(`SYMBOLIC_FRONTIER_WINDOW_COUNT=${report.symbolic_frontier_window_count}`);console.log(`BLOCKED_WINDOW_COUNT=${report.blocked_window_count}`);console.log(`CONCRETE_STATE_COUNT=${report.concrete_state_count}`);console.log(`SEMANTIC_CLASS_COUNT=${report.semantic_class_count}`);console.log(`CLASS_REUSE_COUNT=${report.class_reuse_count}`);console.log(`RESOLVER_CALL_COUNT=${report.resolver_call_count}`);console.log('APP_INTEGRATION_READY=false');console.log('RELEASE_INPUT_GATE=BLOCKED');
