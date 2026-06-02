import { NextResponse } from 'next/server';
import { createBrokerClient } from '@/lib/supabase/broker';
import { handlers } from '@/lib/skills/handlers';

// Handle CORS Preflight request
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-nws-app-id',
      'Access-Control-Max-Age': '86400'
    }
  });
}

export async function POST(request: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-nws-app-id'
  };

  try {
    const body = await request.json();
    const { skillName, inputs, operatorEmail = 'workstation-operator@noveltywebsolutions.com' } = body;

    if (!skillName || !inputs) {
      return NextResponse.json({ error: 'Missing skillName or inputs' }, { status: 400, headers: corsHeaders });
    }

    console.log(`[Workstation API] Running skill: ${skillName} for ${operatorEmail}`);

    const broker = createBrokerClient();

    // 1. Resolve skill from workstation_skills
    const { data: skill, error: skillErr } = await broker
      .from('workstation_skills')
      .select('*')
      .eq('name', skillName)
      .single();

    if (skillErr || !skill) {
      return NextResponse.json({ error: `Skill '${skillName}' not found in workstation registry` }, { status: 404, headers: corsHeaders });
    }

    if (!skill.is_active) {
      return NextResponse.json({ error: `Skill '${skillName}' is currently inactive` }, { status: 400, headers: corsHeaders });
    }

    // 2. Create a workstation run log entry
    const { data: run, error: runErr } = await broker
      .from('workstation_runs')
      .insert({
        skill_id: skill.id,
        operator_email: operatorEmail,
        inputs,
        status: 'running'
      })
      .select('id')
      .single();

    if (runErr || !run) {
      console.error('[Workstation API] Error logging run:', runErr);
      return NextResponse.json({ error: `Failed to log run: ${runErr?.message}` }, { status: 500, headers: corsHeaders });
    }

    const runId = run.id;

    // 3. Map skillName to the correct handler reference
    let handlerRef = '';
    if (skillName === 'GHL Business Onboarding') {
      handlerRef = 'ghl-business-onboarding';
    } else if (skillName === 'Proposal Drafter') {
      handlerRef = 'proposal-drafter';
    }

    const handler = handlers[handlerRef];
    if (!handler) {
      const errorMsg = `No handler registered for '${skillName}' (ref: ${handlerRef})`;
      console.error(`[Workstation API] ${errorMsg}`);
      
      await broker
        .from('workstation_runs')
        .update({ status: 'failed', error: errorMsg })
        .eq('id', runId);

      return NextResponse.json({ error: errorMsg }, { status: 500, headers: corsHeaders });
    }

    // 4. Execute the skill handler
    try {
      const output = await handler(inputs);
      const usage = output?.meta?.usage || {};
      const inputTokens = usage.inputTokens || 0;
      const outputTokens = usage.outputTokens || 0;
      const totalTokens = usage.totalTokens || 0;
      const costUsd = usage.costUsd || 0.0;
      
      // Update run log to success
      await broker
        .from('workstation_runs')
        .update({
          status: 'success',
          outputs: output,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: totalTokens,
          cost_usd: costUsd
        })
        .eq('id', runId);

      return NextResponse.json({ success: true, runId, output }, { status: 200, headers: corsHeaders });
    } catch (err: any) {
      const errMsg = err.message || String(err);
      console.error(`[Workstation API] Execution error:`, err);

      await broker
        .from('workstation_runs')
        .update({
          status: 'failed',
          error: errMsg
        })
        .eq('id', runId);

      return NextResponse.json({ error: `Execution failed: ${errMsg}` }, { status: 500, headers: corsHeaders });
    }

  } catch (err: any) {
    console.error('[Workstation API] Request error:', err);
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
}
