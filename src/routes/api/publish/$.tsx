import { createFileRoute } from '@tanstack/react-router'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../convex/_generated/api'

type PublishStatus = 'idle' | 'busy'

type PublishPayload = {
  time?: string
  status?: PublishStatus
  content?: string
}

const convexUrl =
  import.meta.env.VITE_CONVEX_URL ||
  (globalThis as any).process?.env?.VITE_CONVEX_URL ||
  (globalThis as any).process?.env?.CONVEX_URL

const convex = convexUrl ? new ConvexHttpClient(convexUrl) : null

export const Route = createFileRoute('/api/publish/$')({
  server: {
    handlers: {
      OPTIONS: async () => {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers':
              'Content-Type, x-volume-key, x-tailwatch-volume, x-event-status',
            'Access-Control-Max-Age': '86400',
          },
        })
      },
      POST: async ({ request, params }) => {
        const corsHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers':
            'Content-Type, x-volume-key, x-tailwatch-volume, x-event-status',
        }

        if (!convex) {
          console.error('[API/Publish] VITE_CONVEX_URL is missing')
          return Response.json(
            { error: 'Server configuration error (missing database URL)' },
            { status: 500, headers: corsHeaders },
          )
        }

        try {
          const rawSplat = (params as any)._splat ?? (params as any)['$'] ?? ''
          const splat = rawSplat.split('/').filter(Boolean).join('/')
          const urlParts = splat.split('/').filter(Boolean)

          const headerVolumeKey = request.headers.get('x-volume-key')?.trim()
          const headerVolume =
            request.headers.get('x-tailwatch-volume')?.trim() || undefined

          const url = new URL(request.url)
          const queryStatusRaw = url.searchParams.get('status')?.trim()
          const headerStatusRaw = request.headers.get('x-event-status')?.trim()
          const statusRaw = queryStatusRaw || headerStatusRaw
          const statusOverride = normalizeEventStatus(statusRaw)

          if (statusRaw && !statusOverride) {
            return Response.json(
              { error: "Invalid status value. Must be 'idle' or 'busy'." },
              { status: 400, headers: corsHeaders },
            )
          }

          const payload = await parsePayload(request)
          if (payload.status === undefined && statusOverride) {
            payload.status = statusOverride
          }

          // Case 1: Volume Key provided in header
          if (headerVolumeKey) {
            const event = await convex.mutation(api.events.publishByKey, {
              key: headerVolumeKey,
              subpath: splat,
              ...payload,
            })
            return Response.json(
              { ...event, volume: headerVolumeKey },
              { status: 201, headers: corsHeaders },
            )
          }

          // Case 2: No headerVolume provided, expect first segment of URL to be Volume Key
          if (!headerVolume) {
            const [urlKey, ...subpathParts] = urlParts
            if (!urlKey) {
              return Response.json(
                {
                  error:
                    'Volume key missing. Provide it as the first URL segment or via x-volume-key header.',
                },
                { status: 400, headers: corsHeaders },
              )
            }

            const event = await convex.mutation(api.events.publishByKey, {
              key: urlKey,
              subpath: subpathParts.join('/'),
              ...payload,
            })
            return Response.json(
              { ...event, volume: urlKey },
              { status: 201, headers: corsHeaders },
            )
          }

          // Case 3: Explicit Volume Name provided in header
          const event = await convex.mutation(api.events.publish, {
            path: splat,
            volume: headerVolume,
            ...payload,
          })
          return Response.json(event, { status: 201, headers: corsHeaders })
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
          const statusCode = statusCodeForError(error)

          console.error(`[API/Publish] ${statusCode} Error:`, errorMessage)

          return Response.json(
            { error: errorMessage },
            { status: statusCode, headers: corsHeaders },
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

function normalizeEventStatus(
  value?: string | null,
): PublishStatus | undefined {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return undefined
  if (normalized === 'idle' || normalized === 'busy') return normalized
  return undefined
}

function extractStatusFrontmatter(rawBody: string): {
  content: string
  status?: PublishStatus
} {
  const firstDelimiterIndex = rawBody.indexOf('---')
  if (firstDelimiterIndex === -1) {
    return { content: rawBody }
  }

  const frontmatterStatus = normalizeEventStatus(
    rawBody.slice(0, firstDelimiterIndex),
  )
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
