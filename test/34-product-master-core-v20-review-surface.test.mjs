import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import{renderProductMasterReviewSurface,writeProductMasterReviewSurface}from'../src/product-master-core/review-surface.mjs';

const queue={
  summary:{total:2,actionable:2,byStatus:{SUBMITTED:1,HUMAN_REQUIRED:1}},
  authorityBoundary:{masterChangeApproval:'HUMAN_REQUIRED',queueMutationAuthority:'NONE'},
  items:[
    {productId:'SER-A',kind:'EVIDENCE_CANDIDATE',sourceId:'CAND-1',reviewStatus:'SUBMITTED',sourceStatus:'SUBMITTED',sourceDecision:null,authority:'CHATGPT_OR_HUMAN',nextAction:'START_EVIDENCE_REVIEW',queueReason:'<unsafe>',artifactState:null},
    {productId:'SER-A',kind:'MASTER_CHANGE_PROPOSAL',sourceId:'PMCP-1',reviewStatus:'HUMAN_REQUIRED',sourceStatus:'PROPOSED',sourceDecision:null,authority:'HUMAN',nextAction:'HUMAN_APPROVE_OR_REJECT_PROPOSAL',queueReason:'change',artifactState:{approval:false}}
  ]
};

test('v2.0 Operator Review Surface exposes required columns and escapes content',()=>{
  const html=renderProductMasterReviewSurface(queue);
  for(const label of['Product','Kind','Source ID','Review Status','Source Status','Decision','Authority','Next Action','Reason','Artifact State'])assert.match(html,new RegExp(label));
  assert.match(html,/Read-only operator surface/);
  assert.match(html,/HUMAN_REQUIRED/);
  assert.equal(html.includes('<unsafe>'),false);
  assert.match(html,/&lt;unsafe&gt;/);
});

test('v2.0 Surface writer emits HTML and JSON without queue mutation',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'review-surface-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'evidence'),{recursive:true});
  fs.writeFileSync(path.join(root,'evidence','manifest.json'),JSON.stringify({batches:[]}));
  const result=writeProductMasterReviewSurface({evidenceInboxDir:path.join(root,'evidence'),changeControlDir:path.join(root,'change'),outputDir:path.join(root,'out'),generatedAt:'2026-09-04T05:03:00Z'});
  assert.equal(result.pass,true);
  assert.equal(result.mutationPerformed,false);
  assert.equal(fs.existsSync(result.htmlPath),true);
  assert.equal(fs.existsSync(result.jsonPath),true);
});
