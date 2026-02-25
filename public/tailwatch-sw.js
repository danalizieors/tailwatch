self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  event.waitUntil(handlePush(event))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(openTailwatch())
})

async function handlePush(event) {
  try {
    const windows = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    })

    const hasVisibleClient = windows.some((client) => client.visibilityState === 'visible')
    if (hasVisibleClient) {
      return
    }

    const incoming = await parsePushPayload(event)
    const details = incoming || (await fetchLatestEventNotification())

    await self.registration.showNotification(details.title, {
      body: details.body,
      tag: details.tag || 'tailwatch-event',
      renotify: true,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: {
        url: details.url || '/',
      },
    })
  } catch (error) {
    console.error('[tailwatch-sw] push failed', error)
    await self.registration.showNotification('Tailwatch', {
      body: 'New telemetry event received.',
      tag: 'tailwatch-event',
      renotify: true,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: { url: '/' },
    })
  }
}

async function parsePushPayload(event) {
  if (!event.data) return null

  try {
    const payload = event.data.json()
    if (payload && typeof payload === 'object') {
      return {
        title: typeof payload.title === 'string' ? payload.title : 'Tailwatch',
        body: typeof payload.body === 'string' ? payload.body : 'New telemetry event received.',
        url: typeof payload.url === 'string' ? payload.url : '/',
        tag: typeof payload.tag === 'string' ? payload.tag : 'tailwatch-event',
      }
    }
  } catch {
    try {
      const text = event.data.text()
      if (text) {
        return {
          title: 'Tailwatch',
          body: text,
          url: '/',
          tag: 'tailwatch-event',
        }
      }
    } catch {
      return null
    }
  }

  return null
}

async function fetchLatestEventNotification() {
  const response = await fetch('/api/dashboard?limit=1', {
    headers: {
      'x-tailwatch-workspace': 'default',
    },
  })

  if (!response.ok) {
    return {
      title: 'Tailwatch',
      body: 'New telemetry event received.',
      url: '/',
      tag: 'tailwatch-event',
    }
  }

  const snapshot = await response.json()
  const event = snapshot?.events?.[0]
  if (!event) {
    return {
      title: 'Tailwatch',
      body: 'New telemetry event received.',
      url: '/',
      tag: 'tailwatch-event',
    }
  }

  const path = typeof event.path === 'string' ? event.path : 'event'
  const content = typeof event.content === 'string' && event.content.trim() ? event.content.trim() : `New ${event.type || 'telemetry'} event`
  return {
    title: 'Tailwatch',
    body: `${path}: ${content}`.slice(0, 180),
    url: '/',
    tag: 'tailwatch-event',
  }
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
