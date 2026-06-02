import { NextResponse } from 'next/server';
import { createBrokerClient } from '@/lib/supabase/broker';

export async function GET() {
  try {
    const broker = createBrokerClient();
    const { data: skills, error } = await broker
      .from('workstation_skills')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return NextResponse.json(skills);
  } catch (err: any) {
    console.error('[Admin Skills API] GET Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing skill ID' }, { status: 400 });
    }

    const broker = createBrokerClient();
    const { data, error } = await broker
      .from('workstation_skills')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[Admin Skills API] PATCH Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
