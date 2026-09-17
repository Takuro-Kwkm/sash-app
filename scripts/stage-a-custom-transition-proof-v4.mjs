import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const v3Path=new URL('./stage-a-custom-transition-proof-v3.mjs',import.meta.url);
let generator=await readFile(v3Path,'utf8');

const insertionPoint="const generated=new URL('./.stage-a-custom-transition-proof-v3-runner.mjs',import.meta.url);";
if(!generator.includes(insertionPoint))throw new Error('CUSTOM_TRANSITION_V4_INSERTION_POINT_MISSING');
const patch=`const oldStatus=\`const status=(result)=>{\n  const direct=String(result?.dimensionResult?.status??result?.dimension_result?.status??'');\n  if(direct==='BLOCKED')return'BLOCK';\n  if(['PASS','REVIEW_REQUIRED','BLOCK','PENDING'].includes(direct))return direct;\n  const validation=String(result?.validation?.status??'');\n  if(['BLOCKED','INVALID'].includes(validation))return'BLOCK';\n  if(['MANUAL_CHECK','REVIEW_REQUIRED'].includes(validation))return'REVIEW_REQUIRED';\n  return direct||validation||'NONE';\n};\`;
const newStatus=\`const status=(result)=>{\n  const direct=String(result?.dimensionResult?.status??result?.dimension_result?.status??'');\n  if(direct==='BLOCKED')return'BLOCK';\n  if(['PASS','REVIEW_REQUIRED','BLOCK','PENDING'].includes(direct))return direct;\n  const validation=String(result?.validation?.status??'');\n  if(['BLOCKED','INVALID'].includes(validation))return'BLOCK';\n  if(['MANUAL_CHECK','REVIEW_REQUIRED'].includes(validation))return'REVIEW_REQUIRED';\n  if(result?.series==='EW'&&result?.selection?.size_mode==='CUSTOM'){\n    const errors=result?.validation?.errors??[];\n    if(errors.some((error)=>['CUSTOM_SIZE_OUT_OF_RANGE','CUSTOM_SIZE_INVALID_NUMBER'].includes(error.errorCode??error.code)))return'BLOCK';\n    const w=result?.selection?.custom_w,h=result?.selection?.custom_h;\n    if(Number.isFinite(Number(w))&&Number.isFinite(Number(h)))return'PASS';\n  }\n  return direct||validation||'NONE';\n};\`;
if(!source.includes(oldStatus))throw new Error('CUSTOM_TRANSITION_V4_STATUS_PATCH_TARGET_MISSING');
source=source.replace(oldStatus,newStatus);
source=source.replaceAll('CUSTOM_TRANSITION_FULL_SELECTOR_CONTEXT_V3_RUNTIME_MODE_TOPOLOGY','CUSTOM_TRANSITION_FULL_SELECTOR_CONTEXT_V4_DIMENSION_STATUS_SEPARATION');
source=source.replaceAll('CUSTOM_TRANSITION_V3_','CUSTOM_TRANSITION_V4_');
source=source.replaceAll('CUSTOM_TRANSITION_V3_GATE','CUSTOM_TRANSITION_V4_GATE');
source=source.replaceAll('CUSTOM_TRANSITION_V3_EVIDENCE_DIGEST','CUSTOM_TRANSITION_V4_EVIDENCE_DIGEST');
`;
generator=generator.replace(insertionPoint,patch+"\nconst generated=new URL('./.stage-a-custom-transition-proof-v4-runner.mjs',import.meta.url);");
const metaRunner=new URL('./.stage-a-custom-transition-proof-v4-generator.mjs',import.meta.url);
await writeFile(metaRunner,generator,'utf8');
await import(`${pathToFileURL(metaRunner.pathname).href}?head=${encodeURIComponent(process.env.HEAD_SHA??'')}`);
