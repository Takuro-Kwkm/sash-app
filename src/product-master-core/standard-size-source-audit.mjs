export const STANDARD_SIZE_SOURCE_SCHEMA_VERSION='1.0';
export const STANDARD_SIZE_SOURCE_RECORD_TYPE='STANDARD_SIZE_SOURCE_RECORD';

const error=(code,message,details={})=>({code,message,...details});
const valueOf=(row,key)=>row?.[key]??null;
const stableKey=(row)=>JSON.stringify([
  row.productId,row.windowTypeId,row.specificationId??null,row.construction,row.sizeCode
]);
const scopeKey=(row)=>JSON.stringify([
  row.productId,row.windowTypeId,row.specificationId??null,row.construction
]);

export function validateStandardSizeSourceRecord(record){
  const errors=[];
  if(!record||typeof record!=='object'||Array.isArray(record))return{pass:false,errors:[error('SIZE_SOURCE_RECORD_INVALID','Standard-size source record must be an object')]};
  if(record.schemaVersion!==STANDARD_SIZE_SOURCE_SCHEMA_VERSION)errors.push(error('SIZE_SOURCE_SCHEMA_INVALID',`Unsupported schemaVersion: ${record.schemaVersion}`));
  if(record.recordType!==STANDARD_SIZE_SOURCE_RECORD_TYPE)errors.push(error('SIZE_SOURCE_RECORD_TYPE_INVALID',`recordType must be ${STANDARD_SIZE_SOURCE_RECORD_TYPE}`));
  for(const key of['id','productId','windowTypeId','construction','sizeCode'])if(!record[key])errors.push(error('SIZE_SOURCE_FIELD_REQUIRED',`${key} is required`,{field:key,recordId:record.id??null}));
  if(record.availability!=='AVAILABLE')errors.push(error('SIZE_SOURCE_AVAILABILITY_INVALID','v1.5 source audit accepts only explicitly AVAILABLE standard-size records'));
  const source=record.source;
  if(source?.type!=='OFFICIAL_PDF'||!source.driveFileId||!source.title||!Number.isInteger(source.printedPage)||!Number.isInteger(source.pdfPage)||!source.locatorText){
    errors.push(error('SIZE_SOURCE_LOCATOR_INVALID','Exact OFFICIAL_PDF driveFileId/title/printedPage/pdfPage/locatorText is required',{recordId:record.id??null}));
  }
  return{pass:errors.length===0,errors};
}

export function validateStandardSizeSourceRecords(records,{productId=null}={}){
  if(!Array.isArray(records)||records.length===0)return{pass:false,errors:[error('SIZE_SOURCE_RECORDS_REQUIRED','sourceRecords must be a non-empty array')]};
  const errors=[];
  const ids=new Set();
  const keys=new Set();
  for(const record of records){
    const validation=validateStandardSizeSourceRecord(record);
    errors.push(...validation.errors);
    if(productId&&record?.productId!==productId)errors.push(error('SIZE_SOURCE_PRODUCT_MISMATCH',`Source record ${record?.id} belongs to ${record?.productId}; expected ${productId}`));
    if(record?.id&&ids.has(record.id))errors.push(error('SIZE_SOURCE_ID_DUPLICATE',`Duplicate source record id: ${record.id}`));
    if(record?.id)ids.add(record.id);
    const key=stableKey(record);
    if(keys.has(key))errors.push(error('SIZE_SOURCE_KEY_DUPLICATE',`Duplicate source size key: ${key}`,{recordId:record?.id??null}));
    keys.add(key);
  }
  return{pass:errors.length===0,errors};
}

export function auditStandardSizeSourceCoverage({productId,sourceRecords,canonicalRecords}={}){
  const sourceValidation=validateStandardSizeSourceRecords(sourceRecords,{productId});
  if(!sourceValidation.pass)return{pass:false,status:'SOURCE_AUDIT_REJECTED',coveragePass:false,errors:sourceValidation.errors};
  if(!Array.isArray(canonicalRecords))return{pass:false,status:'SOURCE_AUDIT_REJECTED',coveragePass:false,errors:[error('CANONICAL_SIZE_RECORDS_INVALID','canonicalRecords must be an array')]};
  const canonicalScopeErrors=[];
  for(const record of canonicalRecords){
    if(record?.productId!==productId)continue;
    for(const key of['windowTypeId','construction','sizeCode'])if(!record?.[key])canonicalScopeErrors.push(error('CANONICAL_SIZE_FIELD_REQUIRED',`${key} is required`,{recordId:record?.id??null,field:key}));
  }
  if(canonicalScopeErrors.length)return{pass:false,status:'SOURCE_AUDIT_REJECTED',coveragePass:false,errors:canonicalScopeErrors};

  const sourceKeys=new Map(sourceRecords.map((row)=>[stableKey(row),row]));
  const coveredScopes=new Set(sourceRecords.map(scopeKey));
  const canonicalInScope=canonicalRecords.filter((row)=>row?.productId===productId&&coveredScopes.has(scopeKey(row)));
  const canonicalByKey=new Map();
  for(const row of canonicalInScope){
    const key=stableKey(row);
    if(!canonicalByKey.has(key))canonicalByKey.set(key,[]);
    canonicalByKey.get(key).push(row);
  }

  const matches=[];
  const missing=[];
  const inactive=[];
  for(const sourceRecord of sourceRecords){
    const rows=canonicalByKey.get(stableKey(sourceRecord))??[];
    if(rows.length===0){
      missing.push({classification:'MISSING_IN_CANONICAL',sourceRecord});
      continue;
    }
    const selectable=rows.filter((row)=>row.selectable===true);
    if(selectable.length===0){
      inactive.push({classification:'CANONICAL_INACTIVE',sourceRecord,canonicalRecords:rows});
      continue;
    }
    matches.push({classification:'MATCH',sourceRecord,canonicalRecords:selectable});
  }

  const extras=canonicalInScope.filter((row)=>row.selectable===true&&!sourceKeys.has(stableKey(row))).map((canonicalRecord)=>({
    classification:'EXTRA_IN_CANONICAL',canonicalRecord
  }));
  const duplicateCanonicalKeys=[...canonicalByKey.entries()].filter(([,rows])=>rows.filter((row)=>row.selectable===true).length>1).map(([key,rows])=>({key,canonicalRecordIds:rows.map((row)=>row.id??null)}));
  const coveragePass=missing.length===0&&inactive.length===0&&extras.length===0&&duplicateCanonicalKeys.length===0;
  const counts={
    officialAvailable:sourceRecords.length,
    match:matches.length,
    missingInCanonical:missing.length,
    canonicalInactive:inactive.length,
    extraInCanonical:extras.length,
    duplicateCanonicalKeys:duplicateCanonicalKeys.length,
    canonicalInCoveredScope:canonicalInScope.length
  };
  return{
    pass:true,status:coveragePass?'SOURCE_COVERAGE_PASS':'SOURCE_COVERAGE_GAP_DETECTED',coveragePass,productId,counts,
    coveredScopes:[...coveredScopes].map((key)=>JSON.parse(key)),matches,missing,inactive,extras,duplicateCanonicalKeys,errors:[],
    gates:{AUDIT_EXECUTION:'PASS',OFFICIAL_SOURCE_SIZE_COVERAGE:coveragePass?'PASS':'FAIL'}
  };
}
