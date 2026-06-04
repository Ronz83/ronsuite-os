import { qwen } from '../../qwen';

export async function trainingGeneratorHandler(inputs: Record<string, any>): Promise<{ content: string; meta: any }> {
  const { niche, targetAudience = 'Local Customers', primaryOffer = 'Free Consultation' } = inputs;
  console.log(`[Training Generator] Generating sales training assets for niche: ${niche}`);

  const systemPrompt = `You are the Director of Sales Enablement at Novelty Web Solutions (NWS).
Your task is to create high-converting sales training assets and SOPs for our Account Managers (AMs) to help them sell and close prospects in the "${niche}" niche.

The training material must focus on selling the NWS Operating System (specifically the AI Receptionist/Aria Bot, GHL CRM pipelines, and local lead-generation assets).
Our positioning is "Digital Architect" — we sell functional business operating systems, not simple static websites.

Please generate the following three documents in beautiful Markdown:

1. **Live Demo Script**: A professional, step-by-step script for an AM showing a prospect how their new AI-powered website and Aria Chatbot will capture and qualify leads in real-time. Make the dialogue realistic, engaging, and focused on showing value.
2. **Objection Handling Matrix**: Create a tabular matrix addressing the top objections for this niche:
   - "AI is too robotic and will alienate my clients."
   - "We already have a website/marketing person."
   - "Why should we pay $597/month recurring?"
   - "How do I know this will actually bring in jobs?"
   Provide the objection, the psychological pivot, and the exact script response.
3. **Standard Operating Procedure (SOP) - Client Handover**: A clear checklist for the AM to transition a closed deal to the onboarding team, explaining how to trigger the onboarding skill, what info to collect (Path A/B), and how to verify sub-account deployment.

Write this in a premium, motivating corporate training voice. Make the scripts and copy ready to use. Only return the Markdown content.`;

  const modelToUse = 'qwen-3.7-max';

  const response = await qwen.createCompletion({
    model: modelToUse,
    max_tokens: 8000,
    messages: [
      { role: 'user', content: systemPrompt }
    ]
  });

  const content = response.content[0]?.text || '';

  const inputTokens = response.usage?.input_tokens || 0;
  const outputTokens = response.usage?.output_tokens || 0;
  const totalTokens = response.usage?.total_tokens || (inputTokens + outputTokens);
  
  // Cost calculation for Qwen 3.7 Max: $6/M input tokens, $20/M output tokens
  const costUsd = (inputTokens * 0.000006) + (outputTokens * 0.00002);

  return {
    content,
    meta: {
      niche,
      targetAudience,
      primaryOffer,
      modelUsed: modelToUse,
      timestamp: new Date().toISOString(),
      usage: {
        inputTokens,
        outputTokens,
        totalTokens,
        costUsd
      }
    }
  };
}
