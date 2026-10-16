import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {selectorMatches} from '../../src/catalog/selector.mjs';
import {validateReviewedWindowFlow} from '../../src/catalog/runtime-master/declared-window-flow.mjs';

const [indexPath,out]=process.argv.slice(2),root=dirname(resolve(indexPath));
const read=p=>JSON.parse(readFileSync(resolve(root,p))),hash=b=>createHash('sha256').update(b).digest('hex');
const index=read(indexPath.startsWith('/')?indexPath:'index.json'),products=[];
for(const entry of index.products){
 const bytes=readFileSync(resolve(root,entry.path));assert.equal(hash(bytes),entry.sha256);
 const document=JSON.parse(bytes),projection=read('projection.json'),master=read(document.baseline.path);
 assert.equal(hash(readFileSync(resolve(root,document.baseline.path))),document.baseline.sha256);
 const tables={...master.masters,...master.maps};let cases=0,rows=0;
 validateReviewedWindowFlow(entry.uiFlowContract);
 for(const field of projection.fields){
  const values=document.product_module.allowedValues.filter(row=>row.specificationKey===field.key);
  for(const join of field.joins??[]){
   for(const row of tables[join.table]){
    const value=values.find(candidate=>Object.is(candidate.value,row[join.value_column]));if(!value)continue;
    const context=Object.fromEntries(Object.entries(join.parents).map(([key,col])=>[key,row[col]]));
    const expected=tables[join.table].some(other=>Object.is(other[join.value_column],value.value)&&Object.entries(join.parents).every(([key,col])=>Object.is(other[col],context[key]))&&join.admitted_states.includes(other[join.status_column??'availability']));
    // One source tuple may also be rejected by another declared map. It may
    // never pass this map when every matching source row rejects it.
    if(!expected)assert.equal(selectorMatches(value.selector,context),false,field.key+':'+join.table);
    const index=1+(field.joins??[]).slice(0,(field.joins??[]).indexOf(join)).filter(prior=>prior.coverage!=='PARTIAL'||tables[prior.table].some(r=>Object.is(r[prior.value_column],value.value))).length;
    assert.equal(selectorMatches(value.selector.all[index],context),expected,field.key+':'+join.table);
    rows++;
   }
   cases++;
  }
 }
 assert.equal(document.product_module.dependencies.filter(r=>r.mode==='MANUAL_CHECK').length,master.confirmations.length);
 assert.equal(document.formal_adoption,false);assert.deepEqual(document.pricing,{price:null,bom:null,set_code:null});
 products.push({id:entry.id,cases,source_rows:rows});
}
const report={status:'PASS',scope:'EXPLICIT_NATIVE_TABLE_TUPLE_PARITY',products,formal_adoption:false,release:false};
writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
