-- Core schema: identity, tenancy, roles, audit.
-- Access is enforced here with RLS so direct PostgREST/API calls obey the same rules as the UI.

create extension if not exists pgcrypto with schema extensions;

create type org_kind as enum ('internal', 'client');
create type membership_status as enum ('pending', 'active', 'revoked');
create type app_role as enum (
  -- platform roles (only valid on the internal Azentio org)
  'employee', 'moderator', 'publisher', 'product_owner', 'portal_admin',
  -- client roles (only valid on client orgs)
  'client_member', 'client_admin'
);

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  kind org_kind not null,
  industry text,
  region text,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  full_name text,
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  org_id uuid not null references organizations on delete cascade,
  status membership_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (user_id, org_id)
);

create table role_grants (
  membership_id uuid not null references memberships on delete cascade,
  role app_role not null,
  granted_by uuid references profiles,
  created_at timestamptz not null default now(),
  primary key (membership_id, role)
);

create table audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  org_id uuid,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table app_config (
  key text primary key,
  value jsonb not null
);
insert into app_config values ('min_cohort_orgs', '3');

-- ---------- helper functions (security definer so RLS policies can call them without recursion)

create function public.audit(p_action text, p_entity text, p_entity_id text, p_org uuid, p_data jsonb default '{}')
returns void language sql security definer set search_path = public as $$
  insert into audit_log (actor_id, action, entity, entity_id, org_id, data)
  values (auth.uid(), p_action, p_entity, p_entity_id, p_org, coalesce(p_data, '{}'));
$$;

create function public.has_role(p_role app_role, p_org uuid default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships m join role_grants g on g.membership_id = m.id
    where m.user_id = auth.uid() and m.status = 'active' and g.role = p_role
      and (p_org is null or m.org_id = p_org)
  );
$$;

create function public.is_member(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships where user_id = auth.uid() and org_id = p_org and status = 'active');
$$;

create function public.is_employee()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role('employee');
$$;

create function public.is_client()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships m join organizations o on o.id = m.org_id
    where m.user_id = auth.uid() and m.status = 'active' and o.kind = 'client'
  );
$$;

-- Participants in the collective learning community.
create function public.is_learning_participant()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_employee() or public.is_client();
$$;

-- Platform roles only on internal org, client roles only on client orgs.
create function public.check_role_scope() returns trigger language plpgsql as $$
declare k org_kind;
begin
  select o.kind into k from memberships m join organizations o on o.id = m.org_id where m.id = new.membership_id;
  if new.role in ('client_member', 'client_admin') and k <> 'client' then
    raise exception 'client roles can only be granted on client organisations';
  end if;
  if new.role not in ('client_member', 'client_admin') and k <> 'internal' then
    raise exception 'platform roles can only be granted on the internal organisation';
  end if;
  return new;
end $$;
create trigger role_scope before insert or update on role_grants for each row execute function check_role_scope();

create function public.audit_role_grants() returns trigger language plpgsql security definer set search_path = public as $$
declare r record;
begin
  r := coalesce(new, old);
  perform public.audit(lower(tg_op) || '_role', 'role_grant', r.membership_id::text,
    (select org_id from memberships where id = r.membership_id), jsonb_build_object('role', r.role));
  return r;
end $$;
create trigger role_grants_audit after insert or delete on role_grants for each row execute function audit_role_grants();

create function public.audit_memberships() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.audit(lower(tg_op) || '_membership', 'membership', new.id::text, new.org_id,
    jsonb_build_object('user_id', new.user_id, 'status', new.status));
  return new;
end $$;
create trigger memberships_audit after insert or update on memberships for each row execute function audit_memberships();

-- New auth user -> profile. @azentio.com users get a *pending* internal membership;
-- an admin must approve it (domain alone never grants access).
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, lower(new.email), new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  if lower(new.email) like '%@azentio.com' then
    insert into memberships (user_id, org_id, status)
    select new.id, id, 'pending' from organizations where kind = 'internal'
    on conflict do nothing;
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- ---------- RLS

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table memberships enable row level security;
alter table role_grants enable row level security;
alter table audit_log enable row level security;
alter table app_config enable row level security;

create policy org_read on organizations for select using (
  is_member(id) or has_role('portal_admin') or has_role('moderator')
);
create policy org_admin_write on organizations for all using (has_role('portal_admin')) with check (has_role('portal_admin'));

create policy profile_self on profiles for select using (
  id = auth.uid()
  or has_role('portal_admin')
  -- client admins see profiles of members of their own org
  or exists (select 1 from memberships m where m.user_id = profiles.id and has_role('client_admin', m.org_id))
);
create policy profile_self_update on profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy membership_read on memberships for select using (
  user_id = auth.uid() or has_role('portal_admin') or has_role('client_admin', org_id)
);
create policy membership_admin on memberships for all using (has_role('portal_admin')) with check (has_role('portal_admin'));
create policy membership_client_admin_update on memberships for update
  using (has_role('client_admin', org_id) and user_id <> auth.uid())
  with check (has_role('client_admin', org_id));

create policy grants_read on role_grants for select using (
  exists (select 1 from memberships m where m.id = membership_id
          and (m.user_id = auth.uid() or has_role('portal_admin') or has_role('client_admin', m.org_id)))
);
create policy grants_admin on role_grants for all using (has_role('portal_admin')) with check (has_role('portal_admin'));
-- client admins may only grant/revoke client roles inside their own org (scope trigger blocks platform roles there too)
create policy grants_client_admin on role_grants for all
  using (role in ('client_member', 'client_admin') and exists (select 1 from memberships m where m.id = membership_id and has_role('client_admin', m.org_id)))
  with check (role in ('client_member', 'client_admin') and exists (select 1 from memberships m where m.id = membership_id and has_role('client_admin', m.org_id)));

create policy audit_read on audit_log for select using (has_role('portal_admin'));
create policy config_read on app_config for select using (true);
create policy config_write on app_config for all using (has_role('portal_admin')) with check (has_role('portal_admin'));
