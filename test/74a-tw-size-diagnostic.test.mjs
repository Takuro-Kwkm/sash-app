import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
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

test('diagnostic: inspect APW431 duplicate visible size candidates',async()=>{
  const runtime=await loadRegisteredRuntime('YKK AP','APW431');
  const matches=collectMatches(runtime).slice(0,100);
  const selection={window_type:'W431-004',panel_count:'2連窓',region_standard:'北海道',size_mode:'STANDARD'};
  const result=await resolveRuntimeAppProduct('SER-YKK-APW431',selection);
  const sizes=result.fields.find((field)=>field.key==='size')?.values??[];
  const targetChoices=sizes.filter((row)=>TARGETS.has(String(row.value)));
  const downstream=[];
  for(const choice of targetChoices){
    const resolved=await resolveRuntimeAppProduct('SER-YKK-APW431',{...selection,size:choice.value});
    downstream.push({id:choice.value,selection:resolved.selection,fields:resolved.fields.map((field)=>({key:field.key,values:field.values.map((row)=>row.value)})),dimensionResult:resolved.dimensionResult,validation:resolved.validation});
  }
  console.log('APW431_DUPLICATE_MATCHES='+JSON.stringify(matches));
  console.log('APW431_DUPLICATE_CHOICES='+JSON.stringify(targetChoices));
  console.log('APW431_DUPLICATE_DOWNSTREAM='+JSON.stringify(downstream));
  assert.equal(targetChoices.length,2);
});
