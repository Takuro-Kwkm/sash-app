import{APW430_MODULE}from'../src/catalog/modules/apw430-module.mjs';
import{APW430_CORE_POC}from'../src/product-master-core/poc/apw430-core-poc.mjs';
import{validateProductMasterCore}from'../src/product-master-core/validator.mjs';
import{evaluatePhaseGate}from'../src/product-master-core/gate-engine.mjs';
import{projectRuntimeSelection}from'../src/product-master-core/runtime-projection.mjs';

const validation=validateProductMasterCore(APW430_CORE_POC);
const gate=evaluatePhaseGate(APW430_CORE_POC);
const projections=['NODE-YKK-APW430-TATE-GREMON-SINGLE','NODE-YKK-APW430-FIX-MADO'].map((nodeId)=>{
  const projected=projectRuntimeSelection(APW430_CORE_POC,nodeId);
  const reachableSizes=APW430_MODULE.standardSizeRecords.filter((row)=>row.windowTypeId===projected.selection.window_type).length;
  return{nodeId,selection:projected.selection,reachableSizes,trace:projected.trace};
});
console.log(JSON.stringify({coreVersion:APW430_CORE_POC.coreVersion,product:APW430_CORE_POC.product,validation,gate,projections},null,2));
if(!validation.pass||!gate.pass||projections.some((row)=>row.reachableSizes===0))process.exitCode=1;
