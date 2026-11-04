import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('S5 migration keeps the exposed workspace bootstrap RPC SECURITY INVOKER',async()=>{
  const sql=await readFile(new URL('../supabase/migrations/20260913014000_public_saas_security_baseline.sql',import.meta.url),'utf8');

  assert.match(sql,/create or replace function private\.bootstrap_workspace_with_owner\(workspace_name text\)[\s\S]+security definer/);
  assert.match(sql,/create or replace function public\.create_workspace_with_owner\(workspace_name text\)[\s\S]+security invoker/);
  assert.match(sql,/set search_path = ''/);
  assert.match(sql,/created_by_user_id\)[\s\S]+caller/);
  assert.match(sql,/caller,'OWNER','ACTIVE'/);
  assert.match(sql,/email_confirmed_at is not null/);
  assert.match(sql,/revoke execute on function private\.bootstrap_workspace_with_owner\(text\)[\s\S]+from public, anon, authenticated/);
  assert.match(sql,/grant execute on function private\.bootstrap_workspace_with_owner\(text\)[\s\S]+to authenticated/);
  assert.match(sql,/revoke execute on function public\.create_workspace_with_owner\(text\)[\s\S]+from public, anon, authenticated/);
  assert.match(sql,/grant execute on function public\.create_workspace_with_owner\(text\)[\s\S]+to authenticated/);
  assert.doesNotMatch(sql,/grant\s+insert/i);
  assert.doesNotMatch(sql,/service_role/i);
});
