export const PUBLIC_SAAS_FOUNDATION_VERSION='0.1';

export const PublicStage=Object.freeze({
  DEVELOPMENT:'DEVELOPMENT',
  PRIVATE_ALPHA:'PRIVATE_ALPHA',
  CLOSED_BETA:'CLOSED_BETA',
  OPEN_BETA:'OPEN_BETA',
  GA:'GA',
  PAID_SAAS:'PAID_SAAS',
});

export const UserStatus=Object.freeze({ACTIVE:'ACTIVE',SUSPENDED:'SUSPENDED'});
export const WorkspaceStatus=Object.freeze({ACTIVE:'ACTIVE',ARCHIVED:'ARCHIVED'});
export const MembershipStatus=Object.freeze({ACTIVE:'ACTIVE',INVITED:'INVITED',SUSPENDED:'SUSPENDED'});
export const MembershipRole=Object.freeze({OWNER:'OWNER',ADMIN:'ADMIN',MEMBER:'MEMBER'});

export class PublicSaaSError extends Error {
  constructor(code,message,details={}){super(message);this.name=this.constructor.name;this.code=code;Object.assign(this,details);}
}
export class PublicSaaSValidationError extends PublicSaaSError {
  constructor(message,details={}){super('PUBLIC_SAAS_VALIDATION_ERROR',message,details);}
}

const text=(value)=>String(value??'').trim();
const normalizeEmail=(value)=>text(value).toLowerCase();
const now=(clock=()=>new Date())=>clock().toISOString();
const fallbackId=(prefix)=>`${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,12)}`;
function idFor(prefix,id){
  if(id)return id;
  const uuid=globalThis.crypto?.randomUUID?.();
  return uuid?`${prefix}_${uuid}`:fallbackId(prefix);
}

function assertRole(role){
  if(!Object.values(MembershipRole).includes(role))throw new PublicSaaSValidationError(`Unknown membership role: ${role}`,{field:'role'});
}

export function createUser(data={}, {clock,id}={}){
  const email=normalizeEmail(data.email);
  if(!email||!email.includes('@'))throw new PublicSaaSValidationError('User email is required.',{field:'email'});
  const timestamp=now(clock);
  return {
    user_id:idFor('usr',id),
    email,
    display_name:text(data.display_name)||null,
    status:data.status??UserStatus.ACTIVE,
    email_verified_at:data.email_verified_at??null,
    created_at:timestamp,
    updated_at:timestamp,
  };
}

export function createWorkspace(data={}, {clock,id}={}){
  const name=text(data.name);
  const createdBy=text(data.created_by_user_id);
  if(!name)throw new PublicSaaSValidationError('Workspace name is required.',{field:'name'});
  if(!createdBy)throw new PublicSaaSValidationError('Workspace creator is required.',{field:'created_by_user_id'});
  const timestamp=now(clock);
  return {
    workspace_id:idFor('wsp',id),
    name,
    status:data.status??WorkspaceStatus.ACTIVE,
    created_by_user_id:createdBy,
    created_at:timestamp,
    updated_at:timestamp,
  };
}

export function createMembership(data={}, {clock,id}={}){
  const workspaceId=text(data.workspace_id);
  const userId=text(data.user_id);
  const role=data.role??MembershipRole.MEMBER;
  if(!workspaceId)throw new PublicSaaSValidationError('Membership workspace_id is required.',{field:'workspace_id'});
  if(!userId)throw new PublicSaaSValidationError('Membership user_id is required.',{field:'user_id'});
  assertRole(role);
  const timestamp=now(clock);
  return {
    membership_id:idFor('mem',id),
    workspace_id:workspaceId,
    user_id:userId,
    role,
    status:data.status??MembershipStatus.ACTIVE,
    created_at:timestamp,
    updated_at:timestamp,
  };
}
