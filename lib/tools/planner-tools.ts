import Anthropic from '@anthropic-ai/sdk';
import { promises as fs } from 'fs';
import { matchPromptToSkill, validateSkillInput } from '../skills/registry';
import { executeSkill } from '../skills/executor';

export const plannerToolDefinitions: Anthropic.Tool[] = [
  {
    name: 'create_task',
    description: 'Create a task card on the operations board for a specific project',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_slug: {
          type: 'string',
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
          description: 'Which project this task belongs to, or "all"',
        },
        status: {
          type: 'string',
          enum: ['queued', 'active', 'blocked', 'complete', 'all'],
        },
      },
      required: ['project_slug'],
    },
  },
  {
    name: 'web_search',
    description: 'Perform a web search to find current information and facts',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search query to look up on the web',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'list_local_dir',
    description: 'List contents of a local directory under C:\\Users\\Ronald to inspect codebases or files',
    input_schema: {
      type: 'object' as const,
      properties: {
        dir_path: {
          type: 'string',
          description: 'Absolute path to the directory (e.g. "C:\\Users\\Ronald\\projects" or "C:\\Users\\Ronald\\.gemini\\antigravity\\memory\\wikis\\antigravity_master\\wiki")',
        },
      },
      required: ['dir_path'],
    },
  },
  {
    name: 'read_local_file',
    description: 'Read the text content of a local file under C:\\Users\\Ronald (e.g. source files, configs, markdown files)',
    input_schema: {
      type: 'object' as const,
      properties: {
        file_path: {
          type: 'string',
          description: 'Absolute path to the file (e.g. "C:\\Users\\Ronald\\projects\\ronsuite-os\\package.json")',
        },
      },
      required: ['file_path'],
    },
  },
  {
    name: 'add_memory_record',
    description: 'Save a key learning, project context, decision, or note to the global memory graph (the brain) so it can be retrieved in future sessions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'Descriptive title for this memory card (e.g. "Tailwind v4 Migration Optimization")',
        },
        content: {
          type: 'string',
          description: 'Detailed content, context, or rule to remember.',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional tags to categorize the memory (e.g. ["nws", "tailwind", "optimization"])',
        },
        project_slug: {
          type: 'string',
          description: 'Optional project this memory belongs to',
        },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'run_registered_skill',
    description: 'Triggers a registered, autonomous/generative skill matching the prompt. Matches trigger phrases and validates input arguments.',
    input_schema: {
      type: 'object' as const,
      properties: {
        prompt: {
          type: 'string',
          description: 'The natural language prompt/instruction that triggers the skill (e.g. "draft a proposal for AA Motors")'
        },
        inputs: {
          type: 'object',
          description: 'Key-value input parameters needed by the skill, matching its specific input schema (e.g. { "clientName": "AA Motors", "needsWebsite": true })'
        }
      },
      required: ['prompt', 'inputs']
    }
  }
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
      
      const { data: dbProjects } = await supabaseServiceClient
        .from('projects')
        .select('slug, id');
      
      const availableSlugs = dbProjects ? dbProjects.map(p => p.slug) : [];
      if (!availableSlugs.includes(project_slug)) {
        return JSON.stringify({ error: `Invalid project slug '${project_slug}'. Available projects: ${availableSlugs.join(', ')}` });
      }

      const project = dbProjects?.find(p => p.slug === project_slug);
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
      
      const { data: dbProjects } = await supabaseServiceClient
        .from('projects')
        .select('slug, id');
      
      const availableSlugs = dbProjects ? dbProjects.map(p => p.slug) : [];
      if (project_slug !== 'all' && !availableSlugs.includes(project_slug)) {
        return JSON.stringify({ error: `Invalid project slug '${project_slug}'. Available projects: ${availableSlugs.join(', ')}, all` });
      }

      let query = supabaseServiceClient
        .from('tasks')
        .select('id, title, status, priority, notes, created_at, projects(name, slug)')
        .order('created_at', { ascending: false });
      if (project_slug !== 'all') {
        const project = dbProjects?.find(p => p.slug === project_slug);
        if (project) query = query.eq('project_id', project.id);
      }
      if (status && status !== 'all') query = query.eq('status', status);
      const { data, error } = await query.limit(50);
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ tasks: data, count: data?.length ?? 0 });
    }
    case 'web_search': {
      const { query } = toolInput as { query: string };
      const apiKey = process.env.BRAVE_SEARCH_API_KEY;
      if (!apiKey) {
        return JSON.stringify({ error: 'Brave Search API key is not configured. Please add BRAVE_SEARCH_API_KEY to your env variables.' });
      }

      try {
        const response = await fetch(
          `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}`,
          {
            headers: {
              'Accept': 'application/json',
              'Accept-Encoding': 'gzip',
              'X-Subscription-Token': apiKey,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Brave API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const results = data.web?.results?.map((item: any) => ({
          title: item.title,
          url: item.url,
          description: item.description,
        })).slice(0, 5) || [];

        return JSON.stringify({ results, count: results.length });
      } catch (err: any) {
        return JSON.stringify({ error: `Search request failed: ${err.message}` });
      }
    }
    case 'list_local_dir': {
      const { dir_path } = toolInput as { dir_path: string };
      if (!dir_path.toLowerCase().startsWith('c:\\users\\ronald')) {
        return JSON.stringify({ error: 'Access denied: Directory must be under C:\\Users\\Ronald' });
      }
      try {
        const files = await fs.readdir(dir_path, { withFileTypes: true });
        const list = files.map(f => ({
          name: f.name,
          isDirectory: f.isDirectory(),
        }));
        return JSON.stringify({ path: dir_path, files: list, count: list.length });
      } catch (err: any) {
        return JSON.stringify({ error: `Failed to list directory: ${err.message}` });
      }
    }
    case 'read_local_file': {
      const { file_path } = toolInput as { file_path: string };
      if (!file_path.toLowerCase().startsWith('c:\\users\\ronald')) {
        return JSON.stringify({ error: 'Access denied: File must be under C:\\Users\\Ronald' });
      }
      try {
        const content = await fs.readFile(file_path, 'utf8');
        const truncated = content.length > 10000 ? content.slice(0, 10000) + '\n... [TRUNCATED]' : content;
        return JSON.stringify({ path: file_path, content: truncated, size: content.length });
      } catch (err: any) {
        return JSON.stringify({ error: `Failed to read file: ${err.message}` });
      }
    }
    case 'add_memory_record': {
      const { title, content, tags, project_slug } = toolInput as {
        title: string;
        content: string;
        tags?: string[];
        project_slug?: string;
      };
      
      try {
        let projectId: string | null = null;
        if (project_slug) {
          const { data: dbProjects } = await supabaseServiceClient
            .from('projects')
            .select('slug, id');
          const availableSlugs = dbProjects ? dbProjects.map(p => p.slug) : [];
          if (!availableSlugs.includes(project_slug)) {
            return JSON.stringify({ error: `Invalid project slug '${project_slug}'. Available projects: ${availableSlugs.join(', ')}` });
          }
          const project = dbProjects?.find(p => p.slug === project_slug);
          if (project) {
            projectId = project.id;
          }
        }

        const { data, error } = await supabaseServiceClient
          .from('memory')
          .insert({
            title: title.trim(),
            content: content.trim(),
            tags: tags || [],
            project_id: projectId,
            source: 'agent',
          })
          .select()
          .single();

        if (error) throw error;
        return JSON.stringify({ success: true, memory_id: data.id, title: data.title });
      } catch (err: any) {
        return JSON.stringify({ error: `Failed to save memory: ${err.message}` });
      }
    }
    case 'run_registered_skill': {
      const { prompt, inputs } = toolInput as { prompt: string; inputs: Record<string, any> };
      try {
        console.log(`[Tool Call] Matching prompt to skill: "${prompt}"`);
        const skill = await matchPromptToSkill(prompt);
        if (!skill) {
          return JSON.stringify({ error: `No registered skill matches the prompt: "${prompt}"` });
        }

        console.log(`[Tool Call] Matched skill: ${skill.name}. Validating inputs...`);
        const { valid, errors } = validateSkillInput(skill, inputs);
        if (!valid) {
          return JSON.stringify({ error: `Invalid inputs for skill ${skill.name}: ${errors.join(', ')}` });
        }

        console.log(`[Tool Call] Running skill: ${skill.name}...`);
        const result = await executeSkill(skill, inputs);
        return JSON.stringify(result);
      } catch (err: any) {
        return JSON.stringify({ error: `Skill execution failed: ${err.message}` });
      }
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}
