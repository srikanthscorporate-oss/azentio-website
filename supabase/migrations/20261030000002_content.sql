-- Catalogue, audience-scoped content, invitations, public forms, sandbox runs.

create type content_audience as enum ('public', 'employee', 'client_all', 'client_org', 'entitled');
create type content_kind as enum ('banner', 'insight', 'video', 'broadcast', 'session', 'release_note', 'knowledge', 'experiment', 'briefing');

create table offerings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null,
  tagline text not null,
  description text not null,
  is_public boolean not null default true
);

create table entitlements (
  org_id uuid not null references organizations on delete cascade,
  offering_id uuid not null references offerings on delete cascade,
  primary key (org_id, offering_id)
);

create table content_items (
  id uuid primary key default gen_random_uuid(),
  kind content_kind not null,
  title text not null,
  body text not null default '',
  media_path text,            -- object path in the private 'media' bucket; served only via /api/media/[id]
  external_url text,
  audience content_audience not null, -- no default: audience must be explicit
  org_id uuid references organizations on delete cascade,
  offering_id uuid references offerings on delete set null,
  starts_at timestamptz,
  is_published boolean not null default false,
  owner_id uuid references profiles,
  review_due date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (audience <> 'client_org' or org_id is not null),
  check (audience <> 'entitled' or offering_id is not null)
);

create function public.can_view_content(c content_items)
returns boolean language sql stable security definer set search_path = public as $$
  select c.is_published and (
    c.audience = 'public'
    or (c.audience = 'employee' and is_employee())
    or (c.audience = 'client_all' and (is_client() or is_employee()))
    or (c.audience = 'client_org' and is_member(c.org_id))
    or (c.audience = 'entitled' and (is_employee() or exists (
          select 1 from entitlements e join memberships m on m.org_id = e.org_id
          where e.offering_id = c.offering_id and m.user_id = auth.uid() and m.status = 'active')))
  );
$$;

create table invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  email text not null,
  role app_role not null check (role in ('client_member', 'client_admin')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  invited_by uuid references profiles,
  accepted_at timestamptz,
  accepted_by uuid references profiles,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table demo_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) <= 200),
  company text not null check (char_length(company) <= 200),
  offering_slug text,
  message text check (char_length(message) <= 2000),
  created_at timestamptz not null default now()
);

create table event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) <= 200),
  team text check (char_length(team) <= 200),
  created_at timestamptz not null default now(),
  unique (event_slug, email)
);

create table sandbox_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations,
  user_id uuid not null references profiles default auth.uid(),
  offering_id uuid not null references offerings,
  scenario text not null,
  inputs jsonb not null,
  output jsonb not null,
  feedback_rating text check (feedback_rating in ('useful', 'not_useful', 'needs_evidence')),
  feedback_note text check (char_length(feedback_note) <= 1000),
  created_at timestamptz not null default now()
);

alter table offerings enable row level security;
alter table entitlements enable row level security;
alter table content_items enable row level security;
alter table invitations enable row level security;
alter table demo_requests enable row level security;
alter table event_registrations enable row level security;
alter table sandbox_runs enable row level security;

create policy offerings_read on offerings for select using (is_public or is_employee());
create policy offerings_admin on offerings for all using (has_role('portal_admin')) with check (has_role('portal_admin'));

create policy entitlements_read on entitlements for select using (is_member(org_id) or is_employee());
create policy entitlements_admin on entitlements for all using (has_role('portal_admin')) with check (has_role('portal_admin'));

create policy content_read on content_items for select using (can_view_content(content_items) or has_role('publisher'));
create policy content_publisher on content_items for all using (has_role('publisher')) with check (has_role('publisher'));

create policy invites_read on invitations for select using (has_role('client_admin', org_id) or has_role('portal_admin'));
create policy invites_write on invitations for insert with check (
  (has_role('client_admin', org_id) or has_role('portal_admin')) and invited_by = auth.uid()
);
create policy invites_revoke on invitations for update
  using (has_role('client_admin', org_id) or has_role('portal_admin'))
  with check (has_role('client_admin', org_id) or has_role('portal_admin'));

create policy demo_insert on demo_requests for insert with check (true);
create policy demo_read on demo_requests for select using (has_role('portal_admin') or has_role('publisher'));
create policy event_insert on event_registrations for insert with check (true);
create policy event_read on event_registrations for select using (has_role('portal_admin') or has_role('publisher'));

-- Runs are isolated per user; client admins can see their org's runs. Must be entitled (or internal).
create policy runs_read on sandbox_runs for select using (user_id = auth.uid() or has_role('client_admin', org_id));
create policy runs_insert on sandbox_runs for insert with check (
  user_id = auth.uid() and is_member(org_id) and (
    exists (select 1 from organizations o where o.id = org_id and o.kind = 'internal')
    or exists (select 1 from entitlements e where e.org_id = sandbox_runs.org_id and e.offering_id = sandbox_runs.offering_id)
  )
);
create policy runs_feedback on sandbox_runs for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Invitation acceptance: single use, unexpired, and only for the verified email it was issued to.
create function public.accept_invitation(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare inv invitations; v_email text; v_membership uuid;
begin
  select * into inv from invitations where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') for update;
  if inv.id is null then raise exception 'invalid invitation'; end if;
  if inv.accepted_at is not null or inv.revoked_at is not null then raise exception 'invitation already used or revoked'; end if;
  if inv.expires_at < now() then raise exception 'invitation expired'; end if;
  select email into v_email from profiles where id = auth.uid();
  if v_email is null or lower(v_email) <> lower(inv.email) then raise exception 'invitation was issued to a different account'; end if;

  insert into memberships (user_id, org_id, status) values (auth.uid(), inv.org_id, 'active')
  on conflict (user_id, org_id) do update set status = 'active'
  returning id into v_membership;
  insert into role_grants (membership_id, role, granted_by) values (v_membership, inv.role, inv.invited_by)
  on conflict do nothing;
  update invitations set accepted_at = now(), accepted_by = auth.uid() where id = inv.id;
  perform audit('accept_invitation', 'invitation', inv.id::text, inv.org_id, jsonb_build_object('role', inv.role));
  return inv.org_id;
end $$;

-- Private media bucket: no direct client access; the app serves signed URLs after an access check.
insert into storage.buckets (id, name, public) values ('media', 'media', false) on conflict do nothing;
