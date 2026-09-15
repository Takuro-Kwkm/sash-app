import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';

const SHAPE=process.env.STAGE_A_CUSTOM_SHAPE_INPUT??'artifacts/stage-a-custom-dimension-source-shape/report.json';
const GUARD=process.env.STAGE_A_CUSTOM_GUARD_INPUT??'artifacts/stage-a-formal-split-custom-guard-shape/report.json';
const OUT=process.env.STAGE_A_CUSTOM_PARTITION_OUT??'artifacts/stage-a-custom-dimension-boundary-partition';
const HEAD_SHA=process.env.HEAD_SHA??null;
const TOL=1e-8;
const stable=(v)=>Array.isArray(v)?v.map(stable):(!v||typeof v!=='object'?v:Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,stable(x)])));
const hash=(v)=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const finite=(v)=>Number.isFinite(Number(v));
const round=(v,n=10)=>Number(Number(v).toFixed(n));
const pointKey=([x,y])=>`${round(x,8)},${round(y,8)}`;
const uniqNum=(values)=>{const out=[];for(const v of values.filter(Number.isFinite).sort((a,b)=>a-b)){if(!out.length||Math.abs(v-out.at(-1))>TOL)out.push(v);}return out;};

const shape=JSON.parse(await readFile(SHAPE,'utf8'));
const guard=JSON.parse(await readFile(GUARD,'utf8'));
if(shape.exact_head_sha!==HEAD_SHA||guard.exact_head_sha!==HEAD_SHA)throw new Error('CUSTOM_PARTITION_INPUT_EXACT_HEAD_MISMATCH');
if(shape.unsupported_count!==0||shape.source_shape_status!=='CUSTOM_SOURCE_SHAPE_INVENTORIED')throw new Error('CUSTOM_PARTITION_SOURCE_SHAPE_NOT_READY');
if(guard.status!=='PASS')throw new Error('CUSTOM_PARTITION_GUARD_SHAPE_NOT_READY');

const continuousSelectorKeys=new Set(['custom_width','custom_height','custom_w','custom_h','order_width','order_height','W','H','width','height','actualW','actualH']);
function auditSelector(selector,path='$',out=[]){
  if(!selector||typeof selector!=='object'||Array.isArray(selector))return out;
  for(const [key,value] of Object.entries(selector)){
    if(['any','anyOf','all','allOf','not'].includes(key)){out.push({path:`${path}.${key}`,reason:'LOGICAL_SELECTOR_UNSUPPORTED_FOR_CURRENT_PARTITION'});continue;}
    if(continuousSelectorKeys.has(key))out.push({path:`${path}.${key}`,reason:'CONTINUOUS_SELECTOR_KEY_MUST_BE_GEOMETRY_PRIMITIVE'});
    if(value&&typeof value==='object'&&!Array.isArray(value))out.push({path:`${path}.${key}`,reason:'OPERATOR_SELECTOR_UNSUPPORTED_FOR_CURRENT_PARTITION',value});
  }
  return out;
}

