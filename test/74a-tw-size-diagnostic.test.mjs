import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { standardSizeMetadataFromRuntimeValue } from '../src/catalog/runtime-master/new-construction-sash-runtime-ui-contract.mjs';

test('diagnostic: enumerate formal TW size display metadata gaps and duplicate labels', async () => {
  const runtime = await loadRegisteredRuntime('LIXIL','TW');
  const rows = runtime.master.provider?.sizes ?? [];
  const missing = [];
  const groups = new Map();
  for (const row of rows) {
    const metadata = standardSizeMetadataFromRuntimeValue({ source: row });
    if (!metadata) {
      missing.push({ id:row.id, window_id:row.window_id, nominal_w:row.nominal_w, nominal_h:row.nominal_h, actual_w:row.actual_w, actual_h:row.actual_h, construction:row.construction, configuration:row.configuration });
      continue;
    }
    const key = `${row.window_id}|${metadata.callCode}|${metadata.actualW}|${metadata.actualH}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ id:row.id, nominal_w:row.nominal_w, nominal_h:row.nominal_h, construction:row.construction, configuration:row.configuration });
  }
  const duplicates = [...groups.entries()].filter(([,items])=>items.length>1).map(([key,items])=>({key,items}));
  console.log('TW_SIZE_MISSING=' + JSON.stringify(missing));
  console.log('TW_SIZE_DUPLICATES=' + JSON.stringify(duplicates.slice(0,50)));
  console.log(`TW_SIZE_COUNTS=${JSON.stringify({total:rows.length,missing:missing.length,duplicateGroups:duplicates.length})}`);
  assert.ok(rows.length > 0);
});
