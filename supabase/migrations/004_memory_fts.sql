-- Migration: 004_memory_fts
-- Applied: via Supabase SQL Editor
-- Creates the memory table and adds full-text search columns/indexes

-- Enable vector extension for future phase embeddings support
create extension if not exists vector;

-- Create memory table if not exists
create table if not exists memory (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  embedding vector(1536),
  tags text[] default '{}',
  project_id uuid references projects(id) on delete set null,
  source text default 'manual',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add FTS column
alter table memory add column if not exists search_vector tsvector
  generated always as (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))) stored;

create index if not exists memory_search_idx on memory using gin(search_vector);
