// Generic, quarantined native-table authoring. The plan owns all product data.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const [planPath,inputPath,outDir,dependencyRoot]=process.argv.slice(2);
if (![planPath,inputPath,outDir,dependencyRoot].every(Boolean)) throw new Error('Pass plan, native input, new output directory and acquired dependency root');
const {FileBlob,SpreadsheetFile}=await import(require.resolve('@oai/artifact-tool',{paths:[dependencyRoot]}));
const plan=JSON.parse(await fs.readFile(planPath,'utf8'));
const input=await fs.readFile(inputPath);
if(createHash('sha256').update(input).digest('hex')!==plan.base_authoring_sha256) throw new Error('NATIVE_BASELINE_CHANGED');
if(plan.state!=='PREPARED_NOT_APPROVED_SOURCE_BLOCKED'||plan.automatic_orderability!==false) throw new Error('CANDIDATE_SCOPE_REFUSED');
try {
  await fs.stat(outDir+'/authoring-candidate.xlsx');
  throw new Error('IMMUTABLE_CANDIDATE_EXISTS; use a new versioned output root');
} catch (error) {
  if(error.code!=='ENOENT') throw error;
}
const workbook=await SpreadsheetFile.importXlsx(await FileBlob.load(inputPath));
for (const patch of plan.patches) {
  const range=workbook.worksheets.getItem(patch.sheet).getRange(patch.address);
  const actual=range.values[0]?.[0]??null;
  if(actual!==patch.before) throw new Error(`PATCH_BASELINE_CELL_CHANGED ${patch.sheet}!${patch.address}`);
  range.values=[[patch.after]];
}
// Extend the existing row format only for the newly evidenced native rows.
for(const [sheet,target,source] of [['10_適用条件','A16:G16','A15:G15'],['10C_施工スペース','A7:G7','A6:G6'],['10D_施工条件','A9:F9','A8:F8'],['90_Evidence','A19:I19','A18:I18']]) {
  const view=workbook.worksheets.getItem(sheet);
  const values=view.getRange(target).values;
  view.getRange(target).copyFrom(view.getRange(source),'all');
  view.getRange(target).values=values;
  view.getRange(target).format.autofitRows();
}
workbook.recalculate();
await fs.mkdir(outDir,{recursive:true});
const errors=await workbook.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!',options:{useRegex:true,maxResults:100},maxChars:1500});
await fs.writeFile(outDir+'/formula-scan.json',errors.ndjson);
for(const [sheet,range,label] of [['10_適用条件','A7:G16','applicability'],['10C_施工スペース','A1:G7','space'],['10D_施工条件','A1:F9','construction'],['90_Evidence','A14:I19','evidence']]) {
  const preview=await workbook.render({sheetName:sheet,range,scale:1.5,format:'png'});
  await fs.writeFile(`${outDir}/${label}.png`,new Uint8Array(await preview.arrayBuffer()));
}
await (await SpreadsheetFile.exportXlsx(workbook)).save(outDir+'/authoring-candidate.xlsx');
console.log(JSON.stringify({state:plan.state,patches:plan.patches.length,automatic_orderability:false,formal_adopted:false}));
