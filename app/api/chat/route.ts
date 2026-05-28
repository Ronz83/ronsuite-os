import { anthropic, MODEL, MAX_TOKENS } from '@/lib/anthropic';
import { plannerToolDefinitions, executeToolCall } from '@/lib/tools/planner-tools';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';

const PLANNER_SYSTEM = `You are the Planner agent for Ronald Prescod, founder of Novelty Web Solutions (NWS).

Your role: translate goals into scoped, actionable tasks and track their progress.

Ronald's active projects:
- Caricom Business (Caribbean business directory, dir.caricombusiness.com, Next.js + Supabase) — slug: caricom-business
- TicketFlows (Construction hauling OS, ticketflows.app, React + Vite + Supabase) — slug: ticketflows
- RonSuite OS (Personal AI command center, this app, Next.js + Supabase) — slug: ronsuite-os
- Novelty Web Solutions (Agency — client projects and NWS tooling) — slug: nws

Rules:
1. Before breaking down any goal, identify which project it belongs to.
2. Break goals into 3–7 concrete tasks with clear done states.
3. Create tasks using the create_task tool. Do not just list them in text — always call the tool.
4. If a goal is ambiguous, ask one clarifying question before proceeding.
5. After creating tasks, summarize what you created and what the next decision point is.

You are direct, brief, and specific. No filler.`;

function encode(obj: unknown) {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

export async function POST(req: Request) {
  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { message } = await req.json() as { message: string };
  const serviceClient = createServiceClient();

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const write = (data: string) => writer.write(encoder.encode(data));

  (async () => {
    try {
      const messages: MessageParam[] = [{ role: 'user', content: message }];
      let continueLoop = true;

      while (continueLoop) {
        const anthropicStream = await anthropic.messages.create({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: PLANNER_SYSTEM,
          tools: plannerToolDefinitions,
          messages,
          stream: true,
        });

        const toolCalls: { id: string; name: string; input: string }[] = [];
        let currentToolId = '';
        let currentToolName = '';
        let currentToolInput = '';
        let fullText = '';
        let stopReason = '';

        for await (const event of anthropicStream) {
          if (event.type === 'content_block_start') {
            if (event.content_block.type === 'tool_use') {
              currentToolId = event.content_block.id;
              currentToolName = event.content_block.name;
              currentToolInput = '';
              write(encode({ type: 'tool_start', name: currentToolName }));
            }
          } else if (event.type === 'content_block_delta') {
            if (event.delta.type === 'text_delta') {
              fullText += event.delta.text;
              write(encode({ type: 'text', content: event.delta.text }));
            } else if (event.delta.type === 'input_json_delta') {
              currentToolInput += event.delta.partial_json;
            }
          } else if (event.type === 'content_block_stop') {
            if (currentToolName) {
              toolCalls.push({ id: currentToolId, name: currentToolName, input: currentToolInput });
              currentToolName = '';
            }
          } else if (event.type === 'message_delta') {
            stopReason = event.delta.stop_reason ?? '';
          }
        }

        messages.push({
          role: 'assistant',
          content: [
            ...(fullText ? [{ type: 'text' as const, text: fullText }] : []),
            ...toolCalls.map(tc => ({
              type: 'tool_use' as const,
              id: tc.id,
              name: tc.name,
              input: JSON.parse(tc.input || '{}'),
            })),
          ],
        });

        if (stopReason === 'tool_use' && toolCalls.length > 0) {
          const toolResults = [];
          for (const tc of toolCalls) {
            const result = await executeToolCall(
              tc.name,
              JSON.parse(tc.input || '{}'),
              serviceClient
            );
            write(encode({ type: 'tool_done', name: tc.name, result }));
            toolResults.push({ type: 'tool_result' as const, tool_use_id: tc.id, content: result });
          }
          messages.push({ role: 'user', content: toolResults });
        } else {
          continueLoop = false;
        }
      }
    } catch (err) {
      write(encode({ type: 'error', message: String(err) }));
    } finally {
      writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
