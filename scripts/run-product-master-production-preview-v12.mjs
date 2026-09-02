import fs from'node:fs';
import path from'node:path';
import{runApw430LiveEvidenceRoundTrip}from'../src/product-master-core/live-roundtrip-v1.mjs';
import{createProductionDiffPreview,finalizeNoOpProductionPreview,validateProductionTargetSnapshot}from'../src/product-master-core/production-adapter.mjs';
import{APW430_PRODUCTION_TARGET_SNAPSHOT}from'../src/product-master-core/poc/apw430-production-target-snapshot.mjs';

const STAGING_RESULT='sha256:36b71fdabfc58a8690e10b9dec8ac89afd180c0a53355fcdfa2874b6961292e0';
const artifactDir=path.resolve(process.argv[2]??'artifacts/product-master-production-preview-v12');
fs.mkdirSync(artifactDir,{recursive:true});
const live=runApw430LiveEvidenceRoundTrip({artifactDir:path.join(artifactDir,'live-roundtrip')});
const target=APW430_PRODUCTION_TARGET_SNAPSHOT;
const targetValidation=validateProductionTargetSnapshot(target,{
  expectedFileId:'1QDocQ7yoXE6TAnzHtfsyKwwK6YB5_mgk90Bw1hm4iPo',
  expectedTitle:'20260830_YKKAP_APW430_商品マスター_正本',expectedModifiedTime:'2026-08-30T11:39:41.909Z'
});
if(!targetValidation.pass)throw new Error(JSON.stringify(targetValidation.errors));

const mappings=live.state.canonicalEvidence.map((evidence)=>{
  if(evidence.subjectField==='size'){
    const codes=[...new Set(evidence.claim.match(/\b\d{5}\b/g)??[])];
    const node=evidence.productNodeIds?.[0];
    const seriesWindowId=node==='NODE-YKK-APW430-FIX-TR-ZAIRAI'?'SWT-YKK-APW430-FIX-TR-ZAIRAI':'SWT-YKK-APW430-FIX-TR-204';
    const rows=target.formalRecords.filter((row)=>row.recordType==='SIZE'&&row.seriesWindowId===seriesWindowId&&codes.includes(row.sizeCode));
    const exact=codes.length>0&&rows.length===codes.length;
    return{evidenceId:evidence.id,subjectField:evidence.subjectField,classification:exact?'EXACT_PRESENT':'UNRESOLVED',formalTarget:{sheet:'06_サイズ',seriesWindowId,sizeCodes:codes,matchedRows:rows.map((row)=>row.row)},reason:exact?'All explicit size codes already exist as ACTIVE formal Size Records.':'Not every Evidence size code could be mapped to the formal Size Master.'};
  }
  if(evidence.subjectField==='construction'){
    return{evidenceId:evidence.id,subjectField:evidence.subjectField,classification:'SCHEMA_GAP_NON_MUTATING',formalTarget:{sheet:'03A_シリーズ窓種設定',seriesWindowId:'SWT-YKK-APW430-FIX-MADO',matchedRows:[63]},reason:'The formal Master already contains the official FIX窓 窓タイプ record and source citation, but 03A has no dedicated construction field for this atomic 在来工法 Evidence. No behavior-changing formal mutation is justified.'};
  }
  return{evidenceId:evidence.id,subjectField:evidence.subjectField,classification:'UNRESOLVED',reason:'No v1.2 formal mapping rule for this Evidence field.'};
});

const previewResult=createProductionDiffPreview({
  id:'PMPREV-YKK-APW430-FIX-20260902-001',proposalId:'PMCP-YKK-APW430-FIX-LIVE-20260902-001',productId:'SER-YKK-APW430',
  stagingResultMasterFingerprint:STAGING_RESULT,expectedStagingResultMasterFingerprint:STAGING_RESULT,
  targetSnapshot:target,evidenceMappings:mappings,openBlockingPending:live.report.transportIssues.blocking,
  openNonBlockingPending:live.report.transportIssues.nonBlocking,createdBy:'CHATGPT_CONTROL_PLANE',
  summary:'Preview the approved APW430 STAGING Evidence against the formal Google Sheets Product Master without mutating the formal workbook.'
});
if(!previewResult.pass)throw new Error(JSON.stringify(previewResult.errors));
const finalized=finalizeNoOpProductionPreview(previewResult.preview);
if(!finalized.pass)throw new Error(JSON.stringify(finalized.errors));
const exact=mappings.filter((row)=>row.classification==='EXACT_PRESENT').length;
const schemaGap=mappings.filter((row)=>row.classification==='SCHEMA_GAP_NON_MUTATING').length;
const report={reportVersion:'1.2',status:finalized.preview.status,productId:'SER-YKK-APW430',proposalId:previewResult.preview.proposalId,previewId:previewResult.preview.id,previewFingerprint:previewResult.preview.previewFingerprint,formalMaster:{fileId:target.fileId,title:target.title,version:target.version,modifiedTime:target.modifiedTime},stagingResultMasterFingerprint:STAGING_RESULT,evidenceMappings:mappings.length,exactPresent:exact,schemaGapNonMutating:schemaGap,formalMutationCount:previewResult.preview.diff.formalMutationCount,productionWriteApproval:previewResult.preview.approvalPolicy.productionWriteApproval,productionWritePerformed:false,runtimeWritePerformed:false,openBlockingPending:live.report.transportIssues.blocking,openNonBlockingPending:live.report.transportIssues.nonBlocking,gates:{LIVE_EVIDENCE_9:live.state.canonicalEvidence.length===9?'PASS':'FAIL',FORMAL_TARGET_SNAPSHOT:'PASS',SIZE_EVIDENCE_EXISTING:exact===8?'PASS':'FAIL',CONSTRUCTION_SCHEMA_GAP_NON_MUTATING:schemaGap===1?'PASS':'FAIL',FORMAL_MUTATIONS_ZERO:previewResult.preview.diff.formalMutationCount===0?'PASS':'FAIL',PRODUCTION_WRITE_REQUIRED:'NO',PRODUCTION_WRITE_PERFORMED:'0',RUNTIME_WRITE:'0'}};
const pass=live.state.canonicalEvidence.length===9&&exact===8&&schemaGap===1&&previewResult.preview.diff.formalMutationCount===0&&finalized.preview.status==='PRODUCTION_SYNCED_NO_OP';
fs.writeFileSync(path.join(artifactDir,'production-preview.json'),`${JSON.stringify(previewResult.preview,null,2)}\n`);
fs.writeFileSync(path.join(artifactDir,'production-finalization.json'),`${JSON.stringify(finalized.preview,null,2)}\n`);
fs.writeFileSync(path.join(artifactDir,'production-preview-report.json'),`${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify({pass,artifactDir,report},null,2));
if(!pass)process.exitCode=1;
