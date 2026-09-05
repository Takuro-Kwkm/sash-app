import test from'node:test';
import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import{createCatalog}from'../src/catalog/catalog-adapter.mjs';
import{stabilizeSelection,getAllowedValues}from'../src/catalog/catalog-resolver.mjs';
import{applySashSalesInputContract,SASH_SALES_INPUT_CONTRACT_VERSION}from'../src/catalog/sash-sales-input-contract.mjs';
import{CURRENT_WINDOW_SERIES_MODULES}from'../src/catalog/modules/current-window-series.mjs';

const catalog=createCatalog(CURRENT_WINDOW_SERIES_MODULES);
const products=['SER-LIX-SAMOS2H','SER-LIX-SAMOSL','SER-YKK-APW430','SER-YKK-APW431'];
const glassKeys=new Set(['glass_base','glass_type','glass_detail','glass_function','glass_additional','glass_spacer','glass_air_layer','glass_gas']);
const glassOrder=(productId,selection={})=>stabilizeSelection(catalog,productId,selection).fields.map((row)=>row.key).filter((key)=>glassKeys.has(key));

test('v1.9 common sales contract is automatically attached to every current sash product',()=>{
  for(const productId of products){
    const product=catalog.products.find((row)=>row.id===productId);
    assert.equal(product.salesInputContractVersion,SASH_SALES_INPUT_CONTRACT_VERSION,productId);
    assert.deepEqual(product.salesInputPolicy.hiddenTechnicalInputs,['construction'],productId);
    assert.equal(stabilizeSelection(catalog,productId,{}).fields.some((row)=>row.key==='construction'),false,productId);
  }
});

test('v1.9 glass input flow is common across all four current sash series',()=>{
  assert.deepEqual(glassOrder('SER-LIX-SAMOS2H',{window_type:'WT-S2H-HIKICHIGAI'}),['glass_base','glass_type','glass_detail','glass_additional','glass_spacer','glass_gas']);
  assert.deepEqual(glassOrder('SER-LIX-SAMOSL',{window_type:'WT-SL-HIKICHIGAI'}),['glass_base','glass_type','glass_detail','glass_function','glass_spacer','glass_air_layer']);
  assert.deepEqual(glassOrder('SER-YKK-APW430',{window_type:'SWT-YKK-APW430-FIX-MADO'}),['glass_base','glass_type','glass_detail','glass_additional','glass_spacer','glass_air_layer']);
  assert.deepEqual(glassOrder('SER-YKK-APW431',{window_type:'W431-001'}),['glass_base','glass_type','glass_detail','glass_additional','glass_spacer','glass_air_layer']);
});

test('v1.9 manufacturer-native glass labels are source-backed and no unavailable value is fabricated',()=>{
  const labels=(productId,key,selection={})=>getAllowedValues(catalog,productId,key,selection).map((row)=>row.displayLabel);
  assert.deepEqual(labels('SER-LIX-SAMOSL','glass_detail',{window_type:'WT-SL-HIKICHIGAI',glass_base:'LOWE'}),['クリア','グリーン','クリア（高日射取得）','グリーン（高遮熱）']);
  assert.deepEqual(labels('SER-YKK-APW430','glass_detail',{glass_base:'LOWE'}),['クリア（日射取得型）','ブルー（日射遮蔽型）','ブロンズ（日射遮蔽型）','ニュートラル（日射遮蔽型）']);
  assert.deepEqual(getAllowedValues(catalog,'SER-YKK-APW430','glass_type',{glass_base:'LOWE'}).map((row)=>row.value),['CLEAR','PATTERN']);
  assert.deepEqual(getAllowedValues(catalog,'SER-YKK-APW431','glass_type',{glass_base:'LOWE'}).map((row)=>row.value),['CLEAR','PATTERN','FROST']);
});

test('v1.9 size modes are generated from connected formal capabilities rather than product-specific UI lists',()=>{
  assert.deepEqual(getAllowedValues(catalog,'SER-LIX-SAMOSL','size_mode',{window_type:'WT-SL-HIKICHIGAI'}).map((row)=>row.value),['STANDARD','CUSTOM']);
  assert.ok(getAllowedValues(catalog,'SER-YKK-APW431','size_mode',{window_type:'W431-001'}).map((row)=>row.value).includes('CUSTOM'));
  assert.deepEqual(getAllowedValues(catalog,'SER-LIX-SAMOS2H','size_mode',{window_type:'WT-S2H-HIKICHIGAI'}).map((row)=>row.value),['STANDARD','CUSTOM']);
  assert.deepEqual(getAllowedValues(catalog,'SER-YKK-APW430','size_mode',{window_type:'SWT-YKK-APW430-FIX-MADO'}).map((row)=>row.value),['STANDARD','CUSTOM']);
});

test('v1.9 future sash modules inherit field order and hidden construction without manufacturer branches',async()=>{
  const synthetic={product:{id:'SER-FUTURE-001',category:'サッシ'},specificationDefinitions:[
    {key:'construction',displayLabel:'工法',displayOrder:15},
    {key:'glass_spacer',displayLabel:'old spacer',displayOrder:30},
    {key:'glass_detail',displayLabel:'old detail',displayOrder:40},
    {key:'glass_base',displayLabel:'old base',displayOrder:50},
    {key:'glass_air_layer',displayLabel:'old air',displayOrder:60},
    {key:'glass_type',displayLabel:'old type',displayOrder:70},
    {key:'glass_additional',displayLabel:'old add',displayOrder:80}
  ]};
  const normalized=applySashSalesInputContract(synthetic);
  const map=new Map(normalized.specificationDefinitions.map((row)=>[row.key,row]));
  assert.equal(map.get('construction').presentationHidden,true);
  assert.deepEqual(['glass_base','glass_type','glass_detail','glass_additional','glass_spacer','glass_air_layer'].map((key)=>[map.get(key).displayLabel,map.get(key).displayOrder]),[
    ['ガラス',120],['ガラス種',130],['ガラス詳細',140],['ガラス追加機能',150],['スペーサー',160],['中空層',170]
  ]);
  const source=await readFile(new URL('../src/catalog/sash-sales-input-contract.mjs',import.meta.url),'utf8');
  assert.equal(/LIXIL|YKK|サーモス|APW|SER-LIX|SER-YKK/.test(source),false);
});
