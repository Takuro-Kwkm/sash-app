import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import{createProductWorkflowRegistry,validateProductWorkflowProfile}from'../src/product-master-core/product-workflow-registry.mjs';
import{runEvidenceRoundTrip}from'../src/product-master-core/evidence-roundtrip-runner.mjs';
import{runTechnicalFactResolutionWorkflow}from'../src/product-master-core/technical-fact-resolution-runner.mjs';
import{PRODUCT_MASTER_WORKFLOW_REGISTRY,REGISTERED_PRODUCT_MASTER_WORKFLOW_IDS}from'../src/product-master-core/products/index.mjs';
import{APW430_PRODUCT_MASTER_WORKFLOW}from'../src/product-master-core/products/apw430/workflow.mjs';

const read=(relative)=>fs.readFileSync(path.resolve(relative),'utf8');

test('v1.4 generic Core runners contain no APW430 or manufacturer token',()=>{
  for(const file of['src/product-master-core/evidence-roundtrip-runner.mjs','src/product-master-core/technical-fact-resolution-runner.mjs','src/product-master-core/product-workflow-registry.mjs']){
    const source=read(file);
    assert.equal(source.includes('APW430'),false,file);
    assert.equal(source.includes('YKK'),false,file);
    assert.equal(source.includes('LIXIL'),false,file);
  }
});

test('v1.4 Product Master workflow registry accepts arbitrary product profiles and rejects duplicates',()=>{
  const synthetic={
    workflowSchemaVersion:'1.0',recordType:'PRODUCT_MASTER_WORKFLOW_PROFILE',productId:'SER-TEST-GENERIC',status:'ACTIVE',
    capabilities:{evidenceRoundTrip:false,technicalFacts:false,formalWorkbookMutation:false,runtimeAutoWrite:false}
  };
  assert.equal(validateProductWorkflowProfile(synthetic).pass,true);
  const built=createProductWorkflowRegistry([synthetic]);
  assert.equal(built.pass,true,JSON.stringify(built.errors));
  assert.equal(built.registry.require('SER-TEST-GENERIC').productId,'SER-TEST-GENERIC');
  const duplicate=createProductWorkflowRegistry([synthetic,structuredClone(synthetic)]);
  assert.equal(duplicate.pass,false);
  assert.ok(duplicate.errors.some((row)=>row.code==='WORKFLOW_PRODUCT_DUPLICATE'));
});

test('v1.4 APW430 is registered as a product profile outside poc/',()=>{
  assert.equal(REGISTERED_PRODUCT_MASTER_WORKFLOW_IDS.includes('SER-YKK-APW430'),true);
  assert.equal(PRODUCT_MASTER_WORKFLOW_REGISTRY.require('SER-YKK-APW430'),APW430_PRODUCT_MASTER_WORKFLOW);
  assert.equal(APW430_PRODUCT_MASTER_WORKFLOW.capabilities.formalWorkbookMutation,false);
  assert.equal(APW430_PRODUCT_MASTER_WORKFLOW.capabilities.runtimeAutoWrite,false);
  assert.equal(APW430_PRODUCT_MASTER_WORKFLOW.technicalFacts.length,4);
  const compatibility=read('src/product-master-core/poc/apw430-technical-facts.mjs');
  assert.match(compatibility,/Historical compatibility export/);
  assert.match(compatibility,/products\/apw430\/technical-facts\.mjs/);
});

test('v1.4 generic Evidence runner reproduces APW430 live round trip from profile data',t=>{
  const artifactDir=fs.mkdtempSync(path.join(os.tmpdir(),'sash-v14-roundtrip-'));
  t.after(()=>fs.rmSync(artifactDir,{recursive:true,force:true}));
  const profile=APW430_PRODUCT_MASTER_WORKFLOW;
  const round=profile.evidenceRoundTrip;
  const result=runEvidenceRoundTrip({
    artifactDir,rawPath:path.resolve(round.rawPath),productId:profile.productId,
    knownFields:round.knownFields,nodeIds:round.nodeIds,existingCanonicalEvidence:round.existingCanonicalEvidence,
    adjudicationPlan:round.adjudicationPlan,expectedProducerMode:round.expectedProducerMode,
    issueSeverity:round.issueSeverity,timeOrigin:round.timeOrigin,reportVersion:'1.4',reportLabel:'PRODUCT_MASTER_EVIDENCE_ROUNDTRIP'
  });
  assert.equal(result.pass,true);
  assert.equal(result.report.status,'PRODUCT_MASTER_EVIDENCE_ROUNDTRIP_PASS');
  assert.equal(result.report.productId,'SER-YKK-APW430');
  assert.deepEqual(result.report.adjudication.decisions,{ACCEPT:9,REJECT:3,PENDING:0});
  assert.equal(result.report.transportIssues.linked,4);
  assert.equal(result.report.productionMasterWritePerformed,false);
  assert.equal(result.report.runtimeWritePerformed,false);
});

test('v1.4 generic Technical Fact runner resolves product-linked PENDING without Workbook or Runtime write',t=>{
  const artifactDir=fs.mkdtempSync(path.join(os.tmpdir(),'sash-v14-facts-'));
  t.after(()=>fs.rmSync(artifactDir,{recursive:true,force:true}));
  const profile=APW430_PRODUCT_MASTER_WORKFLOW;
  const round=profile.evidenceRoundTrip;
  const runRoundTrip=({artifactDir:dir})=>runEvidenceRoundTrip({
    artifactDir:dir,rawPath:path.resolve(round.rawPath),productId:profile.productId,
    knownFields:round.knownFields,nodeIds:round.nodeIds,existingCanonicalEvidence:round.existingCanonicalEvidence,
    adjudicationPlan:round.adjudicationPlan,expectedProducerMode:round.expectedProducerMode,
    issueSeverity:round.issueSeverity,timeOrigin:round.timeOrigin,reportVersion:'1.4',reportLabel:'PRODUCT_MASTER_EVIDENCE_ROUNDTRIP'
  });
  const result=runTechnicalFactResolutionWorkflow({artifactDir,productId:profile.productId,technicalFacts:profile.technicalFacts,runEvidenceRoundTrip:runRoundTrip,expectedPendingBefore:4,reportVersion:'1.4'});
  assert.equal(result.pass,true);
  assert.equal(result.report.pendingBefore,4);
  assert.equal(result.report.pendingAfter,0);
  assert.equal(result.report.resolvedByTechnicalFact,4);
  assert.equal(result.report.formalWorkbookWritePerformed,false);
  assert.equal(result.report.runtimeWritePerformed,false);
  assert.equal(result.report.gates.PRODUCT_SCOPE,'PASS');
  assert.equal(result.report.gates.PENDING_RESOLUTION,'PASS');
});
