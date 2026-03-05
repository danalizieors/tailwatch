self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  event.waitUntil(handlePush(event))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(openTailwatch(event))
})

function readPushPayload(event) {
  const fallback = {
    title: 'Tailwatch',
    body: 'New event received.',
    tag: 'tailwatch-event',
    url: '/',
  }

  if (!event.data) {
    return fallback
  }

  try {
    const value = event.data.json()
    if (value && typeof value === 'object') {
      return {
        title:
          typeof value.title === 'string' && value.title.trim()
            ? value.title
            : fallback.title,
        body:
          typeof value.body === 'string' && value.body.trim()
            ? value.body
            : fallback.body,
        tag:
          typeof value.tag === 'string' && value.tag.trim()
            ? value.tag
            : fallback.tag,
        url:
          typeof value.url === 'string' && value.url.trim()
            ? value.url
            : fallback.url,
      }
    }
  } catch {
    const text = event.data.text()
    if (text) {
      return { ...fallback, body: text }
    }
  }

  return fallback
}

async function handlePush(event) {
  const payload = readPushPayload(event)

  try {
    await self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      renotify: true,
      // Keep icon minimal/transparent so Android does not render a large card tile.
      icon: '/push-badge-96x96.png',
      badge: '/push-badge-96x96.png',
      data: { url: payload.url },
    })
  } catch {
    // Fallback: show at least a basic notification if icon/badge decoding fails.
    await self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      renotify: true,
      data: { url: payload.url },
    })
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
        } catch {}
      }
      await client.focus()
      return
    }
  }

  if (self.clients.openWindow) {
    await self.clients.openWindow(requestedUrl)
  }
}
