// Transport and duplicate-elision only; never changes proof acceptance.
export function rememberVerifiedShard(covered, report) {
  const add=(head,shard)=>{if(/^[0-9a-f]{40}$/.test(String(head))&&Number.isInteger(shard)&&shard>=0)covered.add(head+':'+shard);};
  add(report.exact_head,report.shard_index);
  const b=report.current_head_binding;
  if(b?.status==='PASS'&&b.current_exact_head===report.exact_head&&b.partition_key===report.partition_key&&b.source_case_artifact_sha256===report.case_artifact_sha256){
    add(b.source_exact_head,b.source_shard_index);
  }
}
export function alreadyVerifiedSingleShard(covered,sourceHead,name) {
  const m=/^uchirimo-selector-proof-shard-(\d+)-([0-9a-f]{40})-attempt-\d+$/.exec(name);
  return Boolean(m&&m[2]===sourceHead&&covered.has(sourceHead+':'+Number(m[1])));
}
export function accountedBatch({plan,artifact,run,reusedKeys,heavyByKey,currentByKey}) {
  const m=/^uchirimo-selector-proof-batch-(lane-(\d+)-(?:normal|heavy)-\d+)-([0-9a-f]{40})-attempt-(\d+)$/.exec(artifact.name);
  if(!m||m[3]!==run.head_sha||Number(m[4])!==Number(run.run_attempt)||plan?.status!=='PASS'||plan.exact_head!==run.head_sha||Number(plan.lane_index)!==Number(m[2]))return false;
  const batches=(plan.matrix?.include??[]).filter(b=>b.batch_id===m[1]);
  if(batches.length!==1)return false;
  let rows;try{rows=JSON.parse(batches[0].batch_json);}catch{return false;}
  if(!Array.isArray(rows)||!rows.length)return false;
  return rows.every(row=>{
    const current=currentByKey.get(row.partition_key);
    if(!current)return false;
    const fields=['node_id','room_specification','window_type','glass_family','sash_configuration','size_class','partition_seed_json'];
    if(fields.some(k=>row[k]!==current[k]))return false;
    if(reusedKeys.has(row.partition_key))return true;
    const heavy=heavyByKey.get(row.partition_key);
    return heavy?.timed_out===true&&Number(heavy.source_run_id)===Number(run.id)&&heavy.source_exact_head===run.head_sha&&heavy.source_artifact_identity===artifact.name;
  });
}
export async function fetchWithRetry(url,options,label,{fetchFn=fetch,wait=ms=>new Promise(r=>setTimeout(r,ms)),log=console.warn}={}) {
  let lastError;
  for(let attempt=1;attempt<=4;attempt++){
    let response;
    try {response=await fetchFn(url,{...options,signal:AbortSignal.timeout(120000)});}
    catch(error){lastError=new Error(label+'_NETWORK_ERROR:'+String(error?.name??'Error'));}
    if(response?.ok)return response;
    if(response){
      const status=response.status;
      // Do not retry permanent denial, including 403, or expose redirect URLs/tokens.
      const error=new Error(label+'_HTTP_'+status+' rate_remaining='+String(response.headers.get('x-ratelimit-remaining')??'unknown')+' rate_reset='+String(response.headers.get('x-ratelimit-reset')??'unknown'));
      error.httpStatus=status;
      if(status<500&&status!==429)throw error;
      lastError=error;
    }
    if(attempt<4){log(label+'_RETRY attempt='+attempt+' reason='+lastError.message);await wait(attempt*1500);}
  }
  throw lastError;
}
