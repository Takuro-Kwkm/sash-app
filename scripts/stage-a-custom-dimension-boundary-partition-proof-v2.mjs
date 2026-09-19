import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const sourcePath=new URL('./stage-a-custom-dimension-boundary-partition-proof.mjs',import.meta.url);
let source=await readFile(sourcePath,'utf8');
const oldFinite="const finite=(v)=>Number.isFinite(Number(v));";
const safeFinite="const finite=(v)=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));";
if(!source.includes(oldFinite))throw new Error('CUSTOM_PARTITION_V2_FINITE_PATCH_TARGET_MISSING');
source=source.replace(oldFinite,safeFinite);
const oldModel="CUSTOM_FINITE_LINE_ARRANGEMENT_COMMON_REFINEMENT_V1";
const newModel="CUSTOM_FINITE_LINE_ARRANGEMENT_COMMON_REFINEMENT_V2_NULL_SAFE";
if(!source.includes(oldModel))throw new Error('CUSTOM_PARTITION_V2_MODEL_PATCH_TARGET_MISSING');
source=source.replaceAll(oldModel,newModel);
const generated=new URL('./.stage-a-custom-dimension-boundary-partition-proof-v2-runner.mjs',import.meta.url);
await writeFile(generated,source,'utf8');
await import(`${pathToFileURL(generated.pathname).href}?head=${encodeURIComponent(process.env.HEAD_SHA??'')}`);
