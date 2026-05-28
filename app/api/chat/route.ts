import { anthropic, MODEL, MAX_TOKENS } from '@/lib/anthropic';
import { plannerToolDefinitions, executeToolCall } from '@/lib/tools/planner-tools';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { sendNotificationToAll } from '@/lib/push';

function encode(obj: unknown) {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

export async function POST(req: Request) {
  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { message, agentId, goalId } = await req.json() as { message: string; agentId?: string; goalId?: string };
  const serviceClient = createServiceClient();

  // Load the agent configuration from Supabase
  let systemPrompt = "You are a helpful AI assistant.";
  let enabledTools: typeof plannerToolDefinitions = [];
  let agentName = "Assistant";

  // Fetch goal context if goalId is provided
  let activeGoal: any = null;
  if (goalId) {
    try {
      const { data: goal } = await serviceClient
        .from('goals')
        .select('*, projects(name)')
        .eq('id', goalId)
        .single();
      if (goal) {
        activeGoal = goal;
        systemPrompt = `${systemPrompt}\n\n[ACTIVE GOAL CONTEXT]\nProject: ${goal.projects?.name || 'Global'}\nGoal Title: ${goal.title}\nStatus: ${goal.status}\nTurns Used: ${goal.turns_used} / ${goal.turn_budget}\n\nWork directly towards achieving this goal.`;
      }
    } catch (err) {
      console.error("Error loading goal context:", err);
    }
  }

  if (agentId) {
    const { data: agent } = await serviceClient
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agent) {
      systemPrompt = agent.system_prompt;
      agentName = agent.name;
      
      // Parse agent tools from JSON database field
      let agentToolsList: string[] = [];
      try {
        if (typeof agent.tools === 'string') {
          agentToolsList = JSON.parse(agent.tools);
        } else if (Array.isArray(agent.tools)) {
          agentToolsList = agent.tools;
        }
      } catch (e) {
        console.error("Error parsing tools for agent", e);
      }

      // Filter planner tool definitions to only include tools mapped to this agent
      enabledTools = plannerToolDefinitions.filter(t => agentToolsList.includes(t.name));
    }
  }

  // Load matched memories using FTS search against the user's message
  const searchTerms = message
    .replace(/[^\w\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 2)
    .join(' | ');

  if (searchTerms) {
    try {
      const { data: memories } = await serviceClient
        .from('memory')
        .select('title, content')
        .textSearch('search_vector', searchTerms)
        .limit(3);

      if (memories && memories.length > 0) {
        const memoryBlocks = memories.map(m => `Title: ${m.title}\nContent: ${m.content}`).join('\n\n');
        systemPrompt = `${systemPrompt}\n\n[CONTEXT FROM MEMORY]\nUse the following relevant context from memory for your response:\n${memoryBlocks}`;
      }
    } catch (err) {
      console.error("Error searching memory database:", err);
    }
  }

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const write = (data: string) => writer.write(encoder.encode(data));

  (async () => {
    try {
      const messages: MessageParam[] = [{ role: 'user', content: message }];
      let continueLoop = true;
      let loopCount = 0;
      const MAX_LOOPS = 10;

      while (continueLoop && loopCount < MAX_LOOPS) {
        loopCount++;
        // Build Anthropic request options
        const anthropicParams: Parameters<typeof anthropic.messages.create>[0] = {
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: systemPrompt,
          messages,
          stream: true,
        };

        // Only pass tools if the agent actually has tools enabled
        if (enabledTools.length > 0) {
          anthropicParams.tools = enabledTools;
        }

        const anthropicStream = await anthropic.messages.create(anthropicParams) as any;

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
      // 1. Send push notification that agent finished response
      try {
        await sendNotificationToAll(
          `${agentName} responded`,
          `Finished session turn for agent: ${agentName}`,
          `/chat?goal_id=${goalId || ''}`
        );
      } catch (err) {
        console.error("Error sending response push notification:", err);
      }

      if (activeGoal) {
        try {
          await serviceClient
            .from('goals')
            .update({ turns_used: (activeGoal.turns_used || 0) + 1 })
            .eq('id', activeGoal.id);

          // 2. Check current status from DB after updates and notify if blocked or complete
          const { data: latestGoal } = await serviceClient
            .from('goals')
            .select('status, title')
            .eq('id', activeGoal.id)
            .single();

          if (latestGoal && (latestGoal.status === 'blocked' || latestGoal.status === 'complete')) {
            await sendNotificationToAll(
              latestGoal.status === 'blocked' ? 'Goal Blocked ⚠️' : 'Goal Complete 🎉',
              `"${latestGoal.title}" is ${latestGoal.status}`,
              `/goals`
            );
          }
        } catch (err) {
          console.error("Error incrementing goal turns or sending goal push notification:", err);
        }
      }
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
