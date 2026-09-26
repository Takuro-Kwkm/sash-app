/** Durable execution plumbing for the unchanged exhaustive V10 traversal.
 * Checkpoints are continuation state, NEVER substitute QA PASS evidence.
 */
import {createHash} from 'node:crypto';
import {closeSync, existsSync, fsyncSync, ftruncateSync, mkdirSync, openSync, readFileSync, readSync, renameSync, statSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';

export const stable = value => Array.isArray(value) ? value.map(stable) :
  value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])])) : value;
export const hash = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(stable(value))).digest('hex');
export function atomicJson(path, value) {
  mkdirSync(dirname(path), {recursive:true});
  const tmp = `${path}.tmp-${process.pid}`;
  const fd = openSync(tmp, 'w');
  try { writeFileSync(fd, JSON.stringify(value)+'\n'); fsyncSync(fd); } finally { closeSync(fd); }
  renameSync(tmp, path);
}
export function readCheckpoint(path, identity) {
  const envelope = JSON.parse(readFileSync(path, 'utf8'));
  if (envelope.schema !== 'UCHIRIMO_CONTINUATION_V1' || hash(envelope.body) !== envelope.sha256) throw new Error('CHECKPOINT_CORRUPT');
  const body = envelope.body;
  if (hash(body.identity) !== hash(identity)) throw new Error('CHECKPOINT_IDENTITY_MISMATCH');
  if (!Array.isArray(body.state?.stack) || !Array.isArray(body.state?.visited) || !Array.isArray(body.state?.signatureCounts)) throw new Error('CHECKPOINT_STATE_INVALID');
  if (!['IN_PROGRESS','YIELDED','COMPLETE'].includes(body.status)) throw new Error('CHECKPOINT_STATUS_INVALID');
  if (!Number.isSafeInteger(body.terminal_bytes) || body.terminal_bytes < 0) throw new Error('CHECKPOINT_OFFSET_INVALID');
  return body;
}
export function checkpointSession({head, seed, partitionKey, runtimeHash, out}) {
  const fingerprint = String(process.env.UCHIRIMO_DURABLE_FINGERPRINT ?? '');
  if (!/^[a-f0-9]{64}$/.test(fingerprint)) throw new Error('CHECKPOINT_FINGERPRINT_REQUIRED');
  const identity = {exact_head:head, semantic_fingerprint:fingerprint, seed:stable(seed), partition_key:partitionKey, runtime_manifest_sha256:runtimeHash};
  const checkpointPath = join(out, 'continuation.json');
  const saved = existsSync(checkpointPath) ? readCheckpoint(checkpointPath, identity) : null;
  const ms = Number(process.env.UCHIRIMO_DURABLE_SLICE_MS ?? 45000);
  if (!Number.isFinite(ms) || ms < 1 || ms > 300000) throw new Error('CHECKPOINT_SLICE_INVALID');
  const started = Date.now(); let lastSave = started;
  return {
    saved,
    shouldYield: () => Date.now() - started >= ms,
    shouldSave: () => Date.now() - lastSave >= 15000,
    openTerminal(path) {
      const caseHash = createHash('sha256');
      if (!saved) {
        // An artifact with no committed continuation cannot silently overwrite evidence.
        if (existsSync(path) && statSync(path).size) throw new Error('ORPHAN_TERMINAL_ARTIFACT');
        return {casesFd:openSync(path, 'w'), caseHash};
      }
      if (!existsSync(path) || statSync(path).size < saved.terminal_bytes) throw new Error('CHECKPOINT_TERMINAL_MISSING');
      const fd = openSync(path, 'r+');
      try {
        const buffer = Buffer.alloc(65536); let position = 0;
        while (position < saved.terminal_bytes) {
          const n = readSync(fd, buffer, 0, Math.min(buffer.length, saved.terminal_bytes-position), position);
          if (!n) throw new Error('CHECKPOINT_TERMINAL_TRUNCATED');
          caseHash.update(buffer.subarray(0,n)); position += n;
        }
        if (caseHash.copy().digest('hex') !== saved.terminal_sha256) throw new Error('CHECKPOINT_TERMINAL_HASH_MISMATCH');
        // Only the uncommitted crash tail is rolled back; certified bytes remain.
        if (statSync(path).size > position) ftruncateSync(fd, position);
      } finally { closeSync(fd); }
      return {casesFd:openSync(path, 'a'), caseHash};
    },
    save(state, casesFd, casesPath, caseHash, status) {
      fsyncSync(casesFd);
      const body = {identity, status, state, terminal_bytes:statSync(casesPath).size, terminal_sha256:caseHash.copy().digest('hex')};
      atomicJson(checkpointPath, {schema:'UCHIRIMO_CONTINUATION_V1',body,sha256:hash(body)});
      lastSave = Date.now();
    }
  };
}

/** Surgical hooks: selection order, branch construction, rejection, and hashing
 * remain byte-for-byte in the existing V10 source. Fail closed on source drift.
 */
export function instrumentV10(original) {
  const start=original.indexOf('async function runShard(){');
  const end=original.indexOf('const failurePath=join(OUT,MODE',start);
  if(start<0||end<0)throw new Error('CHECKPOINT_RUNNER_BOUNDARY_MISMATCH');
  const prefix=original.slice(0,start),suffix=original.slice(end);
  let source=original.slice(start,end);
  function once(before, after) {
    const parts = source.split(before);
    if (parts.length !== 2) throw new Error(`CHECKPOINT_ANCHOR_MISMATCH:${before.slice(0,65)}`);
    source = parts.join(after);
  }
  once("const stack=[{selection:selected.selection??seed,decisions,result:selected}];", `const recovery=checkpointSession({head,seed,partitionKey:TARGET_PARTITION_KEY,runtimeHash:runtime.sourcePackageIntegrity.actual,out:OUT});
  const restored=recovery.saved?.state;
  const stack=restored?.stack??[{selection:selected.selection??seed,decisions,result:selected}];`);
  once('const visited=new Set();', 'const visited=new Set(restored?.visited??[]);');
  once('const signatureCounts=new Map();', 'const signatureCounts=new Map(restored?.signatureCounts??[]);');
  for (const name of ['transitionChecks','dependencyRejections','downstreamClearChecks','terminalCount','peakHeapMb']) {
    once(`let ${name}=0;`, `let ${name}=restored?.${name}??0;`);
  }
  once('let maxStack=stack.length;', 'let maxStack=restored?.maxStack??stack.length;');
  once("const casesFd=openSync(casesPath,'w');\n  const caseHash=createHash('sha256');", `const {casesFd,caseHash}=recovery.openTerminal(casesPath);
  const saveContinuation=status=>recovery.save({stack,visited:[...visited],signatureCounts:[...signatureCounts],transitionChecks,dependencyRejections,downstreamClearChecks,terminalCount,maxStack,peakHeapMb},casesFd,casesPath,caseHash,status);`);
  once('    while(stack.length){', `    while(stack.length){
      if(recovery.shouldYield()){saveContinuation('YIELDED');return;}
      if(recovery.shouldSave())saveContinuation('IN_PROGRESS');`);
  once('  }finally{\n    closeSync(casesFd);', `    saveContinuation('COMPLETE');
  }finally{
    closeSync(casesFd);`);
  return "import {checkpointSession} from './governance/uchirimo-checkpoint-hook.mjs';\n"+prefix+source+suffix;
}
