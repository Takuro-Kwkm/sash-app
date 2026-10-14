import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {adaptComposedProductRuntime} from '../src/catalog/runtime-master/composed-product-runtime-adapter.mjs';
import {applyDeclaredWindowFlow} from '../src/catalog/runtime-master/declared-window-flow.mjs';
import {applyDeclaredSelectionLinks} from '../src/catalog/runtime-master/declared-selection-policy.mjs';
const root='changes/replus-runtime-v5',index=JSON.parse(readFileSync(root+'/index.json'));
test('hidden confirmations stay in calculation while public fields, feedback and duplicate part notice are omitted',async()=>{
 for(const name of ['RPL_ROOM','RPL_TW','RPL_EW','RPL_BATH']){
  const entry=index.products.find(e=>e.id==='CANDIDATE:'+name),doc=JSON.parse(readFileSync(root+'/'+entry.path));
  const adapter=await adaptComposedProductRuntime(doc,entry,()=>{throw Error('Unexpected reference');});
  const result=adapter.uiResolver({window_type:name+'_SLD',color_mode:'FREE',sash_exterior_color:'G',sash_interior_color:name==='RPL_EW'?'F':'M',installation_method:'INNER_FIT_INSET',bathroom_remodel_mode:'WINDOW_ONLY'});
  const publicFields=applyDeclaredWindowFlow(result.fields,entry);
  for(const key of ['inner_fit_required_component','exterior_cover_color',name==='RPL_EW'?'interior_resin_cover_color':'interior_cover_color']){
   assert.ok(result.selection[key],name+':'+key);
   assert.ok(result.fields.find(f=>f.key===key).readOnly);
   assert.equal(publicFields.find(f=>f.key===key),undefined);
  }
  assert.ok(publicFields.find(f=>f.key==='installation_method'));
  assert.ok(publicFields.find(f=>f.key==='interior_cover_type'));
  assert.ok(publicFields.find(f=>f.key==='exterior_cover_type'));
  assert.ok(!result.manualWarnings.some(w=>w.includes('既設上枠ベース材')));
  assert.ok(result.manualWarnings.some(w=>w.includes('内はめ用の製作範囲')));
  assert.equal(result.pricing.price,null);assert.equal(result.orderReady,false);
 }
});
test('internal notice suppression requires explicit policy and a successfully resolved mapping; other holds remain',()=>{
 const rule={targetField:'part',parents:['method'],cases:[{when:{method:'INNER'},value:'BASE'}],resolvedNoticeVisibility:'INTERNAL_ONLY',resolvedMessage:'Required',pendingMessage:'Pending',unavailableMessage:'Mapping unavailable'};
 const module={product:{id:'TEST'},allowedValues:[{specificationKey:'part',displayLabel:'Base'}],ruleSets:[{type:'SELECTION_LINKS',payload:[rule]}]};
 const make=internal=>({selection:{method:'INNER'},fields:[{key:'part',internal,values:[{value:'BASE'}]}],manualWarnings:['Base: 公式資料で最終確認','Price unknown','Suitability unknown']});
 let r=make(true);applyDeclaredSelectionLinks(r,module);assert.deepEqual(r.manualWarnings,['Price unknown','Suitability unknown']);assert.equal(r.selection.part,'BASE');
 r=make(false);applyDeclaredSelectionLinks(r,module);assert.equal(r.manualWarnings.length,3);
 r=make(true);const ordinary={...module,ruleSets:[{type:'SELECTION_LINKS',payload:[{...rule,resolvedNoticeVisibility:undefined}]}]};applyDeclaredSelectionLinks(r,ordinary);assert.equal(r.manualWarnings.length,3);
 r=make(true);r.selection.method='UNKNOWN';applyDeclaredSelectionLinks(r,module);assert.ok(r.manualWarnings.includes('Mapping unavailable'));assert.equal(r.selection.part,undefined);
});
