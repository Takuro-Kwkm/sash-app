import { ConflictError, NotFoundError, isoNow } from '../work-management/domain.mjs';
import { PublicSaaSError } from './domain.mjs';

function clone(value){
  return globalThis.structuredClone?globalThis.structuredClone(value):JSON.parse(JSON.stringify(value));
}

function requireRow(rows,entity,id){
  const row=Array.isArray(rows)?rows[0]:rows;
  if(!row)throw new NotFoundError(entity,id);
  return clone(row);
}

function contextProvider(source){
  return typeof source==='function'?source:()=>source;
}

class ScopedRepositoryBase {
  constructor(client,getContext,{entity,idKey,clock=()=>new Date()}={}){
    this.client=client;
    this.getContext=contextProvider(getContext);
    this.entity=entity;
    this.idKey=idKey;
    this.clock=clock;
  }

  async context(){
    const value=await this.getContext();
    if(!value?.accessToken)throw new PublicSaaSError('AUTH_REQUIRED','Authenticated access token is required.');
    if(!value?.workspaceId)throw new PublicSaaSError('WORKSPACE_REQUIRED','Active workspace is required.');
    if(!value?.userId)throw new PublicSaaSError('AUTH_PRINCIPAL_INVALID','Authenticated user id is required.');
    return value;
  }

  async resolveUpdate(id,patch,options,update,get){
    const ctx=await this.context();
    const row=await update(ctx,id,patch,options);
    if(row)return clone(row);
    const current=await get(ctx,id,{includeDeleted:true});
    if(!current)throw new NotFoundError(this.entity,id);
    if(options?.expectedUpdatedAt&&current.updated_at!==options.expectedUpdatedAt)throw new ConflictError(this.entity,id);
    throw new ConflictError(this.entity,id);
  }
}

class SupabaseProjectRepository extends ScopedRepositoryBase {
  constructor(client,getContext,options={}){super(client,getContext,{...options,entity:'Project',idKey:'project_id'});}

  async create(entity){
    const ctx=await this.context();
    if(entity?.owner_user_id&&entity.owner_user_id!==ctx.userId){
      throw new PublicSaaSError('RESOURCE_OWNER_DENIED','Project owner_user_id must match the authenticated user.');
    }
    const rows=await this.client.createProject(ctx.accessToken,ctx.workspaceId,{...entity,owner_user_id:ctx.userId});
    return requireRow(rows,'Project',entity?.project_id);
  }

  async get(id,{includeDeleted=false}={}){
    const ctx=await this.context();
    return this.client.getProject(ctx.accessToken,ctx.workspaceId,id,{includeDeleted});
  }

  async require(id,options){const row=await this.get(id,options);if(!row)throw new NotFoundError('Project',id);return clone(row);}

  async list({includeDeleted=false,predicate=()=>true}={}){
    const ctx=await this.context();
    const rows=await this.client.listProjects(ctx.accessToken,ctx.workspaceId,{includeDeleted});
    return rows.filter(predicate).map(clone);
  }

  update(id,patch,options={}){
    return this.resolveUpdate(
      id,patch,options,
      async(ctx,key,data,updateOptions)=>this.client.updateProject(ctx.accessToken,ctx.workspaceId,key,{...data,updated_at:isoNow(this.clock)},updateOptions),
      async(ctx,key,getOptions)=>this.client.getProject(ctx.accessToken,ctx.workspaceId,key,getOptions),
    );
  }

  softDelete(id){return this.update(id,{deleted_at:isoNow(this.clock)});}
  restore(id){return this.update(id,{deleted_at:null});}
}

class SupabaseEstimateRepository extends ScopedRepositoryBase {
  constructor(client,getContext,options={}){super(client,getContext,{...options,entity:'Estimate',idKey:'estimate_id'});}

  async create(entity){
    const ctx=await this.context();
    const rows=await this.client.createEstimate(ctx.accessToken,ctx.workspaceId,entity);
    return requireRow(rows,'Estimate',entity?.estimate_id);
  }

  async get(id,{includeDeleted=false}={}){
    const ctx=await this.context();
    return this.client.getEstimate(ctx.accessToken,ctx.workspaceId,id,{includeDeleted});
  }

  async require(id,options){const row=await this.get(id,options);if(!row)throw new NotFoundError('Estimate',id);return clone(row);}

  async list({includeDeleted=false,predicate=()=>true}={}){
    const ctx=await this.context();
    const projects=await this.client.listProjects(ctx.accessToken,ctx.workspaceId,{includeDeleted:false});
    const rows=(await Promise.all(projects.map((project)=>this.client.listEstimatesByProject(ctx.accessToken,ctx.workspaceId,project.project_id,{includeDeleted})))).flat();
    return rows.filter(predicate).map(clone);
  }

