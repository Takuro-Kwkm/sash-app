import test from'node:test';
import assert from'node:assert/strict';
import{APW430_MODULE}from'../src/catalog/modules/apw430-module.mjs';
import{APW430_CORE_POC}from'../src/product-master-core/poc/apw430-core-poc.mjs';
import{validateProductMasterCore}from'../src/product-master-core/validator.mjs';
import{evaluatePhaseGate}from'../src/product-master-core/gate-engine.mjs';
import{projectRuntimeSelection}from'../src/product-master-core/runtime-projection.mjs';

test('Product Master Core PoC validates APW430 vertical slice',()=>{
  const report=validateProductMasterCore(APW430_CORE_POC);
  assert.equal(report.pass,true,JSON.stringify(report.errors));
  assert.equal(report.metrics.productNodes,3);
  assert.equal(report.metrics.dependencyRules,2);
});

test('experimental Gate passes only when machine criteria pass',()=>{
  const gate=evaluatePhaseGate(APW430_CORE_POC);
  assert.equal(gate.status,'PASS');
  assert.deepEqual(gate.criteria,{validationPass:true,phasePresent:true,blockingPendingZero:true,evidenceConflictZero:true});
});

test('Core Product Node projects to existing APW430 Runtime selection',()=>{
  for(const [nodeId,windowType]of[
    ['NODE-YKK-APW430-TATE-GREMON-SINGLE','SWT-YKK-APW430-TATE-GREMON-SINGLE'],
    ['NODE-YKK-APW430-FIX-MADO','SWT-YKK-APW430-FIX-MADO']
  ]){
    const projected=projectRuntimeSelection(APW430_CORE_POC,nodeId);
    assert.equal(projected.selection.window_type,windowType);
    assert.equal(projected.selection.size_mode,'STANDARD');
    assert.ok(APW430_MODULE.allowedValues.some((row)=>row.specificationKey==='window_type'&&row.value===windowType));
    assert.ok(APW430_MODULE.standardSizeRecords.some((row)=>row.windowTypeId===windowType));
  }
});

test('open BLOCKING PENDING mechanically blocks Gate',()=>{
  const broken=structuredClone(APW430_CORE_POC);
  broken.pending.push({id:'PEND-POC-BLOCK',status:'OPEN',severity:'BLOCKING',field:'size',productNodeId:'NODE-YKK-APW430-FIX-MADO',question:'PoC blocking example'});
  const gate=evaluatePhaseGate(broken);
  assert.equal(gate.status,'BLOCKED');
  assert.equal(gate.counts.openBlockingPending,1);
});

test('unknown Canonical Field and broken Evidence link fail validation',()=>{
  const broken=structuredClone(APW430_CORE_POC);
  broken.fields.push('glass_kind_typo');
  broken.dependencyRules[0].evidenceIds=['EV-DOES-NOT-EXIST'];
  const report=validateProductMasterCore(broken);
  assert.equal(report.pass,false);
  assert.ok(report.errors.some((row)=>row.code==='UNKNOWN_CANONICAL_FIELD'));
  assert.ok(report.errors.some((row)=>row.code==='BROKEN_EVIDENCE_LINK'));
});
