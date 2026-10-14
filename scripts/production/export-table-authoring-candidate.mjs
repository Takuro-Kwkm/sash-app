import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {FileBlob,SpreadsheetFile} from '@oai/artifact-tool';
const root=resolve(process.argv[2]),name=process.argv[3];
const before=JSON.parse(await readFile(resolve(root,'baseline',name+'.json'))),after=JSON.parse(await readFile(resolve(root,'candidates',name+'.json')));
const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(resolve(root,'baseline',name+'.xlsx')));
const changes=[];
for(const [sheet,t] of Object.entries(after.tables)){
 if(JSON.stringify(t.values)===JSON.stringify(before.tables[sheet].values))continue;
 const preview=await wb.render({sheetName:sheet,range:'A1:I'+Math.min(before.tables[sheet].values.length,28),scale:1,format:'png'});
 await writeFile(resolve('artifacts/replus-runtime-v5',name+'-'+sheet+'-before.png'),new Uint8Array(await preview.arrayBuffer()));
}

for(const [sheet,t] of Object.entries(after.tables)){
 const prev=before.tables[sheet].values,values=t.values,ws=wb.worksheets.getItem(sheet);
 for(let r=0;r<values.length;r++){
  for(let c=0;c<values[r].length;c++){
   const a=prev[r]?.[c]??null,b=values[r][c]??null;
   if(Object.is(a,b))continue;
   const range=ws.getRangeByIndexes(r,c,1,1);
   if(r>=prev.length)range.copyFrom(ws.getRangeByIndexes(prev.length-1,c,1,1),'all');
   range.values=[[b]];changes.push({sheet,row:r+1,column:c+1,before:a,after:b});
  }
 }
}
if(!changes.length)throw new Error('NO_AUTHORING_CHANGE');
wb.recalculate();
const output=await SpreadsheetFile.exportXlsx(wb);await output.save(resolve('artifacts/replus-runtime-v5',name+'.artifact-preview.xlsx'));
await writeFile(resolve(root,'review',name+'-authoring-changes.json'),JSON.stringify(changes,null,2));
for(const sheet of new Set(changes.map(c=>c.sheet))){
 const cols=Math.min(after.tables[sheet].values[0].length||9,9);
 const preview=await wb.render({sheetName:sheet,range:'A1:I'+Math.min(after.tables[sheet].values.length,28),scale:1,format:'png'});
 await writeFile(resolve('artifacts/replus-runtime-v5',name+'-'+sheet+'.png'),new Uint8Array(await preview.arrayBuffer()));
}
const patch=spawnSync('python3',['scripts/production/patch-native-xlsx-cells.py','--root',root,'--component',name],{stdio:'inherit'});if(patch.status!==0)process.exit(patch.status??1);
console.log(name,changes.length);
