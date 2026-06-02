-- Migration: 017_ghl_onboarding_skill
-- Registers the GHL Business Onboarding skill in the skill registry

insert into skills (name, description, type, trigger_phrases, input_schema, handler_ref, risk_level, requires_approval, status) values
  (
    'GHL Business Onboarding',
    'Automates GHL sub-account creation, baseline snapshot loading, and generates personalized prompts for GHL Vibe Coder, Ask AI, and Automation Builder based on client intake details.',
    'integrative',
    array['onboard business', 'create business', 'ghl generator', 'generate ghl prompts', 'onboard a business'],
    '{
      "type": "object",
      "properties": {
        "businessName": { "type": "string", "description": "The official name of the business" },
        "businessType": { "type": "string", "description": "Niche or industry type (e.g. Roof repair, Dental)" },
        "location": { "type": "string", "description": "City and state/country" },
        "primaryServices": { "type": "array", "items": { "type": "string" }, "description": "List of primary services offered" },
        "primaryOffer": { "type": "string", "description": "Main client lead magnet offer" },
        "mainGoal": { "type": "string", "description": "Main conversion goal" },
        "targetAudience": { "type": "string", "description": "Ideal client profile" },
        "brandStyle": { "type": "string", "description": "Brand persona (e.g., Luxury, Modern, Trustworthy)" },
        "mainCTA": { "type": "string", "description": "Main call to action text" },
        "businessHours": { "type": "string", "description": "Operating hours" },
        "communicationChannels": { "type": "array", "items": { "type": "string" }, "description": "SMS, Email, Phone, Web Chat, etc." },
        "seoLocation": { "type": "string", "description": "Target local city/region for SEO" },
        "mainSeoServices": { "type": "array", "items": { "type": "string" }, "description": "Key service keywords to optimize for SEO" },
        "specialBusinessDetails": { "type": "string", "description": "Additional unique business details or notes" },
        "customerEmail": { "type": "string", "description": "Customer email address for contact details" },
        "customerFirstName": { "type": "string", "description": "Customer first name" },
        "customerLastName": { "type": "string", "description": "Customer last name" }
      },
      "required": ["businessName", "businessType", "location", "primaryServices", "primaryOffer", "mainGoal", "targetAudience", "brandStyle", "mainCTA"]
    }'::jsonb,
    'ghl-business-onboarding',
    'high',
    true,
    'active'
  )
on conflict (name) do nothing;
