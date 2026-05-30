-- Migration: 012_nws_context
-- Creates tables for NWS mission entries and brand cards, seeding them with initial context

create table if not exists nws_mission_entries (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  best_for text,
  message text not null,
  updated_at timestamptz default now(),
  updated_by text default 'system'
);

create table if not exists nws_brand_cards (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  content text not null,
  updated_at timestamptz default now(),
  updated_by text default 'system'
);

-- Seed mission entries
insert into nws_mission_entries (version, best_for, message) values
  ('Mission Statement', 'Website about section, proposals, company profile', 'At Novelty Web Solutions, our mission is to empower businesses with smart digital solutions that drive growth, automate operations, and create meaningful customer experiences. We combine cutting-edge AI technology, high-converting websites, marketing automation, and business intelligence tools to help companies attract more customers, streamline workflows, and scale with confidence. Our goal is to make advanced technology accessible to businesses of all sizes, transforming complex challenges into simple, profitable solutions that deliver measurable results.'),
  ('Expanded Brand Version', 'Pitch decks, brochures, service pages, partner introductions', 'Novelty Web Solutions is a forward-thinking digital transformation agency dedicated to helping businesses thrive in an increasingly connected world. We specialize in website design and development, AI-powered business solutions, customer engagement systems, lead generation, marketing automation, CRM implementation, and business process optimization. By blending creativity, innovation, and automation, we build ecosystems that help businesses capture leads, nurture relationships, increase conversions, and operate more efficiently. Our vision is to become the Caribbean''s leading technology and AI solutions partner, empowering entrepreneurs and organizations with the tools they need to compete, grow, and lead in the digital age.'),
  ('Short Version', 'Social bios, jobs boards, quick intros, email signatures', 'Novelty Web Solutions helps businesses grow smarter through AI, automation, web design, and digital transformation. We build powerful systems that attract customers, streamline operations, and turn technology into measurable business growth.'),
  ('Premium Vision Version', 'Homepage hero, investor-style pitch, premium client proposals', 'At Novelty Web Solutions, we believe every business should have access to enterprise-level technology without enterprise-level complexity. Our mission is to bridge the gap between innovation and execution by delivering intelligent websites, AI employees, automation systems, and growth-focused digital solutions that help businesses work faster, serve customers better, and unlock new opportunities. We are building a future where businesses across the Caribbean and beyond can harness the power of AI and automation to compete globally while maintaining the personal touch that makes them unique.')
on conflict (version) do nothing;

-- Seed brand cards
insert into nws_brand_cards (title, content) values
  ('Core Promise', 'NWS helps businesses attract customers, automate operations, and turn digital tools into measurable growth.'),
  ('Main Services', 'Websites, AI employees, CRM systems, lead generation, marketing automation, customer engagement, and workflow optimization.'),
  ('Brand Direction', 'Accessible enterprise-level technology for growing businesses across the Caribbean and beyond.')
on conflict (title) do nothing;
