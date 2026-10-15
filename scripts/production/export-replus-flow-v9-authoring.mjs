import fs from 'node:fs/promises';
import {FileBlob,SpreadsheetFile} from '@oai/artifact-tool';
const root='changes/replus-runtime-v5',out='artifacts/replus-global-flow-v9/authoring',mode=process.argv[2]??'inspect';
const index=JSON.parse(await fs.readFile(root+'/index.json'));
for(const entry of index.products){
 const name=entry.id.split(':')[1];const wb=await SpreadsheetFile.importXlsx(await FileBlob.load('/private/tmp/replus-20261014-v5/replus-glass-flow-v8/'+root+'/candidates/'+name+'.xlsx'));
 if(mode==='inspect'){
  const image=await wb.render({sheetName:'01_入力フロー',range:'A1:F16',scale:1,format:'png'});await fs.writeFile(out+'/'+name+'-before.png',new Uint8Array(await image.arrayBuffer()));
  continue;
 }
 const doc=JSON.parse(await fs.readFile(root+'/candidates/'+name+'.json'));
 const flow=wb.worksheets.getItem('01_入力フロー');
 const rows=doc.tables['01_入力フロー'].values;const matrix=Array.from({length:Math.max(rows.length,24)},(_,i)=>Array.from({length:6},(_,j)=>rows[i]?.[j]??null));
 // Respect existing template formatting; only values are replaced.
 flow.getRange('A1:F'+matrix.length).values=matrix;
 const policy=wb.worksheets.add('14_UI選択契約');const values=doc.tables['14_UI選択契約'].values;
 policy.getRange('A1:F'+values.length).values=values.map(row=>Array.from({length:6},(_,j)=>row[j]??null));
 policy.getRange('A1:F'+values.length).format.font={name:'Arial',size:10};
 policy.getRange('A2:F2').format={fill:'#334155',font:{bold:true,color:'#FFFFFF'}};
 wb.recalculate();
 const image=await wb.render({sheetName:'01_入力フロー',range:'A1:F16',scale:1,format:'png'});await fs.writeFile(out+'/'+name+'-after.png',new Uint8Array(await image.arrayBuffer()));
 const exported=await SpreadsheetFile.exportXlsx(wb);await exported.save(out+'/'+name+'.artifact.xlsx');
 console.log(name+' AUTHORING_EXPORTED');
}
