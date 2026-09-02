import{THERMOSL_SOURCE}from'../../../catalog/modules/thermosl-source.mjs';
import{
  THERMOSL_MANUAL_SHUTTER_STANDARD_SIZE_SOURCE_RECORDS,
  THERMOSL_MANUAL_SHUTTER_STANDARD_SIZE_SOURCE_SCOPE
}from'./manual-shutter-standard-size-evidence.mjs';

export const THERMOSL_PRODUCT_ID='SER-LIX-SAMOSL';
export const THERMOSL_FORMAL_MASTER={
  driveFileId:'17lVzBZ1hp4RVcGv0yNdnrKt25SFO2FhL',
  title:'サーモスL_商品マスター_v0.7_特注寸法発注アプリ投入完成版_QA確定.xlsx',
  version:'v0.7',sheet:'06_サイズ',standardSizeRows:1559,selectableSizeRows:1410
};
export const THERMOSL_PRIMARY_SIZE_SOURCE={
  type:'OFFICIAL_PDF',driveFileId:'1YUN-mtWYs48YBUHJk0C3vJXnhjyZFHyf',
  title:'202604_LIXIL_サーモスＬ_業務用資料集_完成品価格表.pdf',version:'202604'
};

export const THERMOSL_CANONICAL_STANDARD_SIZE_RECORDS=THERMOSL_SOURCE.sizes.map((row)=>({
  id:row.id,productId:THERMOSL_PRODUCT_ID,windowTypeId:row.window,
  specificationId:row.spec&&row.spec!=='*'?row.spec:null,construction:row.construction,
  sizeCode:row.callCode,selectable:Boolean(row.active),
  canonicalStatus:row.state??null,sourcePrintedPage:row.page??null,sourceRow:row.sourceRow??null
}));

export const THERMOSL_PRODUCT_MASTER_WORKFLOW={
  workflowSchemaVersion:'1.0',recordType:'PRODUCT_MASTER_WORKFLOW_PROFILE',productId:THERMOSL_PRODUCT_ID,status:'ACTIVE',
  capabilities:{
    evidenceRoundTrip:false,technicalFacts:false,standardSizeSourceAudit:true,
    formalWorkbookMutation:false,runtimeAutoWrite:false
  },
  formalMaster:THERMOSL_FORMAL_MASTER,
  primaryStandardSizeSource:THERMOSL_PRIMARY_SIZE_SOURCE,
  standardSizeSourceAudit:{
    sourceRecords:THERMOSL_MANUAL_SHUTTER_STANDARD_SIZE_SOURCE_RECORDS,
    canonicalRecords:THERMOSL_CANONICAL_STANDARD_SIZE_RECORDS,
    sourceScope:THERMOSL_MANUAL_SHUTTER_STANDARD_SIZE_SOURCE_SCOPE,
    sourceScopeLabel:'THERMOS_L_SHUTTER_MANUAL_STANDARD__PRINTED_P54_P61'
  }
};
