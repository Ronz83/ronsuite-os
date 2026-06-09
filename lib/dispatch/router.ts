// lib/dispatch/router.ts — Decides WHO + WHICH MODEL gets a task
export interface DispatchDecision {
  assignedTo: string;
  modelTier: 'cheap' | 'premium';
  reason: string;
}

export function routeTask(objective: string, taskType?: string): DispatchDecision {
  // By ROLE (lane)
  const o = objective.toLowerCase();
  let assignedTo = 'Qwen'; // default executor

  if (/architect|schema|migration|core wiring|security/i.test(o)) {
    assignedTo = 'Claude Code'; // Architecture
  } else if (/build|implement|fix|code|handler|endpoint/i.test(o)) {
    assignedTo = 'Codex'; // Engineering
  } else if (/design|copy|creative|brand|funnel|page|visual/i.test(o)) {
    assignedTo = 'Antigravity'; // Creative
  } else {
    assignedTo = 'Qwen'; // Default executor (read/gather/summarize/data)
  }

  // By MODEL TIER (think premium, build cheap)
  const premium = /architect|schema|security|verify|strategy|high-stakes|copy|positioning/i.test(o);
  const toolHeavy = /read|file|directory|search|scrape|gather|fetch|crawl|multi-step/.test(o);
  const modelTier = (premium || toolHeavy) ? 'premium' : 'cheap';

  return { 
    assignedTo, 
    modelTier, 
    reason: `Routed by lane+stakes check: Assigned to ${assignedTo} on ${modelTier} tier.` 
  };
}
