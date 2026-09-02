import test from'node:test';
import assert from'node:assert/strict';
import{APW430_GEMINI_INBOX_POC}from'../src/product-master-core/poc/apw430-gemini-inbox-poc.mjs';
import{APW430_GEMINI_TRANSPORT_FIXTURE,APW430_GEMINI_TRANSPORT_RAW,APW430_GEMINI_TRANSPORT_IMPORT}from'../src/product-master-core/poc/apw430-gemini-transport-poc.mjs';
import{importGeminiTransport,parseGeminiTransportJson,validateGeminiTransportEnvelope}from'../src/product-master-core/gemini-transport.mjs';
import{adjudicateEvidenceCandidate}from'../src/product-master-core/evidence-adjudication.mjs';

const knownFields=new Set(APW430_GEMINI_INBOX_POC.acceptedMaster.fields);
const nodeIds=new Set(APW430_GEMINI_INBOX_POC.acceptedMaster.productNodes.map((row)=>row.id));
const opts={expectedProductId:'SER-YKK-APW430',knownFields,nodeIds};

test('v0.4 simulated transport imports to Inbox without Canonical write',()=>{
  assert.equal(APW430_GEMINI_TRANSPORT_IMPORT.pass,true,JSON.stringify(APW430_GEMINI_TRANSPORT_IMPORT.errors));
  assert.equal(APW430_GEMINI_TRANSPORT_IMPORT.batch.producer.mode,'SIMULATED_FIXTURE');
  assert.equal(APW430_GEMINI_TRANSPORT_IMPORT.candidates.length,1);
  assert.equal(APW430_GEMINI_TRANSPORT_IMPORT.issues.length,1);
  assert.equal(APW430_GEMINI_TRANSPORT_IMPORT.candidates[0].status,'SUBMITTED');
});

test('transport requires pure JSON and rejects Markdown fences',()=>{
  const report=parseGeminiTransportJson(`\`\`\`json\n${APW430_GEMINI_TRANSPORT_RAW}\n\`\`\``,opts);
  assert.equal(report.pass,false);
  assert.ok(report.errors.some((row)=>row.code==='TRANSPORT_MARKDOWN_FENCE_FORBIDDEN'));
});

test('transport rejects product, source and producer-mode mismatch before Inbox',()=>{
  const broken=structuredClone(APW430_GEMINI_TRANSPORT_FIXTURE);
  broken.candidates[0].productId='SER-WRONG';
  broken.candidates[0].producerMode='LIVE_EXTERNAL';
  broken.candidates[0].source.driveFileId='WRONG-FILE';
  const report=validateGeminiTransportEnvelope(broken,opts);
  assert.equal(report.pass,false);
  const codes=new Set(report.errors.map((row)=>row.code));
  assert.ok(codes.has('TRANSPORT_CANDIDATE_PRODUCT_MISMATCH'));
  assert.ok(codes.has('TRANSPORT_CANDIDATE_MODE_MISMATCH'));
  assert.ok(codes.has('TRANSPORT_CANDIDATE_SOURCE_MISMATCH'));
});

test('transport rejects unknown Canonical Field and Product Node',()=>{
  const broken=structuredClone(APW430_GEMINI_TRANSPORT_FIXTURE);
  broken.candidates[0].subjectField='made_up_field';
  broken.candidates[0].productNodeIds=['NODE-NOT-FOUND'];
  const report=validateGeminiTransportEnvelope(broken,opts);
  assert.equal(report.pass,false);
  assert.ok(report.errors.some((row)=>row.code==='TRANSPORT_CANDIDATE_SUBJECT_FIELD_INVALID'));
  assert.ok(report.errors.some((row)=>row.code==='TRANSPORT_CANDIDATE_NODE_INVALID'));
});

test('LIVE_EXTERNAL transport uses the exact same contract without granting trust',()=>{
  const liveShape=structuredClone(APW430_GEMINI_TRANSPORT_FIXTURE);
  liveShape.batchId='BATCH-LIVE-SHAPE-ONLY-001';
  liveShape.producer.mode='LIVE_EXTERNAL';
  for(const row of liveShape.candidates)row.producerMode='LIVE_EXTERNAL';
  const report=validateGeminiTransportEnvelope(liveShape,opts);
  assert.equal(report.pass,true,JSON.stringify(report.errors));
  const imported=importGeminiTransport(JSON.stringify(liveShape),opts);
  assert.equal(imported.pass,true);
  assert.equal(imported.candidates[0].status,'SUBMITTED');
});

test('transport import never auto-promotes Candidate; ChatGPT adjudication is still required',()=>{
  const imported=importGeminiTransport(APW430_GEMINI_TRANSPORT_RAW,opts);
  const candidate=imported.candidates[0];
  assert.equal(candidate.recordType,'EVIDENCE_CANDIDATE');
  assert.equal(candidate.status,'SUBMITTED');
  assert.equal(candidate.canonicalStatus,undefined);
  const outcome=adjudicateEvidenceCandidate(candidate,'ACCEPT',{
    adjudicatorType:'CHATGPT',adjudicatedBy:'CHATGPT',canonicalEvidenceId:'EV-YKK-APW430-TRANSPORT-001',reason:'Official locator and atomic claim checked against the v0.2 verified source.'
  });
  assert.equal(outcome.evidence.status,'VERIFIED');
  assert.equal(outcome.evidence.adjudication.sourceCandidateId,candidate.id);
});
