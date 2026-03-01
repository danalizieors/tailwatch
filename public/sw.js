self.addEventListener('install', () => {
  console.log('[SW] Service Worker installing.');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating.');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('[SW] Push event received.');
  event.waitUntil(handlePush(event));
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received.');
  event.notification.close();
  event.waitUntil(openTailwatch(event));
});

function readPushPayload(event) {
  const fallback = {
    title: 'Tailwatch',
    body: 'New event received.',
    tag: 'tailwatch-event',
    url: '/',
  };

  if (!event.data) {
    console.log('[SW] Push event has no data.');
    return fallback;
  }

  try {
    const value = event.data.json();
    console.log('[SW] Push payload parsed as JSON:', value);
    if (value && typeof value === 'object') {
      return {
        title: typeof value.title === 'string' && value.title.trim() ? value.title : fallback.title,
        body: typeof value.body === 'string' && value.body.trim() ? value.body : fallback.body,
        tag: typeof value.tag === 'string' && value.tag.trim() ? value.tag : fallback.tag,
        url: typeof value.url === 'string' && value.url.trim() ? value.url : fallback.url,
      };
    }
  } catch (error) {
    console.log('[SW] Push payload not JSON, trying as text:', error);
    const text = event.data.text();
    if (text) {
      return { ...fallback, body: text };
    }
  }

  return fallback;
}

async function handlePush(event) {
  try {
    const payload = readPushPayload(event);
    console.log('[SW] Showing notification:', payload.title);
    await self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      renotify: true,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: { url: payload.url },
    });
    console.log('[SW] Notification shown successfully.');
  } catch (error) {
    console.error('[SW] Push handle error:', error);
  }
}

async function openTailwatch(event) {
  const requestedUrl =
    event &&
    event.notification &&
    event.notification.data &&
    typeof event.notification.data.url === 'string' &&
    event.notification.data.url.trim()
      ? event.notification.data.url
      : '/';

  console.log('[SW] Opening URL:', requestedUrl);

  const windows = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  for (const client of windows) {
    if ('focus' in client && client.type === 'window') {
      console.log('[SW] Focusing existing client.');
      if ('navigate' in client) {
        try {
          await client.navigate(requestedUrl);
        } catch (error) {
          console.error('[SW] Navigation error:', error);
        }
      }
      await client.focus();
      return;
    }
  }

  if (self.clients.openWindow) {
    console.log('[SW] Opening new window.');
    await self.clients.openWindow(requestedUrl);
  }
}

console.log('[Tailwatch] Service Worker initialized.');
