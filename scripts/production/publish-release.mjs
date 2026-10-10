// The actual Sash publication entry. It validates fresh per-product Shared CLI
// results, then delegates one provider operation to the existing Shared host.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createInterface} from 'node:readline';

const root=resolve(new URL('../..',import.meta.url).pathname);
const option=name=>{const i=process.argv.indexOf(name);if(i<0||!process.argv[i+1])throw new Error('ARGUMENT_REQUIRED:'+name);return resolve(process.argv[i+1]);};
const digest=b=>createHash('sha256').update(b).digest('hex');
const json=async p=>JSON.parse(await readFile(p,'utf8'));
async function main() {
  const central=option('--central'),packet=await json(option('--packet')),operationDir=option('--operation-dir');
  if(packet.schema!=='SASH_BATCH_PUBLICATION_REQUEST_V1'||!Array.isArray(packet.members))throw new Error('PUBLICATION_PACKET_REQUIRED');
  const reg=await json(resolve(root,'contracts/production/release-profiles.v1.json'));
  const profiles=await Promise.all(reg.profiles.map(async e=>({entry:e,profile:await json(resolve(root,e.path))})));
  const sharedRef=execFileSync('git',['rev-parse','HEAD'],{cwd:central,encoding:'utf8'}).trim();
  for(const {profile} of profiles) {
    if(profile.shared_contract.ref!==sharedRef)throw new Error('SHARED_IMPLEMENTATION_SHA_MISMATCH');
    for(const file of ['scripts/release-provider-host.mjs','harness/release_publication.py']) {
      if(digest(await readFile(resolve(central,file)))!==profile.shared_contract.files[file])throw new Error('SHARED_BYTES_DRIFT:'+file);
    }
  }
  const {publishBatch}=await import(pathToFileURL(resolve(central,'scripts/release-provider-host.mjs')));
  const profileById=new Map(profiles.map(p=>[p.entry.product_id,p]));
  const connectorBridge=process.argv.includes('--connector-bridge');
  const lines=connectorBridge?createInterface({input:process.stdin}):null;
  const replies=lines?.[Symbol.asyncIterator]();let sequence=0;
  const api=async(request,method='GET',body)=>{
    if(connectorBridge){
      const id=++sequence;
      console.log('ORDER5_PROVIDER_BRIDGE_REQUEST='+JSON.stringify({id,request,method,body}));
      const line=await replies.next();if(line.done)throw new Error('CONNECTOR_REPLY_REQUIRED');
      const reply=JSON.parse(line.value);if(reply.id!==id||reply.status!=='PASS')throw new Error('CONNECTOR_REPLY_FAILED');
      return reply.value;
    }
    const token=process.env.VERCEL_TOKEN_EFFECTIVE;
    if(!token)throw new Error('VERCEL_CREDENTIAL_UNAVAILABLE');
    const response=await fetch('https://api.vercel.com'+request,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
    const raw=await response.json();if(!response.ok)throw new Error('PROVIDER_HTTP_'+response.status);return raw;
  };
  const operationPath=key=>resolve(operationDir,digest(key)+'.json');
  const readOperation=async key=>{try{return await json(operationPath(key));}catch(e){if(e.code==='ENOENT')return null;throw e;}};
  const save=async(key,value)=>{await mkdir(operationDir,{recursive:true});await writeFile(operationPath(key),JSON.stringify(value,null,2)+'\n',{mode:0o600});return {status:'PASS'};};
  let result;try { result=await publishBatch(packet,{
    requiredScopes:async()=>reg.profiles.map(({product_id,scope})=>({product_id,scope})),
    validate:async member=>{
      const {entry}=profileById.get(member.product_id)??{};
      if(!entry||entry.scope!==member.scope)throw new Error('UNADMITTED_PRODUCT_SCOPE');
      const flags=['authorize-publication','--profile',resolve(root,entry.path),'--native',root];
      for(const key of ['binding','observations','publication','work']){
        if(typeof member[key]!=='string')throw new Error('MISSING_PRODUCT_GATE_INPUT:'+key);
        flags.push('--'+key,resolve(member[key]));
      }
      const child=spawnSync(process.env.PYTHON??'python3',['-B',resolve(root,'scripts/production/release-batch.py'),'--central',central,'--product',member.product_id,'--',...flags],{cwd:root,encoding:'utf8'});
      let gate;try{gate=JSON.parse(child.stdout);}catch{throw new Error('INVALID_SHARED_CLI_RESULT');}
      if(child.status!==0||gate.cli?.exit_code!==child.status)return {...gate,status:'BLOCKED'};
      return gate;
    },readOperation,saveIntent:save,saveReceipt:save,
    inspect:async r=>{
      const target=profiles[0].profile.destination;
      const alias=new URL(target.alias).hostname;
      const q='?teamId='+encodeURIComponent(r.team_id);
      const [project,deployment,aliasObservation]=await Promise.all([api('/v9/projects/'+r.project_id+q),api('/v13/deployments/'+r.deployment_id+q),api('/v4/aliases/'+alias+q)]);
      return {project,deployment,alias:aliasObservation};
    },
    promote:async r=>({isError:false,result:await api('/v10/projects/'+r.project_id+'/promote/'+r.deployment_id+'?teamId='+encodeURIComponent(r.team_id),'POST',{})}),
  });
  } finally { lines?.close(); }
  console.log(JSON.stringify(result));process.exitCode=['PROVIDER_RETURNED','PASS'].includes(result.status)?0:2;
}
main().catch(e=>{console.log(JSON.stringify({status:'FAIL_CLOSED',error:e.message,external_operations:0,publication:'NOT_EXECUTED'}));process.exitCode=2;});
