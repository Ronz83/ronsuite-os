import { createServiceClient } from '../supabase/service';
import { logToBrain, brainContextString } from '../brain/unified';
import { sendNotificationToAll } from '../push';
import { anthropic } from '../anthropic';
import { qwen } from '../qwen';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface TaskTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

// Tool definitions for the dispatched agent (OpenAI / Anthropic formats)
export const executorTools: TaskTool[] = [
  {
    name: 'web_search',
    description: 'Perform a web search using Brave Search to find facts or documentation.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query string' }
      },
      required: ['query']
    }
  },
  {
    name: 'list_local_dir',
    description: 'List files and subdirectories under C:\\Users\\Ronald to inspect workspaces.',
    input_schema: {
      type: 'object',
      properties: {
        dir_path: { type: 'string', description: 'Absolute path to the directory (e.g. C:\\Users\\Ronald\\projects)' }
      },
      required: ['dir_path']
    }
  },
  {
    name: 'read_local_file',
    description: 'Read the text content of a file under C:\\Users\\Ronald.',
    input_schema: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Absolute path to the file' }
      },
      required: ['file_path']
    }
  },
  {
    name: 'add_memory_record',
    description: 'Save a key learning or note to the global memory graph.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title of the memory card' },
        content: { type: 'string', description: 'Detailed content to remember' },
        project_slug: { type: 'string', description: 'Optional project slug' }
      },
      required: ['title', 'content']
    }
  },
  // Tier 1 (Requires manual approval before executing)
  {
    name: 'write_local_file',
    description: 'TIER 1 (Stops for approval): Write content to a local file or create a file.',
    input_schema: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Absolute path to write to' },
        content: { type: 'string', description: 'The content to write' }
      },
      required: ['file_path', 'content']
    }
  },
  {
    name: 'run_command',
    description: 'TIER 1 (Stops for approval): Execute a shell command on the host.',
    input_schema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The terminal command line to run' }
      },
      required: ['command']
    }
  },
  {
    name: 'send_email',
    description: 'TIER 1 (Stops for approval): Send an email notification to clients.',
    input_schema: {
      type: 'object',
      properties: {
        recipient: { type: 'string', description: 'Email address of the recipient' },
        subject: { type: 'string', description: 'Subject of the email' },
        body: { type: 'string', description: 'Content of the email' }
      },
      required: ['recipient', 'subject', 'body']
    }
  },
  // Tier 2 (Strictly Prohibited — refuses execution and logs critical alert)
  {
    name: 'read_credential_store',
    description: 'TIER 2 (Prohibited): Read credentials or password vaults from Chrome or OneDrive.',
    input_schema: {
      type: 'object',
      properties: {
        store_name: { type: 'string', description: 'Credential source (e.g. chrome, onedrive)' }
      },
      required: ['store_name']
    }
  }
];

// ── TIER CLASSIFICATION — single source of truth. FAIL CLOSED. ──
// Any tool NOT explicitly listed defaults to Tier 2 (refuse).
const TOOL_TIERS: Record<string, 0 | 1 | 2> = {
  // Tier 0 — auto-execute (read-only / safe)
  web_search: 0,
  list_local_dir: 0,
  read_local_file: 0,
  add_memory_record: 0,
  // Tier 1 — pause for approval
  write_local_file: 1,
  run_command: 1,
  send_email: 1,
  // Tier 2 — refuse outright
  read_credential_store: 2,
};

function getTier(toolName: string): 0 | 1 | 2 {
  // UNKNOWN = highest restriction. Security fails CLOSED.
  return TOOL_TIERS[toolName] ?? 2;
}

// Human-readable summary of the EXACT action awaiting approval.
function summarizeToolInput(toolName: string, input: any): string {
  switch (toolName) {
    case 'run_command':     return `CMD: ${String(input?.command || input?.cmd || '').slice(0, 120)}`;
    case 'write_local_file':return `WRITE: ${input?.file_path || input?.path || input?.file || input?.filePath || ''}`;
    case 'send_email':      return `EMAIL → ${input?.recipient || input?.to || ''} | "${input?.subject || ''}"`;
    default:                return JSON.stringify(input || {}).slice(0, 120);
  }
}

