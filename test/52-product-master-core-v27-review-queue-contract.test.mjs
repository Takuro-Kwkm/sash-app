import test from'node:test';
import assert from'node:assert/strict';
import{validateGovernedReviewQueue}from'../src/product-master-core/review-queue-contract.mjs';

const job={jobId:'GJOB-RQ-001',productId:'SER-RQ-001',workerContractVersion:'1.1',executionMode:'LIVE_EXTERNAL'};
const transportValidation={pass:true,envelope:{batchId:'BATCH-RQ-001',candidates:[{id:'CAND-RQ-001'}],issues:[{id:'ISSUE-RQ-001'}]}};

function queue(){
  return{
    recordType:'PRODUCT_MASTER_REVIEW_QUEUE',
    items:[
      {kind:'EVIDENCE_CANDIDATE',productId:'SER-RQ-001',sourceId:'CAND-RQ-001',authority:'CHATGPT_OR_HUMAN',refs:{batchId:'BATCH-RQ-001',reviewProvenance:{status:'PASS',governed:true},provenanceErrors:[]}},
      {kind:'EVIDENCE_TRANSPORT_ISSUE',productId:'SER-RQ-001',sourceId:'ISSUE-RQ-001',authority:'CHATGPT_OR_HUMAN',refs:{batchId:'BATCH-RQ-001',reviewProvenance:{status:'PASS',governed:true},provenanceErrors:[]}}
    ],
    authorityBoundary:{evidenceAdjudication:'CHATGPT_OR_HUMAN',transportIssueResolution:'CHATGPT_OR_HUMAN',geminiAdjudicationAllowed:false,masterChangeApproval:'HUMAN_REQUIRED',queueMutationAuthority:'NONE',productionMasterAutoWrite:false,runtimeAutoWrite:false}
  };
}

test('v2.7 governed Review Queue gate covers every Candidate and Transport Issue',()=>{
  const result=validateGovernedReviewQueue(queue(),{job,transportValidation});
  assert.equal(result.pass,true,result.errors?.[0]?.message);
  assert.equal(result.record.status,'PASS');
  assert.equal(result.record.candidateCount,1);
  assert.equal(result.record.transportIssueCount,1);
  assert.equal(result.record.evidenceQueueItemCount,2);
  assert.equal(result.record.authority.geminiAdjudicationAllowed,false);
});

test('v2.7 governed Review Queue gate blocks a missing Transport Issue',()=>{
  const value=queue();
  value.items=value.items.filter((row)=>row.kind!=='EVIDENCE_TRANSPORT_ISSUE');
  const result=validateGovernedReviewQueue(value,{job,transportValidation});
  assert.equal(result.pass,false);
  assert.ok(result.errors.some((row)=>row.code==='REVIEW_QUEUE_ISSUE_COUNT_MISMATCH'));
  assert.ok(result.errors.some((row)=>row.code==='REVIEW_QUEUE_ISSUE_MISSING'));
});

test('v2.7 governed Review Queue gate rejects legacy or failed review provenance',()=>{
  const value=queue();
  value.items[0].refs.reviewProvenance={status:'LEGACY_COMPATIBLE',governed:false};
  const result=validateGovernedReviewQueue(value,{job,transportValidation});
  assert.equal(result.pass,false);
  assert.ok(result.errors.some((row)=>row.code==='REVIEW_QUEUE_PROVENANCE_NOT_PASS'));
});

test('v2.7 governed Review Queue gate never permits Gemini review authority',()=>{
  const value=queue();
  value.items[1].authority='GEMINI_API';
  value.authorityBoundary.geminiAdjudicationAllowed=true;
  const result=validateGovernedReviewQueue(value,{job,transportValidation});
  assert.equal(result.pass,false);
  assert.ok(result.errors.some((row)=>row.code==='REVIEW_QUEUE_GEMINI_AUTHORITY_FORBIDDEN'));
  assert.ok(result.errors.some((row)=>row.code==='REVIEW_QUEUE_GEMINI_ADJUDICATION_OPEN'));
});
