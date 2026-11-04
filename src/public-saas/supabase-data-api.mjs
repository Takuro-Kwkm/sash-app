import { PublicSaaSError } from './domain.mjs';

const trim=(value)=>String(value??'').trim();
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertUuid(value,name){
  if(!UUID.test(String(value??'')))throw new PublicSaaSError('DATA_SCOPE_INVALID',`${name} must be a UUID.`);
  return String(value);
}

function assertId(value,name){
  const normalized=trim(value);
  if(!normalized)throw new PublicSaaSError('DATA_ID_REQUIRED',`${name} is required.`);
  return normalized;
}

function assertWorkspaceMatch(resource,workspaceId,resourceName){
  if(resource?.workspace_id&&resource.workspace_id!==workspaceId){
    throw new PublicSaaSError('RESOURCE_WORKSPACE_DENIED',`${resourceName} workspace_id does not match active workspace.`);
  }
}

function mutablePatch(patch,identityKeys){
  const next={...(patch??{})};
  for(const key of identityKeys)delete next[key];
  return next;
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

  listProjects(accessToken,workspaceId,{includeDeleted=false}={}){
    const id=assertUuid(workspaceId,'workspace_id');
    const query=new URLSearchParams({select:'*',workspace_id:`eq.${id}`,order:'updated_at.desc'});
    if(!includeDeleted)query.set('deleted_at','is.null');
    return this.#request(`/projects?${query}`,{accessToken});
  }

  async getProject(accessToken,workspaceId,projectId,{includeDeleted=false}={}){
    const id=assertUuid(workspaceId,'workspace_id');
    const project=assertId(projectId,'project_id');
    const query=new URLSearchParams({select:'*',workspace_id:`eq.${id}`,project_id:`eq.${project}`,limit:'1'});
    if(!includeDeleted)query.set('deleted_at','is.null');
    const rows=await this.#request(`/projects?${query}`,{accessToken});
    return rows?.[0]??null;
  }

  createProject(accessToken,workspaceId,project){
    const id=assertUuid(workspaceId,'workspace_id');
    assertWorkspaceMatch(project,id,'Project');
    return this.#request('/projects',{method:'POST',accessToken,prefer:'return=representation',body:{...project,workspace_id:id}});
  }

  async updateProject(accessToken,workspaceId,projectId,patch,{expectedUpdatedAt}={}){
    const id=assertUuid(workspaceId,'workspace_id');
    const project=assertId(projectId,'project_id');
    assertWorkspaceMatch(patch,id,'Project');
    const query=new URLSearchParams({workspace_id:`eq.${id}`,project_id:`eq.${project}`});
    if(expectedUpdatedAt)query.set('updated_at',`eq.${expectedUpdatedAt}`);
    const rows=await this.#request(`/projects?${query}`,{
      method:'PATCH',accessToken,prefer:'return=representation',
      body:mutablePatch(patch,['project_id','workspace_id']),
    });
    return rows?.[0]??null;
  }

  listEstimatesByProject(accessToken,workspaceId,projectId,{includeDeleted=false}={}){
    const id=assertUuid(workspaceId,'workspace_id');
    const project=assertId(projectId,'project_id');
    const query=new URLSearchParams({select:'*',workspace_id:`eq.${id}`,project_id:`eq.${project}`,order:'estimate_no.asc,revision_no.asc'});
    if(!includeDeleted)query.set('deleted_at','is.null');
    return this.#request(`/estimates?${query}`,{accessToken});
  }

  async getEstimate(accessToken,workspaceId,estimateId,{includeDeleted=false}={}){
    const id=assertUuid(workspaceId,'workspace_id');
    const estimate=assertId(estimateId,'estimate_id');
    const query=new URLSearchParams({select:'*',workspace_id:`eq.${id}`,estimate_id:`eq.${estimate}`,limit:'1'});
    if(!includeDeleted)query.set('deleted_at','is.null');
    const rows=await this.#request(`/estimates?${query}`,{accessToken});
    return rows?.[0]??null;
  }

  createEstimate(accessToken,workspaceId,estimate){
    const id=assertUuid(workspaceId,'workspace_id');
    assertWorkspaceMatch(estimate,id,'Estimate');
    return this.#request('/estimates',{method:'POST',accessToken,prefer:'return=representation',body:{...estimate,workspace_id:id}});
  }

  async updateEstimate(accessToken,workspaceId,estimateId,patch,{expectedUpdatedAt}={}){
    const id=assertUuid(workspaceId,'workspace_id');
    const estimate=assertId(estimateId,'estimate_id');
    assertWorkspaceMatch(patch,id,'Estimate');
    const query=new URLSearchParams({workspace_id:`eq.${id}`,estimate_id:`eq.${estimate}`});
    if(expectedUpdatedAt)query.set('updated_at',`eq.${expectedUpdatedAt}`);
    const rows=await this.#request(`/estimates?${query}`,{
      method:'PATCH',accessToken,prefer:'return=representation',
      body:mutablePatch(patch,['estimate_id','workspace_id']),
    });
    return rows?.[0]??null;
  }

  listOpeningsByEstimate(accessToken,workspaceId,estimateId,{includeDeleted=false}={}){
    const id=assertUuid(workspaceId,'workspace_id');
    const estimate=assertId(estimateId,'estimate_id');
    const query=new URLSearchParams({select:'*',workspace_id:`eq.${id}`,estimate_id:`eq.${estimate}`,order:'sort_order.asc,opening_no.asc'});
    if(!includeDeleted)query.set('deleted_at','is.null');
    return this.#request(`/openings?${query}`,{accessToken});
  }

  async getOpening(accessToken,workspaceId,openingId,{includeDeleted=false}={}){
    const id=assertUuid(workspaceId,'workspace_id');
    const opening=assertId(openingId,'opening_id');
    const query=new URLSearchParams({select:'*',workspace_id:`eq.${id}`,opening_id:`eq.${opening}`,limit:'1'});
    if(!includeDeleted)query.set('deleted_at','is.null');
    const rows=await this.#request(`/openings?${query}`,{accessToken});
    return rows?.[0]??null;
  }

  createOpening(accessToken,workspaceId,opening){
    const id=assertUuid(workspaceId,'workspace_id');
    assertWorkspaceMatch(opening,id,'Opening');
    return this.#request('/openings',{method:'POST',accessToken,prefer:'return=representation',body:{...opening,workspace_id:id}});
  }

  async updateOpening(accessToken,workspaceId,openingId,patch,{expectedUpdatedAt}={}){
    const id=assertUuid(workspaceId,'workspace_id');
    const opening=assertId(openingId,'opening_id');
    assertWorkspaceMatch(patch,id,'Opening');
    const query=new URLSearchParams({workspace_id:`eq.${id}`,opening_id:`eq.${opening}`});
    if(expectedUpdatedAt)query.set('updated_at',`eq.${expectedUpdatedAt}`);
    const rows=await this.#request(`/openings?${query}`,{
      method:'PATCH',accessToken,prefer:'return=representation',
      body:mutablePatch(patch,['opening_id','workspace_id']),
    });
    return rows?.[0]??null;
  }
}
