import fs from'node:fs';
import path from'node:path';
import{runApw430LiveEvidenceRoundTrip}from'../src/product-master-core/live-roundtrip-v1.mjs';

const artifactDir=path.resolve(process.argv[2]??'artifacts/product-master-live-v1');
fs.rmSync(artifactDir,{recursive:true,force:true});
const result=runApw430LiveEvidenceRoundTrip({artifactDir});
console.log(JSON.stringify({pass:result.pass,artifactDir:result.artifactDir,report:result.report},null,2));
