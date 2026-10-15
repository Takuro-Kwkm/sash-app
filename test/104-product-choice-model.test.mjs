import test from 'node:test';
import assert from 'node:assert/strict';
import {productChoices,choiceForMember,memberForChoice} from '../src/ui/web/product-choice-model.mjs';

const member=(id,name,extra={})=>({id,manufacturer:'メーカーA',productSelectionGroup:{id:'GROUP',displayName:'共通商品',specificationLabel:'仕様',specificationName:name},...extra});
test('declared specifications collapse into one product choice without changing identities',()=>{
  const one=member('ONE','仕様A'),two=member('TWO','仕様B'),standalone={id:'OTHER',manufacturer:'メーカーA',displayName:'別商品'};
  const choices=productChoices([standalone,one,two]);
  assert.equal(choices.length,2);assert.equal(choices[0],standalone);
  assert.equal(choices[1].displayName,'共通商品');assert.deepEqual(choices[1].members,[one,two]);
  assert.equal(choiceForMember(choices,'TWO'),choices[1]);assert.equal(memberForChoice(choices[1],'TWO'),two);
  assert.equal(memberForChoice(choices[1],'OTHER'),undefined);
});
test('blocked specifications cannot be selected and all-blocked groups are unavailable',()=>{
  const blocked=member('ONE','仕様A',{selectable:false}),ready=member('TWO','仕様B');
  const [group]=productChoices([blocked,ready]);assert.equal(group.selectable,true);assert.equal(memberForChoice(group,'ONE'),undefined);
  assert.equal(productChoices([blocked])[0].selectable,false);
});
test('inconsistent manufacturer or group labels fail closed',()=>{
  assert.throws(()=>productChoices([member('ONE','仕様A'),member('TWO','仕様B',{manufacturer:'メーカーB'})]),/CONFLICT/);
  const other=member('TWO','仕様B');other.productSelectionGroup.displayName='別の商品';
  assert.throws(()=>productChoices([member('ONE','仕様A'),other]),/CONFLICT/);
});
test('ambiguous IDs and specification labels fail closed',()=>{
  assert.throws(()=>productChoices([member('ONE','仕様A'),member('ONE','仕様B')]),/DUPLICATE/);
  assert.throws(()=>productChoices([member('GROUP','仕様A')]),/INVALID/);
  assert.throws(()=>productChoices([member('ONE','仕様A'),member('TWO','仕様A')]),/CONFLICT/);
});
test('standalone product behavior does not acquire a specification selector',()=>{
  const product={id:'PLAIN',manufacturer:'メーカーA',selectable:true};
  const choices=productChoices([product]);assert.deepEqual(choices,[product]);assert.equal(choiceForMember(choices,'PLAIN'),product);
  assert.equal(memberForChoice(product,'PLAIN'),null);assert.equal(choiceForMember(choices,'UNKNOWN'),undefined);
});
