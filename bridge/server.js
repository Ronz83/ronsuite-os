const fs = require('fs');
const path = require('path');
const os = require('os');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const fetch = globalThis.fetch || require('node-fetch');

// Load configuration from bridge/.env
const envPath = path.join(__dirname, '.env');
const env = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
  });
}

// Load keys from Next.js root .env.local
const rootEnvPath = path.join(__dirname, '..', '.env.local');
const rootEnv = {};
if (fs.existsSync(rootEnvPath)) {
  fs.readFileSync(rootEnvPath, 'utf8').split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) rootEnv[match[1].trim()] = match[2].trim();
  });
}

const RONSUITE_URL = env.RONSUITE_URL || 'https://ronsuite-os.vercel.app';
const OBSIDIAN_VAULT = env.OBSIDIAN_VAULT || 'C:\\Users\\Ronald\\.gemini\\antigravity\\memory\\wikis\\antigravity_master';

// API keys — bridge/.env takes priority, falls back to .env.local
const supabaseKey    = rootEnv.SUPABASE_SERVICE_ROLE_KEY || '';
const openaiKey      = env.OPENAI_API_KEY      || rootEnv.OPENAI_API_KEY      || '';
const anthropicKey   = env.ANTHROPIC_API_KEY   || rootEnv.ANTHROPIC_API_KEY   || '';
const geminiKey      = env.GEMINI_API_KEY      || rootEnv.GEMINI_API_KEY      || '';

console.log(`[Bridge] Starting bridge...`);
console.log(`[Bridge] Target URL: ${RONSUITE_URL}`);
console.log(`[Bridge] Keys loaded — OpenAI: ${openaiKey ? 'yes' : 'NO'} | Anthropic: ${anthropicKey ? 'yes' : 'NO'} | Gemini: ${geminiKey ? 'yes' : 'NO'}`);

// ── Express app ────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Methods', '*');
  next();
});

app.get('/health', (req, res) => res.json({ status: 'ok', mode: 'bridge', timestamp: Date.now() }));
app.get('/status', (req, res) => res.json({ configuredCLIs: { codex: true, claude: true, antigravity: true } }));

// ── SSE stream reader helper ───────────────────────────────────────────────────
async function* readSSE(res) {
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
      if (line.startsWith('data: ')) yield line.slice(6).trim();
    }
  }
}

// ── Codex: OpenAI gpt-4o ──────────────────────────────────────────────────────
async function runCodex(ws, content, history) {
  if (!openaiKey) {
    ws.send(JSON.stringify({ type: 'error', agent: 'codex', message: 'No OpenAI API key configured' }));
    return;
  }

  const messages = [
    { role: 'system', content: 'You are Codex, the Engineering Lead in a multi-agent AI boardroom for Novelty Web Solutions. You bring strong technical depth, architecture expertise, and pragmatic implementation focus. Be direct and concise.' },
    ...(history || []).slice(-5).flatMap(t => [
      { role: 'user', content: t.user_message || '' },
      { role: 'assistant', content: t.responses?.['Codex'] || '' }
    ]),
    { role: 'user', content }
  ];

  try {
    console.log(`[Bridge] Codex → OpenAI API`);
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o', messages, stream: true })
    });
    if (!res.ok) {
      ws.send(JSON.stringify({ type: 'error', agent: 'codex', message: `OpenAI ${res.status}: ${(await res.text()).substring(0, 200)}` }));
      return;
    }
    for await (const raw of readSSE(res)) {
      if (!raw || raw === '[DONE]') continue;
      try {
        const token = JSON.parse(raw).choices?.[0]?.delta?.content;
        if (token) ws.send(JSON.stringify({ type: 'text', agent: 'codex', text: token }));
      } catch {}
    }
    ws.send(JSON.stringify({ type: 'agent_done', agent: 'codex', code: 0 }));
  } catch (err) {
    console.error('[Bridge] Codex error:', err.message);
    ws.send(JSON.stringify({ type: 'error', agent: 'codex', message: err.message }));
  }
}

// ── Claude Code: Anthropic claude-sonnet-4-6 ──────────────────────────────────
async function runClaude(ws, content, history) {
  if (!anthropicKey) {
    ws.send(JSON.stringify({ type: 'error', agent: 'claude', message: 'No Anthropic API key configured' }));
    return;
  }

  const messages = [
    ...(history || []).slice(-5).flatMap(t => [
      { role: 'user', content: t.user_message || '' },
      { role: 'assistant', content: t.responses?.['Claude Code'] || '' }
    ]),
    { role: 'user', content }
  ];

  try {
    console.log(`[Bridge] Claude Code → Anthropic API`);
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        stream: true,
        system: 'You are Claude Code, the Architecture Lead in a multi-agent AI boardroom for Novelty Web Solutions. You bring deep software architecture expertise, strategic thinking, and code quality focus. Be direct and concise.',
        messages
      })
    });
    if (!res.ok) {
      ws.send(JSON.stringify({ type: 'error', agent: 'claude', message: `Anthropic ${res.status}: ${(await res.text()).substring(0, 200)}` }));
      return;
    }
    for await (const raw of readSSE(res)) {
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
          if (parsed.delta.text) ws.send(JSON.stringify({ type: 'text', agent: 'claude', text: parsed.delta.text }));
        }
      } catch {}
    }
    ws.send(JSON.stringify({ type: 'agent_done', agent: 'claude', code: 0 }));
  } catch (err) {
    console.error('[Bridge] Claude error:', err.message);
    ws.send(JSON.stringify({ type: 'error', agent: 'claude', message: err.message }));
  }
}

