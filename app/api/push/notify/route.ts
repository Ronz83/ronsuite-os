import { createClient } from '@/lib/supabase/server';
import { sendNotificationToAll } from '@/lib/push';

export async function POST(req: Request) {
  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  try {
    const { title, body, url } = await req.json() as { title: string; body: string; url?: string };
    if (!title || !body) {
      return new Response('Missing title or body', { status: 400 });
    }

    await sendNotificationToAll(title, body, url);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    console.error('Error triggering manual push notification:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
