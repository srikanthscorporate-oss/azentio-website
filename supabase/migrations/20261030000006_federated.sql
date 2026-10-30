-- P2 federated learning programme: separate opt-in consent, run reports (no training data), candidate model registry.

create table fl_participants (
  org_id uuid primary key references organizations on delete cascade,
  status text not null check (status in ('opted_in', 'withdrawn')),
  decided_by uuid references profiles,
  decided_at timestamptz not null default now()
);

create table fl_consent_history (
  id bigint generated always as identity primary key,
  org_id uuid not null references organizations on delete cascade,
  status text not null,
  decided_by uuid,
  created_at timestamptz not null default now()
);

-- Reports contain metrics, participation and validation outcomes only. Never training examples.
create table fl_runs (
  id uuid primary key default gen_random_uuid(),
  task text not null,
  report jsonb not null,
  created_at timestamptz not null default now()
);

create table fl_models (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  run_id uuid not null references fl_runs on delete cascade,
  parent_version text,
  status text not null default 'candidate' check (status in ('candidate', 'approved', 'rejected', 'deployed', 'rolled_back')),
  metrics jsonb not null,
  decided_by uuid references profiles,
  decision_note text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

alter table fl_participants enable row level security;
alter table fl_consent_history enable row level security;
alter table fl_runs enable row level security;
alter table fl_models enable row level security;

create policy flp_read on fl_participants for select using (is_employee() or has_role('client_admin', org_id));
create policy flh_read on fl_consent_history for select using (is_employee() or has_role('client_admin', org_id));
create policy flr_read on fl_runs for select using (is_employee());
create policy flm_read on fl_models for select using (is_employee());

-- Client admins opt their own organisation in or out. Separate from contribution consent and membership.
create function public.set_fl_participation(p_org uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not has_role('client_admin', p_org) then raise exception 'client admin of this organisation required'; end if;
  if p_status not in ('opted_in', 'withdrawn') then raise exception 'invalid status'; end if;
  insert into fl_participants (org_id, status, decided_by) values (p_org, p_status, auth.uid())
  on conflict (org_id) do update set status = excluded.status, decided_by = excluded.decided_by, decided_at = now();
  insert into fl_consent_history (org_id, status, decided_by) values (p_org, p_status, auth.uid());
  perform audit('fl_' || p_status, 'fl_participant', p_org::text, p_org, '{}');
end $$;

-- Human review gate. Approve/reject a candidate; deploy an approved model; roll back a deployed one.
create function public.decide_fl_model(p_model uuid, p_action text, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare m fl_models; v_next text;
begin
  if not (has_role('product_owner') or has_role('portal_admin')) then raise exception 'product owner or portal admin required'; end if;
  if coalesce(trim(p_note), '') = '' then raise exception 'a decision note is required'; end if;
  select * into m from fl_models where id = p_model for update;
  if m.id is null then raise exception 'not found'; end if;
  v_next := case
    when p_action = 'approve' and m.status = 'candidate' then 'approved'
    when p_action = 'reject' and m.status = 'candidate' then 'rejected'
    when p_action = 'deploy' and m.status = 'approved' then 'deployed'
    when p_action = 'rollback' and m.status = 'deployed' then 'rolled_back'
  end;
  if v_next is null then raise exception 'cannot % a % model', p_action, m.status; end if;
  if v_next = 'deployed' then
    -- only one deployed model at a time; the previous one is kept for rollback
    update fl_models set status = 'approved', decision_note = coalesce(decision_note, '') || ' [superseded]' where status = 'deployed';
  end if;
  update fl_models set status = v_next, decided_by = auth.uid(), decision_note = p_note, decided_at = now() where id = p_model;
  perform audit('fl_model_' || p_action, 'fl_model', m.version, null, jsonb_build_object('from', m.status, 'to', v_next));
end $$;
