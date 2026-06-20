-- Migration 023: Agent System Tables
-- Adds the three core tables for the Head Master / Expert / Student architecture

-- Expert registry
CREATE TABLE IF NOT EXISTS experts (
  id           TEXT PRIMARY KEY,          -- e.g. 'ghl', 'design', 'dev'
  name         TEXT NOT NULL,
  description  TEXT,
  model        TEXT NOT NULL,             -- e.g. 'anthropic/claude-sonnet-4.6'
  domain       TEXT NOT NULL,             -- e.g. 'CRM & Automation'
  status       TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('active','building','planned','deprecated')),
  system_prompt TEXT,                     -- Expert's base system prompt
  knowledge_collection TEXT,             -- ChromaDB collection name
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Student (functionality) registry
CREATE TABLE IF NOT EXISTS students (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id    TEXT NOT NULL REFERENCES experts(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,             -- e.g. 'OAuth Manager'
  slug         TEXT NOT NULL,             -- e.g. 'oauth-manager'
  description  TEXT,
  handler_ref  TEXT NOT NULL,             -- e.g. 'ghl/oauth' maps to api route
  status       TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('active','building','planned','deprecated')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Expert run log (every task issued + result)
CREATE TABLE IF NOT EXISTS expert_runs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id    TEXT NOT NULL REFERENCES experts(id),
  role_applied TEXT,                      -- e.g. 'engineer', 'creative-director'
  input        TEXT NOT NULL,             -- The task brief from Head Master
  output       TEXT,                      -- The expert's response
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','complete','failed','rejected')),
  rejection_reason TEXT,                  -- If Head Master rejected the output
  model_used   TEXT,
  tokens_in    INT DEFAULT 0,
  tokens_out   INT DEFAULT 0,
  duration_ms  INT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Head Master run log (top-level user tasks)
CREATE TABLE IF NOT EXISTS master_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_input      TEXT NOT NULL,
  role_applied    TEXT,                   -- primary role lens applied
  experts_called  TEXT[],                 -- array of expert ids consulted
  final_output    TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','complete','failed')),
  model_used      TEXT DEFAULT 'anthropic/claude-sonnet-4.6',
  tokens_in       INT DEFAULT 0,
  tokens_out      INT DEFAULT 0,
  duration_ms     INT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

-- Seed initial experts
INSERT INTO experts (id, name, description, model, domain, status, knowledge_collection) VALUES
  ('ghl',    'GHL Expert',    'Owns all GoHighLevel / NWS CRM operations — OAuth, sub-accounts, workflows, contacts, automations.', 'anthropic/claude-sonnet-4.6', 'CRM & Automation', 'building', 'ghl_knowledge'),
  ('design', 'Design Expert', 'Owns all UI/UX, web design, marketing design, and conversion optimization.', 'google/gemini-2.5-pro', 'Design & Creative', 'planned', 'design_knowledge'),
  ('dev',    'Dev Expert',    'Owns frontend and backend architecture, code review, patterns, and technical debt.', 'anthropic/claude-sonnet-4.6', 'Engineering', 'planned', 'dev_knowledge'),
  ('copy',   'Copy Expert',   'Owns copywriting, brand voice, persuasion frameworks, and content generation.', 'google/gemini-2.0-flash', 'Copywriting', 'planned', 'copy_knowledge')
ON CONFLICT (id) DO NOTHING;

-- Seed GHL Expert students
INSERT INTO students (expert_id, name, slug, description, handler_ref, status) VALUES
  ('ghl', 'OAuth Manager',       'oauth-manager',       'Handles full GHL OAuth V2 flow for sub-account onboarding', 'ghl/oauth',     'building'),
  ('ghl', 'Location Provisioner','location-provisioner','Creates and configures new GHL sub-accounts',               'ghl/provision',  'building'),
  ('ghl', 'Webhook Handler',     'webhook-handler',     'Processes inbound GHL webhooks and maps to Supabase',       'ghl/webhook',    'planned'),
  ('ghl', 'Changelog Monitor',   'changelog-monitor',   'Watches GHL API changelog and flags breaking changes',      'ghl/changelog',  'planned')
ON CONFLICT DO NOTHING;
