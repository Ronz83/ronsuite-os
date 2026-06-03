import { anthropic, MODEL } from '../../anthropic';
import { createBrokerClient } from '../../supabase/broker';

// Define industry blueprints containing core leaks, entry offers, and workflow rules
const industryBlueprints: Record<string, string> = {
  real_estate: `
- Core Leak to solve: Zillow & ad leads grow cold immediately (80% drop in close rates if response >5 mins).
- Entry Offer: 24/7 AI Lead Response Agent that qualifies and schedules showings.
- AI Chatbot (Luna) Guidelines: Actively responds to incoming SMS/web leads within 60s, qualifies their budget, timeline, and pre-approval status, then shares calendar booking links.
- Automation flow rules: Instantly trigger SMS/Email within 60 seconds of a new Zillow/Facebook ad lead, notify agent, and route to "New Lead" pipeline stage.
`,
  home_services: `
- Core Leak to solve: 27% missed calls leak high-ticket repair inquiries (plumbing/HVAC/electric worth up to $3,500 each).
- Entry Offer: 24/7 AI Voice Receptionist & Missed Call Text-Back.
- AI Chatbot (Luna) Guidelines: Answers on first ring, qualifies repair urgency, schedules technicians, and triggers SMS follow-ups for missed calls.
- Automation flow rules: Trigger missed call text-back within 60s, notify on-call emergency technician for hot dispatches, and trigger review reminders upon job completion.
`,
  hospitality: `
- Core Leak to solve: High seasonal booking inquiries drop off after-hours or during peak seasons.
- Entry Offer: Multi-Channel Booking & FAQ Assistant.
- AI Chatbot (Luna) Guidelines: Integrates across Instagram DM, Google, SMS, and Webchat. Resolves FAQs and coordinates booking reservation spots.
- Automation flow rules: Automate booking confirmations, calendar reminders, and coordinates waitlist drops for peak hours to eliminate no-shows.
`,
  veterinary: `
- Core Leak to solve: Pet emergencies occur after-hours causing client drop-offs to emergency competitors.
- Entry Offer: AI Clinic Receptionist & Patient Recall System.
- AI Chatbot (Luna) Guidelines: Warm, compassionate receptionist handling clinic triage, intake forms, scheduling, and emergency triage routing.
- Automation flow rules: Automated wellness and vaccine reminder drips synced with pets' milestone dates, and cancellation gap filler triggers.
`,
  dental: `
- Core Leak to solve: Case acceptance failure (~20% hygienist recare leak, crowns/root canals unbooked due to pricing confusion).
- Entry Offer: AI Treatment Plan Follow-Up System.
- AI Chatbot (Luna) Guidelines: Explains procedure details in plain English, calculates insurance estimates, lists financing plans, and drives 1-click booking.
- Automation flow rules: Follow up within 1 hour post-exit with procedure breakdowns, and schedule follow-ups on days 3, 7, and 14 for unaccepted treatment plans.
`,
  death_care: `
- Core Leak to solve: Multitasking directors neglect high-margin pre-need pre-paid contracts (20-35% of revenue).
- Entry Offer: AI Arrangement & Intake Assistant.
- AI Chatbot (Luna) Guidelines: Calm, dignified, respectful assistant conducting family intake, triggering arrangement workflows, and coordinating meetings.
- Automation flow rules: Nurture pre-need leads over 12-18 months using educational planning guides and aftercare check-ins.
`,
  automotive: `
- Core Leak to solve: Safe declined technician recommendations (brakes, leaks) from low-cost oil changes go unchased.
- Entry Offer: AI Service Recommendation Follow-Up Agent.
- AI Chatbot (Luna) Guidelines: Pulls safety recommendations, drafts clear safety concerns, schedules service repairs, and handles vehicle trade-in inquiries.
- Automation flow rules: Trigger safety-urgency messages over 2-week to 60-day sequences, and real-time CSI alert surveys on low ratings post-visit.
`
};