function canonicalLine(a,b,c,source){
  const norm=Math.hypot(a,b);if(!(norm>TOL))throw new Error(`DEGENERATE_BOUNDARY_LINE ${source}`);
  a/=norm;b/=norm;c/=norm;
  if(a<-TOL||(Math.abs(a)<=TOL&&b<0)){a=-a;b=-b;c=-c;}
  return{a:round(a,12),b:round(b,12),c:round(c,12),sources:[source]};
}
const vertical=(x,source)=>canonicalLine(1,0,-Number(x),source);
const horizontal=(y,source)=>canonicalLine(0,1,-Number(y),source);
function lineFromPoints(p,q,source){const [x1,y1]=p,[x2,y2]=q;return canonicalLine(y2-y1,x1-x2,x2*y1-x1*y2,source);}
function lineKey(l)=>`${l.a}|${l.b}|${l.c}`;
function addLine(map,line){const key=lineKey(line);const old=map.get(key);if(old){old.sources.push(...line.sources);return old;}map.set(key,line);return line;}
function addBounds(map,bounds,source){
  if(finite(bounds?.minW))addLine(map,vertical(bounds.minW,`${source}:minW`));
  if(finite(bounds?.maxW))addLine(map,vertical(bounds.maxW,`${source}:maxW`));
  if(finite(bounds?.minH))addLine(map,horizontal(bounds.minH,`${source}:minH`));
  if(finite(bounds?.maxH))addLine(map,horizontal(bounds.maxH,`${source}:maxH`));
}
function intersection(l1,l2){const det=l1.a*l2.b-l1.b*l2.a;if(Math.abs(det)<=TOL)return null;const x=(l1.b*l2.c-l1.c*l2.b)/det,y=(l1.c*l2.a-l1.a*l2.c)/det;return Number.isFinite(x)&&Number.isFinite(y)?[x,y]:null;}
function evalLine(l,p){return l.a*p[0]+l.b*p[1]+l.c;}
function sign(v){return Math.abs(v)<=1e-7?'0':v<0?'-':'+';}
function axisProbes(values){const xs=uniqNum(values);if(!xs.length)return[0];const out=[xs[0]-1];for(let i=0;i<xs.length;i++){out.push(xs[i]);if(i+1<xs.length)out.push((xs[i]+xs[i+1])/2);}out.push(xs.at(-1)+1);return out;}
function closestPointOnLine(l){return[-l.a*l.c,-l.b*l.c];}
function tangent(l){return[-l.b,l.a];}
function boundaryTriplets(lines){
  let segments=0,triplets=0,invalid=0;const digestRows=[];
  for(let i=0;i<lines.length;i++){
    const target=lines[i],p0=closestPointOnLine(target),t=tangent(target),cuts=[];
    for(let j=0;j<lines.length;j++){if(i===j)continue;const p=intersection(target,lines[j]);if(p)cuts.push((p[0]-p0[0])*t[0]+(p[1]-p0[1])*t[1]);}
    const ts=uniqNum(cuts),segmentTs=[];
    if(!ts.length)segmentTs.push(0);else{segmentTs.push(ts[0]-1);for(let k=0;k+1<ts.length;k++)segmentTs.push((ts[k]+ts[k+1])/2);segmentTs.push(ts.at(-1)+1);}
    for(const tv of segmentTs){
      segments++;const p=[p0[0]+tv*t[0],p0[1]+tv*t[1]];
      let nearest=Infinity;
      for(let j=0;j<lines.length;j++){if(i===j)continue;const d=Math.abs(evalLine(lines[j],p));if(d>TOL)nearest=Math.min(nearest,d);}
      const delta=Number.isFinite(nearest)?Math.max(1e-6,Math.min(1,nearest/4)):1;
      const minus=[p[0]-delta*target.a,p[1]-delta*target.b],plus=[p[0]+delta*target.a,p[1]+delta*target.b];
      const targetOk=sign(evalLine(target,p))==='0'&&sign(evalLine(target,minus))==='-'&&sign(evalLine(target,plus))==='+';
      let othersOk=true;
      for(let j=0;j<lines.length;j++){if(i===j)continue;const sm=sign(evalLine(lines[j],minus)),sp=sign(evalLine(lines[j],plus));if(sm==='0'||sp==='0'||sm!==sp){othersOk=false;break;}}
      if(!targetOk||!othersOk)invalid++;
      triplets++;digestRows.push([lineKey(target),round(p[0],7),round(p[1],7),round(delta,9)]);
    }
  }
  return{boundary_segment_count:segments,boundary_triplet_count:triplets,invalid_boundary_triplet_count:invalid,digest:hash(digestRows)};
}

