import fs from 'node:fs';
import path from 'node:path';
import {buildSizeCapabilityAuditGate} from '../src/product-master-core/size-capability-audit-core.mjs';

const dir=process.argv[2]??'artifacts/size-capability-audit';
const proposalDir=process.argv[3]??'data/master-change-control/proposals';
const read=(name)=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
const summary=read('summary.json');
const standardAudit=read('standard-size-audit.json');
const customAudit=read('custom-capability-audit.json');
const pending=read('pending.json');
const ruleAudits=[read('dimension-rule-audit-thermosl.json'),read('dimension-rule-audit-apw431.json')];
const proposals=(summary.productMasterChangeProposals??[]).map((id)=>JSON.parse(fs.readFileSync(path.join(proposalDir,`${id}.manifest.json`),'utf8')));
const gate=buildSizeCapabilityAuditGate({summary,standardAudit,customAudit,pending,ruleAudits,proposals});
fs.writeFileSync(path.join(dir,'gate-report.json'),JSON.stringify(gate,null,2)+'\n');
console.log(JSON.stringify(gate,null,2));
if(gate.integrityGate!=='PASS')process.exit(1);
