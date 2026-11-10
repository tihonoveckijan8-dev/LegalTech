-- LegalFlow initial schema
-- WHY: keep tenant boundaries and authorization in PostgreSQL, not in React state.
create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.organization_role as enum (
  'owner', 'director', 'manager', 'lawyer', 'accountant'
);
create type public.membership_status as enum ('active', 'invited', 'suspended');
create type public.contract_status as enum (
  'draft', 'legal_review', 'manager_revision', 'accounting_review',
  'director_approval', 'approved', 'signed', 'rejected', 'archived'
);
create type public.approval_decision as enum ('pending', 'approved', 'rejected', 'changes_requested');
create type public.task_status as enum ('open', 'in_progress', 'done', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 180),
  country_code char(2) not null default 'BY',
  default_currency char(3) not null default 'BYN',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null default 'manager',
  status public.membership_status not null default 'invited',
  invited_email text,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id),
  unique (organization_id, id)
);

create table public.counterparties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 240),
  country_code char(2),
  registration_number text,
  tax_number text,
  email text,
  phone text,
  address text,
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  counterparty_id uuid,
  contract_number text,
  title text not null check (length(trim(title)) between 2 and 240),
  contract_type text not null,
  status public.contract_status not null default 'draft',
  amount numeric(18,2) check (amount is null or amount >= 0),
  currency char(3) not null default 'BYN',
  effective_date date,
  expiration_date date,
  owner_user_id uuid not null references auth.users(id),
  created_by uuid not null references auth.users(id),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint contracts_counterparty_same_org
    foreign key (organization_id, counterparty_id)
    references public.counterparties(organization_id, id),
  constraint contracts_expiration_after_effective
    check (effective_date is null or expiration_date is null or expiration_date >= effective_date)
);

create table public.contract_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  contract_id uuid not null,
  version_number integer not null check (version_number > 0),
  storage_path text not null,
  original_filename text not null,
  mime_type text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  change_note text,
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (contract_id, version_number),
  unique (organization_id, id),
  unique (organization_id, contract_id, id),
  foreign key (organization_id, contract_id)
    references public.contracts(organization_id, id) on delete cascade
);

create table public.approval_steps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  contract_id uuid not null,
  step_order smallint not null check (step_order > 0),
  required_role public.organization_role not null,
  assignee_user_id uuid references auth.users(id),
  decision public.approval_decision not null default 'pending',
  decision_note text,
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  unique (contract_id, step_order),
  unique (organization_id, id),
  foreign key (organization_id, contract_id)
    references public.contracts(organization_id, id) on delete cascade
);

create table public.contract_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  contract_id uuid not null,
  version_id uuid,
  author_id uuid not null references auth.users(id),
  body text not null check (length(trim(body)) between 1 and 10000),
  created_at timestamptz not null default now(),
  foreign key (organization_id, contract_id)
    references public.contracts(organization_id, id) on delete cascade,
  foreign key (organization_id, contract_id, version_id)
    references public.contract_versions(organization_id, contract_id, id)
);

create table public.contract_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  contract_id uuid,
  title text not null check (length(trim(title)) between 2 and 240),
  description text,
  assignee_user_id uuid references auth.users(id),
  created_by uuid not null references auth.users(id),
  status public.task_status not null default 'open',
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, contract_id)
    references public.contracts(organization_id, id) on delete cascade
);

create table public.contract_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  contract_id uuid not null,
  version_id uuid,
  storage_path text not null unique,
  document_kind text not null,
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (organization_id, contract_id)
    references public.contracts(organization_id, id) on delete cascade,
  foreign key (organization_id, contract_id, version_id)
    references public.contract_versions(organization_id, contract_id, id)
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index memberships_user_status_idx on public.organization_memberships(user_id, status);
create index counterparties_org_name_idx on public.counterparties(organization_id, name);
create index contracts_org_status_updated_idx on public.contracts(organization_id, status, updated_at desc);
create index contracts_org_owner_idx on public.contracts(organization_id, owner_user_id);
create index contracts_org_expiration_idx on public.contracts(organization_id, expiration_date)
  where expiration_date is not null;
