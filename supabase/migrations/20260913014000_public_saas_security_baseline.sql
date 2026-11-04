-- Public SaaS S5 security hardening.
-- Keep the exposed RPC SECURITY INVOKER and isolate the atomic privileged
-- bootstrap inside the non-exposed private schema.

create or replace function private.bootstrap_workspace_with_owner(workspace_name text)
returns public.workspaces
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  created public.workspaces;
begin
  if caller is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from auth.users u
    where u.id = caller
      and u.email_confirmed_at is not null
  ) then
    raise exception 'verified email required' using errcode = '42501';
  end if;

  if workspace_name is null
     or length(btrim(workspace_name)) = 0
     or length(btrim(workspace_name)) > 120 then
    raise exception 'invalid workspace name' using errcode = '22023';
  end if;

  insert into public.workspaces(name,created_by_user_id)
  values (btrim(workspace_name),caller)
  returning * into created;

  insert into public.memberships(workspace_id,user_id,role,status)
  values (created.workspace_id,caller,'OWNER','ACTIVE');

  return created;
end;
$$;

revoke execute on function private.bootstrap_workspace_with_owner(text)
  from public, anon, authenticated;
grant execute on function private.bootstrap_workspace_with_owner(text)
  to authenticated;

create or replace function public.create_workspace_with_owner(workspace_name text)
returns public.workspaces
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.bootstrap_workspace_with_owner(workspace_name);
end;
$$;

revoke execute on function public.create_workspace_with_owner(text)
  from public, anon, authenticated;
grant execute on function public.create_workspace_with_owner(text)
  to authenticated;
