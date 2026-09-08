import{APW430_TECHNICAL_FACTS}from'./technical-facts.mjs';

export const APW430_PRODUCT_ID='SER-YKK-APW430';
export const APW430_LIVE_RAW_PATH='docs/notebooklm/live/BATCH-GEMINI-APW430-FIX-20260901213858.json';
export const APW430_KNOWN_FIELDS=new Set(['window_type','construction','size_mode','size']);
export const APW430_NODE_IDS=new Set([
  'NODE-YKK-APW430','NODE-YKK-APW430-FIX-MADO','NODE-YKK-APW430-FIX-TR-ZAIRAI','NODE-YKK-APW430-FIX-TR-204'
]);

const SOURCE={type:'OFFICIAL_PDF',driveFileId:'1j9PtW8yoKBZ4Nodm58wU3QtOCvxlEja9',title:'202607_YKKAP_APW430_商品カタログ.pdf',version:'202607'};
const evidence=(row)=>({
  schemaVersion:'1.0',productId:APW430_PRODUCT_ID,status:'VERIFIED',strength:'EXPLICIT',
  adjudication:{extractedBy:'CHATGPT_POC',adjudicatedBy:'CHATGPT',status:'ACCEPTED'},
  ...row,source:{...SOURCE,...row.source}
});

export const APW430_EXISTING_CANONICAL_EVIDENCE=[
  evidence({
    id:'EV-YKK-APW430-CAT-202607-FIX-TAXONOMY-P69',title:'APW430 FIX窓 商品体系',subjectField:'window_type',
    claim:'FIX窓の商品体系は窓タイプとテラスタイプに分かれ、テラスタイプには在来工法と2×4工法が設定される。',
    productNodeIds:['NODE-YKK-APW430-FIX-MADO','NODE-YKK-APW430-FIX-TR-ZAIRAI','NODE-YKK-APW430-FIX-TR-204'],
    source:{printedPage:69,pdfPage:71,locatorText:'■商品体系 / FIX窓 / 窓タイプ / テラスタイプ / 在来工法 / 2×4工法'}
  }),
  evidence({
    id:'EV-YKK-APW430-CAT-202607-FIX-SIZE-ANGLE-P70',title:'APW430 FIX窓 規格サイズ・テラスタイプ枠条件',subjectField:'construction',
    claim:'FIX窓の規格サイズ一覧が掲載され、テラスタイプはアングル付枠のみの設定となる。',
    productNodeIds:['NODE-YKK-APW430-FIX-MADO','NODE-YKK-APW430-FIX-TR-ZAIRAI','NODE-YKK-APW430-FIX-TR-204'],
    source:{printedPage:70,pdfPage:72,locatorText:'規格サイズ一覧 / テラスタイプはアングル付枠のみの設定となります。'}
  })
];

export const APW430_ADJUDICATION_PLAN={
  'CAND-GEMINI-APW430-FIX-001':{decision:'REJECT',reason:'Existing Core Canonical Evidence EV-YKK-APW430-CAT-202607-FIX-TAXONOMY-P69 already states that FIX窓 is divided into 窓タイプ and テラスタイプ; retain this extraction only as audit evidence.'},
  'CAND-GEMINI-APW430-FIX-002':{decision:'ACCEPT',canonicalEvidenceId:'EV-YKK-APW430-CAT-202607-FIX-MADO-ZAIRAI-P69',reason:'Official p.69 / PDF p.71 explicitly places FIX窓 窓タイプ under 在来工法. Existing taxonomy Evidence is from the same source region but does not make this atomic claim explicit.'},
  'CAND-GEMINI-APW430-FIX-003':{decision:'REJECT',reason:'Existing Core Canonical Evidence EV-YKK-APW430-CAT-202607-FIX-TAXONOMY-P69 already states that テラスタイプ has 在来工法 and 2×4工法; do not create redundant Canonical Evidence.'},
  'CAND-GEMINI-APW430-FIX-004':{decision:'REJECT',reason:'Existing Core Canonical Evidence EV-YKK-APW430-CAT-202607-FIX-SIZE-ANGLE-P70 already states that テラスタイプ is アングル付枠 only; do not create redundant Canonical Evidence.'},
  'CAND-GEMINI-APW430-FIX-005':{decision:'ACCEPT',canonicalEvidenceId:'EV-YKK-APW430-CAT-202607-FIX-TR-ZAIRAI-H18-P71',reason:'Official p.71 / PDF p.73 explicitly lists the seven H18 在来 standard-size codes.'},
  'CAND-GEMINI-APW430-FIX-006':{decision:'ACCEPT',canonicalEvidenceId:'EV-YKK-APW430-CAT-202607-FIX-TR-ZAIRAI-H20-P71',reason:'Official p.71 / PDF p.73 explicitly lists the seven H20 在来 standard-size codes.'},
  'CAND-GEMINI-APW430-FIX-007':{decision:'ACCEPT',canonicalEvidenceId:'EV-YKK-APW430-CAT-202607-FIX-TR-ZAIRAI-H22-P71',reason:'Official p.71 / PDF p.73 explicitly lists the seven H22 在来 standard-size codes.'},
  'CAND-GEMINI-APW430-FIX-008':{decision:'ACCEPT',canonicalEvidenceId:'EV-YKK-APW430-CAT-202607-FIX-TR-ZAIRAI-H24-P71',reason:'Official p.71 / PDF p.73 explicitly lists the seven H24 在来 standard-size codes.'},
  'CAND-GEMINI-APW430-FIX-009':{decision:'ACCEPT',canonicalEvidenceId:'EV-YKK-APW430-CAT-202607-FIX-TR-204-H18-P71',reason:'Official p.71 / PDF p.73 explicitly lists the four H18 2×4 standard-size codes.'},
  'CAND-GEMINI-APW430-FIX-010':{decision:'ACCEPT',canonicalEvidenceId:'EV-YKK-APW430-CAT-202607-FIX-TR-204-H20-P71',reason:'Official p.71 / PDF p.73 explicitly lists the four H20 2×4 standard-size codes.'},
  'CAND-GEMINI-APW430-FIX-011':{decision:'ACCEPT',canonicalEvidenceId:'EV-YKK-APW430-CAT-202607-FIX-TR-204-H22-P71',reason:'Official p.71 / PDF p.73 explicitly lists the four H22 2×4 standard-size codes.'},
  'CAND-GEMINI-APW430-FIX-012':{decision:'ACCEPT',canonicalEvidenceId:'EV-YKK-APW430-CAT-202607-FIX-TR-204-H24-P71',reason:'Official p.71 / PDF p.73 explicitly lists the four H24 2×4 standard-size codes.'}
};

export const APW430_PRODUCT_MASTER_WORKFLOW={
  workflowSchemaVersion:'1.0',recordType:'PRODUCT_MASTER_WORKFLOW_PROFILE',productId:APW430_PRODUCT_ID,status:'ACTIVE',
  capabilities:{evidenceRoundTrip:true,technicalFacts:true,formalWorkbookMutation:false,runtimeAutoWrite:false},
  evidenceRoundTrip:{
    rawPath:APW430_LIVE_RAW_PATH,knownFields:APW430_KNOWN_FIELDS,nodeIds:APW430_NODE_IDS,
    existingCanonicalEvidence:APW430_EXISTING_CANONICAL_EVIDENCE,adjudicationPlan:APW430_ADJUDICATION_PLAN,
    expectedProducerMode:'LIVE_EXTERNAL',issueSeverity:'NON_BLOCKING',timeOrigin:'2026-09-02T06:10:00Z'
  },
  technicalFacts:APW430_TECHNICAL_FACTS
};
