import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import path from'node:path';

const read=(p)=>fs.readFileSync(path.resolve(p),'utf8');
const aiProPath='.github/workflows/product-master-antigravity-profile-live.yml';
const apiPath='.github/workflows/product-master-gemini-profile-live.yml';
const governedCliPath='scripts/run-gemini-product-master-job-v11.mjs';
const legacyPaths=[
  '.github/workflows/gemini-live-apw430-retry.yml',
  '.github/workflows/gemini-apw430-one-secret-live.yml'
];

test('v2.7 Gemini AI Pro workflow uses LIVE handoff rather than REPLAY semantics',()=>{
  const text=read(aiProPath);
  assert.ok(text.includes('npm run test:product-master-core:v27'));
  assert.ok(text.includes('--external-response="$ADAPTER_DIR/raw-transport.json"'));
  assert.equal(text.includes('--replay-response="$ADAPTER_DIR/raw-transport.json"'),false);
  assert.ok(text.includes("assert job.get('executionMode')=='LIVE_EXTERNAL'"));
  assert.ok(text.includes("assert job.get('executionChannel')=='GEMINI_AI_PRO'"));
  assert.ok(text.includes("assert job.get('transportMethod')=='GEMINI_AI_PRO_STRUCTURED_HANDOFF'"));
  assert.ok(text.includes("assert ctx.get('executionChannel')=='GEMINI_AI_PRO'"));
  assert.ok(text.includes("'EXECUTION_PROVENANCE_GATE':'PASS'"));
});

test('v2.7 Gemini API workflow is manual-only and explicitly records API execution contract',()=>{
  const text=read(apiPath);
  assert.ok(text.includes('workflow_dispatch:'));
  assert.equal(/^\s*push:/m.test(text),false);
  assert.ok(text.includes('GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}'));
  assert.ok(text.includes('--execution-mode=LIVE_EXTERNAL'));
  assert.ok(text.includes('--execution-channel=GEMINI_API'));
  assert.ok(text.includes('--preferred-execution-channel=GEMINI_AI_PRO'));
  assert.ok(text.includes('--fallback-execution-channel=GEMINI_API'));
  assert.ok(text.includes('--fallback-allowed=false'));
  assert.ok(text.includes('--transport-method=GEMINI_API_DIRECT_RESPONSE'));
  assert.ok(text.includes('--execution-reference="$execution_reference"'));
  assert.ok(text.includes("assert job.get('executionChannel')=='GEMINI_API'"));
  assert.ok(text.includes("assert ctx.get('executionChannel')=='GEMINI_API'"));
  assert.ok(text.includes("'EXECUTION_PROVENANCE_GATE':'PASS'"));
});

test('v2.7 both LIVE worker surfaces use the shared Source Acquisition contract',()=>{
  for(const [file,channel] of[[aiProPath,'GEMINI_AI_PRO'],[apiPath,'GEMINI_API']]){
    const text=read(file);
    assert.ok(text.includes('node scripts/acquire-product-master-source.mjs'),file);
    assert.ok(text.includes(`--execution-channel=${channel}`),file);
    assert.ok(text.includes('--audit="$ARTIFACT_DIR/source-acquisition-audit.json"'),file);
    assert.ok(text.includes('--source-acquisition-audit="$ARTIFACT_DIR/source-acquisition-audit.json"'),file);
    assert.ok(text.includes("assert source.get('schemaVersion')=='1.1'"),file);
    assert.ok(text.includes("assert source.get('recordType')=='PRODUCT_MASTER_SOURCE_ACQUISITION'"),file);
    assert.ok(text.includes("assert source.get('status')=='PASS'"),file);
    assert.ok(text.includes(`assert source.get('executionChannel')=='${channel}'`),file);
    assert.ok(text.includes("assert source.get('identity',{}).get('mode') in {'FULL_BYTE_IDENTITY','SCOPED_CONTENT_EQUIVALENCE'}"),file);
    assert.ok(text.includes("assert source.get('credentialMaterialPersisted') is False"),file);
    assert.ok(text.includes("'SOURCE_ACQUISITION_GATE':'PASS'"),file);
  }
});

