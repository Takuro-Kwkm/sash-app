import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const SOURCE = new URL('./stage-a-samos-conflict-graph-v4.mjs', import.meta.url);
const GENERATED = new URL('./.stage-a-samos-dependency-frontier-v5.generated.mjs', import.meta.url);
let source = await readFile(SOURCE, 'utf8');

function replaceOnce(label, before, after) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`V5 patch anchor missing: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`V5 patch anchor not unique: ${label}`);
  source = source.slice(0, first) + after + source.slice(first + before.length);
}

replaceOnce(
  'output env',
  "const OUT = process.env.STAGE_A_SAMOS_V4_OUT ?? 'artifacts/stage-a-samos-conflict-graph-v4';",
  "const OUT = process.env.STAGE_A_SAMOS_V5_OUT ?? 'artifacts/stage-a-samos-dependency-frontier-v5';",
);

replaceOnce(
  'next field ordering',
  "const nextField = (r,done) => userFields(r).find((f) => f.key !== 'window_type' && !done.has(f.key)) ?? null;",
  `const nextField = (r,done,depMap) => {
  const unresolved = userFields(r).filter((f) => f.key !== 'window_type' && !done.has(f.key));
  if (!unresolved.length) return null;
  const unresolvedKeys = new Set(unresolved.map((f) => f.key));
  const ancestorCache = new Map();
  const frontier = unresolved.filter((field) => {
    const deps = ancestors(depMap, field.key, ancestorCache);
    return ![...deps].some((key) => unresolvedKeys.has(key));
  });
  const candidates = frontier.length ? frontier : unresolved;
  const descendantCount = (field) => {
    let count = 0;
    for (const other of unresolved) {
      if (other.key === field.key) continue;
      if (ancestors(depMap, other.key, ancestorCache).has(field.key)) count++;
    }
    return count;
  };
  const branchCount = (field) => enabled(field).length + (field.required ? 0 : 1);
  const originalIndex = new Map(unresolved.map((field,index) => [field.key,index]));
  return [...candidates].sort((a,b) =>
    descendantCount(a) - descendantCount(b) ||
    branchCount(a) - branchCount(b) ||
    (originalIndex.get(b.key) ?? 0) - (originalIndex.get(a.key) ?? 0) ||
    String(a.key).localeCompare(String(b.key))
  )[0] ?? null;
};`,
);

const callCount = (source.match(/nextField\(result,done\)/g) ?? []).length;
if (callCount < 1) throw new Error('V5 nextField call anchor missing');
source = source.replaceAll('nextField(result,done)', 'nextField(result,done,depMap)');

const modelCount = (source.match(/SAMOS_RESOLVER_CONTRACT_CONFLICT_GRAPH_V4/g) ?? []).length;
if (modelCount < 2) throw new Error(`V5 count-model anchors too few: ${modelCount}`);
source = source.replaceAll('SAMOS_RESOLVER_CONTRACT_CONFLICT_GRAPH_V4', 'SAMOS_RESOLVER_CONTRACT_DEPENDENCY_FRONTIER_V5');

replaceOnce(
  'window evidence ordering metadata',
  "    contract_digest:hash(Object.fromEntries([...depMap.entries()])),source_shape_digest:hash(conflictShape),terminal_proof_digest:hash(proofs.map((proof)=>({...proof,terminal:proof.terminal.toString(),custom:proof.custom.toString()}))),",
  "    field_order_model:'DEPENDENCY_FRONTIER_MIN_DESCENDANTS_MRV_V1',contract_digest:hash(Object.fromEntries([...depMap.entries()])),source_shape_digest:hash(conflictShape),terminal_proof_digest:hash(proofs.map((proof)=>({...proof,terminal:proof.terminal.toString(),custom:proof.custom.toString()}))),",
);

await writeFile(GENERATED, source, 'utf8');
const child = spawn(process.execPath, [GENERATED.pathname], { stdio: 'inherit', env: process.env });
const exitCode = await new Promise((resolve,reject) => {
  child.once('error', reject);
  child.once('exit', (code,signal) => signal ? reject(new Error(`Samos V5 proof killed by ${signal}`)) : resolve(code ?? 1));
});
process.exitCode = exitCode;
