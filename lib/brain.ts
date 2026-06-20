import { anthropic } from './anthropic';
import { createServiceClient } from './supabase/service';
import { brainContextString } from './brain/unified';

function parseJSON(text: string) {
  const clean = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch (e) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw e;
  }
}

export async function extractAndSaveMemory(userMsg: string, agentResponse: string) {
  const serviceClient = createServiceClient();
  try {
    const prompt = `Review this conversation exchange. Has the user assigned a task, and has the agent just completed it? 
If a task was assigned and completed, extract the most important macro-level facts, strategic decisions, or global results worth adding to the permanent organizational brain. (Ignore micro-level routine chatter; focus on high-level lessons and architecture).

If yes, respond with JSON only:
{
  "save": true,
  "title": "short title for the memory entry",
  "summary": "a slightly longer summary of what was completed",
  "content": "the core fact, decision, or result to remember, written as a clear standalone sentence",
  "project_slug": "caricom-business | ticketflows | nws | ronsuite-os | null if global",
  "wiki_file": "the most relevant Obsidian wiki file path e.g. wiki/ronsuite_os.md or wiki/workspace_setup.md"
}

If no macro-level task was completed, respond with JSON only:
{ "save": false }

Exchange:
User: ${userMsg}
Agent: ${agentResponse}`;

    console.log("[Auto-Memory] Invoking Claude Haiku for classification...");
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = res.content[0]?.type === 'text' ? res.content[0].text : '';
    if (!text) {
      console.warn("[Auto-Memory] Empty response from Claude Haiku");
      return;
    }

    const json = parseJSON(text);

    if (json.save === true) {
      console.log("[Auto-Memory] Claude Haiku classified exchange as worthy of saving:", json);
      let projectId = null;
      if (json.project_slug) {
        const { data: proj } = await serviceClient
          .from('projects')
          .select('id')
          .eq('slug', json.project_slug)
          .maybeSingle();
        if (proj) projectId = proj.id;
      }

      // Generate embedding dynamically
      const { generateEmbedding } = await import('./embeddings');
      const embedding = await generateEmbedding(`${json.title} ${json.summary} ${json.content}`);

      // Insert into brain_entries table
      const { error: memoryError } = await serviceClient
        .from('brain_entries')
        .insert({
          agent: 'system',
          entry_type: 'decision',
          title: json.title,
          summary: json.summary || json.content,
          detail: { content: json.content },
          project: json.project_slug || 'global',
          source: 'agent',
          embedding: embedding
        });

      if (memoryError) {
        console.error("[Auto-Memory] Error inserting memory into brain_entries:", memoryError);
      } else {
        console.log("[Auto-Memory] Memory entry created successfully in brain_entries");
      }

      // Insert into brain_queue table for Obsidian sync
      const { error: queueError } = await serviceClient
        .from('brain_queue')
        .insert({
          content: json.content,
          wiki_file: json.wiki_file || 'wiki/misc.md',
          status: 'pending'
        });

      if (queueError) {
        console.error("[Auto-Memory] Error inserting brain_queue:", queueError);
      } else {
        console.log("[Auto-Memory] Brain queue entry created successfully for Obsidian");
      }
    } else {
      console.log("[Auto-Memory] Exchange classified as not worthy of saving (no task completed)");
    }
  } catch (err) {
    console.error("[Auto-Memory] Error in memory extraction pipeline:", err);
  }
}

export async function makeSystemPromptDynamic(prompt: string, serviceClient: any) {
  try {
    const { data: dbProjects } = await serviceClient
      .from('projects')
      .select('name, slug, description')
      .order('name', { ascending: true });

    const projectsBlock = dbProjects
      ? dbProjects.map((p: any) => `- ${p.name} (${p.slug}): ${p.description || 'No description'}`).join('\n')
      : '';
    const replacement = `Ronald's current projects:\n${projectsBlock}`;

    // Pattern 1: Ronald's active projects:\n- ... (with bullet points)
    let updated = prompt.replace(/Ronald's active projects:\s*(\n\s*-\s*.*)+/gi, replacement);
    
    // Pattern 2: His active projects:\n- ... (with bullet points)
    updated = updated.replace(/His active projects:\s*(\n\s*-\s*.*)+/gi, replacement);
    
    // Pattern 3: Ronald's projects: Caricom Business, ...
    // We match from "Ronald's projects:" to the end of sentence (e.g. up to a period)
    updated = updated.replace(/Ronald's projects:[^.]+\./gi, replacement + ".");
    
    // Dynamically append active registered skills
    const { data: dbSkills } = await serviceClient
      .from('skills')
      .select('name, description, trigger_phrases')
      .eq('status', 'active');

    if (dbSkills && dbSkills.length > 0) {
      const skillsBlock = `\n\nRegistered Autonomous Skills:\nYou have access to the following pre-built registered skills. When Ronald asks you to perform one of these actions, call the run_registered_skill tool passing the matched prompt and necessary input parameters:\n` +
        dbSkills.map((s: any) => `- **${s.name}**: ${s.description} (Triggers: ${s.trigger_phrases.map((tp: string) => `"${tp}"`).join(', ')})`).join('\n');
      updated += skillsBlock;
    }

    // Append unified brain shared context (capped for prompt-size/cost control)
    try {
      const contextStr = await brainContextString(undefined, 12);
      updated += `\n\n${contextStr}`;
    } catch (e) {
      console.error("⚠️ UNIFIED BRAIN READ FAILED — agents running without shared context:", e);
    }

    // Enforce Fable Architecture Macro-Scale Rules for all Boardroom agents
    updated += `\n\n[CORE FABLE BEHAVIORAL RULES]
You are operating within the Fable macro-scale architecture. You MUST strictly adhere to the following rules:
1. PRE-PLAN: Deep, thorough planning is expected before execution.
2. LEAD WITH OUTCOMES: Answer "what happened" first. Details and reasoning follow.
3. GROUND CLAIMS: Only report what you have explicitly verified.
4. STOP ONLY AT BOUNDARIES: Do not stall for permission unless it is a destructive/irreversible action.
5. MATCH EFFORT: Move fast on routine tasks; use deep reasoning for complex tasks.
6. PARALLELIZE BY DEFAULT: If tasks are independent, execute them concurrently.
7. ARRIVE PRE-PLANNED: Never surface an open question without a proposed hypothesis.`;

    return updated;
  } catch (err) {
    console.error("Error making system prompt dynamic:", err);
    return prompt;
  }
}

