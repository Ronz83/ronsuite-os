import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from '@/lib/anthropic';
import { createServiceClient } from '@/lib/supabase/service';

const GHL_EXPERT_MODEL = 'anthropic/claude-sonnet-4.6';

const GHL_EXPERT_SYSTEM = `You are the GHL Expert — the authority on everything GoHighLevel / NWS CRM.

You own this domain completely. When the Head Master delegates a CRM task to you, you:
1. Understand the task deeply
2. Select the right student functionality to execute it
3. Execute and return a clean, verified result

WHAT YOU KNOW:
- Full GHL API surface (contacts, opportunities, calendars, workflows, conversations, payments, forms, social, locations)
- OAuth V2 provisioning flow — both client_id AND version_id required for draft apps
- The internal API (backend.leadconnectorhq.com) is needed to CREATE workflows; public API is read-only for workflows
- NWS CRM white-label rules: NEVER say GoHighLevel, GHL, or HighLevel to clients — always "NWS CRM"
- Ronald's GHL config: App ID 69de25768e564203ee8f8de0, Company ID DtdmnPcno3imkYdHO5Zt, Default Snapshot 6Qy3nQP72zo5CgpH5HGO
- Token storage is in Supabase crm_auth table (service-role only)
- CARI tier structure: Growth ($29) chat AI, Pro ($99) campaigns, Elite ($299) voice + custom AI

YOUR STUDENTS (functionalities you deploy):
- oauth-manager: GHL OAuth V2 flow for sub-account onboarding
- location-provisioner: Creates and configures new GHL sub-accounts
- webhook-handler: Processes inbound GHL webhooks → Supabase updates
- changelog-monitor: Watches GHL changelog for breaking changes

Return actionable output only. Be precise. If you need information to complete a task, list exactly what's needed.`;

export async function POST(req: NextRequest) {
  try {
    const { task, context, role, runId } = await req.json();

    if (!task) {
      return NextResponse.json({ error: 'No task provided' }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    // Log expert run
    const { data: expertRun } = await serviceClient
      .from('expert_runs')
      .insert({
        expert_id: 'ghl',
        role_applied: role || null,
        input: task,
        status: 'running',
        model_used: GHL_EXPERT_MODEL,
      })
      .select('id')
      .single();

    const expertRunId = expertRun?.id;

    const systemWithRole = role
      ? `${GHL_EXPERT_SYSTEM}\n\nAPPLIED ROLE LENS: ${role.toUpperCase()}\nApproach this task through the ${role} perspective.`
      : GHL_EXPERT_SYSTEM;

    const response = await anthropic.messages.create({
      model: GHL_EXPERT_MODEL,
      max_tokens: 4096,
      system: systemWithRole,
      messages: [
        ...(context ? [{ role: 'user' as const, content: `Context: ${context}` }] : []),
        { role: 'user' as const, content: task }
      ],
    });

    const output = response.content[0]?.type === 'text' ? response.content[0].text : '';

    // Update expert run record
    if (expertRunId) {
      await serviceClient
        .from('expert_runs')
        .update({
          output,
          status: 'complete',
          tokens_in: response.usage?.input_tokens || 0,
          tokens_out: response.usage?.output_tokens || 0,
          completed_at: new Date().toISOString(),
        })
        .eq('id', expertRunId);
    }

    return NextResponse.json({
      expert: 'ghl',
      output,
      expertRunId,
      model: GHL_EXPERT_MODEL,
    });

  } catch (err: any) {
    console.error('[GHL Expert] Error:', err);
    return NextResponse.json({ error: err.message || 'GHL Expert failed' }, { status: 500 });
  }
}
