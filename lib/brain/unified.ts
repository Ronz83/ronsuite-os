import { createServiceClient } from '@/lib/supabase/service';

export interface BrainEntry {
  agent: string;
  entry_type: 'decision' | 'build' | 'status' | 'flag' | 'strategy' | 'note';
  project?: string;
  title: string;
  summary: string;
  detail?: Record<string, unknown>;
  source?: string;
  related_ids?: Record<string, unknown>;
  importance?: number;
}

/** READ — agent hydrates shared context on startup */
export async function loadBrain(opts: { project?: string; since?: string; limit?: number } = {}) {
  const sb = createServiceClient();
  let q = sb.from('brain_entries').select('*');
  if (opts.project) q = q.eq('project', opts.project);
  if (opts.since)   q = q.gte('created_at', opts.since);
  q = q.order('importance', { ascending: false })
       .order('created_at', { ascending: false })
       .limit(opts.limit ?? 50);
  const { data, error } = await q;
  if (error) throw new Error(`loadBrain failed: ${error.message}`);
  return data;
}

/** WRITE — agent logs every meaningful action/decision */
export async function logToBrain(entry: BrainEntry) {
  const sb = createServiceClient();
  const { data, error } = await sb.from('brain_entries').insert({
    agent: entry.agent,
    entry_type: entry.entry_type,
    project: entry.project ?? null,
    title: entry.title,
    summary: entry.summary,
    detail: entry.detail ?? {},
    source: entry.source ?? 'session',
    related_ids: entry.related_ids ?? {},
    importance: entry.importance ?? 3,
  }).select().single();
  if (error) throw new Error(`logToBrain failed: ${error.message}`);
  return data;
}

/** Convenience: compact context string for injecting into agent system prompts */
export async function brainContextString(project?: string, limit = 20): Promise<string> {
  const entries = await loadBrain({ project, limit });
  if (!entries?.length) return 'UNIFIED BRAIN: (no entries yet)';
  return 'UNIFIED BRAIN — recent shared context:\n' +
    entries.map(e => `[${e.created_at.slice(0,10)}] (${e.agent}/${e.entry_type}) ${e.title}: ${e.summary}`).join('\n');
}
