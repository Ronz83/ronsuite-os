-- Migration: 021_add_hermes_attachments
-- Applied: via Supabase SQL Editor
-- Creates a table to store file and image attachments for Hermes sessions

CREATE TABLE IF NOT EXISTS hermes_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  file_name text NOT NULL,
  file_type text NOT NULL,
  content text NOT NULL,
  extracted_text text
);
