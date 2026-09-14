import test from 'node:test';
import assert from 'node:assert/strict';
import { getRuntimeMasterEntry } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { loadFormalProductRuntimePackage } from '../src/catalog/runtime-master/formal-product-runtime-loader.mjs';

test('diagnostic: APW431 duplicate visible size rows and exact references', async () => {
  const entry = getRuntimeMasterEntry('YKK AP','APW431');
  assert.ok(entry);
  const pkg = await loadFormalProductRuntimePackage(entry);
  const dimensions = pkg.documents.DIMENSIONS;
  const ids = new Set(['SZ431-0224','SZ431-0225']);
  const rows = (dimensions.standard_sizes ?? []).filter((row)=>ids.has(row.id));
  const candidates = (dimensions.integrated_candidates ?? []).filter((row)=>ids.has(row.sizeId));
  const customRefs = (dimensions.custom_dimension_rules ?? []).filter((row)=>{
    const text = JSON.stringify(row);
    return [...ids].some((id)=>text.includes(id));
  });
  console.log('APW431_DUP_ROWS=' + JSON.stringify(rows));
  console.log('APW431_DUP_CANDIDATES=' + JSON.stringify(candidates));
  console.log('APW431_DUP_CUSTOM_REFS=' + JSON.stringify(customRefs));
  console.log('APW431_DIMENSION_KEYS=' + JSON.stringify(Object.keys(dimensions)));
  assert.equal(rows.length,2);
});
