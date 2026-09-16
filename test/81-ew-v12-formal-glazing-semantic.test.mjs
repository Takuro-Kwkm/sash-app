import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { runGlobalWindowRuntimeSemanticAudit } from '../scripts/global-window-runtime-semantic-audit.mjs';

test('EW v1.2 projects formal 08D glazing semantics instead of raw mixed 08B/08C values', async () => {
  const runtime = await loadRegisteredRuntime('LIXIL','EW');
  assert.ok(runtime?.master);

  const fieldKeys = runtime.master.fields.map((row) => row.field_name);
  assert.ok(fieldKeys.includes('glass_type'));
  assert.ok(fieldKeys.includes('glass_detail'));
  assert.ok(fieldKeys.includes('glass_function'));

  const functionRows = runtime.master.values.filter((row) => row.field_name === 'glass_function');
  assert.ok(functionRows.some((row) => row.canonical_value === 'SAFE' && row.display_label === '安全合わせ'));
  assert.ok(functionRows.every((row) => row.display_label !== 'フロスト/型板' && row.display_label !== 'フロスト／型板'));
  assert.ok(functionRows.every((row) => row.source?.formalGlazingSemantic === true));

  const state = runtime.resolver({
    window_type:'WT-EW-TATE-SUBERI',
    window_spec:'SP-EW-TATE-T',
    glass_base:'GL-EW-LOWE-PG',
  });
  assert.equal(state.fields.glass_type.visibility,'SHOW');
  assert.deepEqual(state.fields.glass_type.allowed_values,['CLEAR','PATTERN','FROST']);
  assert.ok(state.fields.glass_detail.allowed_values.includes('LOWE_CLEAR'));
  assert.ok(state.fields.glass_function.allowed_values.includes('SAFE'));
  assert.ok(state.fields.glass_function.allowed_values.includes('GRID'));

  const report = await runGlobalWindowRuntimeSemanticAudit();
  const ew = report.integrations.find((row) => row.series === 'EW');
  assert.ok(ew);
  assert.equal(ew.issueCount,0);
  assert.equal(ew.status,'PASS');
});
