import crypto from'node:crypto';
import fs from'node:fs';
import path from'node:path';
import{buildAiProGeminiExecutionAudit,validateGeminiExecutionAudit}from'../src/product-master-core/gemini-execution-contract.mjs';

const args=process.argv.slice(2);
const value=(name)=>args.find((arg)=>arg.startsWith(`--${name}=`))?.slice(name.length+3)??null;
const required=(name)=>{const found=value(name);if(!found)throw new Error(`Missing --${name}=...`);return path.resolve(found);};
const sha256File=(file)=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const jobPath=required('job');
const acquisitionPath=required('source-acquisition-audit');
const deliveryPath=required('source-delivery-audit');
const surfaceAuditPath=required('surface-audit');
const rawResponsePath=required('raw-response');
const outputPath=required('output');
for(const file of[jobPath,acquisitionPath,deliveryPath,surfaceAuditPath,rawResponsePath])if(!fs.existsSync(file))throw new Error(`Required input not found: ${file}`);

const job=JSON.parse(fs.readFileSync(jobPath,'utf8'));
const sourceAcquisition=JSON.parse(fs.readFileSync(acquisitionPath,'utf8'));
const sourceDelivery=JSON.parse(fs.readFileSync(deliveryPath,'utf8'));
const antigravityAudit=JSON.parse(fs.readFileSync(surfaceAuditPath,'utf8'));
const rawResponseSha256=sha256File(rawResponsePath);
const built=buildAiProGeminiExecutionAudit({job,sourceAcquisition,sourceDelivery,antigravityAudit,rawResponseSha256});
fs.mkdirSync(path.dirname(outputPath),{recursive:true});
if(!built.pass){
  const blocked={schemaVersion:'1.1',recordType:'PRODUCT_MASTER_GEMINI_EXECUTION',status:'BLOCKED',executionChannel:'GEMINI_AI_PRO',credentialMaterialPersisted:false,errors:built.errors};
  fs.writeFileSync(outputPath,`${JSON.stringify(blocked,null,2)}\n`,'utf8');
  console.log(JSON.stringify({pass:false,status:'BLOCKED',errors:built.errors,outputPath},null,2));
  process.exitCode=3;
}else{
  const validation=validateGeminiExecutionAudit(built.record,{job,sourceAcquisition,sourceDelivery,rawResponseSha256});
  if(!validation.pass){
    console.log(JSON.stringify({pass:false,status:'BLOCKED',errors:validation.errors,outputPath},null,2));
    process.exitCode=3;
  }else{
    fs.writeFileSync(outputPath,`${JSON.stringify(built.record,null,2)}\n`,'utf8');
    console.log(JSON.stringify({pass:true,status:'SUCCEEDED',executionChannel:built.record.executionChannel,surface:built.record.surface.id,model:built.record.surface.model,rawResponseSha256,outputPath},null,2));
  }
}
