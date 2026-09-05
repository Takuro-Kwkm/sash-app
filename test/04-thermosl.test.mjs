import test from "node:test";
import assert from "node:assert/strict";
import { createCatalog, catalogInventory, validateCatalog } from "../src/catalog/catalog-adapter.mjs";
import { stabilizeSelection } from "../src/catalog/catalog-resolver.mjs";
import { evaluateDimension } from "../src/catalog/dimension-resolver.mjs";
import { CURRENT_WINDOW_SERIES_MODULES } from "../src/catalog/modules/current-window-series.mjs";
import { THERMOSL_SOURCE } from "../src/catalog/modules/thermosl-source.mjs";
import { THERMOSL_MODULE } from "../src/catalog/modules/thermosl-module.mjs";
import { assertIntegrity, assertCommonArchitecture } from "./core-gates.mjs";
import { assertDimensionIntegrity } from "./dimension-gates.mjs";

const catalog=createCatalog(CURRENT_WINDOW_SERIES_MODULES);
const productId="SER-LIX-SAMOSL";
const field=(selection,key)=>stabilizeSelection(catalog,productId,selection).fields.find((row)=>row.key===key);
const values=(selection,key)=>field(selection,key)?.values.map((row)=>row.value)??[];
const dimension=(selection)=>evaluateDimension(catalog,productId,selection);

test("25 Thermos L canonical source is current 01_正本",()=>{
  assert.equal(THERMOSL_SOURCE.master.id,"17lVzBZ1hp4RVcGv0yNdnrKt25SFO2FhL");
  assert.equal(THERMOSL_SOURCE.master.folder,"01_正本");
  assert.equal(THERMOSL_SOURCE.master.version,"v0.7");
  assert.equal(THERMOSL_SOURCE.master.revisionId,"0B1PsqngSohhlZVhYaTVRdUNPRFp4ZVB5Y05IdnJNYXI4YTlZPQ");
  assert.equal(THERMOSL_SOURCE.master.sha256,"cd6844218fcf0150a16cbbfa947f391aa08f5449b82ba6fc2249ccdb6894c3d3");
});

test("26 Thermos L source inventory is exact after formal v1.9 regeneration",()=>{
  assert.deepEqual(THERMOSL_SOURCE.sourceInventory,{
    activeWindows:17,masterSizeRows:1644,selectableSizeRows:1495,dimensionRules:50,
    dimensionAuto:28,dimensionReview:22,highOperationRows:144,appControls:17,goldenTests:29
  });
  assert.equal(THERMOSL_SOURCE.windows.length,17);
  assert.equal(THERMOSL_SOURCE.sizes.length,1644);
  assert.equal(THERMOSL_SOURCE.sizes.filter((row)=>row.active).length,1495);
  assert.equal(THERMOSL_SOURCE.runtimeRegeneration.version,"v1.9");
  assert.equal(THERMOSL_SOURCE.runtimeRegeneration.addedSizeRows,85);
  assert.equal(THERMOSL_SOURCE.runtimeRegeneration.dimensionRuleUpdates,1);
  assert.equal(THERMOSL_SOURCE.runtimeRegeneration.targetRuleId,"CR-SL-036");
});

test("27 normalized catalog exposes 17 active window types",()=>{
  assert.equal(catalog.allowedValues.filter((row)=>row.productId===productId&&row.specificationKey==="window_type").length,17);
});

test("28 selectable size source ids are exactly 1495",()=>{
  const rows=catalog.allowedValues.filter((row)=>row.productId===productId&&row.specificationKey==="size");
  assert.equal(rows.length,1495);
  assert.equal(new Set(rows.map((row)=>row.metadata.sourceSizeId)).size,1495);
});

