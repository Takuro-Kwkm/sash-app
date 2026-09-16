import test from 'node:test';
import assert from 'node:assert/strict';
import { appRuntimeIntegrationRegistry } from '../src/catalog/runtime-master/app-runtime-integration-registry.mjs';
import { loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import {
  NEW_CONSTRUCTION_EXTERIOR_WINDOW_UI_CATEGORY,
  applyRuntimeUiCategoryOrder,
  shouldExposeNewConstructionRuntimeField,
} from '../src/catalog/runtime-master/new-construction-sash-runtime-ui-contract.mjs';
import {
  INNER_WINDOW_UI_CATEGORY,
  shouldExposeInnerWindowRuntimeField,
} from '../src/catalog/runtime-master/inner-window-runtime-ui-contract.mjs';
import { GLOBAL_WINDOW_STAGE_ORDER } from '../src/catalog/runtime-master/global-window-selection-flow-engine.mjs';

const stageIndex = new Map(GLOBAL_WINDOW_STAGE_ORDER.map((stage,index)=>[stage,index]));

function normalizedField(definition,index){
  const key=definition.field_name??definition.key;
  return {
    key,
    field_name:key,
    domain:definition.domain??null,
    displayOrder:Number(definition.display_order??definition.displayOrder??index+1),
    runtimeIncluded:definition.runtime_included,
    runtime_included:definition.runtime_included,
    technical:definition.technical,
    internal:definition.internal,
    visibilityMode:definition.visibility_mode,
    visibility_mode:definition.visibility_mode,
    initialVisibility:definition.initial_visibility,
    initial_visibility:definition.initial_visibility,
    selectionMode:definition.selection_mode,
    selection_mode:definition.selection_mode,
    showReadOnly:definition.show_read_only,
    show_read_only:definition.show_read_only,
  };
}

function exposed(integration,field){
  if(integration.uiCategory===NEW_CONSTRUCTION_EXTERIOR_WINDOW_UI_CATEGORY)return shouldExposeNewConstructionRuntimeField(field);
  if(integration.uiCategory===INNER_WINDOW_UI_CATEGORY)return shouldExposeInnerWindowRuntimeField(field);
  return false;
}

function assertCanonical(rows,label){
  let previous=-1;
  for(const row of rows){
    assert.ok(row.semanticSlot,`${label}:${row.key}:semanticSlot`);
    assert.ok(row.semanticStage,`${label}:${row.key}:semanticStage`);
    const current=stageIndex.get(row.semanticStage);
    assert.notEqual(current,undefined,`${label}:${row.key}:unknown-stage:${row.semanticStage}`);
    assert.ok(current>=previous,`${label}:${row.key}:stage-inversion`);
    previous=current;
  }
}

function relativeOrder(rows,a,b){
  const keys=rows.map((row)=>row.key);
  return Math.sign(keys.indexOf(a)-keys.indexOf(b));
}

test('FULL_FLOW_SIGNATURE_COVERAGE: every registered user-facing field universe is closed and pairwise order is input-order invariant',async()=>{
  let fieldCount=0;
  let pairCount=0;
  for(const integration of appRuntimeIntegrationRegistry){
    const runtime=await loadRegisteredRuntime(integration.manufacturer,integration.series);
    const universe=(runtime?.master?.fields??[]).map(normalizedField).filter((field)=>exposed(integration,field));
    assert.equal(new Set(universe.map((field)=>field.key)).size,universe.length,`${integration.id}:duplicate-user-facing-key`);
    const full=applyRuntimeUiCategoryOrder(universe,integration);
    assert.equal(full.length,universe.length,`${integration.id}:field-loss`);
    assertCanonical(full,`${integration.id}:full`);
    fieldCount+=full.length;

    for(let i=0;i<universe.length;i+=1){
      for(let j=i+1;j<universe.length;j+=1){
        const a=universe[i],b=universe[j];
        const forward=applyRuntimeUiCategoryOrder([a,b],integration);
        const reverse=applyRuntimeUiCategoryOrder([b,a],integration);
        assertCanonical(forward,`${integration.id}:${a.key}+${b.key}:forward`);
        assertCanonical(reverse,`${integration.id}:${a.key}+${b.key}:reverse`);
        const expected=relativeOrder(full,a.key,b.key);
        assert.notEqual(expected,0,`${integration.id}:${a.key}+${b.key}:ambiguous-full-order`);
        assert.equal(relativeOrder(forward,a.key,b.key),expected,`${integration.id}:${a.key}+${b.key}:forward-order`);
        assert.equal(relativeOrder(reverse,a.key,b.key),expected,`${integration.id}:${a.key}+${b.key}:input-order-dependent`);
        pairCount+=1;
      }
    }
  }
  assert.equal(appRuntimeIntegrationRegistry.length,8);
  assert.ok(fieldCount>0);
  assert.ok(pairCount>0);
});

test('FLOW_TRANSITION: actual resolver state changes preserve canonical stage order',async()=>{
  let transitions=0;
  for(const integration of appRuntimeIntegrationRegistry){
    let result=await resolveRuntimeAppProduct(integration.id,{});
    assertCanonical(result.fields??[],`${integration.id}:initial`);
    const visited=new Set();
    for(let step=0;step<12;step+=1){
      const field=(result.fields??[]).find((candidate)=>{
        if(candidate.readOnly||visited.has(candidate.key))return false;
        return (candidate.values??[]).some((choice)=>choice.disabled!==true);
      });
      if(!field)break;
      visited.add(field.key);
      const choices=(field.values??[]).filter((choice)=>choice.disabled!==true);
      if(!choices.length)continue;
      const nextSelection={...(result.selection??{}),[field.key]:field.dataType==='MULTI_ENUM'?[choices[0].value]:choices[0].value};
      const next=await resolveRuntimeAppProduct(integration.id,nextSelection);
      assertCanonical(next.fields??[],`${integration.id}:step-${step}:set-${field.key}`);
      transitions+=1;

      if(choices.length>1){
        const changedSelection={...(next.selection??{}),[field.key]:field.dataType==='MULTI_ENUM'?[choices[1].value]:choices[1].value};
        const changed=await resolveRuntimeAppProduct(integration.id,changedSelection);
        assertCanonical(changed.fields??[],`${integration.id}:step-${step}:change-${field.key}`);
        result=changed;
        transitions+=1;
      }else{
        result=next;
      }
    }
  }
  assert.ok(transitions>=8,`expected transitions across all integrations, got ${transitions}`);
});
