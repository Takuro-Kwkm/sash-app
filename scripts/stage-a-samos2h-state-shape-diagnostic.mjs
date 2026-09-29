import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const SOURCE = new URL('./stage-a-samos-conflict-graph-v4.mjs', import.meta.url);
const GENERATED = new URL('./.stage-a-samos2h-state-shape.generated.mjs', import.meta.url);
let source = await readFile(SOURCE, 'utf8');

function replaceOnce(label,before,after){
  const first=source.indexOf(before);
  if(first<0)throw new Error(`state-shape patch anchor missing: ${label}`);
  if(source.indexOf(before,first+before.length)>=0)throw new Error(`state-shape patch anchor not unique: ${label}`);
  source=source.slice(0,first)+after+source.slice(first+before.length);
}

replaceOnce(
  'output env',
  "const OUT = process.env.STAGE_A_SAMOS_V4_OUT ?? 'artifacts/stage-a-samos-conflict-graph-v4';",
  "const OUT = process.env.STAGE_A_SAMOS_STATE_SHAPE_OUT ?? 'artifacts/stage-a-samos2h-state-shape';",
);

replaceOnce(
  'diagnostic counters',
  "  let calls=1,states=0,hits=0,maxDepth=0,blocker=null,terminalAuditHits=0,terminalAuditMisses=0,terminalAuditChecks=0;\n  const memo=new Map(),inProgress=new Set(),terminalAuditCache=new Map();",
  `  let calls=1,states=0,hits=0,maxDepth=0,blocker=null,terminalAuditHits=0,terminalAuditMisses=0,terminalAuditChecks=0;
  const memo=new Map(),inProgress=new Set(),terminalAuditCache=new Map();
  const fieldDiagnostics=new Map();
  const recordField=(field,depth)=>{
    const row=fieldDiagnostics.get(field?.key??'$terminal')??{visits:0,branch_total:0,branch_max:0,branch_min:null,depth_min:null,depth_max:0,data_type:field?.dataType??null,required_count:0};
    const branches=field?enabled(field).length+(field.required?0:1):0;
    row.visits+=1;row.branch_total+=branches;row.branch_max=Math.max(row.branch_max,branches);row.branch_min=row.branch_min===null?branches:Math.min(row.branch_min,branches);row.depth_min=row.depth_min===null?depth:Math.min(row.depth_min,depth);row.depth_max=Math.max(row.depth_max,depth);if(field?.required)row.required_count+=1;
    fieldDiagnostics.set(field?.key??'$terminal',row);
  };`,
);

replaceOnce(
  'record next field',
  "    const f=nextField(result,done);\n    if(!f){",
  "    const f=nextField(result,done);\n    recordField(f,depth);\n    if(!f){",
);

replaceOnce(
  'evidence diagnostics',
  "    terminal_audit_cache_size:terminalAuditCache.size,terminal_audit_cache_hits:terminalAuditHits,terminal_audit_cache_misses:terminalAuditMisses,terminal_audit_checks:terminalAuditChecks,",
  "    terminal_audit_cache_size:terminalAuditCache.size,terminal_audit_cache_hits:terminalAuditHits,terminal_audit_cache_misses:terminalAuditMisses,terminal_audit_checks:terminalAuditChecks,field_diagnostics:Object.fromEntries([...fieldDiagnostics.entries()].map(([key,value])=>[key,{...value,branch_avg:value.visits?value.branch_total/value.visits:0}])),",
);

source=source.replaceAll("count_model_version:'SAMOS_RESOLVER_CONTRACT_CONFLICT_GRAPH_V4'","count_model_version:'SAMOS2H_STATE_SHAPE_DIAGNOSTIC_V1'");
source=source.replaceAll("count_model_version:'SAMOS_RESOLVER_CONTRACT_CONFLICT_GRAPH_V4',","count_model_version:'SAMOS2H_STATE_SHAPE_DIAGNOSTIC_V1',");

await writeFile(GENERATED,source,'utf8');
const child=spawn(process.execPath,[GENERATED.pathname],{stdio:'inherit',env:process.env});
const exitCode=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',(code,signal)=>signal?reject(new Error(`state-shape diagnostic killed by ${signal}`)):resolve(code??1));});
process.exitCode=exitCode;
