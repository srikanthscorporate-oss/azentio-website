-- Collective learning: private contributions, moderated shared copies, reports, themes, ideas, notifications.

create type contribution_kind as enum (
  'market_observation', 'emerging_trend', 'product_gap', 'operational_challenge', 'successful_practice', 'improvement_suggestion'
);
create type contribution_visibility as enum ('private', 'organisation', 'proposed_shared');
create type contribution_state as enum ('draft', 'submitted', 'returned', 'published', 'rejected', 'withdrawn');
create type shared_status as enum ('published', 'unpublished', 'withdrawn');
create type idea_status as enum ('proposed', 'under_review', 'planned', 'in_progress', 'released', 'not_proceeding');

-- ---------- private source records

create table contributions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations,
  author_id uuid not null references profiles default auth.uid(),
  kind contribution_kind not null,
  title text not null check (char_length(title) between 5 and 160),
  body text not null check (char_length(body) between 20 and 4000),
  offering_id uuid references offerings,
  industry text check (char_length(industry) <= 80),
  region text check (char_length(region) <= 80),
  period_start date not null,
  period_end date not null check (period_end >= period_start),
  evidence_type text not null check (evidence_type in ('direct_experience', 'customer_feedback', 'internal_data', 'market_report', 'anecdotal')),
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  visibility contribution_visibility not null default 'private',
  state contribution_state not null default 'draft',
  version int not null default 1,
  -- separate consents; joining a workspace implies none of these
  consent_process boolean not null default false,
  consent_publish boolean not null default false,
  consent_attribution boolean not null default false,
  consent_training boolean not null default false,
  sensitive_flags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table consent_history (
  id bigint generated always as identity primary key,
  contribution_id uuid not null references contributions on delete cascade,
  user_id uuid not null,
  consents jsonb not null,
  created_at timestamptz not null default now()
);

-- ---------- reviewed shared representation (no tenant / author columns by design)

create table shared_contributions (
  id uuid primary key default gen_random_uuid(),
  kind contribution_kind not null,
  title text not null,
  body text not null,
  offering_id uuid references offerings,
  industry text,
  region text,              -- coarsened by moderator (e.g. "South-East Asia" not a city)
  period_label text not null, -- coarsened (e.g. "H1 2026")
  evidence_type text not null,
  confidence text not null,
  attribution text,          -- only when author consented AND moderator approved
  status shared_status not null default 'published',
  version int not null default 1,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, '') || ' ' || coalesce(industry, '') || ' ' || coalesce(region, ''))
  ) stored
);
create index shared_search_idx on shared_contributions using gin (search);

-- link back to source; moderators only. Used for withdrawal and distinct-org counting.
create table shared_sources (
  shared_id uuid primary key references shared_contributions on delete cascade,
  contribution_id uuid not null unique references contributions on delete cascade,
  org_id uuid not null references organizations
);

-- author-visible moderation history (public reasons only)
create table moderation_events (
  id bigint generated always as identity primary key,
  contribution_id uuid not null references contributions on delete cascade,
  actor_id uuid,
  action text not null,
  public_reason text,
  version int not null,
  created_at timestamptz not null default now()
);

-- internal reviewer notes; never visible to authors or in shared payloads
create table moderation_notes (
  id bigint generated always as identity primary key,
  contribution_id uuid not null references contributions on delete cascade,
  actor_id uuid not null,
  note text not null,
  created_at timestamptz not null default now()
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  shared_id uuid not null references shared_contributions on delete cascade,
  reporter_id uuid not null default auth.uid(),
  reason text not null check (reason in ('misleading', 'confidential', 'inappropriate', 'duplicate', 'other')),
  details text check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  decision text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table themes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  limitations text not null default 'Small, self-selected sample. Not evidence of market prevalence or causation.',
  offering_id uuid references offerings,
  created_by uuid references profiles,
  updated_at timestamptz not null default now()
);

create table theme_links (
  theme_id uuid not null references themes on delete cascade,
  shared_id uuid not null references shared_contributions on delete cascade,
  primary key (theme_id, shared_id)
);

create table improvement_ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  problem text not null,                 -- internal
  offering_id uuid references offerings,
  proposed_outcome text not null,        -- internal
  owner_team text not null,
  owner_id uuid references profiles,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status idea_status not null default 'proposed',
  theme_id uuid references themes,
  visible_to_clients boolean not null default false,
  public_update text,                    -- the only narrative clients see
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table idea_evidence (
  idea_id uuid not null references improvement_ideas on delete cascade,
  shared_id uuid not null references shared_contributions on delete cascade,
  primary key (idea_id, shared_id)
);

