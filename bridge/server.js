const fs = require('fs');
const path = require('path');
const os = require('os');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { spawn } = require('child_process');

const fetch = globalThis.fetch || require('node-fetch');

// Load configuration from bridge/.env
const envPath = path.join(__dirname, '.env');
const env = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
  });
}

const RONSUITE_URL = env.RONSUITE_URL || 'https://ronsuite-os.vercel.app';
const OBSIDIAN_VAULT = env.OBSIDIAN_VAULT || 'C:\\Users\\Ronald\\.gemini\\antigravity\\memory\\wikis\\antigravity_master';

// Load Supabase key from Next.js root env file
const rootEnvPath = path.join(__dirname, '..', '.env.local');
let supabaseKey = '';
if (fs.existsSync(rootEnvPath)) {
  const content = fs.readFileSync(rootEnvPath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^SUPABASE_SERVICE_ROLE_KEY=(.*)$/);
    if (match) supabaseKey = match[1].trim();
  });
}

// Inject bridge env keys into process.env for CLI usage
if (env.OPENAI_API_KEY) process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
if (env.GEMINI_API_KEY) process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;

console.log(`[Bridge] Starting bridge...`);
console.log(`[Bridge] Target URL: ${RONSUITE_URL}`);
console.log(`[Bridge] Vault Path: ${OBSIDIAN_VAULT}`);

// Setup Express app
const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Methods', '*');
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', mode: 'bridge', timestamp: Date.now() });
});

app.get('/status', (req, res) => {
  res.json({ configuredCLIs: { codex: true, claude: true, antigravity: true } });
});

// Build a flattened single-line history context string safe for shell embedding
function buildHistoryContext(history, agentName) {
  if (!history || history.length === 0) return '';
  return history.slice(-5).map(turn => {
    const userMsg = (turn.user_message || '').replace(/["\n\r\\]/g, ' ').substring(0, 200);
    const agentResp = (turn.responses?.[agentName] || '(no response)').replace(/["\n\r\\]/g, ' ').substring(0, 400);
    return `User: ${userMsg} / You replied: ${agentResp}`;
  }).join(' | ');
}

// Codex: stream directly from OpenAI API (avoids TTY issues with codex CLI)
async function runCodex(ws, content, history) {
  const openaiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    ws.send(JSON.stringify({ type: 'error', agent: 'codex', message: 'No OpenAI API key configured in bridge/.env' }));
    return;
  }

  const historyMessages = (history || []).slice(-5).flatMap(turn => [
    { role: 'user', content: turn.user_message || '' },
    { role: 'assistant', content: turn.responses?.['Codex'] || '(no response)' }
  ]);

  const messages = [
    {
      role: 'system',
      content: 'You are Codex, the Engineering Lead in a multi-agent AI boardroom for Novelty Web Solutions. You bring strong technical depth, architecture expertise, and pragmatic implementation focus. Be direct and concise.'
    },
    ...historyMessages,
    { role: 'user', content }
  ];

  try {
    console.log(`[Bridge] Codex API call: ${content.substring(0, 80)}...`);
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model: 'gpt-4o', messages, stream: true })
    });

    if (!res.ok) {
      const errText = await res.text();
      ws.send(JSON.stringify({ type: 'error', agent: 'codex', message: `OpenAI API error ${res.status}: ${errText.substring(0, 200)}` }));
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') continue;
        try {
          const token = JSON.parse(raw).choices?.[0]?.delta?.content;
          if (token) ws.send(JSON.stringify({ type: 'text', agent: 'codex', text: token }));
        } catch {}
      }
    }

    ws.send(JSON.stringify({ type: 'agent_done', agent: 'codex', code: 0 }));
  } catch (err) {
    console.error('[Bridge] Codex error:', err);
    ws.send(JSON.stringify({ type: 'error', agent: 'codex', message: `Codex error: ${err.message}` }));
  }
}

