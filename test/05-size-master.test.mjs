import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createCatalog, catalogInventory, validateCatalog } from "../src/catalog/catalog-adapter.mjs";
import { stabilizeSelection } from "../src/catalog/catalog-resolver.mjs";
import { evaluateDimension } from "../src/catalog/dimension-resolver.mjs";
import { buildCatalogContext } from "../src/catalog/selector.mjs";
import { distinctNominalHeights, distinctNominalWidths, findSizeCode, resolveStandardSizes, sizeCoverage } from "../src/catalog/size-resolver.mjs";
import { CURRENT_WINDOW_SERIES_MODULES } from "../src/catalog/modules/current-window-series.mjs";
import { sizes as SAMOS2H_ACTIVE_SIZES } from "../src/catalog/modules/samos2h-size.mjs";
import { THERMOSL_SOURCE } from "../src/catalog/modules/thermosl-source.mjs";
import { APW430_SOURCE } from "../src/catalog/modules/apw430-source.mjs";
import { APW431_SOURCE } from "../src/catalog/modules/apw431-source.mjs";
import { APW431_DIMENSION_RULES } from "../src/catalog/modules/apw431-module.mjs";
import { assertCommonArchitecture, assertIntegrity } from "./core-gates.mjs";
import { assertDimensionIntegrity } from "./dimension-gates.mjs";

const catalog=createCatalog(CURRENT_WINDOW_SERIES_MODULES);
const ids={s2h:"SER-LIX-SAMOS2H",sl:"SER-LIX-SAMOSL",a430:"SER-YKK-APW430",a431:"SER-YKK-APW431"};
const active=(row)=>row.selectable!==false&&row.status!=="INACTIVE";
const rows=(productId,includeInactive=false)=>catalog.standardSizeRecords.filter((row)=>row.productId===productId&&(includeInactive||active(row)));
const sorted=(values)=>[...values].sort((a,b)=>String(a).localeCompare(String(b)));
const setDiff=(left,right)=>{const other=new Set(right);return left.filter((value)=>!other.has(value));};
const selectorWitness=(selector={})=>{
  const result={};
  const apply=(part)=>{
    if(!part)return;
    if(part.all||part.allOf)for(const child of(part.all??part.allOf))apply(child);
    if(part.any||part.anyOf)apply((part.any??part.anyOf)[0]);
    for(const[key,value]of Object.entries(part)){
      if(["all","allOf","any","anyOf","not"].includes(key))continue;
      if(value&&typeof value==="object"&&!Array.isArray(value)){
        if(value.$in?.length)result[key]=value.$in[0];
        else if("$eq"in value)result[key]=value.$eq;
        else if(value.$exists===false)delete result[key];
      }else result[key]=value;
    }
  };
  apply(selector);
  return result;
};
const windowCounts=(productId)=>Object.fromEntries([...new Set(rows(productId,true).map((row)=>row.windowTypeId))].sort().map((windowTypeId)=>[
  windowTypeId,rows(productId).filter((row)=>row.windowTypeId===windowTypeId).length
]));

