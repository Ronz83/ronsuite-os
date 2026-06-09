import { anthropic, MODEL, MAX_TOKENS } from '@/lib/anthropic';
import { plannerToolDefinitions, executeToolCall } from '@/lib/tools/planner-tools';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { sendNotificationToAll } from '@/lib/push';

import { extractAndSaveMemory, makeSystemPromptDynamic } from '@/lib/brain';

function encode(obj: unknown) {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

export async function POST(req: Request) {
  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { message, agentId, goalId, sessionId, attachmentIds } = await req.json() as {
    message: string;
    agentId?: string;
    goalId?: string;
    sessionId?: string;
    attachmentIds?: string[];
  };
  const serviceClient = createServiceClient();

  // Load and process attachments if any
  let attachmentsData: any[] = [];
  let hasImages = false;

  if (attachmentIds && attachmentIds.length > 0) {
    try {
      const { data, error } = await serviceClient
        .from('hermes_attachments')
        .select('*')
        .in('id', attachmentIds);
      if (!error && data) {
        attachmentsData = data;
        hasImages = attachmentsData.some(a => a.file_type.startsWith('image/'));

        // Generate image descriptions in background using a cheap vision model if not already present
        for (const attachment of attachmentsData) {
          if (attachment.file_type.startsWith('image/') && !attachment.extracted_text) {
            try {
              const descResult = await anthropic.messages.create({
                model: 'google/gemini-2.5-flash',
                messages: [
                  {
                    role: 'user',
                    content: [
                      { type: 'text', text: 'Describe this image in detail, listing all key text, features, code snippets, or charts visible in it.' },
                      {
                        type: 'image_url',
                        image_url: {
                          url: attachment.content
                        }
                      }
                    ]
                  }
                ],
                max_tokens: 500
              });
              const descText = descResult.content?.[0]?.text || '';
              if (descText) {
                attachment.extracted_text = descText;
                await serviceClient
                  .from('hermes_attachments')
                  .update({ extracted_text: descText })
                  .eq('id', attachment.id);
              }
            } catch (descErr) {
              console.error('[Vision] Failed to compile description:', descErr);
            }
          }
        }
      }
    } catch (attachmentErr) {
      console.error('[Attachments] Failed to load attachments:', attachmentErr);
    }
  }

  // Load the agent configuration from Supabase
  let systemPrompt = "You are a helpful AI assistant.";
  let enabledTools: typeof plannerToolDefinitions = [];
  let agentName = "Assistant";
  let finalAgentResponseText = "";

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
      systemPrompt = await makeSystemPromptDynamic(agent.system_prompt, serviceClient);
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
    let resolvedSessionId: string | null = null;
    let messages: MessageParam[] = [];
    let userMsgIndex = -1;
    let dbUserContent = message;
    try {
      // Find or load active session
      let session: any = null;
      if (sessionId) {
        const { data } = await serviceClient
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single();
        session = data;
      }

      if (!session && agentId) {
        const query = serviceClient
          .from('sessions')
          .select('*')
          .eq('agent_id', agentId)
          .eq('status', 'active');
        
        if (goalId) {
          query.eq('goal_id', goalId);
        } else {
          query.is('goal_id', null);
        }
        
        const { data } = await query.order('started_at', { ascending: false }).limit(1).maybeSingle();
        session = data;

        if (!session) {
          const { data: newSession, error: createError } = await serviceClient
            .from('sessions')
            .insert({
              agent_id: agentId,
              goal_id: goalId || null,
              status: 'active',
              messages: []
            })
            .select()
            .single();
          if (!createError) {
            session = newSession;
          }
        }
      }

      if (session) {
        resolvedSessionId = session.id;
        write(encode({ type: 'session_init', sessionId: session.id }));
        if (Array.isArray(session.messages)) {
          messages = session.messages.map((m: any) => ({
            role: m.role,
            content: m.content
          }));
        }
      }

      userMsgIndex = messages.length;

      // Construct current turn content injection
      const currentContent: any[] = [{ type: 'text' as const, text: message }];
      for (const attachment of attachmentsData) {
        if (attachment.file_type.startsWith('image/')) {
          currentContent.push({
            type: 'image_url' as const,
            image_url: {
              url: attachment.content
            }
          });
        } else {
          // Text file (txt, md, code, csv)
          currentContent[0].text += `\n\n[File Attachment: ${attachment.file_name}]\n${attachment.content}`;
        }
      }

      messages.push({ role: 'user', content: currentContent as any });

      // Clean representation to store in database
      for (const attachment of attachmentsData) {
        if (attachment.file_type.startsWith('image/')) {
          dbUserContent += `\n\n[Attached Image: ${attachment.file_name} - Description: ${attachment.extracted_text || 'processing...'}]`;
        } else {
          dbUserContent += `\n\n[Attached File Reference: ${attachment.file_name} (ID: ${attachment.id})]`;
        }
      }

      let continueLoop = true;
      let loopCount = 0;
      const MAX_LOOPS = 10;

      while (continueLoop && loopCount < MAX_LOOPS) {
        loopCount++;
        const modelToUse = hasImages ? 'google/gemini-2.5-flash' : MODEL;
        // Build Anthropic request options
        const anthropicParams: Parameters<typeof anthropic.messages.create>[0] = {
          model: modelToUse,
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

        if (fullText) {
          finalAgentResponseText = fullText;
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
      // Clean up the user message in the array before saving it to the database
      if (userMsgIndex >= 0 && messages[userMsgIndex]) {
        messages[userMsgIndex] = {
          role: 'user',
          content: dbUserContent
        };
      }

      // Save session messages back to the database
      if (resolvedSessionId && messages.length > 0) {
        try {
          await serviceClient
            .from('sessions')
            .update({ messages: messages })
            .eq('id', resolvedSessionId);
        } catch (err) {
          console.error("Error saving session messages:", err);
        }
      }

      // Extract and save memory in background (non-blocking)
      if (finalAgentResponseText) {
        extractAndSaveMemory(message, finalAgentResponseText).catch(e => {
          console.error("[Auto-Memory] Failed to run extractAndSaveMemory:", e);
        });
      }

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