test('v2.7 AI Pro validates scoped Source Delivery before Worker execution',()=>{
  const text=read(aiProPath);
  const deliveryPos=text.indexOf('Validate Source Delivery contract before AI Pro execution');
  const workerPos=text.indexOf('Run Gemini Worker through tool-less inline-evidence Antigravity headless mode');
  assert.ok(deliveryPos>=0);
  assert.ok(workerPos>deliveryPos);
  assert.ok(text.includes('node scripts/build-product-master-source-delivery.mjs'));
  assert.ok(text.includes('--source-delivery-audit="$ARTIFACT_DIR/source-delivery-audit.json"'));
  assert.ok(text.includes("assert delivery.get('recordType')=='PRODUCT_MASTER_SOURCE_DELIVERY'"));
  assert.ok(text.includes("assert delivery.get('executionChannel')=='GEMINI_AI_PRO'"));
  assert.ok(text.includes("assert delivery.get('delivery',{}).get('method')=='INLINE_VERIFIED_PAGE_SCOPED_TEXT'"));
  assert.ok(text.includes("'SOURCE_DELIVERY_GATE':'PASS'"));
});

test('v2.7 Gemini API records verified File attachment as Source Delivery provenance',()=>{
  const text=read(apiPath);
  assert.ok(text.includes("assert delivery.get('recordType')=='PRODUCT_MASTER_SOURCE_DELIVERY'"));
  assert.ok(text.includes("assert delivery.get('executionChannel')=='GEMINI_API'"));
  assert.ok(text.includes("assert delivery.get('delivery',{}).get('method')=='GEMINI_FILE_ATTACHMENT'"));
  assert.ok(text.includes("assert delivery.get('providerAttachmentReference')"));
  assert.ok(text.includes("assert (qctx.get('sourceDelivery') or {}).get('status')=='PASS'"));
  assert.ok(text.includes("'SOURCE_DELIVERY_GATE':'PASS'"));
});

test('v2.7 AI Pro normalizes surface execution and checks response fingerprint before Transport handoff',()=>{
  const text=read(aiProPath);
  const workerPos=text.indexOf('Run Gemini Worker through tool-less inline-evidence Antigravity headless mode');
  const executionPos=text.indexOf('Normalize and validate Gemini Execution contract');
  const importPos=text.indexOf('Import structured output through governed Transport and Evidence Inbox');
  assert.ok(workerPos>=0);
  assert.ok(executionPos>workerPos);
  assert.ok(importPos>executionPos);
  assert.ok(text.includes('node scripts/build-product-master-gemini-execution.mjs'));
  assert.ok(text.includes('--surface-audit="$ADAPTER_DIR/antigravity-execution-audit.json"'));
  assert.ok(text.includes('--raw-response="$ADAPTER_DIR/raw-transport.json"'));
  assert.ok(text.includes('--gemini-execution-audit="$ARTIFACT_DIR/gemini-execution-audit.json"'));
  assert.ok(text.includes("assert execution.get('recordType')=='PRODUCT_MASTER_GEMINI_EXECUTION'"));
  assert.ok(text.includes("assert execution.get('surface',{}).get('id')=='ANTIGRAVITY_CLI'"));
  assert.ok(text.includes("assert execution.get('result',{}).get('rawResponseSha256')==audit.get('rawResponseSha256')"));
  assert.ok(text.includes("assert (qctx.get('geminiExecution') or {}).get('status')=='SUCCEEDED'"));
  assert.ok(text.includes("'GEMINI_EXECUTION_GATE':'PASS'"));
});

test('v2.7 Gemini API normalizes actual model, preflight and response fingerprint as execution provenance',()=>{
  const text=read(apiPath);
  assert.ok(text.includes("assert execution.get('recordType')=='PRODUCT_MASTER_GEMINI_EXECUTION'"));
  assert.ok(text.includes("assert execution.get('surface',{}).get('id')=='GOOGLE_GEMINI_API'"));
  assert.ok(text.includes("assert execution.get('surface',{}).get('authenticationMode')=='GEMINI_API_KEY'"));
  assert.ok(text.includes("assert execution.get('surface',{}).get('model')==job.get('model')"));
  assert.ok(text.includes("assert execution.get('preflight',{}).get('credentialValuePersisted') is False"));
  assert.ok(text.includes("assert execution.get('result',{}).get('rawResponseSha256')==audit.get('rawResponseSha256')"));
  assert.ok(text.includes("assert (qctx.get('geminiExecution') or {}).get('status')=='SUCCEEDED'"));
  assert.ok(text.includes("'GEMINI_EXECUTION_GATE':'PASS'"));
});

