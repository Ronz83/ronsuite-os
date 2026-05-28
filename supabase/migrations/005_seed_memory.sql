-- Migration: 005_seed_memory
-- Applied: via Supabase SQL Editor
-- Seeds core memory context records

-- Caricom Business context
insert into memory (title, content, tags, source) values (
  'Caricom Business Project Context',
  'Caricom Business: Caribbean business directory at dir.caricombusiness.com. Built using Next.js 15, Supabase, and Tailwind v4. Features 3,147+ listings. Deployed on Vercel. Supabase project ID: beazuqogozbjltunxjhd.',
  '{"caricom-business", "project-context"}',
  'manual'
);

-- TicketFlows context
insert into memory (title, content, tags, source) values (
  'TicketFlows Project Context',
  'TicketFlows: Construction hauling OS at ticketflows.app. Built using React, Vite, and Supabase. Currently in the Beta stage.',
  '{"ticketflows", "project-context"}',
  'manual'
);

-- Novelty Web Solutions context
insert into memory (title, content, tags, source) values (
  'Novelty Web Solutions Company Context',
  'Novelty Web Solutions (NWS): Ronald''s web agency. NWS builds client projects and internal tools.',
  '{"nws", "company-context"}',
  'manual'
);

-- RonSuite OS context
insert into memory (title, content, tags, source) values (
  'RonSuite OS Project Context',
  'RonSuite OS: Personal AI command center. Built using Next.js 15, Supabase, and Anthropic SDK. This is the active app.',
  '{"ronsuite-os", "project-context"}',
  'manual'
);

-- Design standards
insert into memory (title, content, tags, source) values (
  'Design Identity Standards',
  'Design standard: Premium dark-first aesthetic. Never use placeholder, flat, or basic MVP aesthetics. Google Fonts only (Inter for UI, JetBrains Mono for code/streaming). Micro-animations must always be included on interactive elements.',
  '{"design-standards", "aesthetic"}',
  'manual'
);

-- Stack standards
insert into memory (title, content, tags, source) values (
  'Technology Stack Standards',
  'Stack standard: Next.js App Router, Server Components by default, Client Components for interactivity only. Supabase SSR auth pattern with middleware session refresh.',
  '{"stack-standards", "tech-stack"}',
  'manual'
);
