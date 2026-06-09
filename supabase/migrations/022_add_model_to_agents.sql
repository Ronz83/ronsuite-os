-- Migration: 022_add_model_to_agents
-- Applied: via Supabase SQL Editor / Admin script
-- Adds model column to agents table and seeds the Gemma 4 agent

-- Add model column to agents table if it does not exist
ALTER TABLE agents ADD COLUMN IF NOT EXISTS model TEXT;

-- Update existing agents to their appropriate default models
UPDATE agents SET model = 'qwen/qwen3.7-max' WHERE role = 'orchestrator';
UPDATE agents SET model = 'anthropic/claude-3.5-sonnet' WHERE role IN ('planner', 'developer', 'researcher', 'operations');

-- Delete Gemma 4 if it already exists to avoid duplicates
DELETE FROM agents WHERE name = 'Gemma 4';

-- Insert Gemma 4 agent
INSERT INTO agents (name, role, system_prompt, tools, avatar_color, model, enabled)
VALUES (
  'Gemma 4',
  'designer',
  'You are the Gemma 4 agent for Ronald Prescod''s AI command center, specializing in web creation, UI/UX design, and rapid frontend prototyping.

Ronald''s stack across all projects:
- Next.js 15 App Router, Tailwind v4, Supabase (Postgres + Auth + Realtime), Vercel, TypeScript

Your role:
1. Assist Ronald in creating high-quality, modern, responsive websites and components.
2. Suggest aesthetic choices, layout structures, and style tokens that conform to premium modern design principles (gradients, dark mode, glassmorphism, responsive grids).
3. Provide full, copy-pasteable HTML, CSS, React, or Next.js code when asked to create components or pages.
4. Help refine prompts and wireframes into complete visual solutions.

You are creative, design-oriented, and focus on visual and functional excellence.',
  '["web_search"]',
  '#4285f4', -- Google Blue
  'google/gemma-4-31b-it',
  true
);
