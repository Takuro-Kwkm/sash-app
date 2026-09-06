#!/usr/bin/env node
import{execFileSync,spawnSync}from'node:child_process';
import fs from'node:fs';
import path from'node:path';
import{evaluateGeminiAiProWorkerReadiness}from'../src/product-master-core/worker-readiness.mjs';

const args=new Set(process.argv.slice(2));
const getArg=(name)=>{
  const prefix=`${name}=`;
  const item=process.argv.slice(2).find((v)=>v.startsWith(prefix));
  return item?item.slice(prefix.length):null;
};
const liveAuth=args.has('--live-auth');
const outputPath=getArg('--output');
const home=process.env.HOME||'';
const runnerDir=getArg('--runner-dir')||path.join(home,'actions-runner');
const plist=getArg('--plist')||path.join(home,'Library/LaunchAgents/actions.runner.Takuro-Kwkm-sash-app.sash-gemini-worker-mac.plist');

const execText=(file,argv=[])=>execFileSync(file,argv,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const safeExec=(file,argv=[])=>{
  const result=spawnSync(file,argv,{encoding:'utf8'});
  return{ok:result.status===0,status:result.status,stdout:(result.stdout||'').trim(),stderr:(result.stderr||'').trim()};
};
const parseBool=(value)=>String(value).trim().toLowerCase()==='true';

function parsePmsetCustom(text){
  const sections={};
  let current=null;
  for(const raw of text.split(/\r?\n/)){
    const line=raw.trim();
    const heading=line.match(/^(.+ Power):$/);
    if(heading){current=heading[1];sections[current]={};continue;}
    if(!current||!line) continue;
    const match=line.match(/^([A-Za-z0-9_]+)\s+(-?\d+)$/);
    if(match) sections[current][match[1]]=Number(match[2]);
  }
  return sections;
}

const platform=execText('/usr/bin/uname',['-s']);
const arch=execText('/usr/bin/uname',['-m']);
const svcPath=path.join(runnerDir,'svc.sh');
const runnerStatus=fs.existsSync(svcPath)?safeExec(svcPath,['status']):{ok:false,status:null,stdout:'',stderr:'svc.sh missing'};

const agyLookup=safeExec('/bin/bash',['-lc','command -v agy']);
let agyVersion=null;
if(agyLookup.ok&&agyLookup.stdout){
  const version=safeExec(agyLookup.stdout.split(/\r?\n/)[0],['--version']);
  if(version.ok) agyVersion=version.stdout.split(/\r?\n/)[0]||null;
}

let sessionCreate=null;
let sessionType=null;
if(fs.existsSync(plist)){
  const sc=safeExec('/usr/libexec/PlistBuddy',['-c','Print :SessionCreate',plist]);
  const st=safeExec('/usr/libexec/PlistBuddy',['-c','Print :LimitLoadToSessionType',plist]);
  if(sc.ok) sessionCreate=parseBool(sc.stdout);
  if(st.ok) sessionType=st.stdout.trim();
}

const pmset=safeExec('/usr/bin/pmset',['-g','custom']);
const pmsetSections=pmset.ok?parsePmsetCustom(pmset.stdout):{};
const ac=pmsetSections['AC Power']||{};

let authPreflight={status:'NOT_EVALUATED',credentialMaterialPersisted:false};
if(liveAuth&&agyLookup.ok&&agyLookup.stdout){
  const command=agyLookup.stdout.split(/\r?\n/)[0];
  const preflight=safeExec(command,['-p','Return exactly: PRODUCT_MASTER_ANTIGRAVITY_PREFLIGHT_OK','--output-format','json','--print-timeout','2m']);
  let parsed=null;
  try{parsed=JSON.parse(preflight.stdout);}catch{}
  authPreflight={
    status:preflight.ok&&parsed?.status==='SUCCESS'&&String(parsed?.response??'').trim()==='PRODUCT_MASTER_ANTIGRAVITY_PREFLIGHT_OK'?'PASS':'FAIL',
    credentialMaterialPersisted:false
  };
}

const result=evaluateGeminiAiProWorkerReadiness({
  platform,
  arch,
  runnerService:{running:runnerStatus.ok,detail:[runnerStatus.stdout,runnerStatus.stderr].filter(Boolean).join('\n')||null},
  antigravity:{available:agyLookup.ok&&Boolean(agyLookup.stdout),path:agyLookup.stdout.split(/\r?\n/)[0]||null,version:agyVersion},
  sessionPolicy:{sessionCreate,limitLoadToSessionType:sessionType},
  powerPolicy:{ac:{machineSleepMinutes:Number.isFinite(ac.sleep)?ac.sleep:null,displaySleepMinutes:Number.isFinite(ac.displaysleep)?ac.displaysleep:null}},
  authPreflight,
  requireLiveAuth:liveAuth
});

const audit={
  ...result,
  generatedAt:new Date().toISOString(),
  diagnostics:{
    runnerDir,
    plistPresent:fs.existsSync(plist),
    pmsetCustomAvailable:pmset.ok,
    liveAuthRequested:liveAuth
  }
};
const serialized=JSON.stringify(audit,null,2)+'\n';
if(outputPath){fs.mkdirSync(path.dirname(path.resolve(outputPath)),{recursive:true});fs.writeFileSync(path.resolve(outputPath),serialized);}
process.stdout.write(serialized);
process.exitCode=result.status==='PASS'?0:2;
