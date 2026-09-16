import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

const PRODUCT_ID='SER-LIX-EW';
const values=(result,key)=>result.fields.find((row)=>row.key===key)?.values?.map((row)=>row.value)??[];

async function chooseFirst(selection,key){
  const before=await resolveRuntimeAppProduct(PRODUCT_ID,selection);
  const value=values(before,key)[0];
  assert.ok(value,`${key} must expose at least one value`);
  const next={...selection,[key]:value};
  const result=await resolveRuntimeAppProduct(PRODUCT_ID,next);
  return {selection:result.selection,result,value};
}

test('EW SOTODAOSHI valid CUSTOM geometry filters formal glass candidates and preserves estimate confirmation',async()=>{
  let selection={
    window_type:'WT-EW-SOTODAOSHI',
    window_spec:'SP-EW-Y-1',
    size_mode:'CUSTOM',
    custom_w:500,
    custom_h:400,
  };
  let result=await resolveRuntimeAppProduct(PRODUCT_ID,selection);
  assert.equal(result.validation.errors.some((row)=>row.errorCode==='CUSTOM_SIZE_OUT_OF_RANGE'),false,JSON.stringify(result.validation));
  selection=result.selection;

  ({selection,result}=await chooseFirst(selection,'exterior_color'));
  ({selection,result}=await chooseFirst(selection,'interior_color'));

  const beforeGlass=await resolveRuntimeAppProduct(PRODUCT_ID,selection);
  assert.deepEqual(values(beforeGlass,'glass_base'),['GL-EW-LOWE-PG','GL-EW-PG']);
  assert.equal(values(beforeGlass,'glass_base').includes('GL-EW-TG'),false);

  ({selection,result}=await chooseFirst(selection,'glass_base'));
  assert.equal(result.validation.status,'MANUAL_CHECK',JSON.stringify({selection:result.selection,validation:result.validation,clearedFields:result.clearedFields,notices:result.notices}));
  assert.deepEqual(result.validation.errors,[]);
  assert.ok(result.notices.some((message)=>message.includes('manufacturer estimate')));
});
