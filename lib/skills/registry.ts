import { createServiceClient } from '../supabase/service';

export interface Skill {
  id: string;
  name: string;
  description: string;
  type: 'generative' | 'analytical' | 'integrative';
  trigger_phrases: string[];
  input_schema: any;
  handler_ref: string;
  risk_level: string;
  requires_approval: boolean;
  status: 'planned' | 'active' | 'deprecated';
}

/**
 * Loads all active registered skills from the database
 */
export async function getActiveSkills(): Promise<Skill[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('status', 'active');

  if (error) {
    console.error('[Skill Registry] Error fetching active skills:', error);
    return [];
  }

  return data as Skill[];
}

/**
 * Matches a natural language prompt to a registered skill based on trigger phrases
 */
export async function matchPromptToSkill(prompt: string): Promise<Skill | null> {
  const skills = await getActiveSkills();
  const normalizedPrompt = prompt.toLowerCase().trim();

  for (const skill of skills) {
    for (const phrase of skill.trigger_phrases) {
      if (normalizedPrompt.includes(phrase.toLowerCase())) {
        return skill;
      }
    }
  }

  return null;
}

/**
 * Validates skill inputs against the skill's input schema
 */
export function validateSkillInput(skill: Skill, inputs: any): { valid: boolean; errors: string[] } {
  const schema = skill.input_schema;
  if (!schema || !schema.properties) {
    return { valid: true, errors: [] };
  }

  const errors: string[] = [];

  // Check required fields
  if (schema.required) {
    for (const reqField of schema.required) {
      if (inputs[reqField] === undefined || inputs[reqField] === null) {
        errors.push(`Missing required field: '${reqField}'`);
      }
    }
  }

  // Basic type checking
  for (const [key, value] of Object.entries(inputs)) {
    const propSchema = schema.properties[key];
    if (!propSchema) continue; // Ignore extra fields not in schema

    if (propSchema.type) {
      const actualType = typeof value;
      if (propSchema.type === 'array' && !Array.isArray(value)) {
        errors.push(`Field '${key}' expected array, got ${actualType}`);
      } else if (propSchema.type === 'number' && actualType !== 'number') {
        errors.push(`Field '${key}' expected number, got ${actualType}`);
      } else if (propSchema.type === 'boolean' && actualType !== 'boolean') {
        errors.push(`Field '${key}' expected boolean, got ${actualType}`);
      } else if (propSchema.type === 'string' && actualType !== 'string') {
        errors.push(`Field '${key}' expected string, got ${actualType}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
