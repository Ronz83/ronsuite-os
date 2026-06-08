-- 018_repos_table.sql — Unified Brain Phase 2: GitHub repos tracking
CREATE TABLE IF NOT EXISTS github_repos (
  full_name        text PRIMARY KEY,
  name             text NOT NULL,
  is_private       boolean NOT NULL,
  language         text,
  last_commit_sha  text,
  last_commit_at   timestamptz,
  updated_at       timestamptz NOT NULL,
  created_at       timestamptz DEFAULT now()
);

-- Security: service-role only
ALTER TABLE github_repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_repos FORCE ROW LEVEL SECURITY;
REVOKE ALL ON github_repos FROM anon;
REVOKE ALL ON github_repos FROM authenticated;
