import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { createRecoveryRequestHandler } from '../../src/server/recovery-app.mjs';
import { getRuntimeMasterEntry } from './uchirimo-frozen-migration-entry.mjs';
import { loadCanonicalWorkbookRuntimePackage } from '../../src/catalog/runtime-master/canonical-runtime-manifest-loader.mjs';
import { adaptUchirimoTabularV1 } from '../../src/catalog/runtime-master/uchirimo-tabular-v1-adapter.mjs';
import { getRuntimeAppIntegration, normalizeRuntimeSelection, toRuntimeUiResult } from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';

// Keep the production handler and FORMAL registry untouched. Only requests
// marked by this local QA client are routed through the Working candidate.
const productId = 'SER-YKKAP-UCHIRIMO';
const candidateBytes = readFileSync('data/uchirimo-slim/working-candidate.json');
const candidateHash = createHash('sha256').update(candidateBytes).digest('hex');
const candidate = JSON.parse(candidateBytes);
assert.equal(candidate.lifecycle, 'WORKING_CANDIDATE_NOT_FORMAL');
assert.equal(candidateHash, '4a3518c3f5706aa4cff6ddcc10532edcade4f00f84a81ad63e3d74fa98d85930');
const entry = getRuntimeMasterEntry('YKK AP', 'ウチリモ 内窓');
const pkg = await loadCanonicalWorkbookRuntimePackage(entry);
assert.equal(pkg.integrity.match, true);
assert.equal(pkg.integrity.actual, candidate.source_formal.runtime_manifest_sha256);
const role = Object.keys(pkg.documents).find((key) => pkg.documents[key]?.glass_node_matrix);
assert.ok(role);
const slim = adaptUchirimoTabularV1({ ...pkg, documents: { ...pkg.documents, [role]: candidate.canonical } });
const integration = getRuntimeAppIntegration(productId);
const formalHandler = createRecoveryRequestHandler();
let candidateRequests = 0;
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname !== '/api/runtime-master/resolve' || req.headers['x-uchirimo-slim-qa'] !== 'candidate') {
    return formalHandler(req, res);
  }
  try {
    assert.equal(url.searchParams.get('productId'), productId);
    const selection = JSON.parse(url.searchParams.get('selection') ?? '{}');
    const normalized = normalizeRuntimeSelection(slim.master, selection);
    const state = slim.resolver(normalized);
    const body = toRuntimeUiResult(slim.master, state, integration, pkg.integrity);
    candidateRequests++;
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify(body));
  } catch (error) {
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: String(error) }));
  }
});
const out = process.env.UCHIRIMO_SLIM_HTTP_E2E_OUT ?? 'artifacts/uchirimo-slim/http-e2e.json';
const start = performance.now();
let compared = 0;
const checkpoints = [];
try {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const health = await fetch(`${base}/health`).then((response) => response.json());
  assert.equal(health.ok, true);
  const inventory = await fetch(`${base}/api/runtime-master/integrations`).then((response) => response.json());
  assert.ok(inventory.some((row) => row.id === productId && row.selectable));
  const resolve = async (selection) => {
    const url = `${base}/api/runtime-master/resolve?productId=${productId}&selection=${encodeURIComponent(JSON.stringify(selection))}`;
    const [formalResponse, slimResponse] = await Promise.all([
      fetch(url), fetch(url, { headers: { 'x-uchirimo-slim-qa': 'candidate' } }),
    ]);
    assert.equal(formalResponse.status, 200);
    assert.equal(slimResponse.status, 200);
    const [formal, after] = await Promise.all([formalResponse.json(), slimResponse.json()]);
    assert.deepEqual(after, formal, `Runtime/UI response diverged at request ${compared + 1}`);
    compared++;
    return after;
  };
  const choose = async (key, preferred) => {
    const field = result.fields.find((row) => row.key === key);
    assert.ok(field, `Missing field ${key}`);
    assert.ok(field.dataType === 'NUMBER' || field.values.some((row) => row.value === preferred), `Unavailable ${key}=${preferred}`);
    selection = { ...result.selection, [key]: preferred };
    result = await resolve(selection);
    selection = result.selection;
    checkpoints.push({ key, value: preferred, status: result.validation.status });
  };
  let selection = {};
  let result = await resolve(selection);
  await choose('room_specification', 'residential');
  await choose('window_type', 'fix_window');
  await choose('glass_family', 'insulating_glass');
  await choose('glass_structure', 'P3P3');
  await choose('spacer_type', 'aluminum');
  assert.equal(result.selection.gas_fill, undefined);
  await choose('glass_family', 'single_glazing');
  assert.ok(!result.fields.some((row) => row.key === 'spacer_type' || row.key === 'gas_fill'));
  for (const [key, preferred] of [['glass_structure', 'W3'], ['glass_surface_type', 'washi'], ['safety_treatment', 'standard'], ['grille_type', 'none'], ['muntin_type', 'none']]) {
    const field = result.fields.find((row) => row.key === key);
    if (field && result.selection[key] === undefined) await choose(key, field.values.some((row) => row.value === preferred) ? preferred : field.values[0].value);
  }
  for (let index = 0; index < 60; index++) {
    const field = result.fields.find((row) => row.required && result.selection[row.key] === undefined);
    if (!field) break;
    await choose(field.key, field.dataType === 'NUMBER' ? 500 : field.values[0].value);
  }
  assert.equal(result.validation.status, 'MANUAL_CHECK');
  assert.equal(result.orderReady, false);
  assert.equal(result.dimensionResult.status, 'PASS');
  assert.ok(result.manualWarnings.some((text) => text.includes('メーカー見積')));
  await choose('size_w', 100);
  assert.equal(result.validation.status, 'BLOCKED');
  assert.equal(result.dimensionResult.status, 'BLOCK');
  await choose('size_w', 500);
  assert.equal(result.dimensionResult.status, 'PASS');
  assert.equal(candidateRequests, compared);
  const report = { schema_version: 'UCHIRIMO_SLIM_HTTP_E2E_V1', status: 'PASS',
    candidate_sha256: candidateHash, source_runtime_sha256: pkg.integrity.actual,
    compared_http_responses: compared, candidate_requests: candidateRequests,
    checkpoints, manual_check_preserved: true, blocked_size_preserved: true,
    duration_ms: Math.round((performance.now() - start) * 1000) / 1000 };
  mkdirSync(out.slice(0, out.lastIndexOf('/')), { recursive: true });
  writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
