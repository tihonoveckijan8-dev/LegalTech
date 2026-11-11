-- Append-only audit trail for contract and document lifecycle events.
-- WHY: authenticated browser clients must never write their own audit records.
-- SECURITY DEFINER triggers record mutations inside the same database transaction.

create index if not exists audit_events_org_created_idx
  on public.audit_events (organization_id, created_at desc);

create or replace function private.audit_contract_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_fields text[];
begin
  if tg_op = 'INSERT' then
    insert into public.audit_events (
      organization_id, actor_id, action, entity_type, entity_id, metadata
    )
    values (
      new.organization_id,
      coalesce(auth.uid(), new.created_by),
      'contract.created',
      'contract',
      new.id,
      jsonb_build_object(
        'title', new.title,
        'contract_number', new.contract_number,
        'status', new.status
      )
    );
    return new;
  end if;

  changed_fields := array_remove(array[
    case when new.title is distinct from old.title then 'title' end,
    case when new.counterparty_id is distinct from old.counterparty_id then 'counterparty_id' end,
    case when new.contract_number is distinct from old.contract_number then 'contract_number' end,
    case when new.contract_type is distinct from old.contract_type then 'contract_type' end,
    case when new.status is distinct from old.status then 'status' end,
    case when new.amount is distinct from old.amount then 'amount' end,
    case when new.currency is distinct from old.currency then 'currency' end,
    case when new.effective_date is distinct from old.effective_date then 'effective_date' end,
    case when new.expiration_date is distinct from old.expiration_date then 'expiration_date' end,
    case when new.owner_user_id is distinct from old.owner_user_id then 'owner_user_id' end,
    case when new.description is distinct from old.description then 'description' end
  ], null);

  if cardinality(changed_fields) = 0 then
    return new;
  end if;

  insert into public.audit_events (
    organization_id, actor_id, action, entity_type, entity_id, metadata
  )
  values (
    new.organization_id,
    auth.uid(),
    'contract.updated',
    'contract',
    new.id,
    jsonb_build_object(
      'title', new.title,
      'changed_fields', to_jsonb(changed_fields),
      'status_before', case when new.status is distinct from old.status then old.status::text else null end,
      'status_after', case when new.status is distinct from old.status then new.status::text else null end
    )
  );

  return new;
end;
$$;

revoke all on function private.audit_contract_write() from public, anon, authenticated;

drop trigger if exists contracts_audit_write on public.contracts;
create trigger contracts_audit_write
  after insert or update on public.contracts
  for each row execute function private.audit_contract_write();

create or replace function private.audit_contract_version_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_events (
    organization_id, actor_id, action, entity_type, entity_id, metadata
  )
  values (
    new.organization_id,
    coalesce(auth.uid(), new.uploaded_by),
    'contract.document_version_uploaded',
    'contract_version',
    new.id,
    jsonb_build_object(
      'contract_id', new.contract_id,
      'version_number', new.version_number,
      'original_filename', new.original_filename,
      'file_size_bytes', new.file_size_bytes
    )
  );
  return new;
end;
$$;

revoke all on function private.audit_contract_version_insert() from public, anon, authenticated;

drop trigger if exists contract_versions_audit_insert on public.contract_versions;
create trigger contract_versions_audit_insert
  after insert on public.contract_versions
  for each row execute function private.audit_contract_version_insert();