export async function ghlBusinessOnboardingHandler(inputs: Record<string, any>): Promise<{ outputText: string; meta: any }> {
  const {
    industryTemplate,
    businessName,
    businessType,
    location,
    primaryServices,
    primaryOffer,
    mainGoal,
    targetAudience,
    brandStyle,
    mainCTA,
    businessHours = 'Mon-Fri 9am-5pm',
    communicationChannels = ['SMS', 'Email', 'Web Chat'],
    seoLocation,
    mainSeoServices,
    specialBusinessDetails = 'None',
    customerEmail = 'nws-client@noveltywebsolutions.com',
    customerFirstName = 'Client',
    customerLastName = 'User'
  } = inputs;

  console.log(`[GHL Business Onboarding] Starting onboarding run for template: ${industryTemplate || 'none'} | Business: ${businessName}`);

  const brokerSupabase = createBrokerClient();

  // Snapshot Resolution: Hybrid mapping (uses override env vars if defined, otherwise falls back to generic snapshot)
  let targetSnapshotId = '6Qy3nQP72zo5CgpH5HGO'; // Generic baseline snapshot
  if (industryTemplate) {
    const envKey = `NWS_SNAPSHOT_${industryTemplate.toUpperCase()}`;
    const overrideSnapshotId = process.env[envKey];
    if (overrideSnapshotId) {
      console.log(`[GHL Business Onboarding] Using override Snapshot ID for ${industryTemplate}: ${overrideSnapshotId}`);
      targetSnapshotId = overrideSnapshotId;
    } else {
      console.log(`[GHL Business Onboarding] No override env variable found for ${industryTemplate} (${envKey}). Defaulting to generic snapshot: ${targetSnapshotId}`);
    }
  }

  // 1. Trigger GHL Provisioning via Broker Endpoint
  let locationId = 'MOCK_LOCATION_ID_' + Math.random().toString(36).substr(2, 9).toUpperCase();
  let provisioningSuccess = false;
  let provisioningError = null;

  const brokerUrl = process.env.NWS_BROKER_URL;
  const brokerAppId = process.env.NWS_BROKER_APP_ID || 'ronsuite';
  const brokerSecret = process.env.NWS_BROKER_SECRET;

  if (brokerUrl && brokerSecret) {
    try {
      console.log(`[GHL Business Onboarding] Sending provision request to: ${brokerUrl}/provision with Snapshot: ${targetSnapshotId}`);
      const res = await fetch(`${brokerUrl}/provision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-nws-app-id': brokerAppId,
          'Authorization': `Bearer ${brokerSecret}`
        },
        body: JSON.stringify({
          appId: brokerAppId,
          businessName,
          email: customerEmail,
          firstName: customerFirstName,
          lastName: customerLastName,
          location,
          niche: businessType,
          snapshotId: targetSnapshotId
        })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Broker error ${res.status}: ${text}`);
      }

      const data = await res.json() as any;
      console.log('[GHL Business Onboarding] Broker response:', data);
      
      const returnedLocationId = data?.locationId || data?.location?.id || data?.id;
      if (returnedLocationId) {
        locationId = returnedLocationId;
        provisioningSuccess = true;
      } else {
        console.warn('[GHL Business Onboarding] No locationId returned, using mock ID');
      }
    } catch (err: any) {
      console.error('[GHL Business Onboarding] Provisioning call failed:', err.message);
      provisioningError = err.message;
    }
  } else {
    console.log('[GHL Business Onboarding] Broker URL or Secret not configured. Skipping provisioning API call.');
  }

  const blueprintText = industryTemplate ? `\nIndustry Niche Guidelines:\n${industryBlueprints[industryTemplate] || ''}` : '';

  // 2. Generate customized prompts using Claude 3.5 Sonnet
  const systemPrompt = `You are the master AI Business-Building system and Senior GHL Architect.
Based on the client onboarding intake information provided, your job is to output THREE completely separate, copy-and-paste ready prompts for GoHighLevel AI tools.

Your outputs must strictly align with the business information and requirements below:

==================================================
BUSINESS INFORMATION
==================================================
Business Name: ${businessName}
Business Type/Niche: ${businessType}
Location: ${location}
Primary Services:
${(primaryServices || []).map((s: string) => `- ${s}`).join('\n')}
Primary Offer: ${primaryOffer}
Main Goal: ${mainGoal}
Target Audience: ${targetAudience}
Brand Style: ${brandStyle}
Main CTA: ${mainCTA}
Business Hours: ${businessHours}
Communication Channels: ${(communicationChannels || []).join(', ')}
SEO Location: ${seoLocation || location}
Main SEO Services:
${(mainSeoServices || primaryServices || []).map((s: string) => `- ${s}`).join('\n')}
Special Business Details / Bespoke Instructions: ${specialBusinessDetails}
${blueprintText}

==================================================
GLOBAL SYSTEM REQUIREMENTS
==================================================
All prompts should reflect this specific business niche, use proper industry terminology, optimize for local SEO search, and build human-sounding conversational flow.
The chatbot and voice agents must be named "Luna" and have a warm, professional, employee-like personality.

==================================================
PROMPT REQUIREMENTS & TEMPLATES
==================================================

### 1. WEBSITE BUILDER PROMPT (VIBE CODER)
Create a comprehensive website code instruction for the GoHighLevel Website builder / Vibe Coder.
It must describe a mobile-responsive, conversion-focused premium local site with:
- Sticky header, CTA hero section, Service highlights, Lead Capture forms (capturing Name, Phone, Email, Requested Service, Urgency, Notes), dynamic local testimonials, FAQ accordion.
- Integrated styling conforming to Brand Style "${brandStyle}".
- Local SEO structures targeting SEO Location "${seoLocation || location}".

### 2. AI BUSINESS OPERATING SYSTEM PROMPT (ASK AI)
Create a standalone training prompt for the "Luna" chatbot and voice agent.
It must instruct how to:
- Act as warm, professional assistant Luna.
- Handle FAQs, qualify leads, explain services, and book meetings directly.
- Walk through a standard sales pipeline: New Lead, Contacted, Qualified, Appointment Scheduled, Appointment Completed, Proposal Sent, Follow-up, Closed Won/Lost, Reactivation.
- Avoid robotic speech, handle objections naturally, and capture scheduling details without double-booking.

### 3. MASTER AUTOMATION SYSTEM PROMPT (AUTOMATION BUILDER)
Create a single centralized automation specification for the GoHighLevel workflow builder.
Must explain how to configure:
- Inbound Lead Capture trigger (Form, SMS, call, booking).
- Instant Lead Response (SMS & Email with niche-appropriate copy).
- Multi-step Lead Nurture sequences with delays.
- Appointment Automation logic (reminders, confirmations, follow-ups).
- Pipeline movement triggers (auto-marking won/lost, status updates).
- Staff notifications for high-priority/urgent leads.
- Reactivation logic for cold prospects.

==================================================
OUTPUT FORMAT RULES
==================================================
You MUST format your final response EXACTLY as shown below:

==================================================
COPY & PASTE INTO GOHIGHLEVEL VIBE CODER
==================================================
[Your generated Prompt #1 — Website Builder here. Make it extremely detailed and complete.]
==================================================
END WEBSITE BUILDER PROMPT
==================================================

==================================================
COPY & PASTE INTO GOHIGHLEVEL ASK AI
==================================================
[Your generated Prompt #2 — AI Business Operating System here. Make it extremely detailed and complete.]
==================================================
END AI BUSINESS OPERATING SYSTEM PROMPT
==================================================

==================================================
COPY & PASTE INTO GOHIGHLEVEL AUTOMATION BUILDER
==================================================
[Your generated Prompt #3 — Master Automation System here. Make it extremely detailed and complete.]
==================================================
END MASTER AUTOMATION SYSTEM PROMPT
==================================================

Do not output any conversational preamble or postscript. Start directly with the first divider.`;

  const modelToUse = MODEL || 'claude-3-5-sonnet-20241022';
  
  const response = await anthropic.messages.create({
    model: modelToUse,
    max_tokens: 4000,
    messages: [
      { role: 'user', content: systemPrompt }
    ]
  });

  const outputText = response.content[0]?.type === 'text' ? response.content[0].text : '';

  const inputTokens = response.usage?.input_tokens || 0;
  const outputTokens = response.usage?.output_tokens || 0;
  const totalTokens = inputTokens + outputTokens;
  
  // Cost calculation for Claude 3.5 Sonnet: $3/MT input, $15/MT output
  const costUsd = (inputTokens * 0.000003) + (outputTokens * 0.000015);

  return {
    outputText,
    meta: {
      locationId,
      provisioningSuccess,
      provisioningError,
      businessName,
      industryTemplate,
      snapshotId: targetSnapshotId,
      modelUsed: modelToUse,
      timestamp: new Date().toISOString(),
      usage: {
        inputTokens,
        outputTokens,
        totalTokens,
        costUsd
      }
    }
  };
}
