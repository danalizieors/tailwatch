self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  event.waitUntil(handlePush())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(openTailwatch())
})

async function handlePush() {
  await self.registration.showNotification('Tailwatch', {
    body: 'Test event received.',
    tag: 'tailwatch-event',
    renotify: true,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: { url: '/' },
  })
}

async function openTailwatch() {
  const windows = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  })

  for (const client of windows) {
    if ('focus' in client) {
      await client.focus()
      return
    }
  }

  if (self.clients.openWindow) {
    await self.clients.openWindow('/')
  }
}
