import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const SOURCE = new URL('./stage-a-tw-behavioral-projection-count-pilot.mjs', import.meta.url);
const OUT = new URL('./.stage-a-tw-behavioral-projection-count-recovery-v2.mjs', import.meta.url);
let source = await readFile(SOURCE, 'utf8');

function replaceOnce(label, before, after) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Recovery patch anchor missing: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`Recovery patch anchor not unique: ${label}`);
  source = source.slice(0, first) + after + source.slice(first + before.length);
}

replaceOnce(
  'behaviorFor electrical spec projection',
  `function behaviorFor(field, value, result) {\n  if (field.key === 'size') return sizeBehavior(value);\n  if (field.key === 'glass_type') return glassTypeBehavior(value, result);\n  if (field.key === 'glass_detail') return glassDetailBehavior(value, result);\n  return null;\n}`,
  `function behaviorFor(field, value, result) {\n  if (field.key === 'size') return sizeBehavior(value);\n  if (field.key === 'glass_type') return glassTypeBehavior(value, result);\n  if (field.key === 'glass_detail') return glassDetailBehavior(value, result);\n  if (field.key === 'operation_type' || field.key === 'shutter_type') return { electrical_class:String(value).includes('ELE') ? 'ELE' : 'NON_ELE' };\n  return null;\n}`,
);

replaceOnce(
  'projected scalar field set',
  `  if (!['size','glass_type','glass_detail'].includes(field.key)) {`,
  `  if (!['size','glass_type','glass_detail','operation_type','shutter_type'].includes(field.key)) {`,
);

replaceOnce(
  'pairwise shape audit runtime semantics',
  `function auditPairwiseRuleShape() {\n  const rows=targetSelectionDenialRules();\n  const allowedKeys=new Set(['窓種適用','建て方/区分','障子枚数','実寸W(mm)','ガラス大分類','電動仕様','選択状態']);\n  const unsupported=[];\n  for (const row of rows) {\n    const trigger=row['トリガーoption_id'];\n    if (Array.isArray(trigger) || (trigger && typeof trigger === 'object')) unsupported.push({ reason:'NON_SCALAR_TRIGGER', trigger });\n    const key=String(row['条件項目'] ?? '');\n    if (key && !allowedKeys.has(key)) unsupported.push({ reason:'CONDITION_KEY', key });\n  }\n  return { row_count:rows.length, unsupported_count:unsupported.length, unsupported, digest:hash(rows) };\n}`,
  `function auditPairwiseRuleShape() {\n  const sourceRows=targetSelectionDenialRules();\n  const allowedKeys=new Set(['窓種適用','建て方/区分','障子枚数','実寸W(mm)','ガラス大分類','電動仕様','選択状態']);\n  const effectiveRows=[], ignoredRows=[], unsupported=[];\n  for (const row of sourceRows) {\n    const key=String(row['条件項目'] ?? '');\n    if (key && !allowedKeys.has(key)) { ignoredRows.push(row); continue; }\n    effectiveRows.push(row);\n    const trigger=row['トリガーoption_id'];\n    if (Array.isArray(trigger) || (trigger && typeof trigger === 'object')) unsupported.push({ reason:'NON_SCALAR_TRIGGER', trigger });\n  }\n  return { source_row_count:sourceRows.length, row_count:effectiveRows.length, ignored_runtime_rule_count:ignoredRows.length, ignored_runtime_rule_digest:hash(ignoredRows), unsupported_count:unsupported.length, unsupported, digest:hash(effectiveRows) };\n}`,
);

replaceOnce(
  'projection model version',
  `projection_model_version:'TW_WEIGHTED_BEHAVIORAL_PROJECTION_V1'`,
  `projection_model_version:'TW_WEIGHTED_BEHAVIORAL_PROJECTION_V2_RECOVERY'`,
);

replaceOnce(
  'report note',
  `note:'Pilot only. Exact logical multiplicity is preserved when Runtime values are grouped into behavior classes. Every member of every projected group is resolved and compared for survival, validity, and the full immediate future selector signature. Projection behavior keys are derived from the TW canonical Runtime rule semantics; mismatch fails closed. No Product Master mutation.'`,
  `note:'Five-failure recovery candidate only. V2 additionally projects operation_type/shutter_type by the exact ELE/non-ELE predicate used by canonical option resolution and excludes selection-denial rows whose condition keys the canonical engine does not evaluate. Every projected member is resolved and compared against the full immediate future selector signature; mismatch fails closed. Exact logical multiplicity is preserved. No Product Master mutation.'`,
);

await writeFile(OUT, source, 'utf8');

const child = spawn(process.execPath, [OUT.pathname], {
  stdio: 'inherit',
  env: process.env,
});
const exitCode = await new Promise((resolve, reject) => {
  child.once('error', reject);
  child.once('exit', (code, signal) => signal ? reject(new Error(`Recovery proof killed by ${signal}`)) : resolve(code ?? 1));
});
process.exitCode = exitCode;
