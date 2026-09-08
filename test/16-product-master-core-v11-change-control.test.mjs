import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import{runApw430LiveEvidenceRoundTrip}from'../src/product-master-core/live-roundtrip-v1.mjs';
import{
  applyApprovedProductMasterChangeProposal,applyPersistedProductMasterChangeProposal,
  approvePersistedProductMasterChangeProposal,approveProductMasterChangeProposal,
  createProductMasterChangeProposal,loadPersistedProductMasterChangeProposal,
  persistAppliedStagingMaster,persistProductMasterChangeProposal,
  productMasterFingerprint,proposalFingerprint
}from'../src/product-master-core/master-change-control.mjs';
import{APW430_OFFICIAL_EVIDENCE_POC}from'../src/product-master-core/poc/apw430-official-evidence-poc.mjs';

function buildProposal(t){
  const artifactDir=fs.mkdtempSync(path.join(os.tmpdir(),'sash-v11-live-'));
  t.after(()=>fs.rmSync(artifactDir,{recursive:true,force:true}));
  const live=runApw430LiveEvidenceRoundTrip({artifactDir:path.join(artifactDir,'live')});
  const baseMaster=structuredClone(APW430_OFFICIAL_EVIDENCE_POC);
  const evidence=live.state.canonicalEvidence;
  const result=createProductMasterChangeProposal({
    id:'PMCP-YKK-APW430-FIX-V11-TEST',productId:'SER-YKK-APW430',baseMaster,
    changes:evidence.map((record)=>({operation:'ADD_RECORD',collection:'evidence',record})),
    evidenceIds:evidence.map((row)=>row.id),sourceBatchIds:[live.report.batchId],
    openBlockingPending:0,createdBy:'CHATGPT',at:'2026-09-02T06:30:00Z',summary:'v1.1 controlled apply test'
  });
  assert.equal(result.pass,true,JSON.stringify(result.errors));
  return{artifactDir,live,baseMaster,evidence,proposal:result.proposal};
}

test('v1.1 creates immutable Proposal from 9 real LIVE adjudicated Canonical Evidence records',t=>{
  const{baseMaster,evidence,proposal}=buildProposal(t);
  assert.equal(evidence.length,9);
  assert.equal(proposal.status,'PROPOSED');
  assert.equal(proposal.approvalPolicy,'HUMAN_REQUIRED');
  assert.equal(proposal.changes.length,9);
  assert.deepEqual(proposal.evidenceIds,evidence.map((row)=>row.id));
  assert.equal(proposal.target.baseMasterFingerprint,productMasterFingerprint(baseMaster));
  assert.equal(proposal.proposalFingerprint,proposalFingerprint(proposal));
  assert.equal(proposal.gateSnapshot.openBlockingPending,0);
});

test('v1.1 refuses Product Master apply before explicit approval',t=>{
  const{baseMaster,proposal}=buildProposal(t);
  const result=applyApprovedProductMasterChangeProposal({proposal,baseMaster});
  assert.equal(result.pass,false);
  assert.equal(result.status,'MASTER_APPLY_REJECTED');
  assert.ok(result.errors.some((row)=>row.code==='MASTER_CHANGE_APPROVAL_REQUIRED'));
  assert.equal(result.productionMasterWritePerformed,false);
});

test('v1.1 ChatGPT cannot self-approve Product Master changes',t=>{
  const{proposal}=buildProposal(t);
  const result=approveProductMasterChangeProposal(proposal,{approverType:'CHATGPT',approvedBy:'CHATGPT'});
  assert.equal(result.pass,false);
  assert.ok(result.errors.some((row)=>row.code==='MASTER_CHANGE_HUMAN_APPROVAL_REQUIRED'));
});

test('v1.1 HUMAN approval binds the exact Proposal fingerprint and allows STAGING apply only',t=>{
  const{artifactDir,baseMaster,evidence,proposal}=buildProposal(t);
  const approved=approveProductMasterChangeProposal(proposal,{
    approverType:'HUMAN',approvedBy:'TEST_HUMAN_FIXTURE',note:'TEST_ONLY mechanical approval fixture.',
    expectedProposalFingerprint:proposal.proposalFingerprint,at:'2026-09-02T06:31:00Z'
  });
  assert.equal(approved.pass,true,JSON.stringify(approved.errors));
  assert.equal(approved.proposal.status,'APPROVED');
  const applied=applyApprovedProductMasterChangeProposal({
    proposal:approved.proposal,baseMaster,openBlockingPending:0,mode:'STAGING',appliedBy:'TEST_SYSTEM',
    at:'2026-09-02T06:32:00Z',validateMaster:(master)=>({pass:master.evidence.length===11})
  });
  assert.equal(applied.pass,true,JSON.stringify(applied.errors));
  assert.equal(applied.status,'STAGING_MASTER_APPLIED');
  assert.equal(applied.proposal.status,'APPLIED');
  assert.equal(applied.appliedMaster.evidence.length,baseMaster.evidence.length+evidence.length);
  assert.deepEqual(applied.appliedMaster.evidence.slice(-9).map((row)=>row.id),evidence.map((row)=>row.id));
  assert.equal(applied.productionMasterWritePerformed,false);
  const filePath=persistAppliedStagingMaster(applied,{rootDir:path.join(artifactDir,'control')});
  assert.equal(fs.existsSync(filePath),true);
});

