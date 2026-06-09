-- Migration: 020_add_summary_to_hermes_sessions
-- Applied: via Supabase SQL Editor
-- Adds summary column to hermes_sessions and summarized column to hermes_messages

ALTER TABLE hermes_sessions ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE hermes_messages ADD COLUMN IF NOT EXISTS summarized BOOLEAN DEFAULT FALSE;
