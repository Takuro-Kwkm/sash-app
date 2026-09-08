import fs from'node:fs';
import path from'node:path';
import{auditStandardSizeSourceCoverage}from'./standard-size-source-audit.mjs';

export function runStandardSizeSourceAuditWorkflow({
  artifactDir,productId,sourceRecords,canonicalRecords,reportVersion='1.5',sourceScopeLabel='STANDARD_SIZE_SOURCE_SCOPE'
}={}){
  if(!artifactDir)throw new Error('artifactDir is required');
  if(!productId)throw new Error('productId is required');
  const absoluteArtifactDir=path.resolve(artifactDir);
  fs.mkdirSync(absoluteArtifactDir,{recursive:true});
  const audit=auditStandardSizeSourceCoverage({productId,sourceRecords,canonicalRecords});
  if(!audit.pass)throw new Error(`Standard-size source audit rejected: ${JSON.stringify(audit.errors)}`);
  const report={
    reportVersion,
    status:audit.status,
    productId,
    sourceScopeLabel,
    officialSourceAvailable:audit.counts.officialAvailable,
    canonicalMatch:audit.counts.match,
    missingInCanonical:audit.counts.missingInCanonical,
    canonicalInactive:audit.counts.canonicalInactive,
    extraInCanonical:audit.counts.extraInCanonical,
    duplicateCanonicalKeys:audit.counts.duplicateCanonicalKeys,
    canonicalInCoveredScope:audit.counts.canonicalInCoveredScope,
    coveragePass:audit.coveragePass,
    formalWorkbookWritePerformed:false,
    runtimeWritePerformed:false,
    autoMutationPerformed:false,
    coveredScopes:audit.coveredScopes,
    missing:audit.missing.map((row)=>({
      sourceRecordId:row.sourceRecord.id,
      windowTypeId:row.sourceRecord.windowTypeId,
      specificationId:row.sourceRecord.specificationId??null,
      construction:row.sourceRecord.construction,
      sizeCode:row.sourceRecord.sizeCode,
      source:row.sourceRecord.source
    })),
    inactive:audit.inactive.map((row)=>({
      sourceRecordId:row.sourceRecord.id,sizeCode:row.sourceRecord.sizeCode,
      canonicalRecordIds:row.canonicalRecords.map((item)=>item.id??null),source:row.sourceRecord.source
    })),
    extras:audit.extras.map((row)=>({
      canonicalRecordId:row.canonicalRecord.id??null,sizeCode:row.canonicalRecord.sizeCode,
      windowTypeId:row.canonicalRecord.windowTypeId,specificationId:row.canonicalRecord.specificationId??null,
      construction:row.canonicalRecord.construction
    })),
    gates:{...audit.gates,FORMAL_WORKBOOK_AUTO_WRITE:'0',RUNTIME_AUTO_WRITE:'0'}
  };
  fs.writeFileSync(path.join(absoluteArtifactDir,'standard-size-source-records.json'),`${JSON.stringify(sourceRecords,null,2)}\n`,'utf8');
  fs.writeFileSync(path.join(absoluteArtifactDir,'standard-size-source-audit-report.json'),`${JSON.stringify(report,null,2)}\n`,'utf8');
  return{pass:true,coveragePass:audit.coveragePass,artifactDir:absoluteArtifactDir,report,audit};
}
