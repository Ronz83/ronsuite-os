import { createServiceClient } from '../supabase/service';
import { Skill } from './registry';
import { handlers } from './handlers';

export interface SkillRunResult {
  runId: string;
  status: 'success' | 'failed' | 'approval_pending';
  output?: any;
  error?: string;
}

/**
 * Executes a matched skill handler, logs the run to skill_runs table, and handles approval gates.
 */
export async function executeSkill(
  skill: Skill,
  inputs: Record<string, any>
): Promise<SkillRunResult> {
  const supabase = createServiceClient();

  // 1. Check if approval is required and has not been granted
  if (skill.requires_approval) {
    // Write an approval pending entry
    const { data: run, error: runErr } = await supabase
      .from('skill_runs')
      .insert({
        skill_id: skill.id,
        inputs,
        status: 'approval_pending'
      })
      .select('id')
      .single();

    if (runErr) {
      console.error('[Skill Executor] Error creating approval pending run log:', runErr);
      return { runId: '', status: 'failed', error: `Database error: ${runErr.message}` };
    }

    return {
      runId: run.id,
      status: 'approval_pending',
      error: `Execution of skill '${skill.name}' blocked: Requires user approval.`
    };
  }

  // 2. Create the run log entry in the database
  const { data: run, error: runErr } = await supabase
    .from('skill_runs')
    .insert({
      skill_id: skill.id,
      inputs,
      status: 'running'
    })
    .select('id')
    .single();

  if (runErr) {
    console.error('[Skill Executor] Error creating execution run log:', runErr);
    return { runId: '', status: 'failed', error: `Database error: ${runErr.message}` };
  }

  const runId = run.id;

  // 3. Find and execute the corresponding handler
  const handler = handlers[skill.handler_ref];
  if (!handler) {
    const errorMsg = `No handler implementation found for handler reference: '${skill.handler_ref}'`;
    console.error(`[Skill Executor] ${errorMsg}`);
    
    await supabase
      .from('skill_runs')
      .update({
        status: 'failed',
        error: errorMsg
      })
      .eq('id', runId);

    return { runId, status: 'failed', error: errorMsg };
  }

  try {
    console.log(`[Skill Executor] Executing skill '${skill.name}' (Run ID: ${runId})`);
    const output = await handler(inputs);
    
    // Log success
    await supabase
      .from('skill_runs')
      .update({
        status: 'success',
        output
      })
      .eq('id', runId);

    return { runId, status: 'success', output };
  } catch (err: any) {
    const errMsg = err.message || String(err);
    console.error(`[Skill Executor] Error executing skill '${skill.name}':`, err);

    // Log failure
    await supabase
      .from('skill_runs')
      .update({
        status: 'failed',
        error: errMsg
      })
      .eq('id', runId);

    return { runId, status: 'failed', error: errMsg };
  }
}

/**
 * Resolves a skill by name, validates inputs, and executes it.
 */
export async function runSkill({
  skillName,
  inputs
}: {
  skillName: string;
  inputs: Record<string, any>;
}): Promise<SkillRunResult> {
  const supabase = createServiceClient();
  const { data: skill, error } = await supabase
    .from('skills')
    .select('*')
    .eq('name', skillName)
    .single();

  if (error || !skill) {
    throw new Error(`Skill '${skillName}' not found in registry: ${error?.message || ''}`);
  }

  // Validate inputs
  const { validateSkillInput } = require('./registry');
  const { valid, errors } = validateSkillInput(skill, inputs);
  if (!valid) {
    throw new Error(`Invalid inputs for skill ${skillName}: ${errors.join(', ')}`);
  }

  return executeSkill(skill, inputs);
}