// Run gemini or claude CLI via shell spawn with history context injected into prompt
function runCliAgent(ws, agentKey, command, content, history, agentDisplayName) {
  return new Promise((resolve) => {
    const ctx = buildHistoryContext(history, agentDisplayName);
    const rawPrompt = ctx
      ? `Context from prior turns: ${ctx}. Now answer this: ${content}`
      : content;

    // Escape for shell double-quote embedding: backslash then double-quote
    const escaped = rawPrompt
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, ' ')
      .replace(/\r/g, '');

    const cmdString = `${command} -p "${escaped}"`;
    const spawnEnv = { ...process.env, NO_COLOR: '1' };

    console.log(`[Bridge] Running: ${command} -p [${rawPrompt.length} chars]`);
    const child = spawn(cmdString, [], { shell: true, env: spawnEnv, cwd: os.homedir() });

    child.stdout.on('data', (chunk) => {
      ws.send(JSON.stringify({ type: 'text', agent: agentKey, text: chunk.toString() }));
    });

    child.stderr.on('data', (chunk) => {
      console.log(`[Bridge][${agentKey} stderr] ${chunk.toString().trim()}`);
    });

    child.on('close', (code) => {
      console.log(`[Bridge] ${command} exited with code ${code}`);
      ws.send(JSON.stringify({ type: 'agent_done', agent: agentKey, code }));
      resolve();
    });

    child.on('error', (err) => {
      console.error(`[Bridge] Failed to run ${command}:`, err);
      ws.send(JSON.stringify({ type: 'error', agent: agentKey, message: `${command} execution failed: ${err.message}` }));
      resolve();
    });
  });
}

// Setup HTTP and WebSocket server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('[Bridge] WS Client Connected');

  ws.on('message', async (messageString) => {
    try {
      const data = JSON.parse(messageString);
      if (data.type !== 'message') return;

      const { agent, content, history = [] } = data;

      if (agent === 'codex') {
        await runCodex(ws, content, history);
      } else if (agent === 'antigravity') {
        await runCliAgent(ws, 'antigravity', 'gemini', content, history, 'Antigravity');
      } else if (agent === 'claude') {
        await runCliAgent(ws, 'claude', 'claude', content, history, 'Claude Code');
      } else {
        ws.send(JSON.stringify({ type: 'error', agent, message: `Unknown agent: ${agent}` }));
      }
    } catch (err) {
      console.error('[Bridge] WS message error:', err);
    }
  });

  ws.on('close', () => {
    console.log('[Bridge] WS Client Disconnected');
  });
});

// Obsidian Sync Pipeline on Startup
async function syncObsidian() {
  console.log(`[Sync] Querying pending brain sync writes...`);
  try {
    const response = await fetch(`${RONSUITE_URL}/api/brain/flush`, {
      headers: { 'x-supabase-key': supabaseKey }
    });

    if (!response.ok) {
      console.error(`[Sync] Failed to fetch queue: ${response.status} ${response.statusText}`);
      return;
    }

    const resBody = await response.json();
    if (!resBody.success || !Array.isArray(resBody.queue)) {
      console.error(`[Sync] Invalid queue payload:`, resBody);
      return;
    }

    console.log(`[Sync] Found ${resBody.queue.length} pending writes.`);
    for (const item of resBody.queue) {
      try {
        const absolutePath = path.join(OBSIDIAN_VAULT, item.wiki_file);
        const dir = path.dirname(absolutePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const dateStr = new Date().toISOString().split('T')[0];
        const title = item.content.split('\n')[0].replace(/[#*`]/g, '').trim().substring(0, 50) || 'Memory Entry';
        const fileContent = `\n\n---\n## ${dateStr} — ${title}\n${item.content}`;

        fs.appendFileSync(absolutePath, fileContent, 'utf8');
        console.log(`[Sync] Appended update to ${absolutePath}`);

        const confirmRes = await fetch(`${RONSUITE_URL}/api/brain/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-supabase-key': supabaseKey },
          body: JSON.stringify({ id: item.id, status: 'flushed' })
        });

        if (confirmRes.ok) {
          console.log(`[Sync] Confirmed item ${item.id} flushed.`);
        } else {
          console.error(`[Sync] Confirmation failed for ${item.id}: status ${confirmRes.status}`);
        }
      } catch (writeErr) {
        console.error(`[Sync] Error syncing item ${item.id}:`, writeErr);
        await fetch(`${RONSUITE_URL}/api/brain/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-supabase-key': supabaseKey },
          body: JSON.stringify({ id: item.id, status: 'failed' })
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error(`[Sync] Sync pipeline encountered connection error:`, err);
  }
}

// Bind to port 3001
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`[Bridge] Server listening on HTTP/WS port ${PORT}`);
  syncObsidian();
});
