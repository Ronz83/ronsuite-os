const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim();
    env[key] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase URL or service role key in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  // 1. Fetch current context
  const { data: existing, error: getErr } = await supabase
    .from('hermes_context')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (getErr) {
    console.error("Error fetching hermes_context:", getErr.message);
    process.exit(1);
  }

  if (!existing) {
    console.error("No existing hermes_context found!");
    process.exit(1);
  }

  // 2. Prepare raw_intake update
  const rawIntake = existing.raw_intake || {};
  if (!rawIntake.backlog) {
    rawIntake.backlog = {};
  }

  rawIntake.backlog.agent_task_dispatch = {
    name: "Agent Task Dispatch Layer",
    status: "backlog",
    value: "Hermes assigns task → routed to correct specialist agent (Codex=eng, Claude Code=architecture, Antigravity=creative) → agent executes → reports back to Hermes",
    why: "Agents are currently defined + conversational (Boardroom) but NOT executors. No assign→execute→report loop exists. Closing this realizes the 'command center orchestrating a team' vision.",
    current_state: "agents table exists; Boardroom convenes them for discussion only",
    evolution: "Today: Hermes runs skills directly. Next: Hermes dispatches to specialist agents.",
    depends_on: "Skill registry (done) as the execution substrate",
    design_notes: [
      "Route by agent role/lane (don't send eng work to creative director)",
      "Structured task object: objective, context, definition-of-done (reuse Task Intake Protocol)",
      "Report-back channel + audit (like skill_runs)",
      "Respect tiered guardrails — dispatched agents still gated on Tier 1/2"
    ]
  };

  // 3. Update table
  const { data: updated, error: updateErr } = await supabase
    .from('hermes_context')
    .update({
      raw_intake: rawIntake,
      updated_at: new Date().toISOString()
    })
    .eq('id', existing.id)
    .select()
    .single();

  if (updateErr) {
    console.error("Error updating hermes_context:", updateErr.message);
    process.exit(1);
  }

  console.log("Successfully logged agent_task_dispatch to backlog in hermes_context!");
  console.log("Updated raw_intake.backlog:", JSON.stringify(updated.raw_intake.backlog, null, 2));
})();
