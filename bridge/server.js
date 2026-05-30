const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { spawn } = require('child_process');

const fetch = globalThis.fetch || require('node-fetch');

// 1. Load configuration from bridge/.env
const envPath = path.join(__dirname, '.env');
const env = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  });
}

const RONSUITE_URL = env.RONSUITE_URL || 'https://ronsuite-os.vercel.app';
const OBSIDIAN_VAULT = env.OBSIDIAN_VAULT || 'C:\\Users\\Ronald\\.gemini\\antigravity\\memory\\wikis\\antigravity_master';

// 2. Load keys from Next.js root env file
const rootEnvPath = path.join(__dirname, '..', '.env.local');
let supabaseKey = '';
let anthropicKey = '';
if (fs.existsSync(rootEnvPath)) {
  const content = fs.readFileSync(rootEnvPath, 'utf8');
  content.split('\n').forEach(line => {
    const matchSupa = line.match(/^SUPABASE_SERVICE_ROLE_KEY=(.*)$/);
    if (matchSupa) supabaseKey = matchSupa[1].trim();
    const matchAnth = line.match(/^ANTHROPIC_API_KEY=(.*)$/);
    if (matchAnth) anthropicKey = matchAnth[1].trim();
  });
}

console.log(`[Bridge] Starting bridge...`);
console.log(`[Bridge] Target URL: ${RONSUITE_URL}`);
console.log(`[Bridge] Vault Path: ${OBSIDIAN_VAULT}`);

// 3. Setup Express app
const app = express();
app.use(express.json());

// Enable CORS for frontend health checks
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Methods', '*');
  next();
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'bridge',
    timestamp: Date.now()
  });
});

app.get('/status', (req, res) => {
  res.json({
    configuredCLIs: {
      codex: true,
      claude: true,
      antigravity: true
    }
  });
});

// 4. Setup HTTP and WebSocket server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('[Bridge] WS Client Connected');

  ws.on('message', (messageString) => {
    try {
      const data = JSON.parse(messageString);
      if (data.type === 'message') {
        const { agent, content, businessContext } = data;

        // Inject keys from bridge/.env into process.env for CLI usage
        if (env.OPENAI_API_KEY) process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
        if (env.GEMINI_API_KEY) process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;

        if (agent === 'codex') {
          runCodex(content, businessContext, ws);
        } else if (agent === 'claude') {
          runClaude(content, businessContext, ws);
        } else if (agent === 'antigravity') {
          runGemini(content, businessContext, ws);
        } else {
          ws.send(JSON.stringify({ type: 'error', agent, message: `Unknown agent: ${agent}` }));
        }
      }
    } catch (err) {
      console.error('[Bridge] WS message parse error:', err);
    }
  });

  ws.on('close', () => {
    console.log('[Bridge] WS Client Disconnected');
  });
});

async function runCodex(content, businessContext, ws) {
  console.log(`[Bridge] Running Codex via OpenAI API`);
  const messages = [];
  if (businessContext) messages.push({ role: 'system', content: businessContext });
  messages.push({ role: 'user', content });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({ model: 'o4-mini', messages, stream: true })
    });

    if (!response.ok) {
      const err = await response.text();
      ws.send(JSON.stringify({ type: 'error', agent: 'codex', message: `OpenAI API error: ${err}` }));
      return;
    }

    const reader = response.body.getReader();
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
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const text = parsed.choices?.[0]?.delta?.content;
          if (text) ws.send(JSON.stringify({ type: 'text', agent: 'codex', text }));
        } catch {}
      }
    }

    ws.send(JSON.stringify({ type: 'agent_done', agent: 'codex', code: 0 }));
  } catch (err) {
    console.error('[Bridge] Codex error:', err);
    ws.send(JSON.stringify({ type: 'error', agent: 'codex', message: err.message }));
  }
}

