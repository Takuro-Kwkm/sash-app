import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,cpSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {runtimeAppIntegrationInventory,resolveRuntimeAppProduct} from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import {formalComposedRuntimeEntries,readFormalComposedModule} from '../src/catalog/runtime-master/formal-composed-runtime-registry.mjs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {productChoices} from '../src/ui/web/product-choice-model.mjs';

test('formal compositions preserve all adopted rules and choices with only declared identity changes',()=>{
  const index=JSON.parse(readFileSync('changes/replus-runtime-v5/index.json'));
  for(const entry of formalComposedRuntimeEntries){
    const prior=index.products.find(row=>row.series===entry.series);
    if(!prior)continue;
    const doc=JSON.parse(readFileSync(resolve('changes/replus-runtime-v5',prior.path)));
    const module=JSON.parse(JSON.stringify(doc).replaceAll(prior.id,entry.id));
    const actual=readFormalComposedModule(entry).document;
    assert.deepEqual(actual.product_module,module.product_module);
    for(const key of ['composition','selection_migrations','numeric_constraints','linear_transforms','unsupported_rules','pricing'])assert.deepEqual(actual[key],module[key]);
  }
});
test('normal product navigation has one residential choice and seven specifications',()=>{
  const rows=runtimeAppIntegrationInventory();
  const choices=productChoices(rows);assert.equal(choices.filter(row=>row.displayName==='リプラス住宅用').length,1);
  const grouped=rows.filter(row=>row.productSelectionGroup);
  assert.equal(grouped.length,7);
  assert.ok(grouped.every(row=>row.selectable&&row.status==='READY'&&!row.id.startsWith('CANDIDATE:')));
  assert.equal(new Set(grouped.map(row=>row.productSelectionGroup.id)).size,1);
  assert.equal(new Set(grouped.map(row=>row.productSelectionGroup.specificationName)).size,7);
});
test('all formal specifications retain manufacturer review, null price and safe incomplete defaults',async()=>{
  for(const entry of formalComposedRuntimeEntries){
    const result=await resolveRuntimeAppProduct(entry.id,{});
    assert.equal(result.productId,entry.id);assert.equal(result.runtimeMaster.candidateOnly,false);
    assert.equal(result.runtimeCapabilities.formalAdoption,true);
    assert.equal(result.runtimeCapabilities.automaticManufacturing,false);
    assert.equal(result.runtimeCapabilities.automaticPricing,false);
    assert.equal(result.orderReady,false);assert.deepEqual(result.pricing,{price:null,bom:null,set_code:null});
    assert.notEqual(result.validation.status,'VALID');
    if(entry.productSelectionGroup)assert.ok(result.fields.every(field=>field.key!=='construction'));
  }
});
test('changed formal module bytes and escaping paths are refused',()=>{
  const entry=formalComposedRuntimeEntries[0],root=mkdtempSync(join(tmpdir(),'formal-composed-reject-'));
  try{
    cpSync(entry.packageRoot,root,{recursive:true});writeFileSync(resolve(root,entry.path),'{}');
    assert.throws(()=>readFormalComposedModule({...entry,packageRoot:root}),/FORMAL_COMPOSITION_BYTES_CHANGED/);
    assert.throws(()=>readFormalComposedModule({...entry,path:'../outside.json'}),/FORMAL_COMPOSITION_PATH_INVALID/);
  }finally{rmSync(root,{recursive:true,force:true});}
});
test('pre-existing runtime behavior and original hashes stay intact except approved shared labels',async()=>{
  const baseline=JSON.parse(readFileSync('contracts/production/runtime-baselines/preexisting-products.v1.json'));
  const root=mkdtempSync(join(tmpdir(),'retained-runtime-label-baseline-'));
  try{
    const archive=join(root,'retained-source.tar');
    execFileSync('git',['archive','--output='+archive,'f02ddba2e818373c965fd7ff78580ff6f9a25ca0']);
    execFileSync('tar',['-xf',archive,'-C',root]);
    const {resolveRuntimeAppProduct:prior}=await import(pathToFileURL(join(root,'src/catalog/runtime-master/runtime-app-bridge.mjs')).href);
    const withoutLabels=value=>({...value,fields:value.fields.map(({displayLabel,...field})=>field)});
    for(const c of baseline.cases){
      const before=await prior(c.id,c.selection),actual=await resolveRuntimeAppProduct(c.id,c.selection);
      assert.equal(createHash('sha256').update(JSON.stringify(before)).digest('hex'),c.responseSha256,c.id+': original baseline');
      const expected=withoutLabels(before);
      // The retained Main changes only the display separator for exact 3+2 call codes.
      // Preserve the original response hash above and compare actual values/metadata in full.
      expected.fields=expected.fields.map(field=>field.key!=='size'?field:{...field,values:field.values.map(choice=>{
        const metadata=choice.sizeMetadata,code=String(metadata?.callCode??'');
        const oldLabel=`${code} ｜ W ${metadata?.actualW} × H ${metadata?.actualH}`;
        return /^\d{3}-\d{2}$/.test(code)&&choice.displayLabel===oldLabel
          ?{...choice,displayLabel:`${code.replace('-','')} ｜ W ${metadata.actualW} × H ${metadata.actualH}`}:choice;
      })});
      assert.deepEqual(withoutLabels(actual),expected,c.id+': approved common labels and exact nominal display separator only');
    }
  }finally{rmSync(root,{recursive:true,force:true});}
});