test("29 dimension inventory is 50 / AUTO28 / REVIEW22 after CR-SL-036 formal regeneration",()=>{
  const rows=THERMOSL_MODULE.ruleSets.find((row)=>row.type==="DIMENSION_RULES").payload;
  assert.equal(rows.length,50);
  assert.equal(rows.filter((row)=>row.automatic).length,28);
  assert.equal(rows.filter((row)=>!row.automatic).length,22);
  assert.deepEqual(Object.fromEntries(["AUTO_RECT","AUTO_RATIO","AUTO_PIECEWISE","AUTO_POLYGON","SOURCE_GRAPH_GATE","COMPOUND_GATE"].map((type)=>[type,rows.filter((row)=>row.type===type).length])),{
    AUTO_RECT:9,AUTO_RATIO:8,AUTO_PIECEWISE:5,AUTO_POLYGON:6,SOURCE_GRAPH_GATE:12,COMPOUND_GATE:10
  });
});

test("30 high operation 144 and APP controls 17 are retained",()=>{
  assert.equal(THERMOSL_SOURCE.highOperationMatrix.length,144);
  assert.equal(THERMOSL_SOURCE.appControls.length,17);
});

test("31 canonical Golden Tests are 29/29 PASS",()=>{
  assert.equal(THERMOSL_SOURCE.goldenTests.length,29);
  assert.equal(THERMOSL_SOURCE.goldenTests.every((row)=>row.result==="PASS"),true);
});

test("32 vertical T and TF expose L/R",()=>{
  for(const spec of ["SP-SL-TATE-OP-T","SP-SL-TATE-OP-TF-OUT","SP-SL-TATE-OP-TF-IN","SP-SL-TATE-CAM-T","SP-SL-TATE-CAM-TF-OUT","SP-SL-TATE-CAM-TF-IN"]){
    assert.deepEqual(values({window_type:"WT-SL-TATE-SUBERI",handle_configuration:spec},"handing"),["L","R"]);
  }
});

test("33 vertical TFT hides L/R",()=>{
  for(const spec of ["SP-SL-TATE-OP-TFT-OUT","SP-SL-TATE-OP-TFT-IN","SP-SL-TATE-CAM-TFT-OUT","SP-SL-TATE-CAM-TFT-IN"]){
    assert.equal(field({window_type:"WT-SL-TATE-SUBERI",handle_configuration:spec},"handing"),undefined);
  }
});

test("34 horizontal OP/CAM hide L/R",()=>{
  for(const spec of ["SP-SL-YOKO-OP","SP-SL-YOKO-CAM"])assert.equal(field({window_type:"WT-SL-YOKO-SUBERI",handle_type:spec},"handing"),undefined);
});

test("35 high, decorative HK and doors expose L/R",()=>{
  const selections=[
    {window_type:"WT-SL-KOSHO-YOKO",operation_method:"SP-SL-KOSHO-ELECTRIC"},
    {window_type:"WT-SL-KAZARI-HIKI",joinery_configuration:"SP-SL-KAZARI-HK"},
    {window_type:"WT-SL-TERRACE-DOOR"},
    {window_type:"WT-SL-KATTEGUCHI-VENT-FS"},
    {window_type:"WT-SL-KATTEGUCHI",door_type:"SP-SL-KD-WAIST"}
  ];
  for(const selection of selections)assert.deepEqual(values(selection,"handing"),["L","R"]);
  assert.equal(field({window_type:"WT-SL-KAZARI-HIKI",joinery_configuration:"SP-SL-KAZARI-H"},"handing"),undefined);
  assert.equal(field({window_type:"WT-SL-KAZARI-HIKI",joinery_configuration:"SP-SL-KAZARI-HKK"},"handing"),undefined);
});

test("36 L/R applicable to non-applicable clears handing and downstream size",()=>{
  const result=stabilizeSelection(catalog,productId,{
    window_type:"WT-SL-TATE-SUBERI",handle_configuration:"SP-SL-TATE-OP-TFT-OUT",
    handing:"L",size_mode:"STANDARD",construction:"在来・204",size:"SZ-SL-001300"
  });
  assert.equal(result.selection.handing,undefined);
  assert.equal(result.selection.size,undefined);
});

