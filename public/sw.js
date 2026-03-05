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
    status: undefined,
  }

  if (!event.data) {
    return fallback
  }

  try {
    const raw = event.data.text()
    if (!raw || !raw.trim()) {
      return fallback
    }

    const value = JSON.parse(raw)
    if (value && typeof value === 'object') {
      const title =
        typeof value.title === 'string' && value.title.trim()
          ? value.title
          : fallback.title
      const explicitStatus =
        typeof value.status === 'string' ? normalizeStatus(value.status) : undefined
      const inferredStatus = normalizeStatus(title.split('|')[0])

      return {
        title,
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
        status: explicitStatus ?? inferredStatus,
      }
    }
    return { ...fallback, body: raw }
  } catch {
    return fallback
  }
}

function normalizeStatus(value) {
  if (typeof value !== 'string') return undefined
  const status = value.trim().toLowerCase()
  if (status === 'busy') return 'busy'
  if (status === 'idle') return 'idle'
  return undefined
}

async function handlePush(event) {
  let payload = {
    title: 'Tailwatch',
    body: 'New event received.',
    tag: 'tailwatch-event',
    url: '/',
  }

  try {
    payload = readPushPayload(event)
  } catch {}

  try {
    const statusImage =
      payload.status === 'busy'
        ? '/push-status-busy-192x192.png'
        : payload.status === 'idle'
          ? '/push-status-idle-192x192.png'
          : undefined

    await self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      renotify: true,
      icon: '/push-icon-transparent-192x192.png',
      badge: '/push-badge-96x96.png',
      image: statusImage,
      data: { url: payload.url },
    })
  } catch {
    try {
      // Fallback: show at least a basic notification if icon/badge decoding fails.
      await self.registration.showNotification(payload.title, {
        body: payload.body,
        tag: payload.tag,
        renotify: true,
        data: { url: payload.url },
      })
    } catch {}
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
