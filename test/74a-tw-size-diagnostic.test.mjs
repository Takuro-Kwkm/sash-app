import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';

test('diagnostic: inspect formal TW size rows for call-code encoding and duplicates', async () => {
  const runtime = await loadRegisteredRuntime('LIXIL','TW');
  const rows = runtime.master.provider?.sizes ?? [];
  const pick = rows.filter((row) =>
    row.id === 'SZ-LIX-TW-FLAT-Z-251-2-18' ||
    row.id === 'SZ-LIX-TW-FLAT-Z-119-18' ||
    (Number(row.actual_w) === 640 && Number(row.actual_h) === 370) ||
    String(row.id ?? '').includes('UNIT-HIKI')
  ).slice(0,40).map((row) => ({
    id: row.id,
    nominal_w: row.nominal_w,
    nominal_h: row.nominal_h,
    actual_w: row.actual_w,
    actual_h: row.actual_h,
    construction: row.construction,
    configuration: row.configuration,
    panel_count: row.panel_count,
    sash_count: row.sash_count,
    status: row.status,
  }));
  console.log('TW_SIZE_DIAGNOSTIC=' + JSON.stringify(pick));
  const target = rows.find((row) => row.id === 'SZ-LIX-TW-FLAT-Z-251-2-18');
  console.log('TW_SIZE_TARGET=' + JSON.stringify(target ?? null));
  assert.ok(rows.length > 0);
});
