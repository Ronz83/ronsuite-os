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
