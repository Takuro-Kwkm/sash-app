import { ConflictError, NotFoundError, cloneValue, isoNow } from './domain.mjs';

class EntityRepository {
  constructor(store,{collection,idKey,entityName,clock=()=>new Date()}){
    this.store=store;this.collection=collection;this.idKey=idKey;this.entityName=entityName;this.clock=clock;
  }
  async create(entity){
    const {result}=this.store.mutate((db)=>{
      if(db[this.collection].some((row)=>row[this.idKey]===entity[this.idKey]))throw new ConflictError(this.entityName,entity[this.idKey]);
      const saved=cloneValue(entity);db[this.collection].push(saved);return saved;
    });
    return result;
  }
  async get(id,{includeDeleted=false}={}){
    const row=this.store.read()[this.collection].find((item)=>item[this.idKey]===id);
    return row&&(!row.deleted_at||includeDeleted)?cloneValue(row):null;
  }
  async require(id,options){const row=await this.get(id,options);if(!row)throw new NotFoundError(this.entityName,id);return row;}
  async list({includeDeleted=false,predicate=()=>true}={}){
    return this.store.read()[this.collection].filter((row)=>(includeDeleted||!row.deleted_at)&&predicate(row)).map(cloneValue);
  }
  async update(id,patch,{expectedUpdatedAt}={}){
    const {result}=this.store.mutate((db)=>{
      const index=db[this.collection].findIndex((row)=>row[this.idKey]===id);
      if(index<0||db[this.collection][index].deleted_at)throw new NotFoundError(this.entityName,id);
      const current=db[this.collection][index];
      if(expectedUpdatedAt&&current.updated_at!==expectedUpdatedAt)throw new ConflictError(this.entityName,id);
      const updated={...current,...cloneValue(patch),[this.idKey]:id,created_at:current.created_at,updated_at:isoNow(this.clock)};
      db[this.collection][index]=updated;return updated;
    });
    return result;
  }
  async softDelete(id){return this.#deletedAt(id,isoNow(this.clock));}
  async restore(id){return this.#deletedAt(id,null);}
  async #deletedAt(id,deletedAt){
    const {result}=this.store.mutate((db)=>{
      const index=db[this.collection].findIndex((row)=>row[this.idKey]===id);
      if(index<0)throw new NotFoundError(this.entityName,id);
      const updated={...db[this.collection][index],deleted_at:deletedAt,updated_at:isoNow(this.clock)};
      db[this.collection][index]=updated;return updated;
    });
    return result;
  }
}

export class ProjectRepository extends EntityRepository {
  constructor(store,options={}){super(store,{...options,collection:'projects',idKey:'project_id',entityName:'Project'});}
}
export class EstimateRepository extends EntityRepository {
  constructor(store,options={}){super(store,{...options,collection:'estimates',idKey:'estimate_id',entityName:'Estimate'});}
  listByProject(projectId,options={}){return this.list({...options,predicate:(row)=>row.project_id===projectId});}
}
export class OpeningRepository extends EntityRepository {
  constructor(store,options={}){super(store,{...options,collection:'openings',idKey:'opening_id',entityName:'Opening'});}
  async listByEstimate(estimateId,options={}){
    return (await this.list({...options,predicate:(row)=>row.estimate_id===estimateId}))
      .sort((a,b)=>a.sort_order-b.sort_order||a.opening_no-b.opening_no);
  }
  async reorder(estimateId,orderedIds){
    const {result}=this.store.mutate((db)=>{
      const active=db.openings.filter((row)=>row.estimate_id===estimateId&&!row.deleted_at);
      if(active.length!==orderedIds.length||active.some((row)=>!orderedIds.includes(row.opening_id)))throw new ConflictError('OpeningOrder',estimateId);
      const timestamp=isoNow(this.clock);
      for(const [index,id] of orderedIds.entries()){
        const row=db.openings.find((item)=>item.opening_id===id);
        row.sort_order=index;row.opening_no=index+1;row.updated_at=timestamp;
      }
      return db.openings.filter((row)=>row.estimate_id===estimateId&&!row.deleted_at)
        .sort((a,b)=>a.sort_order-b.sort_order).map(cloneValue);
    });
    return result;
  }
}

export function createRepositoryBundle(store,options={}){
  return {
    store,
    projects:new ProjectRepository(store,options),
    estimates:new EstimateRepository(store,options),
    openings:new OpeningRepository(store,options),
  };
}
