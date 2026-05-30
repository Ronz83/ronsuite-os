-- Migration: 014_seed_hermes_context
-- Seeds the hermes_context table to bypass onboarding and set up default context

insert into hermes_context (
  full_name,
  business_name,
  business_description,
  role,
  communication_style,
  active_projects,
  current_priorities,
  connected_systems,
  onboarding_complete
) values (
  'Ronald Prescod',
  'Novelty Web Solutions',
  'At Novelty Web Solutions, our mission is to empower businesses with smart digital solutions that drive growth, automate operations, and create meaningful customer experiences. We combine cutting-edge AI technology, high-converting websites, marketing automation, and business intelligence tools to help companies attract more customers, streamline workflows, and scale with confidence.',
  'Founder & CEO',
  'direct',
  '["Caricom Business", "TicketFlows", "RonSuite OS", "Novelty Web Solutions"]'::jsonb,
  '["Finish ronsuite-os", "Stabilize and launch TicketFlow", "Complete NWS Free Offer"]'::jsonb,
  '["Supabase", "Vercel", "GitHub"]'::jsonb,
  true
)
on conflict do nothing;
