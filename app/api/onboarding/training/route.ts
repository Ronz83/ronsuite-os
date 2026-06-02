import { NextResponse } from 'next/server';
import { createBrokerClient } from '@/lib/supabase/broker';
import { trainingGeneratorHandler } from '@/lib/skills/handlers/training-generator';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { niche, targetAudience = 'Local Customers', primaryOffer = 'Free Consultation' } = body;

    if (!niche) {
      return NextResponse.json({ error: 'Missing niche parameter' }, { status: 400 });
    }

    console.log(`[Admin Training API] Generating training resources for: ${niche}`);

    // 1. Generate assets using Claude
    const result = await trainingGeneratorHandler({ niche, targetAudience, primaryOffer });
    const content = result.content;

    // 2. Parse and split content into 3 documents if possible
    // We'll search for markdown headers like "Live Demo Script", "Objection Handling", "SOP" or similar.
    let demoScriptContent = '';
    let objectionContent = '';
    let sopContent = '';

    // Let's do a simple parse: split by section headers
    const sections = content.split(/(?=^#+ |\n#+ )/m);
    
    sections.forEach(sec => {
      const lower = sec.toLowerCase();
      if (lower.includes('demo script') || lower.includes('live demo')) {
        demoScriptContent = sec.trim();
      } else if (lower.includes('objection') || lower.includes('matrix')) {
        objectionContent = sec.trim();
      } else if (lower.includes('sop') || lower.includes('procedure') || lower.includes('handover')) {
        sopContent = sec.trim();
      }
    });

    // Fallbacks if splitting fails
    if (!demoScriptContent && !objectionContent && !sopContent) {
      demoScriptContent = content; // store everything in one if parsing failed
    }

    const broker = createBrokerClient();
    const resourcesInserted = [];

    // Publish to training_resources
    if (demoScriptContent) {
      const { data, error } = await broker
        .from('training_resources')
        .insert({
          type: 'guide',
          title: `Live Demo Script: ${niche}`,
          description: `Sales pitch walk-through for demonstrating CRM and AI value to ${niche} prospects.`,
          content: demoScriptContent
        })
        .select()
        .single();
      if (!error && data) resourcesInserted.push(data);
    }

    if (objectionContent) {
      const { data, error } = await broker
        .from('training_resources')
        .insert({
          type: 'guide',
          title: `Objection Handling: ${niche}`,
          description: `Pivot scripts and responses for typical ${niche} sales objections.`,
          content: objectionContent
        })
        .select()
        .single();
      if (!error && data) resourcesInserted.push(data);
    }

    if (sopContent) {
      const { data, error } = await broker
        .from('training_resources')
        .insert({
          type: 'sop',
          title: `SOP - ${niche} Client Handover`,
          description: `Standard operating procedure for transitioning closed ${niche} deals to onboarding.`,
          content: sopContent
        })
        .select()
        .single();
      if (!error && data) resourcesInserted.push(data);
    }

    return NextResponse.json({
      success: true,
      resources: resourcesInserted,
      rawContent: content
    });

  } catch (err: any) {
    console.error('[Admin Training API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const broker = createBrokerClient();
    const { data: resources, error } = await broker
      .from('training_resources')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(resources);
  } catch (err: any) {
    console.error('[Admin Training API] GET Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