test('v2.7 both LIVE worker surfaces use governed v1.1 Pre-Inbox Guard and Transport Provenance',()=>{
  for(const [file,channel,producer] of[[aiProPath,'GEMINI_AI_PRO','GEMINI_ANTIGRAVITY'],[apiPath,'GEMINI_API','GEMINI_NOTEBOOKLM']]){
    const text=read(file);
    assert.ok(text.includes('node scripts/run-gemini-product-master-job-v11.mjs'),file);
    assert.equal(text.includes('node scripts/run-gemini-product-master-job.mjs \\'),false,file);
    assert.ok(text.includes("assert guard.get('status')=='PASS'"),file);
    assert.ok(text.includes("assert (guard.get('record') or {}).get('evidenceInboxWriteAllowed') is True"),file);
    assert.ok(text.includes("assert provenance.get('recordType')=='PRODUCT_MASTER_TRANSPORT_PROVENANCE'"),file);
    assert.ok(text.includes(`assert provenance.get('executionChannel')=='${channel}'`),file);
    assert.ok(text.includes(`assert provenance.get('transport',{}).get('producer',{}).get('system')=='${producer}'`),file);
    assert.ok(text.includes("assert provenance.get('executionBinding',{}).get('rawResponseSha256')==audit.get('rawResponseSha256')"),file);
    assert.ok(text.includes("assert (qctx.get('transportProvenance') or {}).get('status')=='PASS'"),file);
    assert.ok(text.includes("'TRANSPORT_PROVENANCE_GATE':'PASS'"),file);
    assert.ok(text.includes("'PRE_INBOX_GUARD':'PASS'"),file);
  }
});

test('v2.7 governed v1.1 CLI delegates persistence authority to guarded runner',()=>{
  const text=read(governedCliPath);
  assert.ok(text.includes("import{runGovernedGeminiV11}from'../src/product-master-core/governed-gemini-v11-runner.mjs'"));
  assert.ok(text.includes('const result=await runGovernedGeminiV11(job,{'));
  assert.ok(text.includes("preInboxGuard:result.preInboxGuard?.status??'NOT_REACHED'"));
  assert.ok(text.includes("evidenceInboxGate:result.inboxImport?.pass===true?'PASS':'NOT_WRITTEN'"));
  assert.equal(text.includes('persistGeminiTransport('),false);
});

test('v2.7 worker surfaces keep authority closed after Evidence import',()=>{
  for(const file of[aiProPath,apiPath]){
    const text=read(file);
    assert.ok(text.includes("'HUMAN_APPROVAL_GATE':'NOT_OPENED'"),file);
    assert.ok(text.includes("'MASTER_CHANGE_GATE':'CLOSED'"),file);
    assert.ok(text.includes("'canonicalWritePerformed':False"),file);
    assert.ok(text.includes("'runtimeWritePerformed':False"),file);
    assert.ok(text.includes("'productionWritePerformed':False"),file);
  }
});

test('v2.7 legacy APW430 LIVE workflow surfaces cannot create new uncontracted LIVE jobs',()=>{
  for(const file of legacyPaths){
    const text=read(file);
    assert.ok(text.includes('Legacy Disabled'),file);
    assert.ok(text.includes('workflow_dispatch:'),file);
    assert.equal(/^\s*push:/m.test(text),false,file);
    assert.ok(text.includes('DISABLED'),file);
    assert.ok(text.includes('product-master-antigravity-profile-live.yml'),file);
    assert.ok(text.includes('product-master-gemini-profile-live.yml'),file);
    assert.equal(text.includes('GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}'),false,file);
  }
});
