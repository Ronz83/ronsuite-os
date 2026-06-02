import { NextResponse } from 'next/server';
import { createBrokerClient } from '@/lib/supabase/broker';

export async function GET() {
  try {
    const broker = createBrokerClient();
    // Query runs and join with workstation_skills using nested query
    const { data: runs, error } = await broker
      .from('workstation_runs')
      .select(`
        id,
        skill_id,
        operator_email,
        inputs,
        outputs,
        status,
        error,
        created_at,
        workstation_skills (
          name,
          description
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(runs);
  } catch (err: any) {
    console.error('[Admin Runs API] GET Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
