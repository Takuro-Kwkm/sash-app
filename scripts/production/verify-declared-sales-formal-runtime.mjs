import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { formalComposedRuntimeEntries, readFormalComposedModule } from '../../src/catalog/runtime-master/formal-composed-runtime-registry.mjs';
import { validatePrivateRuntimeUiPackage } from './validate-private-runtime-ui-adoption.mjs';

const read = async path => JSON.parse(await readFile(path, 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const write = (path, value) => writeFile(path, JSON.stringify(value, null, 2) + '\n');
const contract = await read(process.env.QA_ADOPTION_CONTRACT);
const profile = await read(contract.profile.path);
const out = resolve(process.env.QA_OUTPUT_DIR);
assert.ok(!process.env.SASH_CANDIDATE_MODE && !process.env.SASH_CANDIDATE_RUNTIME_INDEX && !process.env.SASH_WORKING_PREVIEW_MANIFEST);
await mkdir(out, { recursive: true });

const candidateIndex = resolve(contract.candidate_root, 'index.json');
const formalIndex = resolve(contract.package_root, 'runtime_index.json');
validatePrivateRuntimeUiPackage(formalIndex, candidateIndex, contract.profile.path);
const formal = formalComposedRuntimeEntries.find(entry => entry.id === profile.formal_product_id);
assert.ok(formal?.privateBinding && formal.runtimeManifestDriveFileId);
assert.equal(formal.runtimeManifestSha256, hash(await readFile(formalIndex)));
assert.equal(formal.productMasterFormalReference.sha256, profile.formal_master.sha256);
assert.equal(readFormalComposedModule(formal).integrity.match, true);

const qaFile = contract.inputs.declared_browser_qa;
const qaBytes = await readFile(qaFile.path);
assert.equal(hash(qaBytes), qaFile.sha256);
const qa = JSON.parse(qaBytes);
assert.equal(qa.product_id, (await read(candidateIndex)).products[0].id);
for (const [field, values] of Object.entries(qa.required_selection_values ?? {})) {
  for (const value of values) assert.ok(qa.rows.some(row => row.seed[field] === value), field + ': ' + value);
}
const browserContract = resolve(out, 'browser-contract.json');
await write(browserContract, {
  ...qa,
  product_id: formal.id,
  manifest_file_id: formal.runtimeManifestDriveFileId,
});

const parityPath = resolve(out, 'formal-parity.json');
execFileSync(process.execPath, ['scripts/production/validate-domain-runtime-projection.mjs', formalIndex, parityPath], {
  cwd: contract.checkout,
  stdio: ['ignore', 'pipe', 'inherit'],
});
const parity = await read(parityPath);
assert.equal(parity.status, 'PASS');
assert.equal(parity.products.length, 1);
assert.equal(parity.products[0].id, formal.id);
assert.equal(parity.products[0].cases, profile.formal_master.carried_qa_passed);

const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: contract.checkout, encoding: 'utf8' }).trim();
const entry = `
import {createServer} from 'node:http';
import {createRecoveryRequestHandler} from './src/server/recovery-app.mjs';
const server = createServer(createRecoveryRequestHandler());
server.listen(0, '127.0.0.1', () => console.log(server.address().port));
`;
const server = spawn(process.execPath, ['--input-type=module', '-e', entry], {
  cwd: contract.checkout,
  env: { ...process.env, SASH_RELEASE_COMMIT_SHA: head },
  stdio: ['ignore', 'pipe', 'inherit'],
});
try {
  const url = await new Promise((done, fail) => {
    const timer = setTimeout(() => fail(new Error('Normal runtime did not start')), 30000);
    server.once('error', fail);
    server.once('exit', code => fail(new Error('Normal runtime exited with code ' + code)));
    server.stdout.on('data', bytes => {
      const port = String(bytes).trim();
      if (/^\d+$/.test(port)) {
        clearTimeout(timer);
        done('http://127.0.0.1:' + port);
      }
    });
  });
  const browser = spawn(process.execPath, ['test/browser/declared-sales-runtime-browser-qa.mjs'], {
    cwd: contract.checkout,
    env: {
      ...process.env,
      QA_BASE_URL: url,
      QA_EXPECTED_COMMIT: head,
      QA_OUTPUT_DIR: out,
      QA_PLAYWRIGHT_MODULE: contract.playwright_module,
      QA_RUNTIME_QA_CONTRACT: browserContract,
    },
    stdio: 'inherit',
  });
  const [status] = await once(browser, 'exit');
  assert.equal(status, 0, 'Normal runtime browser QA failed');
  const report = await read(resolve(out, 'report.json'));
  assert.equal(report.status, 'PASS');
  assert.deepEqual(report.viewports.map(row => row.width), qa.viewports);
  assert.ok(report.viewports.every(row => row.products.length === qa.rows.length));
  const result = {
    status: 'PASS',
    normal_runtime: true,
    formal_product_id: formal.id,
    viewports: qa.viewports,
    browser_cases: qa.viewports.length * qa.rows.length,
    parity_cases: parity.products[0].cases,
    product_master_mutations: 0,
    release: false,
  };
  await write(resolve(out, 'native-summary.json'), result);
  console.log(JSON.stringify(result));
} finally {
  server.kill('SIGTERM');
}
