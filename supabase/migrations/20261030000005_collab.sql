-- Comments, bookmarks, saved searches, employee experiments, knowledge feedback, duplicate hints.

create extension if not exists pg_trgm with schema extensions;

-- Comments inherit the parent shared contribution's audience (only readable while the parent is readable).
create table comments (
  id uuid primary key default gen_random_uuid(),
  shared_id uuid not null references shared_contributions on delete cascade,
  author_id uuid not null default auth.uid() references profiles on delete cascade,
  author_kind text not null default 'participant' check (author_kind in ('participant', 'azentio')),
  body text not null check (char_length(body) between 2 and 1000),
  status text not null default 'visible' check (status in ('visible', 'flagged', 'hidden')),
  created_at timestamptz not null default now()
);

create function public.comment_defaults() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.author_id := auth.uid();
  new.author_kind := case when is_employee() then 'azentio' else 'participant' end;
  new.status := 'visible';
  return new;
end $$;
create trigger comments_defaults before insert on comments for each row execute function comment_defaults();

create table bookmarks (
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  shared_id uuid not null references shared_contributions on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, shared_id)
);

create table saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  query text not null check (char_length(query) <= 500),
  created_at timestamptz not null default now()
);

create table experiments (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 5 and 160),
  summary text not null check (char_length(summary) between 10 and 2000),
  team text not null check (char_length(team) between 2 and 120),
  offering_id uuid references offerings,
  status text not null default 'proposed' check (status in ('proposed', 'running', 'concluded', 'stopped')),
  owner_id uuid not null default auth.uid() references profiles,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table content_feedback (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references content_items on delete cascade,
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  rating text not null check (rating in ('useful', 'outdated', 'unclear')),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  unique (content_id, user_id)
);

alter table comments enable row level security;
alter table bookmarks enable row level security;
alter table saved_searches enable row level security;
alter table experiments enable row level security;
alter table content_feedback enable row level security;

create policy comments_read on comments for select using (
  (status = 'visible' and exists (select 1 from shared_contributions s where s.id = shared_id and s.status = 'published') and is_learning_participant())
  or author_id = auth.uid() or has_role('moderator')
);
create policy comments_insert on comments for insert with check (
  is_learning_participant() and exists (select 1 from shared_contributions s where s.id = shared_id and s.status = 'published')
);
create policy comments_moderate on comments for update using (has_role('moderator')) with check (has_role('moderator'));
create policy comments_delete_own on comments for delete using (author_id = auth.uid());

-- Any participant may flag a visible comment for moderator review.
create function public.flag_comment(p_comment uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_learning_participant() then raise exception 'not permitted'; end if;
  update comments set status = 'flagged' where id = p_comment and status = 'visible';
  perform audit('flag_comment', 'comment', p_comment::text, null, '{}');
end $$;

create policy bookmarks_own on bookmarks for all using (user_id = auth.uid()) with check (user_id = auth.uid() and is_learning_participant());
create policy searches_own on saved_searches for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy experiments_read on experiments for select using (is_employee());
create policy experiments_insert on experiments for insert with check (is_employee() and owner_id = auth.uid());
create policy experiments_update on experiments for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy feedback_insert on content_feedback for insert with check (
  user_id = auth.uid() and exists (select 1 from content_items c where c.id = content_id)
);
create policy feedback_read on content_feedback for select using (
  user_id = auth.uid() or has_role('publisher')
  or exists (select 1 from content_items c where c.id = content_id and c.owner_id = auth.uid())
);

-- Duplicate hints for moderators: similar published shared contributions.
create function public.similar_shared(p_text text)
returns table (id uuid, title text, score real)
language sql stable security definer set search_path = public, extensions as $$
  select s.id, s.title, similarity(s.title || ' ' || s.body, p_text) as score
  from shared_contributions s
  where s.status = 'published' and has_role('moderator')
  order by score desc
  limit 3;
$$;
