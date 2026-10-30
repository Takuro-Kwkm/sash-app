import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {selectorMatches} from '../../src/catalog/selector.mjs';
import {validateReviewedWindowFlow} from '../../src/catalog/runtime-master/declared-window-flow.mjs';
assert.ok(process.argv[2],'Explicit private captured root required');
const captured=resolve(process.argv[2]);
const read=path=>JSON.parse(readFileSync(resolve(captured,path)));
test('generic comparison evaluates data operands and rejects malformed declarations',()=>{
 for(const [operator,a,b,wanted] of [['eq',640,640,true],['eq',640,500,false],['ne',640,500,true],['gte',640,640,true],['lte',640,500,false]])assert.equal(selectorMatches({a:{$compare:{operator,field:'b'}}},{a,b}),wanted);
 assert.equal(selectorMatches({a:{$compare:{operator:'eq',field:'b'}}},{a:1}),false);
 assert.equal(selectorMatches({a:{$compare:{operator:'unknown',field:'b'}}},{a:1,b:1}),false);
});
test('existing literal selectors retain absent, negated and numeric behavior',()=>{
 assert.equal(selectorMatches({not:{a:'X'}},{}),true);assert.equal(selectorMatches({a:{$exists:false}},{}),true);
 assert.equal(selectorMatches({a:{$in:[1,2]}},{a:2}),true);assert.equal(selectorMatches({a:{$gte:3}},{a:2}),false);
});
test('screen declaration follows independent ordering while retaining dependencies',()=>{
 const flow=read('review/flow.json');validateReviewedWindowFlow(flow);
 assert.ok(flow.fields.screen_midrail.rank<flow.fields.screen_net.rank);
 assert.ok(flow.fields.glass_extra.rank<flow.fields.glass_spacer.rank);
 assert.ok(flow.fields.glass_spacer.rank<flow.fields.glass_gas.rank);
 assert.deepEqual(flow.fields.glass_spacer.deferredEvaluationParents,['glass_gas']);
 const prior=structuredClone(flow);prior.schema='REVIEWED_WINDOW_FLOW_V3';
 assert.throws(()=>validateReviewedWindowFlow(prior),{code:'WINDOW_FLOW_DEFERRED_PARENT_INVALID'});
});
test('deferred evaluation cannot hide an undeclared parent or a dependency cycle',()=>{
 const flow=read('review/flow.json');flow.fields.glass_gas.evaluationContext=false;
 assert.throws(()=>validateReviewedWindowFlow(flow),{code:'WINDOW_FLOW_DEFERRED_PARENT_INVALID'});
 const cyclic=read('review/flow.json');cyclic.fields.window.parents=['configuration'];
 assert.throws(()=>validateReviewedWindowFlow(cyclic));
});
test('native candidate keeps Human, actual DOM and release boundaries',()=>{
 const requirements=read('review/independent-requirements.json');const index=read('index.json');const module=read('candidates/module.json');
 assert.equal(requirements.human_review,'REQUIRED_BEFORE_INTEGRATION_QA');assert.equal(requirements.release,false);
 assert.equal(index.products[0].uiFlowContract.status,'HUMAN_REVIEW_PENDING');assert.equal(module.formal_adoption,false);
 assert.deepEqual(module.pricing,{price:null,bom:null,set_code:null});
 const options=module.product_module.specificationDefinitions.find(x=>x.key==='options');assert.equal(options.dataType,'MULTI_ENUM');
 const qa=read('review/browser-qa.json');assert.ok(qa.rows.some(x=>x.checkbox_groups?.includes('options')));assert.ok(qa.rows.some(x=>x.legacy_saved_values));
});
