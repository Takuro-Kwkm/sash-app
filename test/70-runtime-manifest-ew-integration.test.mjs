import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { resolveRuntimeAppProduct, runtimeAppIntegrationInventory } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { NEW_CONSTRUCTION_SASH_UI_STANDARD_ORDER } from '../src/catalog/runtime-master/new-construction-sash-runtime-ui-contract.mjs';

const PRODUCT_ID='SER-LIX-EW';
const TARGET_WINDOW='WT-EW-TATE-SUBERI';
const TARGET_SPEC='SP-EW-TATE-T';
const RUNTIME_SHA='082442f82f51c4a81050d8e16d5fe3b9cb142004deb371a3e2bbb21384ca37dd';

const field=(result,key)=>result.fields.find((row)=>row.key===key);
const values=(result,key)=>field(result,key)?.values?.map((row)=>row.value)??[];
const keys=(result)=>result.fields.map((row)=>row.key);

async function targetStandardSelection(){
  const base={window_type:TARGET_WINDOW,window_spec:TARGET_SPEC,handing:'L',size_mode:'STANDARD'};
  let result=await resolveRuntimeAppProduct(PRODUCT_ID,base);
  const size=values(result,'size')[0];
  assert.ok(size);
  result=await resolveRuntimeAppProduct(PRODUCT_ID,{...base,size});
  const exterior=values(result,'exterior_color')[0];
  assert.ok(exterior);
  result=await resolveRuntimeAppProduct(PRODUCT_ID,{...base,size,exterior_color:exterior});
  const interior=values(result,'interior_color')[0];
  assert.ok(interior);
  result=await resolveRuntimeAppProduct(PRODUCT_ID,{...base,size,exterior_color:exterior,interior_color:interior});
  const glass=values(result,'glass_base')[0];
  assert.ok(glass);
  return {selection:{...base,size,exterior_color:exterior,interior_color:interior,glass_base:glass},result};
}

test('EW v1.1 canonical manifest and Runtime bytes load read-only with exact identity and SHA',async()=>{
  const runtime=await loadRegisteredRuntime('LIXIL','EW');
  assert.ok(runtime);
  assert.equal(runtime.normalizedManifest.manufacturer,'LIXIL');
  assert.equal(runtime.normalizedManifest.series,'EW');
  assert.equal(runtime.normalizedManifest.packageVersion,'v1.1');
  assert.equal(runtime.normalizedManifest.schemaVersion,'2.0');
  assert.equal(runtime.normalizedManifest.runtimeStatus,'READY');
  assert.equal(runtime.normalizedManifest.formalPass,true);
  assert.equal(runtime.normalizedManifest.storageStatus,'DRIVE_CANONICAL');
  assert.equal(runtime.normalizedManifest.packageGate,'PASS');
  assert.equal(runtime.normalizedManifest.storageGate,'PASS');
  assert.equal(runtime.normalizedManifest.registryGate,'PASS');
  assert.equal(runtime.sourcePackageIntegrity.match,true);
  assert.equal(runtime.sourcePackageIntegrity.manifestDriveFileId,'139c0atou5LFz7EIHIdD7ZTYWddfSHf5_');
  assert.equal(runtime.sourcePackageIntegrity.files.length,1);
  assert.equal(runtime.sourcePackageIntegrity.files[0].expected,RUNTIME_SHA);
  assert.equal(runtime.sourcePackageIntegrity.files[0].actual,RUNTIME_SHA);
  assert.equal(runtime.sourcePackageIntegrity.files[0].match,true);
});

test('EW is registered declaratively as a ready new-construction exterior-window Runtime product',()=>{
  const ew=runtimeAppIntegrationInventory().find((row)=>row.id===PRODUCT_ID);
  assert.ok(ew);
  assert.equal(ew.status,'READY');
  assert.equal(ew.selectable,true);
  assert.equal(ew.manufacturer,'LIXIL');
  assert.equal(ew.series,'EW');
  assert.equal(ew.packageVersion,'v1.1');
  assert.equal(ew.schemaVersion,'2.0');
  assert.equal(ew.uiCategory,'NEW_CONSTRUCTION_EXTERIOR_WINDOW');
  assert.equal(ew.adapterType,'CANONICAL_WORKBOOK_REFERENCE_V1');
  assert.equal(ew.sourceHash,RUNTIME_SHA);
});

test('EW canonical adapter preserves all source counts without inventing formal size records',async()=>{
  const runtime=await loadRegisteredRuntime('LIXIL','EW');
  assert.equal(runtime.master.capabilities.runtimeContract,'canonical_workbook_reference_v1');
  assert.equal(runtime.master.capabilities.sourceStandardSizeRows,1721);
  assert.equal(runtime.master.capabilities.standardSizeRecords,1039);
  assert.equal(runtime.master.capabilities.targetWindowSizeRows[TARGET_WINDOW],162);
  assert.equal(runtime.master.capabilities.customDimensionRules,6);
  assert.equal(runtime.master.canonicalWorkbook.windows.length,15);
  assert.equal(runtime.master.canonicalWorkbook.screens.length,32);
  assert.equal(runtime.master.canonicalWorkbook.glasses.length,3);
  assert.equal(runtime.master.canonicalWorkbook.options.length,22);
});

