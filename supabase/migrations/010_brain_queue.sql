-- Migration: 010_brain_queue
-- Applied: via Supabase SQL Editor
-- Adds brain update queue for pending Obsidian sync writes

create table if not exists brain_queue (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  wiki_file text not null,
  status text default 'pending',
  created_at timestamptz default now(),
  flushed_at timestamptz
);
