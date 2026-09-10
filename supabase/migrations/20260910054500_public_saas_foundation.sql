-- Public SaaS Foundation / Supabase schema v0.1
-- NON-PRODUCT-MASTER / PRODUCT_MASTER_MUTATION = 0

create schema if not exists private;
revoke all on schema private from public;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','SUSPENDED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  workspace_id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','ARCHIVED')),
  created_by_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  membership_id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(workspace_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('OWNER','ADMIN','MEMBER')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INVITED','SUSPENDED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id,user_id)
);

create table public.projects (
  project_id text primary key,
  workspace_id uuid not null references public.workspaces(workspace_id),
  owner_user_id uuid not null references auth.users(id),
  project_name text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','COMPLETED','ARCHIVED')),
  request_company text,
  request_company_contact text,
  sales_person text,
  customer_name text,
  postal_code text,
  prefecture text,
  city text,
  street text,
  building text,
  project_type text,
  memo text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  unique (project_id,workspace_id)
);

create table public.estimates (
  estimate_id text primary key,
  workspace_id uuid not null references public.workspaces(workspace_id),
  project_id text not null,
  estimate_no integer not null,
  revision_no integer not null default 0,
  status text not null default 'DRAFT' check (status in ('DRAFT','READY','SUBMITTED','REVISED','ARCHIVED')),
  estimate_title text,
  requested_at timestamptz,
  due_date date,
  memo text,
  supersedes_estimate_id text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  unique (estimate_id,workspace_id),
  constraint estimates_project_workspace_fk foreign key (project_id,workspace_id)
    references public.projects(project_id,workspace_id) on delete cascade
);

create table public.openings (
  opening_id text primary key,
  workspace_id uuid not null references public.workspaces(workspace_id),
  estimate_id text not null,
  opening_no integer not null,
  sort_order integer not null default 0,
  status text not null default 'DRAFT' check (status in ('DRAFT','COMPLETE')),
  room_name text,
  location text,
  opening_name text,
  memo text,
  product_configuration_snapshot jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  constraint openings_estimate_workspace_fk foreign key (estimate_id,workspace_id)
    references public.estimates(estimate_id,workspace_id) on delete cascade
);

create index memberships_user_status_idx on public.memberships(user_id,status,workspace_id);
create index memberships_workspace_status_idx on public.memberships(workspace_id,status,user_id);
create index projects_workspace_updated_idx on public.projects(workspace_id,updated_at desc);
create index estimates_workspace_project_idx on public.estimates(workspace_id,project_id,updated_at desc);
create index openings_workspace_estimate_idx on public.openings(workspace_id,estimate_id,sort_order);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
create trigger workspaces_set_updated_at before update on public.workspaces
for each row execute function private.set_updated_at();
create trigger memberships_set_updated_at before update on public.memberships
for each row execute function private.set_updated_at();

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(user_id,display_name)
  values (new.id,nullif(btrim(new.raw_user_meta_data ->> 'display_name'),''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_auth_user();

create or replace function private.role_rank(role_name text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case role_name when 'OWNER' then 30 when 'ADMIN' then 20 when 'MEMBER' then 10 else 0 end
$$;

create or replace function private.has_workspace_role(target_workspace_id uuid,minimum_role text default 'MEMBER')
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.workspace_id = target_workspace_id
      and m.user_id = (select auth.uid())
      and m.status = 'ACTIVE'
      and private.role_rank(m.role) >= private.role_rank(minimum_role)
  )
$$;

revoke execute on function private.role_rank(text) from public;
revoke execute on function private.has_workspace_role(uuid,text) from public;
grant usage on schema private to authenticated;
grant execute on function private.has_workspace_role(uuid,text) to authenticated;

create or replace function public.create_workspace_with_owner(workspace_name text)
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
  if not exists (select 1 from auth.users u where u.id = caller and u.email_confirmed_at is not null) then
    raise exception 'verified email required' using errcode = '42501';
  end if;
  if workspace_name is null or length(btrim(workspace_name)) = 0 or length(btrim(workspace_name)) > 120 then
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

revoke execute on function public.create_workspace_with_owner(text) from public,anon;
grant execute on function public.create_workspace_with_owner(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.memberships enable row level security;
alter table public.projects enable row level security;
alter table public.estimates enable row level security;
alter table public.openings enable row level security;

revoke all on table public.profiles,public.workspaces,public.memberships,public.projects,public.estimates,public.openings from anon,authenticated;
grant select,update on public.profiles to authenticated;
grant select on public.workspaces,public.memberships to authenticated;
grant select,insert,update on public.projects,public.estimates,public.openings to authenticated;

create policy profiles_select_self on public.profiles for select to authenticated
using (user_id = (select auth.uid()));
create policy profiles_update_self on public.profiles for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy workspaces_select_member on public.workspaces for select to authenticated
using (private.has_workspace_role(workspace_id,'MEMBER'));

create policy memberships_select_member on public.memberships for select to authenticated
using (private.has_workspace_role(workspace_id,'MEMBER'));

create policy projects_select_member on public.projects for select to authenticated
using (private.has_workspace_role(workspace_id,'MEMBER'));
create policy projects_insert_member on public.projects for insert to authenticated
with check (
  private.has_workspace_role(workspace_id,'MEMBER')
  and owner_user_id = (select auth.uid())
);
create policy projects_update_member on public.projects for update to authenticated
using (private.has_workspace_role(workspace_id,'MEMBER'))
with check (private.has_workspace_role(workspace_id,'MEMBER'));

create policy estimates_select_member on public.estimates for select to authenticated
using (private.has_workspace_role(workspace_id,'MEMBER'));
create policy estimates_insert_member on public.estimates for insert to authenticated
with check (private.has_workspace_role(workspace_id,'MEMBER'));
create policy estimates_update_member on public.estimates for update to authenticated
using (private.has_workspace_role(workspace_id,'MEMBER'))
with check (private.has_workspace_role(workspace_id,'MEMBER'));

create policy openings_select_member on public.openings for select to authenticated
using (private.has_workspace_role(workspace_id,'MEMBER'));
create policy openings_insert_member on public.openings for insert to authenticated
with check (private.has_workspace_role(workspace_id,'MEMBER'));
create policy openings_update_member on public.openings for update to authenticated
using (private.has_workspace_role(workspace_id,'MEMBER'))
with check (private.has_workspace_role(workspace_id,'MEMBER'));
