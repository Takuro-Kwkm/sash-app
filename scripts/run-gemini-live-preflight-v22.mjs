import path from'node:path';
import{inspectGeminiLivePreflight}from'../src/product-master-core/gemini-live-preflight.mjs';

const args=process.argv.slice(2);
const value=(name)=>args.find((arg)=>arg.startsWith(`--${name}=`))?.slice(name.length+3)??null;
const sourceFile=value('source-file')??process.env.GEMINI_SOURCE_FILE??null;
const model=value('model')??process.env.GEMINI_MODEL??null;
const geminiFileUri=process.env.GEMINI_FILE_URI??null;
const result=inspectGeminiLivePreflight({
  env:process.env,
  argv:args,
  jobModel:model,
  sourceFilePath:sourceFile?path.resolve(sourceFile):null,
  sourceAttachment:{gemini_file_uri:geminiFileUri}
});
console.log(JSON.stringify(result,null,2));
if(!result.pass)process.exitCode=3;
