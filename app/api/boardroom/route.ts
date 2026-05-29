import { anthropic, MODEL, MAX_TOKENS } from '@/lib/anthropic';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { extractAndSaveMemory, makeSystemPromptDynamic } from '@/lib/brain';

function encode(obj: unknown) {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

// Helper to construct non-consecutive message history for Anthropic
function buildHistoryForAgent(pastTurns: any[], agentName: string) {
  const history: MessageParam[] = [];
  for (const turn of pastTurns) {
    const agentResponse = turn.responses?.find((r: any) => r.agent === agentName)?.text;
    
    if (history.length > 0 && history[history.length - 1].role === 'user') {
      if (agentResponse) {
        history.push({ role: 'assistant', content: agentResponse });
      } else {
        // Append user messages together if the agent did not respond in that turn
        history[history.length - 1].content += `\n\n[Previous turn User message]: ${turn.user_message}`;
      }
    } else {
      history.push({ role: 'user', content: turn.user_message });
      if (agentResponse) {
        history.push({ role: 'assistant', content: agentResponse });
      }
    }
  }
  return history;
}

export async function POST(req: Request) {
  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { message, directed_to, session_id } = await req.json() as {
    message: string;
    directed_to?: string | null;
    session_id?: string | null;
  };

  const serviceClient = createServiceClient();

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const write = (data: string) => writer.write(encoder.encode(data));

  (async () => {
    try {
      // 1. Resolve or create boardroom session
      let activeSessionId = session_id;
      if (!activeSessionId) {
        const { data: newSession, error: newSessionError } = await serviceClient
          .from('boardroom_sessions')
          .insert({ mode: 'cloud' })
          .select()
          .single();
        if (newSessionError) {
          throw new Error(`Failed to create boardroom session: ${newSessionError.message}`);
        }
        activeSessionId = newSession.id;
        write(encode({ type: 'session_init', sessionId: activeSessionId }));
      }

      // 2. Fetch past turns for history context
      let pastTurns: any[] = [];
      if (activeSessionId) {
        const { data: turns, error: turnsError } = await serviceClient
          .from('boardroom_turns')
          .select('*')
          .eq('session_id', activeSessionId)
          .order('created_at', { ascending: true });
        if (!turnsError && turns) {
          pastTurns = turns;
        }
      }

      // 3. Load department head agents
      const agentNames = ['Antigravity', 'Codex', 'Claude Code'];
      const { data: agents, error: agentsError } = await serviceClient
        .from('agents')
        .select('*')
        .in('name', agentNames);

      if (agentsError || !agents || agents.length === 0) {
        throw new Error('Failed to load department head agents. Make sure migration 009 is applied.');
      }

      // 4. Determine which agents to execute
      let agentsToRun = agents;
      console.log("[Boardroom API] Input directed_to:", directed_to);
      console.log("[Boardroom API] Loaded agents:", agents.map(a => a.name));

      if (directed_to) {
        const targetName = directed_to.replace(/^@/, '').trim().toLowerCase();
        const matched = agents.filter(a => a.name.trim().toLowerCase() === targetName);
        console.log("[Boardroom API] Matched agent list:", matched.map(a => a.name));
        
        if (matched.length > 0) {
          agentsToRun = matched;
        } else {
          // If a specific agent was requested but not found, only execute empty list or throw
          console.warn(`[Boardroom API] Agent matching directed_to "${directed_to}" was not found.`);
          agentsToRun = [];
        }
      }

      // 5. Run parallel Claude API streams
      const agentPromises = agentsToRun.map(async (agent) => {
        let agentResponseText = '';
        try {
          const history = buildHistoryForAgent(pastTurns, agent.name);
          history.push({ role: 'user', content: message });

          const systemPrompt = await makeSystemPromptDynamic(agent.system_prompt, serviceClient);
          const anthropicStream = await anthropic.messages.create({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            system: systemPrompt,
            messages: history,
            stream: true,
          });

          for await (const event of anthropicStream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const text = event.delta.text;
              agentResponseText += text;
              write(encode({ type: 'text', agent: agent.name, text }));
            }
          }
          write(encode({ type: 'agent_done', agent: agent.name }));
          
          if (agentResponseText) {
            extractAndSaveMemory(message, agentResponseText).catch(e => {
              console.error(`[Auto-Memory] Failed to extract boardroom memory for ${agent.name}:`, e);
            });
          }
        } catch (err) {
          console.error(`Error in stream for agent ${agent.name}:`, err);
          write(encode({ type: 'error', agent: agent.name, message: String(err) }));
        }
        return { agent: agent.name, text: agentResponseText };
      });

      const responses = await Promise.all(agentPromises);

      // 6. Save turn to boardroom_turns
      const { data: turn, error: turnError } = await serviceClient
        .from('boardroom_turns')
        .insert({
          session_id: activeSessionId,
          user_message: message,
          directed_to: directed_to || null,
          responses,
        })
        .select()
        .single();

      if (turnError) {
        throw new Error(`Failed to save boardroom turn: ${turnError.message}`);
      }

      write(encode({ type: 'turn_complete', turnId: turn.id, responses }));
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