// Credential/secret patterns — refused by ANY tool, regardless of tier.
// Enforces Tier 2 at the capability level, not just the named tool.
const CREDENTIAL_DENYLIST = [
  /passwords?\.csv/i,
  /credential/i,
  /\.env(\.|$)/i,
  /secrets?\b/i,
  /keychain/i,
  /vault/i,
  /id_rsa|\.pem|\.key\b/i,
  /onedrive[\\/].*password/i,
];

function violatesCredentialPolicy(text: string): boolean {
  return CREDENTIAL_DENYLIST.some(rx => rx.test(text));
}

async function callBridgeIfAvailable(action: string, input: any): Promise<{ success: boolean; result?: any; error?: string }> {
  const bridgeUrl = process.env.NEXT_PUBLIC_BRIDGE_URL;
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (bridgeUrl && isProduction) {
    try {
      console.log(`[Bridge Client] Routing ${action} to local bridge at ${bridgeUrl}`);
      const response = await fetch(`${bridgeUrl}/api/bridge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ action, input }),
      });
      
      if (!response.ok) {
        const errText = await response.text();
        return { success: false, error: `Bridge returned status ${response.status}: ${errText}` };
      }
      
      const data = await response.json();
      if (data.success) {
        return { success: true, result: data.result };
      } else {
        return { success: false, error: data.error };
      }
    } catch (e: any) {
      console.error(`[Bridge Client] Bridge call failed for ${action}:`, e.message);
      return { success: false, error: `Bridge connection failed: ${e.message}` };
    }
  }
  return { success: false, error: 'Bridge not configured or not running in production' };
}

// Helper to execute safe Tier 0 tool calls
async function executeTier0Tool(name: string, input: any): Promise<string> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  
  // Try bridge first for local filesystem operations
  if (name === 'list_local_dir' || name === 'read_local_file') {
    const bridgeRes = await callBridgeIfAvailable(name, input);
    if (bridgeRes.success) {
      return typeof bridgeRes.result === 'string' ? bridgeRes.result : JSON.stringify(bridgeRes.result);
    } else if (bridgeRes.error && !bridgeRes.error.includes('not configured')) {
      return `Bridge Error: ${bridgeRes.error}`;
    }
  }

  switch (name) {
    case 'web_search': {
      if (!apiKey) return 'Error: Brave Search API key missing.';
      const query = input?.query || input?.q;
      if (!query || typeof query !== 'string') {
        return 'Error: query is required and must be a string.';
      }
      const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}`, {
        headers: { 'X-Subscription-Token': apiKey, 'Accept': 'application/json' }
      });
      if (!res.ok) return `Search error: ${res.statusText}`;
      const data = await res.json();
      const results = data.web?.results?.map((item: any) => ({
        title: item.title, url: item.url, description: item.description
      })).slice(0, 3) || [];
      return JSON.stringify(results);
    }
    case 'list_local_dir': {
      const dirPath = input?.dir_path || input?.path || input?.dir;
      if (!dirPath || typeof dirPath !== 'string') {
        return 'Error: dir_path is required and must be a string.';
      }
      if (!dirPath.toLowerCase().startsWith('c:\\users\\ronald')) {
        return 'Access denied: Path must reside under C:\\Users\\Ronald';
      }
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      return JSON.stringify(files.map(f => ({ name: f.name, isDirectory: f.isDirectory() })));
    }
    case 'read_local_file': {
      const filePath = input?.file_path || input?.path || input?.file || input?.filePath;
      if (!filePath || typeof filePath !== 'string') {
        return 'Error: file_path is required and must be a string.';
      }
      if (!filePath.toLowerCase().startsWith('c:\\users\\ronald')) {
        return 'Access denied: File must reside under C:\\Users\\Ronald';
      }
      // TIER 2 capability enforcement — refuse credential stores even via Tier 0 read
      if (violatesCredentialPolicy(filePath)) {
        await logToBrain({
          agent: 'Dispatch Guardrails',
          entry_type: 'flag',
          project: undefined,
          title: 'Tier 2 capability block: credential file read attempt',
          summary: `read_local_file refused: "${filePath}" matches credential denylist.`,
          importance: 5,
          source: 'guardrail'
        });
        return 'REFUSED: Reading credential/secret files is prohibited (Tier 2).';
      }
      const content = await fs.readFile(filePath, 'utf8');
      return content.length > 5000 ? content.slice(0, 5000) + '\n... [TRUNCATED]' : content;
    }
    case 'add_memory_record': {
      const supabase = createServiceClient();
      let projectId: string | null = null;
      if (input?.project_slug) {
        const { data: proj } = await supabase.from('projects').select('id').eq('slug', input.project_slug).maybeSingle();
        if (proj) projectId = proj.id;
      }
      const { error } = await supabase.from('memory').insert({
        title: input?.title || '',
        content: input?.content || '',
        tags: ['dispatch'],
        project_id: projectId,
        source: 'agent'
      });
      if (error) return `Error saving memory: ${error.message}`;
      return 'Success: Memory recorded.';
    }
    default:
      return `Error: Unknown or unhandled Tier 0 tool "${name}".`;
  }
}