  async listByProject(projectId,{includeDeleted=false,predicate=()=>true}={}){
    const ctx=await this.context();
    const rows=await this.client.listEstimatesByProject(ctx.accessToken,ctx.workspaceId,projectId,{includeDeleted});
    return rows.filter(predicate).map(clone);
  }

  update(id,patch,options={}){
    return this.resolveUpdate(
      id,patch,options,
      async(ctx,key,data,updateOptions)=>this.client.updateEstimate(ctx.accessToken,ctx.workspaceId,key,{...data,updated_at:isoNow(this.clock)},updateOptions),
      async(ctx,key,getOptions)=>this.client.getEstimate(ctx.accessToken,ctx.workspaceId,key,getOptions),
    );
  }

  softDelete(id){return this.update(id,{deleted_at:isoNow(this.clock)});}
  restore(id){return this.update(id,{deleted_at:null});}
}

class SupabaseOpeningRepository extends ScopedRepositoryBase {
  constructor(client,getContext,options={}){super(client,getContext,{...options,entity:'Opening',idKey:'opening_id'});}

  async create(entity){
    const ctx=await this.context();
    const rows=await this.client.createOpening(ctx.accessToken,ctx.workspaceId,entity);
    return requireRow(rows,'Opening',entity?.opening_id);
  }

  async get(id,{includeDeleted=false}={}){
    const ctx=await this.context();
    return this.client.getOpening(ctx.accessToken,ctx.workspaceId,id,{includeDeleted});
  }

  async require(id,options){const row=await this.get(id,options);if(!row)throw new NotFoundError('Opening',id);return clone(row);}

  async list({includeDeleted=false,predicate=()=>true}={}){
    const ctx=await this.context();
    const projects=await this.client.listProjects(ctx.accessToken,ctx.workspaceId,{includeDeleted:false});
    const estimates=(await Promise.all(projects.map((project)=>this.client.listEstimatesByProject(ctx.accessToken,ctx.workspaceId,project.project_id,{includeDeleted:false})))).flat();
    const rows=(await Promise.all(estimates.map((estimate)=>this.client.listOpeningsByEstimate(ctx.accessToken,ctx.workspaceId,estimate.estimate_id,{includeDeleted})))).flat();
    return rows.filter(predicate).sort((a,b)=>a.sort_order-b.sort_order||a.opening_no-b.opening_no).map(clone);
  }

  async listByEstimate(estimateId,{includeDeleted=false,predicate=()=>true}={}){
    const ctx=await this.context();
    const rows=await this.client.listOpeningsByEstimate(ctx.accessToken,ctx.workspaceId,estimateId,{includeDeleted});
    return rows.filter(predicate).sort((a,b)=>a.sort_order-b.sort_order||a.opening_no-b.opening_no).map(clone);
  }

  update(id,patch,options={}){
    return this.resolveUpdate(
      id,patch,options,
      async(ctx,key,data,updateOptions)=>this.client.updateOpening(ctx.accessToken,ctx.workspaceId,key,{...data,updated_at:isoNow(this.clock)},updateOptions),
      async(ctx,key,getOptions)=>this.client.getOpening(ctx.accessToken,ctx.workspaceId,key,getOptions),
    );
  }

  softDelete(id){return this.update(id,{deleted_at:isoNow(this.clock)});}
  restore(id){return this.update(id,{deleted_at:null});}

  async reorder(estimateId,orderedIds){
    const current=await this.listByEstimate(estimateId);
    if(current.length!==orderedIds.length||current.some((row)=>!orderedIds.includes(row.opening_id))){
      throw new ConflictError('OpeningOrder',estimateId);
    }
    const ctx=await this.context();
    const timestamp=isoNow(this.clock);
    const updated=await Promise.all(orderedIds.map(async(id,index)=>{
      const row=await this.client.updateOpening(ctx.accessToken,ctx.workspaceId,id,{sort_order:index,opening_no:index+1,updated_at:timestamp});
      if(!row)throw new ConflictError('OpeningOrder',estimateId);
      return row;
    }));
    return updated.sort((a,b)=>a.sort_order-b.sort_order).map(clone);
  }
}

export function createSupabaseRepositoryBundle(client,getContext,options={}){
  if(!client)throw new PublicSaaSError('DATABASE_NOT_CONFIGURED','Supabase Data API client is required.');
  return {
    store:null,
    projects:new SupabaseProjectRepository(client,getContext,options),
    estimates:new SupabaseEstimateRepository(client,getContext,options),
    openings:new SupabaseOpeningRepository(client,getContext,options),
  };
}
