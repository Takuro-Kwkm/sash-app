import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createCatalog, catalogInventory, validateCatalog } from '../src/catalog/catalog-adapter.mjs';
import { CURRENT_WINDOW_SERIES_MODULES } from '../src/catalog/modules/current-window-series.mjs';
import { getAllowedValues } from '../src/catalog/catalog-resolver.mjs';
const c=createCatalog(CURRENT_WINDOW_SERIES_MODULES), p='SER-LIX-SAMOS2H';
const inv=()=>catalogInventory(c).find(x=>x.productId===p);

test('01 four products use one catalog',()=>assert.equal(c.products.length,4));
test('02 S2H inventory is formal Wave2 shape',()=>assert.deepEqual(inv(),{productId:p,manufacturer:'LIXIL',series:'サーモスⅡ-H',definitions:27,allowedValues:2444,requiredRules:26,ruleSets:3,dependencies:25,evidence:13}));
test('03 canonical v0.7 source is retained',()=>{const s=c.products.find(x=>x.id===p).source;assert.equal(s.id,'1zHi-XsMqJp0MKH-sDoTcnTqkLMGcuRdo');assert.equal(s.version,'v0.7');assert.equal(s.folder,'01_正本');});
test('04 active windows are exactly 17',()=>assert.equal(c.allowedValues.filter(x=>x.productId===p&&x.specificationKey==='window_type').length,17));
test('05 selectable real sizes are exactly 2131',()=>assert.equal(c.allowedValues.filter(x=>x.productId===p&&x.specificationKey==='size').length,2131));
test('06 dusk gray limits interior colors to black/precious white',()=>assert.deepEqual(getAllowedValues(c,p,'interior_color',{exterior_color:'EXT-H'}).map(x=>x.value).sort(),['INT-F','INT-M']));
test('07 evidence and required references are intact',()=>{const ev=new Set(c.evidence.filter(x=>x.productId===p).map(x=>x.id));const defs=new Set(c.specificationDefinitions.filter(x=>x.productId===p).map(x=>x.key));for(const row of c.allowedValues.filter(x=>x.productId===p))for(const id of row.evidenceIds??[])assert.ok(ev.has(id),id);for(const row of c.requiredFieldRules.filter(x=>x.productId===p)){assert.ok(defs.has(row.specificationKey));for(const id of row.evidenceIds??[])assert.ok(ev.has(id),id);}});
test('08 architecture has no product/window branching in common engine',async()=>{validateCatalog(c);for(const path of ['src/catalog/catalog-adapter.mjs','src/catalog/catalog-resolver.mjs']){const s=await readFile(new URL(`../${path}`,import.meta.url),'utf8');assert.equal(/サーモス|APW|WT-S2H|SP-S2H/.test(s),false,path);}});