const expectedWindowCounts={
  [ids.s2h]:{
    "WT-S2H-AGE-SAGE-FS":24,"WT-S2H-AMADO-HIKI":220,"WT-S2H-FIX-IN":118,"WT-S2H-FIX-OUT":118,
    "WT-S2H-HIKICHIGAI":197,"WT-S2H-KATTEGUCHI":42,"WT-S2H-KATTEGUCHI-VENT-FS":21,"WT-S2H-KAZARI-HIKI":94,
    "WT-S2H-KOSHO-YOKO":48,"WT-S2H-MENKOSHI-AGE-FS":115,"WT-S2H-MENKOSHI-HIKI":377,"WT-S2H-SHUTTER-HIKI":531,
    "WT-S2H-SOTODAOSHI":16,"WT-S2H-TATE-SUBERI":138,"WT-S2H-TERRACE-DOOR":28,"WT-S2H-UCHIDAOSHI":14,"WT-S2H-YOKO-SUBERI":30
  },
  [ids.sl]:{
    "WT-SL-AGE-SAGE-FS":19,"WT-SL-AMADO-HIKI":54,"WT-SL-FIX-IN":122,"WT-SL-FIX-OUT":123,
    "WT-SL-HIKICHIGAI":169,"WT-SL-KATTEGUCHI":9,"WT-SL-KATTEGUCHI-VENT-FS":9,"WT-SL-KAZARI-HIKI":60,
    "WT-SL-KOSHO-YOKO":36,"WT-SL-MENKOSHI-AGE-FS":80,"WT-SL-MENKOSHI-HIKI":261,"WT-SL-SHUTTER-HIKI":339,
    "WT-SL-SOTODAOSHI":8,"WT-SL-TATE-SUBERI":138,"WT-SL-TERRACE-DOOR":12,"WT-SL-UCHIDAOSHI":14,"WT-SL-YOKO-SUBERI":42
  },
  [ids.a430]:{
    "SWT-YKK-APW430-FIX-MADO":133,"SWT-YKK-APW430-FIX-TR-204":16,"SWT-YKK-APW430-FIX-TR-ZAIRAI":28,
    "SWT-YKK-APW430-HIGH-ENDOP-SINGLE":16,"SWT-YKK-APW430-HIGH-SINGLE":30,"SWT-YKK-APW430-HIKI":80,
    "SWT-YKK-APW430-MENKOSHI-HIKI":50,"SWT-YKK-APW430-SHUTTER-HIKI":41,
    "SWT-YKK-APW430-SUBERI-GREMON-FIX-DAN":12,"SWT-YKK-APW430-SUBERI-GREMON-FIX-REN":10,"SWT-YKK-APW430-SUBERI-GREMON-SINGLE":46,
    "SWT-YKK-APW430-SUBERI-OP-FIX-DAN":12,"SWT-YKK-APW430-SUBERI-OP-FIX-REN":10,"SWT-YKK-APW430-SUBERI-OP-SINGLE":28,
    "SWT-YKK-APW430-TATE-GREMON-FIX-DAN":6,"SWT-YKK-APW430-TATE-GREMON-FIX-REN":18,"SWT-YKK-APW430-TATE-GREMON-SINGLE":33,
    "SWT-YKK-APW430-TATE-GREMON-WINDCATCH":15,"SWT-YKK-APW430-TATE-OP-FIX-DAN":6,"SWT-YKK-APW430-TATE-OP-FIX-REN":18,
    "SWT-YKK-APW430-TATE-OP-SINGLE":30,"SWT-YKK-APW430-TATE-OP-WINDCATCH":15,
    "SWT-YKK-APW430-TWOACTION-FIX-DAN":10,"SWT-YKK-APW430-TWOACTION-FIX-REN":28,"SWT-YKK-APW430-TWOACTION-SINGLE":27
  },
  [ids.a431]:{"W431-001":110,"W431-002":258,"W431-003":56,"W431-004":27,"W431-005":51,"W431-006":36}
};

test("52 active registry is frozen to the four audited products",()=>{
  assert.deepEqual(catalog.products.map((row)=>row.id),[ids.s2h,ids.sl,ids.a430,ids.a431]);
  assert.equal(catalog.products.every((row)=>row.status==="ACTIVE"),true);
});

test("53 canonical Drive sources and release states are exact",()=>{
  const expected={
    [ids.s2h]:["1zHi-XsMqJp0MKH-sDoTcnTqkLMGcuRdo","01_正本","v0.7"],
    [ids.sl]:["17lVzBZ1hp4RVcGv0yNdnrKt25SFO2FhL","01_正本","v0.7"],
    [ids.a430]:["1QDocQ7yoXE6TAnzHtfsyKwwK6YB5_mgk90Bw1hm4iPo","01_正本","20260830"],
    [ids.a431]:["1TBEn2tTbFjBLeIOeDs0fR3iIDcLEn3jI","01_正本","v1.0"]
  };
  for(const product of catalog.products)assert.deepEqual([product.source.id,product.source.folder,product.source.version],expected[product.id]);
});

