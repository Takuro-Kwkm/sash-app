import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import{spawnSync}from'node:child_process';

const script=path.resolve('scripts/adjudicate-evidence-candidate.mjs');

test('v0.9 adjudication CLI summary exits cleanly with machine-readable JSON',t=>{
  const rootDir=fs.mkdtempSync(path.join(os.tmpdir(),'sash-v09-cli-'));
  t.after(()=>fs.rmSync(rootDir,{recursive:true,force:true}));
  const result=spawnSync(process.execPath,[script,'summary'],{
    cwd:path.resolve('.'),encoding:'utf8',env:{...process.env,EVIDENCE_INBOX_DIR:rootDir}
  });
  assert.equal(result.status,0,result.stderr);
  const payload=JSON.parse(result.stdout);
  assert.equal(payload.pass,true);
  assert.equal(payload.status,'EVIDENCE_ADJUDICATION_SUMMARY');
  assert.equal(payload.summary.adjudications,0);
  assert.equal(payload.summary.canonicalEvidence,0);
  assert.equal(payload.summary.pending,0);
});
