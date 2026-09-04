import test from'node:test';
import assert from'node:assert/strict';
import{createCatalog}from'../src/catalog/catalog-adapter.mjs';
import{stabilizeSelection}from'../src/catalog/catalog-resolver.mjs';
import{DOORREMO_HIKIDO_MODULE}from'../src/catalog/modules/doorremo-hikido-v1.mjs';
import{CONFIG_NODES}from'../src/catalog/modules/doorremo-hikido-master.mjs';

const c=createCatalog([DOORREMO_HIKIDO_MODULE]);
const p=DOORREMO_HIKIDO_MODULE.product.id;
const existing=(type,W,KH)=>({
 existing_product_type:type,
 existing_opening_width_1_mm:W+10,existing_opening_width_2_mm:W+11,existing_opening_width_3_mm:W+12,
 existing_opening_height_1_mm:KH,existing_opening_height_2_mm:KH+1,existing_opening_height_3_mm:KH+2,
 existing_diagonal_a_mm:2500,existing_diagonal_b_mm:2501,existing_transom_present:'NO',building_structure:'WOOD',
 existing_frame_material:'ALUMINUM',existing_frame_mount_type:'INNER',sill_installation_type:'STANDARD_SILL'
});

test('Doorremo canonical configuration nodes preserve exact frame_variant ids',()=>{
 const actual=Object.fromEntries(CONFIG_NODES.map(x=>[x.id,x.frameVariant]));
 assert.deepEqual(actual,{
  YKK_DRM_HKD_S2L_IG_STD:'S2L_STD_FRAME',YKK_DRM_HKD_S2L_SG_STD:'S2L_STD_FRAME',
  YKK_DRM_HKD_2P_IG_NTR:'2P_NO_TRANSOM_FRAME',YKK_DRM_HKD_2P_IG_TR:'2P_TRANSOM_FRAME',
  YKK_DRM_HKD_2P_SG_NTR:'2P_NO_TRANSOM_FRAME',YKK_DRM_HKD_2P_SG_TR:'2P_TRANSOM_FRAME',
  YKK_DRM_HKD_4P_IG_NTR:'4P_NO_TRANSOM_FRAME',YKK_DRM_HKD_4P_IG_TR:'4P_TRANSOM_FRAME',
  YKK_DRM_HKD_4P_SG_NTR:'4P_NO_TRANSOM_FRAME',YKK_DRM_HKD_4P_SG_TR:'4P_TRANSOM_FRAME'
 });
});

test('Doorremo runtime resolves canonical 2P and 4P frame variants',()=>{
 let r=stabilizeSelection(c,p,{...existing('2_PANEL',1590,1967),product_type:'2_PANEL',glass_specification:'INSULATED',transom_type:'NO_TRANSOM'});
 assert.equal(r.resolvedFields.configuration_node_id,'YKK_DRM_HKD_2P_IG_NTR');
 assert.equal(r.resolvedFields.frame_variant,'2P_NO_TRANSOM_FRAME');
 r=stabilizeSelection(c,p,{...existing('4_PANEL',3000,2315),product_type:'4_PANEL',glass_specification:'INSULATED',transom_type:'WITH_TRANSOM',transom_height_mm:400});
 assert.equal(r.resolvedFields.configuration_node_id,'YKK_DRM_HKD_4P_IG_TR');
 assert.equal(r.resolvedFields.frame_variant,'4P_TRANSOM_FRAME');
});

test('Doorremo runtime exposes all four canonical evidence records',()=>{
 const ids=DOORREMO_HIKIDO_MODULE.evidence.map(x=>x.id).sort();
 assert.deepEqual(ids,['EV-BUSINESS-202605','EV-ORDER-202605','EV-PRODUCT-202605','EV-SCREEN-202605']);
 const product=DOORREMO_HIKIDO_MODULE.evidence.find(x=>x.id==='EV-PRODUCT-202605');
 assert.equal(product.catalogCode,'XAAAA-H26-438-1');
 assert.equal(product.sourceId,'1bK1u8RK9p-1mTS4jMRQpvoevelTDImhe');
});

test('Doorremo runtime is bound to formal Drive canonical package v1.0',()=>{
 assert.deepEqual(DOORREMO_HIKIDO_MODULE.product.canonicalPackage,{
  seriesKey:'YKK AP::ドアリモ玄関引戸',packageVersion:'v1.0',canonicalFolderId:'1e8k_VcgScgmfbH6FpZrT3Oj6YbKaIbYR',
  authoringFileId:'1vEKVorq64zGF84tmv6YKf-QWXZO1phDI',runtimeManifestFileId:'1lXpzg50SQFpH3rCVehBQ2CRQYg1Gf3c4',
  documentationFileId:'18FH--O5H-8xTrAZoiwDowEiqdZIURLbe',runtimeFileCount:12,
  evidenceIds:['EV-ORDER-202605','EV-BUSINESS-202605','EV-PRODUCT-202605','EV-SCREEN-202605'],storageGate:'PASS',registryGate:'PASS'
 });
});