test("54 product size coverage is exactly 100 percent",()=>{
  const expected={
    [ids.s2h]:{standardSizeRows:2297,selectableSizeRows:2131,inactiveSizeRows:166,canonicalSelectableRows:2131,missing:0,extra:0,coverage:1},
    [ids.sl]:{standardSizeRows:1644,selectableSizeRows:1495,inactiveSizeRows:149,canonicalSelectableRows:1495,missing:0,extra:0,coverage:1},
    [ids.a430]:{standardSizeRows:718,selectableSizeRows:718,inactiveSizeRows:0,canonicalSelectableRows:718,missing:0,extra:0,coverage:1},
    [ids.a431]:{standardSizeRows:332,selectableSizeRows:538,inactiveSizeRows:0,canonicalSelectableRows:538,missing:0,extra:0,coverage:1}
  };
  for(const productId of Object.values(ids))assert.deepEqual(sizeCoverage(catalog,productId),expected[productId]);
});

test("55 canonical and runtime selectable IDs have bidirectional set equality",()=>{
  const canonical={
    [ids.s2h]:SAMOS2H_ACTIVE_SIZES.map((row)=>row.id),
    [ids.sl]:THERMOSL_SOURCE.sizes.filter((row)=>row.active).map((row)=>row.id),
    [ids.a430]:APW430_SOURCE.sizes.map((row)=>row.id),
    [ids.a431]:APW431_SOURCE.sizes.map((row)=>row.id)
  };
  for(const productId of Object.values(ids)){
    const runtime=rows(productId).map((row)=>row.id);
    assert.deepEqual(setDiff(canonical[productId],runtime),[],`${productId}: missing`);
    assert.deepEqual(setDiff(runtime,canonical[productId]),[],`${productId}: extra`);
  }
});

test("56 every active window has its exact canonical selectable count",()=>{
  for(const productId of Object.values(ids))assert.deepEqual(windowCounts(productId),expectedWindowCounts[productId],productId);
});

test("57 all normalized selectable records are reachable through their formal selectors",()=>{
  for(const productId of Object.values(ids)){
    const context=buildCatalogContext(catalog,productId);
    for(const row of rows(productId)){
      const reachable=resolveStandardSizes(catalog,productId,selectorWitness(row.selector),context);
      assert.ok(reachable.some((candidate)=>candidate.id===row.id),`${productId}:${row.id}`);
    }
  }
});

test("58 inactive records are retained but never emitted as candidates",()=>{
  for(const productId of [ids.s2h,ids.sl]){
    const inactive=rows(productId,true).filter((row)=>!active(row));
    assert.ok(inactive.length>0);
    const resolved=new Set(resolveStandardSizes(catalog,productId,{}).map((row)=>row.id));
    assert.equal(inactive.some((row)=>resolved.has(row.id)),false);
  }
});

test("59 canonical record IDs and APW431 integrated candidate keys are duplicate-free",()=>{
  for(const productId of Object.values(ids)){
    const records=rows(productId,true);
    assert.equal(new Set(records.map((row)=>row.id)).size,records.length,productId);
  }
  assert.equal(new Set(APW431_SOURCE.sizes.map((row)=>row.candidateKey)).size,538);
  assert.equal(new Set(APW431_SOURCE.baseSizeIds).size,332);
});

test("60 product, window, specification and evidence references have no orphans",()=>{
  validateCatalog(catalog);
  for(const productId of Object.values(ids))assertIntegrity(catalog,productId);
  assertDimensionIntegrity(catalog,ids.sl);
  assertDimensionIntegrity(catalog,ids.a431);
});

