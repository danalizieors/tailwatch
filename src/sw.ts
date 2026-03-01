/// <reference lib="webworker" />

export type {}
declare const self: ServiceWorkerGlobalScope

self.addEventListener('install', () => {
  void self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event: PushEvent) => {
  event.waitUntil(handlePush(event))
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  event.waitUntil(openTailwatch(event))
})

function readPushPayload(event: PushEvent) {
  const fallback = {
    title: 'Tailwatch',
    body: 'New event received.',
    tag: 'tailwatch-event',
    url: '/',
  }

  if (!event.data) return fallback

  try {
    const value = event.data.json()
    if (value && typeof value === 'object') {
      return {
        title: typeof value.title === 'string' && value.title.trim() ? value.title : fallback.title,
        body: typeof value.body === 'string' && value.body.trim() ? value.body : fallback.body,
        tag: typeof value.tag === 'string' && value.tag.trim() ? value.tag : fallback.tag,
        url: typeof value.url === 'string' && value.url.trim() ? value.url : fallback.url,
      }
    }
  } catch (_error) {
    // Ignore and fall through to text parsing.
  }

  try {
    const text = event.data.text()
    if (typeof text === 'string' && text.trim()) {
      return { ...fallback, body: text.trim() }
    }
  } catch (_error) {
    // Ignore and use fallback body.
  }

  return fallback
}

async function handlePush(event: PushEvent) {
  const payload = readPushPayload(event)
  await self.registration.showNotification(payload.title, {
    body: payload.body,
    tag: payload.tag,
    renotify: true,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: { url: payload.url },
  } as NotificationOptions)
}

async function openTailwatch(event: NotificationEvent) {
  const requestedUrl =
    event &&
    event.notification &&
    event.notification.data &&
    typeof event.notification.data.url === 'string' &&
    event.notification.data.url.trim()
      ? event.notification.data.url
      : '/'

  const windows = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  })

  for (const client of windows) {
    if ('focus' in client && client.type === 'window') {
      if ('navigate' in client) {
        try {
          await client.navigate(requestedUrl)
        } catch (_error) {
          // Ignore navigation errors and still focus existing client.
        }
      }
      await client.focus()
      return
    }
  }

  if (self.clients.openWindow) {
    await self.clients.openWindow(requestedUrl)
  }
}
