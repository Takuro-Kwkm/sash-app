import{APW430_OFFICIAL_EVIDENCE_POC}from'./apw430-official-evidence-poc.mjs';
import{adjudicateEvidenceCandidate}from'../evidence-adjudication.mjs';

const SOURCE={
  type:'OFFICIAL_PDF',driveFileId:'1j9PtW8yoKBZ4Nodm58wU3QtOCvxlEja9',
  title:'202607_YKKAP_APW430_商品カタログ.pdf',version:'202607'
};

const candidate=(row)=>({
  recordType:'EVIDENCE_CANDIDATE',candidateSchemaVersion:'1.0',sourceSystem:'GEMINI_NOTEBOOKLM',
  producerMode:'SIMULATED_FIXTURE',status:'SUBMITTED',productId:'SER-YKK-APW430',proposedStrength:'EXPLICIT',
  ...row,source:{...SOURCE,...row.source}
});

export const APW430_GEMINI_INBOX_CANDIDATES=[
  candidate({
    id:'CAND-GEMINI-APW430-FIX-001',title:'Gemini Candidate｜FIX窓 商品体系',subjectField:'window_type',
    claim:'FIX窓の商品体系は窓タイプとテラスタイプに分かれ、テラスタイプには在来工法と2×4工法が設定される。',
    productNodeIds:['NODE-YKK-APW430-FIX-MADO','NODE-YKK-APW430-FIX-TR-ZAIRAI','NODE-YKK-APW430-FIX-TR-204'],
    source:{printedPage:69,pdfPage:71,locatorText:'■商品体系 / FIX窓 / 窓タイプ / テラスタイプ / 在来工法 / 2×4工法'}
  }),
  candidate({
    id:'CAND-GEMINI-APW430-FIX-002',title:'Gemini Candidate｜テラスタイプ枠条件 誤読例',subjectField:'construction',
    claim:'FIX窓テラスタイプはアングル無枠のみの設定となる。',
    productNodeIds:['NODE-YKK-APW430-FIX-TR-ZAIRAI','NODE-YKK-APW430-FIX-TR-204'],
    source:{printedPage:70,pdfPage:72,locatorText:'テラスタイプはアングル付枠のみの設定となります。'}
  }),
  candidate({
    id:'CAND-GEMINI-APW430-FIX-003',title:'Gemini Candidate｜H24 サイズ表 解釈要確認',subjectField:'size',
    claim:'FIX窓テラスタイプのH24は、掲載されている全W呼称で選択可能である。',
    productNodeIds:['NODE-YKK-APW430-FIX-TR-ZAIRAI','NODE-YKK-APW430-FIX-TR-204'],
    source:{printedPage:70,pdfPage:72,locatorText:'規格サイズ一覧 / H24 row / 記号別ガラス適用表示'}
  })
];

const [acceptedCandidate,rejectedCandidate,pendingCandidate]=APW430_GEMINI_INBOX_CANDIDATES;

export const APW430_GEMINI_ADJUDICATIONS={
  accepted:adjudicateEvidenceCandidate(acceptedCandidate,'ACCEPT',{
    adjudicatorType:'CHATGPT',adjudicatedBy:'CHATGPT',
    canonicalEvidenceId:'EV-YKK-APW430-GEMINI-CAND-001-ACCEPTED',
    reason:'Official PDF printed p.69 / PDF p.71 directly supports the taxonomy claim.',
    at:'2026-09-02T01:00:00Z'
  }),
  rejected:adjudicateEvidenceCandidate(rejectedCandidate,'REJECT',{
    adjudicatorType:'CHATGPT',adjudicatedBy:'CHATGPT',
    reason:'Rejected because the cited official locator states the opposite: terrace type is angle-attached frame only.',
    at:'2026-09-02T01:01:00Z'
  }),
  pending:adjudicateEvidenceCandidate(pendingCandidate,'PENDING',{
    adjudicatorType:'CHATGPT',adjudicatedBy:'CHATGPT',pendingId:'PEND-YKK-APW430-GEMINI-CAND-003-SIZE-GRID',pendingSeverity:'BLOCKING',
    pendingQuestion:'H24 row must be checked against the complete W-by-H symbol grid before a universal availability rule can be accepted.',
    reason:'The candidate over-generalizes a tabular size statement; exact row/column reachability needs a dedicated size-grid audit.',
    at:'2026-09-02T01:02:00Z'
  })
};

const acceptedMaster=structuredClone(APW430_OFFICIAL_EVIDENCE_POC);
acceptedMaster.coreVersion='0.3-poc';
acceptedMaster.evidence.push(APW430_GEMINI_ADJUDICATIONS.accepted.evidence);
const fixMadoRule=acceptedMaster.dependencyRules.find((row)=>row.id==='RULE-YKK-APW430-FIX-MADO-OFFICIAL');
fixMadoRule.evidenceIds=['EV-YKK-APW430-GEMINI-CAND-001-ACCEPTED'];
acceptedMaster.phases=[{id:'PHASE-CORE-GEMINI-INBOX-3',name:'Gemini Evidence Inbox PoC',status:'READY_FOR_GATE',scope:'Candidate Inbox / ChatGPT adjudication / Canonical Evidence promotion / PENDING deferral'}];
acceptedMaster.gatePolicy={id:'GATE-CORE-GEMINI-INBOX-3',phaseId:'PHASE-CORE-GEMINI-INBOX-3',status:'EXPERIMENTAL',requireOfficialEvidence:true};

const blockedMaster=structuredClone(acceptedMaster);
blockedMaster.pending.push(APW430_GEMINI_ADJUDICATIONS.pending.pending);

export const APW430_GEMINI_INBOX_POC={
  coreVersion:'0.3-poc',status:'EXPERIMENTAL',liveGeminiConnected:false,
  note:'No live Gemini/NotebookLM connector is available in this environment. Inbox records are explicitly SIMULATED_FIXTURE and only test the integration contract.',
  candidates:APW430_GEMINI_INBOX_CANDIDATES,
  adjudications:APW430_GEMINI_ADJUDICATIONS,
  acceptedMaster,
  blockedMaster
};
