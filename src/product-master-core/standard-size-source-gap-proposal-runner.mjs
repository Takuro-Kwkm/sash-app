import fs from'node:fs';
import path from'node:path';
import{createStandardSizeSourceGapChangeProposal}from'./standard-size-source-gap-proposal.mjs';

const writeJson=(filePath,value)=>{
  fs.mkdirSync(path.dirname(filePath),{recursive:true});
  fs.writeFileSync(filePath,`${JSON.stringify(value,null,2)}\n`,'utf8');
};

export function runStandardSizeSourceGapProposalWorkflow({
  artifactDir,productId,sourceRecords,canonicalRecords,existingSizeGlassConditions=[],config={},reportVersion='1.6'
}={}){
  const resolvedArtifactDir=path.resolve(artifactDir);
  const result=createStandardSizeSourceGapChangeProposal({
    productId,sourceRecords,canonicalRecords,existingSizeGlassConditions,
    sizeIdPrefix:config.sizeIdPrefix,glassConditionIdPrefix:config.glassConditionIdPrefix,
    evidenceIdPrefix:config.evidenceIdPrefix,sourceBatchId:config.sourceBatchId,
    proposalId:config.proposalId,proposalCreatedAt:config.proposalCreatedAt,sourceUrl:config.sourceUrl
  });
  const report={
    reportVersion,status:result.pass?'SIZE_GAP_PROPOSAL_READY':'SIZE_GAP_PROPOSAL_FAILED',productId,
    currentCoverage:result.auditBefore?.counts??null,
    projectedCoverage:result.projectedAudit?.counts??null,
    additions:result.counts??null,
    proposal:result.proposal?{
      id:result.proposal.id,status:result.proposal.status,proposalFingerprint:result.proposal.proposalFingerprint,
      approvalPolicy:result.proposal.approvalPolicy,riskLevel:result.proposal.riskLevel,
      baseMasterFingerprint:result.proposal.target?.baseMasterFingerprint??null
    }:null,
    gates:{
      DIRECT_OFFICIAL_SOURCE_RECORDS:sourceRecords?.length===97?'PASS':'FAIL',
      CURRENT_SOURCE_GAP:result.auditBefore?.counts?.missingInCanonical===85?'PASS':'FAIL',
      PROJECTED_OFFICIAL_SOURCE_SIZE_COVERAGE:result.projectedAudit?.coveragePass?'PASS':'FAIL',
      HUMAN_APPROVAL_REQUIRED:result.proposal?.approvalPolicy==='HUMAN_REQUIRED'?'PASS':'FAIL',
      FORMAL_WORKBOOK_AUTO_WRITE:result.formalWorkbookWritePerformed===false?'PASS':'FAIL',
      RUNTIME_AUTO_WRITE:result.runtimeWritePerformed===false?'PASS':'FAIL'
    },
    formalWorkbookWritePerformed:result.formalWorkbookWritePerformed??false,
    runtimeWritePerformed:result.runtimeWritePerformed??false,
    errors:result.errors??[]
  };
  const gatePass=result.pass&&Object.values(report.gates).every((value)=>value==='PASS');
  report.gate=gatePass?'PASS':'FAIL';
  writeJson(path.join(resolvedArtifactDir,'report.json'),report);
  if(result.proposal)writeJson(path.join(resolvedArtifactDir,'proposal.json'),result.proposal);
  if(result.baseMaster)writeJson(path.join(resolvedArtifactDir,'base-master.json'),result.baseMaster);
  if(result.sizeRecords)writeJson(path.join(resolvedArtifactDir,'proposed-size-records.json'),result.sizeRecords);
  if(result.glassConditions)writeJson(path.join(resolvedArtifactDir,'proposed-size-glass-conditions.json'),result.glassConditions);
  if(result.pageEvidence)writeJson(path.join(resolvedArtifactDir,'verified-page-evidence.json'),result.pageEvidence);
  return{...result,pass:gatePass,artifactDir:resolvedArtifactDir,report};
}
