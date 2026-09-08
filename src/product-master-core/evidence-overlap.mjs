import{evidenceClaimFingerprint}from'./evidence-inbox-store.mjs';

const text=(value)=>String(value??'').normalize('NFKC').trim();
const sourceKey=(source={})=>[source.type,source.driveFileId,source.title,source.version].map(text).join('|');
const shared=(left=[],right=[])=>{
  const rightSet=new Set(right.map(text));
  return left.map(text).filter((value)=>rightSet.has(value));
};

export function inspectCanonicalEvidenceOverlap(candidate,existingCanonicalEvidence=[]){
  const candidateFingerprint=evidenceClaimFingerprint(candidate);
  const exactDuplicates=[];
  const sourceRegionOverlaps=[];
  for(const evidence of existingCanonicalEvidence){
    if(!evidence||text(evidence.productId)!==text(candidate?.productId))continue;
    if(evidenceClaimFingerprint(evidence)===candidateFingerprint){
      exactDuplicates.push({evidenceId:evidence.id,reason:'SEMANTIC_FINGERPRINT_MATCH'});
      continue;
    }
    if(sourceKey(evidence.source)!==sourceKey(candidate?.source))continue;
    const samePrintedPage=Number.isInteger(evidence.source?.printedPage)&&evidence.source.printedPage===candidate?.source?.printedPage;
    const samePdfPage=Number.isInteger(evidence.source?.pdfPage)&&evidence.source.pdfPage===candidate?.source?.pdfPage;
    if(!samePrintedPage&&!samePdfPage)continue;
    const sharedNodeIds=shared(candidate?.productNodeIds??[],evidence.productNodeIds??[]);
    if(sharedNodeIds.length===0)continue;
    sourceRegionOverlaps.push({
      evidenceId:evidence.id,
      samePrintedPage,
      samePdfPage,
      sharedNodeIds,
      subjectFieldMatch:text(evidence.subjectField)===text(candidate?.subjectField),
      existingClaim:evidence.claim
    });
  }
  return{
    candidateId:candidate?.id??null,
    exactDuplicate:exactDuplicates.length>0,
    exactDuplicates,
    sourceRegionOverlap:sourceRegionOverlaps.length>0,
    sourceRegionOverlaps,
    requiresHumanComparison:exactDuplicates.length>0||sourceRegionOverlaps.length>0
  };
}
