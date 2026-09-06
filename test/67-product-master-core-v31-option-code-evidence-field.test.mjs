import test from'node:test';
import assert from'node:assert/strict';
import{CANONICAL_FIELD_NAMES,getCanonicalField}from'../src/product-master-core/canonical-fields.mjs';
import{createGeminiJob,buildGeminiTransportResponseJsonSchema,validateBridgeTransport}from'../src/product-master-core/gemini-execution-bridge.mjs';
import{validateEvidenceCandidate}from'../src/product-master-core/evidence-inbox.mjs';

test('official_option_code is a governed generic Evidence field',()=>{
  assert.equal(CANONICAL_FIELD_NAMES.has('official_option_code'),true);
  assert.equal(getCanonicalField('official_option_code')?.scope,'OPTION_ORDERING');

  const built=createGeminiJob({
    job_id:'GJOB-TEST-OFFICIAL-OPTION-CODE',job_type:'EVIDENCE_EXTRACTION',manufacturer:'LIXIL',series:'ジエスタ2',product_id:'SER-LIXIL-GIESTA2',
    task:'Extract explicit official option codes',prompt:'Extract only explicit official option codes.',
    source_context:{type:'OFFICIAL_PDF',driveFileId:'1DQp9sH77ho37ft7BaCCdqFXOQG3GnGUm',title:'202604_LIXIL_玄関ドア受発注資料集_完成品価格表.pdf',version:'IG3500_2026-04'},
    canonical_field_scope:['official_option_code'],execution_mode:'REPLAY'
  });
  assert.equal(built.pass,true,built.errors?.map(e=>e.message).join('\n'));
  const job=built.job;
  const schema=buildGeminiTransportResponseJsonSchema(job);
  assert.deepEqual(schema.properties.candidates.items.properties.subjectField.enum,['official_option_code']);

  const candidate={
    recordType:'EVIDENCE_CANDIDATE',candidateSchemaVersion:'1.0',id:'CAND-GST2-ELOCK-BUTTON-CODE',sourceSystem:'GEMINI_NOTEBOOKLM',producerMode:'LIVE_EXTERNAL',status:'SUBMITTED',
    productId:'SER-LIXIL-GIESTA2',subjectField:'official_option_code',claim:'GST2_OPT_ELOCK_BUTTON official_option_code = Z-304-DVBB',proposedStrength:'EXPLICIT',productNodeIds:[],
    source:{type:'OFFICIAL_PDF',driveFileId:'1DQp9sH77ho37ft7BaCCdqFXOQG3GnGUm',title:'202604_LIXIL_玄関ドア受発注資料集_完成品価格表.pdf',version:'IG3500_2026-04',printedPage:6,pdfPage:150,locatorText:'Z-304-DVBB'}
  };
  assert.equal(validateEvidenceCandidate(candidate).pass,true);
  const raw=JSON.stringify({transportSchemaVersion:'1.0',transportType:'EVIDENCE_CANDIDATE_BATCH',batchId:'BATCH-GST2-OPTION-CODE-TEST',generatedAt:'2026-09-06T08:00:00.000Z',producer:{system:'GEMINI_NOTEBOOKLM',mode:'LIVE_EXTERNAL'},productId:'SER-LIXIL-GIESTA2',sourceContext:{type:'OFFICIAL_PDF',driveFileId:'1DQp9sH77ho37ft7BaCCdqFXOQG3GnGUm',title:'202604_LIXIL_玄関ドア受発注資料集_完成品価格表.pdf',version:'IG3500_2026-04'},candidates:[candidate],issues:[]});
  assert.equal(validateBridgeTransport(raw,job).pass,true);
});
