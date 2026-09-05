import{APW430_MODULE}from'../src/catalog/modules/apw430-module.mjs';
import{APW430_OFFICIAL_EVIDENCE_POC as POC}from'../src/product-master-core/poc/apw430-official-evidence-poc.mjs';
import{validateProductMasterCore}from'../src/product-master-core/validator.mjs';
import{evaluatePhaseGate}from'../src/product-master-core/gate-engine.mjs';
import{projectRuntimeSelection}from'../src/product-master-core/runtime-projection.mjs';

const validation=validateProductMasterCore(POC);
const gate=evaluatePhaseGate(POC);
const projections=POC.productNodes.filter((row)=>row.nodeType==='WINDOW_TYPE').map((node)=>{
  const projected=projectRuntimeSelection(POC,node.id);
  return{nodeId:node.id,selection:projected.selection,assertions:POC.dependencyRules.find((row)=>row.when?.productNodeId===node.id)?.assertions??[],reachableSizes:APW430_MODULE.standardSizeRecords.filter((row)=>row.windowTypeId===projected.selection.window_type).length};
});
const evidence=POC.evidence.map((row)=>({id:row.id,status:row.status,strength:row.strength,sourceType:row.source.type,driveFileId:row.source.driveFileId,printedPage:row.source.printedPage,pdfPage:row.source.pdfPage,claim:row.claim}));
console.log(JSON.stringify({coreVersion:POC.coreVersion,product:POC.product,validation,gate,evidence,pending:POC.pending,projections},null,2));
if(!validation.pass||!gate.pass||projections.some((row)=>row.reachableSizes===0))process.exitCode=1;
