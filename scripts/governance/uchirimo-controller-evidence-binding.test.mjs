import assert from 'node:assert/strict';
import {bindControllerEvidenceReport,controllerEvidenceBindingChain,normalizeArtifactDigest} from './uchirimo-controller-evidence-binding.mjs';

const a='a'.repeat(40),b='b'.repeat(40),c='c'.repeat(40),hash='1'.repeat(64);
assert.equal(normalizeArtifactDigest(hash),normalizeArtifactDigest('sha256:'+hash));
for(const value of ['',undefined,'sha256:not-a-hash',hash.slice(1),'SHA256:'+hash])assert.throws(()=>normalizeArtifactDigest(value),/DIGEST_INVALID/);
assert.notEqual(normalizeArtifactDigest(hash),normalizeArtifactDigest('2'.repeat(64)));
const identity={runtime_manifest_sha256:hash,execution_fingerprint:hash,planner_fingerprint:hash,parent_population_sha256:hash};
const binding=(source,target)=>({status:'PASS',source_exact_head:source,current_exact_head:target,source_controller_run_id:17,source_state_sha256:hash,source_artifact_id:18,source_artifact_identity:'verified-state',source_artifact_digest:'sha256:'+hash,...identity});
const state={exact_head:c,...identity,compatible_head_bindings:[binding(a,b),binding(b,c)]};
const report={exact_head:a,status:'PASS',runtime_integrity_match:true,runtime_manifest_sha256:hash,unverified_discrete_selector_case_count:0,partition_key:'P',case_artifact:'cases.jsonl',case_artifact_sha256:hash};
const args={head:c,state,sourceReportSha256:hash};
const result=bindControllerEvidenceReport(report,args);
assert.equal(result.exact_head,c);assert.equal(result.compatible_controller_binding.source_exact_head,a);assert.equal(result.compatible_controller_binding.chain.length,2);assert.equal(result.case_artifact_sha256,hash);assert.equal(report.exact_head,a);
assert.equal(bindControllerEvidenceReport(report,{...args,head:a}),report);
assert.throws(()=>bindControllerEvidenceReport(report,{...args,state:{...state,compatible_head_bindings:[]}}),/BINDING_COUNT/);
assert.throws(()=>bindControllerEvidenceReport(report,{...args,state:{...state,compatible_head_bindings:[binding(a,b),binding(b,a)]}}),/BINDING_CYCLE/);
assert.throws(()=>bindControllerEvidenceReport(report,{...args,state:{...state,compatible_head_bindings:[binding(a,b),binding(a,c)]}}),/BINDING_COUNT/);
for(const field of Object.keys(identity)){const altered=structuredClone(state);altered.compatible_head_bindings[0][field]='2'.repeat(64);assert.throws(()=>bindControllerEvidenceReport(report,{...args,state:altered}),new RegExp('FINGERPRINT_MISMATCH:'+field));}
for(const field of ['source_controller_run_id','source_state_sha256','source_artifact_id','source_artifact_identity']){const altered=structuredClone(state);delete altered.compatible_head_bindings[0][field];assert.throws(()=>bindControllerEvidenceReport(report,{...args,state:altered}),/IDENTITY_INVALID/);}
assert.throws(()=>bindControllerEvidenceReport({...report,status:'FAIL'},args),/REPORT_NOT_PASS/);
assert.throws(()=>bindControllerEvidenceReport(report,{...args,sourceReportSha256:''}),/REPORT_SHA_INVALID/);
const carry={...report,evidence_origin:'CURRENT_HEAD_CARRY_FORWARD',source_exact_head:'d'.repeat(40),current_head_binding:{status:'PASS',source_exact_head:'d'.repeat(40),current_exact_head:a,partition_key:'P'}};
const rebound=bindControllerEvidenceReport(carry,args);
assert.equal(rebound.current_head_binding.current_exact_head,c);assert.equal(rebound.current_head_binding.source_exact_head,carry.source_exact_head);assert.equal(rebound.compatible_controller_binding.source_current_head_binding.current_exact_head,a);
assert.throws(()=>bindControllerEvidenceReport({...carry,current_head_binding:{...carry.current_head_binding,current_exact_head:b}},args),/CARRY_BINDING_INVALID/);
assert.deepEqual(controllerEvidenceBindingChain(c,c,state),[]);
console.log('UCHIRIMO_CONTROLLER_EVIDENCE_BINDING=PASS chain/rebind/immutability/negative checks; SYNTHETIC ONLY');
