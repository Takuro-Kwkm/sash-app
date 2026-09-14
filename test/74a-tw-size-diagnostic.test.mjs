import test from 'node:test';
import assert from 'node:assert/strict';
import { getRuntimeMasterEntry } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { loadFormalProductRuntimePackage } from '../src/catalog/runtime-master/formal-product-runtime-loader.mjs';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

const TARGETS=new Set(['SZ431-0224','SZ431-0225']);
function collectMatches(value,path='root',rows=[]){
  if(Array.isArray(value)){value.forEach((item,index)=>collectMatches(item,`${path}[${index}]`,rows));return rows;}
  if(!value||typeof value!=='object')return rows;
  const direct=Object.values(value).some((item)=>typeof item==='string'&&TARGETS.has(item));
  if(direct)rows.push({path,value});
  for(const[key,item]of Object.entries(value))collectMatches(item,`${path}.${key}`,rows);
  return rows;
}

test('diagnostic: inspect raw APW431 duplicate visible size candidates',async()=>{
  const entry=getRuntimeMasterEntry('YKK AP','APW431');
  const runtimePackage=await loadFormalProductRuntimePackage(entry);
  const dimensions=runtimePackage.documents.DIMENSIONS;
  const matches=collectMatches(dimensions).slice(0,100);
  const standardRows=(dimensions.standard_sizes??[]).filter((row)=>TARGETS.has(String(row.id)));
  const candidateRows=(dimensions.integrated_candidates??[]).filter((row)=>TARGETS.has(String(row.sizeId)));
  const customRefs=(dimensions.custom_dimension_rules??[]).filter((row)=>TARGETS.has(String(row.sizeId))||JSON.stringify(row).includes('SZ431-0224')||JSON.stringify(row).includes('SZ431-0225'));
  const selection={window_type:'W431-004',panel_count:'2連窓',region_standard:'北海道',size_mode:'STANDARD'};
  const result=await resolveRuntimeAppProduct('SER-YKK-APW431',selection);
  const targetChoices=(result.fields.find((field)=>field.key==='size')?.values??[]).filter((row)=>TARGETS.has(String(row.value)));
  console.log('APW431_RAW_STANDARD='+JSON.stringify(standardRows));
  console.log('APW431_RAW_CANDIDATES='+JSON.stringify(candidateRows));
  console.log('APW431_RAW_CUSTOM_REFS='+JSON.stringify(customRefs));
  console.log('APW431_RAW_MATCHES='+JSON.stringify(matches));
  console.log('APW431_UI_CHOICES='+JSON.stringify(targetChoices));
  assert.equal(standardRows.length,2);
  assert.equal(targetChoices.length,2);
});
