import test from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseRepositoryBundle } from '../src/public-saas/supabase-work-repositories.mjs';
import { WorkManagementService } from '../src/work-management/service.mjs';

const workspaceId='11111111-1111-4111-8111-111111111111';
const userId='22222222-2222-4222-8222-222222222222';
const context={accessToken:'access-token',workspaceId,userId};

function createFakeClient(){
  const calls=[];
  const state={projects:[],estimates:[],openings:[]};
  const one=(rows,key,id)=>rows.find((row)=>row[key]===id)??null;
  return {
    calls,state,
    async listProjects(token,workspace,options={}){calls.push(['listProjects',token,workspace,options]);return state.projects.filter((row)=>row.workspace_id===workspace&&(options.includeDeleted||!row.deleted_at));},
    async getProject(token,workspace,id,options={}){calls.push(['getProject',token,workspace,id,options]);const row=one(state.projects,'project_id',id);return row?.workspace_id===workspace&&(options.includeDeleted||!row.deleted_at)?structuredClone(row):null;},
    async createProject(token,workspace,row){calls.push(['createProject',token,workspace,structuredClone(row)]);const saved={...structuredClone(row),workspace_id:workspace};state.projects.push(saved);return [structuredClone(saved)];},
    async updateProject(token,workspace,id,patch,options={}){calls.push(['updateProject',token,workspace,id,structuredClone(patch),options]);const row=one(state.projects,'project_id',id);if(!row||row.workspace_id!==workspace)return null;if(options.expectedUpdatedAt&&row.updated_at!==options.expectedUpdatedAt)return null;Object.assign(row,structuredClone(patch));return structuredClone(row);},
    async listEstimatesByProject(token,workspace,projectId,options={}){calls.push(['listEstimatesByProject',token,workspace,projectId,options]);return state.estimates.filter((row)=>row.workspace_id===workspace&&row.project_id===projectId&&(options.includeDeleted||!row.deleted_at)).map((row)=>structuredClone(row));},
    async getEstimate(token,workspace,id,options={}){calls.push(['getEstimate',token,workspace,id,options]);const row=one(state.estimates,'estimate_id',id);return row?.workspace_id===workspace&&(options.includeDeleted||!row.deleted_at)?structuredClone(row):null;},
    async createEstimate(token,workspace,row){calls.push(['createEstimate',token,workspace,structuredClone(row)]);const saved={...structuredClone(row),workspace_id:workspace};state.estimates.push(saved);return [structuredClone(saved)];},
    async updateEstimate(token,workspace,id,patch,options={}){calls.push(['updateEstimate',token,workspace,id,structuredClone(patch),options]);const row=one(state.estimates,'estimate_id',id);if(!row||row.workspace_id!==workspace)return null;if(options.expectedUpdatedAt&&row.updated_at!==options.expectedUpdatedAt)return null;Object.assign(row,structuredClone(patch));return structuredClone(row);},
    async listOpeningsByEstimate(token,workspace,estimateId,options={}){calls.push(['listOpeningsByEstimate',token,workspace,estimateId,options]);return state.openings.filter((row)=>row.workspace_id===workspace&&row.estimate_id===estimateId&&(options.includeDeleted||!row.deleted_at)).map((row)=>structuredClone(row));},
    async getOpening(token,workspace,id,options={}){calls.push(['getOpening',token,workspace,id,options]);const row=one(state.openings,'opening_id',id);return row?.workspace_id===workspace&&(options.includeDeleted||!row.deleted_at)?structuredClone(row):null;},
    async createOpening(token,workspace,row){calls.push(['createOpening',token,workspace,structuredClone(row)]);const saved={...structuredClone(row),workspace_id:workspace};state.openings.push(saved);return [structuredClone(saved)];},
    async updateOpening(token,workspace,id,patch,options={}){calls.push(['updateOpening',token,workspace,id,structuredClone(patch),options]);const row=one(state.openings,'opening_id',id);if(!row||row.workspace_id!==workspace)return null;if(options.expectedUpdatedAt&&row.updated_at!==options.expectedUpdatedAt)return null;Object.assign(row,structuredClone(patch));return structuredClone(row);},
  };
}

