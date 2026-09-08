import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import{buildHumanApprovalReviewGateBinding,validateHumanApprovalReviewGateBinding}from'../src/product-master-core/human-approval-review-gate-binding.mjs';
import{persistHumanApprovalReviewGateBinding,loadHumanApprovalReviewGateBinding}from'../src/product-master-core/human-approval-review-gate-binding-store.mjs';

const fixtureRoot=(t)=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'human-review-gates-v27-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;};
const authority={evidenceAdjudication:'CHATGPT_OR_HUMAN',transportIssueResolution:'CHATGPT_OR_HUMAN',geminiAdjudicationAllowed:false,masterChangeApproval:'HUMAN_REQUIRED',queueMutationAuthority:'NONE',productionMasterAutoWrite:false,runtimeAutoWrite:false};
const proposal={id:'PMCP-GATES-001',productId:'SER-GATES-001',proposalFingerprint:'sha256:proposal',sourceBatchIds:['BATCH-GATES-A','BATCH-GATES-B']};
const humanApprovalProvenance={schemaVersion:'1.1',recordType:'PRODUCT_MASTER_HUMAN_APPROVAL_PROVENANCE',status:'PASS',proposalId:proposal.id,productId:proposal.productId,proposalFingerprint:proposal.proposalFingerprint,authority:{humanApprovalVerified:true,geminiApprovalAllowed:false,chatgptHumanImpersonationAllowed:false,changeControlWriteAllowed:true,productionMasterAutoWrite:false,runtimeAutoWrite:false}};
const gate=(batchId,jobId,candidateCount,transportIssueCount)=>({schemaVersion:'1.1',recordType:'PRODUCT_MASTER_REVIEW_QUEUE_VALIDATION',status:'PASS',jobId,productId:proposal.productId,batchId,candidateCount,transportIssueCount,evidenceQueueItemCount:candidateCount+transportIssueCount,authority:{...authority}});
const validations=()=>[gate('BATCH-GATES-A','GJOB-GATES-A',2,1),gate('BATCH-GATES-B','GJOB-GATES-B',1,0)];

test('v2.7 Human approval Review Gate binding requires complete one-to-one source-batch coverage',()=>{
  const built=buildHumanApprovalReviewGateBinding({proposal,humanApprovalProvenance,reviewQueueValidations:validations()});
  assert.equal(built.pass,true,built.errors?.[0]?.message);
  assert.equal(built.record.status,'PASS');
  assert.deepEqual(built.record.sourceBatchIds,['BATCH-GATES-A','BATCH-GATES-B']);
  assert.equal(built.record.reviewQueueGates.length,2);
  assert.equal(built.record.reviewQueueGates[0].candidateCount,2);
  assert.equal(built.record.reviewQueueGates[0].transportIssueCount,1);
  assert.ok(built.record.reviewQueueGateSetFingerprint.startsWith('sha256:'));
  assert.equal(built.record.authority.reviewQueueGateRequired,true);
  assert.equal(built.record.authority.geminiApprovalAllowed,false);
});

test('v2.7 missing, duplicate, unexpected or non-PASS Review Queue Gate blocks Human approval binding',()=>{
  const missing=buildHumanApprovalReviewGateBinding({proposal,humanApprovalProvenance,reviewQueueValidations:[validations()[0]]});
  assert.equal(missing.pass,false);
  assert.ok(missing.errors.some((row)=>row.code==='HUMAN_APPROVAL_REVIEW_GATE_MISSING'));

  const duplicate=buildHumanApprovalReviewGateBinding({proposal,humanApprovalProvenance,reviewQueueValidations:[...validations(),validations()[0]]});
  assert.equal(duplicate.pass,false);
  assert.ok(duplicate.errors.some((row)=>row.code==='HUMAN_APPROVAL_REVIEW_GATE_DUPLICATE'));

  const unexpected=buildHumanApprovalReviewGateBinding({proposal,humanApprovalProvenance,reviewQueueValidations:[...validations(),gate('BATCH-GATES-X','GJOB-GATES-X',0,0)]});
  assert.equal(unexpected.pass,false);
  assert.ok(unexpected.errors.some((row)=>row.code==='HUMAN_APPROVAL_REVIEW_GATE_UNEXPECTED_BATCH'));

  const failed=validations();
  failed[1].status='BLOCKED';
  const blocked=buildHumanApprovalReviewGateBinding({proposal,humanApprovalProvenance,reviewQueueValidations:failed});
  assert.equal(blocked.pass,false);
  assert.ok(blocked.errors.some((row)=>row.code==='HUMAN_APPROVAL_REVIEW_GATE_NOT_PASS'));
});

test('v2.7 Review Queue Gate binding detects gate-set drift after Human approval',()=>{
  const source=validations();
  const built=buildHumanApprovalReviewGateBinding({proposal,humanApprovalProvenance,reviewQueueValidations:source});
  assert.equal(built.pass,true);
  const changed=validations();
  changed[0].jobId='GJOB-GATES-A-CHANGED';
  const validation=validateHumanApprovalReviewGateBinding(built.record,{proposal,humanApprovalProvenance,reviewQueueValidations:changed});
  assert.equal(validation.pass,false);
  assert.ok(validation.errors.some((row)=>row.code==='HUMAN_APPROVAL_REVIEW_BINDING_GATE_SET_STALE'));
});

test('v2.7 Review Queue Gate binding is stored separately and append-only',t=>{
  const root=fixtureRoot(t);
  const source=validations();
  const built=buildHumanApprovalReviewGateBinding({proposal,humanApprovalProvenance,reviewQueueValidations:source});
  assert.equal(built.pass,true);
  const persisted=persistHumanApprovalReviewGateBinding(built.record,{rootDir:root,proposal,humanApprovalProvenance,reviewQueueValidations:source});
  assert.equal(persisted.pass,true,persisted.errors?.[0]?.message);
  assert.ok(persisted.filePath.endsWith('approval-provenance/PMCP-GATES-001.review-queue-gates.json'));
  const loaded=loadHumanApprovalReviewGateBinding(proposal.id,{rootDir:root});
  assert.equal(loaded.pass,true,loaded.errors?.[0]?.message);
  assert.deepEqual(loaded.record,built.record);
  const duplicate=persistHumanApprovalReviewGateBinding(built.record,{rootDir:root,proposal,humanApprovalProvenance,reviewQueueValidations:source});
  assert.equal(duplicate.pass,false);
  assert.ok(duplicate.errors.some((row)=>row.code==='HUMAN_APPROVAL_REVIEW_GATE_BINDING_ALREADY_EXISTS'));
});
