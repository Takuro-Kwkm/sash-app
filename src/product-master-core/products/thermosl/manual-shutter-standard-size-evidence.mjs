const PRODUCT_ID='SER-LIX-SAMOSL';
const WINDOW_TYPE_ID='WT-SL-SHUTTER-HIKI';
const SPECIFICATION_ID='SP-SL-SHUT-M-STD';
const SOURCE_BASE={
  type:'OFFICIAL_PDF',driveFileId:'1YUN-mtWYs48YBUHJk0C3vJXnhjyZFHyf',
  title:'202604_LIXIL_サーモスＬ_業務用資料集_完成品価格表.pdf',version:'202604'
};

const code=(width,height)=>{
  if(!width.includes('-'))return`${width}${height}`;
  const [base,suffix]=width.split('-');
  return`${base}${height}-${suffix}`;
};
const cross=(widths,heights)=>heights.flatMap((height)=>widths.map((width)=>code(width,height)));
const groups=[
  {printedPage:54,pdfPage:56,construction:'在来・204',section:'手動（在来・204）マド①',codes:cross(['114','119','128','133'],['09','11','13'])},
  {printedPage:55,pdfPage:57,construction:'在来・204',section:'手動（在来・204）マド① 続き',codes:['16507',...cross(['150','160','165','174','176'],['09','11','13']),...cross(['150','160','165'],['15'])]},
  {printedPage:56,pdfPage:58,construction:'在来・204',section:'手動（在来・204）マド②',codes:cross(['178','180','183','186'],['09','11','13'])},
  {printedPage:57,pdfPage:59,construction:'在来・204',section:'手動（在来・204）マド② 続き',codes:cross(['251-2','251-4','256-2','256-4'],['11','13'])},
  {printedPage:58,pdfPage:60,construction:'在来',section:'手動（在来）テラス①',codes:[...cross(['119','133','150','160'],['18','20']),...cross(['150','160'],['22'])]},
  {printedPage:59,pdfPage:61,construction:'在来',section:'手動（在来）テラス① 続き',codes:cross(['165','174','176','178'],['18','20','22'])},
  {printedPage:60,pdfPage:62,construction:'在来',section:'手動（在来）テラス②',codes:cross(['180','183','186','251-2'],['18','20','22'])},
  {printedPage:61,pdfPage:63,construction:'在来',section:'手動（在来）テラス② 続き',codes:cross(['251-4','256-2','256-4','347'],['18','20','22'])}
];

export const THERMOSL_MANUAL_SHUTTER_STANDARD_SIZE_SOURCE_RECORDS=groups.flatMap((group)=>group.codes.map((sizeCode)=>({
  schemaVersion:'1.0',recordType:'STANDARD_SIZE_SOURCE_RECORD',
  id:`SSR-LIX-SAMOSL-SHUT-MSTD-P${group.printedPage}-${sizeCode.replaceAll('-','_')}`,
  productId:PRODUCT_ID,windowTypeId:WINDOW_TYPE_ID,specificationId:SPECIFICATION_ID,
  construction:group.construction,sizeCode,availability:'AVAILABLE',strength:'EXPLICIT',
  source:{...SOURCE_BASE,printedPage:group.printedPage,pdfPage:group.pdfPage,locatorText:`${group.section} / 呼称 ${sizeCode} / 標準タイプ価格掲載`}
})));

export const THERMOSL_MANUAL_SHUTTER_STANDARD_SIZE_SOURCE_SCOPE={
  productId:PRODUCT_ID,windowTypeId:WINDOW_TYPE_ID,specificationId:SPECIFICATION_ID,
  constructions:['在来・204','在来'],printedPages:[54,55,56,57,58,59,60,61],pdfPages:[56,57,58,59,60,61,62,63]
};
