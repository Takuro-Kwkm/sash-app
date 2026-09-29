import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { compileGlassRuleModel } from '../../src/catalog/runtime-master/uchirimo-glass-rule-model.mjs';

// This job intentionally reads the candidate only. The 8,490-row legacy
// reference belongs to the one-time migration proof, not recurring QA.
const input = process.env.UCHIRIMO_SLIM_INPUT ?? 'data/uchirimo-slim/working-candidate.json';
const output = process.env.UCHIRIMO_SLIM_QA_OUT ?? 'artifacts/uchirimo-slim/recurring-qa.json';
const start = performance.now();
const bytes = readFileSync(input);
const candidate = JSON.parse(bytes);
const c = candidate.canonical;
const assert = (condition, code) => { if (!condition) throw new Error(code); };
const unique = (rows, key) => {
  const ids = rows.map((row) => row[key]);
  assert(ids.every(Boolean) && new Set(ids).size === ids.length, `DUPLICATE_OR_MISSING_${key}`);
  return new Set(ids);
};
assert(candidate.lifecycle === 'WORKING_CANDIDATE_NOT_FORMAL', 'CANDIDATE_LIFECYCLE_CHANGED');
assert(!Object.hasOwn(c, 'glass_node_matrix'), 'LEGACY_MATRIX_REINTRODUCED');
const nodeIds = unique(c.product_nodes, 'node_id');
const glassRules = c.glass_rule_model ? compileGlassRuleModel(c) : null;
const glassIds = unique(c.glass_rule_model?.identities ?? c.glass_specs, 'glass_spec_id');
const profileIds = unique(c.glass_compatibility_profiles, 'profile_id');
const evidenceIds = unique(c.evidence, 'source_id');
unique(c.dependency_rules, 'rule_id');
unique(c.glass_size_rules, 'gsc_id');
const dispositions = { AVAILABLE: 0, NOT_APPLICABLE: 0, SPECIAL_CHECK_REQUIRED: 0 };
let evaluated = 0;
for (const profile of c.glass_compatibility_profiles) {
  const seen = new Set();
  for (const row of profile.node_statuses) {
    assert(nodeIds.has(row.node_id) && !seen.has(row.node_id), 'PROFILE_NODE_COVERAGE');
    assert(Object.hasOwn(dispositions, row.status), 'PROFILE_STATUS_UNKNOWN');
    seen.add(row.node_id); dispositions[row.status] += 1; evaluated += 1;
  }
  assert(seen.size === nodeIds.size, 'PROFILE_NODE_COVERAGE');
  evaluated += 1;
}
for (const glass of c.glass_rule_model?.assessment.map((row) => row.facts) ?? c.glass_specs) {
  assert(profileIds.has(glass.compatibility_profile_id), 'GLASS_PROFILE_ORPHAN');
  if (!glassRules) evaluated += 1;
}
if (glassRules) evaluated += glassRules.authoritative_records;
for (const rule of c.dependency_rules) {
  assert(typeof rule.source_id === 'string' && rule.source_id.length > 0, 'RULE_SOURCE_MISSING');
  if (rule.source_id.startsWith('EV-UCH-')) assert(evidenceIds.has(rule.source_id), 'RULE_EVIDENCE_ORPHAN');
  evaluated += 1;
}
for (const rule of c.glass_size_rules) {
  assert(rule.source_ids.every((id) => evidenceIds.has(id)), 'SIZE_EVIDENCE_ORPHAN');
  evaluated += 1;
}
for (const row of c.installation_rules) {
  assert(Array.isArray(row) && row.length >= 5 && row[0] && row[4], 'INSTALLATION_RULE_INCOMPLETE');
  evaluated += 1;
}
// Product nodes and evidence were checked for unique identifiers above.
evaluated += c.product_nodes.length + c.evidence.length;
const report = {
  schema_version: 'UCHIRIMO_SLIM_RECURRING_QA_V2', status: 'PASS',
  evidence_scope: 'NORMALIZED_PRODUCT_RULE_INTEGRITY_NOT_FULL_SELECTOR_FLOW_CLOSURE',
  candidate_sha256: createHash('sha256').update(bytes).digest('hex'),
  counts: { base_nodes: nodeIds.size, glass_specs: glassIds.size,
    compatibility_profiles: profileIds.size, profile_node_dispositions: Object.values(dispositions).reduce((a, b) => a + b, 0),
    dependency_rules: c.dependency_rules.length, size_constraints: c.glass_size_rules.length,
    installation_rules: c.installation_rules.length, evidence_rows: c.evidence.length,
    authoritative_records_evaluated: evaluated,
    identity_records_checked: glassRules?.identity_records_checked ?? glassIds.size,
    total_record_visits_including_identity: evaluated + (glassRules?.identity_records_checked ?? 0),
    glass_model: glassRules ? Object.fromEntries(['base', 'decoration', 'cavity', 'assessment', 'rules'].map((key) => [key, c.glass_rule_model[key].length])) : null,
    legacy_materialized_rows_evaluated: 0, glass_spec_rows_materialized: 0,
    dispositions_in_profiles: dispositions },
  duration_ms: Math.round((performance.now() - start) * 1000) / 1000,
  observed_peak_heap_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
};
mkdirSync(output.slice(0, output.lastIndexOf('/')), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
