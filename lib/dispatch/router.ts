// lib/dispatch/router.ts — Routes tasks to the correct Expert + applies Role lens
// Architecture: Head Master → Role (lens) + Expert (domain owner) → Students (tools)

export type ExpertId = 'ghl' | 'design' | 'dev' | 'copy';
export type RoleId = 'engineer' | 'creative-director' | 'strategist' | 'copywriter' | 'operations';
export type ModelTier = 'flash' | 'mid' | 'premium';

export interface DispatchDecision {
  expert: ExpertId | null;     // Which Expert owns this domain
  role: RoleId;                // Which Role lens to apply
  modelTier: ModelTier;        // Which cost tier for the Expert's model
  reason: string;
}

// Determine which Expert owns the task domain
function resolveExpert(objective: string): ExpertId | null {
  const o = objective.toLowerCase();
  if (/ghl|crm|workflow|contact|sub.?account|oauth|location|webhook|nws crm|highlevel/i.test(o)) return 'ghl';
  if (/design|ui|ux|visual|brand|mockup|figma|stitch|layout|color|font|landing page|funnel/i.test(o)) return 'design';
  if (/build|implement|fix|code|handler|endpoint|api|schema|migration|architecture|bug/i.test(o)) return 'dev';
  if (/copy|write|headline|cta|email text|message|caption|blog|description|content/i.test(o)) return 'copy';
  return null; // Head Master handles directly
}

// Determine which Role lens to apply
function resolveRole(objective: string): RoleId {
  const o = objective.toLowerCase();
  if (/architect|schema|migration|core|security|performance|review|technical/i.test(o)) return 'engineer';
  if (/design|visual|brand|creative|look|feel|aesthetic|color|layout/i.test(o)) return 'creative-director';
  if (/strategy|positioning|funnel|conversion|roi|outcome|market/i.test(o)) return 'strategist';
  if (/copy|write|content|headline|email|message|hook/i.test(o)) return 'copywriter';
  if (/workflow|automate|process|sop|system|pipeline/i.test(o)) return 'operations';
  return 'engineer'; // default
}

// Determine model tier based on task stakes
function resolveModelTier(objective: string, expert: ExpertId | null): ModelTier {
  const o = objective.toLowerCase();
  // High stakes = premium
  if (/verify|security|strategy|architecture|review|high.?stakes|positioning/i.test(o)) return 'premium';
  // Retrieval/lookup = flash
  if (/fetch|read|list|search|find|lookup|gather|summarize/i.test(o)) return 'flash';
  // Default = mid
  return 'mid';
}

export function routeTask(objective: string): DispatchDecision {
  const expert = resolveExpert(objective);
  const role = resolveRole(objective);
  const modelTier = resolveModelTier(objective, expert);

  return {
    expert,
    role,
    modelTier,
    reason: `Expert: ${expert ?? 'head-master (direct)'} | Role: ${role} | Tier: ${modelTier}`
  };
}
