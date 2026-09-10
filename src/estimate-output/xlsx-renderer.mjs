import { estimateOutputFileStem, outputStateLabel } from './model.mjs';

const encoder=new TextEncoder();
const xml=(value)=>String(value??'').replace(/[&<>"']/g,(character)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&apos;'})[character]);

function concat(parts){
  const arrays=parts.map((part)=>part instanceof Uint8Array?part:encoder.encode(String(part)));
  const size=arrays.reduce((sum,part)=>sum+part.length,0);
  const out=new Uint8Array(size);let offset=0;
  for(const part of arrays){out.set(part,offset);offset+=part.length;}
  return out;
}

function u16(value){return Uint8Array.of(value&255,(value>>>8)&255);}
function u32(value){return Uint8Array.of(value&255,(value>>>8)&255,(value>>>16)&255,(value>>>24)&255);}

const CRC_TABLE=(()=>{
  const table=new Uint32Array(256);
  for(let n=0;n<256;n++){
    let c=n;
    for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;
    table[n]=c>>>0;
  }
  return table;
})();

function crc32(bytes){
  let crc=0xffffffff;
  for(const byte of bytes)crc=CRC_TABLE[(crc^byte)&0xff]^(crc>>>8);
  return (crc^0xffffffff)>>>0;
}

function dosDateTime(date=new Date()){
  const year=Math.max(1980,date.getFullYear());
  const time=((date.getHours()&31)<<11)|((date.getMinutes()&63)<<5)|((Math.floor(date.getSeconds()/2))&31);
  const day=((year-1980)&127)<<9|((date.getMonth()+1)&15)<<5|(date.getDate()&31);
  return {time,day};
}

export function createStoredZip(entries,{date=new Date()}={}){
  const local=[];const central=[];let offset=0;const stamp=dosDateTime(date);
  for(const entry of entries){
    const name=encoder.encode(entry.name);const data=entry.data instanceof Uint8Array?entry.data:encoder.encode(String(entry.data));const crc=crc32(data);
    const localHeader=concat([
      u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(stamp.time),u16(stamp.day),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name,
    ]);
    local.push(localHeader,data);
    const centralHeader=concat([
      u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(stamp.time),u16(stamp.day),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name,
    ]);
    central.push(centralHeader);offset+=localHeader.length+data.length;
  }
  const centralBytes=concat(central);
  const end=concat([u32(0x06054b50),u16(0),u16(0),u16(entries.length),u16(entries.length),u32(centralBytes.length),u32(offset),u16(0)]);
  return concat([...local,centralBytes,end]);
}

function columnName(index){
  let value=index+1,name='';
  while(value){value--;name=String.fromCharCode(65+(value%26))+name;value=Math.floor(value/26);}
  return name;
}

function buildWorkbookParts(model){
  const shared=[];const index=new Map();
  const sharedIndex=(value)=>{
    const key=String(value??'');
    if(!index.has(key)){index.set(key,shared.length);shared.push(key);}
    return index.get(key);
  };
  const headers=['No.','部屋 / 位置','開口名称','メーカー','シリーズ','窓・ドア種類','主要仕様','サイズ','出力状態','金額','Runtime Package','Runtime Identity','Validation','Source Mode'];
  const rows=[headers,...model.rows.map((row)=>[
    row.opening_no,
    [row.room_name,row.location].filter(Boolean).join(' / '),
    row.opening_name??'',
    row.manufacturer??'',
    row.series??'',
    row.opening_type??'',
    row.major_specifications??'',
    row.size??'',
    outputStateLabel(row.state),
    row.price,
    row.audit?.package_version??'',
    row.audit?.runtime_manifest_identity??'',
    row.audit?.validation_state??'',
    row.audit?.source_mode??'',
  ])];

  const rowXml=rows.map((row,rowIndex)=>{
    const cells=row.map((value,columnIndex)=>{
      if(value===null||value===undefined||value==='')return '';
      const ref=`${columnName(columnIndex)}${rowIndex+1}`;
      if(typeof value==='number'&&Number.isFinite(value))return `<c r="${ref}"${rowIndex===0?' s="1"':''}><v>${value}</v></c>`;
      return `<c r="${ref}" t="s"${rowIndex===0?' s="1"':''}><v>${sharedIndex(value)}</v></c>`;
    }).join('');
    return `<row r="${rowIndex+1}">${cells}</row>`;
  }).join('');

  const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="7" customWidth="1"/><col min="2" max="2" width="24" customWidth="1"/><col min="3" max="8" width="22" customWidth="1"/><col min="9" max="9" width="14" customWidth="1"/><col min="10" max="10" width="14" customWidth="1"/><col min="11" max="14" width="24" customWidth="1"/></cols><sheetData>${rowXml}</sheetData><autoFilter ref="A1:N${rows.length}"/></worksheet>`;
  const sharedStrings=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${shared.length}" uniqueCount="${shared.length}">${shared.map((value)=>`<si><t xml:space="preserve">${xml(value)}</t></si>`).join('')}</sst>`;
  return {sheet,sharedStrings};
}

export function createEstimateXlsxBytes(model){
  const {sheet,sharedStrings}=buildWorkbookParts(model);
  const entries=[
    {name:'[Content_Types].xml',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`},
    {name:'_rels/.rels',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`},
    {name:'xl/workbook.xml',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="見積出力" sheetId="1" r:id="rId1"/></sheets></workbook>`},
    {name:'xl/_rels/workbook.xml.rels',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`},
    {name:'xl/worksheets/sheet1.xml',data:sheet},
    {name:'xl/sharedStrings.xml',data:sharedStrings},
    {name:'xl/styles.xml',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Yu Gothic"/></font><font><b/><sz val="11"/><name val="Yu Gothic"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`},
  ];
  return createStoredZip(entries);
}

export function createEstimateXlsxBlob(model){
  return new Blob([createEstimateXlsxBytes(model)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}

export function estimateXlsxFileName(model){return `${estimateOutputFileStem(model)}.xlsx`;}
