import { createFileRoute } from '@tanstack/react-router'
import { appendEvent, appendEventByBindingKey, getBackendMode } from '~/lib/server/event-repository'

export const Route = createFileRoute('/api/publish/$')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const splat = (params._splat ?? '')
            .split('/')
            .filter(Boolean)
            .join('/')
          const urlParts = splat.split('/').filter(Boolean)
          const headerVolumeKey =
            request.headers.get('x-volume-key')?.trim() ??
            request.headers.get('x-tailwatch-workspace-alias')?.trim()
          const workspace = request.headers.get('x-tailwatch-workspace') ?? undefined
          const contentType = request.headers.get('content-type')?.toLowerCase() ?? ''
          const url = new URL(request.url)
          const queryStatusRaw = url.searchParams.get('status')?.trim()
          const headerStatusRaw =
            request.headers.get('x-event-status')?.trim() ??
            request.headers.get('x-tailwatch-status')?.trim()
          const statusRaw = queryStatusRaw || headerStatusRaw
          const statusOverride = normalizeEventStatus(statusRaw)
          const rawBody = await request.text()
          let payload: Record<string, unknown> = {}

          if (rawBody.trim()) {
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
          }

          if (statusRaw && !statusOverride) {
            return Response.json(
              { error: "Invalid status. Use 'idle' or 'busy'." },
              {
                status: 400,
                headers: { 'x-tailwatch-backend': getBackendMode() },
              },
            )
          }

          if (payload.status === undefined && statusOverride) {
            payload.status = statusOverride
          }

          let event
          let responseEvent

          if (headerVolumeKey) {
            event = await appendEventByBindingKey(headerVolumeKey, splat, payload)
            responseEvent = { ...event, workspace: headerVolumeKey }
          } else if (!workspace) {
            const [urlKey, ...subpathParts] = urlParts
            if (!urlKey) {
              return Response.json(
                { error: 'Volume key is required in URL or x-volume-key header' },
                {
                  status: 400,
                  headers: { 'x-tailwatch-backend': getBackendMode() },
                },
              )
            }
            const subpath = subpathParts.join('/')
            event = await appendEventByBindingKey(urlKey, subpath, payload)
            responseEvent = { ...event, workspace: urlKey }
          } else {
            event = await appendEvent(splat, {
                ...payload,
                workspace,
              })
            responseEvent = event
          }

          // Avoid leaking real workspace names when alias-based ingest is used.

          return Response.json(responseEvent, {
            status: 201,
            headers: {
              'x-tailwatch-backend': getBackendMode(),
            },
          })
        } catch (error) {
          console.error('[API/Publish] Error:', error)
          return Response.json(
            {
              error: error instanceof Error ? error.message : 'Failed to publish event',
            },
            {
              status: 500,
              headers: {
                'x-tailwatch-backend': getBackendMode(),
              },
            },
          )
        }
      },
    },
  },
})

function normalizeEventStatus(value?: string | null): 'idle' | 'busy' | undefined {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return undefined
  if (normalized === 'idle' || normalized === 'busy') return normalized
  return undefined
}

function extractStatusFrontmatter(rawBody: string): { content: string; status?: 'idle' | 'busy' } {
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
