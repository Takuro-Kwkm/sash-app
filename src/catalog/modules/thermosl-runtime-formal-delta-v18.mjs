// Generated adapter from the formally approved Thermos L Product Master delta.
// Source facts remain the explicit official-PDF records; do not hand-edit individual size facts here.
import{THERMOSL_MANUAL_SHUTTER_STANDARD_SIZE_SOURCE_RECORDS as OFFICIAL_ROWS}from'../../product-master-core/products/thermosl/manual-shutter-standard-size-evidence.mjs';

const EXISTING_KEYS=new Set([
  '在来・204|17809','在来・204|17811','在来・204|17813',
  '在来・204|18309','在来・204|18311','在来・204|18313',
  '在来|17818','在来|17820','在来|17822',
  '在来|18318','在来|18320','在来|18322'
]);
const SOURCE_FILE='202604_LIXIL_サーモスＬ_業務用資料集_完成品価格表.pdf';
const missing=OFFICIAL_ROWS.filter((row)=>!EXISTING_KEYS.has(`${row.construction}|${row.sizeCode}`));
if(OFFICIAL_ROWS.length!==97||missing.length!==85)throw new Error('Thermos L v1.8 formal delta source coverage drift');

export const THERMOSL_RUNTIME_FORMAL_DELTA_V18={
  schemaVersion:'1.0',recordType:'THERMOSL_RUNTIME_FORMAL_MASTER_DELTA',productId:'SER-LIX-SAMOSL',
  formalMaster:{
    driveFileId:'17lVzBZ1hp4RVcGv0yNdnrKt25SFO2FhL',
    revisionId:'0B1PsqngSohhlRDByanJSNkxtSlpqdVo0WXBRT01MNDIzM2tNPQ',
    modifiedTime:'2026-09-02T12:17:29.703Z',sizeBytes:678729,
    sha256:'664a51bd5b9ded22e19780b1ce339338cba45f292438221b0a60fc3974e1abf9'
  },
  expectedBefore:{masterSizeRows:1559,selectableSizeRows:1410},
  expectedAfter:{masterSizeRows:1644,selectableSizeRows:1495},
  sizes:missing.map((row,index)=>({
    id:`SZ-SL-${String(1560+index).padStart(6,'0')}`,
    window:row.windowTypeId,spec:row.specificationId,construction:row.construction,
    callCode:row.sizeCode,callW:row.attributes.callW,callH:row.attributes.callH,
    actualW:row.attributes.actualW,actualH:row.attributes.actualH,windowClass:row.attributes.windowClass,
    active:true,state:'カタログ規格確認済み',page:row.source.printedPage,pdfPage:row.source.pdfPage,
    sourceRow:1563+index,sourceFile:SOURCE_FILE,note:`v1.8 formal Master runtime regeneration. P${row.source.printedPage}.`,
    glassSymbol:row.attributes.glassSymbol,legendPage:row.attributes.legendPrintedPage,
    glassLegendKey:`P${row.attributes.legendPrintedPage}|${row.attributes.glassSymbol}`,
    glassState:row.attributes.glassState
  }))
};