test("61 APW430 specification-specific size counts are exact",()=>{
  const counts=Object.fromEntries(APW430_SOURCE.specifications.map((spec)=>[spec.id,rows(ids.a430).filter((row)=>row.selector.specific_spec?.$in?.includes(spec.id)).length]));
  assert.deepEqual(counts,{
    "SP-YKK-APW430-GRILLE-VERT":50,"SP-YKK-APW430-GRILLE-IGETA":50,"SP-YKK-APW430-GRILLE-LATTICE":50,"SP-YKK-APW430-GRILLE-HORIZ":35,
    "SP-YKK-APW430-SHUT-REMOTE":41,"SP-YKK-APW430-SHUT-MANUAL":41,"SP-YKK-APW430-SHUT-REMOTE-GR":41,"SP-YKK-APW430-SHUT-MANUAL-GR":41,
    "SP-YKK-APW430-HIKI-STANDARD":80,"SP-YKK-APW430-HIKI-CRESCENT-DOWN":73,"SP-YKK-APW430-HIKI-EMERGENCY":1
  });
});

test("62 APW430 handing is data-driven and both L/R reach all 35 applicable rows",()=>{
  const handingRows=APW430_SOURCE.sizes.filter((row)=>row.handingRequired);
  assert.equal(handingRows.length,35);
  const context=buildCatalogContext(catalog,ids.a430);
  for(const sourceRow of handingRows){
    const row=rows(ids.a430).find((candidate)=>candidate.id===sourceRow.id);
    for(const handing of ["L","R"]){
      const selection={...selectorWitness(row.selector),handing};
      assert.ok(resolveStandardSizes(catalog,ids.a430,selection,context).some((candidate)=>candidate.id===row.id),`${row.id}:${handing}`);
    }
  }
});

test("63 construction and configuration changes produce disjoint exact candidates",()=>{
  const base={window_type:"W431-001",region:"本州",configuration:"2枚建",variant:"標準",floor_type:"標準",size_mode:"STANDARD"};
  const conventional=new Set(resolveStandardSizes(catalog,ids.a431,{...base,construction:"在来",frame_type:"アングル付/無"}).map((row)=>row.id));
  const twoByFour=new Set(resolveStandardSizes(catalog,ids.a431,{...base,construction:"2×4",frame_type:"アングル付"}).map((row)=>row.id));
  assert.ok(conventional.size>0);
  assert.ok(twoByFour.size>0);
  assert.deepEqual([...conventional].filter((id)=>twoByFour.has(id)),[]);
});

test("64 APW430 specification and upstream changes clear an invalid selected size",()=>{
  const emergency=APW430_SOURCE.sizes.find((row)=>row.applicableSpecificationIds.includes("SP-YKK-APW430-HIKI-EMERGENCY"));
  const selected=stabilizeSelection(catalog,ids.a430,{window_type:emergency.windowId,specific_spec:"SP-YKK-APW430-HIKI-EMERGENCY",construction:emergency.construction,size_mode:"STANDARD",size:emergency.id});
  assert.equal(selected.selection.size,emergency.id);
  const changed=stabilizeSelection(catalog,ids.a430,{...selected.selection,specific_spec:"SP-YKK-APW430-HIKI-CRESCENT-DOWN",window_type:"SWT-YKK-APW430-FIX-MADO"});
  assert.equal(changed.selection.size,undefined);
  assert.equal(changed.selection.specific_spec,undefined);
});

test("65 APW431 STANDARD and CUSTOM use the same generic runtime",()=>{
  const row=APW431_SOURCE.sizes[0];
  const standardSelection={...selectorWitness(rows(ids.a431).find((candidate)=>candidate.id===row.id).selector),size:row.id};
  const standard=stabilizeSelection(catalog,ids.a431,standardSelection);
  assert.equal(standard.selection.size,row.id);
  assert.ok(standard.fields.some((field)=>field.key==="size"));
  assert.equal(standard.fields.some((field)=>field.key==="custom_width"),false);
  const custom=stabilizeSelection(catalog,ids.a431,{...standardSelection,size_mode:"CUSTOM",custom_width:1000,custom_height:1571});
  assert.equal(custom.selection.size,undefined);
  assert.equal(custom.fields.find((field)=>field.key==="custom_width")?.dataType,"NUMBER");
  assert.equal(custom.fields.find((field)=>field.key==="custom_height")?.dataType,"NUMBER");
});