test('v1.1 detects base Master drift after proposal creation',t=>{
  const{baseMaster,proposal}=buildProposal(t);
  const approved=approveProductMasterChangeProposal(proposal,{approverType:'HUMAN',approvedBy:'TEST_HUMAN_FIXTURE'});
  assert.equal(approved.pass,true,JSON.stringify(approved.errors));
  const drifted=structuredClone(baseMaster);
  drifted.status='CHANGED_AFTER_PROPOSAL';
  const result=applyApprovedProductMasterChangeProposal({proposal:approved.proposal,baseMaster:drifted,mode:'STAGING'});
  assert.equal(result.pass,false);
  assert.ok(result.errors.some((row)=>row.code==='MASTER_CHANGE_BASE_DRIFT'));
});

test('v1.1 blocks apply when a BLOCKING PENDING exists at approval/apply time',t=>{
  const{baseMaster,proposal}=buildProposal(t);
  const approved=approveProductMasterChangeProposal(proposal,{approverType:'HUMAN',approvedBy:'TEST_HUMAN_FIXTURE'});
  assert.equal(approved.pass,true,JSON.stringify(approved.errors));
  const result=applyApprovedProductMasterChangeProposal({proposal:approved.proposal,baseMaster,openBlockingPending:1,mode:'STAGING'});
  assert.equal(result.pass,false);
  assert.ok(result.errors.some((row)=>row.code==='MASTER_CHANGE_BLOCKING_PENDING_OPEN'));
});

test('v1.1 production apply is impossible without an explicit external production adapter',t=>{
  const{baseMaster,proposal}=buildProposal(t);
  const approved=approveProductMasterChangeProposal(proposal,{approverType:'HUMAN',approvedBy:'TEST_HUMAN_FIXTURE'});
  assert.equal(approved.pass,true,JSON.stringify(approved.errors));
  const result=applyApprovedProductMasterChangeProposal({proposal:approved.proposal,baseMaster,mode:'PRODUCTION'});
  assert.equal(result.pass,false);
  assert.ok(result.errors.some((row)=>row.code==='MASTER_CHANGE_PRODUCTION_ADAPTER_REQUIRED'));
  assert.equal(result.productionMasterWritePerformed,false);
});

test('v1.1 persists Proposal audit record without treating it as approval',t=>{
  const{artifactDir,proposal}=buildProposal(t);
  const filePath=persistProductMasterChangeProposal(proposal,{rootDir:path.join(artifactDir,'control')});
  const saved=JSON.parse(fs.readFileSync(filePath,'utf8'));
  assert.equal(saved.status,'PROPOSED');
  assert.equal(saved.approval,undefined);
  assert.equal(saved.proposalFingerprint,proposal.proposalFingerprint);
});

test('v1.1 durable lifecycle persists PROPOSED -> APPROVED -> APPLIED and staging Master snapshot',t=>{
  const{artifactDir,baseMaster,evidence,proposal}=buildProposal(t);
  const rootDir=path.join(artifactDir,'durable-control');
  persistProductMasterChangeProposal(proposal,{rootDir});
  const approved=approvePersistedProductMasterChangeProposal({
    rootDir,proposalId:proposal.id,approverType:'HUMAN',approvedBy:'TEST_HUMAN_FIXTURE',
    expectedProposalFingerprint:proposal.proposalFingerprint,note:'TEST_ONLY persistent lifecycle fixture.',at:'2026-09-02T06:31:00Z'
  });
  assert.equal(approved.pass,true,JSON.stringify(approved.errors));
  assert.equal(loadPersistedProductMasterChangeProposal(proposal.id,{rootDir}).proposal.status,'APPROVED');
  const applied=applyPersistedProductMasterChangeProposal({
    rootDir,proposalId:proposal.id,baseMaster,openBlockingPending:0,mode:'STAGING',appliedBy:'TEST_SYSTEM',
    at:'2026-09-02T06:32:00Z',validateMaster:(master)=>({pass:master.evidence.length===11})
  });
  assert.equal(applied.pass,true,JSON.stringify(applied.errors));
  assert.equal(applied.appliedMaster.evidence.length,baseMaster.evidence.length+evidence.length);
  assert.equal(fs.existsSync(applied.stagingMasterPath),true);
  const loaded=loadPersistedProductMasterChangeProposal(proposal.id,{rootDir});
  assert.equal(loaded.pass,true);
  assert.equal(loaded.proposal.status,'APPLIED');
  assert.equal(loaded.proposal.applied.mode,'STAGING');
  assert.equal(loaded.proposal.approval.approverType,'HUMAN');
});
