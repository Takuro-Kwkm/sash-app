import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MembershipRole, MembershipStatus,
  createMembership, createUser, createWorkspace,
} from '../src/public-saas/domain.mjs';
import {
  assertResourceWorkspace, createSessionPrincipal,
  resolveWorkspaceContext, scopeResourcesToWorkspace,
} from '../src/public-saas/authorization.mjs';

const clock=()=>new Date('2026-09-10T04:20:00.000Z');

function fixture(){
  const user=createUser({email:' Owner@Example.com ',display_name:'Owner',email_verified_at:'2026-09-10T00:00:00.000Z'},{clock,id:'usr_owner'});
  const workspace=createWorkspace({name:'熊本営業所',created_by_user_id:user.user_id},{clock,id:'wsp_kumamoto'});
  const membership=createMembership({workspace_id:workspace.workspace_id,user_id:user.user_id,role:MembershipRole.OWNER},{clock,id:'mem_owner'});
  const principal=createSessionPrincipal({user_id:user.user_id,session_id:'ses_1',expires_at:'2026-09-10T05:20:00.000Z',email_verified_at:user.email_verified_at,auth_provider:'TEST'});
  return {user,workspace,membership,principal};
}

test('User -> Membership -> Workspace model is provider independent',()=>{
  const {user,workspace,membership}=fixture();
  assert.equal(user.email,'owner@example.com');
  assert.equal(workspace.created_by_user_id,user.user_id);
  assert.equal(membership.workspace_id,workspace.workspace_id);
  assert.equal(membership.role,MembershipRole.OWNER);
});

test('one user may resolve different active workspace memberships',()=>{
  const {user,workspace,membership,principal}=fixture();
  const second=createWorkspace({name:'福岡営業所',created_by_user_id:user.user_id},{clock,id:'wsp_fukuoka'});
  const secondMembership=createMembership({workspace_id:second.workspace_id,user_id:user.user_id,role:MembershipRole.MEMBER},{clock,id:'mem_member'});
  assert.equal(resolveWorkspaceContext({principal,workspace_id:workspace.workspace_id,memberships:[membership,secondMembership],clock}).role,MembershipRole.OWNER);
  assert.equal(resolveWorkspaceContext({principal,workspace_id:second.workspace_id,memberships:[membership,secondMembership],clock}).role,MembershipRole.MEMBER);
});

test('workspace access fails closed without authentication, membership, or sufficient role',()=>{
  const {membership,principal}=fixture();
  assert.throws(()=>resolveWorkspaceContext({workspace_id:'wsp_kumamoto',memberships:[membership],clock}),{code:'AUTH_REQUIRED'});
  assert.throws(()=>resolveWorkspaceContext({principal,workspace_id:'wsp_other',memberships:[membership],clock}),{code:'WORKSPACE_ACCESS_DENIED'});
  assert.throws(()=>resolveWorkspaceContext({principal,workspace_id:'wsp_kumamoto',memberships:[{...membership,role:MembershipRole.MEMBER}],required_role:MembershipRole.ADMIN,clock}),{code:'WORKSPACE_ROLE_DENIED'});
  assert.throws(()=>resolveWorkspaceContext({principal,workspace_id:'wsp_kumamoto',memberships:[{...membership,status:MembershipStatus.SUSPENDED}],clock}),{code:'WORKSPACE_ACCESS_DENIED'});
});

test('expired and unverified sessions are rejected when required',()=>{
  const {membership,principal}=fixture();
  const expired={...principal,expires_at:'2026-09-10T04:19:59.000Z'};
  assert.throws(()=>resolveWorkspaceContext({principal:expired,workspace_id:'wsp_kumamoto',memberships:[membership],clock}),{code:'SESSION_EXPIRED'});
  assert.throws(()=>resolveWorkspaceContext({principal:{...principal,email_verified_at:null},workspace_id:'wsp_kumamoto',memberships:[membership],require_verified_email:true,clock}),{code:'EMAIL_VERIFICATION_REQUIRED'});
});

test('resource access rejects legacy-unscoped and cross-workspace rows',()=>{
  const {membership,principal}=fixture();
  const context=resolveWorkspaceContext({principal,workspace_id:'wsp_kumamoto',memberships:[membership],clock});
  assert.throws(()=>assertResourceWorkspace({project_id:'prj_legacy',workspace_id:null},context,{resource_name:'Project'}),{code:'RESOURCE_WORKSPACE_UNSCOPED'});
  assert.throws(()=>assertResourceWorkspace({project_id:'prj_other',workspace_id:'wsp_other'},context,{resource_name:'Project'}),{code:'RESOURCE_WORKSPACE_DENIED'});
  assert.equal(assertResourceWorkspace({project_id:'prj_ok',workspace_id:'wsp_kumamoto'},context).project_id,'prj_ok');
});

test('workspace scoping never includes unscoped or other-workspace resources',()=>{
  const {membership,principal}=fixture();
  const context=resolveWorkspaceContext({principal,workspace_id:'wsp_kumamoto',memberships:[membership],clock});
  const scoped=scopeResourcesToWorkspace([
    {project_id:'a',workspace_id:'wsp_kumamoto'},
    {project_id:'b',workspace_id:'wsp_other'},
    {project_id:'legacy',workspace_id:null},
  ],context);
  assert.deepEqual(scoped.map((row)=>row.project_id),['a']);
});
