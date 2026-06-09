import { anthropic, MODEL, MAX_TOKENS } from '@/lib/anthropic';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { NextResponse } from 'next/server';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { routeTask } from '@/lib/dispatch/router';
import { runTask } from '@/lib/dispatch/executor';
import { brainContextString } from '@/lib/brain/unified';

function encode(obj: unknown) {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

export async function POST(req: Request) {
  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { message, session_id, context_id } = await req.json() as {
    message: string;
    session_id?: string;
    context_id?: string;
  };

  const serviceClient = createServiceClient();

  // 1. Fetch hermes_context
  let contextQuery = serviceClient.from('hermes_context').select('*');
  if (context_id) {
    contextQuery = contextQuery.eq('id', context_id);
  }
  const { data: context } = await contextQuery.limit(1).maybeSingle();

  if (!context || !context.onboarding_complete) {
    return NextResponse.json({ success: false, error: 'Onboarding context not found or incomplete' }, { status: 400 });
  }

  // 2. Fetch last 3 journal entries
  const { data: journals } = await serviceClient
    .from('journal_entries')
    .select('*')
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(3);

  const recentJournalList = (journals || []).map(j => {
    return `Date: ${j.entry_date}\n${j.content}`;
  }).join('\n\n') || 'No recent journal entries.';

  // Helper arrays formatter
  const formatList = (val: any) => {
    let arr: string[] = [];
    if (typeof val === 'string') {
      try {
        arr = JSON.parse(val);
      } catch {
        arr = [val];
      }
    } else if (Array.isArray(val)) {
      arr = val;
    }
    return arr.map(item => `- ${item}`).join('\n');
  };

  const activeProjectsBullets = formatList(context.active_projects);
  const currentPrioritiesBullets = formatList(context.current_priorities);
  const connectedSystemsBullets = formatList(context.connected_systems);

  // Parse raw_intake metadata slots
  const rawIntake = context.raw_intake || {};
  const contacts = Array.isArray(rawIntake.key_contacts)
    ? rawIntake.key_contacts.map((c: any) => `- ${c.name} (${c.role}): ${c.email || 'No email'}`).join('\n')
    : 'No contacts configured.';
  const routine = rawIntake.weekly_routine
    ? Object.entries(rawIntake.weekly_routine).map(([k, v]) => `- ${k.replace(/_/g, ' ')}: ${v}`).join('\n')
    : 'No weekly routine configured.';
  const guardrails = Array.isArray(rawIntake.guardrails)
    ? rawIntake.guardrails.map((g: any) => `- ${g}`).join('\n')
    : 'No specific guardrails configured.';
  const milestones = Array.isArray(rawIntake.milestones)
    ? rawIntake.milestones.map((m: any) => `- ${m.title} (Target: ${m.date})`).join('\n')
    : 'No upcoming milestones configured.';
  const links = rawIntake.knowledge_links
    ? Object.entries(rawIntake.knowledge_links).map(([k, v]) => `- ${k.replace(/_/g, ' ')}: ${v}`).join('\n')
    : 'No external links configured.';

  // Fetch NWS brand context
  const { data: missions } = await serviceClient
    .from('nws_mission_entries')
    .select('*');

  const { data: cards } = await serviceClient
    .from('nws_brand_cards')
    .select('*');

  const nwsContextText = `
NWS BRAND MESSAGING & MISSION:
${(missions || []).map(m => `Version: ${m.version}\nBest Used For: ${m.best_for}\nMessage: ${m.message}`).join('\n---\n')}

NWS CORE BRAND VALUES:
${(cards || []).map(c => `Title: ${c.title}\nContent: ${c.content}`).join('\n---\n')}
`;

  // 3. Load history and find/create session
  let activeSessionId = session_id;
  let historyMessages: any[] = [];
  let isNewSession = false;

  if (!activeSessionId) {
    // Autogenerate a session
    const title = message.substring(0, 40) + (message.length > 40 ? '...' : '');
    const { data: newSession, error: sErr } = await serviceClient
      .from('hermes_sessions')
      .insert({ title })
      .select()
      .single();
    if (sErr) {
      return NextResponse.json({ success: false, error: sErr.message }, { status: 500 });
    }
    activeSessionId = newSession.id;
    isNewSession = true;
  } else {
    // Load last 12 historical messages
    const { data: history } = await serviceClient
      .from('hermes_messages')
      .select('*')
      .eq('session_id', activeSessionId)
      .order('created_at', { ascending: false })
      .limit(12);
    // Reverse to keep chronological order (ascending)
    historyMessages = (history || []).reverse();
  }

  // 4. Session Summary Logic
  let sessionSummary = '';
  if (activeSessionId && !isNewSession) {
    try {
      // 1) Get existing summary
      const { data: sessionData, error: sessionSelectErr } = await serviceClient
        .from('hermes_sessions')
        .select('summary')
        .eq('id', activeSessionId)
        .maybeSingle();
      if (sessionSelectErr) {
        console.warn('[Hermes API] hermes_sessions.summary select failed (column might not exist):', sessionSelectErr.message);
      } else if (sessionData) {
        sessionSummary = sessionData.summary || '';
      }

      // 2) Count total messages
      const { count } = await serviceClient
        .from('hermes_messages')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', activeSessionId);
      
      const totalMessagesCount = count || 0;

      // 3) If total > 12, check for any unsummarized older messages
      if (totalMessagesCount > 12) {
        const oldestLoadedCreatedAt = historyMessages[0]?.created_at;
        if (oldestLoadedCreatedAt) {
          const { data: unsummarized, error: unsummarizedErr } = await serviceClient
            .from('hermes_messages')
            .select('*')
            .eq('session_id', activeSessionId)
            .lt('created_at', oldestLoadedCreatedAt)
            .eq('summarized', false)
            .order('created_at', { ascending: true });

          if (unsummarizedErr) {
            console.warn('[Hermes API] Failed to select unsummarized messages (summarized column might not exist):', unsummarizedErr.message);
          } else if (unsummarized && unsummarized.length > 0) {
            const formattedOlder = unsummarized
              .map(m => `${m.role === 'user' ? 'User' : 'Hermes'}: ${m.content}`)
              .join('\n\n');

            let promptContent = '';
            if (sessionSummary) {
              promptContent = `Update the following conversation summary to incorporate these new messages. Provide a highly concise summary of key decisions, facts, and context discussed, so it can serve as background for future messages. Keep the updated summary under 250 words.

Existing Summary:
${sessionSummary}

New messages to add:
${formattedOlder}`;
            } else {
              promptContent = `Summarize the following chat history. Provide a highly concise summary of key decisions, facts, and context discussed, so it can serve as background for future messages. Keep the summary under 250 words.

Chat History:
${formattedOlder}`;
            }

            // Generate summary using Qwen (cheap)
            const summaryResult = await anthropic.messages.create({
              model: 'qwen/qwen3.7-max',
              messages: [
                {
                  role: 'user',
                  content: promptContent
                }
              ],
              max_tokens: 500
            });

            const newSummaryText = summaryResult.content?.[0]?.text || '';
            if (newSummaryText) {
              sessionSummary = newSummaryText;
              // Save summary to hermes_sessions
              await serviceClient
                .from('hermes_sessions')
                .update({ summary: sessionSummary })
                .eq('id', activeSessionId);
            }

            // Mark the messages as summarized in the DB
            const unsummarizedIds = unsummarized.map(m => m.id);
            if (unsummarizedIds.length > 0) {
              await serviceClient
                .from('hermes_messages')
                .update({ summarized: true })
                .in('id', unsummarizedIds);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('[Hermes API] Session Summary execution error:', err.message);
    }
  }

  // 5. Fetch recent shared context from the Unified Brain
  let brainContext = '';
  try {
    brainContext = await brainContextString(undefined, 15);
  } catch (brainErr: any) {
    console.error('[Hermes API] Failed to fetch brain context string:', brainErr.message);
  }

  // 6. Build system prompt
  const systemPrompt = `You are Hermes, the AI Chief of Staff for ${context.full_name} at ${context.business_name}.

${nwsContextText}

BUSINESS CONTEXT:
${context.business_description}

ACTIVE PROJECTS:
${activeProjectsBullets}

CURRENT PRIORITIES:
${currentPrioritiesBullets}

CONNECTED SYSTEMS:
${connectedSystemsBullets}

KEY CONTACTS & TEAM:
${contacts}

WEEKLY ROUTINE:
${routine}

OPERATIONAL GUARDRAILS:
${guardrails}

UPCOMING MILESTONES:
${milestones}

EXTERNAL KNOWLEDGE LINKS:
${links}

COMMUNICATION STYLE: ${context.communication_style}

RECENT JOURNAL:
${recentJournalList}

${brainContext}

${sessionSummary ? `CONVERSATION SUMMARY (Older messages):\n${sessionSummary}\n` : ''}
YOUR ROLE:
- You are Ronald's primary AI interface for running his business
- You know his full context and speak to him accordingly — no generic answers
- For tasks that are destructive or irreversible (pushing code, sending emails, 
  deleting records, writing files), respond with a JSON block:
  [APPROVAL_REQUIRED]
  { "title": "...", "description": "...", "action_type": "...", "payload": {} }
  [/APPROVAL_REQUIRED]
  Do NOT proceed until you receive approval confirmation in the next message.
- For tasks that require background execution, research on a web page, directory scanning, code creation, file operations, web searches, or multi-step agent actions, respond with a JSON block:
  [DISPATCH_TASK]
  { "objective": "the precise background task objective to run" }
  [/DISPATCH_TASK]
  Do NOT proceed or run the task yourself. Just yield this block.
- For research, analysis, planning, and boardroom dispatch: proceed directly.`;

  const messages: MessageParam[] = historyMessages.map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content
  }));

  messages.push({ role: 'user', content: message });

  // 1. Model Selection
  const modelToUse = 'qwen/qwen3.7-max';

  // 2. Brief Mode check
  const isBrief = message.toLowerCase().includes('brief');
  const maxTokensToUse = isBrief ? 800 : MAX_TOKENS;
  const systemPromptToUse = isBrief 
    ? `${systemPrompt}\n\n[INSTRUCTION] Please respond very concisely and briefly.` 
    : systemPrompt;

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const write = (data: string) => writer.write(encoder.encode(data));

  (async () => {
    try {
      write(encode({ type: 'session_init', sessionId: activeSessionId }));

      // Stream call to Anthropic API (duck-typed OpenRouter wrapper)
      const anthropicStream = await anthropic.messages.create({
        model: modelToUse,
        max_tokens: maxTokensToUse,
        system: systemPromptToUse,
        messages,
        stream: true
      }) as any;

      let fullResponse = '';

      for await (const event of anthropicStream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const text = event.delta.text;
          fullResponse += text;
          write(encode({ type: 'text', text }));
        }
      }

      // Save user message to database
      await serviceClient.from('hermes_messages').insert({
        session_id: activeSessionId,
        role: 'user',
        content: message
      });

      // Save assistant response to database
      await serviceClient.from('hermes_messages').insert({
        session_id: activeSessionId,
        role: 'hermes',
        content: fullResponse
      });

      // Parse for approvals in response
      const match = fullResponse.match(/\[APPROVAL_REQUIRED\]\s*(\{[\s\S]*?\})\s*\[\/APPROVAL_REQUIRED\]/);
      if (match) {
        try {
          const approvalData = JSON.parse(match[1].trim());
          const { title, description, action_type, payload } = approvalData;
          
          await serviceClient.from('hermes_approvals').insert({
            title: title || 'Approval Required',
            description: description || '',
            action_type: action_type || 'unknown',
            payload: payload || {},
            agent: 'hermes',
            session_id: activeSessionId,
            status: 'pending'
          });

          write(encode({ type: 'approval_created', title }));
        } catch (jsonErr) {
          console.error('[Hermes API] Failed to parse approval JSON:', jsonErr);
        }
      }

      // Parse for background task dispatches
      const dispatchMatch = fullResponse.match(/\[DISPATCH_TASK\]\s*(\{[\s\S]*?\})\s*\[\/DISPATCH_TASK\]/);
      if (dispatchMatch) {
        try {
          const dispatchData = JSON.parse(dispatchMatch[1].trim());
          const { objective } = dispatchData;
          if (objective) {
            const route = routeTask(objective);
            const { data: task, error: taskErr } = await serviceClient
              .from('agent_tasks')
              .insert({
                objective,
                assigned_to: route.assignedTo,
                model_tier: route.modelTier,
                status: 'queued',
                project: 'Novelty Web Solutions',
                priority: 2,
                definition_of_done: 'Dispatched from chat'
              })
              .select()
              .single();

            if (taskErr) {
              console.error('[Hermes API] Failed to insert agent task:', taskErr);
            } else if (task) {
              // Trigger task execution in the background (fire-and-forget)
              runTask(task.id).catch(err => {
                console.error(`[Hermes API] Background runTask error for ${task.id}:`, err);
              });
              write(encode({ type: 'task_dispatched', taskId: task.id, assignedTo: route.assignedTo }));
            }
          }
        } catch (jsonErr) {
          console.error('[Hermes API] Failed to parse dispatch JSON:', jsonErr);
        }
      }

      write(encode({ type: 'done' }));
    } catch (err: any) {
      console.error('[Hermes API] Streaming error:', err);
      write(encode({ type: 'error', error: err.message }));
    } finally {
      writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive'
    }
  });
}
