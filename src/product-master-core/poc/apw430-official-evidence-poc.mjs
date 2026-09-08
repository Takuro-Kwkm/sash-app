import{APW430_MODULE}from'../../catalog/modules/apw430-module.mjs';

const PRODUCT_ID=APW430_MODULE.product.id;
const SOURCE_ID='1j9PtW8yoKBZ4Nodm58wU3QtOCvxlEja9';
const SOURCE_TITLE='202607_YKKAP_APW430_商品カタログ.pdf';

const officialEvidence=(row)=>({
  schemaVersion:'1.0',productId:PRODUCT_ID,status:'VERIFIED',strength:'EXPLICIT',
  adjudication:{extractedBy:'CHATGPT_POC',adjudicatedBy:'CHATGPT',status:'ACCEPTED'},
  ...row,
  source:{type:'OFFICIAL_PDF',driveFileId:SOURCE_ID,title:SOURCE_TITLE,version:'202607',...row.source}
});

export const APW430_OFFICIAL_EVIDENCE_POC={
  coreVersion:'0.2-poc',status:'EXPERIMENTAL',
  product:{id:PRODUCT_ID,manufacturer:'YKK AP',displayName:'APW 430',sourceCatalogProductId:PRODUCT_ID},
  fields:['window_type','construction','size_mode','size'],
  productNodes:[
    {id:'NODE-YKK-APW430',nodeType:'SERIES',label:'APW 430',parentNodeId:null,status:'ACTIVE'},
    {id:'NODE-YKK-APW430-FIX-MADO',nodeType:'WINDOW_TYPE',label:'FIX窓 窓タイプ',parentNodeId:'NODE-YKK-APW430',status:'ACTIVE'},
    {id:'NODE-YKK-APW430-FIX-TR-ZAIRAI',nodeType:'WINDOW_TYPE',label:'FIX窓 テラスタイプ（在来）',parentNodeId:'NODE-YKK-APW430',status:'ACTIVE'},
    {id:'NODE-YKK-APW430-FIX-TR-204',nodeType:'WINDOW_TYPE',label:'FIX窓 テラスタイプ（2×4）',parentNodeId:'NODE-YKK-APW430',status:'ACTIVE'}
  ],
  evidence:[
    officialEvidence({
      id:'EV-YKK-APW430-CAT-202607-FIX-TAXONOMY-P69',title:'APW430 FIX窓 商品体系',subjectField:'window_type',
      claim:'FIX窓の商品体系は窓タイプとテラスタイプに分かれ、テラスタイプには在来工法と2×4工法が設定される。',
      productNodeIds:['NODE-YKK-APW430-FIX-MADO','NODE-YKK-APW430-FIX-TR-ZAIRAI','NODE-YKK-APW430-FIX-TR-204'],
      source:{printedPage:69,pdfPage:71,locatorText:'■商品体系 / FIX窓 / 窓タイプ / テラスタイプ / 在来工法 / 2×4工法'}
    }),
    officialEvidence({
      id:'EV-YKK-APW430-CAT-202607-FIX-SIZE-ANGLE-P70',title:'APW430 FIX窓 規格サイズ・テラスタイプ枠条件',subjectField:'construction',
      claim:'FIX窓の規格サイズ一覧が掲載され、テラスタイプはアングル付枠のみの設定となる。',
      productNodeIds:['NODE-YKK-APW430-FIX-MADO','NODE-YKK-APW430-FIX-TR-ZAIRAI','NODE-YKK-APW430-FIX-TR-204'],
      source:{printedPage:70,pdfPage:72,locatorText:'規格サイズ一覧 / テラスタイプはアングル付枠のみの設定となります。'}
    })
  ],
  dependencyRules:[
    {
      id:'RULE-YKK-APW430-FIX-MADO-OFFICIAL',status:'ACTIVE',type:'AUTO_SET',
      when:{productNodeId:'NODE-YKK-APW430-FIX-MADO'},
      effects:[{field:'window_type',operation:'SET',value:'SWT-YKK-APW430-FIX-MADO'},{field:'size_mode',operation:'SET',value:'STANDARD'}],
      evidenceIds:['EV-YKK-APW430-CAT-202607-FIX-TAXONOMY-P69','EV-YKK-APW430-CAT-202607-FIX-SIZE-ANGLE-P70']
    },
    {
      id:'RULE-YKK-APW430-FIX-TR-ZAIRAI-OFFICIAL',status:'ACTIVE',type:'AUTO_SET_WITH_ASSERTION',
      when:{productNodeId:'NODE-YKK-APW430-FIX-TR-ZAIRAI'},
      effects:[{field:'window_type',operation:'SET',value:'SWT-YKK-APW430-FIX-TR-ZAIRAI'},{field:'size_mode',operation:'SET',value:'STANDARD'}],
      assertions:[{code:'FRAME_ANGLE_ATTACHED_ONLY',field:'construction',predicate:'ANGLE_ATTACHED_ONLY',note:'Runtime value mapping is intentionally deferred; official constraint is preserved without inventing a value.'}],
      evidenceIds:['EV-YKK-APW430-CAT-202607-FIX-TAXONOMY-P69','EV-YKK-APW430-CAT-202607-FIX-SIZE-ANGLE-P70']
    },
    {
      id:'RULE-YKK-APW430-FIX-TR-204-OFFICIAL',status:'ACTIVE',type:'AUTO_SET_WITH_ASSERTION',
      when:{productNodeId:'NODE-YKK-APW430-FIX-TR-204'},
      effects:[{field:'window_type',operation:'SET',value:'SWT-YKK-APW430-FIX-TR-204'},{field:'size_mode',operation:'SET',value:'STANDARD'}],
      assertions:[{code:'FRAME_ANGLE_ATTACHED_ONLY',field:'construction',predicate:'ANGLE_ATTACHED_ONLY',note:'Runtime value mapping is intentionally deferred; official constraint is preserved without inventing a value.'}],
      evidenceIds:['EV-YKK-APW430-CAT-202607-FIX-TAXONOMY-P69','EV-YKK-APW430-CAT-202607-FIX-SIZE-ANGLE-P70']
    }
  ],
  pending:[
    {
      id:'PEND-YKK-APW430-FIX-SOURCE-LOCATOR',status:'RESOLVED',severity:'NON_BLOCKING',type:'SOURCE_LOCATOR_MISMATCH',field:'construction',productNodeId:'NODE-YKK-APW430-FIX-TR-ZAIRAI',
      question:'既存生成Masterのテラスタイプ根拠メモ P.71 と、現行公式カタログの実ページを照合する。',
      history:[{from:null,to:'OPEN',at:'2026-09-01T00:00:00Z',by:'POC'},{from:'OPEN',to:'INVESTIGATING',at:'2026-09-01T00:01:00Z',by:'CHATGPT'},{from:'INVESTIGATING',to:'RESOLVED',at:'2026-09-01T00:02:00Z',by:'CHATGPT'}],
      resolutionEvidenceIds:['EV-YKK-APW430-CAT-202607-FIX-SIZE-ANGLE-P70'],
      resolutionRuleIds:['RULE-YKK-APW430-FIX-TR-ZAIRAI-OFFICIAL','RULE-YKK-APW430-FIX-TR-204-OFFICIAL'],
      resolutionNote:'202607公式商品カタログを実ページ確認し、アングル付枠のみの明記は印刷p.70 / PDF p.72と確定。v0.2 Evidenceはこのlocatorを正とする。',
      resolvedAt:'2026-09-01T00:02:00Z',resolvedBy:'CHATGPT'
    }
  ],
  phases:[{id:'PHASE-CORE-EVIDENCE-2',name:'Official Evidence Architecture PoC',status:'READY_FOR_GATE',scope:'APW430 FIX family / official PDF Evidence / PENDING lifecycle / phase Gate / Runtime projection'}],
  gatePolicy:{id:'GATE-CORE-EVIDENCE-2',phaseId:'PHASE-CORE-EVIDENCE-2',status:'EXPERIMENTAL',requireOfficialEvidence:true}
};
