-- Subscription digests and organisation-scoped support tickets.

create table digest_subscriptions (
  user_id uuid primary key references profiles on delete cascade default auth.uid(),
  offering_id uuid references offerings on delete set null,   -- null = all offerings
  frequency text not null default 'weekly' check (frequency in ('weekly')),
  last_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  author_id uuid not null references profiles default auth.uid(),
  offering_id uuid references offerings,
  subject text not null check (char_length(subject) between 5 and 160),
  body text not null check (char_length(body) between 10 and 4000),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  external_ref text,          -- id returned by the connected helpdesk, when one is configured
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table digest_subscriptions enable row level security;
alter table support_tickets enable row level security;

create policy digest_own on digest_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid() and is_learning_participant());

-- Tickets are private to the organisation (its members see them); Azentio support staff need an explicit grant (portal admin).
create policy tickets_read on support_tickets for select using (is_member(org_id) or has_role('portal_admin'));
create policy tickets_insert on support_tickets for insert with check (author_id = auth.uid() and is_member(org_id));
create policy tickets_update on support_tickets for update using (has_role('portal_admin')) with check (has_role('portal_admin'));
