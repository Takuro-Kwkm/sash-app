import fs from'node:fs';
import path from'node:path';
import{acquireOfficialSource,validateSourceAcquisitionRecord}from'../src/product-master-core/source-acquisition.mjs';

const args=process.argv.slice(2);
const value=(name)=>args.find((arg)=>arg.startsWith(`--${name}=`))?.slice(name.length+3)??null;
const profilePath=value('profile');
const executionChannel=value('execution-channel');
const outputPath=value('output');
const auditPath=value('audit');
const proofPath=value('equivalence-proof');
const githubOutput=value('github-output')??process.env.GITHUB_OUTPUT??null;

if(!profilePath||!executionChannel||!outputPath||!auditPath){
  throw new Error('Usage: --profile=<profile.json> --execution-channel=<GEMINI_AI_PRO|GEMINI_API> --output=<source.pdf> --audit=<audit.json> [--equivalence-proof=<proof.json>] [--github-output=<path>]');
}

const profile=JSON.parse(fs.readFileSync(path.resolve(profilePath),'utf8'));
const equivalenceProof=proofPath?JSON.parse(fs.readFileSync(path.resolve(proofPath),'utf8')):null;
const result=await acquireOfficialSource(profile,{
  executionChannel,
  outputPath:path.resolve(outputPath),
  equivalenceProof
});

fs.mkdirSync(path.dirname(path.resolve(auditPath)),{recursive:true});
const audit=result.record??{
  schemaVersion:'1.1',recordType:'PRODUCT_MASTER_SOURCE_ACQUISITION',status:result.status,
  manufacturer:profile.manufacturer??null,series:profile.series??null,productId:profile.productId??null,
  executionChannel,credentialMaterialPersisted:false,errors:result.errors??[]
};
fs.writeFileSync(path.resolve(auditPath),`${JSON.stringify(audit,null,2)}\n`,'utf8');

if(result.pass){
  const validation=validateSourceAcquisitionRecord(result.record,{profile});
  if(!validation.pass){
    console.log(JSON.stringify({pass:false,status:'BLOCKED',errors:validation.errors,auditPath:path.resolve(auditPath)},null,2));
    process.exitCode=3;
  }else{
    if(githubOutput){
      const lines=[
        `source_pdf=${path.resolve(outputPath)}`,
        `source_acquisition_audit=${path.resolve(auditPath)}`,
        `actual_sha=${result.record.retrieval.acquiredSha256}`,
        `source_identity_mode=${result.record.identity.mode}`
      ];
      fs.appendFileSync(path.resolve(githubOutput),`${lines.join('\n')}\n`,'utf8');
    }
    console.log(JSON.stringify({
      pass:true,status:'PASS',executionChannel,
      identityMode:result.record.identity.mode,
      acquiredSha256:result.record.retrieval.acquiredSha256,
      sourcePdf:path.resolve(outputPath),auditPath:path.resolve(auditPath)
    },null,2));
  }
}else{
  console.log(JSON.stringify({pass:false,status:result.status,auditPath:path.resolve(auditPath),errors:result.errors??[]},null,2));
  process.exitCode=result.status==='BLOCKED'?3:1;
}
