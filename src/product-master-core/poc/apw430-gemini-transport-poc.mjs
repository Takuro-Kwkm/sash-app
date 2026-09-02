import{APW430_GEMINI_INBOX_POC}from'./apw430-gemini-inbox-poc.mjs';
import{importGeminiTransport}from'../gemini-transport.mjs';

const SOURCE={type:'OFFICIAL_PDF',driveFileId:'1j9PtW8yoKBZ4Nodm58wU3QtOCvxlEja9',title:'202607_YKKAP_APW430_商品カタログ.pdf',version:'202607'};

export const APW430_GEMINI_TRANSPORT_FIXTURE={
  transportSchemaVersion:'1.0',transportType:'EVIDENCE_CANDIDATE_BATCH',batchId:'BATCH-SIM-APW430-FIX-001',generatedAt:'2026-09-02T01:20:00Z',
  producer:{system:'GEMINI_NOTEBOOKLM',mode:'SIMULATED_FIXTURE'},productId:'SER-YKK-APW430',sourceContext:SOURCE,
  candidates:[
    {
      recordType:'EVIDENCE_CANDIDATE',candidateSchemaVersion:'1.0',id:'CAND-GEMINI-TRANSPORT-APW430-001',sourceSystem:'GEMINI_NOTEBOOKLM',producerMode:'SIMULATED_FIXTURE',status:'SUBMITTED',
      productId:'SER-YKK-APW430',title:'APW430 FIX窓 テラスタイプ枠条件',subjectField:'construction',
      claim:'FIX窓のテラスタイプはアングル付枠のみの設定となる。',proposedStrength:'EXPLICIT',
      productNodeIds:['NODE-YKK-APW430-FIX-TR-ZAIRAI','NODE-YKK-APW430-FIX-TR-204'],
      source:{...SOURCE,printedPage:70,pdfPage:72,locatorText:'規格サイズ一覧 / テラスタイプはアングル付枠のみの設定となります。'}
    }
  ],
  issues:[
    {
      id:'ISSUE-GEMINI-TRANSPORT-APW430-001',type:'CLAIM_TOO_BROAD',subjectField:'size',
      question:'H24の表記をFIX窓全仕様・全Wへ一般化してよいかは、この抽出単位だけでは確定できない。',
      sourceHint:{printedPage:70,pdfPage:72,locatorText:'FIX窓 規格サイズ一覧'}
    }
  ]
};

const knownFields=new Set(APW430_GEMINI_INBOX_POC.acceptedMaster.fields);
const nodeIds=new Set(APW430_GEMINI_INBOX_POC.acceptedMaster.productNodes.map((row)=>row.id));
export const APW430_GEMINI_TRANSPORT_RAW=JSON.stringify(APW430_GEMINI_TRANSPORT_FIXTURE,null,2);
export const APW430_GEMINI_TRANSPORT_IMPORT=importGeminiTransport(APW430_GEMINI_TRANSPORT_RAW,{expectedProductId:'SER-YKK-APW430',knownFields,nodeIds});
