import fs from 'node:fs/promises';
import {FileBlob,SpreadsheetFile} from '@oai/artifact-tool';
const root='changes/replus-runtime-v5',out='artifacts/replus-flow-v13/authoring',mode=process.argv[2]??'inspect';
const index=JSON.parse(await fs.readFile(root+'/index.json'));
await fs.mkdir(out,{recursive:true});
for(const entry of index.products){
 const name=entry.id.split(':')[1];if(!['RPL_ROOM','RPL_TW','RPL_EW','RPL_BATH'].includes(name))continue;const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(mode==='verify'?root+'/candidates/'+name+'.xlsx':'/private/tmp/replus-flow-v12-20261014/'+root+'/candidates/'+name+'.xlsx'));
 const doc=JSON.parse(await fs.readFile(root+'/candidates/'+name+'.json'));const roleRows=doc.tables['14_UI選択契約'].values.flatMap((r,i)=>r[0]==='フロー'&&['glass_category','glass_appearance','glass','glass_function'].includes(r[1])?[i+1]:[]);const range='A'+Math.min(...roleRows)+':F'+Math.max(...roleRows);
 if(mode==='inspect'||mode==='verify'){
  const image=await wb.render({sheetName:'14_UI選択契約',range,scale:1,format:'png'});await fs.writeFile(out+'/'+name+(mode==='inspect'?'-before.png':'-native-after.png'),new Uint8Array(await image.arrayBuffer()));continue;
 }
 for(const sheetName of ['14_UI選択契約']){
  const rows=doc.tables[sheetName].values,count=Math.max(rows.length,sheetName==='01_入力フロー'?24:rows.length);
  wb.worksheets.getItem(sheetName).getRange('A1:'+ (sheetName==='90_Evidence'?'I':'F')+count).values=Array.from({length:count},(_,i)=>Array.from({length:sheetName==='90_Evidence'?9:6},(_,j)=>rows[i]?.[j]??null));
 }
 wb.recalculate();
 const check=await wb.inspect({kind:'table',range:'14_UI選択契約!'+range,include:'values',tableMaxRows:13,tableMaxCols:5});
 await fs.writeFile(out+'/'+name+'-inspection.json',check.ndjson);
 const image=await wb.render({sheetName:'14_UI選択契約',range,scale:1,format:'png'});await fs.writeFile(out+'/'+name+'-after.png',new Uint8Array(await image.arrayBuffer()));
 const exported=await SpreadsheetFile.exportXlsx(wb);await exported.save(out+'/'+name+'.artifact.xlsx');console.log(name+' AUTHORING_EXPORTED');
}
