import { proposalDrafterHandler } from './proposal-drafter';

export type SkillHandler = (inputs: Record<string, any>) => Promise<any>;

export const handlers: Record<string, SkillHandler> = {
  'proposal-drafter': proposalDrafterHandler
};
