import {
  OpeningStatus, ProjectStatus, ValidationState, cloneValue,
  createEstimate, createOpening, createProject, newId,
} from './domain.mjs';

export class WorkManagementService {
  constructor(repositories,{clock=()=>new Date(),uuid}={}){this.repositories=repositories;this.clock=clock;this.uuid=uuid;}
  id(prefix){return newId(prefix,this.uuid);}

  async listProjects({includeArchived=false}={}){
    const projects=(await this.repositories.projects.list({predicate:(row)=>includeArchived||row.status!==ProjectStatus.ARCHIVED})).sort((a,b)=>b.updated_at.localeCompare(a.updated_at));
    return Promise.all(projects.map(async(project)=>{
      const estimates=await this.repositories.estimates.listByProject(project.project_id);
      const openings=(await Promise.all(estimates.map((row)=>this.repositories.openings.listByEstimate(row.estimate_id)))).flat();
      const currentEstimate=estimates.sort((a,b)=>b.updated_at.localeCompare(a.updated_at))[0]??null;
      return {...project,estimate_count:estimates.length,opening_count:openings.length,estimate_status:currentEstimate?.status??null};
    }));
  }

  async createProject(data){
    const project=createProject(data,{clock:this.clock,id:this.id('prj')});
    await this.repositories.projects.create(project);
    const estimate=createEstimate(project.project_id,{estimate_no:1,revision_no:0,estimate_title:'初回見積'},{clock:this.clock,id:this.id('est')});
    await this.repositories.estimates.create(estimate);
    return {project,estimate};
  }
  updateProject(id,patch,options){return this.repositories.projects.update(id,patch,options);}
  archiveProject(id){return this.repositories.projects.update(id,{status:ProjectStatus.ARCHIVED});}
  restoreProject(id){return this.repositories.projects.update(id,{status:ProjectStatus.ACTIVE});}

  async getProjectDetail(projectId){
    const project=await this.repositories.projects.require(projectId);
    const estimates=await this.repositories.estimates.listByProject(projectId);
    const rows=await Promise.all(estimates.sort((a,b)=>a.estimate_no-b.estimate_no).map(async estimate=>({
      ...estimate,opening_count:(await this.repositories.openings.listByEstimate(estimate.estimate_id)).length,
    })));
    return {project,estimates:rows};
  }

  async createEstimate(projectId,data={}){
    await this.repositories.projects.require(projectId);
    const existing=await this.repositories.estimates.listByProject(projectId);
    const estimate=createEstimate(projectId,{...data,estimate_no:existing.length+1},{clock:this.clock,id:this.id('est')});
    return this.repositories.estimates.create(estimate);
  }

  async getEstimateDetail(projectId,estimateId){
    const project=await this.repositories.projects.require(projectId);
    const estimate=await this.repositories.estimates.require(estimateId);
    if(estimate.project_id!==projectId)throw new Error('Estimate does not belong to Project');
    const openings=await this.repositories.openings.listByEstimate(estimateId);
    return {project,estimate,openings};
  }

  async createOpening(projectId,estimateId,data={}){
    await this.getEstimateDetail(projectId,estimateId);
    const existing=await this.repositories.openings.listByEstimate(estimateId);
    const opening=createOpening(estimateId,{...data,opening_no:existing.length+1,sort_order:existing.length},{clock:this.clock,id:this.id('opn')});
    return this.repositories.openings.create(opening);
  }

  async updateOpening(projectId,estimateId,openingId,patch,options){
    await this.getEstimateDetail(projectId,estimateId);
    const current=await this.repositories.openings.require(openingId);
    if(current.estimate_id!==estimateId)throw new Error('Opening does not belong to Estimate');
    const hasSnapshot=Object.prototype.hasOwnProperty.call(patch,'product_configuration_snapshot');
    const snapshot=patch.product_configuration_snapshot;
    const status=hasSnapshot?(snapshot?.validation_state===ValidationState.VALID?OpeningStatus.COMPLETE:OpeningStatus.DRAFT):current.status;
    return this.repositories.openings.update(openingId,{...patch,status},options);
  }

  async duplicateOpening(projectId,estimateId,openingId){
    await this.getEstimateDetail(projectId,estimateId);
    const source=await this.repositories.openings.require(openingId);
    if(source.estimate_id!==estimateId)throw new Error('Opening does not belong to Estimate');
    const openings=await this.repositories.openings.listByEstimate(estimateId);
    const duplicate=createOpening(estimateId,{
      opening_no:openings.length+1,sort_order:openings.length,
      room_name:source.room_name,location:source.location,opening_name:source.opening_name?`${source.opening_name}（複製）`:null,
      memo:source.memo,status:source.status,product_configuration_snapshot:cloneValue(source.product_configuration_snapshot),
    },{clock:this.clock,id:this.id('opn')});
    return this.repositories.openings.create(duplicate);
  }

  async moveOpening(projectId,estimateId,openingId,direction){
    await this.getEstimateDetail(projectId,estimateId);
    const openings=await this.repositories.openings.listByEstimate(estimateId);
    const index=openings.findIndex((row)=>row.opening_id===openingId);
    const target=direction==='up'?index-1:index+1;
    if(index<0||target<0||target>=openings.length)return openings;
    [openings[index],openings[target]]=[openings[target],openings[index]];
    return this.repositories.openings.reorder(estimateId,openings.map((row)=>row.opening_id));
  }

  async softDeleteOpening(projectId,estimateId,openingId){
    await this.getEstimateDetail(projectId,estimateId);
    const opening=await this.repositories.openings.require(openingId);
    if(opening.estimate_id!==estimateId)throw new Error('Opening does not belong to Estimate');
    const deleted=await this.repositories.openings.softDelete(openingId);
    const remaining=await this.repositories.openings.listByEstimate(estimateId);
    await this.repositories.openings.reorder(estimateId,remaining.map((row)=>row.opening_id));
    return deleted;
  }

  async restoreOpening(projectId,estimateId,openingId){
    await this.getEstimateDetail(projectId,estimateId);
    const opening=await this.repositories.openings.require(openingId,{includeDeleted:true});
    if(opening.estimate_id!==estimateId)throw new Error('Opening does not belong to Estimate');
    await this.repositories.openings.restore(openingId);
    const active=await this.repositories.openings.listByEstimate(estimateId);
    return this.repositories.openings.reorder(estimateId,active.map((row)=>row.opening_id));
  }
}