test('v1.5 fixed UI slots keep EW screen block before glass and options last',async()=>{
  assert.deepEqual(NEW_CONSTRUCTION_SASH_UI_STANDARD_ORDER.slice(0,6),['manufacturer','product','window_type','window_spec','handing','size_mode']);
  const {selection}=await targetStandardSelection();
  const result=await resolveRuntimeAppProduct(PRODUCT_ID,{...selection,screen_presence:'あり'});
  const form=values(result,'screen_form')[0];
  const withForm=await resolveRuntimeAppProduct(PRODUCT_ID,{...selection,screen_presence:'あり',screen_form:form});
  const order=keys(withForm);
  assert.ok(order.indexOf('window_type')<order.indexOf('window_spec'));
  assert.ok(order.indexOf('window_spec')<order.indexOf('handing'));
  assert.ok(order.indexOf('handing')<order.indexOf('size_mode'));
  assert.ok(order.indexOf('size_mode')<order.indexOf('size'));
  assert.ok(order.indexOf('size')<order.indexOf('exterior_color'));
  assert.ok(order.indexOf('exterior_color')<order.indexOf('interior_color'));
  assert.ok(order.indexOf('interior_color')<order.indexOf('screen_presence'));
  assert.ok(order.indexOf('screen_presence')<order.indexOf('screen_form'));
  assert.ok(order.indexOf('screen_form')<order.indexOf('screen_net'));
  assert.ok(order.indexOf('screen_net')<order.indexOf('glass_base'));
  assert.ok(order.indexOf('glass_base')<order.indexOf('glass_detail'));
  assert.ok(order.indexOf('glass_detail')<order.indexOf('glass_spacer'));
  assert.ok(order.indexOf('glass_spacer')<order.indexOf('glass_air_layer'));
  assert.equal(order.at(-1),'option');
  assert.equal(order.includes('construction'),false);
});

test('EW standard size UI exposes only formal records and never a W×H cartesian product',async()=>{
  const result=await resolveRuntimeAppProduct(PRODUCT_ID,{window_type:TARGET_WINDOW,window_spec:TARGET_SPEC,handing:'L',size_mode:'STANDARD'});
  const sizeField=field(result,'size');
  assert.ok(sizeField);
  assert.equal(sizeField.values.length,42);
  const runtime=await loadRegisteredRuntime('LIXIL','EW');
  const formal=runtime.master.canonicalWorkbook.normalizedSizes.filter((row)=>row.window_id===TARGET_WINDOW&&row.spec_id===TARGET_SPEC);
  assert.equal(formal.length,42);
  assert.deepEqual(new Set(sizeField.values.map((row)=>row.value)),new Set(formal.map((row)=>row.id)));
  assert.equal(formal.some((row)=>row.nominal_w==='046'&&row.nominal_h==='18'),false,'046×18 is a known cartesian-only gap and must not be generated');
});

test('EW custom size uses formal dimension ranges and fails closed outside them',async()=>{
  const base={window_type:'WT-EW-SOTODAOSHI',window_spec:'SP-EW-Y-1',size_mode:'CUSTOM'};
  const initial=await resolveRuntimeAppProduct(PRODUCT_ID,base);
  assert.deepEqual(values(initial,'size_mode'),['CUSTOM']);
  assert.ok(field(initial,'custom_w'));
  assert.ok(field(initial,'custom_h'));
  assert.equal(field(initial,'custom_w').unit,'mm');
  assert.equal(field(initial,'custom_h').unit,'mm');
  assert.equal(initial.fields.some((row)=>row.key==='size'),false);
  const valid=await resolveRuntimeAppProduct(PRODUCT_ID,{...base,custom_w:500,custom_h:400});
  assert.equal(valid.validation.errors.some((row)=>row.errorCode==='CUSTOM_SIZE_OUT_OF_RANGE'),false);
  const invalid=await resolveRuntimeAppProduct(PRODUCT_ID,{...base,custom_w:499,custom_h:400});
  assert.equal(invalid.validation.status,'INVALID');
  assert.ok(invalid.validation.errors.some((row)=>row.errorCode==='CUSTOM_SIZE_OUT_OF_RANGE'));
});

test('EW handing is Runtime-driven, required only for forms whose formal size rows carry handing',async()=>{
  const target=await resolveRuntimeAppProduct(PRODUCT_ID,{window_type:TARGET_WINDOW,window_spec:TARGET_SPEC});
  const handing=field(target,'handing');
  assert.ok(handing);
  assert.equal(handing.required,true);
  assert.deepEqual(handing.values.map((row)=>row.value),['L','R']);
  assert.deepEqual(handing.values.map((row)=>row.displayLabel),['左吊元（L）','右吊元（R）']);
  const fix=await resolveRuntimeAppProduct(PRODUCT_ID,{window_type:'WT-EW-FIX',window_spec:'SP-EW-FIX-F'});
  assert.equal(fix.fields.some((row)=>row.key==='handing'),false);
});

