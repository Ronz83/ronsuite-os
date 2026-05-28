import webpush from 'web-push';
import { createServiceClient } from './supabase/service';

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || 'mailto:ron@noveltywebsolutions.com';

if (publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
} else {
  console.warn('VAPID keys not fully configured for web push');
}

export async function sendNotificationToAll(title: string, body: string, url: string = '/dashboard') {
  const supabase = createServiceClient();
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*');

  if (error) {
    console.error('Error fetching push subscriptions:', error);
    return;
  }

  if (!subscriptions || subscriptions.length === 0) {
    return;
  }

  const payload = JSON.stringify({ title, body, url });

  const sendPromises = subscriptions.map(async (sub) => {
    try {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };
      await webpush.sendNotification(pushSubscription, payload);
    } catch (err: any) {
      console.error('Error sending push notification to endpoint:', sub.endpoint, err);
      // Clean up invalid/expired subscriptions
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('id', sub.id);
      }
    }
  });

  await Promise.allSettled(sendPromises);
}
