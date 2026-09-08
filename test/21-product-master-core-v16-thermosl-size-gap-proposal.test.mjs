import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import path from'node:path';
import{
  THERMOSL_MANUAL_SHUTTER_STANDARD_SIZE_SOURCE_RECORDS
}from'../src/product-master-core/products/thermosl/manual-shutter-standard-size-evidence.mjs';
import{
  THERMOSL_PRODUCT_MASTER_WORKFLOW,
  THERMOSL_CANONICAL_STANDARD_SIZE_RECORDS,
  THERMOSL_CANONICAL_SIZE_GLASS_CONDITIONS
}from'../src/product-master-core/products/thermosl/workflow.mjs';
import{auditStandardSizeSourceCoverage}from'../src/product-master-core/standard-size-source-audit.mjs';
import{createStandardSizeSourceGapChangeProposal}from'../src/product-master-core/standard-size-source-gap-proposal.mjs';
import{approveProductMasterChangeProposal}from'../src/product-master-core/master-change-control.mjs';

const read=(relative)=>fs.readFileSync(path.resolve(relative),'utf8');
const build=()=>createStandardSizeSourceGapChangeProposal({
  productId:THERMOSL_PRODUCT_MASTER_WORKFLOW.productId,
  sourceRecords:THERMOSL_PRODUCT_MASTER_WORKFLOW.standardSizeSourceAudit.sourceRecords,
  canonicalRecords:THERMOSL_CANONICAL_STANDARD_SIZE_RECORDS,
  existingSizeGlassConditions:THERMOSL_CANONICAL_SIZE_GLASS_CONDITIONS,
  ...THERMOSL_PRODUCT_MASTER_WORKFLOW.standardSizeGapProposal
});

test('v1.6 Thermos L official source evidence uses 97 explicit cells and no W×H cross-product generator',()=>{
  const source=read('src/product-master-core/products/thermosl/manual-shutter-standard-size-evidence.mjs');
  assert.equal(source.includes('cross('),false);
  assert.equal(source.includes('flatMap((height)'),false);
  assert.equal(THERMOSL_MANUAL_SHUTTER_STANDARD_SIZE_SOURCE_RECORDS.length,97);
  for(const row of THERMOSL_MANUAL_SHUTTER_STANDARD_SIZE_SOURCE_RECORDS){
    assert.ok(row.attributes.callW);
    assert.ok(row.attributes.callH);
    assert.ok(Number.isInteger(row.attributes.actualW));
    assert.ok(Number.isInteger(row.attributes.actualH));
    assert.ok(row.attributes.glassSymbol);
    assert.ok(Number.isInteger(row.attributes.legendPrintedPage));
    assert.ok(row.source.locatorText.includes(row.sizeCode));
  }
});

test('v1.6 current formal Master gap is exactly 97 official / 12 match / 85 missing',()=>{
  const audit=auditStandardSizeSourceCoverage({
    productId:THERMOSL_PRODUCT_MASTER_WORKFLOW.productId,
    sourceRecords:THERMOSL_MANUAL_SHUTTER_STANDARD_SIZE_SOURCE_RECORDS,
    canonicalRecords:THERMOSL_CANONICAL_STANDARD_SIZE_RECORDS
  });
  assert.equal(audit.pass,true);
  assert.equal(audit.coveragePass,false);
  assert.deepEqual(audit.counts,{
    officialAvailable:97,match:12,missingInCanonical:85,canonicalInactive:0,
    extraInCanonical:0,duplicateCanonicalKeys:0,canonicalInCoveredScope:12
  });
});

test('v1.6 builds HUMAN_REQUIRED Proposal with 8 Evidence + 85 Size + 85 paired glass-condition additions',()=>{
  const result=build();
  assert.equal(result.pass,true,JSON.stringify(result.errors));
  assert.equal(result.status,'SIZE_GAP_CHANGE_PROPOSAL_READY');
  assert.equal(result.proposal.id,'PMCP-LIX-SAMOSL-SHUT-MSTD-SIZE-GAP-20260902-001');
  assert.equal(result.proposal.status,'PROPOSED');
  assert.equal(result.proposal.approvalPolicy,'HUMAN_REQUIRED');
  assert.deepEqual(result.counts,{evidenceAdditions:8,sizeAdditions:85,glassConditionAdditions:85,totalChanges:178});
  assert.equal(result.formalWorkbookWritePerformed,false);
  assert.equal(result.runtimeWritePerformed,false);
});

test('v1.6 proposed Size IDs are 001560-001644 and every Size has one matching glass-condition record',()=>{
  const result=build();
  const ids=result.sizeRecords.map((row)=>row.id);
  assert.equal(ids[0],'SZ-SL-001560');
  assert.equal(ids.at(-1),'SZ-SL-001644');
  assert.equal(new Set(ids).size,85);
  assert.equal(result.glassConditions.length,85);
  const glassBySize=new Map(result.glassConditions.map((row)=>[row.sizeId,row]));
  for(const size of result.sizeRecords){
    const glass=glassBySize.get(size.id);
    assert.ok(glass,`Missing glass condition for ${size.id}`);
    assert.equal(glass.sizeCode,size.sizeCode);
    assert.equal(glass.glassSymbol,size.glassSymbol);
    assert.deepEqual(glass.evidenceIds,size.evidenceIds);
  }
});

test('v1.6 projected Master closes the audited official source slice to 97/97 without Workbook or Runtime write',()=>{
  const result=build();
  assert.equal(result.projectedAudit.pass,true);
  assert.equal(result.projectedAudit.coveragePass,true);
  assert.deepEqual(result.projectedAudit.counts,{
    officialAvailable:97,match:97,missingInCanonical:0,canonicalInactive:0,
    extraInCanonical:0,duplicateCanonicalKeys:0,canonicalInCoveredScope:97
  });
  assert.equal(result.formalWorkbookWritePerformed,false);
  assert.equal(result.runtimeWritePerformed,false);
});

test('v1.6 ChatGPT cannot self-approve the Thermos L Size Master mutation',()=>{
  const result=build();
  const approval=approveProductMasterChangeProposal(result.proposal,{
    approverType:'CHATGPT',approvedBy:'CHATGPT',expectedProposalFingerprint:result.proposal.proposalFingerprint
  });
  assert.equal(approval.pass,false);
  assert.ok(approval.errors.some((row)=>row.code==='MASTER_CHANGE_HUMAN_APPROVAL_REQUIRED'));
});

test('v1.6 generic gap proposal Core contains no Thermos L, LIXIL or product id token',()=>{
  for(const file of[
    'src/product-master-core/standard-size-source-gap-proposal.mjs',
    'src/product-master-core/standard-size-source-gap-proposal-runner.mjs'
  ]){
    const source=read(file);
    assert.equal(source.includes('SAMOSL'),false,file);
    assert.equal(source.includes('LIXIL'),false,file);
    assert.equal(source.includes('SER-LIX-SAMOSL'),false,file);
  }
});
