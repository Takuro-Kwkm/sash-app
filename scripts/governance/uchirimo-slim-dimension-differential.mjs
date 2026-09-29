import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {getRuntimeMasterEntry} from './uchirimo-frozen-migration-entry.mjs';
import {loadCanonicalWorkbookRuntimePackage} from '../../src/catalog/runtime-master/canonical-runtime-manifest-loader.mjs';
import {adaptUchirimoTabularV1} from '../../src/catalog/runtime-master/uchirimo-tabular-v1-adapter.mjs';
import {getRuntimeAppIntegration,normalizeRuntimeSelection,toRuntimeUiResult} from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
import {projectGlassSpecifications} from '../../src/catalog/runtime-master/uchirimo-glass-rule-model.mjs';
import {compareUchirimoGlassSemantics} from '../../src/catalog/runtime-master/uchirimo-slim-canonical.mjs';

// Migration gate for numeric boundary samples. The recurring factorized QA
// remains independent of the frozen FORMAL matrix.
const candidateBytes=readFileSync('data/uchirimo-slim/working-candidate.json');
const candidate=JSON.parse(candidateBytes);
assert.equal(candidate.lifecycle,'WORKING_CANDIDATE_NOT_FORMAL');
const pkg=await loadCanonicalWorkbookRuntimePackage(getRuntimeMasterEntry('YKK AP','ウチリモ 内窓'));
assert.ok(pkg.integrity.match);
assert.equal(pkg.integrity.actual,candidate.source_formal.runtime_manifest_sha256);
const role=Object.keys(pkg.documents).find(key=>pkg.documents[key]?.glass_node_matrix);
assert.ok(role);
assert.equal(compareUchirimoGlassSemantics(pkg.documents[role],candidate.canonical).status,'PASS');
const legacy=adaptUchirimoTabularV1(pkg);
const slim=adaptUchirimoTabularV1({...pkg,documents:{...pkg.documents,[role]:candidate.canonical}});
const integration=getRuntimeAppIntegration('SER-YKKAP-UCHIRIMO');
const resolve=(model,selection)=>toRuntimeUiResult(model.master,model.resolver(normalizeRuntimeSelection(model.master,selection)),integration,pkg.integrity);
const glass=projectGlassSpecifications(candidate.canonical);
const byGsc=new Map();
for(const spec of glass)if(!byGsc.has(spec.glass_size_constraint_group))byGsc.set(spec.glass_size_constraint_group,spec);
const sizeRules=candidate.canonical.glass_size_rules;
assert.equal(sizeRules.length,23);
assert.deepEqual(new Set(byGsc.keys()),new Set(sizeRules.map(r=>r.gsc_id)));
const axes=['glass_family','glass_structure','low_e_type','glass_coating_color','glass_surface_type','safety_treatment','grille_type','grille_material','muntin_type','vacuum_glass_product','spacer_type','gas_fill'];
const dimensionSamples=(rule)=>{
 const pairs=[[500,500],[1000,1000],[100,100]];
 for(const constraints of [rule.constraints,...(rule.subrules??[]).map(x=>x.constraints)].filter(Boolean)){
  for(const key of ['min_pair_mm','max_pair_mm']){
   const [w,h]=constraints[key]??[];
   if(Number.isFinite(w))for(const delta of [-1,0,1])pairs.push([w+delta,1000]);
   if(Number.isFinite(h))for(const delta of [-1,0,1])pairs.push([1000,h+delta]);
  }
  if(Number.isFinite(constraints.max_area_m2)){
   const at=Math.floor(constraints.max_area_m2*1_000_000/1000);
   for(const delta of [-1,0,1])pairs.push([1000,at+delta]);
  }
 }
 return [...new Map(pairs.filter(([w,h])=>w>0&&h>0).map(pair=>[pair.join('x'),pair])).values()];
};
const digest=createHash('sha256'),statuses=new Map();let cases=0,eligiblePairs=0;
for(const node of candidate.canonical.product_nodes){
 for(const rule of sizeRules){
  const spec=byGsc.get(rule.gsc_id);
  const selection={room_specification:node.room,window_type:node.window_type,frame_color:'white'};
  if(node.window_type==='sliding_window')Object.assign(selection,{sash_configuration:node.sash_configuration,size_class:node.size_class});
  for(const axis of axes)if(spec[axis]&&spec[axis]!=='NOT_APPLICABLE')selection[axis]=spec[axis];
  const initial=resolve(legacy,selection);
  assert.deepEqual(resolve(slim,selection),initial,`INITIAL_MISMATCH:${node.node_id}:${rule.gsc_id}`);
  // Include forbidden/manual routes in the differential; do not infer ALLOWED.
  if(initial.selection.glass_spec_id===spec.glass_spec_id)eligiblePairs++;
  for(const [w,h] of dimensionSamples(rule)){
   const input={...selection,size_w:w,size_h:h};
   const before=resolve(legacy,input),after=resolve(slim,input);
   assert.deepEqual(after,before,`DIMENSION_MISMATCH:${node.node_id}:${rule.gsc_id}:${w}x${h}`);
   const status=before.validation.status;
   statuses.set(status,(statuses.get(status)??0)+1);
   digest.update(JSON.stringify([node.node_id,rule.gsc_id,w,h,after]));digest.update('\n');
   cases++;
  }
 }
}
const report={schema:'UCHIRIMO_SLIM_DIMENSION_BOUNDARY_DIFFERENTIAL_V1',status:'PASS',scope:'REPRESENTATIVE_GSC_BOUNDARIES_NOT_ALL_CONTINUOUS_VALUES',candidate_sha256:createHash('sha256').update(candidateBytes).digest('hex'),runtime_manifest_sha256:pkg.integrity.actual,glass_size_rules:sizeRules.length,nodes:candidate.canonical.product_nodes.length,glass_node_contexts:candidate.canonical.product_nodes.length*sizeRules.length,eligible_glass_node_contexts:eligiblePairs,compared_responses:cases,statuses:Object.fromEntries(statuses),response_stream_sha256:digest.digest('hex'),formal_adoption:'NOT_GRANTED_BY_THIS_REPORT'};
const output=process.env.UCHIRIMO_SLIM_DIMENSION_OUT??'artifacts/uchirimo-slim/dimension-boundary-differential.json';
mkdirSync(output.slice(0,output.lastIndexOf('/')),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
