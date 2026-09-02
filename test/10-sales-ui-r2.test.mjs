import test from'node:test';
import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import{createCatalog,catalogInventory}from'../src/catalog/catalog-adapter.mjs';
import{stabilizeSelection,getAllowedValues}from'../src/catalog/catalog-resolver.mjs';
import{matchingDimensionRules,matchingStandardSizeRecords}from'../src/catalog/size-availability.mjs';
import{CURRENT_WINDOW_SERIES_MODULES}from'../src/catalog/modules/current-window-series.mjs';
import{THERMOSL_SOURCE}from'../src/catalog/modules/thermosl-source.mjs';

const catalog=createCatalog(CURRENT_WINDOW_SERIES_MODULES);
const ids={s2h:'SER-LIX-SAMOS2H',sl:'SER-LIX-SAMOSL',a430:'SER-YKK-APW430',a431:'SER-YKK-APW431'};
const field=(productId,selection,key)=>stabilizeSelection(catalog,productId,selection).fields.find((row)=>row.key===key);
const fieldOrder=(productId,selection={})=>stabilizeSelection(catalog,productId,selection).fields.map((row)=>row.key);
const values=(productId,key,selection={})=>getAllowedValues(catalog,productId,key,selection).map((row)=>row.value);

test('122 LIXIL glass order is detail, spacer, then air layer',()=>{
  const s2h=fieldOrder(ids.s2h,{window_type:'WT-S2H-HIKICHIGAI'});
  assert.ok(s2h.indexOf('glass_base')<s2h.indexOf('glass_detail'));
  assert.ok(s2h.indexOf('glass_detail')<s2h.indexOf('glass_spacer'));
  assert.ok(s2h.indexOf('glass_spacer')<s2h.indexOf('glass_gas'));
  const sl=fieldOrder(ids.sl,{window_type:'WT-SL-HIKICHIGAI'});
  assert.ok(sl.indexOf('glass_base')<sl.indexOf('glass_detail'));
  assert.ok(sl.indexOf('glass_detail')<sl.indexOf('glass_spacer'));
  assert.ok(sl.indexOf('glass_spacer')<sl.indexOf('glass_air_layer'));
  assert.ok(sl.indexOf('glass_air_layer')<sl.indexOf('glass_type'));
});

test('123 resin spacer exposes argon only from formal LIXIL glass rows',()=>{
  assert.deepEqual(values(ids.s2h,'glass_gas',{glass_base:'LOWE',glass_detail:'GL-S2H-LOWE-CLEAR',glass_spacer:'RESIN'}),['ARGON']);
  assert.deepEqual(values(ids.sl,'glass_air_layer',{glass_base:'LOWE',glass_detail:'GL-SL-001',glass_spacer:'RESIN'}),['ARGON']);
});

test('124 changing spacer clears an invalid air layer and stabilizes to the valid candidate',()=>{
  const s2h=stabilizeSelection(catalog,ids.s2h,{window_type:'WT-S2H-HIKICHIGAI',glass_base:'LOWE',glass_detail:'GL-S2H-LOWE-CLEAR',glass_spacer:'RESIN',glass_gas:'DRY_AIR'});
  assert.equal(s2h.selection.glass_gas,'ARGON');
  assert.equal(s2h.fields.find((row)=>row.key==='glass_gas').values.length,1);
  const sl=stabilizeSelection(catalog,ids.sl,{window_type:'WT-SL-HIKICHIGAI',glass_base:'LOWE',glass_detail:'GL-SL-001',glass_spacer:'RESIN',glass_air_layer:'DRY_AIR'});
  assert.equal(sl.selection.glass_air_layer,'ARGON');
  assert.equal(sl.fields.find((row)=>row.key==='glass_air_layer').values.length,1);
});

test('125 Thermos L manual standard shutter sizes are 97 and runtime-exact',()=>{
  const canonical=THERMOSL_SOURCE.sizes.filter((row)=>row.active&&row.window==='WT-SL-SHUTTER-HIKI'&&row.spec==='SP-SL-SHUT-M-STD');
  assert.equal(canonical.length,97);
  assert.equal(canonical.filter((row)=>row.construction==='在来・204').length,51);
  assert.equal(canonical.filter((row)=>row.construction==='在来').length,46);
  assert.equal(new Set(canonical.map((row)=>row.id)).size,97);
  assert.equal(new Set(canonical.map((row)=>`${row.construction}|${row.callCode}`)).size,97);
  for(const[construction,count]of[['在来・204',51],['在来',46]]){
    const sourceRows=canonical.filter((row)=>row.construction===construction);
    const runtime=field(ids.sl,{window_type:'WT-SL-SHUTTER-HIKI',shutter_type:'SP-SL-SHUT-M-STD',size_mode:'STANDARD',construction},'size').values;
    assert.equal(runtime.length,count,construction);
    assert.deepEqual(new Set(runtime.map((row)=>row.value)),new Set(sourceRows.map((row)=>row.id)),construction);
  }
});

