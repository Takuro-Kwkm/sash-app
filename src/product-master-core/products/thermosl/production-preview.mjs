import{sha256}from'../../master-change-control.mjs';

const hash=(value)=>`sha256:${sha256(value)}`;
const windowNameMap=new Map([
  ['WT-SL-SHUTTER-HIKI','シャッター付引違い窓']
]);

function sizeRow(record){
  return[
    record.id,'SER-LIX-SAMOSL',record.windowTypeId,windowNameMap.get(record.windowTypeId)??'',record.specificationId??'',
    record.construction,record.sizeCode,record.callW,record.callH,record.actualW,record.actualH,record.windowClass,true,
    record.canonicalStatus,record.sourcePdfPage,record.sourcePrintedPage,record.sourceFile,
    `v1.7公式Source gap補完。完成品価格表 P${record.sourcePrintedPage}。`,record.glassSymbol,record.legendPrintedPage,
    record.glassLegendKey,record.glassState
  ];
}
function glassRow(record){
  return[
    record.id,record.sizeId,record.windowTypeId,record.specificationId??'',record.sizeCode,true,record.sourcePrintedPage,
    record.glassSymbol,record.legendPrintedPage,record.glassLegendKey,record.glassState,record.sourceFile,
    'v1.7：公式Source gap補完。',record.sourceUrl
  ];
}

export function buildThermosLProductionPreview({snapshot,proposalBuild,approval,stagingResultFingerprint}={}){
  if(!snapshot||snapshot.productId!=='SER-LIX-SAMOSL')throw new Error('Invalid Thermos L formal snapshot');
  if(!proposalBuild?.pass||!proposalBuild.proposal)throw new Error('Valid staged Proposal build is required');
  const proposal=proposalBuild.proposal;
  if(approval?.proposalId!==proposal.id||approval?.approverType!=='HUMAN'||approval?.scope!=='APPROVE_AND_STAGE_ONLY')throw new Error('Exact human STAGING approval is required');
  if(approval.proposalFingerprint!==proposal.proposalFingerprint)throw new Error('Proposal fingerprint drift before production preview');
  if(approval.baseMasterFingerprint!==proposal.target.baseMasterFingerprint)throw new Error('Base Master fingerprint drift before production preview');
  if(proposalBuild.sizeRecords.length!==85||proposalBuild.glassConditions.length!==85)throw new Error('Expected 85 Size and 85 glass-condition additions');

  const sizeRows=proposalBuild.sizeRecords.map(sizeRow);
  const glassRows=proposalBuild.glassConditions.map(glassRow);
  const sizeSheet=snapshot.sheets['06_サイズ'];
  const glassSheet=snapshot.sheets['08A_サイズ別ガラス条件'];
  if(sizeSheet.dataRows!==1559||sizeSheet.lastRecordId!=='SZ-SL-001559'||glassSheet.dataRows!==1559||glassSheet.lastRecordId!=='GSC-SL-001559')throw new Error('Formal workbook tail drift');
  const sizeEnd=sizeSheet.nextExcelRow+sizeRows.length-1;
  const glassEnd=glassSheet.nextExcelRow+glassRows.length-1;
  const writes=[
    {
      operation:'APPEND_ROWS',sheet:'06_サイズ',range:`A${sizeSheet.nextExcelRow}:V${sizeEnd}`,
      existingDataRows:1559,addRows:85,resultDataRows:1644,columns:22,
      expectedTailBefore:'SZ-SL-001559',expectedTailAfter:'SZ-SL-001644',rows:sizeRows
    },
    {
      operation:'APPEND_ROWS',sheet:'08A_サイズ別ガラス条件',range:`A${glassSheet.nextExcelRow}:N${glassEnd}`,
      existingDataRows:1559,addRows:85,resultDataRows:1644,columns:14,
      expectedTailBefore:'GSC-SL-001559',expectedTailAfter:'GSC-SL-001644',rows:glassRows
    }
  ];
  const preview={
    previewSchemaVersion:'1.0',recordType:'PRODUCT_MASTER_PRODUCTION_PREVIEW',status:'PRODUCTION_WRITE_PREVIEW_READY',
    productId:'SER-LIX-SAMOSL',proposalId:proposal.id,proposalFingerprint:proposal.proposalFingerprint,
    approvedStagingResultFingerprint:stagingResultFingerprint,
    formalTarget:{...snapshot.driveFile,expectedRevisionId:snapshot.driveFile.revisionId},
    writePlan:{writes,formalWorkbookRowAdditions:170,controlPlaneEvidenceAdditions:8,runtimeChanges:0},
    projectedInventory:{standardSizeRows:1644,selectableSizeRows:1495,sizeGlassConditionRows:1644},
    productionApproval:{required:true,status:'PENDING',scopeRequired:'APPROVE_PRODUCTION_WRITE_ONLY'},
    safety:{backupRequired:true,revisionRecheckRequired:true,tailRecheckRequired:true,atomicWorkbookReplacementOrEquivalentRequired:true,postWriteReadbackRequired:true,runtimeRegenerationDeferred:true},
    formalWorkbookWritePerformed:false,runtimeWritePerformed:false
  };
  return{...preview,previewFingerprint:hash(preview)};
}
