import{auditStandardSizeSourceCoverage}from'./standard-size-source-audit.mjs';
import{MASTER_CHANGE_ALLOWED_COLLECTIONS,createProductMasterChangeProposal}from'./master-change-control.mjs';

MASTER_CHANGE_ALLOWED_COLLECTIONS.add('standardSizeRecords');
MASTER_CHANGE_ALLOWED_COLLECTIONS.add('sizeGlassConditions');

const err=(code,message,details={})=>({code,message,...details});
const clone=(value)=>structuredClone(value);
const numericSuffix=(id,prefix)=>{
  if(typeof id!=='string'||!id.startsWith(prefix))return null;
  const suffix=id.slice(prefix.length);
  return /^\d+$/.test(suffix)?Number(suffix):null;
};
const maxSequence=(records,prefix)=>Math.max(0,...records.map((row)=>numericSuffix(row?.id,prefix)).filter(Number.isInteger));

function validateMissingSourceAttributes(missing){
  const errors=[];
  for(const item of missing){
    const record=item.sourceRecord;
    const a=record?.attributes;
    for(const key of['callW','callH','actualW','actualH','glassSymbol','legendPrintedPage','glassState','windowClass']){
      if(a?.[key]===undefined||a?.[key]===null||a?.[key]==='')errors.push(err('SIZE_GAP_SOURCE_ATTRIBUTE_REQUIRED',`${key} is required for a source-backed size addition`,{recordId:record?.id??null,sizeCode:record?.sizeCode??null,attribute:key}));
    }
  }
  return errors;
}

function buildPageEvidence(sourceRecords,{evidenceIdPrefix}){
  const groups=new Map();
  for(const row of sourceRecords){
    const page=row.source.printedPage;
    if(!groups.has(page))groups.set(page,[]);
    groups.get(page).push(row);
  }
  return[...groups.entries()].sort(([a],[b])=>a-b).map(([printedPage,rows])=>{
    const first=rows[0];
    const codes=rows.map((row)=>row.sizeCode);
    const region=first.source.locatorText.split(' / 呼称 ')[0];
    return{
      schemaVersion:'1.0',id:`${evidenceIdPrefix}-P${printedPage}`,productId:first.productId,
      status:'VERIFIED',strength:'EXPLICIT',title:`公式規格サイズ Evidence p.${printedPage}`,
      subjectField:'size',
      claim:`公式資料 p.${printedPage} の対象規格表に呼称 ${codes.join(', ')} が明示される。`,
      source:{...first.source,locatorText:`${region} / 規格サイズ表`},
      adjudication:{extractedBy:'CHATGPT_DIRECT_PDF',adjudicatedBy:'CHATGPT',status:'ACCEPTED'}
    };
  });
}

function toSizeRecord(sourceRecord,{id,evidenceId}){
  const a=sourceRecord.attributes;
  return{
    id,productId:sourceRecord.productId,windowTypeId:sourceRecord.windowTypeId,
    specificationId:sourceRecord.specificationId??null,construction:sourceRecord.construction,sizeCode:sourceRecord.sizeCode,
    callW:a.callW,callH:a.callH,actualW:a.actualW,actualH:a.actualH,windowClass:a.windowClass,
    selectable:true,status:'ACTIVE',canonicalStatus:'カタログ規格確認済み',
    sourcePrintedPage:sourceRecord.source.printedPage,sourcePdfPage:sourceRecord.source.pdfPage,sourceRow:null,
    sourceFile:sourceRecord.source.title,glassSymbol:a.glassSymbol,legendPrintedPage:a.legendPrintedPage,
    glassLegendKey:`P${a.legendPrintedPage}|${a.glassSymbol}`,glassState:a.glassState,evidenceIds:[evidenceId]
  };
}

function toGlassCondition(sourceRecord,{id,sizeId,evidenceId,sourceUrl}){
  const a=sourceRecord.attributes;
  return{
    id,sizeId,productId:sourceRecord.productId,windowTypeId:sourceRecord.windowTypeId,
    specificationId:sourceRecord.specificationId??null,sizeCode:sourceRecord.sizeCode,selectable:true,
    sourcePrintedPage:sourceRecord.source.printedPage,sourcePdfPage:sourceRecord.source.pdfPage,
    glassSymbol:a.glassSymbol,legendPrintedPage:a.legendPrintedPage,glassLegendKey:`P${a.legendPrintedPage}|${a.glassSymbol}`,
    glassState:a.glassState,sourceFile:sourceRecord.source.title,sourceUrl,evidenceIds:[evidenceId]
  };
}

