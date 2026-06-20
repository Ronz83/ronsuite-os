import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from '@/lib/anthropic';
import { routeTask } from '@/lib/dispatch/router';
import { makeSystemPromptDynamic } from '@/lib/brain';
import { createServiceClient } from '@/lib/supabase/service';

// Model map per tier — Head Master always uses premium
const MODEL_MAP = {
  master: 'anthropic/claude-sonnet-4.6', // Head Master — quality gate
  premium: 'anthropic/claude-sonnet-4.6',
  mid: 'anthropic/claude-3.5-haiku',
  flash: 'google/gemini-2.0-flash',
};

const HEAD_MASTER_SYSTEM = `You are the Head Master — the central intelligence of RonSuite OS.

Your two responsibilities:
1. ISSUE: Decompose the user's intent, select the right Expert and Role, and write a precise task brief.
2. VERIFY: Review all Expert output before surfacing it to the user. Reject and retry if weak.

You know the single plan — Ronald's business, projects, rules, and preferences — by heart.
You never expose internal agent names, model names, or system details to the user.
You surface only clean, high-quality, actionable output.

ROLES you apply as thinking lenses:
- Engineer: architecture, logic, performance, code quality
- Creative Director: brand, feel, story, visual language  
- Strategist: outcomes, positioning, funnels, ROI
- Copywriter: conversion, voice, persuasion, hooks
- Operations: workflows, SOPs, efficiency, systems

EXPERTS you can delegate to:
- GHL Expert (ghl): All CRM/NWS CRM operations
- Design Expert (design): All UI/UX and visual work
- Dev Expert (dev): All code architecture and engineering
- Copy Expert (copy): All written content

Always be direct. Always be precise. Never pad output.`;

export async function POST(req: NextRequest) {
  try {
    const { messages, userInput } = await req.json();

    if (!userInput && (!messages || messages.length === 0)) {
      return NextResponse.json({ error: 'No input provided' }, { status: 400 });
    }

    const input = userInput || messages[messages.length - 1]?.content || '';

    // Route the task
    const dispatch = routeTask(input);

    // Build dynamic system prompt
    const serviceClient = createServiceClient();
    const dynamicSystem = await makeSystemPromptDynamic(HEAD_MASTER_SYSTEM, serviceClient);

    // Log the master run
    const { data: runRecord } = await serviceClient
      .from('master_runs')
      .insert({
        user_input: input,
        role_applied: dispatch.role,
        experts_called: dispatch.expert ? [dispatch.expert] : [],
        status: 'running',
        model_used: MODEL_MAP.master,
      })
      .select('id')
      .single();

    const runId = runRecord?.id;

    // Stream the Head Master response
    const stream = await anthropic.messages.create({
      model: MODEL_MAP.master,
      max_tokens: 4096,
      system: dynamicSystem,
      messages: messages || [{ role: 'user', content: input }],
      stream: true,
    });

    // Return a streaming response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        let fullText = '';

        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
              const chunk = event.delta.text;
              fullText += chunk;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk, dispatch })}\n\n`));
            }
          }

          // Mark run complete
          if (runId) {
            await serviceClient
              .from('master_runs')
              .update({ status: 'complete', final_output: fullText, completed_at: new Date().toISOString() })
              .eq('id', runId);
          }
        } catch (err) {
          console.error('[Head Master] Stream error:', err);
          if (runId) {
            await serviceClient.from('master_runs').update({ status: 'failed' }).eq('id', runId);
          }
        } finally {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      }
    });

    return new NextResponse(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });

  } catch (err: any) {
    console.error('[Head Master] Error:', err);
    return NextResponse.json({ error: err.message || 'Head Master failed' }, { status: 500 });
  }
}
