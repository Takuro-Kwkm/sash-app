import { spawnSync } from 'node:child_process';

const files = [
  'src/catalog/runtime-master/app-runtime-integration-registry.mjs',
  'src/catalog/runtime-master/canonical-workbook-reference-v1-adapter.mjs',
  'src/catalog/runtime-master/tw-canonical-workbook-reference-v1-adapter.mjs',
  'src/catalog/runtime-master/canonical-workbook-runtime-engine.mjs',
  'src/catalog/runtime-master/runtime-app-bridge.mjs',
  'src/catalog/runtime-master/runtime-manifest-loader.mjs',
  'src/catalog/runtime-master/runtime-master-registry.mjs',
  'src/catalog/runtime-master/runtime-ui-template.mjs',
  'src/catalog/runtime-master/semantic-table-bundle-v2-adapter.mjs',
  'src/catalog/runtime-master/semantic-table-bundle-v2-engine-core.mjs',
  'src/catalog/runtime-master/semantic-table-bundle-v2-engine.mjs',
  'src/ui/web/app.js',
  'scripts/build-tw-runtime-review-preview.mjs',
  'scripts/tw-runtime-smoke.mjs',
  'scripts/inplus-runtime-smoke.mjs',
  'test/70-runtime-manifest-tw-integration.test.mjs',
  'test/71-runtime-ui-tw-gate.test.mjs',
  'test/70-runtime-app-bridge-inplus-v04r1.test.mjs',
  'test/browser/tw-runtime-browser-qa.mjs',
  'test/browser/inplus-runtime-browser-qa.mjs',
];
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio:'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`Runtime UI source lint: PASS (${files.length} files)`);
