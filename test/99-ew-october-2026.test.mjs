import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {brotliDecompressSync} from 'node:zlib';
const read = async path => readFile(new URL(path,import.meta.url));
const current = async()=>JSON.parse(brotliDecompressSync(Buffer.from((await read('../src/catalog/runtime-master-packages/lixil-ew-v1.4/runtime.json.br.b64')).toString(),'base64')));
async function baseline(){const parts=await Promise.all(Array.from({length:8},(_,i)=>read(`../src/catalog/runtime-master-packages/lixil-ew-v1.3/LIXIL_EW_runtime_v1.3.json.b64.parts/part-${String(i).padStart(2,'0')}`)));return JSON.parse(Buffer.from(parts.map(p=>p.toString().trim()).join(''),'base64'));}
test('EW October adoption preserves all formal selection behavior and fire-product separation',async()=>{
 const [old,now]=await Promise.all([baseline(),current()]);
 for(const key of ['working_extensions','runtime_semantics','frame_angle_rules','installation_environment_rules','runtime_dependencies'])assert.deepEqual(now[key],old[key],key);
 for(const [key,value] of Object.entries(old.provider))if(!['authoring_file_id','authoring_version','price_evidence'].includes(key))assert.deepEqual(now.provider[key],value,key);
 assert.deepEqual(now.source_tables['15_Validation'],old.source_tables['15_Validation']);
 assert.equal(now.series,'EW');assert.equal(now.catalog_delta.fire_product_scope,'EXCLUDED; separate EW防火戸 Product/Runtime/Package retained');
 assert.equal(now.catalog_delta.no_published_price_note.automatic_price,false);
});
test('EW October adopts exact source-bound reference prices without using a rate to manufacture values',async()=>{
 const now=await current();const price=(sheet,col)=>now.source_tables[sheet].values.filter(row=>String(row[0]??'').startsWith(sheet.startsWith('09D')?'MAT-':'SPL-')).map(row=>row[col]);
 assert.deepEqual(price('09D_防虫網材料',8),[16700,18700,16700,18700,31600,66800,143000,25600]);
 assert.deepEqual(price('09E_網押し棒',5),[10000,16500,20200,1700]);
 assert.equal(now.provider.price_evidence.length,8);
 for(const row of now.provider.price_evidence){assert.equal(row.source_file_id,'15Kq1VFoJMbEie3iDy68rYe7Kc0-t471d');assert.equal(row.source_sha256,'1c3e420f8377df161be4b9995f03d016badd0b7930403a9adfa61f53bd939686');assert.equal(row.official_body_price_tax_excl_status,'確認待ち');assert.match(row.notes,/¥(12,100|12,800|25,400)/);}
});
test('EW 29 Field formal contracts carry forward byte-for-byte with nine indirect impacts',async()=>{
 const bytes=await read('../contracts/window-seven/selection-contracts.json');const fields=JSON.parse(bytes).fields.filter(f=>f.scope.product==='SER-LIX-EW');const isolation=JSON.parse(await read('../changes/lixil-ew-202610/isolation.json'));const impact=JSON.parse(await read('../changes/lixil-ew-202610/field-impact.json'));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),isolation.selection_contract_sha256);assert.equal(fields.length,29);assert.ok(fields.every(f=>f.status==='FORMAL'));
 assert.deepEqual(impact.counts,{DIRECT:0,INDIRECT:9,NO_IMPACT:20});assert.equal(impact.fields.length,29);assert.ok(impact.fields.every(f=>!f.contract_changed));
});
