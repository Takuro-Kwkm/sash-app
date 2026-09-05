import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { THERMOSL_MODULE } from '../src/catalog/modules/thermosl-module.mjs';
import { THERMOSL_SOURCE } from '../src/catalog/modules/thermosl-source.mjs';

const EXPECTED = Object.freeze({
  manufacturer: 'LIXIL',
  series: 'サーモスL',
  productId: 'SER-LIX-SAMOSL',
  packageVersion: 'v0.7',
  authoringFileId: '17lVzBZ1hp4RVcGv0yNdnrKt25SFO2FhL',
  authoringSha256: 'cd6844218fcf0150a16cbbfa947f391aa08f5449b82ba6fc2249ccdb6894c3d3',
  authoringRevisionId: '0B1PsqngSohhlZVhYaTVRdUNPRFp4ZVB5Y05IdnJNYXI4YTlZPQ',
  authoringSizeBytes: 678886,
  standardSizeRows: 1644,
  selectableSizeRows: 1495,
  activeWindowTypes: 17,
  customDimensionRules: 50,
  goldenTests: 29,
});

const stableDigest = (values) => createHash('sha256')
  .update(`${[...values].sort().join('\n')}\n`, 'utf8')
  .digest('hex');
const fileDigest = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

function runtimeInventory() {
  const windowIds = THERMOSL_MODULE.allowedValues
    .filter((row) => row.specificationKey === 'window_type')
    .map((row) => row.value);
  const standardSizeIds = THERMOSL_MODULE.standardSizeRecords.map((row) => row.id);
  const selectableSizeIds = THERMOSL_MODULE.standardSizeRecords
    .filter((row) => row.selectable !== false && row.status !== 'INACTIVE')
    .map((row) => row.id);
  const dimensionRules = THERMOSL_MODULE.ruleSets
    .find((row) => row.type === 'DIMENSION_RULES')?.payload ?? [];
  const goldenTests = THERMOSL_MODULE.goldenTests ?? [];
  return { windowIds, standardSizeIds, selectableSizeIds, dimensionRules, goldenTests };
}