// Executes approved Tier 1 tool calls
async function executeTier1Tool(name: string, input: any): Promise<string> {
  // Try bridge first for local write/command operations
  if (name === 'write_local_file' || name === 'run_command') {
    const bridgeRes = await callBridgeIfAvailable(name, input);
    if (bridgeRes.success) {
      return typeof bridgeRes.result === 'string' ? bridgeRes.result : JSON.stringify(bridgeRes.result);
    } else if (bridgeRes.error && !bridgeRes.error.includes('not configured')) {
      return `Bridge Error: ${bridgeRes.error}`;
    }
  }

  switch (name) {
    case 'write_local_file': {
      const filePath = input?.file_path || input?.path || input?.file || input?.filePath;
      const content = input?.content || input?.text || '';
      if (!filePath || typeof filePath !== 'string') {
        return 'Error: file_path is required and must be a string.';
      }
      if (!filePath.toLowerCase().startsWith('c:\\users\\ronald')) {
        return 'Access denied: File must reside under C:\\Users\\Ronald';
      }
      await fs.writeFile(filePath, content, 'utf8');
      return 'Success: File written successfully.';
    }
    case 'run_command': {
      const command = input?.command || input?.cmd;
      if (!command || typeof command !== 'string') {
        return 'Error: command is required and must be a string.';
      }
      // Even an APPROVED command cannot be used to read credentials.
      if (violatesCredentialPolicy(command)) {
        await logToBrain({
          agent: 'Dispatch Guardrails',
          entry_type: 'flag',
          project: task.project,
          title: 'Tier 2 capability block: command touched credential store',
          summary: `run_command refused: "${command}" matches credential denylist.`,
          importance: 5,
          source: 'guardrail'
        });
        return 'REFUSED: Command targets credential/secret material (Tier 2 prohibited).';
      }
      const { stdout, stderr } = await execAsync(command);
      return JSON.stringify({ stdout, stderr });
    }
    case 'send_email': {
      const recipient = input?.recipient || input?.to;
      const subject = input?.subject || '';
      console.log(`[Email-Service] Simulating email to ${recipient}: Subject: ${subject}`);
      return `Success: Simulated email transmission to ${recipient}.`;
    }
    default:
      return `Error: Unhandled Tier 1 tool "${name}".`;
  }
}

