import test from'node:test';
import assert from'node:assert/strict';
import{createCatalog}from'../src/catalog/catalog-adapter.mjs';
import{evaluateDimension}from'../src/catalog/dimension-resolver.mjs';
import{CURRENT_WINDOW_SERIES_MODULES}from'../src/catalog/modules/current-window-series.mjs';
import{THERMOSL_SOURCE}from'../src/catalog/modules/thermosl-source.mjs';
import{THERMOSL_RUNTIME_FORMAL_DIMENSION_DELTA_V19 as delta}from'../src/catalog/modules/thermosl-runtime-formal-dimension-delta-v19.mjs';

const PRODUCT_ID='SER-LIX-SAMOSL';
const catalog=createCatalog(CURRENT_WINDOW_SERIES_MODULES);
const pointOnSegment=(x,y,[x1,y1],[x2,y2])=>{const cross=(x-x1)*(y2-y1)-(y-y1)*(x2-x1);if(Math.abs(cross)>1e-7)return false;return x>=Math.min(x1,x2)&&x<=Math.max(x1,x2)&&y>=Math.min(y1,y2)&&y<=Math.max(y1,y2);};
const inPolygon=(x,y,points)=>{let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[j],b=points[i];if(pointOnSegment(x,y,a,b))return true;if(((b[1]>y)!==(a[1]>y))&&(x<(a[0]-b[0])*(y-b[1])/(a[1]-b[1])+b[0]))inside=!inside;}return inside;};
const selection=(w,h)=>({window_type:'WT-SL-UCHIDAOSHI',construction:'在来・204',size_mode:'CUSTOM',custom_width:w,custom_height:h});

test('CR-SL-036 is regenerated from the formally written v1.9 Master delta',()=>{
  assert.equal(THERMOSL_SOURCE.dimensionRules.length,50);
  const rule=THERMOSL_SOURCE.dimensionRules.find((row)=>row.id==='CR-SL-036');
  assert.ok(rule);
  assert.equal(rule.type,'COMPOUND_GATE');
  assert.equal(rule.automatic,false);
  assert.equal(rule.condition,'240<=W<=815:350<=H<=943; 815<W<=870:350<=H<=755; 870<W<=1690:350<=H<=500');
  assert.deepEqual(rule.points,[[240,350],[240,943],[815,943],[815,755],[870,755],[870,500],[1690,500],[1690,350]]);
  assert.equal(rule.conditionalRegionHandling,'RUNTIME_SAFETY_REVIEW_REQUIRED');
  assert.equal(delta.interpolatedPointsAdded,false);
  assert.equal(THERMOSL_SOURCE.master.sha256,'cd6844218fcf0150a16cbbfa947f391aa08f5449b82ba6fc2249ccdb6894c3d3');
  assert.equal(THERMOSL_SOURCE.runtimeRegeneration.version,'v1.9');
});

test('CR-SL-036 source-confirmed safe polygon has the expected boundary classification',()=>{
  const p=delta.sourceConfirmedBoundaryPoints;
  for(const [w,h] of [[815,943],[816,755],[870,755],[871,500],[1690,500]])assert.equal(inPolygon(w,h,p),true,`${w}x${h}`);
  for(const [w,h] of [[816,943],[871,755],[815,944],[870,756],[1691,500]])assert.equal(inPolygon(w,h,p),false,`${w}x${h}`);
});

test('CR-SL-036 never auto-passes W/H alone after formal regeneration',()=>{
  for(const [w,h] of [[815,943],[816,943],[816,755],[870,755],[871,755],[871,500],[1690,500],[870,756]]){
    assert.equal(evaluateDimension(catalog,PRODUCT_ID,selection(w,h)).status,'REVIEW_REQUIRED',`${w}x${h}`);
  }
  for(const [w,h] of [[1691,500],[815,944]])assert.equal(evaluateDimension(catalog,PRODUCT_ID,selection(w,h)).status,'BLOCK',`${w}x${h}`);
});

test('Runtime STANDARD inventory reflects separately approved S2H source correction while other series remain unchanged',()=>{
  const counts=Object.fromEntries(catalog.products.map((product)=>[
    product.id,catalog.standardSizeRecords.filter((row)=>row.productId===product.id&&row.selectable!==false&&row.status!=='INACTIVE').length
  ]));
  assert.deepEqual(counts,{
    'SER-LIX-SAMOS2H':2140,
    'SER-LIX-SAMOSL':1495,
    'SER-YKK-APW430':718,
    'SER-YKK-APW431':538
  });
});
