begin;

create extension if not exists pgtap with schema extensions;

select plan(26);

select ok(to_regclass('public.organizations') is not null, 'organizations table exists');
select ok(to_regclass('public.contracts') is not null, 'contracts table exists');
select ok(to_regclass('public.contract_versions') is not null, 'contract_versions table exists');
select ok(to_regclass('public.audit_events') is not null, 'audit_events table exists');

select ok(
  (select c.relrowsecurity from pg_class c where c.oid = 'public.contracts'::regclass),
  'contracts has row level security enabled'
);
select ok(
  (select c.relrowsecurity from pg_class c where c.oid = 'public.audit_events'::regclass),
  'audit_events has row level security enabled'
);

select ok(
  has_table_privilege('authenticated', 'public.audit_events', 'SELECT'),
  'authenticated can read audit rows subject to RLS'
);
select ok(
  not has_table_privilege('authenticated', 'public.audit_events', 'INSERT'),
  'authenticated cannot insert audit rows directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.audit_events', 'UPDATE'),
  'authenticated cannot update audit rows'
);
select ok(
  not has_table_privilege('authenticated', 'public.audit_events', 'DELETE'),
  'authenticated cannot delete audit rows'
);

select ok(
  to_regprocedure('public.create_organization(text,text,text)') is not null,
  'atomic organization bootstrap RPC exists'
);
select ok(
  has_function_privilege('authenticated', 'public.create_organization(text,text,text)', 'EXECUTE'),
  'authenticated can call organization bootstrap RPC'
);
select ok(
  not has_function_privilege('anon', 'public.create_organization(text,text,text)', 'EXECUTE'),
  'anonymous users cannot call organization bootstrap RPC'
);

select ok(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.contracts'::regclass
      and tgname = 'contracts_audit_write'
      and not tgisinternal
  ),
  'contract audit trigger is installed'
);
select ok(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.contract_versions'::regclass
      and tgname = 'contract_versions_audit_insert'
      and not tgisinternal
  ),
  'document version audit trigger is installed'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_events'
      and policyname = 'audit_select_owner_director'
      and cmd = 'SELECT'
  ),
  'audit read policy is present'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'legal_contracts_read_org_members'
  ),
  'private document read policy is present'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'legal_contracts_upload_managers'
  ),
  'document upload policy is present'
);
select ok(
  (select not public from storage.buckets where id = 'legal-contracts'),
  'contract document bucket is private'
);

select ok(
  has_table_privilege('authenticated', 'public.contract_versions', 'SELECT')
  and has_table_privilege('authenticated', 'public.contract_versions', 'INSERT')
  and not has_table_privilege('authenticated', 'public.contract_versions', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.contract_versions', 'DELETE'),
  'document version metadata is append-only for authenticated clients'
);


-- Create isolated test identities and two independent organizations.
insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'owner-a@legalflow.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('10000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'manager-a@legalflow.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('20000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'owner-b@legalflow.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.organizations (id, name, created_by)
values
  ('a0000000-0000-4000-8000-000000000001', 'LegalFlow Test A', '10000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000001', 'LegalFlow Test B', '20000000-0000-4000-8000-000000000001');

insert into public.organization_memberships (organization_id, user_id, role, status, joined_at)
values
  ('a0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'owner', 'active', now()),
  ('a0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'manager', 'active', now()),
  ('b0000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'owner', 'active', now());

insert into public.contracts (
  organization_id, title, contract_type, status, currency, owner_user_id, created_by
)
values
  ('a0000000-0000-4000-8000-000000000001', 'Test contract A', 'other', 'draft', 'BYN',
   '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000001', 'Test contract B', 'other', 'draft', 'BYN',
   '20000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select ok(
  (select count(*) = 1 from public.contracts),
  'organization A owner sees only organization A contracts'
);
select ok(
  (select count(*) > 0 from public.audit_events where organization_id = 'a0000000-0000-4000-8000-000000000001'),
  'organization A owner can read organization A audit events'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select ok(
  (select count(*) = 1 from public.contracts where organization_id = 'a0000000-0000-4000-8000-000000000001'),
  'organization A manager can read member-visible contracts'
);
select ok(
  (select count(*) = 0 from public.audit_events where organization_id = 'a0000000-0000-4000-8000-000000000001'),
  'organization A manager cannot read owner-only audit events'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
select ok(
  (select count(*) = 1 from public.contracts),
  'organization B owner sees only organization B contracts'
);
select ok(
  (select count(*) = 0 from public.audit_events where organization_id = 'a0000000-0000-4000-8000-000000000001'),
  'organization B owner cannot read organization A audit events'
);
reset role;

select * from finish();
rollback;
