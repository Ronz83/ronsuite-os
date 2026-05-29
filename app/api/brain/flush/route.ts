import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();

  const authHeader = req.headers.get('x-supabase-key');
  const isServiceRole = authHeader && authHeader === process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!user && !isServiceRole) return new Response('Unauthorized', { status: 401 });

  const serviceClient = createServiceClient();
  try {
    const { data, error } = await serviceClient
      .from('brain_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, queue: data || [] });
  } catch (err: any) {
    console.error("[Brain Flush API] Error fetching brain queue:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
