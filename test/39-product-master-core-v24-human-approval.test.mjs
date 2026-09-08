import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildProductMasterReviewQueue } from '../src/product-master-core/review-queue.mjs';

const proposalId='PMCP-YKK-APW430-LIVE-EVIDENCE-20260904-001';
const expectedFingerprint='sha256:165445843ce09b2f68ab3b48f23aaf03dda8f637f2c3de225ca19a99b582402c';
const root=path.resolve('data/master-change-control');

test('v2.4 human approval is exact-scope, non-production, and visible in Review Queue',()=>{
  const proposal=JSON.parse(fs.readFileSync(path.join(root,'proposals',`${proposalId}.json`),'utf8'));
  const approval=JSON.parse(fs.readFileSync(path.join(root,'approvals',`${proposalId}.approval.json`),'utf8'));

  assert.equal(proposal.id,proposalId);
  assert.equal(proposal.status,'PROPOSED');
  assert.equal(proposal.approvalPolicy,'HUMAN_REQUIRED');
  assert.equal(proposal.proposalFingerprint,expectedFingerprint);
  assert.equal(proposal.changes.length,5);
  assert.equal(proposal.changes.every((row)=>row.collection==='evidence'&&row.operation==='ADD_RECORD'),true);

  assert.equal(approval.proposalId,proposalId);
  assert.equal(approval.status,'APPROVED');
  assert.equal(approval.approverType,'HUMAN');
  assert.equal(approval.approvedBy,'USER');
  assert.equal(approval.scope,'CONTROL_PLANE_EVIDENCE_ONLY');
  assert.equal(approval.productionApproval,false);
  assert.equal(approval.proposalFingerprint,expectedFingerprint);
  assert.equal(approval.formalMutationRequired,0);
  assert.equal(approval.authorizedWrites.controlPlaneEvidence,true);
  assert.equal(approval.authorizedWrites.formalProductMaster,false);
  assert.equal(approval.authorizedWrites.runtime,false);
  assert.equal(approval.authorizedWrites.production,false);
  assert.equal(approval.authorizedWrites.canonicalRegistry,false);

  const emptyEvidence=path.resolve('artifacts/test-empty-evidence-inbox-v24-approval');
  fs.rmSync(emptyEvidence,{recursive:true,force:true});
  const queue=buildProductMasterReviewQueue({evidenceInboxDir:emptyEvidence,changeControlDir:root,productId:'SER-YKK-APW430'});
  const item=queue.items.find((row)=>row.kind==='MASTER_CHANGE_PROPOSAL'&&row.sourceId===proposalId);
  assert.ok(item);
  assert.equal(item.sourceStatus,'APPROVED');
  assert.equal(item.reviewStatus,'APPROVED');
  assert.equal(item.authority,null);
  assert.equal(item.nextAction,'RUN_CONTROLLED_STAGING');
  assert.equal(item.artifactState.approval,true);
  fs.rmSync(emptyEvidence,{recursive:true,force:true});
});
