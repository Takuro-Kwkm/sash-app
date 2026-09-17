// One command reads external current state. Missing access is BLOCKED, never old-state PASS.
import { createHash } from 'node:crypto';
import { readJson,writeJson } from './governance-lib.mjs';
const config=readJson('project-governance/project-state.json');
const get=async url=>{const r=await fetch(url,{headers:{Authorization:`Bearer ${process.env.GH_TOKEN}`,Accept:'application/vnd.github+json'}});if(!r.ok)throw Error(`READ_FAILED_${r.status}`);return r.json();};
const base=`https://api.github.com/repos/${config.repository}`;
const pr=await get(`${base}/pulls/24`);
const ref=await get(`${base}/git/ref/heads/governance-evidence`);
const content=async path=>{const obj=await get(`${base}/contents/${path}?ref=${ref.object.sha}`);const blob=obj.encoding==='base64'?obj:await get(`${base}/git/blobs/${obj.sha}`);if(blob.encoding!=='base64')throw Error('UNSUPPORTED_CONTENT_ENCODING');return Buffer.from(blob.content.replace(/\n/g,''),'base64');};
const pointer=JSON.parse((await content('current.json')).toString());
if(pointer.exact_head!==pr.head.sha||pointer.branch!==pr.head.ref)throw Error('PERSISTED_STATE_STALE');
const registry=JSON.parse((await content(`${pointer.path}/evidence-registry.json`)).toString());
for(const row of registry.entries){if(row.exact_head!==pr.head.sha)throw Error('HISTORICAL_EVIDENCE_REJECTED');const bytes=await content(`${pointer.path}/${row.artifact_identity}`);if(createHash('sha256').update(bytes).digest('hex')!==row.artifact_sha256)throw Error('PERSISTED_HASH_MISMATCH');}
const state=JSON.parse((await content(`${pointer.path}/project-state.json`)).toString());
const runs=await get(`${base}/actions/runs?head_sha=${pr.head.sha}&per_page=100`);
const statuses=await get(`${base}/commits/${pr.head.sha}/status`);
const drive=readJson('project-governance/drive-authority-snapshot.json');
let driveLive='BLOCKED_LIVE_DRIVE_READ_NOT_CONFIGURED';
if(process.env.DRIVE_READONLY_ACCESS_TOKEN){for(const row of drive.entries){const r=await fetch(`https://www.googleapis.com/drive/v3/files/${row.drive_file_id}?fields=id,name,modifiedTime,version`,{headers:{Authorization:`Bearer ${process.env.DRIVE_READONLY_ACCESS_TOKEN}`}});if(!r.ok)throw Error(`DRIVE_READ_FAILED_${r.status}`);const live=await r.json();if(live.modifiedTime!==row.modified_identity||live.name!==row.name)throw Error('DRIVE_AUTHORITY_CHANGED');}driveLive='PASS';}
writeJson('artifacts/governance/reconstructed-current-state.json',{...state,reconstruction_observed_at:new Date().toISOString(),evidence_storage_commit:ref.object.sha,current_state_reconstruction_gate:driveLive==='PASS'?'PASS':'BLOCKED',drive_live_status:driveLive,workflow_runs:runs.workflow_runs.map(r=>({id:r.id,head:r.head_sha,status:r.status,conclusion:r.conclusion})),commit_status:statuses});
console.log(`CURRENT_STATE_RECONSTRUCTION_GATE=${driveLive==='PASS'?'PASS':'BLOCKED'} EXACT_HEAD=${pr.head.sha}`);
if(driveLive!=='PASS')process.exitCode=2;