test('126 Thermos L shutter type and construction each re-evaluate exact canonical records',()=>{
  const scenarios=[['SP-SL-SHUT-M-STD','在来・204',51],['SP-SL-SHUT-M-STD','在来',46],['SP-SL-SHUT-E-STD','在来',52],['SP-SL-SHUT-E-VENT','在来',40],['SP-SL-SHUT-E-WIND','204',3]];
  for(const[shutter,construction,count]of scenarios){
    const canonical=THERMOSL_SOURCE.sizes.filter((row)=>row.active&&row.window==='WT-SL-SHUTTER-HIKI'&&row.spec===shutter&&row.construction===construction);
    const runtime=field(ids.sl,{window_type:'WT-SL-SHUTTER-HIKI',shutter_type:shutter,size_mode:'STANDARD',construction},'size').values;
    assert.equal(canonical.length,count,`${shutter}:${construction}:canonical`);
    assert.equal(runtime.length,count,`${shutter}:${construction}:runtime`);
    assert.deepEqual(new Set(runtime.map((row)=>row.value)),new Set(canonical.map((row)=>row.id)),`${shutter}:${construction}:ids`);
  }
});

test('127 all 65 ACTIVE windows derive CUSTOM availability from matching Dimension Rules',()=>{
  let windows=0,customWindows=0,standardOnly=0;
  for(const productId of Object.values(ids)){
    const windowField=field(productId,{},'window_type');
    for(const window of windowField.values){
      windows+=1;
      const selection={window_type:window.value};
      const matchingRules=matchingDimensionRules(catalog,productId,selection);
      const modes=values(productId,'size_mode',selection);
      const custom=modes.includes('CUSTOM');
      assert.equal(custom,matchingRules.length>0,`${productId}:${window.value}`);
      assert.equal(modes.includes('STANDARD'),matchingStandardSizeRecords(catalog,productId,selection).length>0,`${productId}:${window.value}:standard`);
      if(custom)customWindows+=1;else standardOnly+=1;
    }
  }
  assert.deepEqual({windows,customWindows,standardOnly},{windows:65,customWindows:23,standardOnly:42});
});

test('128 every formal Dimension Rule has a UI-reachable CUSTOM witness',()=>{
  for(const productId of[ids.sl,ids.a431]){
    const rules=catalog.ruleSets.filter((row)=>row.productId===productId&&row.type==='DIMENSION_RULES').flatMap((row)=>row.payload);
    for(const rule of rules){
      const selection={...rule.selector};delete selection.size_mode;
      if(selection.specific_spec){
        const spec=selection.specific_spec;delete selection.specific_spec;
        const candidate=catalog.allowedValues.find((row)=>row.productId===productId&&row.metadata?.specific_spec===spec);
        assert.ok(candidate,`${productId}:${rule.id}:spec`);selection[candidate.specificationKey]=candidate.value;
      }
      const modes=values(productId,'size_mode',selection);
      assert.ok(modes.includes('CUSTOM'),`${productId}:${rule.id}:custom`);
      const result=stabilizeSelection(catalog,productId,{...selection,size_mode:'CUSTOM'});
      assert.equal(result.selection.size_mode,'CUSTOM',`${productId}:${rule.id}:stabilized`);
    }
  }
});

test('129 STANDARD and CUSTOM clear mutually exclusive values',()=>{
  const standard=stabilizeSelection(catalog,ids.sl,{window_type:'WT-SL-HIKICHIGAI',size_mode:'STANDARD',construction:'在来・204',size:'SZ-SL-000001',custom_width:1000,custom_height:1000});
  assert.equal(standard.selection.custom_width,undefined);assert.equal(standard.selection.custom_height,undefined);
  const custom=stabilizeSelection(catalog,ids.sl,{window_type:'WT-SL-HIKICHIGAI',size_mode:'CUSTOM',construction:'在来・204・単純段差',size:'SZ-SL-000001',custom_width:1000,custom_height:1000});
  assert.equal(custom.selection.size,undefined);assert.equal(custom.selection.custom_width,1000);assert.equal(custom.selection.custom_height,1000);
});

test('130 formal Size Master coverage matches current production Master',()=>{
  const inventory=new Map(catalogInventory(catalog).map((row)=>[row.productId,row]));
  for(const[productId,count]of Object.entries({[ids.s2h]:2131,[ids.sl]:1495,[ids.a430]:718,[ids.a431]:538})){
    const row=inventory.get(productId);
    assert.equal(row.selectableSizeRows,count,productId);
    assert.equal(row.sizeCoverage,1,productId);assert.equal(row.missingSizeRows,0,productId);assert.equal(row.extraSizeRows,0,productId);
  }
});

test('131 common UI and resolver contain no product/window-name branch',async()=>{
  for(const path of['../src/catalog/size-availability.mjs','../src/catalog/resolver-values.mjs','../src/ui/web/app.js']){
    const source=await readFile(new URL(path,import.meta.url),'utf8');
    assert.equal(/サーモス|APW|SER-|WT-|W431-|SWT-|product\s*===|window_type\s*===/.test(source),false,path);
  }
});