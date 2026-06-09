-- 019_agent_dispatch.sql — Unified Dispatch Layer & Seeding Task Board
CREATE TABLE IF NOT EXISTS agent_tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by    text NOT NULL DEFAULT 'Hermes',     -- who dispatched
  assigned_to   text NOT NULL,                       -- 'Qwen','Codex','Claude Code','Antigravity'
  model_tier    text NOT NULL,                        -- 'cheap'(qwen) | 'premium'(claude)
  objective     text NOT NULL,                        -- the goal (Task Intake Protocol)
  context       jsonb DEFAULT '{}'::jsonb,            -- inputs, refs, brain context
  definition_of_done text,                            -- when is it complete
  status        text NOT NULL DEFAULT 'queued'
                CHECK (status IN ('queued','running','awaiting_approval','blocked','complete','failed')),
  approval_gate jsonb,                                 -- if Tier 1 action hit: what needs approval
  result        jsonb,                                 -- output when done
  project       text,
  priority      int DEFAULT 3,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON agent_tasks(assigned_to);

-- Security: service-role only (hardened security posture)
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks FORCE ROW LEVEL SECURITY;
REVOKE ALL ON agent_tasks FROM anon, authenticated;