test("66 APW431 custom rules return PASS, BLOCK and REVIEW_REQUIRED",()=>{
  assert.equal(APW431_DIMENSION_RULES.length,29);
  const passBase={window_type:"W431-001",region:"北海道",construction:"在来",configuration:"2枚建",variant:"標準",size_mode:"CUSTOM"};
  assert.equal(evaluateDimension(catalog,ids.a431,{...passBase,custom_width:1000,custom_height:1571}).status,"PASS");
  assert.equal(evaluateDimension(catalog,ids.a431,{...passBase,custom_width:999,custom_height:1571}).status,"BLOCK");
  const reviewBase={window_type:"W431-003",region:"北海道",construction:"在来",configuration:"片引き",variant:"均等タイプ",size_mode:"CUSTOM"};
  assert.equal(evaluateDimension(catalog,ids.a431,{...reviewBase,custom_width:1600,custom_height:1571}).status,"REVIEW_REQUIRED");
});

test("67 size-code and nominal W/H search operate on real records only",()=>{
  const selection={window_type:"W431-001",region:"北海道",configuration:"2枚建",variant:"標準",construction:"在来",frame_type:"アングル無",floor_type:"標準",size_mode:"STANDARD"};
  const resolved=resolveStandardSizes(catalog,ids.a431,selection);
  const match=findSizeCode(catalog,ids.a431,"16018",selection);
  assert.ok(match.length>0);
  assert.equal(match.every((row)=>row.sizeCode.includes("16018")),true);
  const widths=distinctNominalWidths(resolved);
  assert.ok(widths.includes("160"));
  const heights=distinctNominalHeights(resolved,"160");
  assert.ok(heights.includes("18"));
  assert.equal(resolved.every((row)=>widths.includes(row.nominalW)),true);
});

test("68 canonical Golden results remain all PASS",()=>{
  assert.equal(APW430_SOURCE.goldenTests.length,16);
  assert.equal(APW431_SOURCE.goldenTests.length,14);
  assert.equal([...APW430_SOURCE.goldenTests,...APW431_SOURCE.goldenTests].every((row)=>row.result==="PASS"),true);
});

test("69 health inventory exposes formal size metrics for every product",()=>{
  const inventory=catalogInventory(catalog);
  assert.equal(inventory.length,4);
  assert.equal(inventory.every((row)=>row.sizeCoverage===1&&row.missingSizeRows===0&&row.extraSizeRows===0),true);
  assert.deepEqual(inventory.map((row)=>[row.productId,row.selectableSizeRows]),[[ids.s2h,2131],[ids.sl,1495],[ids.a430,718],[ids.a431,538]]);
});

test("70 common Size Resolver and UI contain no product/window name branches",async()=>{
  await assertCommonArchitecture();
  const source=await readFile(new URL("../src/catalog/size-resolver.mjs",import.meta.url),"utf8");
  assert.equal(/サーモス|APW|SER-|WT-|W431-|SWT-/.test(source),false);
  const ui=await readFile(new URL("../src/ui/web/app.js",import.meta.url),"utf8");
  assert.equal(/if\s*\([^)]*(?:サーモス|APW|SER-|WT-|W431-|SWT-)/.test(ui),false);
});

test("71 dynamic UI exposes size-code/W/H search without truncating canonical candidates",async()=>{
  const ui=await readFile(new URL("../src/ui/web/app.js",import.meta.url),"utf8");
  assert.match(ui,/data-size-search/);
  assert.match(ui,/呼称・W・H・サイズIDで検索/);
  assert.match(ui,/option\.hidden=!match/);
});