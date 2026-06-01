-- Migration: 015_ronald_profile
-- Creates the ronald_profile table to store and version the user profile synthesized from Obsidian vault and local files.

create table if not exists ronald_profile (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  version integer default 1,
  profile_data jsonb default '{}'
);
