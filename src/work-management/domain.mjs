export const WORK_SCHEMA_VERSION = '1.0';

export const ProjectStatus = Object.freeze({
  ACTIVE:'ACTIVE', COMPLETED:'COMPLETED', ARCHIVED:'ARCHIVED',
});
export const EstimateStatus = Object.freeze({
  DRAFT:'DRAFT', READY:'READY', SUBMITTED:'SUBMITTED', REVISED:'REVISED', ARCHIVED:'ARCHIVED',
});
export const OpeningStatus = Object.freeze({ DRAFT:'DRAFT', COMPLETE:'COMPLETE' });
export const SaveStatus = Object.freeze({
  UNSAVED:'UNSAVED', SAVING:'SAVING', SAVED:'SAVED', SAVE_FAILED:'SAVE_FAILED',
});
export const ValidationState = Object.freeze({
  VALID:'VALID', NEEDS_REVALIDATION:'NEEDS_REVALIDATION', INVALID:'INVALID',
});

export class WorkManagementError extends Error {
  constructor(code,message,details={}){super(message);this.name=this.constructor.name;this.code=code;Object.assign(this,details);}
}
export class ValidationError extends WorkManagementError {
  constructor(message,details={}){super('VALIDATION_ERROR',message,details);}
}
export class NotFoundError extends WorkManagementError {
  constructor(entity,id){super('NOT_FOUND',`${entity} was not found: ${id}`,{entity,id});}
}
export class ConflictError extends WorkManagementError {
  constructor(entity,id){super('UPDATE_CONFLICT',`${entity} was updated elsewhere: ${id}`,{entity,id});}
}

const cloneFallback=(value)=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
export const cloneValue=(value)=>globalThis.structuredClone?globalThis.structuredClone(value):cloneFallback(value);

export function isoNow(clock=()=>new Date()) { return clock().toISOString(); }

export function newId(prefix,uuid=globalThis.crypto?.randomUUID?.bind(globalThis.crypto)) {
  const body=uuid?uuid():`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,12)}`;
  return `${prefix}_${body}`;
}

const text=(value)=>String(value??'').trim();
const nullableText=(value)=>text(value)||null;

export function createProject(data,{clock,id}={}) {
  const projectName=text(data?.project_name);
  if(!projectName)throw new ValidationError('物件名は必須です。',{field:'project_name'});
  const timestamp=isoNow(clock);
  return {
    project_id:id??newId('prj'),
    project_name:projectName,
    status:data?.status??ProjectStatus.ACTIVE,
    request_company:nullableText(data?.request_company),
    request_company_contact:nullableText(data?.request_company_contact),
    sales_person:nullableText(data?.sales_person),
    customer_name:nullableText(data?.customer_name),
    postal_code:nullableText(data?.postal_code),
    prefecture:nullableText(data?.prefecture),
    city:nullableText(data?.city),
    street:nullableText(data?.street),
    building:nullableText(data?.building),
    project_type:data?.project_type??null,
    memo:nullableText(data?.memo),
    owner_user_id:data?.owner_user_id??null,
    workspace_id:data?.workspace_id??null,
    created_at:timestamp,
    updated_at:timestamp,
    deleted_at:null,
  };
}

export function createEstimate(projectId,data={}, {clock,id}={}) {
  if(!projectId)throw new ValidationError('Estimateにはproject_idが必要です。',{field:'project_id'});
  const timestamp=isoNow(clock);
  return {
    estimate_id:id??newId('est'),
    project_id:projectId,
    estimate_no:Number(data.estimate_no??1),
    revision_no:Number(data.revision_no??0),
    status:data.status??EstimateStatus.DRAFT,
    estimate_title:nullableText(data.estimate_title)??'初回見積',
    requested_at:data.requested_at??null,
    due_date:data.due_date??null,
    memo:nullableText(data.memo),
    supersedes_estimate_id:data.supersedes_estimate_id??null,
    created_at:timestamp,
    updated_at:timestamp,
    deleted_at:null,
  };
}

