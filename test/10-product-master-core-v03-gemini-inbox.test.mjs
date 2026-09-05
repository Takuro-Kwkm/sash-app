import test from'node:test';
import assert from'node:assert/strict';
import{APW430_MODULE}from'../src/catalog/modules/apw430-module.mjs';
import{APW430_GEMINI_INBOX_POC,APW430_GEMINI_INBOX_CANDIDATES,APW430_GEMINI_ADJUDICATIONS}from'../src/product-master-core/poc/apw430-gemini-inbox-poc.mjs';
import{validateEvidenceCandidate}from'../src/product-master-core/evidence-inbox.mjs';
import{adjudicateEvidenceCandidate}from'../src/product-master-core/evidence-adjudication.mjs';
import{validateProductMasterCore}from'../src/product-master-core/validator.mjs';
import{evaluatePhaseGate}from'../src/product-master-core/gate-engine.mjs';
import{projectRuntimeSelection}from'../src/product-master-core/runtime-projection.mjs';

test('v0.3 PoC is explicit simulation, not a claimed live Gemini run',()=>{
  assert.equal(APW430_GEMINI_INBOX_POC.liveGeminiConnected,false);
  assert.ok(APW430_GEMINI_INBOX_CANDIDATES.every((row)=>row.sourceSystem==='GEMINI_NOTEBOOKLM'&&row.producerMode==='SIMULATED_FIXTURE'));
});

test('Gemini-format Evidence Candidates validate as Inbox records',()=>{
  const nodeIds=new Set(APW430_GEMINI_INBOX_POC.acceptedMaster.productNodes.map((row)=>row.id));
  const knownFields=new Set(APW430_GEMINI_INBOX_POC.acceptedMaster.fields);
  for(const candidate of APW430_GEMINI_INBOX_CANDIDATES){
    const report=validateEvidenceCandidate(candidate,{productId:'SER-YKK-APW430',knownFields,nodeIds});
    assert.equal(report.pass,true,JSON.stringify(report.errors));
  }
});

test('ACCEPT promotes Candidate to VERIFIED Canonical Evidence only after ChatGPT adjudication',()=>{
  const outcome=APW430_GEMINI_ADJUDICATIONS.accepted;
  assert.equal(outcome.audit.decision,'ACCEPT');
  assert.equal(outcome.audit.adjudicatorType,'CHATGPT');
  assert.equal(outcome.evidence.status,'VERIFIED');
  assert.equal(outcome.evidence.adjudication.sourceCandidateId,'CAND-GEMINI-APW430-FIX-001');
  const validation=validateProductMasterCore(APW430_GEMINI_INBOX_POC.acceptedMaster);
  assert.equal(validation.pass,true,JSON.stringify(validation.errors));
  assert.equal(evaluatePhaseGate(APW430_GEMINI_INBOX_POC.acceptedMaster).status,'PASS');
});

test('REJECT preserves audit trail but produces no Canonical Evidence',()=>{
  const outcome=APW430_GEMINI_ADJUDICATIONS.rejected;
  assert.equal(outcome.audit.decision,'REJECT');
  assert.equal(outcome.evidence,null);
  assert.equal(outcome.pending,null);
});

test('PENDING decision creates blocking issue and mechanically blocks Gate',()=>{
  const outcome=APW430_GEMINI_ADJUDICATIONS.pending;
  assert.equal(outcome.audit.decision,'PENDING');
  assert.equal(outcome.pending.status,'OPEN');
  assert.equal(outcome.pending.severity,'BLOCKING');
  const gate=evaluatePhaseGate(APW430_GEMINI_INBOX_POC.blockedMaster);
  assert.equal(gate.status,'BLOCKED');
  assert.equal(gate.counts.openBlockingPending,1);
});

test('raw Inbox Candidate cannot be inserted into Canonical Evidence Registry',()=>{
  const broken=structuredClone(APW430_GEMINI_INBOX_POC.acceptedMaster);
  broken.evidence.push(APW430_GEMINI_INBOX_CANDIDATES[0]);
  const report=validateProductMasterCore(broken);
  assert.equal(report.pass,false);
  assert.ok(report.errors.some((row)=>row.code==='INBOX_CANDIDATE_NOT_CANONICAL'));
});

test('Gemini/NotebookLM cannot self-adjudicate Canonical Evidence',()=>{
  assert.throws(()=>adjudicateEvidenceCandidate(APW430_GEMINI_INBOX_CANDIDATES[0],'ACCEPT',{
    adjudicatorType:'GEMINI_NOTEBOOKLM',adjudicatedBy:'Gemini',canonicalEvidenceId:'EV-ILLEGAL',reason:'self approval'
  }),/cannot adjudicate Canonical Evidence/);
});

test('Candidate-derived accepted Evidence still projects to existing formal APW430 Runtime records',()=>{
  const projected=projectRuntimeSelection(APW430_GEMINI_INBOX_POC.acceptedMaster,'NODE-YKK-APW430-FIX-MADO');
  assert.equal(projected.selection.window_type,'SWT-YKK-APW430-FIX-MADO');
  assert.equal(projected.selection.size_mode,'STANDARD');
  assert.ok(APW430_MODULE.standardSizeRecords.some((row)=>row.windowTypeId===projected.selection.window_type));
  const rule=APW430_GEMINI_INBOX_POC.acceptedMaster.dependencyRules.find((row)=>row.id==='RULE-YKK-APW430-FIX-MADO-OFFICIAL');
  assert.deepEqual(rule.evidenceIds,['EV-YKK-APW430-GEMINI-CAND-001-ACCEPTED']);
});