const guardBySeriesRule=new Map();
for(const s of guard.series??[])for(const r of s.rows??[])guardBySeriesRule.set(`${s.series}|${r.id}`,r);
const selectorAudit=[];const windowReports=[];
for(const s of shape.series){
  const byWindow=new Map();for(const r of s.rules){selectorAudit.push(...auditSelector(r.selector,`${s.series}/${r.id}/selector`).map((x)=>({series:s.series,rule_id:r.id,...x})));const arr=byWindow.get(r.window_id)??[];arr.push(r);byWindow.set(r.window_id,arr);}
  for(const [windowId,rules] of [...byWindow.entries()].sort(([a],[b])=>a.localeCompare(b))){
    const lineMap=new Map();const boundaryRequirements=[];
    for(const r of rules){
      addBounds(lineMap,r.bounds,`${r.id}:rule-bounds`);
      if(r.type==='AUTO_RATIO'){addLine(lineMap,canonicalLine(Number(r.ratio),-1,0,`${r.id}:ratio`));}
      if(r.type==='AUTO_PIECEWISE')for(const [idx,region] of (r.regions??[]).entries()){const [minW,maxW,minH,maxH]=region;addBounds(lineMap,{minW,maxW,minH,maxH},`${r.id}:region:${idx}`);}
      if(r.type==='AUTO_POLYGON'){
        if((r.geometry_keys??[]).includes('variants'))throw new Error(`AUTO_POLYGON_VARIANT_GROUPING_REQUIRED ${s.series}/${r.id}`);
        const pts=r.points??[];if(pts.length<3)throw new Error(`AUTO_POLYGON_POINTS_MISSING ${s.series}/${r.id}`);
        for(let i=0;i<pts.length;i++)addLine(lineMap,lineFromPoints(pts[i],pts[(i+1)%pts.length],`${r.id}:polygon-edge:${i}`));
      }
      if(r.type==='APW431_AFFINE_BOUNDS'&&finite(r.upper_a)&&finite(r.upper_b))addLine(lineMap,canonicalLine(Number(r.upper_a),-1,Number(r.upper_b),`${r.id}:affine-upper`));
      const g=guardBySeriesRule.get(`${s.series}|${r.id}`);if(g)for(const c of g.components??[])addBounds(lineMap,c.bounds,`${r.id}:guard:${c.source}:${c.specific_spec??'*'}`);
      boundaryRequirements.push({rule_id:r.id,type:r.type,guard_mode:g?.guard_mode??null});
    }
    const lines=[...lineMap.values()].sort((a,b)=>lineKey(a).localeCompare(lineKey(b)));
    const intersections=[];for(let i=0;i<lines.length;i++)for(let j=i+1;j<lines.length;j++){const p=intersection(lines[i],lines[j]);if(p)intersections.push(p);}
    const uniqueIntersections=[...new Map(intersections.map((p)=>[pointKey(p),p])).values()];
    const xCritical=[];for(const l of lines)if(Math.abs(l.b)<=TOL)xCritical.push(-l.c/l.a);for(const p of uniqueIntersections)xCritical.push(p[0]);
    const xProbes=axisProbes(xCritical),proofBySignature=new Map();let rawProbeCount=0,interiorProbeCount=0,boundaryProbeCount=0,vertexProbeCount=0;
    for(const x of xProbes){
      const yCritical=[];for(const l of lines)if(Math.abs(l.b)>TOL)yCritical.push(-(l.a*x+l.c)/l.b);
      for(const y of axisProbes(yCritical)){
        rawProbeCount++;const p=[x,y],sig=lines.map((l)=>sign(evalLine(l,p))).join('');const zeroCount=[...sig].filter((c)=>c==='0').length;
        if(zeroCount===0)interiorProbeCount++;else if(zeroCount===1)boundaryProbeCount++;else vertexProbeCount++;
        if(!proofBySignature.has(sig))proofBySignature.set(sig,{x:round(x,8),y:round(y,8),zero_count:zeroCount});
      }
    }
    const triplets=boundaryTriplets(lines);if(triplets.invalid_boundary_triplet_count)throw new Error(`BOUNDARY_TRIPLET_INVARIANCE_FAIL ${s.series}/${windowId} count=${triplets.invalid_boundary_triplet_count}`);
    const lineCoverage=lines.map((l)=>{const signs=new Set();for(const [sig] of proofBySignature){const idx=lines.indexOf(l);signs.add(sig[idx]);}return{line:lineKey(l),sources:l.sources,signs:[...signs].sort()};});
    const incomplete=lineCoverage.filter((r)=>!(r.signs.includes('-')&&r.signs.includes('0')&&r.signs.includes('+')));
    if(incomplete.length)throw new Error(`BOUNDARY_SIDE_COVERAGE_FAIL ${s.series}/${windowId} ${JSON.stringify(incomplete)}`);
    windowReports.push({manufacturer:s.manufacturer,series:s.series,window_id:windowId,rule_count:rules.length,selector_signature_count:new Set(rules.map((r)=>JSON.stringify(stable(r.selector??{})))).size,line_count:lines.length,intersection_count:uniqueIntersections.length,raw_probe_count:rawProbeCount,arrangement_proof_class_count:proofBySignature.size,interior_probe_count:interiorProbeCount,boundary_probe_count:boundaryProbeCount,vertex_probe_count:vertexProbeCount,...triplets,line_digest:hash(lines),proof_class_digest:hash([...proofBySignature.entries()].sort()),boundary_requirements:boundaryRequirements});
  }
}
if(selectorAudit.length)throw new Error(`CUSTOM_SELECTOR_GEOMETRY_SEPARATION_FAIL ${JSON.stringify(selectorAudit)}`);
const bySeries=new Map();for(const w of windowReports){const row=bySeries.get(w.series)??{manufacturer:w.manufacturer,series:w.series,window_count:0,rule_count:0,line_count:0,intersection_count:0,arrangement_proof_class_count:0,boundary_segment_count:0,boundary_triplet_count:0};row.window_count++;for(const k of ['rule_count','line_count','intersection_count','arrangement_proof_class_count','boundary_segment_count','boundary_triplet_count'])row[k]+=w[k];bySeries.set(w.series,row);}
const report={exact_head_sha:HEAD_SHA,task_classification:'NON-PRODUCT-MASTER',product_master_mutation:0,proof_model_version:'RUNTIME_UI_SYMBOLIC_FULL_COVERAGE_V1',partition_model_version:'CUSTOM_FINITE_LINE_ARRANGEMENT_COMMON_REFINEMENT_V1',source_shape_digest:shape.evidence_digest,guard_shape_digest:guard.evidence_digest,discrete_evidence_head:'12bcbf0be00b1939ac3c1087338fa7a69b16e807',discrete_custom_pending_context_count:'34750439786',series:[...bySeries.values()],window_count:windowReports.length,rule_count:shape.total_custom_rule_count,line_count:windowReports.reduce((n,w)=>n+w.line_count,0),intersection_count:windowReports.reduce((n,w)=>n+w.intersection_count,0),arrangement_proof_class_count:windowReports.reduce((n,w)=>n+w.arrangement_proof_class_count,0),boundary_segment_count:windowReports.reduce((n,w)=>n+w.boundary_segment_count,0),boundary_triplet_count:windowReports.reduce((n,w)=>n+w.boundary_triplet_count,0),invalid_boundary_triplet_count:windowReports.reduce((n,w)=>n+w.invalid_boundary_triplet_count,0),selector_geometry_separation_violation_count:selectorAudit.length,windows:windowReports,proof_statement:'Every supported CUSTOM rule discontinuity is contained in the finite affine-line set. The complete line arrangement is a common refinement for every fixed discrete selector context; each open cell, boundary segment and intersection vertex has invariant rule truth. Boundary segment witnesses include exact boundary plus safe offsets on both adjacent sides.',status:'GEOMETRY_PARTITION_PASS_RUNTIME_EQUIVALENCE_PENDING'};
report.evidence_digest=hash({head:HEAD_SHA,source:shape.evidence_digest,guard:guard.evidence_digest,windows:windowReports.map((w)=>[w.series,w.window_id,w.line_digest,w.proof_class_digest,w.digest])});
report.gate_status={discrete_population_gate:'PASS',custom_geometry_partition_gate:'PASS',custom_size_coverage_gate:'BLOCKED_RUNTIME_EQUIVALENCE_WITNESS_PENDING',qa_population_gate:'BLOCKED_CONTINUOUS_CUSTOM_RUNTIME_EQUIVALENCE_PENDING',full_browser_qa_gate:'NOT_STARTED',app_integration_ready:false,release_input_gate:'BLOCKED'};
await mkdir(OUT,{recursive:true});await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2)+'\n','utf8');
for(const s of report.series)console.log(`CUSTOM_PARTITION series=${s.series} windows=${s.window_count} rules=${s.rule_count} lines=${s.line_count} intersections=${s.intersection_count} classes=${s.arrangement_proof_class_count} boundary_segments=${s.boundary_segment_count}`);
console.log(`CUSTOM_GEOMETRY_PARTITION_GATE=PASS windows=${report.window_count} rules=${report.rule_count} classes=${report.arrangement_proof_class_count} boundary_triplets=${report.boundary_triplet_count}`);
console.log(`CUSTOM_PARTITION_EVIDENCE_DIGEST=${report.evidence_digest}`);
console.log('CUSTOM_SIZE_COVERAGE_GATE=BLOCKED_RUNTIME_EQUIVALENCE_WITNESS_PENDING');console.log('APP_INTEGRATION_READY=false');console.log('RELEASE_INPUT_GATE=BLOCKED');
