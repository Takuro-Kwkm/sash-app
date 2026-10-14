import fs from 'node:fs/promises';
import {FileBlob,SpreadsheetFile} from '@oai/artifact-tool';
const root='changes/replus-runtime-v5',out='artifacts/replus-global-flow-v10/authoring',mode=process.argv[2]??'inspect';
const index=JSON.parse(await fs.readFile(root+'/index.json'));
await fs.mkdir(out,{recursive:true});
for(const entry of index.products){
 const name=entry.id.split(':')[1];const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(mode==='verify'?root+'/candidates/'+name+'.xlsx':out+'/import/'+name+'.xlsx'));
 if(mode==='inspect'||mode==='verify'){
  const image=await wb.render({sheetName:'01_入力フロー',range:'A1:F16',scale:1,format:'png'});await fs.writeFile(out+'/'+name+(mode==='inspect'?'-before.png':'-native-after.png'),new Uint8Array(await image.arrayBuffer()));continue;
 }
 const doc=JSON.parse(await fs.readFile(root+'/candidates/'+name+'.json'));
 for(const sheetName of ['01_入力フロー','14_UI選択契約']){
  const rows=doc.tables[sheetName].values,count=Math.max(rows.length,sheetName==='01_入力フロー'?24:rows.length);
  wb.worksheets.getItem(sheetName).getRange('A1:F'+count).values=Array.from({length:count},(_,i)=>Array.from({length:6},(_,j)=>rows[i]?.[j]??null));
 }
 wb.recalculate();
 const check=await wb.inspect({kind:'table',range:'01_入力フロー!A4:E16',include:'values',tableMaxRows:13,tableMaxCols:5});
 await fs.writeFile(out+'/'+name+'-inspection.json',check.ndjson);
 const image=await wb.render({sheetName:'01_入力フロー',range:'A1:F16',scale:1,format:'png'});await fs.writeFile(out+'/'+name+'-after.png',new Uint8Array(await image.arrayBuffer()));
 const exported=await SpreadsheetFile.exportXlsx(wb);await exported.save(out+'/'+name+'.artifact.xlsx');console.log(name+' AUTHORING_EXPORTED');
}
