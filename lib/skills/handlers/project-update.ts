import { anthropic } from '../../anthropic';
import { createServiceClient } from '../../supabase/service';

export async function projectUpdateHandler(inputs: Record<string, any>): Promise<{ briefing: string; meta: any }> {
  const { projectSlug, projectName, project } = inputs;
  const targetFilter = projectSlug || projectName || project;
  console.log(`[Project Update] Running project status briefing for: ${targetFilter || 'All Projects'}`);

  const supabase = createServiceClient();

  // 1. Fetch targeted or all projects
  let projectQuery = supabase.from('projects').select('*');
  if (targetFilter && targetFilter !== 'all') {
    if (targetFilter.length === 36 && targetFilter.includes('-')) {
      // Looks like a UUID
      projectQuery = projectQuery.eq('id', targetFilter);
    } else {
      // Try filtering by slug or name
      projectQuery = projectQuery.or(`slug.eq.${targetFilter},name.ilike.%${targetFilter}%`);
    }
  }

  const { data: projects, error: projErr } = await projectQuery;
  if (projErr) {
    console.warn('[Project Update] Error fetching projects:', projErr);
  }

  const projectIds = (projects || []).map(p => p.id);

  // 2. Fetch Tasks
  let tasksQuery = supabase.from('tasks').select('*');
  if (projectIds.length > 0 && targetFilter && targetFilter !== 'all') {
    tasksQuery = tasksQuery.in('project_id', projectIds);
  }
  const { data: tasks, error: tasksErr } = await tasksQuery.order('created_at', { ascending: false }).limit(50);
  if (tasksErr) {
    console.warn('[Project Update] Error fetching tasks:', tasksErr);
  }

  // 3. Fetch Goals
  let goalsQuery = supabase.from('goals').select('*');
  if (projectIds.length > 0 && targetFilter && targetFilter !== 'all') {
    goalsQuery = goalsQuery.in('project_id', projectIds);
  }
  const { data: goals, error: goalsErr } = await goalsQuery.order('created_at', { ascending: false }).limit(20);
  if (goalsErr) {
    console.warn('[Project Update] Error fetching goals:', goalsErr);
  }

  // 4. Fetch Journal Entries (recent ones)
  const { data: journals, error: journalsErr } = await supabase
    .from('journal_entries')
    .select('*')
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5);
  if (journalsErr) {
    console.warn('[Project Update] Error fetching journals:', journalsErr);
  }

  // 5. Assemble contextual markdown representation
  const projectsSection = (projects || []).map(p => `- **${p.name}** (${p.slug}): ${p.description || 'No description'} [Status: ${p.status || 'active'}]`).join('\n');
  const goalsSection = (goals || []).map(g => {
    const proj = (projects || []).find(p => p.id === g.project_id);
    const projName = proj ? proj.name : 'Unknown Project';
    return `- [${g.status}] **${g.title}** (${projName}) - Budget: ${g.turns_used}/${g.turn_budget} turns. Blocker: ${g.blocker || 'None'}`;
  }).join('\n') || 'No goals registered.';

  const tasksSection = (tasks || []).map(t => {
    const proj = (projects || []).find(p => p.id === t.project_id);
    const projName = proj ? proj.name : 'Unknown Project';
    return `- [${t.status}] **${t.title}** (${projName}) - Priority: ${t.priority}`;
  }).join('\n') || 'No tasks registered.';

  const journalsSection = (journals || []).map(j => `### Date: ${j.entry_date} (Tags: ${j.tags?.join(', ') || 'none'})\n${j.content}`).join('\n\n') || 'No recent journal entries.';

  // 6. Build briefing system prompt
  const systemPrompt = `You are Hermes, the AI Chief of Staff.
Your task is to synthesize a concise, high-level, actionable Chief of Staff status briefing for Ronald based on the active projects, goals, tasks, and recent journal updates.

Focus on:
1. Progress and updates for the requested scope (${targetFilter || 'All Projects'}).
2. Current active/completed metrics (e.g., number of queued vs. completed tasks/goals).
3. Critical blockers or decisions requiring user attention.
4. Concrete recommendations for the next action steps.

Here is the retrieved system data:

PROJECTS:
${projectsSection}

GOALS:
${goalsSection}

TASKS:
${tasksSection}

RECENT JOURNAL ENTRIES:
${journalsSection}

Rules:
- Keep the briefing professional, direct, and metric-oriented.
- Highlight any active blockers or off-budget runs.
- Do not include conversational greeting or signoff. Output clean, structured markdown.`;

  // Run briefing using the cheap/fast Claude Haiku model as requested
  const haikuModel = 'claude-3-5-haiku-20241022';
  
  const response = await anthropic.messages.create({
    model: haikuModel,
    max_tokens: 2500,
    messages: [
      { role: 'user', content: systemPrompt }
    ]
  });

  const briefing = response.content[0]?.type === 'text' ? response.content[0].text : '';

  return {
    briefing,
    meta: {
      targetScope: targetFilter || 'all',
      modelUsed: haikuModel,
      timestamp: new Date().toISOString(),
      projectCount: (projects || []).length,
      goalCount: (goals || []).length,
      taskCount: (tasks || []).length
    }
  };
}