create table idea_status_history (
  id bigint generated always as identity primary key,
  idea_id uuid not null references improvement_ideas on delete cascade,
  from_status idea_status,
  to_status idea_status not null,
  actor_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  title text not null,
  body text not null,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- persisted outbox; a row here means "queued", never "delivered"
create table email_outbox (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  to_email text not null,
  subject text not null,
  body text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  attempts int not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- guards

-- Lifecycle columns can only change through the RPCs below (which set app.lifecycle).
create function public.guard_contribution() returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('app.lifecycle', true), '') = 'on' then
    new.updated_at := now();
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.state <> 'draft' or new.version <> 1 then raise exception 'contributions start as private drafts'; end if;
    return new;
  end if;
  if new.state <> old.state or new.version <> old.version or new.org_id <> old.org_id or new.author_id <> old.author_id then
    raise exception 'lifecycle fields change only through workflow actions';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger contributions_guard before insert or update on contributions for each row execute function guard_contribution();

create function public.record_consents() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or (new.consent_process, new.consent_publish, new.consent_attribution, new.consent_training)
     is distinct from (old.consent_process, old.consent_publish, old.consent_attribution, old.consent_training) then
    insert into consent_history (contribution_id, user_id, consents) values (new.id, coalesce(auth.uid(), new.author_id),
      jsonb_build_object('process', new.consent_process, 'publish', new.consent_publish,
                         'attribution', new.consent_attribution, 'training', new.consent_training));
  end if;
  return new;
end $$;
create trigger contributions_consents after insert or update on contributions for each row execute function record_consents();

-- ---------- helpers

create function public.notify(p_user uuid, p_title text, p_body text, p_link text)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, title, body, link) values (p_user, p_title, p_body, p_link);
  insert into email_outbox (idempotency_key, to_email, subject, body)
  select 'notif:' || p_user || ':' || md5(p_title || p_body || now()::text), email, p_title, p_body
  from profiles where id = p_user
  on conflict do nothing;
$$;

create function public.scan_sensitive(p_text text)
returns text[] language sql immutable as $$
  select array_remove(array[
    case when p_text ~ '\m\d{9,18}\M' then 'possible_account_number' end,
    case when p_text ~ '\m(?:\d[ -]?){13,16}\M' then 'possible_card_number' end,
    case when p_text ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' then 'email_address' end,
    case when p_text ~ '\+?\d[\d -]{8,}\d' then 'phone_number' end,
    case when p_text ~* '(password|passwd|api[_ -]?key|secret|token)\s*[:=]' then 'credential' end,
    case when p_text ~* '\m(iban|swift|sort code|routing number)\M' then 'banking_identifier' end,
    case when p_text ~* '\m(pricing|discount|rate card|contract value)\M' then 'possible_commercial_terms' end
  ], null);
$$;

create function public.set_lifecycle() returns void language sql as $$
  select set_config('app.lifecycle', 'on', true);
$$;

-- ---------- workflow actions

create function public.submit_contribution(p_id uuid)
returns contribution_state language plpgsql security definer set search_path = public as $$
declare c contributions;
begin
  select * into c from contributions where id = p_id for update;
  if c.id is null or c.author_id <> auth.uid() then raise exception 'not found'; end if;
  if not is_member(c.org_id) then raise exception 'membership inactive'; end if;
  if c.state not in ('draft', 'returned') then raise exception 'cannot submit from state %', c.state; end if;
  if c.visibility = 'private' then raise exception 'private contributions are not submitted; change visibility first'; end if;
  if not c.consent_process then raise exception 'consent to store and process is required'; end if;
  if c.visibility = 'proposed_shared' and not c.consent_publish then
    raise exception 'consent to publish a reviewed shared version is required to propose sharing';
  end if;

  perform set_lifecycle();
  update contributions set
    state = case when c.visibility = 'organisation' then 'published'::contribution_state else 'submitted' end,
    sensitive_flags = scan_sensitive(c.title || ' ' || c.body)
  where id = p_id;
  insert into moderation_events (contribution_id, actor_id, action, version)
  values (p_id, auth.uid(), case when c.visibility = 'organisation' then 'shared_with_organisation' else 'submitted' end, c.version);
  perform audit('submit', 'contribution', p_id::text, c.org_id, jsonb_build_object('visibility', c.visibility, 'version', c.version));
  perform notify(c.author_id, 'Contribution submitted',
    case when c.visibility = 'organisation' then 'Now visible to members of your organisation.'
         else 'Queued for moderation. Nothing is shared until a moderator approves a reviewed version.' end,
    '/client/observations/' || p_id);
  return (select state from contributions where id = p_id);
