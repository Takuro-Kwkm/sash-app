// Fresh selector QA. Products of independent domains are represented as factors,
// not materialized as repeated DFS suffixes. See FACTORIZED_QA.md for proof scope.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { buildSymbolicSafety } from './uchirimo-selector-batch-runner.mjs';

export const NODE_AXES=['room_specification','window_type','sash_configuration','size_class'];
export const GLASS_AXES=['glass_family','glass_structure','low_e_type','glass_coating_color','glass_surface_type','safety_treatment','grille_type','grille_material','muntin_type','vacuum_glass_product','spacer_type','gas_fill'];
const GLASS_OUTPUTS=['glass_spec_id','glass_size_constraint_group','cavity_thickness_mm'];
const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
export const json=x=>JSON.stringify(stable(x));
export const hash=x=>createHash('sha256').update(typeof x==='string'?x:json(x)).digest('hex');
const pick=(x,keys)=>Object.fromEntries(Object.entries(x).filter(([k])=>keys.has(k)));
const present=x=>x!==null&&x!==undefined&&x!=='';
const equal=(a,b)=>json(a)===json(b);
const TECHNICAL=new Set(['legacyConstruction','legacyConfiguration','internal_construction']);
const ACTIONS=new Set(['allow_only','exclude','require','auto_select','fixed_by','auto_formula','auto_calculated_by_size','incompatible','route_exception','evaluate_phase3_r2_reinforcement_master','exclude_scope_classes']);

export function verifySourceContract(contract){
  assert.equal(contract.schema,'UCHIRIMO_SELECTOR_DEPENDENCY_CONTRACT_V1');
  for(const [path,sha] of Object.entries(contract.source_sha256)) assert.equal(hash(readFileSync(path).toString()),sha,`DEPENDENCY_CONTRACT_SOURCE_CHANGED:${path}`);
}

function expressionFields(expression,fields){
  const out=new Set();
  if(!String(expression??'').trim())return [];
  for(const part of expression.split(/\s+(?:AND|OR)\s+/)){
    const match=/^(\w+)\s*(?:(?:==|!=)\s*[^\s]+|in\s+\[[^\]]+\])$/.exec(part.trim());
    assert.ok(match,`UNKNOWN_REQUIRED_WHEN:${expression}`);
    assert.ok(fields.has(match[1]),`UNKNOWN_PREDICATE_FIELD:${match[1]}`);out.add(match[1]);
  }
  return [...out];
}

export function dependencyGraph(runtime){
  const master=runtime.master,fields=new Set(master.fields.map(f=>f.field_name)),edges=[];
  const add=(id,names)=>edges.push({id,fields:[...new Set(names.filter(Boolean))].sort()});
  // Audited read/write scopes of the pinned adapter. Validation only aggregates
  // missing/errors/exceptions; no selection rule reads that aggregate.
  for(const name of fields)add(`node-visibility:${name}`,[...NODE_AXES,name]);
  add('glass-facet-and-identity',[...NODE_AXES,...GLASS_AXES,...GLASS_OUTPUTS]);
  add('bathroom-installation',['room_specification','bathroom_installation_type']);
  add('frame-projection',['frame_installation_mode','frame_projection']);
  add('reinforcement',['extension_frame_type','extension_frame_reinforcement']);
  for(const rule of master.canonical.dependency_rules){
    assert.ok(ACTIONS.has(rule.effect.action),`UNKNOWN_ACTION:${rule.effect.action}`);
    for(const condition of rule.conditions??[])assert.ok(['eq','neq','in'].includes(condition.op),`UNKNOWN_OPERATOR:${condition.op}`);
    add(rule.rule_id,[...(rule.conditions??[]).map(c=>c.field),rule.effect.field,rule.effect.target_field,...Object.keys(rule.effect.also??{}),
      ...(rule.effect.action==='exclude_scope_classes'?[...GLASS_AXES,...GLASS_OUTPUTS]:[]),
      ...(rule.effect.action==='auto_formula'?['size_w','sash_w1','sash_w2','sash_w3','sash_w4']:[]),
      ...(rule.effect.action==='auto_calculated_by_size'?['size_w','size_h']:[])]);
  }
  for(const input of master.sizeInstallation.installation_input_contract.raw_inputs??[])
    add(`required:${input.field_name}`,[input.field_name,...expressionFields(input.required_when,fields)]);
  // Numeric dimensions remain explicit external gates; they never change a
  // discrete selector domain in this adapter, except already-declared sources.
  const excluded=new Set(['size_w','size_h']);
  return {fields,edges,excluded,sinks:buildSymbolicSafety(runtime).independent};
}

