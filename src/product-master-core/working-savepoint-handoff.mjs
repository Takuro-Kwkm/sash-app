import{productMasterFingerprint,stableJson,sha256}from'./master-change-control.mjs';
import{validateAuthoringStagingProvenance}from'./authoring-staging-provenance.mjs';
import{validateRuntimeGenerationProvenance}from'./runtime-generation-provenance.mjs';

export const WORKING_SAVEPOINT_HANDOFF_SCHEMA_VERSION='1.1';
export const WORKING_SAVEPOINT_HANDOFF_RECORD_TYPE='PRODUCT_MASTER_WORKING_SAVEPOINT_HANDOFF';

const error=(code,message,details={})=>({code,message,...details});
const isObject=(value)=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const stableHash=(value)=>`sha256:${sha256(stableJson(value))}`;

export function buildWorkingSavepointHandoff({
  authoringMaster,authoringStagingProvenance,runtimeManifest,runtimeFiles,runtimeGenerationProvenance,context={}
}={}){
  const errors=[];
  if(!isObject(authoringMaster))errors.push(error('SAVEPOINT_HANDOFF_AUTHORING_MASTER_REQUIRED','Working Savepoint handoff requires Authoring STAGING Master'));
  const authoringValidation=validateAuthoringStagingProvenance(authoringStagingProvenance,{});
  if(!authoringValidation.pass)errors.push(...authoringValidation.errors.map((row)=>({...row,code:`SAVEPOINT_HANDOFF_${row.code}`})));
  const runtimeValidation=validateRuntimeGenerationProvenance(runtimeGenerationProvenance,{authoringMaster,authoringStagingProvenance,manifest:runtimeManifest,runtimeFiles,generator:runtimeManifest?.generator});
  if(!runtimeValidation.pass)errors.push(...runtimeValidation.errors.map((row)=>({...row,code:`SAVEPOINT_HANDOFF_${row.code}`})));
  if(authoringStagingProvenance?.status!=='PASS'||authoringStagingProvenance?.stage!=='STAGING_CANDIDATE')errors.push(error('SAVEPOINT_HANDOFF_AUTHORING_STAGE_INVALID','Authoring package is not a PASS STAGING candidate'));
  if(runtimeGenerationProvenance?.status!=='PASS'||runtimeGenerationProvenance?.stage!=='RUNTIME_STAGING_CANDIDATE')errors.push(error('SAVEPOINT_HANDOFF_RUNTIME_STAGE_INVALID','Runtime package is not a PASS Runtime STAGING candidate'));
  if(authoringStagingProvenance?.proposalId!==runtimeGenerationProvenance?.proposalId||authoringStagingProvenance?.productId!==runtimeGenerationProvenance?.productId)errors.push(error('SAVEPOINT_HANDOFF_IDENTITY_MISMATCH','Authoring and Runtime candidate identities do not match'));
  if(runtimeManifest?.proposalId!==runtimeGenerationProvenance?.proposalId||runtimeManifest?.productId!==runtimeGenerationProvenance?.productId)errors.push(error('SAVEPOINT_HANDOFF_MANIFEST_IDENTITY_MISMATCH','Runtime manifest identity does not match Runtime provenance'));
  if(errors.length)return{pass:false,record:null,errors};

  const authoringMasterFingerprint=productMasterFingerprint(authoringMaster);
  const authoringProvenanceFingerprint=stableHash(authoringStagingProvenance);
  const runtimeProvenanceFingerprint=stableHash(runtimeGenerationProvenance);
  const packagePayload={
    productId:runtimeGenerationProvenance.productId,
    proposalId:runtimeGenerationProvenance.proposalId,
    manufacturer:context.manufacturer??null,
    series:context.series??null,
    authoring:{masterFingerprint:authoringMasterFingerprint,provenanceFingerprint:authoringProvenanceFingerprint},
    runtime:{
      manifestFingerprint:runtimeGenerationProvenance.runtimeManifestFingerprint,
      provenanceFingerprint:runtimeProvenanceFingerprint,
      fileSetFingerprint:runtimeGenerationProvenance.runtimeFileSetFingerprint,
      files:runtimeGenerationProvenance.runtimeFiles
    }
  };
  const record={
    schemaVersion:WORKING_SAVEPOINT_HANDOFF_SCHEMA_VERSION,
    recordType:WORKING_SAVEPOINT_HANDOFF_RECORD_TYPE,
    status:'PASS',stage:'CONTROL_PLANE_HANDOFF',
    ...packagePayload,
    packageFingerprint:stableHash(packagePayload),
    requiredNextAction:'EXECUTE_PRODUCT_MASTER_WORKING_SAVEPOINT_UNDER_ACTIVE_STARTUP_GATE',
    authority:{
      driveWritePerformed:false,
      workingSavepointGate:'NOT_EVALUATED',
      nextPhaseGate:'CLOSED',
      canonicalMasterWritePerformed:false,
      canonicalRuntimeWritePerformed:false,
      registryWritePerformed:false,
      formalPass:false,
      appIntegrationReady:false
    }
  };
  return{pass:true,record,errors:[]};
}