test('EW DS internal spec is auto-resolved read-only with the Runtime-provided spec type label',async()=>{
  const result=await resolveRuntimeAppProduct(PRODUCT_ID,{window_type:'WT-EW-DAIKAIKO-YOKO'});
  assert.equal(result.selection.window_spec,'SP-EW-DAI-DS');
  const spec=field(result,'window_spec');
  assert.ok(spec);
  assert.equal(spec.displayLabel,'内部タイプ');
  assert.equal(spec.readOnly,true);
  assert.equal(spec.runtimeState,'RESOLVED');
});

test('EW screen block appears only where formal screen candidates exist and fixed midrail stays out of input UI',async()=>{
  const noScreen=await resolveRuntimeAppProduct(PRODUCT_ID,{window_type:'WT-EW-SOTODAOSHI',window_spec:'SP-EW-Y-1'});
  assert.equal(noScreen.fields.some((row)=>row.key.startsWith('screen_')),false);
  const hiki=await resolveRuntimeAppProduct(PRODUCT_ID,{window_type:'WT-EW-HIKICHIGAI',window_spec:'SP-EW-HIKI-HH',screen_presence:'あり',screen_form:'引違い網戸'});
  assert.ok(field(hiki,'screen_net'));
  assert.deepEqual(values(hiki,'screen_net'),['標準ネット','きれいネット','虫イヤネット','ペットネット']);
  assert.equal(hiki.fields.some((row)=>row.key==='screen_midrail'),false,'09C says the fixed midrail selector must not be shown');
});

test('EW functional screen-net manual confirmation remains MANUAL_CHECK and is never promoted to PASS',async()=>{
  const {selection}=await targetStandardSelection();
  const result=await resolveRuntimeAppProduct(PRODUCT_ID,{...selection,screen_presence:'あり',screen_form:'横引きロール網戸',screen_net:'きれいネット'});
  assert.equal(result.validation.status,'MANUAL_CHECK');
  assert.ok(result.notices.some((message)=>message.includes('メーカー確認')));
  assert.ok(field(result,'screen_net').values.find((row)=>row.value==='きれいネット')?.manualCheck);
});

test('EW option applicability filters non-applicable rows and exposes dependent angle screw only after L-angle selection',async()=>{
  const {selection}=await targetStandardSelection();
  const base=await resolveRuntimeAppProduct(PRODUCT_ID,selection);
  const options=values(base,'option');
  assert.ok(options.includes('OP-EW-SUBLOCK'));
  assert.ok(options.includes('OP-EW-SMALLOPEN'));
  assert.ok(options.includes('OP-EW-L-ANGLE'));
  assert.equal(options.includes('OP-EW-VENTSTOP'),false);
  assert.equal(options.includes('OP-EW-REMOTE-1'),false);
  assert.equal(options.includes('OP-EW-HOMEDEVICE'),false);
  assert.equal(options.includes('OP-EW-ANGLE-SCREW'),false);
  const withAngle=await resolveRuntimeAppProduct(PRODUCT_ID,{...selection,option:['OP-EW-L-ANGLE']});
  assert.ok(values(withAngle,'option').includes('OP-EW-ANGLE-SCREW'));
});

test('EW invalid unknown selections fail closed and known downstream incompatibilities are cleared',async()=>{
  const unknown=await resolveRuntimeAppProduct(PRODUCT_ID,{window_type:'__INVALID_EW_WINDOW__'});
  assert.equal(unknown.validation.status,'INVALID');
  assert.ok(unknown.validation.errors.some((row)=>row.errorCode==='SELECTION_NOT_ALLOWED'&&row.field==='window_type'));

  const stale=await resolveRuntimeAppProduct(PRODUCT_ID,{window_type:'WT-EW-FIX',window_spec:TARGET_SPEC,handing:'L',size_mode:'STANDARD'});
  assert.equal(stale.selection.window_spec,undefined);
  assert.equal(stale.selection.handing,undefined);
  assert.ok(stale.clearedFields.some((row)=>row.field==='window_spec'));
  assert.equal(stale.validation.status,'INVALID');
});

test('EW Runtime resolution is deterministic for identical input',async()=>{
  const input={window_type:TARGET_WINDOW,window_spec:TARGET_SPEC,handing:'L',size_mode:'STANDARD'};
  const a=await resolveRuntimeAppProduct(PRODUCT_ID,input);
  const b=await resolveRuntimeAppProduct(PRODUCT_ID,input);
  assert.deepEqual(b.selection,a.selection);
  assert.deepEqual(b.fields,a.fields);
  assert.deepEqual(b.validation,a.validation);
});
