import { PublicSaaSError } from './domain.mjs';

const trim=(value)=>String(value??'').trim();
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertUuid(value,name){
  if(!UUID.test(String(value??'')))throw new PublicSaaSError('DATA_SCOPE_INVALID',`${name} must be a UUID.`);
  return String(value);
}

export class SupabaseDataApiClient {
  constructor({url,publishableKey,fetchImpl=globalThis.fetch}={}){
    this.url=trim(url).replace(/\/+$/,'');
    this.publishableKey=trim(publishableKey);
    this.fetch=fetchImpl;
  }

  get configured(){return Boolean(this.url&&this.publishableKey&&this.fetch);}

  #assertConfigured(){
    if(!this.configured)throw new PublicSaaSError('DATABASE_NOT_CONFIGURED','Supabase Data API is not configured.');
  }

  async #request(path,{method='GET',accessToken,body=null,prefer=null}={}){
    this.#assertConfigured();
    if(!accessToken)throw new PublicSaaSError('AUTH_REQUIRED','Authenticated access token is required for database access.');
    const response=await this.fetch(`${this.url}/rest/v1${path}`,{
      method,
      headers:{
        apikey:this.publishableKey,
        Authorization:`Bearer ${accessToken}`,
        ...(body?{'content-type':'application/json'}:{}),
        ...(prefer?{Prefer:prefer}:{}),
      },
      ...(body?{body:JSON.stringify(body)}:{}),
    });
    const raw=await response.text();
    let payload=null;
    if(raw){try{payload=JSON.parse(raw);}catch{payload={message:'Database API returned a non-JSON response.'};}}
    if(!response.ok){
      const message=typeof payload?.message==='string'&&payload.message.length<=240?payload.message:`Database request failed (${response.status}).`;
      throw new PublicSaaSError('DATABASE_REQUEST_FAILED',message,{status:response.status,code_hint:payload?.code??null});
    }
    return payload;
  }

  listWorkspaces(accessToken){
    return this.#request('/workspaces?select=workspace_id,name,status,created_by_user_id,created_at,updated_at&status=eq.ACTIVE&order=created_at.asc',{accessToken});
  }

  listMemberships(accessToken){
    return this.#request('/memberships?select=membership_id,workspace_id,user_id,role,status,created_at,updated_at&status=eq.ACTIVE&order=created_at.asc',{accessToken});
  }

  createWorkspaceWithOwner(accessToken,name){
    const normalized=trim(name);
    if(!normalized)throw new PublicSaaSError('WORKSPACE_NAME_REQUIRED','Workspace name is required.');
    return this.#request('/rpc/create_workspace_with_owner',{method:'POST',accessToken,body:{workspace_name:normalized}});
  }

  listProjects(accessToken,workspaceId){
    const id=assertUuid(workspaceId,'workspace_id');
    const query=new URLSearchParams({
      select:'*',workspace_id:`eq.${id}`,deleted_at:'is.null',order:'updated_at.desc',
    });
    return this.#request(`/projects?${query}`,{accessToken});
  }

  createProject(accessToken,workspaceId,project){
    const id=assertUuid(workspaceId,'workspace_id');
    if(project?.workspace_id&&project.workspace_id!==id)throw new PublicSaaSError('RESOURCE_WORKSPACE_DENIED','Project workspace_id does not match active workspace.');
    return this.#request('/projects',{method:'POST',accessToken,prefer:'return=representation',body:{...project,workspace_id:id}});
  }
}
