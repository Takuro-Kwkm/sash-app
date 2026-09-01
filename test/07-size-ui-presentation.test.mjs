import test from"node:test";
import assert from"node:assert/strict";
import{readFile}from"node:fs/promises";
import{createCatalog,catalogInventory}from"../src/catalog/catalog-adapter.mjs";
import{stabilizeSelection}from"../src/catalog/catalog-resolver.mjs";
import{evaluateDimension}from"../src/catalog/dimension-resolver.mjs";
import{CURRENT_WINDOW_SERIES_MODULES}from"../src/catalog/modules/current-window-series.mjs";
import{APW430_SOURCE}from"../src/catalog/modules/apw430-source.mjs";
import{THERMOSL_SOURCE}from"../src/catalog/modules/thermosl-source.mjs";
import{
  findSizeByCode,findSizeRecords,getAvailableHeights,getAvailableWidths,
  getSelectedSizeMetadata,reconcileSizeDraft,toSizeRecords
}from"../src/ui/web/size-presentation.js";

const catalog=createCatalog(CURRENT_WINDOW_SERIES_MODULES);
const ids={s2h:"SER-LIX-SAMOS2H",sl:"SER-LIX-SAMOSL",a430:"SER-YKK-APW430",a431:"SER-YKK-APW431"};
const paths={
  [ids.s2h]:{window_type:"WT-S2H-HIKICHIGAI",construction:"在来",size_mode:"STANDARD"},
  [ids.sl]:{window_type:"WT-SL-HIKICHIGAI",construction:"在来・204",size_mode:"STANDARD"},
  [ids.a430]:{window_type:"SWT-YKK-APW430-TATE-GREMON-SINGLE",configuration:"マド",construction:"アングル付/無共通",size_mode:"STANDARD"},
  [ids.a431]:{window_type:"W431-001",region:"北海道",configuration:"2枚建",variant:"標準",construction:"在来",frame_type:"アングル無",floor_type:"標準",size_mode:"STANDARD"}
};
const sizeField=(productId,selection=paths[productId])=>stabilizeSelection(catalog,productId,selection).fields.find((field)=>field.key==="size");

test("79 formal Size Record inventory remains unchanged",()=>{
  const inventory=Object.fromEntries(catalogInventory(catalog).map((row)=>[row.productId,row]));
  assert.deepEqual(Object.fromEntries(Object.values(ids).map((id)=>[id,[inventory[id].selectableSizeRows,inventory[id].missingSizeRows,inventory[id].extraSizeRows,inventory[id].sizeCoverage]])),{
    [ids.s2h]:[2131,0,0,1],[ids.sl]:[1410,0,0,1],[ids.a430]:[718,0,0,1],[ids.a431]:[538,0,0,1]
  });
  assert.equal(inventory[ids.sl].dimensionRules,50);
  assert.equal(inventory[ids.a431].dimensionRules,29);
});

test("80 W candidates are distinct values derived only from current formal records",()=>{
  for(const productId of Object.values(ids)){
    const field=sizeField(productId),records=toSizeRecords(field.values),widths=getAvailableWidths(field.values);
    assert.deepEqual(widths.map((row)=>row.value),[...new Set(records.map((row)=>row.nominalW))].sort((a,b)=>Number(a)-Number(b)||a.localeCompare(b,"ja")),productId);
    assert.equal(widths.reduce((sum,row)=>sum+row.count,0),records.length,productId);
  }
});

test("81 H candidates contain only records that exist under the selected W",()=>{
  for(const productId of Object.values(ids)){
    const field=sizeField(productId),width=getAvailableWidths(field.values)[0].value;
    const heights=getAvailableHeights(field.values,width);
    assert.ok(heights.length>0,productId);
    for(const height of heights)assert.ok(findSizeRecords(field.values,{nominalW:width,nominalH:height.value}).length>0,`${productId}:${width}:${height.value}`);
    assert.equal(heights.reduce((sum,row)=>sum+row.count,0),findSizeRecords(field.values,{nominalW:width}).length,productId);
  }
});

test("82 presentation never creates a W/H cross product",()=>{
  for(const productId of Object.values(ids)){
    const field=sizeField(productId),records=toSizeRecords(field.values),formalPairs=new Set(records.map((row)=>`${row.nominalW}|${row.nominalH}`));
    const presentedPairs=[];
    for(const width of getAvailableWidths(field.values))for(const height of getAvailableHeights(field.values,width.value))presentedPairs.push(`${width.value}|${height.value}`);
    assert.equal(presentedPairs.every((pair)=>formalPairs.has(pair)),true,productId);
    assert.equal(new Set(presentedPairs).size,formalPairs.size,productId);
  }
});

