"use node";

import { buildPushHTTPRequest } from '@pushforge/builder'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import { action } from './_generated/server'

const DEFAULT_WORKSPACE = 'default'
const DEFAULT_PUSH_TTL_SECONDS = 60 * 60
const internalApi = internal as any

type PushSubscriptionRecord = {
  endpoint: string
  expirationTime?: number
  p256dh?: string
  auth?: string
  workspace?: string
  userAgent?: string
  updatedAt?: string
}

type PushFanoutResult = {
  attempted: number
  delivered: number
  pruned: number
  skipped: boolean
}

type PushFanoutOutcome = {
  delivered: number
  pruned: number
}

function normalizeWorkspace(value?: string) {
  const next = value?.trim()
  return next || DEFAULT_WORKSPACE
}

function getEnv(name: string): string | undefined {
  const value = process.env[name]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function resolvePrivateJWK(privateKey: string, publicKey?: string): JsonWebKey | string {
  const trimmed = privateKey.trim()

  // PushForge-native format: JWK JSON string.
  if (trimmed.startsWith('{')) {
    return privateKey
  }

  if (!publicKey) {
    throw new Error('VAPID_PUBLIC_KEY (or VITE_VAPID_PUBLIC_KEY) is required when VAPID_PRIVATE_KEY is not a JWK JSON string')
  }

  const publicBytes = base64UrlToBytes(publicKey)
  const privateBytes = base64UrlToBytes(privateKey)

  if (publicBytes.length !== 65 || publicBytes[0] !== 0x04) {
    throw new Error('VAPID_PUBLIC_KEY must be an uncompressed P-256 public key (base64url)')
  }
  if (privateBytes.length !== 32) {
    throw new Error('VAPID_PRIVATE_KEY must be a 32-byte P-256 private key (base64url) when not using JWK')
  }

  return {
    kty: 'EC',
    crv: 'P-256',
    x: bytesToBase64Url(publicBytes.slice(1, 33)),
    y: bytesToBase64Url(publicBytes.slice(33, 65)),
    d: bytesToBase64Url(privateBytes),
  }
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function bytesToBase64Url(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (value) => String.fromCharCode(value)).join('')
  const encoded = btoa(binary)
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function buildWorkspaceLogsUrl(workspace: string, aliasId: string) {
  const encodedAlias = encodeURIComponent(aliasId)
  if (workspace === DEFAULT_WORKSPACE) {
    return `/default?filter=${encodedAlias}`
  }
  return `/${encodeURIComponent(workspace)}?filter=${encodedAlias}`
}

function buildPushPayload(path: string, targetUrl: string, status?: string, content?: string) {
  const summary = content?.trim() ? content.trim() : `New ${status ?? 'status'} event`
  return {
    title: 'Tailwatch',
    body: `${path}: ${summary}`.slice(0, 180),
    url: targetUrl,
    tag: 'tailwatch-event',
  }
}

export const sendPushNotificationsForEvent = action({
  args: {
    workspace: v.optional(v.string()),
    path: v.string(),
    status: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<PushFanoutResult> => {
    const privateKey = getEnv('VAPID_PRIVATE_KEY')
    const adminContact = getEnv('VAPID_SUBJECT')
    const publicKey = getEnv('VAPID_PUBLIC_KEY') ?? getEnv('VITE_VAPID_PUBLIC_KEY')

    if (!privateKey || !adminContact) {
      console.warn('[PushDelivery] Missing push config', {
        hasPrivateKey: Boolean(privateKey),
        hasSubject: Boolean(adminContact),
      })
      return { attempted: 0, delivered: 0, pruned: 0, skipped: true }
    }

    let privateJWK: JsonWebKey | string
    try {
      privateJWK = resolvePrivateJWK(privateKey, publicKey)
    } catch (error) {
      console.warn('[PushDelivery] Invalid VAPID key configuration', error)
      return { attempted: 0, delivered: 0, pruned: 0, skipped: true }
    }

    const workspace = normalizeWorkspace(args.workspace)
    const subscriptions = (await ctx.runQuery(internalApi.watchers.listPushTargetsForPathInternal, {
      workspace,
      path: args.path,
    })) as PushSubscriptionRecord[]

    if (subscriptions.length === 0) {
      return { attempted: 0, delivered: 0, pruned: 0, skipped: false }
    }

    const aliasResult = (await ctx.runMutation(internalApi.watchers.ensurePathAliasInternal, {
      workspace,
      path: args.path,
    })) as { aliasId: string }

    const payload = buildPushPayload(
      args.path,
      buildWorkspaceLogsUrl(workspace, aliasResult.aliasId),
      args.status,
      args.content,
    )

    const outcomes: PushFanoutOutcome[] = await Promise.all(
      subscriptions.map(async (subscription): Promise<PushFanoutOutcome> => {
        if (!subscription.p256dh || !subscription.auth) {
          const result = (await ctx.runMutation(internal.push.removeSubscriptionInternal, {
            endpoint: subscription.endpoint,
            workspace,
          })) as { ok: boolean; deleted?: number }
          return { delivered: 0, pruned: result.deleted ?? 0 }
        }

        let request: Awaited<ReturnType<typeof buildPushHTTPRequest>>
        try {
          request = await buildPushHTTPRequest({
            privateJWK,
            subscription: {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            message: {
              payload,
              adminContact,
              options: {
                ttl: DEFAULT_PUSH_TTL_SECONDS,
                urgency: 'high',
                topic: 'tailwatch-event',
              },
            },
          })
        } catch (error) {
          console.warn('[PushDelivery] Failed to build request', {
            endpoint: subscription.endpoint,
            error: error instanceof Error ? error.message : String(error),
          })
          return { delivered: 0, pruned: 0 }
        }

        let response: Response
        try {
          response = await fetch(request.endpoint, {
            method: 'POST',
            headers: request.headers,
            body: request.body,
          })
        } catch (error) {
          console.warn('[PushDelivery] Network failure', {
            endpoint: subscription.endpoint,
            error: error instanceof Error ? error.message : String(error),
          })
          return { delivered: 0, pruned: 0 }
        }

        if (response.ok) {
          return { delivered: 1, pruned: 0 }
        }

        if (response.status === 404 || response.status === 410) {
          const result = (await ctx.runMutation(internal.push.removeSubscriptionInternal, {
            endpoint: subscription.endpoint,
            workspace,
          })) as { ok: boolean; deleted?: number }
          return { delivered: 0, pruned: result.deleted ?? 0 }
        }

        console.warn('[PushDelivery] Push request failed', {
          endpoint: subscription.endpoint,
          status: response.status,
        })
        return { delivered: 0, pruned: 0 }
      }),
    )

    const delivered = outcomes.reduce((total: number, result: PushFanoutOutcome) => total + result.delivered, 0)
    const pruned = outcomes.reduce((total: number, result: PushFanoutOutcome) => total + result.pruned, 0)

    return {
      attempted: subscriptions.length,
      delivered,
      pruned,
      skipped: false,
    }
  },
})
