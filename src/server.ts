import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server'
import type { Register } from '@tanstack/react-router'
import type { RequestHandler } from '@tanstack/react-start/server'

const NO_INDEX_HEADER_VALUE =
  'noindex, nofollow, noarchive, nosnippet, noimageindex'

function withNoIndexHeader(response: Response) {
  const headers = new Headers(response.headers)
  headers.set('X-Robots-Tag', NO_INDEX_HEADER_VALUE)

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

const fetch = createStartHandler(defaultStreamHandler)

export type ServerEntry = { fetch: RequestHandler<Register> }

export function createServerEntry(entry: ServerEntry): ServerEntry {
  return {
    async fetch(request, ...args) {
      const url = new URL(request.url)
      
      const response = await entry.fetch(request, ...args)
      return withNoIndexHeader(response)
    },
  }
}

export default createServerEntry({ fetch })
