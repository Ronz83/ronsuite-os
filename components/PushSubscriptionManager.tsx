'use client';
import { useEffect } from 'react';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushSubscriptionManager() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    async function registerAndSubscribe() {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        
        let permission = Notification.permission;
        if (permission === 'default') {
          permission = await Notification.requestPermission();
        }

        if (permission !== 'granted') {
          return;
        }

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          console.error('VAPID public key is missing in environment variables');
          return;
        }

        await navigator.serviceWorker.ready;

        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          });
        }

        const rawP256dh = subscription.getKey('p256dh');
        const rawAuth = subscription.getKey('auth');

        if (!rawP256dh || !rawAuth) {
          console.error('Failed to retrieve keys from subscription object');
          return;
        }

        const keys = {
          p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(rawP256dh) as any)),
          auth: btoa(String.fromCharCode.apply(null, new Uint8Array(rawAuth) as any)),
        };

        const payload = {
          endpoint: subscription.endpoint,
          keys,
        };

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.error('Error during push registration/subscription:', err);
      }
    }

    registerAndSubscribe();
  }, []);

  return null;
}
