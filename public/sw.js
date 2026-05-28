self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'RonSuite OS', {
        body: data.body || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: data.url || '/dashboard'
      })
    );
  } catch (err) {
    console.error('Push notification error:', err);
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('RonSuite OS', {
        body: text,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data || '/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        const clientPath = new URL(client.url).pathname;
        const targetPath = new URL(urlToOpen, client.url).pathname;
        if (clientPath === targetPath && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