export async function runTask(taskId: string, executeApprovedCall = false) {
  console.log(`[Executor] runTask starting for ${taskId}. executeApprovedCall = ${executeApprovedCall}`);
  const supabase = createServiceClient();

  // 1. Load the task details
  const { data: task, error: fetchErr } = await supabase
    .from('agent_tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (fetchErr || !task) {
    console.error(`[Executor] Task ${taskId} not found:`, fetchErr);
    return;
  }

  // If already complete or blocked, exit
  if (task.status === 'complete' || task.status === 'blocked' || task.status === 'failed') {
    return;
  }

  // 2. Handle resuming after user approval
  if (executeApprovedCall && task.status === 'awaiting_approval' && task.approval_gate) {
    try {
      console.log(`[Executor] Running approved Tier 1 action for task ${taskId}`);
      
      // Update status back to running
      await supabase.from('agent_tasks').update({ status: 'running', approval_gate: null }).eq('id', taskId);
      
      const { toolName, toolInput, previousMessages } = task.approval_gate as any;
      const resultText = await executeTier1Tool(toolName, toolInput);
      
      // Resume the LLM loop with the tool result appended
      const messages = [...(previousMessages || [])];
      
      if (task.model_tier === 'premium') {
        messages.push({
          role: 'tool',
          tool_call_id: task.approval_gate.toolUseId,
          name: task.approval_gate.toolName,
          content: resultText
        });
        await runClaudeLoop(taskId, task, messages);
      } else {
        messages.push({
          role: 'user',
          content: `Tool result for "${toolName}": ${resultText}`
        });
        await runQwenLoop(taskId, task, messages);
      }
      return;
    } catch (e: any) {
      await supabase.from('agent_tasks').update({ status: 'failed', result: { error: e.message } }).eq('id', taskId);
      return;
    }
  }

  // Set task to running
  console.log(`[Executor] Updating status to running in DB...`);
  await supabase.from('agent_tasks').update({ status: 'running' }).eq('id', taskId);
  console.log(`[Executor] Calling loop...`);

  // 3. Assemble prompt context
  const brainContext = await brainContextString(task.project || undefined, 12);
  const systemPrompt = `You are the AI Agent "${task.assigned_to}" executing a structured workflow.
Objective: ${task.objective}
Definition of Done: ${task.definition_of_done || 'Perform the requested objective.'}

[UNIFIED BRAIN CONTEXT]
Use this shared timeline of decisions/builds to align your execution:
${brainContext}

You have access to tools. If you need to perform an action, call the corresponding tool.
Tier 1 tools require explicit human approval and will pause your loop.
Tier 2 tools are strictly prohibited.`;

  const initialMessages = [{ role: 'user', content: task.objective }];

  if (task.model_tier === 'premium') {
    await runClaudeLoop(taskId, task, initialMessages, systemPrompt);
  } else {
    await runQwenLoop(taskId, task, initialMessages, systemPrompt);
  }
}

