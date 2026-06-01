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

  rawIntake.backlog.boardroom_voice = {
    name: "Boardroom Voice Conversation (browser-native v1)",
    status: "backlog — deferred",
    value: "Polish/delight — agents speak turns with distinct voices + STT user dictation",
    why_deferred: "Does not move RonSuite core panels, TicketFlow launch, or Digital Architect revenue. Shiny-object risk.",
    technical_notes: [
      "Web Speech API voices are inconsistent across browsers/OS — cannot guarantee named accents (e.g. 'British for Antigravity'). Pitch/rate differentiation works; named voices do NOT reliably.",
      "webkitSpeechRecognition is Chrome-mostly — fine for personal (protected) tool, not portable.",
      "Need interrupt/barge-in: cancel current speech when a new boardroom turn streams in.",
      "Auto-read is a race condition with token streaming — wait for FULL per-agent message before queuing, not on stream-complete alone.",
      "For truly characterful distinct voices, browser API won't suffice — use ElevenLabs.",
      "STRATEGIC: unify with the backlogged Hermes Voice Layer + Twilio/VO voice work — one voice strategy, not a one-off boardroom toy."
    ],
    build_when: "After active priorities are stable; scope with ElevenLabs + unified voice strategy"
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

  console.log("Successfully logged boardroom_voice to backlog in hermes_context!");
  console.log("Updated raw_intake.backlog:", JSON.stringify(updated.raw_intake.backlog, null, 2));
})();
