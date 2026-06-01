import fs from 'fs';
import path from 'path';
import { anthropic, MODEL } from '../../anthropic';
import { createServiceClient } from '../../supabase/service';

export async function proposalDrafterHandler(inputs: Record<string, any>): Promise<{ draft: string; meta: any }> {
  const { clientName, needsWebsite, needsCRM, needsAIReceptionist, additionalNotes } = inputs;
  console.log(`[Proposal Drafter] Starting proposal draft for: ${clientName}`);

  const supabase = createServiceClient();

  // 1. Fetch context from hermes_context
  const { data: contextData, error: contextErr } = await supabase
    .from('hermes_context')
    .select('*')
    .limit(1)
    .single();

  if (contextErr) {
    console.warn('[Proposal Drafter] Warning: Failed to fetch hermes_context:', contextErr);
  }

  const rawIntake = contextData?.raw_intake || {};
  const businessModel = rawIntake.business_model_v1 || {};
  const profile = rawIntake.profile_v2 || {};

  // 2. Locate and load Proposal Template
  let templateContent = '';
  const vaultPath = rawIntake.knowledge_links?.obsidian_vault || 'C:\\Users\\Ronald\\.gemini\\antigravity\\memory\\wikis\\antigravity_master';
  const templateFilePath = path.join(vaultPath, 'NWS', 'Sales System', '02_Proposal_Template.md');
  
  try {
    if (fs.existsSync(templateFilePath)) {
      templateContent = fs.readFileSync(templateFilePath, 'utf8');
      console.log(`[Proposal Drafter] Successfully loaded template from ${templateFilePath}`);
    } else {
      console.warn(`[Proposal Drafter] Template not found at: ${templateFilePath}. Falling back to default.`);
    }
  } catch (err) {
    console.error('[Proposal Drafter] Error reading template file:', err);
  }

  // Fallback template if file read fails
  if (!templateContent) {
    templateContent = `
# NWS Proposal Template: Digital Architect

## Executive Summary
This proposal is designed to solve the critical operational bottlenecks outlined during our co-discovery call. We build functional systems, not static websites, enabling your business to automate lead-capture, customer support, and scheduling pipelines.

## Proposed Phased Scope
### Phase 1: Inbound & Scheduling Automation (AI Receptionist)
### Phase 2: CRM & Pipeline Setup (GHL)
### Phase 3: Launch & White-Glove Support

## Investment
### 1. Implementation Fees (One-time)
- Phase 1 Implementation: $1,997
- Phase 2 Implementation: $1,997
- Phase 3 Implementation: $1,006
Total Implementation Fees: $5,000

### 2. NWS Platform Subscription (Track 1 - Recurring)
- Small Business Tier: $597/month (or $5,970/year)
*Includes: Hosting, full CRM features, Extendly white-glove customer support, and software license.*
    `;
  }

  // 3. Assemble prompt for Claude
  const systemPrompt = `You are a premium sales copywriter and Digital Architect assistant at Novelty Web Solutions (NWS).
Your task is to auto-generate a high-converting, phased scope client proposal ready to be copied and pasted into the GoHighLevel document builder.

You must strictly base your proposal writing on the following verified business model context:
- Positioning: Digital Architect (we sell functional operating systems and automated pipelines, NOT just websites or static services).
- Project Pricing (Track 2): High-ticket, phased implementation scoped projects, starting at $5,000.
- Platform Subscription Pricing (Track 1): Recurring base layer. Solo tier is $297/month. Small Business tier is $597/month (which includes hosting, CRM features, Extendly white-glove support, and software license).
- Critical constraint: Implementation fees (One-time) and Platform subscriptions (Recurring) must always be separated.
- Core value propositions: AI Receptionists (Twilio + n8n webhook automations for FAQs/bookings), CB Directory lead-gen assets, and Extendly white-glove support.

Company & Profile Context:
${JSON.stringify({ businessModel, profile }, null, 2)}

Original Template Structure (Use this exact structural flow):
${templateContent}

Inputs for this proposal draft:
- Client Name: "${clientName}"
- Needs Website: ${needsWebsite ?? 'Not specified'}
- Needs CRM: ${needsCRM ?? 'Not specified'}
- Needs AI Receptionist: ${needsAIReceptionist ?? 'Not specified'}
- Additional Notes: "${additionalNotes ?? 'None'}"

Rules for the draft:
1. Complete all sections of the template fully. Do not use generic placeholders.
2. Customize the Executive Summary to address the specific needs specified (e.g. Website, CRM, AI Receptionist) and additional notes.
3. Detail the phased scope clearly:
   - Phase 1: AI Receptionist and Inbound Automation (include Twilio SMS/Phone setup and FAQ integrations).
   - Phase 2: CRM and Pipeline setup (include central client inbox, custom parameters mapping, pipeline tracking).
   - Phase 3: Launch and Support (migration, training, handover).
4. Investment section must specify one-time fees (Phase 1: $1,997, Phase 2: $1,997, Phase 3: $1,006, Total: $5,000) and recurring subscription details ($597/month or $297/month as appropriate).
5. Ensure the tone is highly professional, direct, and authoritative, emphasizing value and operational efficiency.
6. The proposal draft is for Ronald's review. Only return the proposal text (no conversational preamble or postscript).`;

  // Use the default MODEL configured for ronsuite-os
  const modelToUse = MODEL || 'claude-3-5-sonnet-20241022';
  
  const response = await anthropic.messages.create({
    model: modelToUse,
    max_tokens: 4000,
    messages: [
      { role: 'user', content: systemPrompt }
    ]
  });

  const draft = response.content[0]?.type === 'text' ? response.content[0].text : '';

  return {
    draft,
    meta: {
      clientName,
      modelUsed: modelToUse,
      timestamp: new Date().toISOString()
    }
  };
}
