const present=(value)=>value!==undefined&&value!==null&&value!=="";
const text=(value)=>present(value)?String(value):"";
const numeric=(value)=>{
  const number=Number(value);
  return Number.isFinite(number)?number:null;
};
const compare=(left,right)=>{
  const a=numeric(left),b=numeric(right);
  if(a!==null&&b!==null&&a!==b)return a-b;
  return text(left).localeCompare(text(right),"ja",{numeric:true});
};

export function toSizeRecords(values=[]){
  return values.map((value)=>{
    const metadata=value.metadata??{};
    return{
      id:value.value,label:value.displayLabel,
      nominalW:text(metadata.callW??metadata.nominalW),
      nominalH:text(metadata.callH??metadata.nominalH),
      actualW:metadata.actualW,actualH:metadata.actualH,
      sizeCode:text(metadata.callCode??metadata.sizeCode),
      metadata
    };
  }).filter((record)=>record.id&&record.nominalW&&record.nominalH);
}

export function getAvailableWidths(values=[]){
  const records=toSizeRecords(values),groups=new Map();
  for(const record of records){
    const group=groups.get(record.nominalW)??{value:record.nominalW,count:0};
    group.count+=1;groups.set(record.nominalW,group);
  }
  return[...groups.values()].sort((a,b)=>compare(a.value,b.value));
}

export function getAvailableHeights(values=[],nominalW=""){
  if(!present(nominalW))return[];
  const records=toSizeRecords(values).filter((record)=>record.nominalW===text(nominalW)),groups=new Map();
  for(const record of records){
    const group=groups.get(record.nominalH)??{value:record.nominalH,count:0};
    group.count+=1;groups.set(record.nominalH,group);
  }
  return[...groups.values()].sort((a,b)=>compare(a.value,b.value));
}

export function groupSizeRecordsByWidth(values=[]){
  const groups=new Map();
  for(const record of toSizeRecords(values)){
    const group=groups.get(record.nominalW)??{nominalW:record.nominalW,records:[]};
    group.records.push(record);groups.set(record.nominalW,group);
  }
  return[...groups.values()].sort((a,b)=>compare(a.nominalW,b.nominalW)).map((group)=>({
    ...group,
    records:group.records.sort((a,b)=>compare(a.nominalH,b.nominalH)||compare(a.sizeCode,b.sizeCode)||a.id.localeCompare(b.id,"ja")),
    heights:[...new Set(group.records.map((record)=>record.nominalH))].sort(compare)
  }));
}

export function getSizePresentationCounts(values=[],nominalW=""){
  const records=toSizeRecords(values),widths=getAvailableWidths(values),heights=getAvailableHeights(values,nominalW);
  return{
    candidateRecords:records.length,
    widthCandidates:widths.length,
    heightCandidates:heights.length,
    selectedWidthRecords:nominalW?records.filter((record)=>record.nominalW===text(nominalW)).length:0
  };
}

export function findSizeRecords(values=[],criteria={}){
  const width=text(criteria.nominalW),height=text(criteria.nominalH);
  return toSizeRecords(values).filter((record)=>(!width||record.nominalW===width)&&(!height||record.nominalH===height));
}

export function findSizeByCode(values=[],query=""){
  const needle=text(query).trim().toLocaleLowerCase("ja");
  if(!needle)return[];
  return toSizeRecords(values).filter((record)=>[
    record.sizeCode,record.nominalW,record.nominalH,record.actualW,record.actualH,record.id,record.label
  ].some((value)=>text(value).toLocaleLowerCase("ja").includes(needle))).sort((a,b)=>{
    const exactA=recordCode(a)===needle?0:1,exactB=recordCode(b)===needle?0:1;
    return exactA-exactB||compare(a.nominalW,b.nominalW)||compare(a.nominalH,b.nominalH)||a.label.localeCompare(b.label,"ja");
  });
}

const recordCode=(record)=>text(record.sizeCode).toLocaleLowerCase("ja");

export function getSelectedSizeMetadata(values=[],sizeRecordId){
  if(!sizeRecordId)return null;
  return toSizeRecords(values).find((record)=>record.id===sizeRecordId)??null;
}

export function reconcileSizeDraft(values=[],draft={},selectedSizeRecordId){
  const selected=getSelectedSizeMetadata(values,selectedSizeRecordId);
  if(selected)return{width:selected.nominalW,height:selected.nominalH,query:text(draft.query)};
  const widths=new Set(getAvailableWidths(values).map((row)=>row.value));
  const width=widths.has(text(draft.width))?text(draft.width):"";
  if(!width)return{width:"",height:"",query:text(draft.query)};
  const heights=new Set(getAvailableHeights(values,width).map((row)=>row.value));
  return{width,height:heights.has(text(draft.height))?text(draft.height):"",query:text(draft.query)};
}