end $$;

-- Start a new version of a published/rejected contribution. The existing shared copy stays as-is until a new review.
create function public.revise_contribution(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c contributions;
begin
  select * into c from contributions where id = p_id for update;
  if c.id is null or c.author_id <> auth.uid() then raise exception 'not found'; end if;
  if c.state not in ('published', 'rejected') then raise exception 'cannot revise from state %', c.state; end if;
  perform set_lifecycle();
  update contributions set state = 'draft', version = version + 1 where id = p_id;
  insert into moderation_events (contribution_id, actor_id, action, version) values (p_id, auth.uid(), 'new_version_started', c.version + 1);
  perform audit('revise', 'contribution', p_id::text, c.org_id, jsonb_build_object('version', c.version + 1));
end $$;

-- Withdrawal is synchronous: the shared copy leaves search, themes, idea evidence and AIRA retrieval
-- (all of which filter on status = 'published') in the same transaction.
create function public.withdraw_contribution(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c contributions; s uuid;
begin
  select * into c from contributions where id = p_id for update;
  if c.id is null or c.author_id <> auth.uid() then raise exception 'not found'; end if;
  if c.state = 'withdrawn' then return; end if;
  perform set_lifecycle();
  update contributions set state = 'withdrawn', consent_publish = false, consent_training = false where id = p_id;
  select shared_id into s from shared_sources where contribution_id = p_id;
  if s is not null then
    update shared_contributions set status = 'withdrawn', updated_at = now() where id = s;
  end if;
  insert into moderation_events (contribution_id, actor_id, action, version) values (p_id, auth.uid(), 'withdrawn', c.version);
  perform audit('withdraw', 'contribution', p_id::text, c.org_id, jsonb_build_object('shared_id', s));
  perform notify(c.author_id, 'Contribution withdrawn',
    'Removed from the shared feed, search and AIRA retrieval. Copies already viewed by others cannot be recalled.',
    '/client/observations/' || p_id);
end $$;

-- Moderator decision. p_shared carries the redacted fields; only these are copied, never source metadata.
create function public.moderate_contribution(
  p_id uuid, p_action text, p_public_reason text default null, p_internal_note text default null,
  p_shared jsonb default null, p_include_attribution boolean default false
) returns void language plpgsql security definer set search_path = public as $$
declare c contributions; s uuid; v_attr text;
begin
  if not has_role('moderator') then raise exception 'moderator role required'; end if;
  select * into c from contributions where id = p_id for update;
  if c.id is null or c.visibility <> 'proposed_shared' or c.state <> 'submitted' then
    raise exception 'not awaiting moderation';
  end if;
  if p_action not in ('publish', 'return', 'reject') then raise exception 'unknown action'; end if;
  if p_action in ('return', 'reject') and coalesce(trim(p_public_reason), '') = '' then
    raise exception 'a reason for the contributor is required';
  end if;

  perform set_lifecycle();
  if p_action = 'publish' then
    if p_shared is null or coalesce(p_shared ->> 'title', '') = '' or coalesce(p_shared ->> 'body', '') = '' then
      raise exception 'reviewed title and body are required';
    end if;
    if p_include_attribution and c.consent_attribution then
      select name into v_attr from organizations where id = c.org_id;
    end if;
    select shared_id into s from shared_sources where contribution_id = p_id;
    if s is null then
      insert into shared_contributions (kind, title, body, offering_id, industry, region, period_label, evidence_type, confidence, attribution, version)
      values (c.kind, p_shared ->> 'title', p_shared ->> 'body', c.offering_id, p_shared ->> 'industry', p_shared ->> 'region',
              p_shared ->> 'period_label', c.evidence_type, c.confidence, v_attr, c.version)
      returning id into s;
      insert into shared_sources (shared_id, contribution_id, org_id) values (s, p_id, c.org_id);
    else
      update shared_contributions set title = p_shared ->> 'title', body = p_shared ->> 'body',
        industry = p_shared ->> 'industry', region = p_shared ->> 'region', period_label = p_shared ->> 'period_label',
        confidence = c.confidence, attribution = v_attr, version = c.version, status = 'published', updated_at = now()
      where id = s;
    end if;
    update contributions set state = 'published' where id = p_id;
  elsif p_action = 'return' then
    update contributions set state = 'returned' where id = p_id;
  else
    update contributions set state = 'rejected' where id = p_id;
  end if;

  insert into moderation_events (contribution_id, actor_id, action, public_reason, version)
  values (p_id, auth.uid(), p_action, p_public_reason, c.version);
  if coalesce(trim(p_internal_note), '') <> '' then
    insert into moderation_notes (contribution_id, actor_id, note) values (p_id, auth.uid(), p_internal_note);
  end if;
  perform audit('moderate_' || p_action, 'contribution', p_id::text, c.org_id, jsonb_build_object('version', c.version, 'shared_id', s));
  perform notify(c.author_id,
    case p_action when 'publish' then 'Contribution published' when 'return' then 'Clarification requested' else 'Contribution not published' end,
    coalesce(p_public_reason, 'A reviewed, de-identified version is now visible to the learning community.'),
    '/client/observations/' || p_id);
end $$;

create function public.report_shared(p_shared uuid, p_reason text, p_details text)
returns uuid language plpgsql security definer set search_path = public as $$
declare r uuid;
begin
  if not is_learning_participant() then raise exception 'not permitted'; end if;
  if not exists (select 1 from shared_contributions where id = p_shared and status = 'published') then raise exception 'not found'; end if;
  insert into reports (shared_id, reason, details) values (p_shared, p_reason, p_details) returning id into r;
  perform audit('report', 'shared_contribution', p_shared::text, null, jsonb_build_object('reason', p_reason));
  return r;
end $$;

-- p_decision: 'unpublish' (temporary, during review), 'restore', 'dismiss', 'remove'
create function public.resolve_report(p_report uuid, p_decision text, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare rep reports; src shared_sources; author uuid;
begin
  if not has_role('moderator') then raise exception 'moderator role required'; end if;
  select * into rep from reports where id = p_report for update;
  if rep.id is null then raise exception 'not found'; end if;
  select * into src from shared_sources where shared_id = rep.shared_id;
  select author_id into author from contributions where id = src.contribution_id;

  if p_decision in ('unpublish', 'remove') then
    update shared_contributions set status = 'unpublished', updated_at = now() where id = rep.shared_id;
  elsif p_decision = 'restore' then
    update shared_contributions set status = 'published', updated_at = now() where id = rep.shared_id and status = 'unpublished';
  elsif p_decision <> 'dismiss' then
    raise exception 'unknown decision';
  end if;
  update reports set
    status = case when p_decision = 'unpublish' then 'open' else 'resolved' end,
    decision = p_decision || coalesce(': ' || p_reason, ''),
    resolved_at = case when p_decision = 'unpublish' then null else now() end
  where id = p_report;
  perform set_lifecycle();
  insert into moderation_events (contribution_id, actor_id, action, public_reason, version)
  select src.contribution_id, auth.uid(), 'report_' || p_decision, p_reason, c.version from contributions c where c.id = src.contribution_id;
  perform audit('report_' || p_decision, 'shared_contribution', rep.shared_id::text, src.org_id, '{}');
  -- the reporter's identity is never disclosed to the contributor
  if author is not null and p_decision <> 'dismiss' then
    perform notify(author, 'Update on your shared contribution', coalesce(p_reason, 'A moderator reviewed a report.'), '/client/observations/' || src.contribution_id);
  end if;
end $$;

-- Distinct contributing orgs for a theme; null when below the configured minimum cohort.
create function public.theme_stats(p_theme uuid)
returns table (contribution_count int, org_count int, suppressed boolean)
language plpgsql stable security definer set search_path = public as $$
declare v_min int; v_orgs int; v_count int;
begin
  if not is_learning_participant() then raise exception 'not permitted'; end if;
  select (value #>> '{}')::int into v_min from app_config where key = 'min_cohort_orgs';
  select count(*), count(distinct ss.org_id) into v_count, v_orgs
  from theme_links tl
  join shared_contributions sc on sc.id = tl.shared_id and sc.status = 'published'
  join shared_sources ss on ss.shared_id = sc.id
  where tl.theme_id = p_theme;
  if v_orgs < coalesce(v_min, 3) then
    return query select null::int, null::int, true;
  else
    return query select v_count, v_orgs, false;
  end if;
end $$;

create function public.set_idea_status(p_idea uuid, p_status idea_status, p_note text, p_public_update text default null)
returns void language plpgsql security definer set search_path = public as $$
declare i improvement_ideas;
begin
  if not has_role('product_owner') then raise exception 'product owner role required'; end if;
  select * into i from improvement_ideas where id = p_idea for update;
  if i.id is null then raise exception 'not found'; end if;
  update improvement_ideas set status = p_status, public_update = coalesce(p_public_update, public_update), updated_at = now() where id = p_idea;
  insert into idea_status_history (idea_id, from_status, to_status, actor_id, note) values (p_idea, i.status, p_status, auth.uid(), p_note);
  perform audit('idea_status', 'improvement_idea', p_idea::text, null, jsonb_build_object('from', i.status, 'to', p_status));
end $$;

-- Client-safe projection of improvement ideas: no problem statement, priority or internal evidence.
create function public.client_ideas()
returns table (id uuid, title text, offering_id uuid, owner_team text, status idea_status, public_update text, updated_at timestamptz, theme_id uuid)
language sql stable security definer set search_path = public as $$
  select id, title, offering_id, owner_team, status, public_update, updated_at, theme_id
  from improvement_ideas where visible_to_clients and is_learning_participant();
$$;

-- Lets an author see the shared copy of their own contribution.
create function public.my_shared_copy(p_contribution uuid)
returns setof shared_contributions language sql stable security definer set search_path = public as $$
  select sc.* from shared_contributions sc join shared_sources ss on ss.shared_id = sc.id
  join contributions c on c.id = ss.contribution_id
  where c.id = p_contribution and c.author_id = auth.uid();
$$;

-- ---------- RLS

alter table contributions enable row level security;
alter table consent_history enable row level security;
alter table shared_contributions enable row level security;
alter table shared_sources enable row level security;
alter table moderation_events enable row level security;
alter table moderation_notes enable row level security;
alter table reports enable row level security;
alter table themes enable row level security;
alter table theme_links enable row level security;
alter table improvement_ideas enable row level security;
alter table idea_evidence enable row level security;
alter table idea_status_history enable row level security;
alter table notifications enable row level security;
alter table email_outbox enable row level security; -- no policies: service role only

create policy contrib_read on contributions for select using (
  author_id = auth.uid()
  -- organisation-visible, already shared with the org
  or (visibility = 'organisation' and state = 'published' and is_member(org_id))
  -- moderators see only what was proposed for sharing and submitted; never drafts
  or (visibility = 'proposed_shared' and state <> 'draft' and has_role('moderator'))
);
create policy contrib_insert on contributions for insert with check (
  author_id = auth.uid() and is_member(org_id)
);
create policy contrib_update on contributions for update
  using (author_id = auth.uid() and state in ('draft', 'returned'))
  with check (author_id = auth.uid() and state in ('draft', 'returned'));
create policy contrib_delete on contributions for delete using (author_id = auth.uid() and state = 'draft' and version = 1);

create policy consent_read on consent_history for select using (
  exists (select 1 from contributions c where c.id = contribution_id and c.author_id = auth.uid())
);

create policy shared_read on shared_contributions for select using (
  (status = 'published' and is_learning_participant()) or has_role('moderator')
);
create policy sources_read on shared_sources for select using (has_role('moderator'));

create policy modevents_read on moderation_events for select using (
  has_role('moderator') or exists (select 1 from contributions c where c.id = contribution_id and c.author_id = auth.uid())
);
create policy modnotes_read on moderation_notes for select using (has_role('moderator'));

create policy reports_read on reports for select using (has_role('moderator') or reporter_id = auth.uid());

create policy themes_read on themes for select using (is_learning_participant());
create policy themes_write on themes for all using (has_role('product_owner') or has_role('moderator'))
  with check (has_role('product_owner') or has_role('moderator'));
create policy theme_links_read on theme_links for select using (is_learning_participant());
create policy theme_links_write on theme_links for all using (has_role('product_owner') or has_role('moderator'))
  with check (has_role('product_owner') or has_role('moderator'));

create policy ideas_read on improvement_ideas for select using (is_employee());
create policy ideas_insert on improvement_ideas for insert with check (has_role('product_owner'));
create policy ideas_update on improvement_ideas for update using (has_role('product_owner'))
  with check (has_role('product_owner') and status = (select status from improvement_ideas i where i.id = improvement_ideas.id));
create policy idea_evidence_read on idea_evidence for select using (is_employee());
create policy idea_evidence_write on idea_evidence for all using (has_role('product_owner')) with check (has_role('product_owner'));
create policy idea_history_read on idea_status_history for select using (is_employee());

create policy notif_read on notifications for select using (user_id = auth.uid());
create policy notif_mark on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
