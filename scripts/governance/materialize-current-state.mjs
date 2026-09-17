import { appendFileSync } from 'node:fs';
import { currentExactHead, git, readJson, writeJson, sha256File } from './governance-lib.mjs';
import { validateConnectorDriveSnapshot, verifyLiveDriveSnapshot, resolveDriveAuthority } from './drive-authority.mjs';
const head=currentExactHead();
const base='bb856785475c3045922b3fcd32776ffff77b84ff';
const changed=git(['diff','--name-only',base,head]).split('\n').filter(Boolean);
const unrequested=changed.filter(p=>!p.startsWith('project-governance/')&&!p.startsWith('scripts/governance/')&&!p.startsWith('.github/workflows/'));
writeJson('artifacts/governance/scope-verification.json',{exact_head:head,base,changed_files:changed,unrequested_diff_count:unrequested.length,formal_runtime_changed_files:changed.filter(p=>p.startsWith('src/catalog/runtime-master-packages/')),status:unrequested.length?'FAIL':'PASS'});
if(unrequested.length)throw Error('UNREQUESTED_DIFF');
const config=readJson('project-governance/project-state.json');
const review=readJson('artifacts/governance/human-flow-review.json');
const gates=readJson('artifacts/governance/gate-results.json');
const coverage=readJson('artifacts/governance/human-flow-field-coverage-verification.json');
const workflow=readJson('artifacts/governance/workflow-authority-verification.json');
const definition=readJson('project-governance/gate-definition.json');
const drive=readJson('project-governance/drive-authority-snapshot.json');
for(const obj of [review,gates,coverage])if(obj.exact_head!==head)throw Error('STALE_HEAD_INPUT');
const api=async path=>{
 const r=await fetch(`https://api.github.com/repos/${config.repository}/${path}`,{headers:{Authorization:`Bearer ${process.env.GH_TOKEN}`,Accept:'application/vnd.github+json'}});
 if(!r.ok)throw Error(`GITHUB_READ_FAILED_${r.status}`);return r.json();
};
if(!process.env.GH_TOKEN)throw Error('GITHUB_READ_CREDENTIAL_REQUIRED');
const pr=await api('pulls/24');
if(pr.head.sha!==head || pr.head.ref!==config.branch || pr.state!=='open')throw Error('CURRENT_PR_HEAD_MISMATCH');
const branch=await api(`branches/${encodeURIComponent(config.branch)}`);
if(branch.commit.sha!==head)throw Error('CURRENT_BRANCH_HEAD_MISMATCH');
const runs=await api(`actions/runs?head_sha=${head}&per_page=100`);
const status=await api(`commits/${head}/status`);
writeJson('artifacts/governance/github-current-observation.json',{exact_head:head,observed_at:new Date().toISOString(),pr:{number:pr.number,state:pr.state,draft:pr.draft,head:pr.head.sha,branch:pr.head.ref},branch:{name:branch.name,sha:branch.commit.sha},workflow_runs:runs.workflow_runs.map(r=>({id:r.id,name:r.name,head_sha:r.head_sha,status:r.status,conclusion:r.conclusion,url:r.html_url})),commit_status:status});
const connectorDrive=validateConnectorDriveSnapshot(drive);
const liveDrive=await verifyLiveDriveSnapshot(drive,process.env.DRIVE_READONLY_ACCESS_TOKEN);
const driveAuthority=resolveDriveAuthority(connectorDrive,liveDrive);
writeJson('artifacts/governance/drive-authority-observation.json',{...drive,exact_head:head,connector_snapshot_status:connectorDrive,live_read_status:liveDrive,authority_mode:driveAuthority.authority_mode,current_state_reconstruction_gate:driveAuthority.current_state_reconstruction_gate,post_human_drive_live_gate:driveAuthority.post_human_drive_live_gate});
const authority={status:definition.gate_order.every((g,i)=>definition.gates[g]?.gate_id===g && JSON.stringify(definition.gates[g].prerequisites)===JSON.stringify(definition.gate_order.slice(Math.max(0,i-1),i)))?'PASS':'FAIL',exact_head:head};
writeJson('artifacts/governance/definition-verification.json',authority);
if(authority.status!=='PASS'||workflow.status!=='PASS'||coverage.status!=='PASS')throw Error('GOVERNANCE_INPUT_FAIL');
const human=gates.gates.HUMAN_FLOW_REVIEW_GATE.status;
const postHumanAuthorized=human==='PASS'&&driveAuthority.post_human_drive_live_gate==='PASS';
const blockers=[...(human!=='PASS'?['EXPLICIT_HUMAN_APPROVAL_REQUIRED']:[]),...(driveAuthority.current_state_reconstruction_gate!=='PASS'?['CURRENT_STATE_DRIVE_AUTHORITY_BLOCKED']:[]),...(human==='PASS'&&driveAuthority.post_human_drive_live_gate!=='PASS'?['LIVE_DRIVE_READ_REQUIRED_FOR_POST_REVIEW_EXECUTION']:[])];
const state={schema_version:'2.1.0',exact_head:head,repository:config.repository,branch:pr.head.ref,pull_request:pr.number,task_classification:config.task_classification,product_master_mutation:config.product_master_mutation,current_phase:config.phase,target_series:review.series.map(s=>s.registry_series_key),runtime_identities:review.series.map(s=>({registry_series_key:s.registry_series_key,package_version:s.package_version,runtime_manifest_id:s.runtime_manifest_id})),runtime_snapshot_id:review.runtime_snapshot_id,series_total:review.series_count,series_verified:coverage.series.filter(s=>s.status==='PASS').length,series_verification_scope:'STRUCTURAL_FIELD_COVERAGE_ONLY',base_window_count:review.base_window_count,flow_mapped:review.field_mapping.mapped,flow_unmapped:review.field_mapping.unmapped,flow_conflict:review.field_mapping.conflict,qa_total:null,qa_pass:null,qa_fail:null,unverified_qa_case_count:null,qa_population_status:'UNVERIFIED_POST_HUMAN_REVIEW_NOT_EXECUTED',human_flow_review_artifact_id:review.review_artifact_identity,human_flow_review_gate:human,post_human_review_authorized:postHumanAuthorized,current_gate:definition.gate_order.find(g=>gates.gates[g]?.status!=='PASS')??'COMPLETE',blocker:blockers,next_authorized_phase:human!=='PASS'?'PRESENT_HUMAN_REVIEW_ARTIFACT':driveAuthority.post_human_drive_live_gate!=='PASS'?'CONFIGURE_READ_ONLY_DRIVE_ACCESS':'CONTROLLER_POST_REVIEW_EXECUTION',app_integration_ready:gates.gates.APP_INTEGRATION_READY?.status==='PASS',release_input_gate:gates.release.status,updated_at:new Date().toISOString(),source_evidence:['github-current-observation.json','human-flow-review.json','human-flow-field-coverage-verification.json','gate-results.json','drive-authority-observation.json'].map(p=>({artifact:p,sha256:sha256File(`artifacts/governance/${p}`)})),governance_foundation:{status:driveAuthority.current_state_reconstruction_gate==='PASS'?'PASS':'BLOCKED',project_state_gate:'PASS',governance_definition_gate:authority.status,workflow_authority_gate:workflow.status,legacy_independent_authority_count:workflow.legacy_independent_authority_count,current_state_reconstruction_gate:driveAuthority.current_state_reconstruction_gate,drive_authority_mode:driveAuthority.authority_mode,post_human_drive_live_gate:driveAuthority.post_human_drive_live_gate,human_flow_field_coverage_gate:coverage.status},review_unverified_property_count:review.unverified_count};
writeJson('artifacts/governance/project-state.json',state);
const registry={schema_version:'2.1.0',exact_head:head,runtime_snapshot_id:review.runtime_snapshot_id,entries:[]};
const executions={
 'human-approval-observation.json':['HUMAN_FLOW_REVIEW_GATE','node scripts/governance/read-human-approval.mjs',human],
 'scope-verification.json':['CHANGE_SCOPE_GATE','git diff --name-only verified-start-head current-head','PASS'],
 'governance-negative-tests.tap':['GOVERNANCE_NEGATIVE_QA','node --test scripts/governance/governance-negative.test.mjs','PASS'],
 'human-flow-review.json':['HUMAN_FLOW_REVIEW_ARTIFACT','node scripts/governance/build-human-flow-review.mjs','GENERATED'],
 'human-flow-field-coverage-verification.json':['HUMAN_FLOW_FIELD_COVERAGE_GATE','node scripts/governance/verify-human-flow-field-coverage.mjs',coverage.status],
 'workflow-authority-verification.json':['WORKFLOW_AUTHORITY_GATE','python scripts/governance/verify-workflow-authority.py',workflow.status],
 'definition-verification.json':['GOVERNANCE_DEFINITION_GATE','node scripts/governance/materialize-current-state.mjs',authority.status],
 'project-state.json':['PROJECT_STATE_GATE','node scripts/governance/materialize-current-state.mjs','PASS'],
 'github-current-observation.json':['CURRENT_STATE_RECONSTRUCTION_GATE','GitHub REST PR, branch, runs and status GET','OBSERVED'],
 'drive-authority-observation.json':['CURRENT_STATE_RECONSTRUCTION_GATE','Google Drive connector attestation validation plus optional read-only live metadata verification',driveAuthority.current_state_reconstruction_gate]
};
for(const [artifact,[gate,command,result]] of Object.entries(executions))registry.entries.push({evidence_id:`${head}:${gate}:${artifact}`,exact_head:head,requirement:gate,command,artifact_identity:artifact,artifact_sha256:sha256File(`artifacts/governance/${artifact}`),result,related_gate:gate,runtime_snapshot_id:review.runtime_snapshot_id,timestamp:new Date().toISOString(),source:process.env.GITHUB_RUN_ID?`https://github.com/${config.repository}/actions/runs/${process.env.GITHUB_RUN_ID}`:'LOCAL_UNVERIFIED',supersedes:null,historical_relation:'Old HEAD directories remain historical and are never selected for this HEAD.'});
for(const e of readJson('artifacts/governance/qa-evidence-manifest.json').entries.filter(e=>e.exact_head===head&&e.authoritative_for_current_head!==false))registry.entries.push({evidence_id:e.id,exact_head:head,requirement:e.gate_id,command:e.command,artifact_identity:e.artifact.replace('artifacts/governance/',''),artifact_sha256:e.artifact_sha256,result:e.outcome,related_gate:e.gate_id,runtime_snapshot_id:review.runtime_snapshot_id,timestamp:e.recorded_at,source:`https://github.com/${config.repository}/actions/runs/${process.env.GITHUB_RUN_ID}`,supersedes:null,historical_relation:'Exact HEAD only',scope:e.scope});
writeJson('artifacts/governance/evidence-registry.json',registry);
if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,`authorized=${state.post_human_review_authorized}\n`);
console.log(JSON.stringify({head,series:state.series_total,windows:state.base_window_count,fieldCoverage:coverage.status,reconstruction:state.governance_foundation.current_state_reconstruction_gate,driveAuthority:state.governance_foundation.drive_authority_mode,postHumanDriveLive:state.governance_foundation.post_human_drive_live_gate,human}));