export function createOpening(estimateId,data={}, {clock,id}={}) {
  if(!estimateId)throw new ValidationError('Openingにはestimate_idが必要です。',{field:'estimate_id'});
  const timestamp=isoNow(clock);
  return {
    opening_id:id??newId('opn'),
    estimate_id:estimateId,
    opening_no:Number(data.opening_no??1),
    sort_order:Number(data.sort_order??0),
    status:data.status??OpeningStatus.DRAFT,
    room_name:nullableText(data.room_name),
    location:nullableText(data.location),
    opening_name:nullableText(data.opening_name),
    memo:nullableText(data.memo),
    product_configuration_snapshot:data.product_configuration_snapshot?cloneValue(data.product_configuration_snapshot):null,
    created_at:timestamp,
    updated_at:timestamp,
    deleted_at:null,
  };
}

function displaySummary(result) {
  const labels=new Map();
  for(const field of result?.fields??[])for(const option of field.values??[])labels.set(`${field.key}:${String(option.value)}`,option.displayLabel);
  return Object.entries(result?.selection??{}).map(([key,value])=>{
    const field=(result.fields??[]).find((row)=>row.key===key);
    if(!field)return null;
    const values=Array.isArray(value)?value:[value];
    return {key,label:field.displayLabel,value:values.map((one)=>labels.get(`${key}:${String(one)}`)??String(one)).join('、')};
  }).filter(Boolean);
}

function validationState(result) {
  if((result?.validation?.errors??[]).length)return ValidationState.INVALID;
  if((result?.validation?.missingRequiredFields??[]).length)return ValidationState.NEEDS_REVALIDATION;
  const selection=result?.selection??{};
  const missingVisibleRequired=(result?.fields??[]).some((field)=>field.required&&(
    selection[field.key]===null||selection[field.key]===undefined||selection[field.key]===''||
    (Array.isArray(selection[field.key])&&!selection[field.key].length)
  ));
  if(missingVisibleRequired)return ValidationState.NEEDS_REVALIDATION;
  return ValidationState.VALID;
}

export function createProductConfigurationSnapshot({product,result,clock}) {
  if(!product||!result)throw new ValidationError('商品設定Snapshotには商品とRuntime評価結果が必要です。');
  const runtime=result.runtimeMaster??null;
  const packageVersion=runtime?.packageVersion??product.source?.version??product.version??'LEGACY-UNVERSIONED';
  const sourceHash=runtime?.sourceHash??product.source?.hash??null;
  const manifestId=runtime?.sourcePackageIntegrity?.manifestDriveFileId
    ??runtime?.canonicalRuntimeReference?.runtimeManifestDriveFileId
    ??product.canonicalRuntimeReference?.runtimeManifestDriveFileId
    ??null;
  const canonical=result.source==='RUNTIME_MASTER';
  const runtimeIdentity=manifestId??(!canonical?product.source?.id??null:null);
  return {
    schema_version:WORK_SCHEMA_VERSION,
    manufacturer:result.manufacturer??product.manufacturer,
    series:result.series??product.series??product.displayName,
    package_version:packageVersion,
    runtime_manifest_identity:runtimeIdentity,
    runtime_integrity_hash:sourceHash,
    configuration:cloneValue(result.selection??{}),
    display_summary:displaySummary(result),
    validation_state:validationState(result),
    source_mode:canonical?'CANONICAL_RUNTIME':'LEGACY_CATALOG',
    product_id:product.id,
    product_source:result.source??product.sourceType??product.source??'CATALOG',
    captured_at:isoNow(clock),
  };
}

export function openingDisplayName(opening) {
  const metadata=[opening.room_name,opening.location].filter(Boolean).join(' ');
  return [`開口 ${opening.opening_no}`,metadata,opening.opening_name].filter(Boolean).join('｜');
}
