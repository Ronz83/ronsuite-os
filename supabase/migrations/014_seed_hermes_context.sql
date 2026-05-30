-- Migration: 014_seed_hermes_context
-- Seeds the hermes_context table to bypass onboarding and set up default context with custom slots

insert into hermes_context (
  full_name,
  business_name,
  business_description,
  role,
  communication_style,
  active_projects,
  current_priorities,
  connected_systems,
  onboarding_complete,
  raw_intake
) values (
  'Ronald Prescod',
  'Novelty Web Solutions',
  'At Novelty Web Solutions, our mission is to empower businesses with smart digital solutions that drive growth, automate operations, and create meaningful customer experiences. We combine cutting-edge AI technology, high-converting websites, marketing automation, and business intelligence tools to help companies attract more customers, streamline workflows, and scale with confidence.',
  'Founder & CEO',
  'direct',
  '["Caricom Business", "TicketFlows", "RonSuite OS", "Novelty Web Solutions"]'::jsonb,
  '["Finish ronsuite-os", "Stabilize and launch TicketFlow", "Complete NWS Free Offer"]'::jsonb,
  '["Supabase", "Vercel", "GitHub"]'::jsonb,
  true,
  '{
    "key_contacts": [
      { "name": "Codex", "role": "Engineering Lead Agent", "email": "codex@ronsuite-os.local" },
      { "name": "Claude Code", "role": "Architecture Lead Agent", "email": "claude@ronsuite-os.local" },
      { "name": "Antigravity", "role": "Creative Director Agent", "email": "antigravity@ronsuite-os.local" }
    ],
    "weekly_routine": {
      "focus_hours": "9 AM - 5 PM EST",
      "milestone_review": "Every Friday at 4 PM EST"
    },
    "guardrails": [
      "Always ask for approval before performing destructive operations",
      "Prefer cloud mode unless bridge connection is validated",
      "Format all system-facing actions as JSON approvals"
    ],
    "milestones": [
      { "title": "Finish ronsuite-os core panels", "date": "2026-06-15" },
      { "title": "TicketFlow payment gateway launch", "date": "2026-07-01" }
    ],
    "knowledge_links": {
      "obsidian_vault": "C:\\\\Users\\\\Ronald\\\\.gemini\\\\antigravity\\\\memory\\\\wikis\\\\antigravity_master",
      "vercel_dashboard": "https://vercel.com/ronsuite-os"
    }
  }'::jsonb
)
on conflict do nothing;
