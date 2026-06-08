-- 017_unified_brain.sql — Unified Brain Phase 1: shared semantic timeline
CREATE TABLE IF NOT EXISTS brain_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent       text NOT NULL,
  entry_type  text NOT NULL CHECK (entry_type IN ('decision','build','status','flag','strategy','note')),
  project     text,
  title       text NOT NULL,
  summary     text NOT NULL,
  detail      jsonb DEFAULT '{}'::jsonb,
  source      text DEFAULT 'session',
  related_ids jsonb DEFAULT '{}'::jsonb,
  importance  int  DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brain_project ON brain_entries(project);
CREATE INDEX IF NOT EXISTS idx_brain_type    ON brain_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_brain_created ON brain_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brain_importance ON brain_entries(importance DESC);

-- Security: service-role only (matches our hardened posture)
ALTER TABLE brain_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_entries FORCE ROW LEVEL SECURITY;
REVOKE ALL ON brain_entries FROM anon;
REVOKE ALL ON brain_entries FROM authenticated;
