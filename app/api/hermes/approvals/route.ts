import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('hermes_approvals')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, approvals: data || [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  try {
    const body = await req.json();
    const { data, error } = await supabase
      .from('hermes_approvals')
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, approval: data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  try {
    const { id, status, resolution_note } = await req.json() as { id: string; status: 'approved' | 'rejected' | 'executed'; resolution_note?: string };
    if (!id || !['approved', 'rejected', 'executed'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('hermes_approvals')
      .update({
        status,
        resolution_note: resolution_note || null,
        resolved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, approval: data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
