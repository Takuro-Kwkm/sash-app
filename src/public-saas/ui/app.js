const $=(selector)=>document.querySelector(selector);
const state={
  health:null,
  principal:null,
  workspaces:[],
  memberships:[],
  workspaceId:sessionStorage.getItem('sash.public-saas.workspace-id')||null,
  recoveryMode:sessionStorage.getItem('sash.public-saas.recovery-mode')==='1',
  database:{projects:[],estimates:[],openings:[]},
};

const esc=(value)=>String(value??'').replace(/[&<>"']/g,(character)=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
})[character]);
const short=(value)=>value?`${String(value).slice(0,8)}…`:'—';

function showNotice(message,type='info'){
  const node=$('#notice');
  node.textContent=message;
  node.className=`notice${type==='info'?'':` ${type}`}`;
  node.hidden=false;
}
function clearNotice(){const node=$('#notice');node.hidden=true;node.textContent='';}
function setFormBusy(form,busy){
  form.setAttribute('aria-busy',String(Boolean(busy)));
  for(const element of form.elements){
    if(element.matches?.('button, input[type="submit"]'))element.disabled=Boolean(busy);
  }
}

async function api(path,{method='GET',body}={}){
  const response=await fetch(path,{
    method,
    credentials:'same-origin',
    headers:{
      accept:'application/json',
      ...(body!==undefined?{'content-type':'application/json'}:{}),
    },
    ...(body!==undefined?{body:JSON.stringify(body)}:{}),
  });
  const text=await response.text();
  let payload={};
  if(text){
    try{payload=JSON.parse(text);}catch{payload={error:'サーバー応答を読み取れませんでした。',code:'INVALID_SERVER_RESPONSE'};}
  }
  if(!response.ok){
    const error=new Error(payload.error||`Request failed (${response.status})`);
    error.code=payload.code||'REQUEST_FAILED';
    error.status=response.status;
    throw error;
  }
  return payload;
}

function clearAuthFragment(){
  const clean=new URL(location.href);
  clean.hash='';
  clean.searchParams.delete('recovery');
  history.replaceState(null,'',`${clean.pathname}${clean.search}`);
}

