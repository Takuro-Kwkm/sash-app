import { currentExactHead, parseArgs, readJson, sha256File, writeJson } from './governance-lib.mjs';

const args = parseArgs(process.argv.slice(2));
if (!args.gate || !args.status) {
  console.error('Usage: collect-evidence.mjs --gate GATE_ID --status PASS|FAIL|BLOCKED [--artifact path] [--command command] [--scope text] [--output path]');
  process.exit(2);
}
if (!['PASS', 'FAIL', 'BLOCKED'].includes(args.status)) {
  console.error(`unsupported evidence status: ${args.status}`);
  process.exit(2);
}

const base = readJson('project-governance/evidence-manifest.json');
const output = args.output || 'artifacts/governance/evidence-manifest.generated.json';
let manifest = base;
try {
  manifest = readJson(output);
} catch {}
const head = currentExactHead();
const now = new Date().toISOString();
const entry = {
  id: `${args.gate}-${head.slice(0, 12)}-${Date.now()}`,
  gate_id: args.gate,
  outcome: args.status,
  exact_head: head,
  artifact: args.artifact || null,
  artifact_sha256: sha256File(args.artifact),
  command: args.command || null,
  scope: args.scope || null,
  recorded_at: now,
  authoritative_for_current_head: true
};
manifest = { ...manifest, generated_at: now, entries: [...manifest.entries, entry] };
writeJson(output, manifest);
console.log(`EVIDENCE_RECORDED=${entry.id}`);
console.log(`EVIDENCE_EXACT_HEAD=${head}`);