test('Supabase repository injects authenticated user and active workspace into Project persistence',async()=>{
  const client=createFakeClient();
  const repositories=createSupabaseRepositoryBundle(client,context,{clock:()=>new Date('2026-09-10T08:00:00.000Z')});
  const project=await repositories.projects.create({project_id:'prj_1',project_name:'現場A',owner_user_id:null,workspace_id:null,created_at:'2026-09-10T07:00:00.000Z',updated_at:'2026-09-10T07:00:00.000Z',deleted_at:null});
  assert.equal(project.workspace_id,workspaceId);
  assert.equal(project.owner_user_id,userId);
  const call=client.calls.find(([name])=>name==='createProject');
  assert.equal(call[2],workspaceId);
  assert.equal(call[3].owner_user_id,userId);
});

test('Supabase repository rejects a Project owner different from authenticated user before persistence',async()=>{
  const client=createFakeClient();
  const repositories=createSupabaseRepositoryBundle(client,context);
  await assert.rejects(()=>repositories.projects.create({project_id:'prj_bad',project_name:'bad',owner_user_id:'33333333-3333-4333-8333-333333333333'}),{code:'RESOURCE_OWNER_DENIED'});
  assert.equal(client.calls.length,0);
});

test('WorkManagementService can create Project and initial Estimate through Supabase repository bundle',async()=>{
  const client=createFakeClient();
  const repositories=createSupabaseRepositoryBundle(client,context,{clock:()=>new Date('2026-09-10T08:00:00.000Z')});
  const service=new WorkManagementService(repositories,{clock:()=>new Date('2026-09-10T08:00:00.000Z'),uuid:()=> '00000000-0000-4000-8000-000000000001'});
  const {project,estimate}=await service.createProject({project_name:'クラウド案件'});
  assert.equal(project.workspace_id,null,'domain object stays provider independent before persistence');
  assert.equal(estimate.workspace_id,undefined,'estimate domain object stays provider independent before persistence');
  assert.equal(client.state.projects[0].workspace_id,workspaceId);
  assert.equal(client.state.projects[0].owner_user_id,userId);
  assert.equal(client.state.estimates[0].workspace_id,workspaceId);
  assert.equal(client.state.estimates[0].project_id,project.project_id);
});

test('expectedUpdatedAt mismatch is surfaced as UPDATE_CONFLICT',async()=>{
  const client=createFakeClient();
  client.state.projects.push({project_id:'prj_conflict',workspace_id:workspaceId,owner_user_id:userId,project_name:'latest',created_at:'2026-09-10T07:00:00.000Z',updated_at:'2026-09-10T07:30:00.000Z',deleted_at:null});
  const repositories=createSupabaseRepositoryBundle(client,context,{clock:()=>new Date('2026-09-10T08:00:00.000Z')});
  await assert.rejects(()=>repositories.projects.update('prj_conflict',{project_name:'stale'},{expectedUpdatedAt:'2026-09-10T07:00:00.000Z'}),{code:'UPDATE_CONFLICT'});
  assert.equal(client.state.projects[0].project_name,'latest');
});

test('opening reorder remains scoped and persists deterministic opening numbers',async()=>{
  const client=createFakeClient();
  client.state.openings.push(
    {opening_id:'opn_1',workspace_id:workspaceId,estimate_id:'est_1',opening_no:1,sort_order:0,updated_at:'2026-09-10T07:00:00.000Z',deleted_at:null},
    {opening_id:'opn_2',workspace_id:workspaceId,estimate_id:'est_1',opening_no:2,sort_order:1,updated_at:'2026-09-10T07:00:00.000Z',deleted_at:null},
  );
  const repositories=createSupabaseRepositoryBundle(client,context,{clock:()=>new Date('2026-09-10T08:00:00.000Z')});
  const rows=await repositories.openings.reorder('est_1',['opn_2','opn_1']);
  assert.deepEqual(rows.map((row)=>[row.opening_id,row.opening_no,row.sort_order]),[['opn_2',1,0],['opn_1',2,1]]);
  const updateCalls=client.calls.filter(([name])=>name==='updateOpening');
  assert.equal(updateCalls.length,2);
  assert.ok(updateCalls.every((call)=>call[2]===workspaceId));
});
