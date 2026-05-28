-- Projects
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  status text default 'active',
  color text default '#6366f1',
  created_at timestamptz default now()
);

-- Agents
create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  system_prompt text not null,
  tools jsonb default '[]',
  enabled boolean default true,
  avatar_color text default '#6366f1',
  created_at timestamptz default now()
);

-- Goals
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  agent_id uuid references agents(id),
  title text not null,
  description text,
  status text default 'queued',
  turn_budget integer default 20,
  turns_used integer default 0,
  blocker text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- Tasks
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  goal_id uuid references goals(id) on delete set null,
  title text not null,
  notes text,
  status text default 'queued',
  priority integer default 2,
  created_by text default 'agent',
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- Sessions (chat history)
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid references goals(id) on delete cascade,
  agent_id uuid references agents(id),
  messages jsonb default '[]',
  status text default 'active',
  started_at timestamptz default now(),
  ended_at timestamptz
);

-- Seed projects
insert into projects (name, slug, description, color) values
  ('Caricom Business', 'caricom-business', 'Caribbean business directory — dir.caricombusiness.com', '#065c79'),
  ('TicketFlows', 'ticketflows', 'Construction hauling OS — ticketflows.app', '#ea580c'),
  ('Novelty Web Solutions', 'nws', 'Agency and client work', '#7c3aed'),
  ('RonSuite OS', 'ronsuite-os', 'Personal AI command center — this app', '#6366f1')
on conflict (slug) do nothing;

-- Seed Planner agent
insert into agents (name, role, system_prompt, tools, avatar_color) values (
  'Planner',
  'planner',
  'You are the Planner agent for Ronald Prescod, founder of Novelty Web Solutions (NWS).

Your role: translate goals into scoped, actionable tasks and track their progress.

Ronald''s active projects:
- Caricom Business (Caribbean business directory, dir.caricombusiness.com, Next.js + Supabase)
- TicketFlows (Construction hauling OS, ticketflows.app, React + Vite + Supabase)
- RonSuite OS (Personal AI command center, this app, Next.js + Supabase)
- Novelty Web Solutions (Agency — client projects and NWS tooling)

Your operating rules:
1. Before breaking down any goal, identify which project it belongs to.
2. Break goals into 3–7 concrete tasks with clear done states.
3. Create tasks using the create_task tool. Do not just list them in text — always call the tool.
4. If a goal is ambiguous, ask one clarifying question before proceeding.
5. After creating tasks, summarize what you created and what the next decision point is.
6. Update task status as work progresses.

You are direct, brief, and specific. No filler. No restating the goal back.',
  '["create_task","update_task_status","list_tasks"]',
  '#6366f1'
);