export function createStandardSizeSourceGapChangeProposal({
  productId,sourceRecords,canonicalRecords,existingSizeGlassConditions=[],sizeIdPrefix,glassConditionIdPrefix,
  evidenceIdPrefix,sourceBatchId,proposalId,proposalCreatedAt,sourceUrl
}={}){
  const auditBefore=auditStandardSizeSourceCoverage({productId,sourceRecords,canonicalRecords});
  if(!auditBefore.pass)return{pass:false,status:'SIZE_GAP_PROPOSAL_REJECTED',auditBefore,errors:auditBefore.errors??[]};
  if(auditBefore.counts.canonicalInactive||auditBefore.counts.extraInCanonical||auditBefore.counts.duplicateCanonicalKeys){
    return{pass:false,status:'SIZE_GAP_PROPOSAL_BLOCKED_NON_ADD_DIFF',auditBefore,errors:[err('SIZE_GAP_NON_ADD_DIFF_PRESENT','Automatic ADD-only proposal requires zero inactive, extra and duplicate canonical rows')]};
  }
  if(auditBefore.counts.missingInCanonical===0)return{pass:true,status:'NO_SIZE_GAP',auditBefore,proposal:null,projectedAudit:auditBefore,errors:[]};
  const attributeErrors=validateMissingSourceAttributes(auditBefore.missing);
  if(attributeErrors.length)return{pass:false,status:'SIZE_GAP_PROPOSAL_REJECTED',auditBefore,errors:attributeErrors};

  const pageEvidence=buildPageEvidence(sourceRecords,{evidenceIdPrefix});
  const pageEvidenceId=new Map(pageEvidence.map((row)=>[row.source.printedPage,row.id]));
  let sizeSeq=maxSequence(canonicalRecords,sizeIdPrefix)+1;
  let glassSeq=maxSequence(existingSizeGlassConditions,glassConditionIdPrefix)+1;
  const sizeRecords=[];
  const glassConditions=[];
  for(const item of auditBefore.missing){
    const src=item.sourceRecord;
    const evidenceId=pageEvidenceId.get(src.source.printedPage);
    const sizeId=`${sizeIdPrefix}${String(sizeSeq++).padStart(6,'0')}`;
    const glassId=`${glassConditionIdPrefix}${String(glassSeq++).padStart(6,'0')}`;
    sizeRecords.push(toSizeRecord(src,{id:sizeId,evidenceId}));
    glassConditions.push(toGlassCondition(src,{id:glassId,sizeId,evidenceId,sourceUrl}));
  }

  const baseMaster={
    productId,standardSizeRecords:clone(canonicalRecords),sizeGlassConditions:clone(existingSizeGlassConditions),evidence:[]
  };
  const changes=[
    ...pageEvidence.map((record)=>({operation:'ADD_RECORD',collection:'evidence',record})),
    ...sizeRecords.map((record)=>({operation:'ADD_RECORD',collection:'standardSizeRecords',record})),
    ...glassConditions.map((record)=>({operation:'ADD_RECORD',collection:'sizeGlassConditions',record}))
  ];
  const proposalResult=createProductMasterChangeProposal({
    id:proposalId,productId,baseMaster,changes,evidenceIds:pageEvidence.map((row)=>row.id),sourceBatchIds:[sourceBatchId],
    openBlockingPending:0,createdBy:'CHATGPT',at:proposalCreatedAt,
    summary:`公式資料で確認済みの規格サイズ ${auditBefore.counts.missingInCanonical} 件を正式Size Masterへ追加し、対応するサイズ別ガラス条件を同時追加する。`
  });
  if(!proposalResult.pass)return{pass:false,status:'SIZE_GAP_PROPOSAL_REJECTED',auditBefore,errors:proposalResult.errors};

  const projectedCanonical=[...canonicalRecords,...sizeRecords];
  const projectedAudit=auditStandardSizeSourceCoverage({productId,sourceRecords,canonicalRecords:projectedCanonical});
  const projectionPass=projectedAudit.pass&&projectedAudit.coveragePass;
  return{
    pass:projectionPass,status:projectionPass?'SIZE_GAP_CHANGE_PROPOSAL_READY':'SIZE_GAP_PROJECTION_FAILED',
    auditBefore,projectedAudit,baseMaster,proposal:proposalResult.proposal,pageEvidence,sizeRecords,glassConditions,
    counts:{evidenceAdditions:pageEvidence.length,sizeAdditions:sizeRecords.length,glassConditionAdditions:glassConditions.length,totalChanges:changes.length},
    approvalRequired:true,formalWorkbookWritePerformed:false,runtimeWritePerformed:false,
    errors:projectionPass?[]:[err('SIZE_GAP_PROJECTED_COVERAGE_FAILED','Projected Product Master does not fully cover the official source slice')]
  };
}
