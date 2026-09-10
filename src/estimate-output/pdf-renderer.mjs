import { estimateOutputFileStem, outputStateLabel } from './model.mjs';

const encoder=new TextEncoder();

function concat(parts){
  const arrays=parts.map((part)=>part instanceof Uint8Array?part:encoder.encode(String(part)));
  const size=arrays.reduce((sum,part)=>sum+part.length,0);
  const out=new Uint8Array(size);let offset=0;
  for(const part of arrays){out.set(part,offset);offset+=part.length;}
  return out;
}

function base64Bytes(value){
  const binary=globalThis.atob(value);const out=new Uint8Array(binary.length);
  for(let index=0;index<binary.length;index++)out[index]=binary.charCodeAt(index);
  return out;
}

export function paginateEstimateOutput(model,{rowsPerPage=10}={}){
  const rows=Array.isArray(model?.rows)?model.rows:[];const pages=[];
  for(let index=0;index<rows.length;index+=rowsPerPage)pages.push(rows.slice(index,index+rowsPerPage));
  if(!pages.length)pages.push([]);
  return pages;
}

function drawText(ctx,text,x,y,{font='24px sans-serif',maxWidth,align='left'}={}){
  ctx.font=font;ctx.textAlign=align;ctx.textBaseline='top';ctx.fillStyle='#17212b';
  ctx.fillText(String(text??''),x,y,maxWidth);
}

function wrapText(ctx,value,maxWidth){
  const text=String(value??'—');const lines=[];let line='';
  for(const character of text){
    const next=line+character;
    if(line&&ctx.measureText(next).width>maxWidth){lines.push(line);line=character;}else line=next;
  }
  if(line)lines.push(line);
  return lines.length?lines:['—'];
}

function rowLine(row){
  return [row.manufacturer,row.series,row.opening_type,row.major_specifications,row.size].filter(Boolean).join(' / ')||'商品仕様未入力';
}

function renderCanvasPage(model,rows,pageIndex,pageCount,documentRef){
  const canvas=documentRef.createElement('canvas');canvas.width=1240;canvas.height=1754;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas 2D context is unavailable');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  drawText(ctx,'商品仕様 見積依頼書',72,62,{font:'bold 42px sans-serif'});
  drawText(ctx,`${model.project.project_name??'案件'} / 見積 ${model.estimate.estimate_no} / Revision ${model.estimate.revision_no}`,72,122,{font:'26px sans-serif'});
  drawText(ctx,`依頼会社: ${model.project.request_company??'—'}　担当: ${model.project.request_company_contact??'—'}　営業: ${model.project.sales_person??'—'}`,72,172,{font:'21px sans-serif'});
  drawText(ctx,`施主: ${model.project.customer_name??'—'}　住所: ${model.project.address??'—'}`,72,207,{font:'21px sans-serif'});
  drawText(ctx,`出力状態: ${outputStateLabel(model.state)}　全${model.counts.total} / 完了${model.counts.complete} / 未入力${model.counts.incomplete} / 要確認${model.counts.needs_confirmation} / 無効${model.counts.invalid}`,72,252,{font:'bold 21px sans-serif'});
  drawText(ctx,`${pageIndex+1} / ${pageCount}`,1168,68,{font:'20px sans-serif',align:'right'});
  let y=310;
  for(const row of rows){
    ctx.strokeStyle='#d9e1e7';ctx.lineWidth=2;ctx.strokeRect(72,y,1096,126);
    drawText(ctx,String(row.opening_no).padStart(2,'0'),92,y+18,{font:'bold 25px sans-serif'});
    drawText(ctx,[row.room_name,row.location,row.opening_name].filter(Boolean).join(' / ')||'開口部',150,y+16,{font:'bold 23px sans-serif',maxWidth:780});
    drawText(ctx,outputStateLabel(row.state),1140,y+18,{font:'bold 19px sans-serif',align:'right'});
    ctx.font='19px sans-serif';const lines=wrapText(ctx,rowLine(row),900).slice(0,2);
    lines.forEach((line,index)=>drawText(ctx,line,150,y+54+index*27,{font:'19px sans-serif',maxWidth:900}));
    const price=row.price===null?'金額: 要確認':`金額: ¥${Number(row.price).toLocaleString('ja-JP')}`;
    drawText(ctx,price,1140,y+88,{font:'18px sans-serif',align:'right'});
    y+=140;
  }
  drawText(ctx,'※ 金額未保持の場合は0円へ置換せず「要確認」として出力しています。',72,1688,{font:'18px sans-serif'});
  return canvas;
}

export function buildPdfFromJpegPages(pages){
  const header=encoder.encode('%PDF-1.4\n%SASH\n');
  const objectCount=2+pages.length*3;const objects=new Array(objectCount+1);const pageRefs=[];
  pages.forEach((page,index)=>pageRefs.push(`${3+index*3} 0 R`));
  objects[1]=encoder.encode('<< /Type /Catalog /Pages 2 0 R >>');
  objects[2]=encoder.encode(`<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pages.length} >>`);
  pages.forEach((page,index)=>{
    const pageNo=3+index*3,imageNo=pageNo+1,contentNo=pageNo+2,imageName=`Im${index+1}`;
    objects[pageNo]=encoder.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /${imageName} ${imageNo} 0 R >> >> /Contents ${contentNo} 0 R >>`);
    objects[imageNo]=concat([`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`,page.bytes,'\nendstream']);
    const stream=`q\n595 0 0 842 0 0 cm\n/${imageName} Do\nQ\n`;
    objects[contentNo]=encoder.encode(`<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}endstream`);
  });
  const body=[];const offsets=new Array(objectCount+1).fill(0);let position=header.length;
  for(let index=1;index<=objectCount;index++){
    offsets[index]=position;const chunk=concat([`${index} 0 obj\n`,objects[index],'\nendobj\n']);body.push(chunk);position+=chunk.length;
  }
  const xrefOffset=position;const xref=[`xref\n0 ${objectCount+1}\n0000000000 65535 f \n`];
  for(let index=1;index<=objectCount;index++)xref.push(`${String(offsets[index]).padStart(10,'0')} 00000 n \n`);
  const trailer=`trailer\n<< /Size ${objectCount+1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return concat([header,...body,...xref,trailer]);
}

export function createEstimatePdfBytes(model,{documentRef=globalThis.document,rowsPerPage=10,quality=.9}={}){
  if(!documentRef?.createElement)throw new Error('PDF canvas rendering requires a browser document');
  const pages=paginateEstimateOutput(model,{rowsPerPage});
  const rendered=pages.map((rows,index)=>{
    const canvas=renderCanvasPage(model,rows,index,pages.length,documentRef);
    const encoded=canvas.toDataURL('image/jpeg',quality).split(',')[1];
    return {bytes:base64Bytes(encoded),width:canvas.width,height:canvas.height};
  });
  return buildPdfFromJpegPages(rendered);
}

export function createEstimatePdfBlob(model,options={}){
  return new Blob([createEstimatePdfBytes(model,options)],{type:'application/pdf'});
}

export function estimatePdfFileName(model){return `${estimateOutputFileStem(model)}.pdf`;}