export function seedFor(row){
  const extra=JSON.parse(row.partition_seed_json??'{}');
  for(const key of [...NODE_AXES,'glass_family'])assert.ok(!Object.hasOwn(extra,key),`PARTITION_AXIS_COLLISION:${key}`);
  const seed={room_specification:row.room_specification,window_type:row.window_type,glass_family:row.glass_family,...extra};
  for(const k of ['sash_configuration','size_class'])if(row[k]&&row[k]!=='__UNSET__')seed[k]=row[k];
  return seed;
}

export function componentsFor(graph,seed){
  const fixed=new Set(Object.keys(seed));
  // All node axes are frozen, including an absent (not-applicable) axis.
  for(const k of NODE_AXES)fixed.add(k);
  const nodes=new Set([...graph.fields,...GLASS_OUTPUTS].filter(k=>!fixed.has(k)&&!graph.excluded.has(k)));
  const adj=new Map([...nodes].map(k=>[k,new Set()]));
  for(const edge of graph.edges){
    const names=edge.fields.filter(k=>nodes.has(k));
    for(const k of names)for(const other of names)adj.get(k).add(other);
  }
  const components=[];const seen=new Set();
  for(const start of [...nodes].sort()){
    if(seen.has(start))continue;const keys=new Set(),stack=[start];
    while(stack.length){const k=stack.pop();if(seen.has(k))continue;seen.add(k);keys.add(k);stack.push(...adj.get(k));}
    const border=new Set(NODE_AXES),rules=[];
    for(const edge of graph.edges)if(edge.fields.some(k=>keys.has(k))){
      rules.push(edge.id);for(const k of edge.fields)if(fixed.has(k))border.add(k);
    }
    const component={keys:[...keys].sort(),seed:pick(seed,border),rule_ids:rules.sort()};
    component.key=hash(component);component.context_seed=seed;components.push(component);
  }
  return components;
}

function branches(field){
  const values=[...new Map(field.values.filter(v=>!v.disabled).map(v=>[json(v.value),v.value])).values()];
  assert.notEqual(field.dataType,'MULTI_ENUM','MULTI_ENUM_REQUIRES_EXPLICIT_PROOF');
  return [...(field.required?[]:[{kind:'UNSET'}]),...values.map(value=>({kind:'VALUE',value}))];
}
function apply(selection,key,decision){const out={...selection};if(decision.kind==='UNSET')delete out[key];else out[key]=decision.value;return out;}
function survives(result,key,decision,strict=false){
  const field=result.fields.find(f=>f.key===key);
  if(!field)return !strict;
  return decision.kind==='UNSET'?!field.required&&!present(result.selection[key]):equal(result.selection[key],decision.value);
}
function fieldProjection(result,keys){return {fields:result.fields.filter(f=>keys.has(f.key)).map(({displayOrder,...f})=>f),selection:pick(result.selection,keys)};}
function statusFor(result){
  let status=result.validation.errors.length?'INVALID':result.dimensionResult?.status==='BLOCK'?'BLOCKED':result.validation.missingRequiredFields.length?'PENDING':result.dimensionResult?.status==='REVIEW_REQUIRED'?'MANUAL_CHECK':'VALID';
  if(!['INVALID','BLOCKED'].includes(status)&&result.manualWarnings.length)status='MANUAL_CHECK';
  return status;
}
function sinkProjection(result,key){
  const out=structuredClone(result);delete out.selection[key];
  for(const f of out.fields)if(f.key===key)delete f.runtimeState;
  out.validation.missingRequiredFields=out.validation.missingRequiredFields.filter(k=>k!==key);
  delete out.validation.status;return out;
}