create index versions_contract_created_idx on public.contract_versions(contract_id, created_at desc);
create index approvals_assignee_pending_idx on public.approval_steps(assignee_user_id, due_at)
  where decision = 'pending';
create index tasks_org_status_due_idx on public.contract_tasks(organization_id, status, due_at);
create index audit_org_created_idx on public.audit_events(organization_id, created_at desc);

-- WHY: this narrowly scoped helper avoids recursive RLS when policies inspect memberships.
-- It lives outside exposed schemas, has a fixed search_path, and checks the caller's auth.uid().
create or replace function private.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = target_org
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  );
$$;

create or replace function private.has_org_role(target_org uuid, allowed_roles public.organization_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = target_org
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = any(allowed_roles)
  );
$$;

revoke all on function private.is_org_member(uuid) from public, anon;
revoke all on function private.has_org_role(uuid, public.organization_role[]) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.has_org_role(uuid, public.organization_role[]) to authenticated;

-- A new Auth user receives a private profile row; organization creation/invites
-- will be performed by a trusted server-side flow in a later step.
create or replace function private.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.create_profile_for_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function private.create_profile_for_new_user();

-- updated_at is maintained centrally for mutable business records.
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
revoke all on function private.set_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
create trigger organizations_set_updated_at before update on public.organizations
for each row execute function private.set_updated_at();
create trigger counterparties_set_updated_at before update on public.counterparties
for each row execute function private.set_updated_at();
create trigger contracts_set_updated_at before update on public.contracts
for each row execute function private.set_updated_at();
create trigger tasks_set_updated_at before update on public.contract_tasks
for each row execute function private.set_updated_at();

-- RLS is enabled on every exposed table.
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.counterparties enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_versions enable row level security;
alter table public.approval_steps enable row level security;
alter table public.contract_comments enable row level security;
alter table public.contract_tasks enable row level security;
alter table public.contract_documents enable row level security;
alter table public.audit_events enable row level security;

create policy "profiles_select_self_or_colleagues"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1 from public.organization_memberships mine
    join public.organization_memberships theirs
      on theirs.organization_id = mine.organization_id
    where mine.user_id = (select auth.uid())
      and mine.status = 'active'
      and theirs.user_id = profiles.id
      and theirs.status = 'active'
  )
);
create policy "profiles_update_self"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "organizations_select_members"
on public.organizations for select to authenticated
using ((select private.is_org_member(id)));

create policy "memberships_select_same_org"
on public.organization_memberships for select to authenticated
using ((select private.is_org_member(organization_id)) or user_id = (select auth.uid()));

create policy "counterparties_select_members"
on public.counterparties for select to authenticated
using ((select private.is_org_member(organization_id)));
create policy "counterparties_insert_managers"
on public.counterparties for insert to authenticated
with check (
  created_by = (select auth.uid())
  and (select private.has_org_role(organization_id, array['owner','director','manager']::public.organization_role[]))
);
create policy "counterparties_update_managers"
on public.counterparties for update to authenticated
using ((select private.has_org_role(organization_id, array['owner','director','manager']::public.organization_role[])))
with check ((select private.has_org_role(organization_id, array['owner','director','manager']::public.organization_role[])));

create policy "contracts_select_members"
on public.contracts for select to authenticated
using ((select private.is_org_member(organization_id)));
create policy "contracts_insert_managers"
on public.contracts for insert to authenticated
with check (
  created_by = (select auth.uid())
  and owner_user_id = (select auth.uid())
  and (select private.has_org_role(organization_id, array['owner','director','manager']::public.organization_role[]))
);
create policy "contracts_update_working_roles"
on public.contracts for update to authenticated
using (
  (select private.has_org_role(organization_id, array['owner','director','manager','lawyer','accountant']::public.organization_role[]))
)
with check (
  (select private.has_org_role(organization_id, array['owner','director','manager','lawyer','accountant']::public.organization_role[]))
);

create policy "versions_select_members"
on public.contract_versions for select to authenticated
using ((select private.is_org_member(organization_id)));
create policy "versions_insert_managers"
on public.contract_versions for insert to authenticated
with check (
  uploaded_by = (select auth.uid())
  and (select private.has_org_role(organization_id, array['owner','director','manager']::public.organization_role[]))
);

