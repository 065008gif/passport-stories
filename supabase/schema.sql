-- Passport Stories back end. Run once in Supabase: SQL Editor > New query > paste > Run.

create table if not exists facts (
  id uuid primary key,
  country text not null,
  fact text not null,
  name text not null default 'A traveller',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  ip_hash text not null default ''
);
-- For projects created with an older version of this file:
alter table facts add column if not exists ip_hash text not null default '';
create index if not exists facts_ip_idx on facts (ip_hash, created_at desc);
create index if not exists facts_status_idx on facts (status, created_at desc);

create table if not exists events (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  visitor text not null,
  session text not null,
  event text not null,
  path text not null default '',
  params jsonb not null default '{}'::jsonb,
  referrer text not null default '',
  device text not null default '',
  source text not null default '',
  first_seen text not null default ''
);
create index if not exists events_ts_idx on events (ts);
create index if not exists events_event_idx on events (event, ts);

-- "Ask the Map" suggestions from visitors.
create table if not exists suggestions (
  id uuid primary key,
  kind text not null check (kind in ('country', 'topic')),
  suggestion text not null,
  reason text not null default '',
  email text not null default '',
  status text not null default 'new' check (status in ('new', 'done')),
  ip_hash text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists suggestions_created_idx on suggestions (created_at desc);

-- Wrong admin passwords, used for the 15-minute sign-in lockout.
create table if not exists admin_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  ts timestamptz not null default now()
);
create index if not exists admin_attempts_ts_idx on admin_attempts (ts);

-- Lock both tables. The website's server uses the secret key, which bypasses
-- these locks; nobody can read or write the tables directly from a browser.
alter table facts enable row level security;
alter table events enable row level security;
alter table admin_attempts enable row level security;
alter table suggestions enable row level security;
