import { readFile } from 'node:fs/promises';

const ROOT = new URL('../src/catalog/runtime-master-projections/lixil-inplus-v0.4/', import.meta.url);
const files = ['core.json', 'size.json', 'installation.json'];

function summarizeSection(name, value) {
  if (!value || typeof value !== 'object') return { name, type: typeof value };
  if (Array.isArray(value)) return { name, type: 'array', length: value.length, sample: value.slice(0, 2) };
  if (Array.isArray(value.columns) && Array.isArray(value.rows)) {
    return {
      name,
      type: 'table',
      columns: value.columns,
      rowCount: value.rows.length,
      sample: value.rows.slice(0, 3),
    };
  }
  return { name, type: 'object', keys: Object.keys(value), sample: value };
}

const report = {};
for (const file of files) {
  const document = JSON.parse(await readFile(new URL(file, ROOT), 'utf8'));
  report[file] = {
    topLevelKeys: Object.keys(document),
    source: document.source ?? null,
    fieldOrder: document.field_order ?? null,
    sections: Object.entries(document)
      .filter(([key]) => !['projection_version', 'source', 'field_order', 'fixed_identity'].includes(key))
      .map(([name, value]) => summarizeSection(name, value)),
  };
  if (file === 'core.json') {
    report[file].fixedIdentity = document.fixed_identity ?? null;
    report[file].supportedActions = document.supported_actions ?? [];
    report[file].dependencyRules = document.dependency_rules ?? [];
    report[file].manualChecks = document.manual_checks ?? [];
    report[file].uiContract = document.ui_contract ?? null;
    report[file].windowTypeRows = document.window_types ?? null;
    report[file].bodyColorRows = document.body_colors ?? null;
    report[file].frameInstallationRows = document.frame_installation ?? null;
    report[file].optionRows = document.options ?? null;
    report[file].glassConfigColumns = document.glass_configs?.columns ?? [];
  }
}

console.log(JSON.stringify(report, null, 2));
