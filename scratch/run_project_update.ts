import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local manually first
const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim();
    process.env[key] = value;
  }
});

(async () => {
  try {
    // Dynamically import runSkill after environment variables are in place
    const { runSkill } = await import('../lib/skills/executor');

    console.log("Triggering 'Project Update' skill...");
    const result = await runSkill({
      skillName: 'Project Update',
      inputs: {
        projectSlug: 'all' // Test briefing all projects
      }
    });

    console.log("Execution status:", result.status);
    console.log("Run ID:", result.runId);

    if (result.status === 'success') {
      console.log("\n--- BRIEFING OUTPUT ---");
      console.log(result.output.briefing);
      console.log("------------------------");
    } else {
      console.error("Execution failed:", result.error);
    }
  } catch (err: any) {
    console.error("Error during skill run:", err.message || err);
  }
})();
