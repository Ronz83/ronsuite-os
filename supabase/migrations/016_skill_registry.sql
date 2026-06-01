-- Migration: 016_skill_registry
-- Sets up the skill registry and execution logs tables

create table if not exists skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  type text not null check (type in ('generative', 'analytical', 'integrative')),
  trigger_phrases text[] not null,
  input_schema jsonb default '{}'::jsonb,
  handler_ref text not null,
  risk_level text default 'low',
  requires_approval boolean default false,
  status text default 'planned' check (status in ('planned', 'active', 'deprecated')),
  created_at timestamptz default now()
);

create table if not exists skill_runs (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid references skills(id) on delete cascade,
  inputs jsonb default '{}'::jsonb,
  output jsonb,
  status text default 'pending' check (status in ('pending', 'running', 'success', 'failed', 'approval_pending')),
  error text,
  run_at timestamptz default now()
);

-- Seed the initial 4 skills into the registry
insert into skills (name, description, type, trigger_phrases, input_schema, handler_ref, risk_level, requires_approval, status) values
  (
    'Proposal Drafter',
    'Auto-generates high-converting, phased scope client proposals (NWS pricing tiers, AI receptionists, separating software license fees) ready to paste into GoHighLevel doc builder.',
    'generative',
    array['draft proposal', 'draft a proposal', 'generate proposal', 'write proposal', 'create proposal'],
    '{
      "type": "object",
      "properties": {
        "clientName": { "type": "string", "description": "The name of the prospect/client company" },
        "needsWebsite": { "type": "boolean", "description": "Whether the client needs a custom high-converting website" },
        "needsCRM": { "type": "boolean", "description": "Whether the client needs central pipeline CRM setup" },
        "needsAIReceptionist": { "type": "boolean", "description": "Whether the client needs automated Twilio/SMS receptionist system" },
        "additionalNotes": { "type": "string", "description": "Additional user requests, notes, or co-discovery whiteboard details" }
      },
      "required": ["clientName"]
    }'::jsonb,
    'proposal-drafter',
    'low',
    false,
    'active'
  ),
  (
    'Project Update',
    'Analyzes in-flight projects, operations board statuses, tasks, and repository logs to report comprehensive progress.',
    'analytical',
    array['project update', 'update on project', 'status update', 'whats in flight'],
    '{
      "type": "object",
      "properties": {
        "projectSlug": { "type": "string", "description": "Slug of the project to check, or all" }
      },
      "required": ["projectSlug"]
    }'::jsonb,
    'project-update',
    'low',
    false,
    'planned'
  ),
  (
    'Marketing Campaign Generator',
    'Generates multi-channel marketing campaigns tailored to project details.',
    'generative',
    array['marketing campaign', 'campaign generator', 'create marketing campaign'],
    '{
      "type": "object",
      "properties": {
        "campaignName": { "type": "string", "description": "Focus or name of the campaign" }
      },
      "required": ["campaignName"]
    }'::jsonb,
    'marketing-campaign',
    'low',
    false,
    'planned'
  ),
  (
    'Email Triage',
    'Connects to the client communication system to check and triage unread messages.',
    'integrative',
    array['email triage', 'triage email', 'check unread', 'check inbox'],
    '{
      "type": "object",
      "properties": {
        "limit": { "type": "number", "default": 5 }
      }
    }'::jsonb,
    'email-triage',
    'high',
    true,
    'planned'
  )
on conflict (name) do nothing;
