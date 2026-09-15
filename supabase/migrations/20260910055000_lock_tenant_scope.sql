-- Prevent tenant hopping through UPDATE even when a user belongs to multiple workspaces.

create or replace function private.prevent_workspace_reassignment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.workspace_id is distinct from new.workspace_id then
    raise exception 'workspace_id is immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger projects_lock_workspace before update on public.projects
for each row execute function private.prevent_workspace_reassignment();
create trigger estimates_lock_workspace before update on public.estimates
for each row execute function private.prevent_workspace_reassignment();
create trigger openings_lock_workspace before update on public.openings
for each row execute function private.prevent_workspace_reassignment();
