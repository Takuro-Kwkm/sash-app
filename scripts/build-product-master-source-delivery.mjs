import fs from'node:fs';
import path from'node:path';
import{buildAiProScopedTextDelivery,validateSourceDeliveryRecord}from'../src/product-master-core/source-delivery-contract.mjs';

const args=process.argv.slice(2);
const value=(name)=>args.find((arg)=>arg.startsWith(`--${name}=`))?.slice(name.length+3)??null;
const acquisitionPath=value('source-acquisition-audit');
const scopeAuditPath=value('scope-audit');
const executionReference=value('execution-reference');
const outputPath=value('output');

if(!acquisitionPath||!scopeAuditPath||!outputPath)throw new Error('Usage: --source-acquisition-audit=<json> --scope-audit=<json> --output=<json> [--execution-reference=<ref>]');
const sourceAcquisition=JSON.parse(fs.readFileSync(path.resolve(acquisitionPath),'utf8'));
const scopeAudit=JSON.parse(fs.readFileSync(path.resolve(scopeAuditPath),'utf8'));
const built=buildAiProScopedTextDelivery({sourceAcquisition,scopeAudit,executionReference});
fs.mkdirSync(path.dirname(path.resolve(outputPath)),{recursive:true});
if(!built.pass){
  const blocked={schemaVersion:'1.1',recordType:'PRODUCT_MASTER_SOURCE_DELIVERY',status:'BLOCKED',executionChannel:'GEMINI_AI_PRO',credentialMaterialPersisted:false,errors:built.errors};
  fs.writeFileSync(path.resolve(outputPath),`${JSON.stringify(blocked,null,2)}\n`,'utf8');
  console.log(JSON.stringify({pass:false,status:'BLOCKED',errors:built.errors,outputPath:path.resolve(outputPath)},null,2));
  process.exitCode=3;
}else{
  const validation=validateSourceDeliveryRecord(built.record,{sourceAcquisition});
  if(!validation.pass){
    console.log(JSON.stringify({pass:false,status:'BLOCKED',errors:validation.errors},null,2));
    process.exitCode=3;
  }else{
    fs.writeFileSync(path.resolve(outputPath),`${JSON.stringify(built.record,null,2)}\n`,'utf8');
    console.log(JSON.stringify({pass:true,status:'PASS',executionChannel:built.record.executionChannel,deliveryMethod:built.record.delivery.method,artifactSha256:built.record.delivery.artifactSha256,outputPath:path.resolve(outputPath)},null,2));
  }
}
