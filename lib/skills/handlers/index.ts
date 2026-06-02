import { proposalDrafterHandler } from './proposal-drafter';
import { projectUpdateHandler } from './project-update';
import { ghlBusinessOnboardingHandler } from './ghl-business-onboarding';
import { trainingGeneratorHandler } from './training-generator';

export type SkillHandler = (inputs: Record<string, any>) => Promise<any>;

export const handlers: Record<string, SkillHandler> = {
  'proposal-drafter': proposalDrafterHandler,
  'project-update': projectUpdateHandler,
  'ghl-business-onboarding': ghlBusinessOnboardingHandler,
  'training-generator': trainingGeneratorHandler
};
