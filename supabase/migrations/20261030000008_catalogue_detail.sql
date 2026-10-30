-- Product detail content from the reference prototype, and demo-request interest type.
alter table offerings
  add column headline text,
  add column dev_status text not null default 'Prototype',
  add column features jsonb not null default '[]',
  add column how_it_works jsonb not null default '[]',
  add column business_value jsonb not null default '[]';

alter table demo_requests
  add column interest text not null default 'demo' check (interest in ('demo', 'collaboration', 'ai_challenge', 'general'));

alter table event_registrations
  add column consent boolean not null default false;