// ── Antigravity: Gemini 2.0 Flash ─────────────────────────────────────────────
async function runGemini(ws, content, history) {
  if (!geminiKey) {
    ws.send(JSON.stringify({ type: 'error', agent: 'antigravity', message: 'No Gemini API key configured' }));
    return;
  }

  // Gemini requires strictly alternating user/model turns
  const contents = [
    ...(history || []).slice(-5).flatMap(t => [
      { role: 'user',  parts: [{ text: t.user_message || '' }] },
      { role: 'model', parts: [{ text: t.responses?.['Antigravity'] || '...' }] }
    ]),
    { role: 'user', parts: [{ text: content }] }
  ];

  try {
    console.log(`[Bridge] Antigravity → Gemini API`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${geminiKey}&alt=sse`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: 'You are Antigravity, the Creative Director in a multi-agent AI boardroom for Novelty Web Solutions. You bring creative strategy, innovative thinking, and bold ideas. Be direct and concise.' }]
        },
        generationConfig: { maxOutputTokens: 1024 }
      })
    });
    if (!res.ok) {
      ws.send(JSON.stringify({ type: 'error', agent: 'antigravity', message: `Gemini ${res.status}: ${(await res.text()).substring(0, 200)}` }));
      return;
    }
    for await (const raw of readSSE(res)) {
      if (!raw) continue;
      try {
        const text = JSON.parse(raw).candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) ws.send(JSON.stringify({ type: 'text', agent: 'antigravity', text }));
      } catch {}
    }
    ws.send(JSON.stringify({ type: 'agent_done', agent: 'antigravity', code: 0 }));
  } catch (err) {
    console.error('[Bridge] Gemini error:', err.message);
    ws.send(JSON.stringify({ type: 'error', agent: 'antigravity', message: err.message }));
  }
}

// ── WebSocket server ──────────────────────────────────────────────────────────
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('[Bridge] WS Client Connected');

  ws.on('message', async (messageString) => {
    try {
      const data = JSON.parse(messageString);
      if (data.type !== 'message') return;

      const { agent, content, history = [] } = data;

      if      (agent === 'codex')       await runCodex(ws, content, history);
      else if (agent === 'claude')      await runClaude(ws, content, history);
      else if (agent === 'antigravity') await runGemini(ws, content, history);
      else ws.send(JSON.stringify({ type: 'error', agent, message: `Unknown agent: ${agent}` }));
    } catch (err) {
      console.error('[Bridge] WS message error:', err.message);
    }
  });

  ws.on('close', () => console.log('[Bridge] WS Client Disconnected'));
});

// ── Obsidian Sync ─────────────────────────────────────────────────────────────
async function syncObsidian() {
  console.log(`[Sync] Querying pending brain sync writes...`);
  try {
    const response = await fetch(`${RONSUITE_URL}/api/brain/flush`, {
      headers: { 'x-supabase-key': supabaseKey }
    });
    if (!response.ok) { console.error(`[Sync] Failed: ${response.status}`); return; }

    const resBody = await response.json();
    if (!resBody.success || !Array.isArray(resBody.queue)) { console.error(`[Sync] Invalid payload`); return; }

    console.log(`[Sync] Found ${resBody.queue.length} pending writes.`);
    for (const item of resBody.queue) {
      try {
        const absolutePath = path.join(OBSIDIAN_VAULT, item.wiki_file);
        const dir = path.dirname(absolutePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const dateStr = new Date().toISOString().split('T')[0];
        const title = item.content.split('\n')[0].replace(/[#*`]/g, '').trim().substring(0, 50) || 'Memory Entry';
        fs.appendFileSync(absolutePath, `\n\n---\n## ${dateStr} — ${title}\n${item.content}`, 'utf8');
        console.log(`[Sync] Appended to ${absolutePath}`);

        await fetch(`${RONSUITE_URL}/api/brain/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-supabase-key': supabaseKey },
          body: JSON.stringify({ id: item.id, status: 'flushed' })
        });
      } catch (writeErr) {
        console.error(`[Sync] Error on item ${item.id}:`, writeErr.message);
        await fetch(`${RONSUITE_URL}/api/brain/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-supabase-key': supabaseKey },
          body: JSON.stringify({ id: item.id, status: 'failed' })
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error(`[Sync] Connection error:`, err.message);
  }
}

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`[Bridge] Server listening on port ${PORT}`);
  syncObsidian();
});
