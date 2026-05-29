const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  console.log("Checking for boardroom_sessions table...");
  const { data, error } = await supabase.from('boardroom_sessions').select('*').limit(1);
  if (error) {
    console.log("Error selecting from boardroom_sessions:", error.message);
  } else {
    console.log("Success! boardroom_sessions table exists. Data:", data);
  }

  console.log("Checking for seeded agents...");
  const { data: agents, error: agentError } = await supabase.from('agents').select('name, role').in('name', ['Antigravity', 'Codex', 'Claude Code']);
  if (agentError) {
    console.log("Error selecting from agents:", agentError.message);
  } else {
    console.log("Seeded agents found:", agents);
  }
}

check();
