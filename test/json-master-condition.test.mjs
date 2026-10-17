import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateCondition} from '../src/catalog/runtime-master/runtime-condition.mjs';
test('multi-option membership is exact and never treats strings as selected option lists',()=>{
 const condition={field:'options',operator:'CONTAINS',value:'A'};
 for(const [value,expected] of [[['A','B'],true],[['AA'],false],['A',false],[null,false],[[],false]]){
  const state={fields:{options:{value}}};
  assert.equal(evaluateCondition(condition,state),expected);
  assert.equal(evaluateCondition({...condition,operator:'NOT_CONTAINS'},state),!expected);
 }
});
