-- Migration: 011_hermes
-- Adds tables for Hermes AI Chief of Staff context, journals, chat threads, and approvals

create table if not exists hermes_context (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  full_name text,
  business_name text,
  business_description text,
  role text,
  communication_style text,
  active_projects jsonb default '[]',
  current_priorities jsonb default '[]',
  connected_systems jsonb default '[]',
  onboarding_complete boolean default false,
  raw_intake jsonb default '{}'
);

create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  entry_date date not null default current_date,
  content text not null,
  tags text[] default '{}'
);

create table if not exists hermes_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  title text
);

create table if not exists hermes_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  session_id uuid references hermes_sessions(id) on delete cascade,
  role text not null check (role in ('user','hermes')),
  content text not null
);

create table if not exists hermes_approvals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  title text not null,
  description text,
  action_type text not null,
  payload jsonb default '{}',
  agent text,
  session_id uuid references hermes_sessions(id),
  status text default 'pending' check (status in ('pending','approved','rejected','executed')),
  resolved_at timestamptz,
  resolution_note text
);