async function runGemini(content, businessContext, ws) {
  console.log(`[Bridge] Running Gemini via REST API`);
  const apiKey = env.GEMINI_API_KEY;
  const model = 'gemini-2.5-pro';

  const body = {
    contents: [{ role: 'user', parts: [{ text: content }] }],
    generationConfig: { maxOutputTokens: 8192 }
  };
  if (businessContext) {
    body.systemInstruction = { parts: [{ text: businessContext }] };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      const err = await response.text();
      ws.send(JSON.stringify({ type: 'error', agent: 'antigravity', message: `Gemini API error: ${err}` }));
      return;
    }

    const reader = response.body.getReader();
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
        const data = line.slice(6).trim();
        try {
          const parsed = JSON.parse(data);
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) ws.send(JSON.stringify({ type: 'text', agent: 'antigravity', text }));
        } catch {}
      }
    }

    ws.send(JSON.stringify({ type: 'agent_done', agent: 'antigravity', code: 0 }));
  } catch (err) {
    console.error('[Bridge] Gemini error:', err);
    ws.send(JSON.stringify({ type: 'error', agent: 'antigravity', message: err.message }));
  }
}

async function runClaude(content, businessContext, ws) {
  console.log(`[Bridge] Running Claude via Anthropic API`);

  const body = {
    model: 'claude-opus-4-7',
    max_tokens: 8096,
    messages: [{ role: 'user', content }],
    stream: true
  };
  if (businessContext) body.system = businessContext;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const err = await response.text();
      ws.send(JSON.stringify({ type: 'error', agent: 'claude', message: `Anthropic API error: ${err}` }));
      return;
    }

    const reader = response.body.getReader();
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
        const data = line.slice(6).trim();
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
            ws.send(JSON.stringify({ type: 'text', agent: 'claude', text: parsed.delta.text }));
          }
        } catch {}
      }
    }

    ws.send(JSON.stringify({ type: 'agent_done', agent: 'claude', code: 0 }));
  } catch (err) {
    console.error('[Bridge] Claude error:', err);
    ws.send(JSON.stringify({ type: 'error', agent: 'claude', message: err.message }));
  }
}

// 5. Obsidian Sync Pipeline on Startup
async function syncObsidian() {
  console.log(`[Sync] Querying pending brain sync writes...`);
  try {
    const response = await fetch(`${RONSUITE_URL}/api/brain/flush`, {
      headers: {
        'x-supabase-key': supabaseKey
      }
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
        
        // Ensure path directories exist
        const dir = path.dirname(absolutePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        const dateStr = new Date().toISOString().split('T')[0];
        const title = item.content.split('\n')[0].replace(/[#*`]/g, '').trim().substring(0, 50) || 'Memory Entry';
        
        const fileContent = `\n\n---\n## ${dateStr} — ${title}\n${item.content}`;
        
        fs.appendFileSync(absolutePath, fileContent, 'utf8');
        console.log(`[Sync] Appended update to ${absolutePath}`);

        // Confirm flush
        const confirmRes = await fetch(`${RONSUITE_URL}/api/brain/confirm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-supabase-key': supabaseKey
          },
          body: JSON.stringify({
            id: item.id,
            status: 'flushed'
          })
        });

        if (confirmRes.ok) {
          console.log(`[Sync] Confirmed item ${item.id} flushed.`);
        } else {
          console.error(`[Sync] Confirmation failed for ${item.id}: status ${confirmRes.status}`);
        }

      } catch (writeErr) {
        console.error(`[Sync] Error syncing item ${item.id}:`, writeErr);
        // Confirm as failed
        await fetch(`${RONSUITE_URL}/api/brain/confirm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-supabase-key': supabaseKey
          },
          body: JSON.stringify({
            id: item.id,
            status: 'failed'
          })
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error(`[Sync] Sync pipeline encountered connection error:`, err);
  }
}

// 6. Bind to port 3001
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`[Bridge] Server listening on HTTP/WS port ${PORT}`);
  // Execute Obsidian Sync pipeline
  syncObsidian();
});
