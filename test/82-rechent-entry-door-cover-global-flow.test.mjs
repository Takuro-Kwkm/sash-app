import test from 'node:test';
import assert from 'node:assert/strict';
import { appRuntimeIntegrationRegistry } from '../src/catalog/runtime-master/app-runtime-integration-registry.mjs';
import { loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import {
  ENTRY_DOOR_COVER_UI_CATEGORY,
  ENTRY_DOOR_COVER_UI_STANDARD_ORDER,
  applyEntryDoorCoverUiOrder,
} from '../src/catalog/runtime-master/entry-door-cover-runtime-ui-contract.mjs';
import { GLOBAL_WINDOW_STAGE_ORDER } from '../src/catalog/runtime-master/global-window-selection-flow-engine.mjs';

const PRODUCT_ID='SER-LIXIL-RECHENT-D3-NF';
const STAGE_INDEX=new Map(GLOBAL_WINDOW_STAGE_ORDER.map((stage,index)=>[stage,index]));

function assertCanonical(rows,label){
  let previous=-1;
  for(const row of rows){
    assert.ok(row.semanticSlot,`${label}:${row.key}:semanticSlot`);
    assert.ok(row.semanticStage,`${label}:${row.key}:semanticStage`);
    assert.equal(String(row.semanticSlot).startsWith('other:'),false,`${label}:${row.key}:other-fallback`);
    const current=STAGE_INDEX.get(row.semanticStage);
    assert.notEqual(current,undefined,`${label}:${row.key}:unknown-stage:${row.semanticStage}`);
    assert.ok(current>=previous,`${label}:${row.key}:stage-inversion`);
    previous=current;
  }
}

function relativeOrder(rows,a,b){
  const keys=rows.map((row)=>row.key);
  return Math.sign(keys.indexOf(a)-keys.indexOf(b));
}

test('Rechent v0.8-R7 is registered read-only through ENTRY_DOOR_COVER',async()=>{
  const integration=appRuntimeIntegrationRegistry.find((row)=>row.id===PRODUCT_ID);
  assert.ok(integration);
  assert.equal(integration.uiCategory,ENTRY_DOOR_COVER_UI_CATEGORY);
  assert.equal(integration.packageVersion,'v0.8-R7');
  assert.equal(integration.sourceHash,'6c189dff2197ab095168c308fb6733bd1a0f5a2f336a3352a39ce536ee08230d');
  const runtime=await loadRegisteredRuntime(integration.manufacturer,integration.series);
  assert.ok(runtime);
  assert.equal(runtime.sourcePackageIntegrity?.match,true);
  assert.equal(runtime.normalizedManifest?.formal_status,'FORMAL_PASS');
  assert.equal(runtime.normalizedManifest?.runtime_status,'READY');
  assert.equal(runtime.normalizedManifest?.runtime_file_count,8);
});

test('entry-door cover declarative universe is closed and input-order invariant',()=>{
  const universe=ENTRY_DOOR_COVER_UI_STANDARD_ORDER.map((key,index)=>({key,displayOrder:index+1}));
  const full=applyEntryDoorCoverUiOrder(universe);
  assert.equal(full.length,universe.length);
  assertCanonical(full,'rechent:full-universe');
  for(let i=0;i<universe.length;i+=1){
    for(let j=i+1;j<universe.length;j+=1){
      const a=universe[i],b=universe[j];
      const expected=relativeOrder(full,a.key,b.key);
      const forward=applyEntryDoorCoverUiOrder([a,b]);
      const reverse=applyEntryDoorCoverUiOrder([b,a]);
      assert.equal(relativeOrder(forward,a.key,b.key),expected,`${a.key}+${b.key}:forward`);
      assert.equal(relativeOrder(reverse,a.key,b.key),expected,`${a.key}+${b.key}:reverse`);
      assertCanonical(forward,`${a.key}+${b.key}:forward`);
      assertCanonical(reverse,`${a.key}+${b.key}:reverse`);
    }
  }
  assert.throws(()=>applyEntryDoorCoverUiOrder([{key:'mystery_entry_door_field',displayOrder:1}]),{code:'WINDOW_UI_FIELD_UNMAPPED'});
});

test('Rechent resolver output always passes Global Window Selection Flow',async()=>{
  const initial=await resolveRuntimeAppProduct(PRODUCT_ID,{});
  assert.equal(initial.productId,PRODUCT_ID);
  assert.ok((initial.fields??[]).length>0);
  assertCanonical(initial.fields??[],'rechent:initial');
  const approved=new Set(ENTRY_DOOR_COVER_UI_STANDARD_ORDER);
  for(const field of initial.fields??[])assert.equal(approved.has(field.key),true,`unapproved entry-door field: ${field.key}`);

  let result=initial;
  const visited=new Set();
  let transitions=0;
  for(let step=0;step<16;step+=1){
    const field=(result.fields??[]).find((candidate)=>{
      if(candidate.readOnly||visited.has(candidate.key)||candidate.dataType==='NUMBER'||candidate.dataType==='TEXT')return false;
      return (candidate.values??[]).some((choice)=>choice.disabled!==true);
    });
    if(!field)break;
    visited.add(field.key);
    const choice=(field.values??[]).find((candidate)=>candidate.disabled!==true);
    if(!choice)continue;
    const nextSelection={...(result.selection??{}),[field.key]:field.dataType==='MULTI_ENUM'?[choice.value]:choice.value};
    result=await resolveRuntimeAppProduct(PRODUCT_ID,nextSelection);
    assertCanonical(result.fields??[],`rechent:transition:${field.key}`);
    transitions+=1;
  }
  assert.ok(transitions>0,'Rechent must expose at least one resolver transition');
});

test('Survey Layer delegated fields fail closed until common Survey source is connected',async()=>{
  const result=await resolveRuntimeAppProduct(PRODUCT_ID,{runtime_mode:'SURVEY_LINKED'});
  const delegated=['existing_frame_material','existing_frame_type','fastening_method'];
  for(const key of delegated)assert.ok((result.fields??[]).some((field)=>field.key===key),`missing delegated field ${key}`);
  assert.ok((result.validation?.errors??[]).some((row)=>row.errorCode==='SURVEY_LAYER_VALUE_SOURCE_REQUIRED'));
  assert.equal(result.orderReady,false);
});

test('G12/G15 high-size double keeps the formal manual-check safety exception',async()=>{
  const result=await resolveRuntimeAppProduct(PRODUCT_ID,{
    thermal_spec:'INSULATION_K2_K4',
    opening_type:'DOUBLE',
    design:'G12',
    size_h:2440,
  });
  assert.ok((result.manualWarnings??[]).some((text)=>String(text).includes('HIGH_SIZE_DOUBLE_CHILD_RANGE_UNVERIFIED')));
  assert.equal(result.orderReady,false);
});
