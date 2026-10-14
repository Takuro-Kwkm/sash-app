import {createHash} from 'node:crypto';
import {createRecoveryRequestHandler,releaseBuildMetadata} from './recovery-app.mjs';
import {candidateRuntimeEntries,readCandidateModule} from '../catalog/runtime-master/candidate-runtime-registry.mjs';
import {adaptComposedProductRuntime,resolveMigratedCandidateSelection} from '../catalog/runtime-master/composed-product-runtime-adapter.mjs';
import {runtimeMasterInventory,loadRegisteredRuntime} from '../catalog/runtime-master/runtime-master-registry.mjs';
import {runtimeAppIntegrationInventory,getRuntimeAppIntegration} from '../catalog/runtime-master/runtime-app-bridge.mjs';
import {applyDeclaredWindowFlow} from '../catalog/runtime-master/declared-window-flow.mjs';

export function createCandidateRuntimePreview(){
  if(!candidateRuntimeEntries.length)throw new Error('CANDIDATE_INDEX_REQUIRED');
  const identity=createHash('sha256').update(JSON.stringify(candidateRuntimeEntries.map(r=>[r.id,r.sha256,r.uiFlowContract,r.productSelectionGroup??null,r.candidateRuntimeReference.indexSha256]))).digest('hex');
  const integrations=candidateRuntimeEntries.map(row=>({...row,status:'CANDIDATE_LOCAL_READY',selectable:true,source:'RUNTIME_MASTER',candidateOnly:true}));
  const base=createRecoveryRequestHandler({backend:'node:http isolated candidate preview',entrypoint:'scripts/start-candidate-runtime.mjs'});
  const adapters=new Map();
  const loadReference=async productId=>{
    const reference=getRuntimeAppIntegration(productId);
    if(!reference)throw Object.assign(new Error('REFERENCE_RUNTIME_NOT_REGISTERED'),{code:'REFERENCE_RUNTIME_NOT_REGISTERED'});
    return loadRegisteredRuntime(reference.manufacturer,reference.series);
  };
  const json=(res,status,body)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-sash-candidate-identity':identity});res.end(JSON.stringify(body));};
  return async(req,res)=>{
    const url=new URL(req.url,'http://127.0.0.1');
    if(url.pathname==='/api/health'||url.pathname==='/health')return json(res,200,{ok:true,...releaseBuildMetadata,buildId:'CANDIDATE-'+identity.slice(0,16),entrypoint:'scripts/start-candidate-runtime.mjs',backend:'node:http isolated candidate preview',frontendRoot:'src/ui/web',candidateIdentity:identity,formalAdoption:false,release:false,inventory:[],runtimeMasterIntegrations:[...runtimeAppIntegrationInventory(),...integrations]});
    if(url.pathname==='/api/runtime-master/integrations')return json(res,200,[...runtimeAppIntegrationInventory(),...integrations]);
    if(url.pathname==='/api/runtime-master/resolve'){
      const entry=candidateRuntimeEntries.find(r=>r.id===url.searchParams.get('productId'));
      if(entry){
        try{
          // Recheck complete candidate bytes on every request, including cached readers.
          const doc=readCandidateModule(entry);
          if(!adapters.has(entry.id))adapters.set(entry.id,await adaptComposedProductRuntime(doc,entry,loadReference));
          const input=JSON.parse(url.searchParams.get('selection')??'{}'),version=url.searchParams.get('configurationVersion');
          const legacy=Boolean(version&&version!==entry.packageVersion);
          const reader=adapters.get(entry.id);
          const result=legacy?resolveMigratedCandidateSelection(reader,input,doc.selection_migrations):reader.uiResolver(input);
          if(legacy&&Object.hasOwn(input,'glass')){
            result.configurationMigration={from:version,to:entry.packageVersion,originalSelection:input};
            result.manualWarnings.push('保存済みのガラス選択を項目の意味に沿って整理しました。ガラスの種類・詳細・ガス・スペーサーを確認してください。');
          }
          return json(res,200,{...result,productId:entry.id,manufacturer:entry.manufacturer,series:entry.series,source:'RUNTIME_MASTER',status:'CANDIDATE_LOCAL_READY',fields:applyDeclaredWindowFlow(result.fields,entry)});
        }catch(error){return json(res,400,{code:error.code??'CANDIDATE_RESOLVE_FAILED',error:error.message});}
      }
    }
    return base(req,res);
  };
}
