import { readJson, sha256File, currentExactHead } from './governance-lib.mjs';
const state=readJson('artifacts/governance/project-state.json');
const registry=readJson('artifacts/governance/evidence-registry.json');
const head=currentExactHead();
if(state.exact_head!==head||registry.exact_head!==head)throw Error('STALE_STATE');
for(const key of ['exact_head','branch','pull_request','task_classification','product_master_mutation','current_phase','target_series','runtime_identities','runtime_snapshot_id','series_total','series_verified','base_window_count','flow_mapped','flow_unmapped','flow_conflict','qa_total','qa_pass','qa_fail','unverified_qa_case_count','human_flow_review_artifact_id','human_flow_review_gate','post_human_review_authorized','current_gate','blocker','next_authorized_phase','app_integration_ready','release_input_gate','updated_at','source_evidence'])if(!(key in state))throw Error(`MISSING_STATE_${key}`);
if(state.pull_request!==24||state.product_master_mutation!==0||state.task_classification!=='NON-PRODUCT-MASTER')throw Error('STATE_IDENTITY_MISMATCH');
const gh=readJson('artifacts/governance/github-current-observation.json');
if(gh.pr.head!==head||gh.branch.sha!==head||gh.branch.name!==state.branch)throw Error('GITHUB_IDENTITY_MISMATCH');
const review=readJson('artifacts/governance/human-flow-review.json');
if(review.runtime_snapshot_id!==state.runtime_snapshot_id||review.review_artifact_identity!==state.human_flow_review_artifact_id)throw Error('RUNTIME_IDENTITY_MISMATCH');
if(state.human_flow_review_gate!=='PASS'&&(state.post_human_review_authorized||state.app_integration_ready||state.release_input_gate==='PASS'))throw Error('HUMAN_REVIEW_BYPASS');
if(state.governance_foundation.current_state_reconstruction_gate!=='PASS'&&state.post_human_review_authorized)throw Error('DRIVE_RECONSTRUCTION_BYPASS');
for(const record of registry.entries){
 for(const key of ['evidence_id','exact_head','requirement','command','artifact_identity','artifact_sha256','result','related_gate','runtime_snapshot_id','timestamp','source','historical_relation'])if(!record[key])throw Error(`MISSING_EVIDENCE_${key}`);
 if(record.exact_head!==head||record.runtime_snapshot_id!==state.runtime_snapshot_id)throw Error('STALE_EVIDENCE');
 if(!record.source.startsWith('https://github.com/'))throw Error('EXTERNAL_EXECUTION_EVIDENCE_REQUIRED');
 if(sha256File(`artifacts/governance/${record.artifact_identity}`)!==record.artifact_sha256)throw Error('ARTIFACT_HASH_MISMATCH');
}
console.log(`PROJECT_STATE_GATE=PASS EVIDENCE_REGISTRY_GATE=PASS EVIDENCE_COUNT=${registry.entries.length}`);
