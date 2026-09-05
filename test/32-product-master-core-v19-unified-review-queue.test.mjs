import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import{buildProductMasterReviewQueue}from'../src/product-master-core/review-queue.mjs';

const write=(filePath,value)=>{fs.mkdirSync(path.dirname(filePath),{recursive:true});fs.writeFileSync(filePath,`${JSON.stringify(value,null,2)}\n`);};

function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'sash-review-queue-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const evidence=path.join(root,'evidence-inbox');
  const change=path.join(root,'master-change-control');
  const batchId='BATCH-TEST-001';
  write(path.join(evidence,'manifest.json'),{batches:[{batchId,relativePath:`batches/${batchId}.json`,productId:'SER-TEST'}]});
  write(path.join(evidence,'batches',`${batchId}.json`),{productId:'SER-TEST',candidates:[
    {id:'C1',productId:'SER-TEST',status:'SUBMITTED',claim:'new candidate'},
    {id:'C2',productId:'SER-TEST',status:'SUBMITTED',claim:'reviewing'},
    {id:'C3',productId:'SER-TEST',status:'SUBMITTED',claim:'accepted'},
    {id:'C4',productId:'SER-TEST',status:'SUBMITTED',claim:'rejected'},
    {id:'C5',productId:'SER-TEST',status:'SUBMITTED',claim:'pending'}
  ]});
  write(path.join(evidence,'adjudication-state.json'),{
    candidateStates:[
      {batchId,candidateId:'C2',status:'UNDER_REVIEW'},
      {batchId,candidateId:'C3',status:'ADJUDICATED',adjudicationId:'ADJ-C3'},
      {batchId,candidateId:'C4',status:'ADJUDICATED',adjudicationId:'ADJ-C4'},
      {batchId,candidateId:'C5',status:'ADJUDICATED',adjudicationId:'ADJ-C5'}
    ],
    adjudications:[
      {id:'ADJ-C3',batchId,candidateId:'C3',decision:'ACCEPT'},
      {id:'ADJ-C4',batchId,candidateId:'C4',decision:'REJECT'},
      {id:'ADJ-C5',batchId,candidateId:'C5',decision:'PENDING'}
    ],
    pending:[{id:'PEND-C5',sourceCandidateId:'C5',status:'OPEN',question:'confirm official scope'}]
  });
  const openId='PMCP-OPEN';
  const approvedId='PMCP-APPROVED';
  const appliedId='PMCP-APPLIED';
  for(const id of[openId,approvedId,appliedId])write(path.join(change,'proposals',`${id}.manifest.json`),{
    recordType:'PRODUCT_MASTER_CHANGE_PROPOSAL',proposalId:id,productId:'SER-TEST',status:'PROPOSED',approvalPolicy:'HUMAN_REQUIRED',targetEntity:id
  });
  write(path.join(change,'approvals',`${approvedId}.approval.json`),{proposalId:approvedId,productId:'SER-TEST',approverType:'HUMAN'});
  write(path.join(change,'approvals',`${appliedId}.approval.json`),{proposalId:appliedId,productId:'SER-TEST',approverType:'HUMAN'});
  write(path.join(change,'applied',`${appliedId}.staging.json`),{proposalId:appliedId,productId:'SER-TEST',status:'STAGING_APPLY_COMPLETE'});
  write(path.join(change,'production',`${appliedId}.applied.json`),{proposalId:appliedId,productId:'SER-TEST',status:'PRODUCTION_APPLY_COMPLETE'});
  return{evidence,change};
}

test('v1.9 Unified Review Queue maps Evidence and Proposal lifecycle into one read model',t=>{
  const dirs=fixture(t);
  const queue=buildProductMasterReviewQueue({evidenceInboxDir:dirs.evidence,changeControlDir:dirs.change,generatedAt:'2026-09-04T05:00:00.000Z'});
  assert.equal(queue.summary.total,8);
  assert.equal(queue.summary.byStatus.SUBMITTED,1);
  assert.equal(queue.summary.byStatus.UNDER_REVIEW,1);
  assert.equal(queue.summary.byStatus.NEEDS_REVIEW,1);
  assert.equal(queue.summary.byStatus.REJECTED,1);
  assert.equal(queue.summary.byStatus.HUMAN_REQUIRED,1);
  assert.equal(queue.summary.byStatus.APPROVED,2);
  assert.equal(queue.summary.byStatus.APPLIED,1);
  assert.equal(queue.authorityBoundary.queueMutationAuthority,'NONE');
  assert.equal(queue.authorityBoundary.productionMasterAutoWrite,false);
  assert.equal(queue.authorityBoundary.runtimeAutoWrite,false);
});

test('v1.9 later approval/application artifacts override stale PROPOSED manifest status',t=>{
  const dirs=fixture(t);
  const queue=buildProductMasterReviewQueue({evidenceInboxDir:dirs.evidence,changeControlDir:dirs.change});
  const approved=queue.items.find((row)=>row.sourceId==='PMCP-APPROVED');
  const applied=queue.items.find((row)=>row.sourceId==='PMCP-APPLIED');
  assert.equal(approved.reviewStatus,'APPROVED');
  assert.equal(approved.sourceStatus,'APPROVED');
  assert.equal(approved.artifactState.approval,true);
  assert.equal(applied.reviewStatus,'APPLIED');
  assert.equal(applied.sourceStatus,'PRODUCTION_APPLY_COMPLETE');
  assert.equal(applied.artifactState.production,true);
});

test('v1.9 actionable filter exposes only items that still need review or gate action',t=>{
  const dirs=fixture(t);
  const queue=buildProductMasterReviewQueue({evidenceInboxDir:dirs.evidence,changeControlDir:dirs.change,actionableOnly:true});
  assert.deepEqual(new Set(queue.items.map((row)=>row.reviewStatus)),new Set(['SUBMITTED','UNDER_REVIEW','NEEDS_REVIEW','HUMAN_REQUIRED','APPROVED']));
  assert.equal(queue.items.some((row)=>row.reviewStatus==='APPLIED'),false);
  assert.equal(queue.items.some((row)=>row.reviewStatus==='REJECTED'),false);
});

test('v1.9 product filter isolates one product without mutating source artifacts',t=>{
  const dirs=fixture(t);
  const before=fs.readFileSync(path.join(dirs.change,'proposals','PMCP-OPEN.manifest.json'),'utf8');
  const queue=buildProductMasterReviewQueue({evidenceInboxDir:dirs.evidence,changeControlDir:dirs.change,productId:'SER-OTHER'});
  const after=fs.readFileSync(path.join(dirs.change,'proposals','PMCP-OPEN.manifest.json'),'utf8');
  assert.equal(queue.summary.total,0);
  assert.equal(after,before);
});