test("83 changing W clears an H that does not exist for the new W",()=>{
  const field=sizeField(ids.a430),widths=getAvailableWidths(field.values);
  let witness;
  for(const from of widths)for(const to of widths){
    const toHeights=new Set(getAvailableHeights(field.values,to.value).map((row)=>row.value));
    const oldHeight=getAvailableHeights(field.values,from.value).find((row)=>!toHeights.has(row.value));
    if(oldHeight){witness={from:from.value,to:to.value,height:oldHeight.value};break;}
  }
  assert.ok(witness);
  assert.deepEqual(reconcileSizeDraft(field.values,{width:witness.to,height:witness.height},undefined),{width:witness.to,height:"",query:""});
});

test("84 an upstream window change clears a no-longer-valid size record",()=>{
  const row=APW430_SOURCE.sizes[0];
  const before=stabilizeSelection(catalog,ids.a430,{window_type:row.windowId,configuration:row.configuration,construction:row.construction,size_mode:"STANDARD",size:row.id});
  assert.equal(before.selection.size,row.id);
  const other=APW430_SOURCE.windows.find((window)=>window.id!==row.windowId);
  const after=stabilizeSelection(catalog,ids.a430,{...before.selection,window_type:other.id});
  assert.equal(after.selection.size,undefined);
});

test("85 size code search returns only matching formal records",()=>{
  for(const productId of Object.values(ids)){
    const field=sizeField(productId),record=toSizeRecords(field.values).find((row)=>row.sizeCode);
    const matches=findSizeByCode(field.values,record.sizeCode);
    assert.ok(matches.length>0,productId);
    assert.equal(matches.every((row)=>field.values.some((value)=>value.value===row.id)),true,productId);
    assert.equal(getSelectedSizeMetadata(field.values,matches[0].id)?.id,matches[0].id,productId);
  }
});

test("86 STANDARD and CUSTOM controls remain mutually exclusive",()=>{
  for(const productId of[ids.sl,ids.a431]){
    const standard=stabilizeSelection(catalog,productId,{...paths[productId],size_mode:"STANDARD"});
    assert.ok(standard.fields.some((field)=>field.key==="size"),productId);
    assert.equal(standard.fields.some((field)=>field.key==="custom_width"||field.key==="custom_height"),false,productId);
    const custom=stabilizeSelection(catalog,productId,{...paths[productId],size_mode:"CUSTOM"});
    assert.equal(custom.fields.some((field)=>field.key==="size"),false,productId);
    assert.equal(custom.fields.filter((field)=>field.key==="custom_width"||field.key==="custom_height").every((field)=>field.dataType==="NUMBER"),true,productId);
  }
});

test("87 CUSTOM PASS is preserved",()=>{
  assert.equal(evaluateDimension(catalog,ids.sl,{window_type:"WT-SL-YOKO-SUBERI",handle_type:"SP-SL-YOKO-OP",size_mode:"CUSTOM",construction:"在来・204",custom_width:300,custom_height:300}).status,"PASS");
});

test("88 CUSTOM BLOCK is preserved",()=>{
  assert.equal(evaluateDimension(catalog,ids.sl,{window_type:"WT-SL-YOKO-SUBERI",handle_type:"SP-SL-YOKO-OP",size_mode:"CUSTOM",construction:"在来・204",custom_width:299,custom_height:300}).status,"BLOCK");
});

test("89 CUSTOM REVIEW_REQUIRED remains a confirmation gate, not BLOCK",()=>{
  assert.equal(evaluateDimension(catalog,ids.sl,{window_type:"WT-SL-HIKICHIGAI",size_mode:"CUSTOM",construction:"在来・204・単純段差",custom_width:1000,custom_height:1000}).status,"REVIEW_REQUIRED");
});

test("90 changing size clears an invalid downstream pet-net value",()=>{
  const candidates=THERMOSL_SOURCE.sizes.filter((row)=>row.active&&row.window==="WT-SL-HIKICHIGAI");
  const small=candidates.find((row)=>row.actualW<=780);
  const large=candidates.find((row)=>row.actualW>780&&row.construction===small.construction);
  const before=stabilizeSelection(catalog,ids.sl,{window_type:small.window,size_mode:"STANDARD",construction:small.construction,size:small.id,screen_presence:"あり",screen_form:"引違い網戸",screen_net:"ペットネット"});
  assert.equal(before.selection.screen_net,"ペットネット");
  const after=stabilizeSelection(catalog,ids.sl,{...before.selection,size:large.id});
  assert.equal(after.selection.size,large.id);
  assert.equal(after.selection.screen_net,undefined);
});

test("91 common Size Presentation and UI contain no product/window name branches",async()=>{
  for(const path of["../src/ui/web/size-presentation.js","../src/ui/web/app.js","../src/catalog/size-resolver.mjs"]){
    const source=await readFile(new URL(path,import.meta.url),"utf8");
    assert.equal(/サーモス|APW|SER-|WT-|W431-|SWT-/.test(source),false,path);
  }
});
