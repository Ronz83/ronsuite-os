import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('hermes_context')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, context: data || null });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  try {
    const body = await req.json();
    
    // Check if a row already exists
    const { data: existing } = await supabase
      .from('hermes_context')
      .select('id')
      .limit(1)
      .maybeSingle();

    let res;
    if (existing) {
      res = await supabase
        .from('hermes_context')
        .update({
          ...body,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      res = await supabase
        .from('hermes_context')
        .insert(body)
        .select()
        .single();
    }

    if (res.error) throw res.error;
    return NextResponse.json({ success: true, context: res.data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
