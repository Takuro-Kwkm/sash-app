import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import{persistHumanApprovalProvenance,loadHumanApprovalProvenance}from'../src/product-master-core/human-approval-provenance-store.mjs';

const fixtureRoot=(t)=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'human-approval-store-v27-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;};

const record={
  schemaVersion:'1.1',recordType:'PRODUCT_MASTER_HUMAN_APPROVAL_PROVENANCE',status:'PASS',proposalId:'PMCP-STORE-001',productId:'SER-STORE-001',
  proposalFingerprint:`sha256:${'a'.repeat(64)}`,baseMasterFingerprint:`sha256:${'b'.repeat(64)}`,
  approval:{approverType:'HUMAN',approvedBy:'HUMAN_USER_EXPLICIT_APPROVAL',approvedAt:'2026-09-05T12:00:00Z',approvalSource:'CHAT_CONVERSATION_EXPLICIT_COMMAND',approvalReference:'Explicit human approval',scope:'APPROVE_AND_STAGE_ONLY',productionApproval:false},
  reviewBinding:{sourceBatchIds:['BATCH-STORE-001'],canonicalEvidenceIds:['EVID-STORE-001'],adjudicationIds:['ADJ-STORE-001'],bindings:[],relevantQueueFingerprint:`sha256:${'c'.repeat(64)}`,openBlockingPending:0},
  authority:{humanApprovalVerified:true,geminiApprovalAllowed:false,chatgptHumanImpersonationAllowed:false,changeControlWriteAllowed:true,productionMasterAutoWrite:false,runtimeAutoWrite:false}
};

test('v2.7 Human Approval Provenance is stored separately and never rewrites legacy approval',t=>{
  const root=fixtureRoot(t);
  const approvalDir=path.join(root,'approvals');
  fs.mkdirSync(approvalDir,{recursive:true});
  const legacyPath=path.join(approvalDir,'PMCP-STORE-001.approval.json');
  const legacy='{"approvalSchemaVersion":"1.0","recordType":"PRODUCT_MASTER_CHANGE_APPROVAL","proposalId":"PMCP-STORE-001","approverType":"HUMAN"}\n';
  fs.writeFileSync(legacyPath,legacy);

  const persisted=persistHumanApprovalProvenance(record,{rootDir:root});
  assert.equal(persisted.pass,true,persisted.errors?.[0]?.message);
  assert.ok(persisted.filePath.endsWith('approval-provenance/PMCP-STORE-001.human-approval.json'));
  assert.equal(fs.readFileSync(legacyPath,'utf8'),legacy);

  const loaded=loadHumanApprovalProvenance('PMCP-STORE-001',{rootDir:root});
  assert.equal(loaded.pass,true,loaded.errors?.[0]?.message);
  assert.deepEqual(loaded.record,record);
  assert.equal(fs.readFileSync(legacyPath,'utf8'),legacy);
});

test('v2.7 Human Approval Provenance store is append-only per Proposal',t=>{
  const root=fixtureRoot(t);
  const first=persistHumanApprovalProvenance(record,{rootDir:root});
  assert.equal(first.pass,true);
  const second=persistHumanApprovalProvenance({...record,approval:{...record.approval,approvedAt:'2026-09-05T12:01:00Z'}},{rootDir:root});
  assert.equal(second.pass,false);
  assert.equal(second.status,'HUMAN_APPROVAL_PROVENANCE_PERSIST_BLOCKED');
  assert.ok(second.errors.some((row)=>row.code==='HUMAN_APPROVAL_PROVENANCE_ALREADY_EXISTS'));
});
