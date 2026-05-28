import Anthropic from '@anthropic-ai/sdk';

export const plannerToolDefinitions: Anthropic.Tool[] = [
  {
    name: 'create_task',
    description: 'Create a task card on the operations board for a specific project',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_slug: {
          type: 'string',
          enum: ['caricom-business', 'ticketflows', 'nws', 'ronsuite-os'],
          description: 'Which project this task belongs to',
        },
        title: {
          type: 'string',
          description: 'Task title — clear and actionable, starts with a verb',
        },
        notes: {
          type: 'string',
          description: 'Optional context, constraints, or definition of done for this task',
        },
        priority: {
          type: 'number',
          description: '1 = high, 2 = medium, 3 = low',
        },
      },
      required: ['project_slug', 'title'],
    },
  },
  {
    name: 'update_task_status',
    description: 'Update the status of an existing task',
    input_schema: {
      type: 'object' as const,
      properties: {
        task_id: { type: 'string', description: 'UUID of the task to update' },
        status: {
          type: 'string',
          enum: ['queued', 'active', 'blocked', 'complete'],
        },
        notes: { type: 'string', description: 'Optional note about why status changed' },
      },
      required: ['task_id', 'status'],
    },
  },
  {
    name: 'list_tasks',
    description: 'Get the current task list for a project',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_slug: {
          type: 'string',
          enum: ['caricom-business', 'ticketflows', 'nws', 'ronsuite-os', 'all'],
        },
        status: {
          type: 'string',
          enum: ['queued', 'active', 'blocked', 'complete', 'all'],
        },
      },
      required: ['project_slug'],
    },
  },
];

export async function executeToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
  supabaseServiceClient: ReturnType<typeof import('../supabase/service').createServiceClient>
): Promise<string> {
  switch (toolName) {
    case 'create_task': {
      const { project_slug, title, notes, priority } = toolInput as {
        project_slug: string;
        title: string;
        notes?: string;
        priority?: number;
      };
      const { data: project } = await supabaseServiceClient
        .from('projects')
        .select('id')
        .eq('slug', project_slug)
        .single();
      if (!project) return JSON.stringify({ error: `Project '${project_slug}' not found` });
      const { data, error } = await supabaseServiceClient
        .from('tasks')
        .insert({
          project_id: project.id,
          title,
          notes: notes ?? null,
          priority: priority ?? 2,
          status: 'queued',
          created_by: 'agent',
        })
        .select()
        .single();
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ success: true, task_id: data.id, title: data.title });
    }
    case 'update_task_status': {
      const { task_id, status, notes } = toolInput as {
        task_id: string;
        status: string;
        notes?: string;
      };
      const updateData: Record<string, unknown> = { status };
      if (notes) updateData.notes = notes;
      if (status === 'complete') updateData.completed_at = new Date().toISOString();
      const { error } = await supabaseServiceClient
        .from('tasks')
        .update(updateData)
        .eq('id', task_id);
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ success: true, task_id, status });
    }
    case 'list_tasks': {
      const { project_slug, status } = toolInput as { project_slug: string; status?: string };
      let query = supabaseServiceClient
        .from('tasks')
        .select('id, title, status, priority, notes, created_at, projects(name, slug)')
        .order('created_at', { ascending: false });
      if (project_slug !== 'all') {
        const { data: project } = await supabaseServiceClient
          .from('projects')
          .select('id')
          .eq('slug', project_slug)
          .single();
        if (project) query = query.eq('project_id', project.id);
      }
      if (status && status !== 'all') query = query.eq('status', status);
      const { data, error } = await query.limit(50);
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ tasks: data, count: data?.length ?? 0 });
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}
