import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import{
  createProductMasterChangeProposal,approveProductMasterChangeProposal,applyApprovedProductMasterChangeProposal,
  proposalFingerprint,productMasterFingerprint,stableJson,sha256
}from'../src/product-master-core/master-change-control.mjs';
import{buildAuthoringStagingProvenance,validateAuthoringStagingProvenance}from'../src/product-master-core/authoring-staging-provenance.mjs';
import{persistAuthoringStagingPackage,loadAuthoringStagingPackage}from'../src/product-master-core/authoring-staging-provenance-store.mjs';

const stableHash=(value)=>`sha256:${sha256(stableJson(value))}`;
const fixtureRoot=(t)=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'authoring-staging-v27-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;};

function fixture(){
  const baseMaster={product:{id:'SER-STAGING-001'},fields:[],productNodes:[],evidence:[],dependencyRules:[],pending:[],phases:[]};
  const created=createProductMasterChangeProposal({
    id:'PMCP-STAGING-001',productId:'SER-STAGING-001',baseMaster,
    changes:[{operation:'ADD_RECORD',collection:'fields',record:{id:'FIELD-STAGING-001',name:'window_type'}}],
    evidenceIds:[],sourceBatchIds:['BATCH-STAGING-001'],openBlockingPending:0,createdBy:'CHATGPT',at:'2026-09-05T13:00:00Z',summary:'Add one reviewed Authoring field.'
  });
  assert.equal(created.pass,true,created.errors?.[0]?.message);
  const proposal=created.proposal;
  const humanApprovalProvenance={
    schemaVersion:'1.1',recordType:'PRODUCT_MASTER_HUMAN_APPROVAL_PROVENANCE',status:'PASS',proposalId:proposal.id,productId:proposal.productId,
    proposalFingerprint:proposal.proposalFingerprint,baseMasterFingerprint:productMasterFingerprint(baseMaster),
    approval:{approverType:'HUMAN',approvedBy:'HUMAN_USER',approvedAt:'2026-09-05T13:01:00Z',approvalSource:'HUMAN_REVIEW_UI',approvalReference:'approval',scope:'APPROVE_AND_STAGE_ONLY',productionApproval:false},
    reviewBinding:{sourceBatchIds:['BATCH-STAGING-001']},
    authority:{humanApprovalVerified:true,geminiApprovalAllowed:false,chatgptHumanImpersonationAllowed:false,changeControlWriteAllowed:true,productionMasterAutoWrite:false,runtimeAutoWrite:false}
  };
  const humanApprovalReviewGateBinding={
    schemaVersion:'1.1',recordType:'PRODUCT_MASTER_HUMAN_APPROVAL_REVIEW_GATE_BINDING',status:'PASS',proposalId:proposal.id,productId:proposal.productId,proposalFingerprint:proposal.proposalFingerprint,
    humanApprovalProvenanceFingerprint:stableHash(humanApprovalProvenance),sourceBatchIds:['BATCH-STAGING-001'],reviewQueueGates:[{batchId:'BATCH-STAGING-001',jobId:'GJOB-STAGING-001',candidateCount:1,transportIssueCount:0,evidenceQueueItemCount:1,reviewQueueGateFingerprint:'sha256:gate'}],reviewQueueGateSetFingerprint:'sha256:gate-set',
    authority:{reviewQueueGateRequired:true,geminiApprovalAllowed:false,humanApprovalRequired:true,changeControlOpenAllowed:true,productionMasterAutoWrite:false,runtimeAutoWrite:false}
  };
  const approved=approveProductMasterChangeProposal(proposal,{approverType:'HUMAN',approvedBy:'HUMAN_USER',at:'2026-09-05T13:01:00Z',expectedProposalFingerprint:proposal.proposalFingerprint});
  assert.equal(approved.pass,true);
  approved.proposal.approval={...approved.proposal.approval,humanApprovalProvenanceFingerprint:stableHash(humanApprovalProvenance),humanApprovalReviewGateBindingFingerprint:stableHash(humanApprovalReviewGateBinding),scope:'APPROVE_AND_STAGE_ONLY'};
  const humanApprovalGate={
    schemaVersion:'1.1',recordType:'PRODUCT_MASTER_CHANGE_CONTROL_ENTRY_GATE',status:'PASS',proposalId:proposal.id,productId:proposal.productId,
    proposalFingerprint:proposalFingerprint(proposal),baseMasterFingerprint:productMasterFingerprint(baseMaster),humanApprovalProvenanceFingerprint:stableHash(humanApprovalProvenance),humanApprovalReviewGateBindingFingerprint:stableHash(humanApprovalReviewGateBinding),reviewQueueGateSetFingerprint:humanApprovalReviewGateBinding.reviewQueueGateSetFingerprint,
    authority:{humanApprovalRequired:true,reviewQueueGateRequired:true,geminiApprovalAllowed:false,chatgptHumanImpersonationAllowed:false,changeControlOpen:true,productionMasterWriteAllowed:false,runtimeWriteAllowed:false}
  };
  const applied=applyApprovedProductMasterChangeProposal({proposal:approved.proposal,baseMaster,openBlockingPending:0,mode:'STAGING',at:'2026-09-05T13:02:00Z',appliedBy:'CHATGPT_CONTROL_PLANE',validateMaster:(master)=>({pass:master.fields.some((row)=>row.id==='FIELD-STAGING-001')})});
  assert.equal(applied.pass,true,applied.errors?.[0]?.message);
  return{baseMaster,proposal,appliedProposal:applied.proposal,appliedMaster:applied.appliedMaster,humanApprovalProvenance,humanApprovalReviewGateBinding,humanApprovalGate};
}

