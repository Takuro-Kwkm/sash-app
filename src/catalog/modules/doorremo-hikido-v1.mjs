import{DOORREMO_HIKIDO_MODULE as SOURCE}from'./doorremo-hikido-module.mjs';
import{PRODUCT_TYPES as PT,TRANSOM as T}from'./doorremo-hikido-master.mjs';
export const DOORREMO_HIKIDO_MODULE=structuredClone(SOURCE);
const rules=DOORREMO_HIKIDO_MODULE.ruleSets.find(r=>r.type==='VALIDATION_RULES')?.payload;
if(!rules)throw new Error('Doorremo validation rule set missing');
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
