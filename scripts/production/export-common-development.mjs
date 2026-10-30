import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const here=new URL('../../',import.meta.url);
const ref=p=>({native_path:p,sha256:hash(fs.readFileSync(new URL(p,here)))});
const read=p=>JSON.parse(fs.readFileSync(new URL(p,here)));
const implementationRefs=execFileSync('git',['ls-files','-z'],{cwd:here,encoding:'utf8'}).split('\0').filter(p=>p&&["src/catalog/runtime-master/", "src/server/", "src/ui/", "contracts/ui-common/"].some(prefix=>p.startsWith(prefix))&&/\.(?:mjs|js|ts|tsx|jsx|css|html|json)$/.test(p)).sort().map(ref);
const checks={};
const check=(name,cases,fn)=>{fn();checks[name]={status:'PASS',executed_cases:cases};};
import {loadRegisteredRuntime} from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import {resolveRuntimeAppProduct} from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
import {GLOBAL_WINDOW_STAGE_ORDER} from '../../src/catalog/runtime-master/global-window-selection-flow-engine.mjs';
const product_id='SER-LIX-EW';
const loaded=await loadRegisteredRuntime('LIXIL','EW');
const initial={window_type:'WT-EW-TATE-SUBERI',window_spec:'SP-EW-TATE-T',handing:'L',frame_angle:'WITHOUT_ANGLE',size_mode:'STANDARD'};
let state=await resolveRuntimeAppProduct(product_id,initial);
for(const key of ['size','exterior_color','interior_color','glass_base']){
  const choice=state.fields.find(f=>f.key===key)?.values.find(c=>!c.disabled);assert.ok(choice,key);
  state=await resolveRuntimeAppProduct(product_id,{...state.selection,[key]:choice.value});
}
check('MASTER_PROJECTION',1,()=>{assert.equal(loaded.sourcePackageIntegrity.match,true);assert.equal(loaded.normalizedManifest.formalPass,true);assert.equal(loaded.normalizedManifest.packageGate,'PASS');});
check('FLOW_ORDER',state.fields.length,()=>{let last=-1;for(const f of state.fields){const stage=GLOBAL_WINDOW_STAGE_ORDER.indexOf(f.semanticStage);assert.ok(stage>=last&&stage>=0,f.key);last=stage;}});
check('CONTROL_AND_VALUES',state.fields.length,()=>{assert.equal(new Set(state.fields.map(f=>f.key)).size,state.fields.length);for(const f of state.fields){assert.ok(f.dataType);assert.ok(Array.isArray(f.values));}});
const custom=await resolveRuntimeAppProduct(product_id,{window_type:'WT-EW-SOTODAOSHI',window_spec:'SP-EW-Y-1',size_mode:'CUSTOM'});
check('BRANCH_VISIBILITY',2,()=>{assert.ok(custom.fields.some(f=>f.key==='custom_w'));assert.ok(!custom.fields.some(f=>f.key==='size'));});
const keep=await resolveRuntimeAppProduct(product_id,state.selection);
check('KEEP_VALID',1,()=>assert.deepEqual(keep.selection,state.selection));
const cleared=await resolveRuntimeAppProduct(product_id,{window_type:'WT-EW-FIX',window_spec:initial.window_spec,handing:'L',size_mode:'STANDARD'});
check('CLEAR_INVALID',2,()=>{assert.equal(cleared.selection.window_spec,undefined);assert.equal(cleared.selection.handing,undefined);});
const restore=await resolveRuntimeAppProduct(product_id,JSON.parse(JSON.stringify(state.selection)));
check('RESTORE',1,()=>assert.deepEqual(restore.selection,state.selection));
check('HANDOFF',1,()=>{assert.equal(restore.productId,product_id);assert.deepEqual(restore.selection,state.selection);assert.ok(restore.runtimeMaster);});
console.log(JSON.stringify({schema:'NATIVE_COMMON_PROJECTION_V1',implementation_refs:implementationRefs,repository:'Takuro-Kwkm/sash-app',product_id,status:'PASS',
  flow_stages:GLOBAL_WINDOW_STAGE_ORDER,master_identity:{version:loaded.normalizedManifest.packageVersion,source_integrity:loaded.sourcePackageIntegrity},
  source_refs:[ref('src/catalog/runtime-master-packages/lixil-ew-v1.4/runtime_manifest.json'),ref('src/catalog/runtime-master-packages/lixil-ew-v1.4/runtime.json.br.b64')],
  flow:ref('src/catalog/runtime-master/canonical-window-semantic-schema.mjs'),
  fields:state.fields,master_fields:loaded.master.fields.map(f=>({field_id:f.field_id??f.field_name})),checks,scope:'NATIVE_CONNECTION_PROBE; BROWSER_AND_HUMAN_REVIEW_SEPARATE'}));
