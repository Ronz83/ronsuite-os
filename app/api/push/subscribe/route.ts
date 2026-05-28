import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  try {
    const subscription = await req.json();
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return new Response('Invalid subscription', { status: 400 });
    }

    const serviceClient = createServiceClient();
    const { error } = await serviceClient
      .from('push_subscriptions')
      .upsert({
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      }, { onConflict: 'endpoint' });

    if (error) {
      console.error('Error saving subscription:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    console.error('Error registering push subscription:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