async function consumeAuthRedirect(){
  const hash=new URLSearchParams(location.hash.replace(/^#/,''));
  const providerError=hash.get('error_description')||hash.get('error');
  if(providerError){
    clearAuthFragment();
    showNotice(providerError,'error');
    return;
  }

  const refreshToken=hash.get('refresh_token');
  if(!refreshToken)return;
  const type=hash.get('type')||'';
  const recovery=type==='recovery'||new URL(location.href).searchParams.get('recovery')==='1';
  try{
    await api('/api/public-saas/auth/adopt-session',{method:'POST',body:{refresh_token:refreshToken}});
    state.recoveryMode=recovery;
    if(recovery)sessionStorage.setItem('sash.public-saas.recovery-mode','1');
    else sessionStorage.removeItem('sash.public-saas.recovery-mode');
    clearAuthFragment();
    showNotice(recovery?'本人確認が完了しました。新しいパスワードを設定してください。':'メール認証が完了し、ログインしました。','success');
  }catch(error){
    clearAuthFragment();
    showNotice(error.message,'error');
  }
}

function renderAuth(){
  const signedIn=Boolean(state.principal?.user_id);
  $('#signedOutPanel').hidden=signedIn;
  $('#signedInPanel').hidden=!signedIn;
  $('#recoveryUpdatePanel').hidden=!(signedIn&&state.recoveryMode);
  $('#workspaceCard').hidden=!signedIn||state.recoveryMode;
  if(!signedIn){
    $('#workCard').hidden=true;
    $('#sessionBadge').textContent='未ログイン';
    $('#sessionBadge').className='pill muted';
    return;
  }
  $('#sessionBadge').textContent=state.recoveryMode?'本人確認済み':'ログイン中';
  $('#sessionBadge').className='pill ok';
  $('#sessionUser').textContent=`User ${short(state.principal.user_id)}`;
  if(state.recoveryMode)$('#workCard').hidden=true;
}

function activeMembership(){
  return state.memberships.find((row)=>row.workspace_id===state.workspaceId&&row.user_id===state.principal?.user_id&&row.status==='ACTIVE')??null;
}

function renderWorkspaces(){
  if(state.recoveryMode){
    $('#workCard').hidden=true;
    return;
  }
  const select=$('#workspaceSelect');
  if(!state.workspaces.length){
    select.innerHTML='<option value="">Workspaceを作成してください</option>';
    select.disabled=true;
    $('#workspaceMeta').textContent='利用可能なWorkspaceはありません。';
    $('#workCard').hidden=true;
    return;
  }
  select.disabled=false;
  select.innerHTML=state.workspaces.map((workspace)=>`<option value="${esc(workspace.workspace_id)}" ${workspace.workspace_id===state.workspaceId?'selected':''}>${esc(workspace.name)}</option>`).join('');
  const workspace=state.workspaces.find((row)=>row.workspace_id===state.workspaceId);
  const membership=activeMembership();
  $('#workspaceMeta').textContent=workspace?`${workspace.name} · ${membership?.role??'MEMBER'} · ${short(workspace.workspace_id)}`:'Workspaceを選択してください。';
  $('#workCard').hidden=!workspace;
}

function renderDatabase(){
  const {projects,estimates,openings}=state.database;
  $('#dbSummary').innerHTML=`<span>Projects ${projects.length}</span><span>Estimates ${estimates.length}</span><span>Openings ${openings.length}</span><span>Workspace ${esc(short(state.workspaceId))}</span>`;

  const estimateSelect=$('#estimateSelect');
  const activeEstimates=estimates.filter((row)=>!row.deleted_at);
  estimateSelect.innerHTML=activeEstimates.length
    ?activeEstimates.map((estimate)=>{
      const project=projects.find((row)=>row.project_id===estimate.project_id);
      return `<option value="${esc(estimate.estimate_id)}">${esc(project?.project_name??'案件')} / 見積 ${esc(estimate.estimate_no)}</option>`;
    }).join('')
    :'<option value="">先に案件を作成してください</option>';
  estimateSelect.disabled=!activeEstimates.length;
  $('#openingForm button[type="submit"]').disabled=!activeEstimates.length;

  const activeProjects=projects.filter((row)=>!row.deleted_at);
  $('#projectList').innerHTML=activeProjects.length?activeProjects.map((project)=>{
    const projectEstimates=estimates.filter((row)=>row.project_id===project.project_id&&!row.deleted_at);
    const estimateMarkup=projectEstimates.map((estimate)=>{
      const estimateOpenings=openings.filter((row)=>row.estimate_id===estimate.estimate_id&&!row.deleted_at);
      const openingMarkup=estimateOpenings.length?estimateOpenings.map((opening)=>`<div class="opening-row">開口 ${esc(opening.opening_no)} · ${esc(opening.room_name||'部屋未入力')} · ${esc(opening.opening_name||'名称未入力')} <span class="ids">${esc(short(opening.opening_id))}</span></div>`).join(''):'<div class="opening-row">開口部なし</div>';
      return `<div class="estimate-row"><strong>見積 ${esc(estimate.estimate_no)} / ${esc(estimate.status)}</strong><div class="ids">${esc(short(estimate.estimate_id))}</div>${openingMarkup}</div>`;
    }).join('');
    return `<article class="project-row"><h3>${esc(project.project_name)}</h3><p>${esc(project.request_company||'依頼会社未入力')} · ${esc(project.customer_name||'施主未入力')}</p><div class="ids">${esc(short(project.project_id))} · workspace ${esc(short(project.workspace_id))}</div>${estimateMarkup||'<div class="estimate-row">見積なし</div>'}</article>`;
  }).join(''):'<div class="empty">このWorkspaceには案件がありません。</div>';
}

async function loadDatabase(){
  if(!state.workspaceId||state.recoveryMode)return;
  const payload=await api(`/api/public-saas/work/database?workspace_id=${encodeURIComponent(state.workspaceId)}`);
  state.database={
    projects:payload.projects??[],
    estimates:payload.estimates??[],
    openings:payload.openings??[],
  };
  renderDatabase();
}

async function loadWorkspaces(){
  const payload=await api('/api/public-saas/workspaces');
  state.principal=payload.principal;
  state.workspaces=payload.workspaces??[];
  state.memberships=payload.memberships??[];
  const available=new Set(state.workspaces.map((row)=>row.workspace_id));
  if(!state.workspaceId||!available.has(state.workspaceId))state.workspaceId=state.workspaces[0]?.workspace_id??null;
  if(state.workspaceId)sessionStorage.setItem('sash.public-saas.workspace-id',state.workspaceId);
  else sessionStorage.removeItem('sash.public-saas.workspace-id');
  renderAuth();
  renderWorkspaces();
  if(state.workspaceId&&!state.recoveryMode)await loadDatabase();
}

async function boot(){
  clearNotice();
  await consumeAuthRedirect();

  try{
    const health=await api('/api/public-saas/health');
    state.health=health;
    $('#providerStatus').textContent=health.configured?'Supabase接続済み':'Supabase未設定';
    $('#providerStatus').className=`pill ${health.configured?'ok':'warn'}`;
  }catch(error){
    $('#providerStatus').textContent='Provider確認失敗';
    $('#providerStatus').className='pill warn';
    showNotice(error.message,'error');
  }

  try{
    const session=await api('/api/public-saas/session');
    state.principal=session.principal;
    renderAuth();
    await loadWorkspaces();
  }catch(error){
    if(error.status!==401)showNotice(error.message,'error');
    state.principal=null;
    state.workspaces=[];
    state.memberships=[];
    state.database={projects:[],estimates:[],openings:[]};
    renderAuth();
  }
}

$('#signInForm').addEventListener('submit',async(event)=>{
  event.preventDefault();
  const form=event.currentTarget;
  clearNotice();setFormBusy(form,true);
  const data=Object.fromEntries(new FormData(form));
  try{
    await api('/api/public-saas/auth/sign-in',{method:'POST',body:data});
    form.reset();
    state.recoveryMode=false;
    sessionStorage.removeItem('sash.public-saas.recovery-mode');
    showNotice('ログインしました。','success');
    await boot();
  }catch(error){showNotice(error.message,'error');}
  finally{setFormBusy(form,false);}
});

$('#signUpForm').addEventListener('submit',async(event)=>{
  event.preventDefault();
  const form=event.currentTarget;
  clearNotice();setFormBusy(form,true);
  const data=Object.fromEntries(new FormData(form));
  try{
    const result=await api('/api/public-saas/auth/sign-up',{method:'POST',body:data});
    if(result.email_confirmation_required){
      showNotice('アカウントを作成しました。確認メールのリンクを開くと、このPreviewへ戻ります。','success');
    }else{
      showNotice('アカウントを作成し、ログインしました。','success');
      await boot();
    }
    form.reset();
  }catch(error){showNotice(error.message,'error');}
  finally{setFormBusy(form,false);}
});

$('#passwordResetRequestButton').addEventListener('click',async(event)=>{
  clearNotice();
  const button=event.currentTarget;
  const email=$('#signInForm [name="email"]').value.trim();
  if(!email){showNotice('ログイン欄にメールアドレスを入力してください。','error');return;}
  button.disabled=true;
  try{
    await api('/api/public-saas/auth/password-reset-request',{method:'POST',body:{email}});
    showNotice('パスワード再設定メールを送信しました。メールが届いた場合はリンクを開いてください。','success');
  }catch(error){showNotice(error.message,'error');}
  finally{button.disabled=false;}
});

$('#updatePasswordButton').addEventListener('click',async(event)=>{
  clearNotice();
  const button=event.currentTarget;
  const password=$('#newPassword').value;
  const confirm=$('#newPasswordConfirm').value;
  if(password.length<8){showNotice('新しいパスワードは8文字以上にしてください。','error');return;}
  if(password!==confirm){showNotice('確認用パスワードが一致しません。','error');return;}
  button.disabled=true;
  try{
    await api('/api/public-saas/auth/update-password',{method:'POST',body:{password}});
    state.recoveryMode=false;
    state.principal=null;
    state.workspaces=[];
    state.memberships=[];
    state.database={projects:[],estimates:[],openings:[]};
    sessionStorage.removeItem('sash.public-saas.recovery-mode');
    $('#newPassword').value='';
    $('#newPasswordConfirm').value='';
    renderAuth();
    showNotice('パスワードを更新しました。新しいパスワードでログインしてください。','success');
  }catch(error){showNotice(error.message,'error');}
  finally{button.disabled=false;}
});

$('#signOutButton').addEventListener('click',async()=>{
  clearNotice();
  try{await api('/api/public-saas/auth/sign-out',{method:'POST'});}catch{}
  state.principal=null;state.workspaces=[];state.memberships=[];state.workspaceId=null;state.recoveryMode=false;
  state.database={projects:[],estimates:[],openings:[]};
  sessionStorage.removeItem('sash.public-saas.workspace-id');
  sessionStorage.removeItem('sash.public-saas.recovery-mode');
  renderAuth();
  showNotice('ログアウトしました。','success');
});

$('#reloadWorkspaceButton').addEventListener('click',async()=>{
  clearNotice();
  try{await loadWorkspaces();showNotice('Workspaceを再読込しました。','success');}
  catch(error){showNotice(error.message,'error');}
});

$('#workspaceSelect').addEventListener('change',async(event)=>{
  state.workspaceId=event.currentTarget.value||null;
  if(state.workspaceId)sessionStorage.setItem('sash.public-saas.workspace-id',state.workspaceId);
  renderWorkspaces();
  try{if(state.workspaceId)await loadDatabase();}
  catch(error){showNotice(error.message,'error');}
});

$('#workspaceForm').addEventListener('submit',async(event)=>{
  event.preventDefault();
  const form=event.currentTarget;
  clearNotice();setFormBusy(form,true);
  const data=Object.fromEntries(new FormData(form));
  try{
    await api('/api/public-saas/workspaces',{method:'POST',body:{name:data.name}});
    form.reset();
    await loadWorkspaces();
    state.workspaceId=state.workspaces.at(-1)?.workspace_id??state.workspaceId;
    if(state.workspaceId)sessionStorage.setItem('sash.public-saas.workspace-id',state.workspaceId);
    renderWorkspaces();
    if(state.workspaceId)await loadDatabase();
    showNotice('Workspaceを作成しました。','success');
  }catch(error){showNotice(error.message,'error');}
  finally{setFormBusy(form,false);}
});

$('#reloadDataButton').addEventListener('click',async()=>{
  clearNotice();
  try{await loadDatabase();showNotice('Supabaseから再読込しました。','success');}
  catch(error){showNotice(error.message,'error');}
});

$('#projectForm').addEventListener('submit',async(event)=>{
  event.preventDefault();
  const form=event.currentTarget;
  clearNotice();setFormBusy(form,true);
  const project=Object.fromEntries(new FormData(form));
  try{
    await api('/api/public-saas/work/projects',{method:'POST',body:{workspace_id:state.workspaceId,project}});
    form.reset();
    await loadDatabase();
    showNotice('案件と初回見積をSupabaseへ保存しました。','success');
  }catch(error){showNotice(error.message,'error');}
  finally{setFormBusy(form,false);}
});

$('#openingForm').addEventListener('submit',async(event)=>{
  event.preventDefault();
  const form=event.currentTarget;
  clearNotice();setFormBusy(form,true);
  const values=Object.fromEntries(new FormData(form));
  const estimate=state.database.estimates.find((row)=>row.estimate_id===values.estimate_id);
  if(!estimate){showNotice('保存先の見積が見つかりません。','error');setFormBusy(form,false);return;}
  try{
    await api('/api/public-saas/work/openings',{method:'POST',body:{
      workspace_id:state.workspaceId,
      project_id:estimate.project_id,
      estimate_id:estimate.estimate_id,
      opening:{room_name:values.room_name,opening_name:values.opening_name},
    }});
    form.reset();
    await loadDatabase();
    showNotice('開口部をSupabaseへ保存しました。','success');
  }catch(error){showNotice(error.message,'error');}
  finally{setFormBusy(form,false);}
});

boot();
