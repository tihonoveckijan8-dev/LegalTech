-- Secure first-workspace bootstrap
-- WHY: organization and owner membership must be created atomically; the browser
-- must never be able to grant itself membership through direct table writes.

create or replace function public.create_organization(
  organization_name text,
  organization_country_code text default 'BY',
  organization_currency text default 'BYN'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  new_organization_id uuid;
  clean_name text := trim(coalesce(organization_name, ''));
  clean_country text := upper(trim(coalesce(organization_country_code, 'BY')));
  clean_currency text := upper(trim(coalesce(organization_currency, 'BYN')));
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if length(clean_name) < 2 or length(clean_name) > 180 then
    raise exception 'Organization name must contain 2 to 180 characters'
      using errcode = '22023';
  end if;

  if clean_country !~ '^[A-Z]{2}$' then
    raise exception 'Country code must contain two letters' using errcode = '22023';
  end if;

  if clean_currency !~ '^[A-Z]{3}$' then
    raise exception 'Currency code must contain three letters' using errcode = '22023';
  end if;

  insert into public.organizations (name, country_code, default_currency, created_by)
  values (clean_name, clean_country, clean_currency, caller_id)
  returning id into new_organization_id;

  insert into public.organization_memberships (
    organization_id, user_id, role, status, joined_at
  )
  values (
    new_organization_id, caller_id, 'owner', 'active', now()
  );

  insert into public.audit_events (
    organization_id, actor_id, action, entity_type, entity_id, metadata
  )
  values (
    new_organization_id, caller_id, 'organization.created',
    'organization', new_organization_id,
    jsonb_build_object('name', clean_name)
  );

  return new_organization_id;
end;
$$;

revoke all on function public.create_organization(text, text, text) from public, anon;
grant execute on function public.create_organization(text, text, text) to authenticated;
