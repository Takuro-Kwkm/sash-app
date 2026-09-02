import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import{runApw430LiveEvidenceRoundTrip}from'../src/product-master-core/live-roundtrip-v1.mjs';

test('v1.0 real APW430 LIVE_EXTERNAL V3 batch completes durable Candidate round trip',t=>{
  const artifactDir=fs.mkdtempSync(path.join(os.tmpdir(),'sash-live-v1-'));
  t.after(()=>fs.rmSync(artifactDir,{recursive:true,force:true}));
  const result=runApw430LiveEvidenceRoundTrip({artifactDir});
  assert.equal(result.pass,true);
  assert.equal(result.report.status,'CANDIDATE_ROUNDTRIP_PASS');
  assert.equal(result.report.batchId,'BATCH-GEMINI-APW430-FIX-20260901213858');
  assert.deepEqual(result.report.producer,{system:'GEMINI_NOTEBOOKLM',mode:'LIVE_EXTERNAL'});
  assert.equal(result.report.rawPreserved,true);
  assert.equal(result.report.transport.candidateCount,12);
  assert.equal(result.report.transport.issueCount,4);
  assert.deepEqual(result.report.adjudication.decisions,{ACCEPT:9,REJECT:3,PENDING:0});
  assert.equal(result.report.adjudication.canonicalEvidence,9);
  assert.deepEqual(result.report.existingCanonical.sourceRegionOverlapCandidateIds,[
    'CAND-GEMINI-APW430-FIX-001','CAND-GEMINI-APW430-FIX-002','CAND-GEMINI-APW430-FIX-003','CAND-GEMINI-APW430-FIX-004'
  ]);
  assert.deepEqual(result.report.existingCanonical.redundantRejectedIds,[
    'CAND-GEMINI-APW430-FIX-001','CAND-GEMINI-APW430-FIX-003','CAND-GEMINI-APW430-FIX-004'
  ]);
  assert.deepEqual(result.report.existingCanonical.uniqueAcceptedFromOverlapIds,['CAND-GEMINI-APW430-FIX-002']);
  assert.equal(result.report.existingCanonical.unmodified,true);
  assert.equal(result.report.productionMasterWritePerformed,false);
  assert.equal(result.report.runtimeWritePerformed,false);
  assert.equal(result.report.transportIssueLifecycle,'NOT_CONNECTED_IN_V0.9');
  assert.ok(fs.existsSync(path.join(artifactDir,'evidence-inbox','manifest.json')));
  assert.ok(fs.existsSync(path.join(artifactDir,'evidence-inbox','adjudication-state.json')));
  assert.ok(fs.existsSync(path.join(artifactDir,'evidence-inbox','batches','BATCH-GEMINI-APW430-FIX-20260901213858.json')));
  assert.ok(fs.existsSync(path.join(artifactDir,'report.json')));
});
