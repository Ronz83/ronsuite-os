-- Migration: 013_nws_projects
-- Creates table for NWS project portfolio and seeds it with initial projects list from HTML

create table if not exists nws_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  location text,
  stage text,
  purpose text,
  built text,
  missing text,
  rating text,
  note text,
  next_step text,
  updated_at timestamptz default now(),
  updated_by text default 'system'
);

-- Seed projects
insert into nws_projects (name, location, stage, purpose, built, missing, rating, note, next_step) values
  ('ronsuite-os', 'C:\Users\Ronald\projects\ronsuite-os', 'Active Development', 'Local agent-orchestrated OS gateway connecting LLMs and backend tasks.', 'Next.js App Router, Supabase SSR Auth, middleware, agent prompt handlers, local bridge/ngrok config.', 'Complete front-end panels and production deployment.', 'Finish', 'High-priority core tool', 'Set up local agents and finalize workspace layout controls.'),
  ('TicketFlow', 'C:\Users\Ronald\TicketFlow', 'Nearly Complete Application', 'Field service ticketing and invoicing system for heavy industrial and construction-tech workflows.', 'React/Vite, Tailwind, Local Sync Engine, AI Assistant serverless function, Invoice Manager, Template Builder.', 'Production deployment stabilization and complete test coverage.', 'Finish', 'Excellent SaaS candidate', 'Run live build tests and link active Stripe invoice payments.'),
  ('NWS Free Offer', 'C:\Users\Ronald\NWS Free Offer', 'Substantial Prototype', 'GoHighLevel sub-account automation and snapshot deployment system.', 'Python backend, React/Vite frontend, SQL template seeds, and deployment automation engine.', 'Seamless GHL API integration and production client interface.', 'Finish', 'Excellent automation asset', 'Standardize configuration and bundle with GHL private app guides.'),
  ('sba-scraper', 'C:\Users\Ronald\projects\sba-scraper', 'Completed Utility Script', 'Python crawler targeting SBA directory data.', 'Scrapy-based spider crawler and output CSV database files.', 'Optional GUI or live runner dashboard.', 'Archive', 'Keep as utility reference', 'Archive as a utility reference. No active updates needed.'),
  ('vo-evolutions', 'C:\Users\Ronald\Downloads\vo-evolutions', 'Initial Boilerplate', 'Voiceover brand evolution workspace.', 'Vite/React scaffolding and basic project dependencies.', 'UI layout screens, features, and styling.', 'Remove', 'Redundant with Soho Voices', 'Delete the downloads folder and consolidate useful work into the main repo.'),
  ('NWS OS (Downloads)', 'C:\Users\Ronald\Downloads\NWS OS', 'Design Assets Hub', 'Consolidated local Stitch visual templates for the NWS platform.', 'Static folders for admin dashboards, plan builders, legal compliance, and CRM pages.', 'Application logic. Current assets are static mockups.', 'Archive', 'Consolidate assets', 'Extract useful UI screens into active Next.js OS projects when needed.'),
  ('Modern Caribbean Visuals', 'Stitch Cloud', 'Stitch Design Mockup', 'Caribbean-themed directory layout for restaurants, hospitality, and real estate.', '51 mobile-responsive screens and material theme templates.', 'React frontend scaffolding and database queries.', 'Finish', 'High-value UI', 'Port to ronsuite-os or convert into reusable React components.'),
  ('Soho Voices Modern Redesign', 'Stitch Cloud', 'Stitch Design Mockup', 'London audio recording and voiceover agency hub.', '15 desktop screens with premium dark theatrical UI layouts.', 'Wavesurfer.js integration and active search.', 'Finish', 'Premium UI asset', 'Build the dynamic audio waveform player.'),
  ('Bimodal Caricom UX Strategy', 'Stitch Cloud / Downloads', 'Stitch Design Mockup', 'Regional business search portal.', '8 desktop screens with bimodal UI design components.', 'Interactive search registry.', 'Archive', 'Consolidate with regional registry designs', 'Merge useful screens with other regional registry assets.'),
  ('Caliber ai', 'Stitch Cloud', 'Stitch Design Mockup', 'Rich workspace dashboards and AI utility panels.', '71 desktop screens.', 'Live API integrations.', 'Finish', 'Useful OS layouts', 'Extract layouts for ronsuite-os panels.'),
  ('Quote Cal', 'Stitch Cloud', 'Stitch Design Mockup', 'Mortgage calculator and mobile quote widgets.', '43 mobile screens.', 'Dynamic calculations and save actions.', 'Finish', 'Calculator product asset', 'Write client-side JavaScript logic for calculators.')
on conflict (name) do nothing;
