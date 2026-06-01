import { anthropic } from './anthropic';
import { createServiceClient } from './supabase/service';

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
    const prompt = `Review this conversation exchange and decide if it contains something worth adding to permanent memory — a decision, a new tool, a project update, a preference, a blocker, or a priority shift. Routine status queries, test messages, and things already in memory do not qualify.

If yes, respond with JSON only:
{
  "save": true,
  "title": "short title for the memory entry",
  "content": "the fact or decision to remember, written as a clear standalone sentence",
  "tags": ["relevant", "tags"],
  "project_slug": "caricom-business | ticketflows | nws | ronsuite-os | null if global",
  "wiki_file": "the most relevant Obsidian wiki file path e.g. wiki/ronsuite_os.md or wiki/workspace_setup.md"
}

If no, respond with JSON only:
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

      // Insert into memory table
      const { error: memoryError } = await serviceClient
        .from('memory')
        .insert({
          title: json.title,
          content: json.content,
          tags: Array.isArray(json.tags) ? json.tags : [],
          project_id: projectId,
          source: 'agent'
        });

      if (memoryError) {
        console.error("[Auto-Memory] Error inserting memory:", memoryError);
      } else {
        console.log("[Auto-Memory] Memory entry created successfully");
      }

      // Insert into brain_queue table
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
        console.log("[Auto-Memory] Brain queue entry created successfully");
      }
    } else {
      console.log("[Auto-Memory] Exchange classified as not worthy of saving");
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

    return updated;
  } catch (err) {
    console.error("Error making system prompt dynamic:", err);
    return prompt;
  }
}

