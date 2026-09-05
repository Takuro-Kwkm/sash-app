import{APW430_MODULE}from'../../catalog/modules/apw430-module.mjs';

const PRODUCT_ID=APW430_MODULE.product.id;
const MASTER_EVIDENCE=APW430_MODULE.evidence.find((row)=>row.id==='EV-APW430-MASTER');
if(!MASTER_EVIDENCE)throw new Error('APW430 master Evidence is missing');

export const APW430_CORE_POC={
  coreVersion:'0.1-poc',
  status:'EXPERIMENTAL',
  product:{id:PRODUCT_ID,manufacturer:'YKK AP',displayName:'APW 430',sourceCatalogProductId:PRODUCT_ID},
  fields:['window_type','size_mode','size'],
  productNodes:[
    {id:'NODE-YKK-APW430',nodeType:'SERIES',label:'APW 430',parentNodeId:null,status:'ACTIVE'},
    {id:'NODE-YKK-APW430-TATE-GREMON-SINGLE',nodeType:'WINDOW_TYPE',label:'たてすべり出し窓（グレモンハンドル仕様）単窓',parentNodeId:'NODE-YKK-APW430',status:'ACTIVE'},
    {id:'NODE-YKK-APW430-FIX-MADO',nodeType:'WINDOW_TYPE',label:'FIX窓 窓タイプ',parentNodeId:'NODE-YKK-APW430',status:'ACTIVE'}
  ],
  dependencyRules:[
    {
      id:'RULE-YKK-APW430-POC-TATE',status:'ACTIVE',type:'AUTO_SET',
      when:{productNodeId:'NODE-YKK-APW430-TATE-GREMON-SINGLE'},
      effects:[
        {field:'window_type',operation:'SET',value:'SWT-YKK-APW430-TATE-GREMON-SINGLE'},
        {field:'size_mode',operation:'SET',value:'STANDARD'}
      ],
      evidenceIds:['EV-APW430-MASTER']
    },
    {
      id:'RULE-YKK-APW430-POC-FIX',status:'ACTIVE',type:'AUTO_SET',
      when:{productNodeId:'NODE-YKK-APW430-FIX-MADO'},
      effects:[
        {field:'window_type',operation:'SET',value:'SWT-YKK-APW430-FIX-MADO'},
        {field:'size_mode',operation:'SET',value:'STANDARD'}
      ],
      evidenceIds:['EV-APW430-MASTER']
    }
  ],
  evidence:[{...MASTER_EVIDENCE,provenance:{bridgeFromCatalogEvidenceId:MASTER_EVIDENCE.id,note:'PoC bridge only. Future Core Evidence should resolve to official source/page records.'}}],
  pending:[],
  phases:[
    {id:'PHASE-CORE-POC-1',name:'APW430 vertical slice',status:'READY_FOR_GATE',scope:'2 Product Nodes / Canonical Field / Rule / Evidence / Gate / Runtime projection'}
  ],
  gatePolicy:{id:'GATE-CORE-POC-1',phaseId:'PHASE-CORE-POC-1',status:'EXPERIMENTAL'}
};
