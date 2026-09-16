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

test('EW SOTODAOSHI valid CUSTOM geometry remains valid through finish and first formal glass selection',async()=>{
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
  ({selection,result}=await chooseFirst(selection,'glass_base'));

  assert.equal(result.validation.status,'VALID',JSON.stringify({selection:result.selection,validation:result.validation,clearedFields:result.clearedFields,notices:result.notices}));
});
