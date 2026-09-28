// Rebind previously verified controller evidence only through a checked, immutable
// compatibility chain. Source bytes and case digests are never changed.
const identityFields=['runtime_manifest_sha256','execution_fingerprint','planner_fingerprint','parent_population_sha256'];
const isHead=value=>/^[0-9a-f]{40}$/.test(String(value??''));
const isHash=value=>/^[0-9a-f]{64}$/.test(String(value??''));

export function normalizeArtifactDigest(value){
  const match=/^(?:sha256:)?([0-9a-f]{64})$/.exec(String(value??''));
  if(!match)throw new Error('UCHIRIMO_V12_CARRY_ARTIFACT_DIGEST_INVALID');
  return match[1];
}

export function controllerEvidenceBindingChain(sourceHead,head,state){
  if(sourceHead===head)return [];
  if(!isHead(sourceHead)||!isHead(head)||state.exact_head!==head)throw new Error('UCHIRIMO_V12_COMPATIBLE_EVIDENCE_HEAD_INVALID');
  const bindings=state.compatible_head_bindings??[];
  if(!Array.isArray(bindings))throw new Error('UCHIRIMO_V12_COMPATIBLE_EVIDENCE_BINDINGS_INVALID');
  const chain=[],visited=new Set();
  let cursor=sourceHead;
  while(cursor!==head){
    if(visited.has(cursor))throw new Error('UCHIRIMO_V12_COMPATIBLE_EVIDENCE_BINDING_CYCLE');
    visited.add(cursor);
    const matches=bindings.filter(row=>row.source_exact_head===cursor);
    if(matches.length!==1)throw new Error('UCHIRIMO_V12_COMPATIBLE_EVIDENCE_BINDING_COUNT:'+cursor+':'+matches.length);
    const row=matches[0];
    if(row.status!=='PASS'||!isHead(row.current_exact_head)||!isHash(row.source_state_sha256)||!Number.isSafeInteger(Number(row.source_controller_run_id))||Number(row.source_controller_run_id)<=0||!Number.isSafeInteger(Number(row.source_artifact_id))||Number(row.source_artifact_id)<=0||!String(row.source_artifact_identity??''))throw new Error('UCHIRIMO_V12_COMPATIBLE_EVIDENCE_BINDING_IDENTITY_INVALID');
    if(row.source_artifact_digest)normalizeArtifactDigest(row.source_artifact_digest);
    for(const field of identityFields)if(!isHash(state[field])||row[field]!==state[field])throw new Error('UCHIRIMO_V12_COMPATIBLE_EVIDENCE_FINGERPRINT_MISMATCH:'+field);
    chain.push(structuredClone(row));
    cursor=row.current_exact_head;
  }
  return chain;
}

export function bindControllerEvidenceReport(report,{head,state,sourceReportSha256}){
  const chain=controllerEvidenceBindingChain(report.exact_head,head,state);
  if(!chain.length)return report;
  if(!isHash(sourceReportSha256))throw new Error('UCHIRIMO_V12_COMPATIBLE_EVIDENCE_REPORT_SHA_INVALID');
  if(report.status!=='PASS'||report.runtime_integrity_match!==true||report.runtime_manifest_sha256!==state.runtime_manifest_sha256||report.unverified_discrete_selector_case_count!==0)throw new Error('UCHIRIMO_V12_COMPATIBLE_EVIDENCE_REPORT_NOT_PASS');
  const out=structuredClone(report);
  out.exact_head=head;
  out.compatible_controller_binding={
    status:'PASS',source_exact_head:report.exact_head,current_exact_head:head,
    source_report_sha256:sourceReportSha256,source_case_artifact_sha256:report.case_artifact_sha256,
    source_current_head_binding:structuredClone(report.current_head_binding??null),chain
  };
  if(report.evidence_origin==='CURRENT_HEAD_CARRY_FORWARD'){
    const binding=report.current_head_binding;
    if(binding?.status!=='PASS'||binding.current_exact_head!==report.exact_head||binding.partition_key!==report.partition_key||binding.source_exact_head!==report.source_exact_head)throw new Error('UCHIRIMO_V12_COMPATIBLE_EVIDENCE_CARRY_BINDING_INVALID');
    out.current_head_binding={...binding,current_exact_head:head};
  }
  return out;
}
