import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SupabaseAuthAdapter, readSupabasePublicConfig } from '../src/public-saas/supabase-auth-adapter.mjs';
import { SupabaseDataApiClient } from '../src/public-saas/supabase-data-api.mjs';

const jsonResponse=(status,body)=>({
  ok:status>=200&&status<300,
  status,
  text:async()=>body===null?'':JSON.stringify(body),
});
const jwt=(claims)=>[
  Buffer.from(JSON.stringify({alg:'ES256',typ:'JWT'})).toString('base64url'),
  Buffer.from(JSON.stringify(claims)).toString('base64url'),
  'test-signature',
].join('.');

test('Supabase public config fails closed when credentials are absent',async()=>{
  const config=readSupabasePublicConfig({});
  assert.equal(config.configured,false);
  const adapter=new SupabaseAuthAdapter();
  await assert.rejects(()=>adapter.signInWithPassword({email:'a@example.com',password:'secret'}),{code:'AUTH_PROVIDER_NOT_CONFIGURED'});
});

test('password login uses publishable key and does not require a service-role secret',async()=>{
  const calls=[];
  const adapter=new SupabaseAuthAdapter({
    url:'https://sample.supabase.co',publishableKey:'sb_publishable_test',
    fetchImpl:async(url,options)=>{calls.push({url,options});return jsonResponse(200,{access_token:'access',refresh_token:'refresh'});},
  });
  const session=await adapter.signInWithPassword({email:' User@Example.com ',password:'secret'});
  assert.equal(session.access_token,'access');
  assert.equal(calls[0].url,'https://sample.supabase.co/auth/v1/token?grant_type=password');
  assert.equal(calls[0].options.headers.apikey,'sb_publishable_test');
  assert.equal(calls[0].options.headers.Authorization,undefined);
  assert.deepEqual(JSON.parse(calls[0].options.body),{email:'user@example.com',password:'secret'});
});

test('verified Supabase access token becomes provider-independent principal',async()=>{
  const accessToken=jwt({sub:'11111111-1111-4111-8111-111111111111',session_id:'session-1',iat:1789010000,exp:1789017200});
  const adapter=new SupabaseAuthAdapter({
    url:'https://sample.supabase.co',publishableKey:'sb_publishable_test',
    fetchImpl:async(url,options)=>{
      assert.equal(url,'https://sample.supabase.co/auth/v1/user');
      assert.equal(options.headers.Authorization,`Bearer ${accessToken}`);
      return jsonResponse(200,{id:'11111111-1111-4111-8111-111111111111',email_confirmed_at:'2026-09-10T00:00:00.000Z'});
    },
  });
  const principal=await adapter.verifyAccessToken(accessToken);
  assert.equal(principal.user_id,'11111111-1111-4111-8111-111111111111');
  assert.equal(principal.session_id,'session-1');
  assert.equal(principal.auth_provider,'SUPABASE');
  assert.equal(principal.email_verified_at,'2026-09-10T00:00:00.000Z');
});

test('provider errors are sanitized to bounded application errors',async()=>{
  const adapter=new SupabaseAuthAdapter({
    url:'https://sample.supabase.co',publishableKey:'sb_publishable_test',
    fetchImpl:async()=>jsonResponse(401,{error_description:'Invalid login credentials'}),
  });
  await assert.rejects(()=>adapter.signInWithPassword({email:'a@example.com',password:'wrong'}),(error)=>{
    assert.equal(error.code,'AUTH_PROVIDER_REQUEST_FAILED');
    assert.equal(error.status,401);
    assert.equal(error.message,'Invalid login credentials');
    assert.equal(JSON.stringify(error).includes('wrong'),false);
    return true;
  });
});

test('Data API requires auth and validates tenant UUID before sending requests',async()=>{
  const client=new SupabaseDataApiClient({url:'https://sample.supabase.co',publishableKey:'sb_publishable_test',fetchImpl:async()=>{throw new Error('should not fetch');}});
  await assert.rejects(()=>client.listWorkspaces(),{code:'AUTH_REQUIRED'});
  await assert.rejects(()=>client.listProjects('token','not-a-uuid'),{code:'DATA_SCOPE_INVALID'});
  await assert.rejects(()=>client.createProject('token','11111111-1111-4111-8111-111111111111',{workspace_id:'22222222-2222-4222-8222-222222222222'}),{code:'RESOURCE_WORKSPACE_DENIED'});
});

test('Data API project reads carry explicit workspace filter in addition to RLS',async()=>{
  let calledUrl='';
  const client=new SupabaseDataApiClient({
    url:'https://sample.supabase.co',publishableKey:'sb_publishable_test',
    fetchImpl:async(url)=>{calledUrl=url;return jsonResponse(200,[]);},
  });
  await client.listProjects('token','11111111-1111-4111-8111-111111111111');
  assert.match(calledUrl,/workspace_id=eq%2E11111111-1111-4111-8111-111111111111/);
});

test('Supabase migration enforces RLS, least privilege, verified onboarding and tenant FK consistency',async()=>{
  const base=await readFile(new URL('../supabase/migrations/20260910054500_public_saas_foundation.sql',import.meta.url),'utf8');
  const lock=await readFile(new URL('../supabase/migrations/20260910055000_lock_tenant_scope.sql',import.meta.url),'utf8');
  for(const table of ['profiles','workspaces','memberships','projects','estimates','openings']){
    assert.match(base,new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(base,/revoke all on table[\s\S]+from anon,authenticated/);
  assert.doesNotMatch(base,/grant[^;]+delete/i);
  assert.match(base,/email_confirmed_at is not null/);
  assert.match(base,/foreign key \(project_id,workspace_id\)/);
  assert.match(base,/foreign key \(estimate_id,workspace_id\)/);
  assert.match(base,/security definer/);
  assert.match(lock,/workspace_id is immutable/);
  assert.equal(base.includes('service_role'),false);
});