// ---------------- CLAUDE PREMIUM LOOP ----------------
async function runClaudeLoop(taskId: string, task: any, messages: any[], systemPrompt?: string) {
  const supabase = createServiceClient();
  let continueLoop = true;
  let loops = 0;

  // Adapt messages array for OpenAI/OpenRouter (handle systemPrompt)
  let openAiMessages = [...messages];
  if (systemPrompt) {
    openAiMessages = [{ role: 'system' as const, content: systemPrompt }, ...openAiMessages];
  }

  // Format tools to OpenAI standard
  const openRouterTools = executorTools.map(t => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema
    }
  }));

  try {
    while (continueLoop && loops < 8) {
      loops++;
      console.log(`[ClaudeLoop] Loop iteration ${loops}. Calling OpenRouter API...`);

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://ronsuite-os.local',
          'X-Title': 'RonSuite OS'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-sonnet-4.6',
          messages: openAiMessages,
          tools: openRouterTools,
          max_tokens: 4000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`OpenRouter API error ${response.status}: ${text}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const responseMessage = choice?.message;
      if (!responseMessage) throw new Error('Empty response from OpenRouter');

      // Append assistant's message to conversation state
      openAiMessages.push(responseMessage);

      // Keep task.previousMessages updated with current OpenAI format message history
      messages.length = 0;
      messages.push(...openAiMessages);

      const toolCalls = responseMessage.tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        const toolResults = [];
        for (const tc of toolCalls) {
          const toolUseId = tc.id;
          const name = tc.function.name;
          let input: any = {};
          try {
            input = JSON.parse(tc.function.arguments || '{}');
          } catch {}

          const tier = getTier(name);

          // TIER 2 (or UNKNOWN) — refuse
          if (tier === 2) {
            await supabase.from('agent_tasks').update({
              status: 'blocked',
              result: { error: `Execution blocked: Tier 2 / unknown tool "${name}" refused.` }
            }).eq('id', taskId);

            await logToBrain({
              agent: 'Dispatch Guardrails',
              entry_type: 'flag',
              project: task.project,
              title: `Tier 2 Blocked: ${task.assigned_to} → ${name}`,
              summary: `Blocked task "${task.title}". Tool "${name}" is Tier 2 or unregistered. Input: ${JSON.stringify(input)}. Refused.`,
              importance: 5,
              source: 'guardrail'
            });

            await sendNotificationToAll(`Tier 2 Refused 🛑`, `Agent tried prohibited/unknown tool "${name}". Task blocked.`, '/tasks');
            return;
          }

          // TIER 1 — pause for approval
          if (tier === 1) {
            await supabase.from('agent_tasks').update({
              status: 'awaiting_approval',
              approval_gate: { toolUseId, toolName: name, toolInput: input, previousMessages: openAiMessages }
            }).eq('id', taskId);

            await sendNotificationToAll(
              `Approval Required ⚠️`,
              `${task.assigned_to} wants to run: ${name} — ${summarizeToolInput(name, input)}`,
              `/tasks`
            );
            return;
          }

          // TIER 0 — auto-execute
          console.log(`[ClaudeLoop] Executing Tier 0 tool: ${name}`);
          const resultText = await executeTier0Tool(name, input);
          console.log(`[ClaudeLoop] Tool result received.`);
          if (resultText.startsWith('REFUSED:')) {
            await supabase.from('agent_tasks').update({
              status: 'blocked',
              result: { error: resultText }
            }).eq('id', taskId);
            return;
          }
          toolResults.push({
            role: 'tool' as const,
            tool_call_id: toolUseId,
            name,
            content: resultText
          });
        }

        openAiMessages.push(...toolResults);
        messages.length = 0;
        messages.push(...openAiMessages);
      } else {
        // No tool calls: Completion reached
        const finalResponse = responseMessage.content || 'Task finished.';
        await completeTask(taskId, task, finalResponse);
        continueLoop = false;
      }
    }

    if (continueLoop) {
      console.log(`[ClaudeLoop] Max loops (8) reached without completion. Wrapping up task...`);
      const lastMessage = openAiMessages[openAiMessages.length - 1];
      const lastText = typeof lastMessage?.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage?.content || '');
      await completeTask(taskId, task, `Max loop limit reached. Last response:\n${lastText}`);
    }
  } catch (err: any) {
    console.error(`[ClaudeLoop] Error occurred:`, err);
    await supabase.from('agent_tasks').update({ status: 'failed', result: { error: err.message } }).eq('id', taskId);
  }
}

// ---------------- QWEN CHEAP LOOP ----------------
async function runQwenLoop(taskId: string, task: any, messages: any[], systemPrompt?: string) {
  const supabase = createServiceClient();
  let continueLoop = true;
  let loops = 0;

  try {
    const toolsFormatted = executorTools.map(t => {
      return `- Tool Name: ${t.name}
  Description: ${t.description}
  Parameters Schema: ${JSON.stringify(t.input_schema.properties, null, 2)}
`;
    }).join('\n');

    const enhancedSystemPrompt = `${systemPrompt || ''}

You have access to the following tools:
${toolsFormatted}

To call a tool, you MUST use one of the following formats:

Format 1 (Custom call_tool tag):
<call_tool name="TOOL_NAME">
{
  "arg1": "value1"
}
</call_tool>

Format 2 (Standard tool_call tag):
<tool_call>
{
  "name": "TOOL_NAME",
  "arguments": {
    "arg1": "value1"
  }
}
</tool_call>

Format 3 (Raw JSON object):
{
  "name": "TOOL_NAME",
  "arguments": {
    "arg1": "value1"
  }
}

Guidelines for calling tools:
1. Choose the format, call the tool, and stop your response immediately after the closing tag. Do not include any other text if you are calling a tool.
2. If the user asks you to perform an action (e.g. read/write files, run commands, send emails) you MUST call the corresponding tool from the list.
3. If the user asks you to use a tool that is not in the list, or to perform an action that you cannot do with the listed tools, you MUST still attempt to call it anyway using the format above (e.g. name="delete_all_records"). This allows the platform to verify capabilities and security.
4. If you do not need to call any tool, respond with normal text.`;

    const qwenMessages = enhancedSystemPrompt 
      ? [{ role: 'system' as const, content: enhancedSystemPrompt }, ...messages.map((m: any) => ({ role: m.role, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }))]
      : messages.map((m: any) => ({ role: m.role, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }));

    while (continueLoop && loops < 12) {
      loops++;
      console.log(`[QwenLoop] Loop iteration ${loops}. Calling Qwen API...`);
      const res = await qwen.createCompletion({
        model: 'qwen/qwen3.7-max',
        messages: qwenMessages as any,
        max_tokens: 2000
      });

      const responseText = res.content[0]?.text || '';
      messages.push({ role: 'assistant', content: responseText });
      qwenMessages.push({ role: 'assistant', content: responseText });

      // Support both <call_tool name="...">, standard <tool_call>, and raw JSON formats for Qwen
      let toolName = '';
      let toolInput: any = {};
      let isToolCall = false;

      const tagMatch = responseText.match(/<(call_tool|tool_call)(?:\s+name="([^"]+)")?>([\s\S]*?)<\/(call_tool|tool_call)>/);

      if (tagMatch) {
        const attrName = tagMatch[2];
        const innerContent = tagMatch[3].trim();
        try {
          const parsed = JSON.parse(innerContent);
          if (attrName) {
            toolName = attrName;
            toolInput = parsed;
          } else {
            toolName = parsed.name || '';
            toolInput = parsed.arguments || parsed.input || parsed;
          }
          isToolCall = !!toolName;
        } catch (e) {
          console.warn('[QwenLoop] Tool tag found but JSON parsing failed:', e);
        }
      } else if (responseText.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(responseText.trim());
          if (parsed.name) {
            toolName = parsed.name;
            toolInput = parsed.arguments || parsed.input || {};
            isToolCall = true;
          }
        } catch {}
      }

      if (isToolCall && toolName) {
        console.log(`[QwenLoop] Detected tool call: ${toolName}`);
        const tier = getTier(toolName);

        // TIER 2 Check
        if (tier === 2) {
          await supabase.from('agent_tasks').update({ 
            status: 'blocked', 
            result: { error: `Execution blocked: Tier 2 / unknown tool "${toolName}" refused.` } 
          }).eq('id', taskId);
          
          await logToBrain({
            agent: 'Dispatch Guardrails',
            entry_type: 'flag',
            project: task.project,
            title: `Tier 2 Blocked: Qwen → ${toolName}`,
            summary: `Blocked task "${task.title}". Agent attempted to call Tier 2 or unknown tool "${toolName}". Refused access.`,
            importance: 5,
            source: 'guardrail'
          });

          await sendNotificationToAll(`Tier 2 Refused 🛑`, `Agent tried prohibited/unknown tool "${toolName}". Task blocked.`, '/tasks');
          return;
        }

        // TIER 1 Check
        if (tier === 1) {
          await supabase.from('agent_tasks').update({
            status: 'awaiting_approval',
            approval_gate: { toolName, toolInput, previousMessages: messages }
          }).eq('id', taskId);

          await sendNotificationToAll(
            `Approval Required ⚠️`, 
            `${task.assigned_to} wants to run: ${toolName} — ${summarizeToolInput(toolName, toolInput)}`,
            `/tasks`
          );
          return;
        }

        // TIER 0 Auto-execute
        console.log(`[QwenLoop] Executing Tier 0 tool: ${toolName}`);
        const resultText = await executeTier0Tool(toolName, toolInput);
        console.log(`[QwenLoop] Tool result received.`);
        if (resultText.startsWith('REFUSED:')) {
          await supabase.from('agent_tasks').update({
            status: 'blocked',
            result: { error: resultText }
          }).eq('id', taskId);
          return;
        }
        messages.push({ role: 'user', content: `Tool result for "${toolName}": ${resultText}` });
        qwenMessages.push({ role: 'user', content: `Tool result for "${toolName}": ${resultText}` });
      } else {
        await completeTask(taskId, task, responseText);
        continueLoop = false;
      }
    }
    if (continueLoop) {
      console.log(`[QwenLoop] Max loops (12) reached without completion. Wrapping up task...`);
      const lastMessage = messages[messages.length - 1];
      const lastText = typeof lastMessage?.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage?.content || '');
      await completeTask(taskId, task, `Max loop limit reached. Last response:\n${lastText}`);
    }
  } catch (err: any) {
    console.error(`[QwenLoop] Error occurred:`, err);
    await supabase.from('agent_tasks').update({ status: 'failed', result: { error: err.message } }).eq('id', taskId);
  }
}

// Helper to complete task and log to brain
async function completeTask(taskId: string, task: any, outputText: string) {
  const supabase = createServiceClient();
  
  await supabase.from('agent_tasks').update({
    status: 'complete',
    result: { output: outputText }
  }).eq('id', taskId);

  await logToBrain({
    agent: task.assigned_to,
    entry_type: 'build',
    project: task.project || null,
    title: `Task Completed: ${task.objective.substring(0, 50)}...`,
    summary: outputText.length > 500 ? outputText.slice(0, 500) + '...' : outputText,
    importance: task.priority || 3,
    source: 'dispatch'
  });

  await sendNotificationToAll(`Task Complete 🎉`, `Task completed by ${task.assigned_to}.`, `/tasks`);
}
