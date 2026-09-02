import{createTechnicalFact,validateTechnicalFactRegistry}from'../technical-fact-registry.mjs';

const PRODUCT_ID='SER-YKK-APW430';
const SOURCE={
  type:'OFFICIAL_PDF',
  driveFileId:'1j9PtW8yoKBZ4Nodm58wU3QtOCvxlEja9',
  title:'202607_YKKAP_APW430_商品カタログ.pdf',
  version:'202607',
  printedPage:70,
  pdfPage:72
};

const rows=[
  {
    id:'TF-YKK-APW430-FIX-MADO-ANGLE-DIMENSION-P70',factType:'DIMENSION_FORMULA',productId:PRODUCT_ID,
    title:'FIX窓 窓タイプ アングル付枠 内法寸法式',productNodeIds:['NODE-YKK-APW430-FIX-MADO'],
    applicability:{windowType:'FIX窓 窓タイプ',frame:'アングル付枠'},unit:'mm',
    formula:{w:{base:'sash_w',offsetMm:-60},h:{base:'sash_h',offsetMm:-60}},
    source:{...SOURCE,locatorText:'アングル付枠 窓タイプ'},sourceIssueId:'ISSUE-GEMINI-APW430-FIX-001'
  },
  {
    id:'TF-YKK-APW430-FIX-TR-ZAIRAI-ANGLE-DIMENSION-P70',factType:'DIMENSION_FORMULA',productId:PRODUCT_ID,
    title:'FIX窓 テラスタイプ 在来工法 アングル付枠 内法寸法式',productNodeIds:['NODE-YKK-APW430-FIX-TR-ZAIRAI'],
    applicability:{windowType:'FIX窓 テラスタイプ',construction:'在来工法',frame:'アングル付枠'},unit:'mm',
    formula:{w:{base:'sash_w',offsetMm:-60},h:{base:'sash_h',offsetMm:-30}},
    source:{...SOURCE,locatorText:'アングル付枠 テラスタイプ 在来工法'},sourceIssueId:'ISSUE-GEMINI-APW430-FIX-002'
  },
  {
    id:'TF-YKK-APW430-FIX-TR-204-ANGLE-DIMENSION-P70',factType:'DIMENSION_FORMULA',productId:PRODUCT_ID,
    title:'FIX窓 テラスタイプ 2×4工法 アングル付枠 内法寸法式',productNodeIds:['NODE-YKK-APW430-FIX-TR-204'],
    applicability:{windowType:'FIX窓 テラスタイプ',construction:'2×4工法',frame:'アングル付枠'},unit:'mm',
    formula:{w:{base:'sash_w',offsetMm:-60},h:{base:'sash_h',offsetMm:-45}},
    source:{...SOURCE,locatorText:'アングル付枠 テラスタイプ 2×4工法'},sourceIssueId:'ISSUE-GEMINI-APW430-FIX-003'
  },
  {
    id:'TF-YKK-APW430-FIX-MADO-NOANGLE-DIMENSION-P70',factType:'DIMENSION_FORMULA',productId:PRODUCT_ID,
    title:'FIX窓 窓タイプ アングル無枠 内法寸法式',productNodeIds:['NODE-YKK-APW430-FIX-MADO'],
    applicability:{windowType:'FIX窓 窓タイプ',frame:'アングル無枠'},unit:'mm',
    formula:{w:{base:'sash_w',offsetMm:-40},h:{base:'sash_h',offsetMm:-70}},
    source:{...SOURCE,locatorText:'アングル無枠 窓タイプ'},sourceIssueId:'ISSUE-GEMINI-APW430-FIX-004'
  }
];

export const APW430_TECHNICAL_FACTS=rows.map((row)=>{
  const created=createTechnicalFact(row);
  if(!created.pass)throw new Error(JSON.stringify(created.errors));
  return created.fact;
});

const validation=validateTechnicalFactRegistry(APW430_TECHNICAL_FACTS);
if(!validation.pass)throw new Error(JSON.stringify(validation.errors));