test("37 STANDARD and CUSTOM fields are mutually exclusive",()=>{
  const standard=stabilizeSelection(catalog,productId,{window_type:"WT-SL-YOKO-SUBERI",handle_type:"SP-SL-YOKO-OP",size_mode:"STANDARD"});
  assert.ok(standard.fields.some((row)=>row.key==="size"));
  assert.equal(standard.fields.some((row)=>row.key==="custom_width"),false);
  const custom=stabilizeSelection(catalog,productId,{window_type:"WT-SL-YOKO-SUBERI",handle_type:"SP-SL-YOKO-OP",size_mode:"CUSTOM"});
  assert.equal(custom.fields.some((row)=>row.key==="size"),false);
  assert.equal(custom.fields.find((row)=>row.key==="custom_width").dataType,"NUMBER");
  assert.equal(custom.fields.find((row)=>row.key==="custom_height").dataType,"NUMBER");
});

test("38 numeric custom inputs survive generic stabilization",()=>{
  const result=stabilizeSelection(catalog,productId,{
    window_type:"WT-SL-YOKO-SUBERI",handle_type:"SP-SL-YOKO-OP",size_mode:"CUSTOM",
    construction:"在来・204",custom_width:500,custom_height:500
  });
  assert.equal(result.selection.custom_width,500);
  assert.equal(result.selection.custom_height,500);
  assert.equal(result.dimensionResult.status,"PASS");
});

test("39 AUTO_RECT returns PASS and BLOCK at boundary",()=>{
  assert.equal(dimension({window_type:"WT-SL-YOKO-SUBERI",handle_type:"SP-SL-YOKO-OP",size_mode:"CUSTOM",construction:"在来・204",custom_width:300,custom_height:300}).status,"PASS");
  assert.equal(dimension({window_type:"WT-SL-YOKO-SUBERI",handle_type:"SP-SL-YOKO-OP",size_mode:"CUSTOM",construction:"在来・204",custom_width:299,custom_height:300}).status,"BLOCK");
});

test("40 AUTO_RATIO returns PASS and BLOCK",()=>{
  const base={window_type:"WT-SL-MENKOSHI-HIKI",grille_type:"SP-SL-GRILLE-V",size_mode:"CUSTOM",construction:"在来・204",leaf_configuration:"2枚建",custom_width:630};
  assert.equal(dimension({...base,custom_height:1000}).status,"PASS");
  assert.equal(dimension({...base,custom_height:1100}).status,"BLOCK");
});

test("41 AUTO_PIECEWISE returns PASS and BLOCK",()=>{
  const base={window_type:"WT-SL-TATE-SUBERI",handle_configuration:"SP-SL-TATE-OP-T",size_mode:"CUSTOM",construction:"在来・204"};
  assert.equal(dimension({...base,custom_width:350,custom_height:2270}).status,"PASS");
  assert.equal(dimension({...base,custom_width:351,custom_height:2270}).status,"BLOCK");
});

test("42 AUTO_POLYGON returns PASS and BLOCK",()=>{
  const base={window_type:"WT-SL-TERRACE-DOOR",size_mode:"CUSTOM",construction:"在来"};
  assert.equal(dimension({...base,custom_width:822,custom_height:2430}).status,"PASS");
  assert.equal(dimension({...base,custom_width:1000,custom_height:2000}).status,"BLOCK");
});

test("43 SOURCE_GRAPH_GATE is REVIEW_REQUIRED inside and BLOCK outside coarse bounds",()=>{
  const base={window_type:"WT-SL-HIKICHIGAI",size_mode:"CUSTOM",construction:"在来・204・単純段差"};
  assert.equal(dimension({...base,custom_width:1000,custom_height:1000}).status,"REVIEW_REQUIRED");
  assert.equal(dimension({...base,custom_width:600,custom_height:1000}).status,"BLOCK");
});