export function createFactorizedRunner(runtime,resolve,{maxStates=100000,timeoutMs=600000,onFactor}={}){
  const graph=dependencyGraph(runtime),cache=new Map();let resolverCalls=0,states=0,transitions=0,sinkChecks=0,cacheHits=0;
  const started=performance.now();
  const checked=s=>{assert.ok(performance.now()-started<timeoutMs,'FACTORIZED_QA_TIMEOUT');resolverCalls++;const r=resolve(s);assert.equal(r.validation.status,statusFor(r),'STATUS_AGGREGATION_CONTRACT_CHANGED');for(const f of r.fields){assert.ok(!TECHNICAL.has(f.key),'TECHNICAL_FIELD_VISIBLE');assert.ok(f.semanticStage&&f.semanticSlot,`UI_FIELD_UNMAPPED:${f.key}`);}return r;};
  function factor(component){
    if(cache.has(component.key)){cacheHits++;return cache.get(component.key);}
    const keys=new Set(component.keys),initial=checked(component.context_seed);
    for(const [k,v] of Object.entries(component.context_seed))assert.ok(equal(initial.selection[k],v),`COMPONENT_SEED_REJECTED:${k}`);
    const fixed=Object.fromEntries(Object.entries(component.context_seed).map(([k,value])=>[k,{kind:'VALUE',value}]));
    const outside=new Set(graph.fields.difference(keys));
    // Normalize once: transient warning multiplicity from a prior transition is
    // not a selector domain. Transition results themselves are still inspected.
    const baseline=checked(initial.selection);
    const stack=[{result:baseline,decisions:fixed}],visited=new Set(),terminalKeys=new Set(),terminals=[];
    let count=0n,localTransitions=0,localSinkChecks=0,localRejected=0;
    while(stack.length){
      assert.ok(visited.size<maxStates,'FACTORIZED_COMPONENT_STATE_LIMIT');
      const {result,decisions}=stack.pop();
      assert.deepEqual(fieldProjection(result,outside),fieldProjection(baseline,outside),`UNDECLARED_CROSS_COMPONENT_EFFECT:${component.keys.join(",")}`);
      const visible=new Set(result.fields.map(f=>f.key));
      const ds=Object.fromEntries(Object.entries(decisions).filter(([k])=>visible.has(k)||Object.hasOwn(fixed,k)));
      const stateKey=hash([fieldProjection(result,keys),ds]);if(visited.has(stateKey))continue;visited.add(stateKey);states++;
      const next=result.fields.find(f=>keys.has(f.key)&&!graph.sinks.has(f.key)&&!f.readOnly&&f.dataType!=='NUMBER'&&f.values.some(v=>!v.disabled)&&!Object.hasOwn(ds,f.key));
      if(next){
        for(const decision of branches(next)){
          const child=checked(apply(result.selection,next.key,decision));transitions++;localTransitions++;
          if(!survives(child,next.key,decision)||!Object.entries(ds).every(([k,d])=>survives(child,k,d,Object.hasOwn(fixed,k)))){localRejected++;continue;}
          stack.push({result:child,decisions:{...ds,[next.key]:decision}});
        }
        continue;
      }
      const normalized=checked(result.selection),axes=[];let multiplicity=1n;
      for(const f of normalized.fields.filter(f=>keys.has(f.key)&&graph.sinks.has(f.key)&&!f.readOnly&&f.dataType!=='NUMBER'&&f.values.some(v=>!v.disabled))){
        const domain=branches(f),baselineProjection=hash(sinkProjection(normalized,f.key));
        for(const decision of domain){
          const child=checked(apply(normalized.selection,f.key,decision));sinkChecks++;localSinkChecks++;
          assert.ok(survives(child,f.key,decision),`SINK_VALUE_REJECTED:${f.key}`);
          assert.equal(hash(sinkProjection(child,f.key)),baselineProjection,`SINK_HAS_NONLOCAL_EFFECT:${f.key}`);
        }
        axes.push({field_key:f.key,branches:domain});multiplicity*=BigInt(domain.length);
      }
      const terminal={selection:pick(normalized.selection,keys),field_projection_sha256:hash(fieldProjection(normalized,keys)),validation_status:normalized.validation.status,manual_warnings:normalized.manualWarnings,axes,multiplicity:String(multiplicity)};
      const terminalKey=hash(terminal);if(terminalKeys.has(terminalKey))continue;terminalKeys.add(terminalKey);terminals.push(terminal);count+=multiplicity;
    }
    assert.ok(count>0n,'EMPTY_SELECTOR_COMPONENT');
    const report={component_key:component.key,fields:component.keys,seed:component.seed,dependency_rule_ids:component.rule_ids,states:visited.size,transitions:localTransitions,rejected:localRejected,sink_value_checks:localSinkChecks,terminal_classes:terminals.length,logical_configurations:String(count),terminal_digest:hash(terminals),terminals};
    cache.set(component.key,report);onFactor?.(report);return report;
  }
  return {
    graph,cache,
    run(row){
      const node=runtime.master.canonical.product_nodes.find(n=>n.node_id===row.node_id);
      assert.ok(node,'UNKNOWN_PARENT_NODE');assert.equal(node.room,row.room_specification);assert.equal(node.window_type,row.window_type);
      const seed=seedFor(row),root=checked(seed);for(const[k,v]of Object.entries(seed))assert.ok(equal(root.selection[k],v),`PARENT_SEED_REJECTED:${k}`);
      const components=componentsFor(graph,seed),reports=components.map(factor);
      return {parent_shard:row.shard,partition_key:row.partition_key,component_keys:reports.map(r=>r.component_key),logical_configurations:String(reports.reduce((n,r)=>n*BigInt(r.logical_configurations),1n)),status:'PASS'};
    },
    metrics:()=>({evaluated_controller_states:states,transition_checks:transitions,sink_value_checks:sinkChecks,resolver_calls:resolverCalls,distinct_components:cache.size,component_cache_hits:cacheHits,duration_ms:Math.round((performance.now()-started)*1000)/1000}),
  };
}
