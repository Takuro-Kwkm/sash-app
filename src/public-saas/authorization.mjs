import { MembershipRole, MembershipStatus, PublicSaaSError } from './domain.mjs';

const ROLE_RANK=Object.freeze({
  [MembershipRole.MEMBER]:10,
  [MembershipRole.ADMIN]:20,
  [MembershipRole.OWNER]:30,
});

const asDate=(value)=>value instanceof Date?value:new Date(value);

export function createSessionPrincipal({user_id,session_id,expires_at,email_verified_at=null,auth_provider='UNCONFIGURED'}={}){
  if(!user_id||!session_id||!expires_at)throw new PublicSaaSError('AUTH_SESSION_INVALID','Authenticated session requires user_id, session_id and expires_at.');
  return Object.freeze({user_id,session_id,expires_at,email_verified_at,auth_provider});
}

export function resolveWorkspaceContext({principal,workspace_id,memberships=[],required_role=MembershipRole.MEMBER,require_verified_email=false,clock=()=>new Date()}={}){
  if(!principal?.user_id)throw new PublicSaaSError('AUTH_REQUIRED','Authentication is required.');
  if(!principal.expires_at||asDate(principal.expires_at)<=clock())throw new PublicSaaSError('SESSION_EXPIRED','Session has expired.');
  if(require_verified_email&&!principal.email_verified_at)throw new PublicSaaSError('EMAIL_VERIFICATION_REQUIRED','Verified email is required.');
  if(!workspace_id)throw new PublicSaaSError('WORKSPACE_REQUIRED','workspace_id is required.');
  if(!(required_role in ROLE_RANK))throw new PublicSaaSError('ROLE_INVALID',`Unknown required role: ${required_role}`);

  const membership=memberships.find((row)=>
    row?.workspace_id===workspace_id&&
    row?.user_id===principal.user_id&&
    row?.status===MembershipStatus.ACTIVE
  );
  if(!membership)throw new PublicSaaSError('WORKSPACE_ACCESS_DENIED','Active workspace membership is required.',{workspace_id});
  if(!(membership.role in ROLE_RANK)||ROLE_RANK[membership.role]<ROLE_RANK[required_role]){
    throw new PublicSaaSError('WORKSPACE_ROLE_DENIED','Workspace role is insufficient.',{workspace_id,required_role,actual_role:membership.role});
  }

  return Object.freeze({
    user_id:principal.user_id,
    workspace_id,
    membership_id:membership.membership_id,
    role:membership.role,
    session_id:principal.session_id,
    auth_provider:principal.auth_provider,
  });
}

export function assertResourceWorkspace(resource,context,{resource_name='Resource'}={}){
  if(!context?.workspace_id)throw new PublicSaaSError('WORKSPACE_CONTEXT_REQUIRED','Workspace context is required.');
  if(!resource?.workspace_id)throw new PublicSaaSError('RESOURCE_WORKSPACE_UNSCOPED',`${resource_name} is not assigned to a workspace.`);
  if(resource.workspace_id!==context.workspace_id){
    throw new PublicSaaSError('RESOURCE_WORKSPACE_DENIED',`${resource_name} belongs to another workspace.`);
  }
  return resource;
}

export function scopeResourcesToWorkspace(resources,context){
  if(!context?.workspace_id)throw new PublicSaaSError('WORKSPACE_CONTEXT_REQUIRED','Workspace context is required.');
  return (resources??[]).filter((row)=>row?.workspace_id===context.workspace_id);
}
