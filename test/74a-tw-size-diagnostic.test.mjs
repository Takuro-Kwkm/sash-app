import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

const PRODUCT='SER-LIXIL-TW';
function panelCount(row){return String(row.configuration??'').includes('4枚建')||/-4(?:$|\D)/.test(String(row.nominal_w??''))?'4枚建':'2枚建';}
async function reachStandardSize(windowType){const selection={window_type:windowType};for(let pass=0;pass<40;pass+=1){const result=await resolveRuntimeAppProduct(PRODUCT,selection);const size=result.fields.find((field)=>field.key==='size');if(size?.values?.length)return result;const missing=result.fields.find((field)=>field.key!=='size'&&field.required&&selection[field.key]===undefined&&field.values?.length);if(!missing)return result;const preferred=missing.key==='size_mode'?missing.values.find((row)=>row.value==='STANDARD'):null;selection[missing.key]=(preferred??missing.values[0]).value;}throw new Error(`STANDARD frontier did not converge: ${windowType}`);}
function refsFor(master,id){const refs=[];for(const[name,rows]of Object.entries(master.sourceRows??{})){if(!Array.isArray(rows))continue;const count=rows.filter((row)=>JSON.stringify(row).includes(id)).length;if(count)refs.push([name,count]);}return refs;}
function semanticRow(row){return{actual_w:row.actual_w,actual_h:row.actual_h,configuration:row.configuration,direction_required:row.direction_required,direction_options:row.direction_options,direction_type:row.direction_type,panel_count:panelCount(row)};}
function fieldSignature(result){return result.fields.map((field)=>[field.key,field.values.map((row)=>row.value)]);}

test('diagnostic: active TW duplicate visible sizes are semantically comparable',async()=>{
  const runtime=await loadRegisteredRuntime('LIXIL','TW');
  const master=runtime.master;
  const sourceById=new Map((master.provider?.sizes??[]).map((row)=>[row.id,row]));
  const windows=master.values.filter((row)=>row.field_name==='window_type'&&row.status==='CURRENT'&&row.runtime_selectable!==false);
  const groups=[];
  for(const window of windows){
    const frontier=await reachStandardSize(window.canonical_value);
    const sizeField=frontier.fields.find((field)=>field.key==='size');
    const byLabel=new Map();
    for(const choice of sizeField?.values??[]){if(!byLabel.has(choice.displayLabel))byLabel.set(choice.displayLabel,[]);byLabel.get(choice.displayLabel).push(choice.value);}
    for(const[label,ids]of byLabel)if(ids.length>1){
      const rows=ids.map((id)=>sourceById.get(id));
      const baseSem=JSON.stringify(semanticRow(rows[0]));
      const sameSemantic=rows.every((row)=>JSON.stringify(semanticRow(row))===baseSem);
      const refs=ids.map((id)=>({id,refs:refsFor(master,id)}));
      const signatures=[];
      for(const id of ids){const resolved=await resolveRuntimeAppProduct(PRODUCT,{...frontier.selection,size:id});signatures.push({id,signature:fieldSignature(resolved),status:resolved.validation?.status});}
      const sameImmediateUi=signatures.every((row)=>JSON.stringify(row.signature)===JSON.stringify(signatures[0].signature)&&row.status===signatures[0].status);
      groups.push({window_type:window.canonical_value,label,ids,rows:rows.map((row)=>({construction:row.construction,...semanticRow(row)})),sameSemantic,sameImmediateUi,refs});
    }
  }
  console.log('TW_ACTIVE_DUPLICATE_COUNTS='+JSON.stringify({groups:groups.length,nonEquivalentSemantic:groups.filter((g)=>!g.sameSemantic).length,nonEquivalentImmediateUi:groups.filter((g)=>!g.sameImmediateUi).length,withExactRefs:groups.filter((g)=>g.refs.some((r)=>r.refs.length)).length}));
  console.log('TW_ACTIVE_DUPLICATE_NON_EQ='+JSON.stringify(groups.filter((g)=>!g.sameSemantic||!g.sameImmediateUi||g.refs.some((r)=>r.refs.length)).slice(0,80)));
  console.log('TW_ACTIVE_DUPLICATE_SAMPLE='+JSON.stringify(groups.slice(0,12)));
  assert.ok(groups.length>0);
});
