import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import{runApw430LiveEvidenceRoundTrip}from'../src/product-master-core/live-roundtrip-v1.mjs';
import{evidenceAdjudicationSummary,loadEvidenceAdjudicationStore,transitionPersistedPending}from'../src/product-master-core/evidence-adjudication-store.mjs';
import{APW430_TECHNICAL_FACTS}from'../src/product-master-core/poc/apw430-technical-facts.mjs';
import{createTechnicalFact,validateTechnicalFactRegistry}from'../src/product-master-core/technical-fact-registry.mjs';

const FACT_IDS=APW430_TECHNICAL_FACTS.map((row)=>row.id);

test('v1.3 registers exactly four APW430 dimension formulas as Technical Facts, not Canonical Fields',()=>{
  const validation=validateTechnicalFactRegistry(APW430_TECHNICAL_FACTS);
  assert.equal(validation.pass,true,JSON.stringify(validation.errors));
  assert.equal(APW430_TECHNICAL_FACTS.length,4);
  assert.ok(APW430_TECHNICAL_FACTS.every((row)=>row.factType==='DIMENSION_FORMULA'));
  assert.ok(APW430_TECHNICAL_FACTS.every((row)=>row.canonicalField===null));
  assert.ok(APW430_TECHNICAL_FACTS.every((row)=>row.formalWorkbookPolicy==='CONTROL_PLANE_ONLY'));
  assert.ok(APW430_TECHNICAL_FACTS.every((row)=>row.runtimePolicy==='REFERENCE_ONLY_NOT_CONSUMED'));
});

test('v1.3 preserves exact official p70/PDF72 locators for all four formulas',()=>{
  assert.ok(APW430_TECHNICAL_FACTS.every((row)=>row.source.printedPage===70&&row.source.pdfPage===72));
  assert.ok(APW430_TECHNICAL_FACTS.every((row)=>row.source.driveFileId==='1j9PtW8yoKBZ4Nodm58wU3QtOCvxlEja9'));
});

test('v1.3 formula normalization matches APW430 official offsets exactly',()=>{
  const offsets=APW430_TECHNICAL_FACTS.map((row)=>[row.formula.w.offsetMm,row.formula.h.offsetMm]);
  assert.deepEqual(offsets,[[-60,-60],[-60,-30],[-60,-45],[-40,-70]]);
});

test('v1.3 rejects forcing a dimension formula into size_mode',()=>{
  const base=structuredClone(APW430_TECHNICAL_FACTS[0]);
  delete base.fingerprint;
  base.id='TF-INVALID-SIZE-MODE';
  base.canonicalField='size_mode';
  const result=createTechnicalFact(base);
  assert.equal(result.pass,false);
  assert.ok(result.errors.some((row)=>row.code==='TECHNICAL_FACT_CANONICAL_FIELD_FORBIDDEN'));
});

test('v1.3 resolves the four LIVE transport PENDING records with verified Technical Facts',t=>{
  const artifactDir=fs.mkdtempSync(path.join(os.tmpdir(),'sash-v13-'));
  t.after(()=>fs.rmSync(artifactDir,{recursive:true,force:true}));
  const live=runApw430LiveEvidenceRoundTrip({artifactDir:path.join(artifactDir,'live')});
  assert.equal(evidenceAdjudicationSummary(live.inboxRoot).openPending,4);
  for(const fact of APW430_TECHNICAL_FACTS){
    const pending=loadEvidenceAdjudicationStore(live.inboxRoot).pending.find((row)=>row.sourceIssueId===fact.sourceIssueId);
    const result=transitionPersistedPending({
      rootDir:live.inboxRoot,pendingId:pending.id,nextStatus:'RESOLVED',technicalFactIds:[fact.id],externalTechnicalFactIds:FACT_IDS,
      resolutionNote:'Resolved by verified Technical Fact; no formal Workbook or Runtime mutation.',by:'CHATGPT'
    });
    assert.equal(result.pass,true,JSON.stringify(result.errors));
    assert.deepEqual(result.pending.resolutionTechnicalFactIds,[fact.id]);
  }
  assert.equal(evidenceAdjudicationSummary(live.inboxRoot).openPending,0);
});

test('v1.3 rejects unknown Technical Fact ids as PENDING resolution evidence',t=>{
  const artifactDir=fs.mkdtempSync(path.join(os.tmpdir(),'sash-v13-unknown-'));
  t.after(()=>fs.rmSync(artifactDir,{recursive:true,force:true}));
  const live=runApw430LiveEvidenceRoundTrip({artifactDir:path.join(artifactDir,'live')});
  const pending=loadEvidenceAdjudicationStore(live.inboxRoot).pending[0];
  const result=transitionPersistedPending({
    rootDir:live.inboxRoot,pendingId:pending.id,nextStatus:'RESOLVED',technicalFactIds:['TF-UNKNOWN'],externalTechnicalFactIds:FACT_IDS,
    resolutionNote:'must fail',by:'CHATGPT'
  });
  assert.equal(result.pass,false);
  assert.ok(result.errors.some((row)=>row.code==='PENDING_RESOLUTION_TECHNICAL_FACT_UNKNOWN'));
});
