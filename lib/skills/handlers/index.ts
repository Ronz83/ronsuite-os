import { proposalDrafterHandler } from './proposal-drafter';
import { projectUpdateHandler } from './project-update';

export type SkillHandler = (inputs: Record<string, any>) => Promise<any>;

export const handlers: Record<string, SkillHandler> = {
  'proposal-drafter': proposalDrafterHandler,
  'project-update': projectUpdateHandler
};