test('v2.7 Authoring STAGING provenance binds approval, Review Gates, Proposal, Base and result Master',()=>{
  const f=fixture();
  const built=buildAuthoringStagingProvenance({...f,validation:{pass:true},at:'2026-09-05T13:02:00Z'});
  assert.equal(built.pass,true,built.errors?.[0]?.message);
  assert.equal(built.record.status,'PASS');
  assert.equal(built.record.stage,'STAGING_CANDIDATE');
  assert.equal(built.record.proposalFingerprint,proposalFingerprint(f.appliedProposal));
  assert.equal(built.record.baseMasterFingerprint,productMasterFingerprint(f.baseMaster));
  assert.equal(built.record.resultMasterFingerprint,productMasterFingerprint(f.appliedMaster));
  assert.equal(built.record.reviewQueueGateSetFingerprint,'sha256:gate-set');
  assert.equal(built.record.authority.authoringStagingCandidate,true);
  assert.equal(built.record.authority.canonicalMasterWritePerformed,false);
  assert.equal(built.record.authority.productionMasterWritePerformed,false);
  assert.equal(built.record.authority.runtimeWritePerformed,false);
  assert.equal(built.record.authority.registryWritePerformed,false);
  assert.equal(built.record.authority.formalPass,false);
});

test('v2.7 Authoring STAGING provenance fails closed on result Master or approval drift',()=>{
  const f=fixture();
  const built=buildAuthoringStagingProvenance({...f,validation:{pass:true}});
  assert.equal(built.pass,true);

  const changedMaster=structuredClone(f.appliedMaster);
  changedMaster.fields.push({id:'FIELD-TAMPERED'});
  const resultValidation=validateAuthoringStagingProvenance(built.record,{...f,appliedMaster:changedMaster});
  assert.equal(resultValidation.pass,false);
  assert.ok(resultValidation.errors.some((row)=>['AUTHORING_STAGING_RESULT_FINGERPRINT_MISMATCH','AUTHORING_STAGING_BINDING_STALE'].includes(row.code)));

  const changedApproval=structuredClone(f.humanApprovalProvenance);
  changedApproval.approval.approvedAt='2026-09-05T13:09:00Z';
  const approvalValidation=validateAuthoringStagingProvenance(built.record,{...f,humanApprovalProvenance:changedApproval});
  assert.equal(approvalValidation.pass,false);
  assert.ok(approvalValidation.errors.some((row)=>['AUTHORING_STAGING_APPROVAL_PROVENANCE_FINGERPRINT_MISMATCH','AUTHORING_STAGING_BINDING_STALE'].includes(row.code)));
});

test('v2.7 Authoring STAGING package persists snapshot and provenance as append-only pair',t=>{
  const root=fixtureRoot(t);
  const f=fixture();
  const built=buildAuthoringStagingProvenance({...f,validation:{pass:true}});
  assert.equal(built.pass,true);
  const persisted=persistAuthoringStagingPackage({record:built.record,...f},{rootDir:root});
  assert.equal(persisted.pass,true,persisted.errors?.[0]?.message);
  assert.ok(persisted.masterPath.endsWith('staging/PMCP-STAGING-001.authoring-master.json'));
  assert.ok(persisted.provenancePath.endsWith('staging-provenance/PMCP-STAGING-001.authoring-staging.json'));

  const loaded=loadAuthoringStagingPackage('PMCP-STAGING-001',{rootDir:root});
  assert.equal(loaded.pass,true,loaded.errors?.[0]?.message);
  assert.deepEqual(loaded.record,built.record);
  assert.deepEqual(loaded.appliedMaster,f.appliedMaster);

  const duplicate=persistAuthoringStagingPackage({record:built.record,...f},{rootDir:root});
  assert.equal(duplicate.pass,false);
  assert.ok(duplicate.errors.some((row)=>row.code==='AUTHORING_STAGING_PACKAGE_ALREADY_EXISTS'));
});

test('v2.7 stored Authoring STAGING package detects snapshot tampering',t=>{
  const root=fixtureRoot(t);
  const f=fixture();
  const built=buildAuthoringStagingProvenance({...f,validation:{pass:true}});
  const persisted=persistAuthoringStagingPackage({record:built.record,...f},{rootDir:root});
  assert.equal(persisted.pass,true);
  const stored=JSON.parse(fs.readFileSync(persisted.masterPath,'utf8'));
  stored.fields.push({id:'FIELD-STORED-TAMPER'});
  fs.writeFileSync(persisted.masterPath,`${JSON.stringify(stored,null,2)}\n`);
  const loaded=loadAuthoringStagingPackage('PMCP-STAGING-001',{rootDir:root});
  assert.equal(loaded.pass,false);
  assert.ok(loaded.errors.some((row)=>row.code==='AUTHORING_STAGING_STORED_MASTER_MISMATCH'));
});