export function buildThermosLRuntimePackage() {
  const inv = runtimeInventory();
  const master = THERMOSL_SOURCE.master;
  const binding = {
    file_id: master.id,
    file_name: master.title,
    package_version: master.version,
    revision_id: master.revisionId,
    modified_time: master.modifiedTime,
    size_bytes: master.sizeBytes,
    sha256: master.sha256,
  };

  const checks = {
    manufacturer: THERMOSL_MODULE.product.manufacturer === EXPECTED.manufacturer,
    series: THERMOSL_MODULE.product.displayName === EXPECTED.series,
    product_id: THERMOSL_MODULE.product.id === EXPECTED.productId,
    package_version: master.version === EXPECTED.packageVersion,
    authoring_file_id: master.id === EXPECTED.authoringFileId,
    authoring_sha256: master.sha256 === EXPECTED.authoringSha256,
    authoring_revision_id: master.revisionId === EXPECTED.authoringRevisionId,
    authoring_size_bytes: master.sizeBytes === EXPECTED.authoringSizeBytes,
    active_window_types: inv.windowIds.length === EXPECTED.activeWindowTypes,
    standard_size_rows: inv.standardSizeIds.length === EXPECTED.standardSizeRows,
    selectable_size_rows: inv.selectableSizeIds.length === EXPECTED.selectableSizeRows,
    custom_dimension_rules: inv.dimensionRules.length === EXPECTED.customDimensionRules,
    golden_tests: inv.goldenTests.length === EXPECTED.goldenTests,
    unique_standard_size_ids: new Set(inv.standardSizeIds).size === inv.standardSizeIds.length,
    unique_window_type_ids: new Set(inv.windowIds).size === inv.windowIds.length,
    no_cartesian_runtime_invention: THERMOSL_SOURCE.runtimeRegeneration?.addedSizeRows === 85,
    compound_rule_fail_closed: inv.dimensionRules
      .filter((row) => row.type === 'COMPOUND_GATE' || row.type === 'SOURCE_GRAPH_GATE')
      .every((row) => row.automatic === false && row.result === 'REVIEW_REQUIRED'),
  };
  const failures = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
  if (failures.length) throw new Error(`Thermos L runtime package QA failed: ${failures.join(', ')}`);

  const productModule = JSON.parse(JSON.stringify(THERMOSL_MODULE));
  const packageObject = {
    runtime_package_schema_version: '1.0',
    role: 'RUNTIME_JSON_PACKAGE',
    manufacturer: EXPECTED.manufacturer,
    series: EXPECTED.series,
    package_version: EXPECTED.packageVersion,
    product_id: EXPECTED.productId,
    source_of_truth: 'AUTHORING_MASTER',
    authoring_binding: binding,
    runtime_projection: {
      module: 'src/catalog/modules/thermosl-module.mjs',
      source: 'src/catalog/modules/thermosl-source.mjs',
      runtime_regeneration_version: THERMOSL_SOURCE.runtimeRegeneration?.version,
      historical_size_regeneration: 'v1.8',
      formal_dimension_regeneration: 'v1.9',
      direct_runtime_invention: false,
    },
    product_module: productModule,
    parity_digests: {
      active_window_type_ids_sha256: stableDigest(inv.windowIds),
      standard_size_ids_sha256: stableDigest(inv.standardSizeIds),
      selectable_size_ids_sha256: stableDigest(inv.selectableSizeIds),
      custom_dimension_rule_ids_sha256: stableDigest(inv.dimensionRules.map((row) => row.id)),
      golden_test_ids_sha256: stableDigest(inv.goldenTests.map((row) => row.id ?? JSON.stringify(row))),
    },
    qa_summary: {
      status: 'PASS',
      checks,
      record_counts: {
        active_window_types: inv.windowIds.length,
        standard_size_rows: inv.standardSizeIds.length,
        selectable_size_rows: inv.selectableSizeIds.length,
        inactive_size_rows: inv.standardSizeIds.length - inv.selectableSizeIds.length,
        custom_dimension_rules: inv.dimensionRules.length,
        golden_tests: inv.goldenTests.length,
      },
      safety: {
        unknown_or_compound_not_auto_passed: true,
        source_graph_gate_review_required: true,
        conditional_glass_gate_preserved: true,
      },
    },
  };

  const schema = {
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    '$id': 'thermosl_runtime_package.schema.json',
    title: 'LIXIL サーモスL Runtime JSON Package v0.7',
    type: 'object',
    additionalProperties: false,
    required: [
      'runtime_package_schema_version','role','manufacturer','series','package_version','product_id',
      'source_of_truth','authoring_binding','runtime_projection','product_module','parity_digests','qa_summary'
    ],
    properties: {
      runtime_package_schema_version: { const: '1.0' },
      role: { const: 'RUNTIME_JSON_PACKAGE' },
      manufacturer: { const: EXPECTED.manufacturer },
      series: { const: EXPECTED.series },
      package_version: { const: EXPECTED.packageVersion },
      product_id: { const: EXPECTED.productId },
      source_of_truth: { const: 'AUTHORING_MASTER' },
      authoring_binding: {
        type: 'object', additionalProperties: false,
        required: ['file_id','file_name','package_version','revision_id','modified_time','size_bytes','sha256'],
        properties: {
          file_id: { const: EXPECTED.authoringFileId },
          file_name: { type: 'string', minLength: 1 },
          package_version: { const: EXPECTED.packageVersion },
          revision_id: { const: EXPECTED.authoringRevisionId },
          modified_time: { type: 'string', minLength: 1 },
          size_bytes: { const: EXPECTED.authoringSizeBytes },
          sha256: { const: EXPECTED.authoringSha256 },
        }
      },
      runtime_projection: { type: 'object' },
      product_module: {
        type: 'object',
        required: ['product','specificationDefinitions','allowedValues','standardSizeRecords','requiredFieldRules','ruleSets','dependencies','evidence','goldenTests','stats'],
        properties: {
          product: { type: 'object' },
          specificationDefinitions: { type: 'array', minItems: 1 },
          allowedValues: { type: 'array', minItems: 1 },
          standardSizeRecords: { type: 'array', minItems: EXPECTED.standardSizeRows, maxItems: EXPECTED.standardSizeRows },
          requiredFieldRules: { type: 'array', minItems: 1 },
          ruleSets: { type: 'array', minItems: 1 },
          dependencies: { type: 'array', minItems: 1 },
          evidence: { type: 'array', minItems: 1 },
          goldenTests: { type: 'array', minItems: EXPECTED.goldenTests, maxItems: EXPECTED.goldenTests },
          stats: { type: 'object' },
        }
      },
      parity_digests: { type: 'object' },
      qa_summary: { type: 'object' },
    }
  };

  return { packageObject, schema, checks };
}

export function writeThermosLRuntimePackage(outDir) {
  const out = resolve(outDir);
  mkdirSync(out, { recursive: true });
  const { packageObject, schema, checks } = buildThermosLRuntimePackage();
  const packageText = `${JSON.stringify(packageObject, null, 2)}\n`;
  const schemaText = `${JSON.stringify(schema, null, 2)}\n`;
  const packageSha = fileDigest(packageText);
  const schemaSha = fileDigest(schemaText);
  const qa = {
    schema_version: '1.0',
    manufacturer: EXPECTED.manufacturer,
    series: EXPECTED.series,
    package_version: EXPECTED.packageVersion,
    status: 'PASS',
    authoring_sha256: EXPECTED.authoringSha256,
    runtime_json_sha256: packageSha,
    runtime_schema_sha256: schemaSha,
    runtime_file_count: 2,
    checks,
    next_gate: 'WORKING_SAVEPOINT',
  };
  writeFileSync(resolve(out, 'LIXIL_サーモスL_runtime_v0.7.json'), packageText, 'utf8');
  writeFileSync(resolve(out, 'thermosl_runtime_package.schema.json'), schemaText, 'utf8');
  writeFileSync(resolve(out, 'runtime_package_qa.json'), `${JSON.stringify(qa, null, 2)}\n`, 'utf8');
  return qa;
}

function cliOutDir(argv) {
  const arg = argv.find((value) => value.startsWith('--out-dir='));
  return arg ? arg.slice('--out-dir='.length) : 'artifacts/thermosl-runtime-package-v07';
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const qa = writeThermosLRuntimePackage(cliOutDir(process.argv.slice(2)));
  console.log(JSON.stringify(qa, null, 2));
}