export function validateWorkingSavepointHandoff(record,{
  authoringMaster=null,authoringStagingProvenance=null,runtimeManifest=null,runtimeFiles=null,runtimeGenerationProvenance=null
}={}){
  const errors=[];
  if(!isObject(record))return{pass:false,errors:[error('SAVEPOINT_HANDOFF_RECORD_INVALID','Working Savepoint handoff must be an object')]};
  if(record.schemaVersion!==WORKING_SAVEPOINT_HANDOFF_SCHEMA_VERSION)errors.push(error('SAVEPOINT_HANDOFF_SCHEMA_INVALID','Unsupported Working Savepoint handoff schema',{actual:record.schemaVersion??null}));
  if(record.recordType!==WORKING_SAVEPOINT_HANDOFF_RECORD_TYPE)errors.push(error('SAVEPOINT_HANDOFF_TYPE_INVALID','Unexpected Working Savepoint handoff recordType',{actual:record.recordType??null}));
  if(record.status!=='PASS'||record.stage!=='CONTROL_PLANE_HANDOFF')errors.push(error('SAVEPOINT_HANDOFF_STATUS_INVALID','Persistable handoff must be PASS/CONTROL_PLANE_HANDOFF'));
  const authority=record.authority??{};
  if(authority.driveWritePerformed!==false||authority.workingSavepointGate!=='NOT_EVALUATED'||authority.nextPhaseGate!=='CLOSED'||authority.canonicalMasterWritePerformed!==false||authority.canonicalRuntimeWritePerformed!==false||authority.registryWritePerformed!==false||authority.formalPass!==false||authority.appIntegrationReady!==false)errors.push(error('SAVEPOINT_HANDOFF_AUTHORITY_INVALID','Handoff must not claim Drive savepoint, canonical, Registry, Formal or app-integration authority'));
  if(record.requiredNextAction!=='EXECUTE_PRODUCT_MASTER_WORKING_SAVEPOINT_UNDER_ACTIVE_STARTUP_GATE')errors.push(error('SAVEPOINT_HANDOFF_NEXT_ACTION_INVALID','Handoff must require the Product Master Working Savepoint under an active Startup Gate'));

  const payload={
    productId:record.productId,proposalId:record.proposalId,manufacturer:record.manufacturer??null,series:record.series??null,
    authoring:record.authoring,runtime:record.runtime
  };
  const actualPackageFingerprint=stableHash(payload);
  if(record.packageFingerprint!==actualPackageFingerprint)errors.push(error('SAVEPOINT_HANDOFF_PACKAGE_FINGERPRINT_MISMATCH','Working package handoff content changed',{expected:record.packageFingerprint,actual:actualPackageFingerprint}));

  if(authoringMaster){
    const actual=productMasterFingerprint(authoringMaster);
    if(record.authoring?.masterFingerprint!==actual)errors.push(error('SAVEPOINT_HANDOFF_AUTHORING_MASTER_STALE','Authoring Master changed after handoff',{expected:record.authoring?.masterFingerprint,actual}));
  }
  if(authoringStagingProvenance){
    const actual=stableHash(authoringStagingProvenance);
    if(record.authoring?.provenanceFingerprint!==actual)errors.push(error('SAVEPOINT_HANDOFF_AUTHORING_PROVENANCE_STALE','Authoring provenance changed after handoff'));
  }
  if(runtimeGenerationProvenance){
    const actual=stableHash(runtimeGenerationProvenance);
    if(record.runtime?.provenanceFingerprint!==actual)errors.push(error('SAVEPOINT_HANDOFF_RUNTIME_PROVENANCE_STALE','Runtime provenance changed after handoff'));
    if(record.runtime?.manifestFingerprint!==runtimeGenerationProvenance.runtimeManifestFingerprint||record.runtime?.fileSetFingerprint!==runtimeGenerationProvenance.runtimeFileSetFingerprint||stableHash(record.runtime?.files??[])!==stableHash(runtimeGenerationProvenance.runtimeFiles??[]))errors.push(error('SAVEPOINT_HANDOFF_RUNTIME_BINDING_STALE','Runtime package binding changed after handoff'));
  }
  if(runtimeManifest||runtimeFiles){
    const runtimeValidation=validateRuntimeGenerationProvenance(runtimeGenerationProvenance,{authoringMaster,authoringStagingProvenance,manifest:runtimeManifest,runtimeFiles,generator:runtimeManifest?.generator});
    if(!runtimeValidation.pass)errors.push(...runtimeValidation.errors.map((row)=>({...row,code:`SAVEPOINT_HANDOFF_${row.code}`})));
  }
  return{pass:errors.length===0,errors};
}
