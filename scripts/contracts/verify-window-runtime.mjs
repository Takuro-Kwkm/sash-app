// Independent replay: reads current runtime code, rather than trusting the build summary.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { resolveRuntimeAppProduct } from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
const root='contracts/window-seven';
const inventory=JSON.parse(fs.readFileSync(`${root}/field-inventory.json`));
const observations=JSON.parse(fs.readFileSync(`${root}/evidence/runtime-observations.json`));
const contracts=JSON.parse(fs.readFileSync(`${root}/selection-contracts.json`)).fields;
const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
const digest=x=>createHash('sha256').update(JSON.stringify(stable(x))).digest('hex');
const fields=[];let replayed=0;
for(const product of observations.sash){
  const reached=new Set();
  for(const sample of product.samples){
    const result=await resolveRuntimeAppProduct(product.integration.id,sample.selection,{workflowScope:sample.workflowScope??'estimate'});
    assert.deepEqual(result.fields.map(f=>f.key),sample.field_order,`${product.integration.id}:field-order parity`);
    // Persisted JSON omits undefined properties; compare the actual save format.
    assert.deepEqual(JSON.parse(JSON.stringify(result.selection)),sample.normalized_selection,`${product.integration.id}:selection parity`);
    assert.deepEqual(JSON.parse(JSON.stringify(result.clearedFields??[])),sample.clearedFields,`${product.integration.id}:reset parity`);
    for(const field of result.fields)reached.add(field.key);
    replayed++;
  }
  for(const excluded of inventory.excluded.filter(f=>f.field_id.startsWith(`sash-app:${product.integration.id}:`))){
    assert.ok(!reached.has(excluded.field_id.split(':').at(-1)),`Observed Field cannot be excluded: ${excluded.field_id}`);
  }
  for(const field of inventory.fields.filter(f=>f.product_id===product.integration.id)){
    const contract=contracts.find(c=>c.field_id===field.field_id);
    const {status,...identity}=contract;
    assert.equal(digest(identity),field.runtime_identity_sha256);
    const pass=reached.has(field.internal_key);
    fields.push({field_id:field.field_id,runtime_identity_sha256:digest(identity),runtime_parity:pass?'PASS':'UNVERIFIED',flow_parity:pass?'PASS':'UNVERIFIED',basis:'Current-code replay of captured branch selections; not exhaustive manufacturability coverage.'});
  }
}
fs.writeFileSync(`${root}/evidence/independent-runtime-replay.json`,JSON.stringify({status:'PASS',replayed_states:replayed,fields},null,2)+'\n');
console.log(JSON.stringify({status:'PASS',replayed_states:replayed,fields:fields.length,unverified:fields.filter(f=>f.runtime_parity!=='PASS').map(f=>f.field_id)}));
