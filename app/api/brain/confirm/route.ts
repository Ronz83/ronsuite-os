import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  const authHeader = req.headers.get('x-supabase-key');
  const isServiceRole = authHeader && authHeader === process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!user && !isServiceRole) return new Response('Unauthorized', { status: 401 });

  try {
    const { id, status } = await req.json() as { id: string; status: 'flushed' | 'failed' };
    if (!id || !['flushed', 'failed'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
    }

    const serviceClient = createServiceClient();
    const { data, error } = await serviceClient
      .from('brain_queue')
      .update({
        status,
        flushed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, entry: data });
  } catch (err: any) {
    console.error("[Brain Confirm API] Error updating brain queue status:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