test("44 COMPOUND_GATE is REVIEW_REQUIRED",()=>{
  assert.equal(dimension({
    window_type:"WT-SL-TATE-SUBERI",handle_configuration:"SP-SL-TATE-OP-TF-OUT",
    size_mode:"CUSTOM",construction:"在来・204",custom_width:1000,custom_height:1000
  }).status,"REVIEW_REQUIRED");
});

test("45 color combinations are exactly the six canonical pairs",()=>{
  const pairs=THERMOSL_SOURCE.colors.map((row)=>[row.exteriorId,row.interiorId]);
  assert.deepEqual(pairs,[["H","T"],["T","T"],["G","G"],["K","K"],["D","D"],["W","W"]]);
  assert.deepEqual(values({exterior_color:"H"},"interior_color"),["T"]);
});

test("46 opening screens are connected for vertical CAM",()=>{
  const forms=values({window_type:"WT-SL-TATE-SUBERI",handle_configuration:"SP-SL-TATE-CAM-T",screen_presence:"あり"},"screen_form");
  assert.ok(forms.includes("開き網戸"));
  assert.ok(forms.includes("横引きロール網戸"));
});

test("47 pet net obeys actual W <= 780 and roll forms exclude it",()=>{
  const small=THERMOSL_SOURCE.sizes.find((row)=>row.active&&row.window==="WT-SL-HIKICHIGAI"&&row.actualW<=780);
  const large=THERMOSL_SOURCE.sizes.find((row)=>row.active&&row.window==="WT-SL-HIKICHIGAI"&&row.actualW>780);
  const selection=(row)=>({window_type:row.window,size_mode:"STANDARD",construction:row.construction,size:row.id,screen_presence:"あり",screen_form:"引違い網戸"});
  assert.ok(values(selection(small),"screen_net").includes("ペットネット"));
  assert.equal(values(selection(large),"screen_net").includes("ペットネット"),false);
  assert.equal(values({window_type:"WT-SL-YOKO-SUBERI",handle_type:"SP-SL-YOKO-CAM",screen_presence:"あり",screen_form:"横引きロール網戸"},"screen_net").includes("ペットネット"),false);
});

test("48 special glass remains CONFIRM_REQUIRED after sales presentation cleanup",()=>{
  const result=stabilizeSelection(catalog,productId,{window_type:"WT-SL-HIKICHIGAI",glass_function:"GL-SL-OPT-SAFE"});
  assert.ok(result.manualWarnings.some((message)=>message.includes("CONFIRM_REQUIRED")));
  const candidate=field({window_type:"WT-SL-HIKICHIGAI"},"glass_function").values.find((row)=>row.value==="GL-SL-OPT-SAFE");
  assert.equal(candidate.manualCheck,true);
});

test("49 normal estimate UI contains only 39 active 見積選択 options",()=>{
  const rows=catalog.allowedValues.filter((row)=>row.productId===productId&&row.specificationKey==="options");
  assert.equal(rows.length,39);
  assert.equal(rows.every((row)=>row.metadata.usage==="見積選択"),true);
});

test("50 high operation size availability filters manual H<700 and keeps electric",()=>{
  const baseSize=THERMOSL_SOURCE.sizes.find((row)=>row.active&&row.window==="WT-SL-KOSHO-YOKO"&&row.actualH<700);
  const common={window_type:baseSize.window,size_mode:"STANDARD",construction:baseSize.construction,handing:"L"};
  assert.equal(values({...common,operation_method:"SP-SL-KOSHO-HANDLE"},"size").includes(baseSize.id),false);
  assert.equal(values({...common,operation_method:"SP-SL-KOSHO-ELECTRIC"},"size").includes(baseSize.id),true);
});

test("51 architecture, references, duplicates and contamination pass",async()=>{
  assertIntegrity(catalog,productId);
  assertDimensionIntegrity(catalog,productId);
  validateCatalog(catalog);
  await assertCommonArchitecture();
  const inv=catalogInventory(catalog).find((row)=>row.productId===productId);
  assert.equal(inv.dimensionRules,50);
  assert.deepEqual(inv.sourceInventory,THERMOSL_SOURCE.sourceInventory);
});
