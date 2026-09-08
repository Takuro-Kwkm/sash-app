import test from'node:test';
import assert from'node:assert/strict';
import{APW430_MODULE}from'../src/catalog/modules/apw430-module.mjs';
import{APW430_SOURCE}from'../src/catalog/modules/apw430-source.mjs';
import{APW430_OFFICIAL_EVIDENCE_POC as POC}from'../src/product-master-core/poc/apw430-official-evidence-poc.mjs';
import{validateProductMasterCore}from'../src/product-master-core/validator.mjs';
import{evaluatePhaseGate}from'../src/product-master-core/gate-engine.mjs';
import{projectRuntimeSelection}from'../src/product-master-core/runtime-projection.mjs';
import{transitionPending}from'../src/product-master-core/pending-lifecycle.mjs';

test('v0.2 official Evidence records validate with exact PDF locators',()=>{
  const report=validateProductMasterCore(POC);
  assert.equal(report.pass,true,JSON.stringify(report.errors));
  assert.equal(report.metrics.evidence,2);
  const taxonomy=POC.evidence.find((row)=>row.id.includes('TAXONOMY'));
  const angle=POC.evidence.find((row)=>row.id.includes('SIZE-ANGLE'));
  assert.deepEqual([taxonomy.source.printedPage,taxonomy.source.pdfPage],[69,71]);
  assert.deepEqual([angle.source.printedPage,angle.source.pdfPage],[70,72]);
  assert.equal(angle.source.driveFileId,'1j9PtW8yoKBZ4Nodm58wU3QtOCvxlEja9');
});

test('v0.2 Gate requires Verified official Evidence for every active Rule',()=>{
  const gate=evaluatePhaseGate(POC);
  assert.equal(gate.status,'PASS');
  assert.equal(gate.criteria.officialEvidenceComplete,true);
  const broken=structuredClone(POC);
  broken.evidence.forEach((row)=>row.status='REJECTED');
  const blocked=evaluatePhaseGate(broken);
  assert.equal(blocked.status,'BLOCKED');
  assert.equal(blocked.criteria.officialEvidenceComplete,false);
  assert.equal(blocked.counts.rulesMissingOfficialEvidence,3);
});

test('all three FIX Product Nodes project to existing formal APW430 size records',()=>{
  for(const [nodeId,windowType]of[
    ['NODE-YKK-APW430-FIX-MADO','SWT-YKK-APW430-FIX-MADO'],
    ['NODE-YKK-APW430-FIX-TR-ZAIRAI','SWT-YKK-APW430-FIX-TR-ZAIRAI'],
    ['NODE-YKK-APW430-FIX-TR-204','SWT-YKK-APW430-FIX-TR-204']
  ]){
    const projected=projectRuntimeSelection(POC,nodeId);
    assert.equal(projected.selection.window_type,windowType);
    assert.equal(projected.selection.size_mode,'STANDARD');
    assert.ok(APW430_MODULE.allowedValues.some((row)=>row.specificationKey==='window_type'&&row.value===windowType));
    assert.ok(APW430_MODULE.standardSizeRecords.some((row)=>row.windowTypeId===windowType));
  }
});

test('terrace FIX Rules preserve angle-attached-only official constraint without inventing Runtime value',()=>{
  const rules=POC.dependencyRules.filter((row)=>row.id.includes('FIX-TR-'));
  assert.equal(rules.length,2);
  for(const rule of rules){
    assert.ok(rule.assertions.some((row)=>row.code==='FRAME_ANGLE_ATTACHED_ONLY'&&row.field==='construction'&&row.predicate==='ANGLE_ATTACHED_ONLY'));
    assert.ok(rule.evidenceIds.includes('EV-YKK-APW430-CAT-202607-FIX-SIZE-ANGLE-P70'));
  }
});

test('source locator mismatch is retained as RESOLVED PENDING with official Evidence trace',()=>{
  const legacyTerrace=APW430_SOURCE.windows.find((row)=>row.id==='SWT-YKK-APW430-FIX-TR-ZAIRAI');
  assert.match(legacyTerrace.source,/P\.71/);
  const issue=POC.pending.find((row)=>row.id==='PEND-YKK-APW430-FIX-SOURCE-LOCATOR');
  assert.equal(issue.status,'RESOLVED');
  assert.deepEqual(issue.resolutionEvidenceIds,['EV-YKK-APW430-CAT-202607-FIX-SIZE-ANGLE-P70']);
  assert.match(issue.resolutionNote,/印刷p\.70 \/ PDF p\.72/);
});

test('PENDING lifecycle enforces investigation and Evidence-backed resolution',()=>{
  const open={id:'PEND-TEST',status:'OPEN',severity:'BLOCKING',question:'test'};
  const investigating=transitionPending(open,'INVESTIGATING',{at:'2026-09-01T00:00:00Z'});
  assert.equal(investigating.status,'INVESTIGATING');
  assert.throws(()=>transitionPending(investigating,'RESOLVED',{resolutionNote:'x'}),/requires resolution Evidence/);
  const resolved=transitionPending(investigating,'RESOLVED',{evidenceIds:['EV-X'],resolutionNote:'resolved',at:'2026-09-01T00:01:00Z'});
  assert.equal(resolved.status,'RESOLVED');
  assert.deepEqual(resolved.resolutionEvidenceIds,['EV-X']);
  assert.throws(()=>transitionPending(resolved,'OPEN'),/Invalid PENDING transition/);
});

test('official PDF Evidence without page locator fails validation',()=>{
  const broken=structuredClone(POC);
  delete broken.evidence[0].source.pdfPage;
  const report=validateProductMasterCore(broken);
  assert.equal(report.pass,false);
  assert.ok(report.errors.some((row)=>row.code==='OFFICIAL_PDF_PAGE_MISSING'));
});
