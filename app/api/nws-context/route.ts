import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();

  if (!user) return new Response('Unauthorized', { status: 401 });

  const serviceClient = createServiceClient();
  try {
    const { data: missions, error: mError } = await serviceClient
      .from('nws_mission_entries')
      .select('*')
      .order('version', { ascending: true });

    if (mError) throw mError;

    const { data: cards, error: cError } = await serviceClient
      .from('nws_brand_cards')
      .select('*')
      .order('title', { ascending: true });

    if (cError) throw cError;

    return NextResponse.json({ success: true, missions: missions || [], cards: cards || [] });
  } catch (err: any) {
    console.error("[NWS Context API] Error fetching context:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();

  if (!user) return new Response('Unauthorized', { status: 401 });

  try {
    const { id, type, field, value, agent } = await req.json();

    if (!id || !type || !field || value === undefined) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }

    const ALLOWED_MISSION_FIELDS = ['message', 'best_for'];
    const ALLOWED_CARD_FIELDS = ['content'];
    const allowed = type === 'mission' ? ALLOWED_MISSION_FIELDS : ALLOWED_CARD_FIELDS;
    if (!allowed.includes(field)) {
      return NextResponse.json({ success: false, error: 'Invalid field' }, { status: 400 });
    }

    const table = type === 'mission' ? 'nws_mission_entries' : 'nws_brand_cards';
    const serviceClient = createServiceClient();

    const updateData: Record<string, any> = {
      [field]: value,
      updated_at: new Date().toISOString(),
      updated_by: agent || user.email || 'user'
    };

    const { data, error } = await serviceClient
      .from(table)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("[NWS Context API] Error updating context:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
