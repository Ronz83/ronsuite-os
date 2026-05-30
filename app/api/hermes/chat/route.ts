import { anthropic, MODEL, MAX_TOKENS } from '@/lib/anthropic';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { NextResponse } from 'next/server';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';

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

  // 2. Fetch last 5 journal entries
  const { data: journals } = await serviceClient
    .from('journal_entries')
    .select('*')
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5);

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

  // 3. Build system prompt
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

YOUR ROLE:
- You are Ronald's primary AI interface for running his business
- You know his full context and speak to him accordingly — no generic answers
- For tasks that are destructive or irreversible (pushing code, sending emails, 
  deleting records, writing files), respond with a JSON block:
  [APPROVAL_REQUIRED]
  { "title": "...", "description": "...", "action_type": "...", "payload": {} }
  [/APPROVAL_REQUIRED]
  Do NOT proceed until you receive approval confirmation in the next message.
- For research, analysis, planning, and boardroom dispatch: proceed directly.`;

  // 4. Load history and find/create session
  let activeSessionId = session_id;
  let historyMessages: any[] = [];

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
  } else {
    // Load historical messages
    const { data: history } = await serviceClient
      .from('hermes_messages')
      .select('*')
      .eq('session_id', activeSessionId)
      .order('created_at', { ascending: true });
    historyMessages = history || [];
  }

  const messages: MessageParam[] = historyMessages.map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content
  }));

  messages.push({ role: 'user', content: message });

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const write = (data: string) => writer.write(encoder.encode(data));

  (async () => {
    try {
      write(encode({ type: 'session_init', sessionId: activeSessionId }));

      // Stream call to Anthropic API
      const anthropicStream = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
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