create policy "approvals_select_members"
on public.approval_steps for select to authenticated
using ((select private.is_org_member(organization_id)));
-- Approval decisions are intentionally server-controlled; no direct client write policy.

create policy "comments_select_members"
on public.contract_comments for select to authenticated
using ((select private.is_org_member(organization_id)));
create policy "comments_insert_members"
on public.contract_comments for insert to authenticated
with check (
  author_id = (select auth.uid())
  and (select private.is_org_member(organization_id))
);

create policy "tasks_select_members"
on public.contract_tasks for select to authenticated
using ((select private.is_org_member(organization_id)));
create policy "tasks_insert_managers"
on public.contract_tasks for insert to authenticated
with check (
  created_by = (select auth.uid())
  and (select private.has_org_role(organization_id, array['owner','director','manager']::public.organization_role[]))
);
create policy "tasks_update_assignee_or_managers"
on public.contract_tasks for update to authenticated
using (
  assignee_user_id = (select auth.uid())
  or (select private.has_org_role(organization_id, array['owner','director','manager']::public.organization_role[]))
)
with check (
  assignee_user_id = (select auth.uid())
  or (select private.has_org_role(organization_id, array['owner','director','manager']::public.organization_role[]))
);

create policy "documents_select_members"
on public.contract_documents for select to authenticated
using ((select private.is_org_member(organization_id)));
create policy "documents_insert_managers"
on public.contract_documents for insert to authenticated
with check (
  uploaded_by = (select auth.uid())
  and (select private.has_org_role(organization_id, array['owner','director','manager']::public.organization_role[]))
);

create policy "audit_select_owner_director"
on public.audit_events for select to authenticated
using (
  (select private.has_org_role(organization_id, array['owner','director']::public.organization_role[]))
);
-- Audit events are append-only and will be written by trusted server-side functions.

-- Explicit least-privilege grants: grants control table reachability; RLS controls rows.
revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to authenticated;\ngrant select on public.profiles to authenticated;\ngrant update (display_name) on public.profiles to authenticated;
grant select on public.organizations, public.organization_memberships to authenticated;
grant select, insert, update on public.counterparties to authenticated;
grant select, insert on public.contracts to authenticated;\ngrant update (counterparty_id, contract_number, title, contract_type, amount, currency, effective_date, expiration_date, owner_user_id, description) on public.contracts to authenticated;
grant select, insert on public.contract_versions to authenticated;
grant select on public.approval_steps to authenticated;
grant select, insert on public.contract_comments to authenticated;
grant select, insert, update on public.contract_tasks to authenticated;
grant select, insert on public.contract_documents to authenticated;
grant select on public.audit_events to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Private bucket. Objects are stored as: <organization UUID>/<contract UUID>/<filename>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'legal-contracts',
  'legal-contracts',
  false,
  26214400,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "legal_contracts_read_org_members"
on storage.objects for select to authenticated
using (
  bucket_id = 'legal-contracts'
  and (select private.is_org_member(((storage.foldername(name))[1])::uuid))
  and exists (
    select 1 from public.contracts c
    where c.id = ((storage.foldername(name))[2])::uuid
      and c.organization_id = ((storage.foldername(name))[1])::uuid
  )
);

create policy "legal_contracts_upload_managers"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'legal-contracts'
  and (select private.has_org_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner','director','manager']::public.organization_role[]
  ))
  and exists (
    select 1 from public.contracts c
    where c.id = ((storage.foldername(name))[2])::uuid
      and c.organization_id = ((storage.foldername(name))[1])::uuid
  )
);

create policy "legal_contracts_delete_managers"
on storage.objects for delete to authenticated
using (
  bucket_id = 'legal-contracts'
  and (select private.has_org_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner','director','manager']::public.organization_role[]
  ))
  and exists (
    select 1 from public.contracts c
    where c.id = ((storage.foldername(name))[2])::uuid
      and c.organization_id = ((storage.foldername(name))[1])::uuid
  )
);
