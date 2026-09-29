import test from 'node:test';
import assert from 'node:assert/strict';
import {loadAdoptedSlimQaRuntime} from '../scripts/governance/uchirimo-adopted-slim-runtime.mjs';
import {resolveFormalRuntimeProduct as resolveRuntimeAppProduct} from './helpers/formal-runtime-result.mjs';

test('application registration loads the adopted Slim bytes and real rule engine',async()=>{
 const {candidate,runtime,resolve}=await loadAdoptedSlimQaRuntime();
 for(const node of candidate.canonical.product_nodes){
  const seed={room_specification:node.room,window_type:node.window_type};
  if(node.window_type==='sliding_window')Object.assign(seed,{sash_configuration:node.sash_configuration,size_class:node.size_class});
  const actual=await resolveRuntimeAppProduct('SER-YKKAP-UCHIRIMO',seed);
  assert.deepEqual(actual,resolve(seed));assert.equal(actual.orderReady,false);
 }
 assert.equal(runtime.master.canonical.glass_node_matrix,undefined);
 assert.equal(runtime.master.canonical.glass_rule_model.identities.length,566);
});
