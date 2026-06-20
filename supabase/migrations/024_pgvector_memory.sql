-- Migration: 024_pgvector_memory
-- Purpose: Setup pgvector for AI Boardroom memory (brain_entries)

-- Ensure the extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Ensure the embedding column exists on brain_entries
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'brain_entries' AND column_name = 'embedding') THEN
    ALTER TABLE brain_entries ADD COLUMN embedding vector(1536);
  END IF;
END $$;

-- Create the HNSW index for super fast approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS brain_entries_embedding_hnsw_idx 
ON brain_entries 
USING hnsw (embedding vector_cosine_ops);

-- Create or replace the match_memories function for the Next.js backend to call
DROP FUNCTION IF EXISTS match_memories(vector(1536), float, int);
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  title text,
  summary text,
  detail jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    brain_entries.id,
    brain_entries.title,
    brain_entries.summary,
    brain_entries.detail,
    1 - (brain_entries.embedding <=> query_embedding) AS similarity
  FROM brain_entries
  WHERE 1 - (brain_entries.embedding <=> query_embedding) > match_threshold
  ORDER BY brain_entries.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
