import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import{persistGeminiTransport,loadEvidenceInboxManifest}from'../src/product-master-core/evidence-inbox-store.mjs';
import{buildProductMasterReviewQueue}from'../src/product-master-core/review-queue.mjs';

const fixtureRoot=(t)=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'evidence-provenance-v27-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;};

const source={type:'OFFICIAL_PDF',driveFileId:'DRIVE-V27',title:'official-v27.pdf',version:'202609'};
const envelope=(batchId,candidateId)=>JSON.stringify({
  transportSchemaVersion:'1.0',transportType:'EVIDENCE_CANDIDATE_BATCH',batchId,generatedAt:'2026-09-05T05:00:00Z',
  producer:{system:'GEMINI_ANTIGRAVITY',mode:'LIVE_EXTERNAL'},productId:'SER-V27',sourceContext:source,
  candidates:[{
    recordType:'EVIDENCE_CANDIDATE',candidateSchemaVersion:'1.0',id:candidateId,sourceSystem:'GEMINI_ANTIGRAVITY',producerMode:'LIVE_EXTERNAL',status:'SUBMITTED',productId:'SER-V27',
    title:'execution provenance',subjectField:'window_type',claim:'The source explicitly identifies the target window type.',proposedStrength:'EXPLICIT',productNodeIds:[],
    source:{...source,printedPage:1,pdfPage:1,locatorText:'target window type'}
  }],issues:[]
});

const executionContext={
  workerContractVersion:'1.1',executionMode:'LIVE_EXTERNAL',executionChannel:'GEMINI_AI_PRO',
  preferredExecutionChannel:'GEMINI_AI_PRO',fallbackExecutionChannel:'GEMINI_API',fallbackAllowed:false,
  fallbackFrom:null,fallbackReason:null,transportMethod:'GEMINI_AI_PRO_STRUCTURED_HANDOFF',
  executionReference:'GITHUB_ACTIONS_RUN:Takuro-Kwkm/sash-app:456:1',model:'account-default'
};

test('v2.7 Evidence Inbox manifest persists normalized worker execution context without changing raw transport',t=>{
  const root=fixtureRoot(t);
  const inbox=path.join(root,'inbox');
  const raw=envelope('BATCH-V27-PROVENANCE-001','CAND-V27-PROVENANCE-001');
  const result=persistGeminiTransport(raw,{
    rootDir:inbox,importedAt:'2026-09-05T05:01:00Z',executionContext,
    expectedProductId:'SER-V27',expectedProducerSystem:'GEMINI_ANTIGRAVITY'
  });
  assert.equal(result.pass,true);
  assert.deepEqual(result.batch.executionContext,executionContext);
  const manifest=loadEvidenceInboxManifest(inbox);
  assert.deepEqual(manifest.batches[0].executionContext,executionContext);
  const storedRaw=fs.readFileSync(result.batchPath,'utf8');
  assert.equal(storedRaw,raw);
  assert.equal(JSON.parse(storedRaw).executionContext,undefined);
});

test('v2.7 Review Queue exposes execution provenance on Evidence Candidate refs',t=>{
  const root=fixtureRoot(t);
  const inbox=path.join(root,'inbox');
  const change=path.join(root,'change');
  const raw=envelope('BATCH-V27-PROVENANCE-002','CAND-V27-PROVENANCE-002');
  const imported=persistGeminiTransport(raw,{
    rootDir:inbox,importedAt:'2026-09-05T05:02:00Z',executionContext,
    expectedProductId:'SER-V27',expectedProducerSystem:'GEMINI_ANTIGRAVITY'
  });
  assert.equal(imported.pass,true);
  const queue=buildProductMasterReviewQueue({evidenceInboxDir:inbox,changeControlDir:change,productId:'SER-V27',generatedAt:'2026-09-05T05:03:00Z'});
  assert.equal(queue.summary.byKind.EVIDENCE_CANDIDATE,1);
  const item=queue.items[0];
  assert.equal(item.kind,'EVIDENCE_CANDIDATE');
  assert.equal(item.refs.executionContext.executionChannel,'GEMINI_AI_PRO');
  assert.equal(item.refs.executionContext.transportMethod,'GEMINI_AI_PRO_STRUCTURED_HANDOFF');
  assert.equal(item.refs.executionContext.executionReference,'GITHUB_ACTIONS_RUN:Takuro-Kwkm/sash-app:456:1');
  assert.equal(item.refs.executionContext.fallbackFrom,null);
});

test('v2.7 legacy Evidence Inbox batch stays readable and does not invent execution provenance',t=>{
  const root=fixtureRoot(t);
  const inbox=path.join(root,'inbox');
  const change=path.join(root,'change');
  const raw=envelope('BATCH-V27-LEGACY-001','CAND-V27-LEGACY-001');
  const imported=persistGeminiTransport(raw,{
    rootDir:inbox,importedAt:'2026-09-05T05:04:00Z',
    expectedProductId:'SER-V27',expectedProducerSystem:'GEMINI_ANTIGRAVITY'
  });
  assert.equal(imported.pass,true);
  const manifest=loadEvidenceInboxManifest(inbox);
  assert.equal(manifest.batches[0].executionContext,undefined);
  const queue=buildProductMasterReviewQueue({evidenceInboxDir:inbox,changeControlDir:change,productId:'SER-V27'});
  assert.equal(queue.items[0].refs.executionContext,undefined);
});
