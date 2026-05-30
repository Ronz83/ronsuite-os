const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const pty = require('node-pty');

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
if (fs.existsSync(rootEnvPath)) {
  const content = fs.readFileSync(rootEnvPath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^SUPABASE_SERVICE_ROLE_KEY=(.*)$/);
    if (match) supabaseKey = match[1].trim();
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

function runCodex(content, businessContext, ws) {
  console.log(`[Bridge] Spawning PTY CLI for Codex`);
  
  let fullContent = content;
  if (businessContext) {
    fullContent = `[BUSINESS CONTEXT]\n${businessContext}\n\n[USER PROMPT]\n${content}`;
  }

  const isWin = process.platform === 'win32';
  let ptyProcess;

  if (isWin) {
    const shell = process.env.COMSPEC || 'cmd.exe';
    ptyProcess = pty.spawn(shell, ['/c', 'codex', fullContent], {
      name: 'xterm-color',
      cols: 120,
      rows: 30,
      cwd: require('os').homedir(),
      env: process.env
    });
  } else {
    ptyProcess = pty.spawn('codex', [fullContent], {
      name: 'xterm-color',
      cols: 120,
      rows: 30,
      cwd: require('os').homedir(),
      env: process.env
    });
  }

  ptyProcess.onData((data) => {
    const cleanText = data.replace(/\x1b\[[0-9;]*[mGKHFJ]/g, '').replace(/\r/g, '');
    ws.send(JSON.stringify({
      type: 'text',
      agent: 'codex',
      text: cleanText
    }));
  });

  ptyProcess.onExit(({ exitCode }) => {
    console.log(`[Bridge] Codex PTY exited with code ${exitCode}`);
    ws.send(JSON.stringify({
      type: 'agent_done',
      agent: 'codex',
      code: exitCode
    }));
  });
}

function runGemini(content, businessContext, ws) {
  console.log(`[Bridge] Spawning PTY CLI for Gemini (Antigravity)`);
  
  const args = [];
  if (businessContext) {
    args.push('--system-prompt', businessContext);
  }
  args.push(content);

  const isWin = process.platform === 'win32';
  let ptyProcess;

  if (isWin) {
    const shell = process.env.COMSPEC || 'cmd.exe';
    ptyProcess = pty.spawn(shell, ['/c', 'gemini', ...args], {
      name: 'xterm-color',
      cols: 120,
      rows: 30,
      cwd: require('os').homedir(),
      env: process.env
    });
  } else {
    ptyProcess = pty.spawn('gemini', args, {
      name: 'xterm-color',
      cols: 120,
      rows: 30,
      cwd: require('os').homedir(),
      env: process.env
    });
  }

  ptyProcess.onData((data) => {
    const cleanText = data.replace(/\x1b\[[0-9;]*[mGKHFJ]/g, '').replace(/\r/g, '');
    ws.send(JSON.stringify({
      type: 'text',
      agent: 'antigravity',
      text: cleanText
    }));
  });

  ptyProcess.onExit(({ exitCode }) => {
    console.log(`[Bridge] Gemini PTY exited with code ${exitCode}`);
    ws.send(JSON.stringify({
      type: 'agent_done',
      agent: 'antigravity',
      code: exitCode
    }));
  });
}

function runClaude(content, businessContext, ws) {
  console.log(`[Bridge] Spawning child process CLI for Claude`);
  const spawnEnv = { ...process.env, NO_COLOR: '1' };
  
  const args = [];
  if (businessContext) {
    args.push('--system-prompt', businessContext);
  }
  args.push(content);

  const child = spawn('claude', args, { shell: true, env: spawnEnv });

  child.stdout.on('data', (chunk) => {
    ws.send(JSON.stringify({
      type: 'text',
      agent: 'claude',
      text: chunk.toString()
    }));
  });

  child.stderr.on('data', (chunk) => {
    console.log(`[Bridge][claude stderr] ${chunk.toString().trim()}`);
  });

  child.on('close', (code) => {
    console.log(`[Bridge] Claude closed with exit code ${code}`);
    ws.send(JSON.stringify({
      type: 'agent_done',
      agent: 'claude',
      code
    }));
  });

  child.on('error', (err) => {
    console.error(`[Bridge] Failed to run Claude:`, err);
    ws.send(JSON.stringify({
      type: 'error',
      agent: 'claude',
      message: `Execution failed: ${err.message}`
    }));
  });
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
