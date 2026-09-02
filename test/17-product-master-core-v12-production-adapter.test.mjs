import test from'node:test';
import assert from'node:assert/strict';
import{createProductionDiffPreview,approveProductionDiffPreview,buildProductionWriteSet,finalizeNoOpProductionPreview,validateProductionTargetSnapshot}from'../src/product-master-core/production-adapter.mjs';
import{APW430_PRODUCTION_TARGET_SNAPSHOT}from'../src/product-master-core/poc/apw430-production-target-snapshot.mjs';

const STAGING='sha256:36b71fdabfc58a8690e10b9dec8ac89afd180c0a53355fcdfa2874b6961292e0';
const baseArgs=(mappings)=>({id:'PREVIEW-TEST',proposalId:'PMCP-TEST',productId:'SER-YKK-APW430',stagingResultMasterFingerprint:STAGING,expectedStagingResultMasterFingerprint:STAGING,targetSnapshot:APW430_PRODUCTION_TARGET_SNAPSHOT,evidenceMappings:mappings,openBlockingPending:0,openNonBlockingPending:4,at:'2026-09-02T07:00:00Z'});

test('v1.2 validates the exact APW430 formal Google Sheets target snapshot',()=>{
 const r=validateProductionTargetSnapshot(APW430_PRODUCTION_TARGET_SNAPSHOT,{expectedFileId:'1QDocQ7yoXE6TAnzHtfsyKwwK6YB5_mgk90Bw1hm4iPo',expectedModifiedTime:'2026-08-30T11:39:41.909Z'});
 assert.equal(r.pass,true,JSON.stringify(r.errors));
});

test('v1.2 rejects STAGING fingerprint drift',()=>{
 const r=createProductionDiffPreview({...baseArgs([]),stagingResultMasterFingerprint:'sha256:drift'});
 assert.equal(r.pass,false); assert.ok(r.errors.some(x=>x.code==='PRODUCTION_STAGING_FINGERPRINT_MISMATCH'));
});

test('v1.2 creates NO_FORMAL_MUTATION_REQUIRED preview when Evidence is already represented',()=>{
 const mappings=[{evidenceId:'EV-1',classification:'EXACT_PRESENT'},{evidenceId:'EV-2',classification:'SCHEMA_GAP_NON_MUTATING'}];
 const r=createProductionDiffPreview(baseArgs(mappings));
 assert.equal(r.pass,true,JSON.stringify(r.errors)); assert.equal(r.preview.status,'NO_FORMAL_MUTATION_REQUIRED'); assert.equal(r.preview.diff.formalMutationCount,0); assert.equal(r.preview.approvalPolicy.productionWriteApproval,'NOT_APPLICABLE_NO_WRITE');
 const f=finalizeNoOpProductionPreview(r.preview); assert.equal(f.pass,true); assert.equal(f.preview.status,'PRODUCTION_SYNCED_NO_OP'); assert.equal(f.preview.productionWritePerformed,false);
});

test('v1.2 blocks unresolved or conflicting production mappings',()=>{
 const r=createProductionDiffPreview(baseArgs([{evidenceId:'EV-X',classification:'UNRESOLVED'}]));
 assert.equal(r.pass,false); assert.equal(r.preview.status,'BLOCKED');
});

test('v1.2 requires separate HUMAN approval for a real production mutation',()=>{
 const r=createProductionDiffPreview(baseArgs([{evidenceId:'EV-M',classification:'MUTATION_REQUIRED',formalMutations:[{sheet:'03A_シリーズ窓種設定',operation:'UPDATE_CELL',range:'K63',value:'x'}]}]));
 assert.equal(r.pass,true); assert.equal(r.preview.status,'READY_FOR_HUMAN_PRODUCTION_APPROVAL');
 const ai=approveProductionDiffPreview(r.preview,{approverType:'CHATGPT',approvedBy:'CHATGPT',expectedPreviewFingerprint:r.preview.previewFingerprint}); assert.equal(ai.pass,false); assert.ok(ai.errors.some(x=>x.code==='PRODUCTION_HUMAN_APPROVAL_REQUIRED'));
 const human=approveProductionDiffPreview(r.preview,{approverType:'HUMAN',approvedBy:'TEST_HUMAN_FIXTURE',expectedPreviewFingerprint:r.preview.previewFingerprint}); assert.equal(human.pass,true,JSON.stringify(human.errors));
 const set=buildProductionWriteSet(human.preview); assert.equal(set.pass,true,JSON.stringify(set.errors)); assert.equal(set.writeSet.mutations.length,1); assert.equal(set.productionWritePerformed,false);
});

test('v1.2 blocks production preview when BLOCKING PENDING exists',()=>{
 const r=createProductionDiffPreview({...baseArgs([]),openBlockingPending:1}); assert.equal(r.pass,false); assert.ok(r.errors.some(x=>x.code==='PRODUCTION_BLOCKING_PENDING_OPEN'));
});
