import { ConvexHttpClient } from 'convex/browser'
import { createFileRoute } from '@tanstack/react-router'
import { api } from '../../../../convex/_generated/api'

type PublishStatus = 'idle' | 'busy'

type PublishPayload = {
  time?: string
  status?: PublishStatus
  content?: string
}

const convexUrl = import.meta.env.VITE_CONVEX_URL
const convex = convexUrl ? new ConvexHttpClient(convexUrl) : null

export const Route = createFileRoute('/api/publish/$')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        if (!convex) {
          return Response.json(
            {
              error: 'VITE_CONVEX_URL is not configured',
            },
            { status: 500 },
          )
        }

        try {
          const splat = (params._splat ?? '')
            .split('/')
            .filter(Boolean)
            .join('/')
          const urlParts = splat.split('/').filter(Boolean)

          const headerVolumeKey = request.headers.get('x-volume-key')?.trim()
          const headerVolume = request.headers.get('x-tailwatch-volume')?.trim() || undefined

          const url = new URL(request.url)
          const queryStatusRaw = url.searchParams.get('status')?.trim()
          const headerStatusRaw = request.headers.get('x-event-status')?.trim()
          const statusRaw = queryStatusRaw || headerStatusRaw
          const statusOverride = normalizeEventStatus(statusRaw)
          if (statusRaw && !statusOverride) {
            return Response.json(
              { error: "Invalid status. Use 'idle' or 'busy'." },
              { status: 400 },
            )
          }

          const payload = await parsePayload(request)
          if (payload.status === undefined && statusOverride) {
            payload.status = statusOverride
          }

          if (headerVolumeKey) {
            const event = await convex.mutation(api.events.publishByKey, {
              key: headerVolumeKey,
              subpath: splat,
              ...payload,
            })
            return Response.json({ ...event, volume: headerVolumeKey }, { status: 201 })
          }

          if (!headerVolume) {
            const [urlKey, ...subpathParts] = urlParts
            if (!urlKey) {
              return Response.json(
                { error: 'Volume key is required in URL or x-volume-key header' },
                { status: 400 },
              )
            }

            const event = await convex.mutation(api.events.publishByKey, {
              key: urlKey,
              subpath: subpathParts.join('/'),
              ...payload,
            })
            return Response.json({ ...event, volume: urlKey }, { status: 201 })
          }

          const event = await convex.mutation(api.events.publish, {
            path: splat,
            volume: headerVolume,
            ...payload,
          })
          return Response.json(event, { status: 201 })
        } catch (error) {
          console.error('[API/Publish] Error:', error)
          return Response.json(
            {
              error: error instanceof Error ? error.message : 'Failed to publish event',
            },
            { status: statusCodeForError(error) },
          )
        }
      },
    },
  },
})

async function parsePayload(request: Request): Promise<PublishPayload> {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? ''
  const rawBody = await request.text()
  if (!rawBody.trim()) return {}

  let payload: Record<string, unknown> = {}

  if (contentType.includes('application/json')) {
    try {
      const parsed = JSON.parse(rawBody)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        payload = parsed as Record<string, unknown>
      } else if (typeof parsed === 'string') {
        const frontmatter = extractStatusFrontmatter(parsed)
        payload = frontmatter.status ? frontmatter : { content: parsed }
      }
    } catch {
      const frontmatter = extractStatusFrontmatter(rawBody)
      payload = frontmatter.status ? frontmatter : { content: rawBody }
    }
  } else {
    const frontmatter = extractStatusFrontmatter(rawBody)
    payload = frontmatter.status ? frontmatter : { content: rawBody }
  }

  const next: PublishPayload = {}
  if (typeof payload.content === 'string') next.content = payload.content
  if (typeof payload.time === 'string') next.time = payload.time

  if (typeof payload.status === 'string') {
    const normalized = normalizeEventStatus(payload.status)
    if (normalized) next.status = normalized
  }

  return next
}

function normalizeEventStatus(value?: string | null): PublishStatus | undefined {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return undefined
  if (normalized === 'idle' || normalized === 'busy') return normalized
  return undefined
}

function extractStatusFrontmatter(rawBody: string): { content: string; status?: PublishStatus } {
  const firstDelimiterIndex = rawBody.indexOf('---')
  if (firstDelimiterIndex === -1) {
    return { content: rawBody }
  }

  const frontmatterStatus = normalizeEventStatus(rawBody.slice(0, firstDelimiterIndex))
  if (!frontmatterStatus) {
    return { content: rawBody }
  }

  const content = rawBody.slice(firstDelimiterIndex + 3).replace(/^\s+/, '')
  return { status: frontmatterStatus, content }
}

function statusCodeForError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  if (!message) return 500
  if (message.includes('unauthorized')) return 403
  if (message.includes('not found')) return 404
  if (message.includes('invalid') || message.includes('required')) return 400
  return 500
}
