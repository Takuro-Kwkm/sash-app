import{DOORREMO_HIKIDO_MODULE as SOURCE}from'./doorremo-hikido-module.mjs';
import{PRODUCT_TYPES as PT,TRANSOM as T,CONFIG_NODES,EV_PRODUCT}from'./doorremo-hikido-master.mjs';
export const DOORREMO_HIKIDO_MODULE=structuredClone(SOURCE);
const rules=DOORREMO_HIKIDO_MODULE.ruleSets.find(r=>r.type==='VALIDATION_RULES')?.payload;
if(!rules)throw new Error('Doorremo validation rule set missing');
const resolutionRules=DOORREMO_HIKIDO_MODULE.ruleSets.find(r=>r.type==='RESOLUTION_RULES')?.payload;
if(!resolutionRules)throw new Error('Doorremo resolution rule set missing');
for(const node of CONFIG_NODES){
 const rule=resolutionRules.find(r=>r.id===`DRM-C-${node.id}`);
 if(!rule)throw new Error(`Doorremo configuration rule missing: ${node.id}`);
 rule.set.frame_variant=node.frameVariant;
}
if(!DOORREMO_HIKIDO_MODULE.evidence.some(e=>e.id===EV_PRODUCT))DOORREMO_HIKIDO_MODULE.evidence.push({id:EV_PRODUCT,productId:DOORREMO_HIKIDO_MODULE.product.id,sourceType:'OFFICIAL_PRODUCT_CATALOG',sourceId:'1bK1u8RK9p-1mTS4jMRQpvoevelTDImhe',sourceFile:'202605_YKKAP_ドアリモ玄関引戸_商品カタログ.pdf',title:'ドアリモ玄関引戸 商品カタログ 2026年5月',catalogCode:'XAAAA-H26-438-1',status:'VERIFIED_OFFICIAL'});
DOORREMO_HIKIDO_MODULE.product.canonicalPackage={seriesKey:'YKK AP::ドアリモ玄関引戸',packageVersion:'v1.0',canonicalFolderId:'1e8k_VcgScgmfbH6FpZrT3Oj6YbKaIbYR',authoringFileId:'1vEKVorq64zGF84tmv6YKf-QWXZO1phDI',runtimeManifestFileId:'1lXpzg50SQFpH3rCVehBQ2CRQYg1Gf3c4',documentationFileId:'18FH--O5H-8xTrAZoiwDowEiqdZIURLbe',runtimeFileCount:12,evidenceIds:['EV-ORDER-202605','EV-BUSINESS-202605','EV-PRODUCT-202605','EV-SCREEN-202605'],storageGate:'PASS',registryGate:'PASS'};
const runtimeSpec=DOORREMO_HIKIDO_MODULE.ruleSets.find(r=>r.type==='RUNTIME_SPEC');
if(runtimeSpec&&!runtimeSpec.evidenceIds.includes(EV_PRODUCT))runtimeSpec.evidenceIds.push(EV_PRODUCT);
const v=(id,priority,when,errorCode,message)=>({id,priority,when,errorCode,message,severity:'ERROR',scope:'resolved'});
rules.push(
 v('DRM-V-S2L-HMAX',105,{product_type:PT.S2L,door_section_height_mm:{$gt:2280}},'SIZE_OUT_OF_RANGE','袖付2枚連動引込み戸のH1が製作範囲外です。'),
 v('DRM-V-TR-H2-MIN',115,{product_type:{$in:[PT.P2,PT.P4]},transom_type:T.YES,transom_height_mm:{$lt:200}},'TRANSOM_SIZE_OUT_OF_RANGE','ランマH2が製作範囲外です。'),
 v('DRM-V-TR-H2-MAX',115,{product_type:{$in:[PT.P2,PT.P4]},transom_type:T.YES,transom_height_mm:{$gt:600}},'TRANSOM_SIZE_OUT_OF_RANGE','ランマH2が製作範囲外です。'),
 v('DRM-V-2P-TR-HMIN',116,{product_type:PT.P2,transom_type:T.YES,product_order_height_mm:{$lt:1831}},'TRANSOM_SIZE_OUT_OF_RANGE','2枚建ランマ付のHが製作範囲外です。'),
 v('DRM-V-2P-TR-HMAX-A',116,{product_type:PT.P2,transom_type:T.YES,product_order_width_mm:{$lte:1900},product_order_height_mm:{$gt:2801}},'TRANSOM_SIZE_OUT_OF_RANGE','2枚建ランマ付のHが製作範囲外です。'),
 v('DRM-V-2P-TR-HMAX-B',116,{product_type:PT.P2,transom_type:T.YES,product_order_width_mm:{$gte:1901},product_order_height_mm:{$gt:2600}},'TRANSOM_SIZE_OUT_OF_RANGE','2枚建ランマ付のHが製作範囲外です。'),
 v('DRM-V-4P-TR-HMIN',117,{product_type:PT.P4,transom_type:T.YES,product_order_height_mm:{$lt:1831}},'TRANSOM_SIZE_OUT_OF_RANGE','4枚建ランマ付のHが製作範囲外です。'),
 v('DRM-V-4P-TR-HMAX-A',117,{product_type:PT.P4,transom_type:T.YES,product_order_width_mm:{$lte:2830},product_order_height_mm:{$gt:2600}},'TRANSOM_SIZE_OUT_OF_RANGE','4枚建ランマ付のHが製作範囲外です。'),
 v('DRM-V-4P-TR-HMAX-B',117,{product_type:PT.P4,transom_type:T.YES,product_order_width_mm:{$gte:2831},product_order_height_mm:{$gt:2801}},'TRANSOM_SIZE_OUT_OF_RANGE','4枚建ランマ付のHが製作範囲外です。')
);
